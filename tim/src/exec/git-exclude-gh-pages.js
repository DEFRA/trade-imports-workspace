import { run } from './exec.js'
import { TimError } from '../errors.js'

export const ALL_HEADS_REFSPEC = '+refs/heads/*:refs/remotes/origin/*'
export const EXCLUDE_GH_PAGES_REFSPEC = '^refs/heads/gh-pages'

const GH_PAGES_REMOTE_REF = 'refs/remotes/origin/gh-pages'
const MINIMUM_GIT = { major: 2, minor: 29 }

/**
 * @param {string} versionOutput - Output of `git version`
 * @returns {{major: number, minor: number} | null} Null when unparseable
 */
export const parseGitVersion = (versionOutput) => {
  const match = versionOutput?.match(/git version (\d+)\.(\d+)/)
  if (!match) return null
  return { major: Number(match[1]), minor: Number(match[2]) }
}

export const supportsNegativeRefspecs = ({ major, minor }) =>
  major > MINIMUM_GIT.major ||
  (major === MINIMUM_GIT.major && minor >= MINIMUM_GIT.minor)

/**
 * Negative refspecs need git 2.29 or later.
 *
 * @throws {TimError} MISSING_DEP when git is too old or unidentifiable
 */
export const assertGitSupportsNegativeRefspecs = async () => {
  const result = await run('git', ['version'])
  const version = parseGitVersion(result.stdout)
  if (version && supportsNegativeRefspecs(version)) return
  const found = version
    ? `git ${version.major}.${version.minor}`
    : 'this version of git'
  throw new TimError(
    'MISSING_DEP',
    `${found} is too old. tim needs git 2.29 or later to exclude gh-pages from clones and fetches. Update git and try again.`
  )
}

/**
 * True when the clone still fetches gh-pages and needs the one-off
 * exclusion. False when already excluded, or when the fetch config
 * cannot be read at all (not a real clone — nothing to heal).
 */
export const needsGhPagesExclusion = async (dir) => {
  const result = await run('git', [
    '-C',
    dir,
    'config',
    '--get-all',
    'remote.origin.fetch'
  ])
  if (result.exitCode !== 0) return false
  return !result.stdout.split('\n').includes(EXCLUDE_GH_PAGES_REFSPEC)
}

/**
 * Pin the fetch refspec to all heads except gh-pages and drop the
 * remote-tracking ref so already-fetched gh-pages objects stop being
 * pinned. Idempotent — safe to run on every setup/update.
 *
 * @returns {Promise<object>} First failing exec result, else the last one
 */
export const excludeGhPagesFromFetch = async (dir) => {
  const replace = await run('git', [
    '-C',
    dir,
    'config',
    '--replace-all',
    'remote.origin.fetch',
    ALL_HEADS_REFSPEC
  ])
  if (replace.exitCode !== 0) return replace
  const add = await run('git', [
    '-C',
    dir,
    'config',
    '--add',
    'remote.origin.fetch',
    EXCLUDE_GH_PAGES_REFSPEC
  ])
  if (add.exitCode !== 0) return add
  await dropGhPagesRemoteRef(dir)
  return add
}

/**
 * Delete the gh-pages remote-tracking ref and its reflog, so gc can
 * reclaim the objects it held. A clone that never fetched gh-pages has
 * no such ref; that failure is not reported.
 */
export const dropGhPagesRemoteRef = async (dir) => {
  await run('git', ['-C', dir, 'update-ref', '-d', GH_PAGES_REMOTE_REF])
}

/**
 * Reclaim the disk already spent on gh-pages packs once the ref is
 * gone. Only unreachable objects are dropped — local branches,
 * stashes and reflogs are untouched. Slow on a multi-GB clone.
 */
export const pruneGhPagesObjects = (dir) =>
  run('git', ['-C', dir, 'gc', '--prune=now', '--quiet'])
