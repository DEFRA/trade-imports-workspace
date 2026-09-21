import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { join, dirname, resolve, relative, sep } from 'node:path'
import { PROBLEM_KIND } from './problem-kind.js'

const MAX_IMPORT_DEPTH = 5
const IMPORT_TOKEN_RE = /(^|\s)@(\S+)/g
const CLAUDE_MD_FILENAME = 'CLAUDE.md'
const DOT_CLAUDE_CLAUDE_MD = '.claude/CLAUDE.md'
const TRAILING_PUNCTUATION_RE = /[.,;:'")\]}]+$/

const toRelPosix = (workspaceRoot, absPath) =>
  relative(workspaceRoot, absPath).split(sep).join('/')

/**
 * The chain of project instruction files for one workspace-relative
 * folder: every existing `<D>/CLAUDE.md` and `<D>/.claude/CLAUDE.md`, for
 * each ancestor `D` from the workspace root down to `folder`, in that
 * order — the same files the harness itself loads.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.folder - Workspace-relative, `/`-separated (`''`
 *   for the workspace root)
 * @returns {string[]} workspace-relative paths
 */
export const claudeChainFor = ({ workspaceRoot, folder }) => {
  const segments = folder === '' || folder === '.' ? [] : folder.split('/')
  const descendantPaths = segments.reduce((acc, segment) => {
    const next = acc.length ? `${acc.at(-1)}/${segment}` : segment
    return [...acc, next]
  }, [])
  const ancestors = ['', ...descendantPaths]

  return ancestors.flatMap((dir) => {
    const rootCandidate = dir
      ? `${dir}/${CLAUDE_MD_FILENAME}`
      : CLAUDE_MD_FILENAME
    const dotCandidate = dir
      ? `${dir}/${DOT_CLAUDE_CLAUDE_MD}`
      : DOT_CLAUDE_CLAUDE_MD
    return [rootCandidate, dotCandidate].filter((candidate) =>
      existsSync(join(workspaceRoot, candidate))
    )
  })
}

const stripFencesAndCodeSpans = (text) =>
  text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '')

const IMPORT_TARGET_SHAPE_RE = /^(\.\/|\.\.\/|~\/|\/)/

/**
 * Every `@<target>` import token in a chain file's text: a token at the
 * start of a line or after whitespace, outside fenced code blocks and
 * inline code spans, whose target starts `./`, `../`, `~/` or `/`, or
 * ends `.md`. Excludes prose such as `@hapi/hapi` or an email address.
 *
 * @param {string} text
 * @returns {string[]}
 */
const extractImportTargets = (text) => {
  const cleaned = stripFencesAndCodeSpans(text)
  return [...cleaned.matchAll(IMPORT_TOKEN_RE)]
    .map((match) => match[2].replace(TRAILING_PUNCTUATION_RE, ''))
    .filter(
      (target) => IMPORT_TARGET_SHAPE_RE.test(target) || target.endsWith('.md')
    )
}

const resolveImportTarget = (target, { importingFileAbsDir, homeDir }) =>
  target.startsWith('~/')
    ? resolve(homeDir, target.slice(2))
    : resolve(importingFileAbsDir, target)

const displayPath = (absPath, workspaceRoot) =>
  absPath.startsWith(`${workspaceRoot}${sep}`) || absPath === workspaceRoot
    ? toRelPosix(workspaceRoot, absPath)
    : absPath

/**
 * Every `@` import reachable from a set of chain files, followed
 * recursively (depth-capped at 5, with a visited-set cycle guard), plus a
 * problem for each import target that does not exist.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string[]} args.files - Workspace-relative chain files to scan
 * @param {string} args.homeDir
 * @returns {{imports: string[], problems: object[]}}
 */
export const importsOf = ({ workspaceRoot, files, homeDir }) => {
  const imports = []
  const seenTargets = new Set()
  const problems = []
  const visitedDepth = new Map()

  const scan = (fileAbsPath, depth) => {
    const priorDepth = visitedDepth.get(fileAbsPath)
    if (priorDepth !== undefined && priorDepth <= depth) return
    visitedDepth.set(fileAbsPath, depth)
    if (depth > MAX_IMPORT_DEPTH) return
    if (!existsSync(fileAbsPath)) return

    const text = readFileSync(fileAbsPath, 'utf8')
    const importingDir = dirname(fileAbsPath)
    const sourceRel = displayPath(fileAbsPath, workspaceRoot)

    for (const target of extractImportTargets(text)) {
      const resolvedAbs = resolveImportTarget(target, {
        importingFileAbsDir: importingDir,
        homeDir
      })
      const resolvedDisplay = displayPath(resolvedAbs, workspaceRoot)

      if (!seenTargets.has(resolvedDisplay)) {
        seenTargets.add(resolvedDisplay)
        imports.push(resolvedDisplay)
      }

      if (!existsSync(resolvedAbs)) {
        problems.push({
          kind: PROBLEM_KIND.IMPORT,
          source: sourceRel,
          pointer: target,
          resolved: resolvedDisplay
        })
        continue
      }

      scan(resolvedAbs, depth + 1)
    }
  }

  for (const fileRel of files) {
    scan(join(workspaceRoot, fileRel), 1)
  }

  return { imports, problems }
}

/**
 * Turn an absolute path into the harness's memory-index slug: every
 * character outside `[A-Za-z0-9]` becomes `-`. Matches what the harness
 * itself writes under `~/.claude/projects/<slug>/` (a `/.` in the path
 * becomes `--`, not only `/` becoming `-`, because `.` is replaced too).
 *
 * @param {string} path
 * @returns {string}
 */
export const projectSlug = (path) => path.replace(/[^A-Za-z0-9]/g, '-')

/**
 * The absolute path to this workspace's memory index — one shared index
 * for every repo opened from inside the checkout, keyed on the workspace
 * root (not per repo). `workspaceRoot` is resolved with `realpath` before
 * slugging, so a symlinked checkout produces the same slug the harness
 * itself wrote.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.claudeConfigDir
 * @returns {string} absolute path
 */
export const memoryIndexPath = ({ workspaceRoot, claudeConfigDir }) => {
  let realRoot
  try {
    realRoot = realpathSync(workspaceRoot)
  } catch {
    realRoot = workspaceRoot
  }
  return join(
    claudeConfigDir,
    'projects',
    projectSlug(realRoot),
    'memory',
    'MEMORY.md'
  )
}
