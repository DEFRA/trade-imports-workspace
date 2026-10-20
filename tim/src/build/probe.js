import { readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { basename, isAbsolute, join, relative, resolve } from 'node:path'
import { runToLog } from '../exec/exec.js'
import { TimError } from '../errors.js'
import { hasUncommittedChanges } from './git-files.js'

export const DEFAULT_TEST_TIMEOUT_SECONDS = 270

const mavenCommandFor = (testFile) => {
  const testClass = basename(testFile, '.java')
  return [
    'mvn',
    '-B',
    'verify',
    `-Dtest=${testClass}`,
    `-Dit.test=${testClass}`,
    '-Dsurefire.failIfNoSpecifiedTests=false',
    '-Dfailsafe.failIfNoSpecifiedTests=false'
  ]
}

const TEST_COMMANDS = [
  {
    matches: (testFile) => testFile.endsWith('.fit.spec.js'),
    commandFor: (testFile) => ['npm', 'run', 'test:fit:ci', '--', testFile]
  },
  {
    matches: (testFile) => /\.test\.[cm]?[jt]s$/.test(testFile),
    commandFor: (testFile) => ['npm', 'test', '--', '--no-coverage', testFile]
  },
  {
    matches: (testFile) => testFile.endsWith('.java'),
    commandFor: mavenCommandFor
  }
]

/**
 * The command that runs one test file in its repo: Vitest through
 * `npm test` without coverage, a FIT spec through `test:fit:ci`, or a Java
 * test class through `mvn verify`.
 *
 * @param {string} testFile - Relative to the repo
 * @returns {string[]}
 * @throws {TimError} USAGE for any other kind of file
 */
export const testCommandFor = (testFile) => {
  const known = TEST_COMMANDS.find(({ matches }) => matches(testFile))
  if (!known) {
    throw new TimError(
      'USAGE',
      `Can't tell how to run ${testFile}. Give the test command after --, such as: -- npm test -- ${testFile}`
    )
  }
  return known.commandFor(testFile)
}

const isInside = (folder, path) => {
  const fromFolder = relative(folder, path)
  return (
    fromFolder !== '' && !fromFolder.startsWith('..') && !isAbsolute(fromFolder)
  )
}

const repoRelativeFile = (repoPath, file) => {
  const realRepoPath = realpathSync(repoPath)
  const absolute = resolve(realRepoPath, file)
  if (!isInside(realRepoPath, absolute)) {
    throw new TimError('USAGE', `${file} is not inside ${repoPath}.`)
  }
  return relative(realRepoPath, absolute)
}

const readSource = (path, file) => {
  try {
    return readFileSync(path)
  } catch {
    throw new TimError('NOT_FOUND', `Can't read ${file}.`)
  }
}

const blankLine = (text, line, file) => {
  const lines = text.split('\n')
  if (!Number.isInteger(line) || line < 1 || line > lines.length) {
    throw new TimError(
      'USAGE',
      `${file} has ${lines.length} lines, so it has no line ${line}.`
    )
  }
  return lines
    .map((content, index) => (index === line - 1 ? '' : content))
    .join('\n')
}

const occurrencesOf = (text, search) => text.split(search).length - 1

const replaceOnce = (text, { search, replace }, file) => {
  const found = occurrencesOf(text, search)
  if (found !== 1) {
    throw new TimError(
      'USAGE',
      `The search text appears ${found} times in ${file}. Give text that appears exactly once.`
    )
  }
  return text.replace(search, () => replace)
}

/**
 * The file's text with the inversion applied: the line blanked out, or the
 * search text replaced.
 *
 * @param {string} text
 * @param {{line?: number, search?: string, replace?: string}} inversion
 * @param {string} file - For the message
 * @returns {string}
 * @throws {TimError} USAGE when the line does not exist or the search text does not appear exactly once
 */
export const invertedText = (text, inversion, file) =>
  inversion.search === undefined
    ? blankLine(text, inversion.line, file)
    : replaceOnce(text, inversion, file)

const testPasses = async ({ testCommand, repoPath, logPath, timeoutMs }) => {
  const [command, ...args] = testCommand
  try {
    const { exitCode } = await runToLog(command, args, {
      cwd: repoPath,
      logPath,
      timeout: timeoutMs
    })
    return exitCode === 0
  } catch (error) {
    if (error.timedOut) return false
    throw error
  }
}

const logPathsFor = (logsDir, file) => {
  const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-')
  const prefix = join(logsDir, `probe-${basename(file)}-${stamp}`)
  return {
    inverted: `${prefix}-inverted.log`,
    restored: `${prefix}-restored.log`
  }
}

const isRestored = async (repoPath, file, path, original) =>
  readFileSync(path).equals(original) &&
  !(await hasUncommittedChanges(repoPath, file))

/**
 * Prove whether a test witnesses one production line: apply the inversion,
 * run the test, put the file back byte for byte, check git sees no change,
 * and run the test again. A test that still passes with the line inverted
 * (`redWhenInverted` false) does not witness that line.
 *
 * @param {object} args
 * @param {string} args.repoPath - A git checkout
 * @param {string} args.file - The production file, relative to repoPath
 * @param {{line?: number, search?: string, replace?: string}} args.inversion - A 1-based line to blank out, or text to replace once
 * @param {string[]} args.testCommand - The command and its arguments, run in repoPath
 * @param {string} args.logsDir
 * @param {number} [args.timeoutMs] - For each test run; a run that times out counts as failed
 * @returns {Promise<{file: string, inversion: object, redWhenInverted: boolean, greenAfterRestore: boolean, restored: boolean, logs: {inverted: string, restored: string|null}}>}
 * @throws {TimError} DIRTY_TREE when the file has uncommitted changes; USAGE or NOT_FOUND when the file or inversion is wrong
 */
export const runProbe = async ({
  repoPath,
  file,
  inversion,
  testCommand,
  logsDir,
  timeoutMs = DEFAULT_TEST_TIMEOUT_SECONDS * 1000
}) => {
  const relativeFile = repoRelativeFile(repoPath, file)
  const path = join(realpathSync(repoPath), relativeFile)
  const original = readSource(path, relativeFile)
  if (await hasUncommittedChanges(repoPath, relativeFile)) {
    throw new TimError(
      'DIRTY_TREE',
      `${relativeFile} has uncommitted changes. Commit them first, so the probe can put the file back exactly as git has it.`
    )
  }
  const inverted = invertedText(
    original.toString('utf8'),
    inversion,
    relativeFile
  )
  const logs = logPathsFor(logsDir, relativeFile)
  const testRun = { testCommand, repoPath, timeoutMs }

  let redWhenInverted
  try {
    writeFileSync(path, inverted)
    redWhenInverted = !(await testPasses({
      ...testRun,
      logPath: logs.inverted
    }))
  } finally {
    writeFileSync(path, original)
  }

  const restored = await isRestored(repoPath, relativeFile, path, original)
  const greenAfterRestore =
    restored && (await testPasses({ ...testRun, logPath: logs.restored }))
  return {
    file: relativeFile,
    inversion,
    redWhenInverted,
    greenAfterRestore,
    restored,
    logs: { inverted: logs.inverted, restored: restored ? logs.restored : null }
  }
}
