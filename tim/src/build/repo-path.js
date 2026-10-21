import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { TimError } from '../errors.js'

/**
 * The folder a build command works in: `repo` as a path, or else the
 * workspace clone under `repos/` with that folder name.
 *
 * @param {string} workspaceRoot
 * @param {string} repo - A path, or a folder name under repos/
 * @returns {string} An absolute path
 * @throws {TimError} NOT_FOUND when neither exists
 */
export const resolveRepoPath = (workspaceRoot, repo) => {
  const asPath = resolve(repo)
  if (existsSync(asPath)) return asPath
  const underRepos = join(workspaceRoot, 'repos', repo)
  if (existsSync(underRepos)) return underRepos
  throw new TimError(
    'NOT_FOUND',
    `Can't find ${repo}, either as a path or as a folder under ${join(workspaceRoot, 'repos')}.`
  )
}
