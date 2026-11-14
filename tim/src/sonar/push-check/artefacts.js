import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { run } from '../../exec/exec.js'

const UNTRACKED_PREFIX = '?? '

const isInsideRepo = (path) =>
  !path.startsWith('/') &&
  !path.includes('..') &&
  path !== '.git' &&
  !path.startsWith('.git/')

/**
 * The untracked paths `git status --porcelain` lists for a repo, as it
 * prints them. Empty when git cannot read the folder.
 *
 * @param {string} dir
 * @param {Record<string, string|undefined>} env
 * @returns {Promise<string[]>}
 */
export const untrackedPaths = async (dir, env) => {
  const status = await run(
    'git',
    ['-c', 'core.quotePath=false', 'status', '--porcelain'],
    { cwd: dir, env, extendEnv: false }
  )
  if (status.exitCode !== 0) return []
  return status.stdout
    .split('\n')
    .filter((line) => line.startsWith(UNTRACKED_PREFIX))
    .map((line) => line.slice(UNTRACKED_PREFIX.length))
}

/**
 * Deletes the untracked paths that were not there in `before`. A path
 * outside the repo or inside `.git` is never deleted, and nor is a
 * tracked file.
 *
 * @param {string} dir
 * @param {string[]} before - from {@link untrackedPaths}
 * @param {Record<string, string|undefined>} env
 * @returns {Promise<string[]>} the paths deleted
 */
export const removeNewUntracked = async (dir, before, env) => {
  const newPaths = (await untrackedPaths(dir, env)).filter(
    (path) => isInsideRepo(path) && !before.includes(path)
  )
  for (const path of newPaths) {
    rmSync(join(dir, path), { recursive: true, force: true })
  }
  return newPaths
}
