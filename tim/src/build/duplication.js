import { createRequire } from 'node:module'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import picomatch from 'picomatch'
import { run } from '../exec/exec.js'
import { TimError } from '../errors.js'
import { gitLines } from './git-files.js'

export const TEST_FILE_GLOBS = [
  '**/*.test.js',
  '**/*.fit.spec.js',
  '**/*.spec.ts',
  '**/*IT.java',
  '**/*Test.java'
]

export const DEFAULT_BASE = 'origin/main'

export const MIN_CLONE_LINES = 10

export const MIN_CLONE_TOKENS = 50

const isTestFile = picomatch(TEST_FILE_GLOBS, { dot: true })

const jscpdLauncher = createRequire(import.meta.url).resolve(
  'jscpd/run-jscpd.js'
)

const assertBaseExists = async (repoPath, base) => {
  const { exitCode } = await run(
    'git',
    ['rev-parse', '--verify', '--quiet', `${base}^{commit}`],
    { cwd: repoPath }
  )
  if (exitCode !== 0) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find ${base} in ${repoPath}. Fetch it, or name another base with --base.`
    )
  }
}

const changedTestFiles = async (repoPath, base) => {
  const changed = await gitLines(repoPath, [
    'diff',
    '--merge-base',
    base,
    '--name-only',
    '--relative',
    '--diff-filter=d'
  ])
  const untracked = await gitLines(repoPath, [
    'ls-files',
    '--others',
    '--exclude-standard'
  ])
  return [...new Set([...changed, ...untracked])].filter(isTestFile).sort()
}

const testFilesOnDisk = async (repoPath) =>
  (
    await gitLines(repoPath, [
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard'
    ])
  )
    .filter(isTestFile)
    .filter((file) => existsSync(join(repoPath, file)))

const jscpdArgs = ({ base, outputDir, files }) => [
  jscpdLauncher,
  '--absolute',
  '--min-lines',
  String(MIN_CLONE_LINES),
  '--min-tokens',
  String(MIN_CLONE_TOKENS),
  '--reporters',
  'json',
  '--output',
  outputDir,
  '--silent',
  '--no-tips',
  '--baseline-from-ref',
  base,
  ...files
]

const readReport = (outputDir) =>
  JSON.parse(readFileSync(join(outputDir, 'jscpd-report.json'), 'utf8'))

const runJscpd = async ({ repoPath, base, files }) => {
  const outputDir = mkdtempSync(join(tmpdir(), 'tim-duplication-'))
  try {
    const { exitCode, stderr, stdout } = await run(
      process.execPath,
      jscpdArgs({ base, outputDir, files }),
      { cwd: repoPath }
    )
    if (exitCode !== 0) {
      throw new TimError(
        'UNKNOWN',
        `jscpd exited ${exitCode} in ${repoPath}: ${(stderr || stdout).trim()}`
      )
    }
    return readReport(outputDir).duplicates
  } finally {
    rmSync(outputDir, { recursive: true, force: true })
  }
}

const blockOf = (repoPath, { name, start, end }) => ({
  file: relative(repoPath, name),
  startLine: start,
  endLine: end
})

const cloneOf =
  (repoPath) =>
  ({ firstFile, secondFile, lines, tokens, isNew }) => ({
    lines,
    tokens,
    isNew,
    first: blockOf(repoPath, firstFile),
    second: blockOf(repoPath, secondFile)
  })

const touchesAny =
  (changed) =>
  ({ first, second }) =>
    changed.has(first.file) || changed.has(second.file)

const withoutIsNew = ({ isNew, ...clone }) => clone

/**
 * The duplicated blocks a branch adds to its test files: clones of at least
 * MIN_CLONE_LINES lines and MIN_CLONE_TOKENS tokens, among every test file
 * in the repo, that touch a test file changed since `base` and that `base`
 * does not already have.
 *
 * @param {object} args
 * @param {string} args.repoPath - A git checkout, or a folder inside one
 * @param {string} [args.base] - The ref whose clones are not counted
 * @returns {Promise<{base: string, minLines: number, minTokens: number, changedTestFiles: string[], clones: {lines: number, tokens: number, first: {file: string, startLine: number, endLine: number}, second: {file: string, startLine: number, endLine: number}}[]}>}
 * @throws {TimError} NOT_FOUND when `base` does not exist; UNKNOWN when git or jscpd fails
 */
export const findNewTestClones = async ({ repoPath, base = DEFAULT_BASE }) => {
  await assertBaseExists(repoPath, base)
  const realRepoPath = realpathSync(repoPath)
  const changed = await changedTestFiles(realRepoPath, base)
  const summary = {
    base,
    minLines: MIN_CLONE_LINES,
    minTokens: MIN_CLONE_TOKENS,
    changedTestFiles: changed
  }
  if (changed.length === 0) return { ...summary, clones: [] }
  const testFiles = await testFilesOnDisk(realRepoPath)
  const duplicates = await runJscpd({
    repoPath: realRepoPath,
    base,
    files: testFiles.map((file) => join(realRepoPath, file))
  })
  const clones = duplicates
    .map(cloneOf(realRepoPath))
    .filter(({ isNew }) => isNew)
    .filter(touchesAny(new Set(changed)))
    .map(withoutIsNew)
  return { ...summary, clones }
}
