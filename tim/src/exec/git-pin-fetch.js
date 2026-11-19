import { statSync } from 'node:fs'
import { join } from 'node:path'
import { run } from './exec.js'
import { TimError } from '../errors.js'
import {
  assertGitSupportsNegativeRefspecs,
  dropGhPagesRemoteRef,
  excludeGhPagesFromFetch,
  pruneGhPagesObjects
} from './git-exclude-gh-pages.js'

export const MAIN_REFSPEC = '+refs/heads/main:refs/remotes/origin/main'

/**
 * @param {string} pullRequestNumber
 * @returns {string} The refspec that fetches only that pull request's head, as `origin/pr-<n>`
 */
export const pullRequestRefspec = (pullRequestNumber) =>
  `+refs/pull/${pullRequestNumber}/head:refs/remotes/origin/pr-${pullRequestNumber}`

const isFolder = (path) => {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

/**
 * @param {string} dir
 * @throws {TimError} USAGE when `dir` holds no `.git` folder
 */
export const assertGitRepo = (dir) => {
  if (!isFolder(join(dir, '.git'))) {
    throw new TimError('USAGE', `Not a git repo: ${dir}`)
  }
}

const gitConfig = async (dir, args) => {
  const result = await run('git', ['-C', dir, 'config', ...args])
  if (result.exitCode !== 0) {
    throw new TimError(
      'UNKNOWN',
      `Cannot set the fetch refspec in ${dir}: ${result.stderr.trim()}`
    )
  }
}

/**
 * Pin a clone's fetch refspec to one pull request's head, and main too when
 * asked, then drop any gh-pages remote-tracking ref. Idempotent.
 *
 * @param {string} dir
 * @param {string} pullRequestNumber
 * @param {{includeMain?: boolean}} [options]
 * @throws {TimError} UNKNOWN when git cannot write the config
 */
export const pinFetchToPullRequest = async (
  dir,
  pullRequestNumber,
  { includeMain = false } = {}
) => {
  await gitConfig(dir, [
    '--replace-all',
    'remote.origin.fetch',
    pullRequestRefspec(pullRequestNumber)
  ])
  if (includeMain) {
    await gitConfig(dir, ['--add', 'remote.origin.fetch', MAIN_REFSPEC])
  }
  await dropGhPagesRemoteRef(dir)
}

/**
 * @param {string} dir
 * @returns {Promise<string[]>} Every `remote.origin.fetch` line, in order
 */
export const fetchRefspecsOf = async (dir) => {
  const result = await run('git', [
    '-C',
    dir,
    'config',
    '--get-all',
    'remote.origin.fetch'
  ])
  return result.stdout.split('\n').filter(Boolean)
}

const pinExcludingGhPages = async (dir, { prune }) => {
  await assertGitSupportsNegativeRefspecs()
  const result = await excludeGhPagesFromFetch(dir)
  if (result.exitCode !== 0) {
    throw new TimError(
      'UNKNOWN',
      `Cannot set the fetch refspec in ${dir}: ${result.stderr.trim()}`
    )
  }
  if (!prune) return false
  const pruned = await pruneGhPagesObjects(dir)
  if (pruned.exitCode !== 0) {
    throw new TimError(
      'UNKNOWN',
      `Cannot prune unreachable objects in ${dir}: ${pruned.stderr.trim()}`
    )
  }
  return true
}

const pinForMode = async ({
  dir,
  mode,
  pullRequestNumber,
  includeMain,
  prune
}) => {
  if (mode === 'exclude') return pinExcludingGhPages(dir, { prune })
  await pinFetchToPullRequest(dir, pullRequestNumber, { includeMain })
  return false
}

/**
 * Pin a clone's fetch refspec so a bare `git fetch` cannot bring in
 * gh-pages: all heads except gh-pages (`exclude`), or one pull request's
 * head (`pr-only`).
 *
 * @param {object} args
 * @param {string} args.dir
 * @param {'exclude'|'pr-only'} args.mode
 * @param {string} [args.pullRequestNumber] - Required for `pr-only`
 * @param {boolean} [args.includeMain] - `pr-only` only
 * @param {boolean} [args.prune] - `exclude` only: run `git gc --prune=now` afterwards
 * @returns {Promise<{dir: string, mode: string, refspecs: string[], pruned: boolean}>}
 * @throws {TimError} USAGE when `dir` is not a git repo, MISSING_DEP when git is too old for `exclude`, UNKNOWN when git fails
 */
export const pinFetch = async ({
  dir,
  mode,
  pullRequestNumber,
  includeMain = false,
  prune = false
}) => {
  assertGitRepo(dir)
  const pruned = await pinForMode({
    dir,
    mode,
    pullRequestNumber,
    includeMain,
    prune
  })
  return { dir, mode, refspecs: await fetchRefspecsOf(dir), pruned }
}
