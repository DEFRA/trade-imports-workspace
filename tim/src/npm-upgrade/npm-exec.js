import { realpathSync } from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../errors.js'
import { isFolder } from './state.js'

const EXEC_USAGE =
  'Usage: tim npm exec (--repo <repo-name> | --clone <repo-name>) -- <npm-subcommand> [args...]'

/**
 * The npm arguments that run `npmArgs` in a workspace repo or clone, with
 * the checkout's symlinks resolved so npm never writes lockfile paths
 * through a symlink: `--prefix <real path>` then `npmArgs`.
 *
 * @param {object} request
 * @param {string} request.workspaceRoot
 * @param {string} [request.repo] - A checkout under repos/
 * @param {string} [request.clone] - A clone under workareas/clones/
 * @param {string[]} request.npmArgs
 * @returns {string[]}
 * @throws {TimError} USAGE for no target, both targets or no npm subcommand; NOT_FOUND when the checkout is not a folder
 */
export const npmArgsInCheckout = ({ workspaceRoot, repo, clone, npmArgs }) => {
  if (repo && clone) {
    throw new TimError(
      'USAGE',
      `Give --repo or --clone, not both\n${EXEC_USAGE}`
    )
  }
  if (!repo && !clone) throw new TimError('USAGE', EXEC_USAGE)
  if (npmArgs.length === 0) {
    throw new TimError('USAGE', `Missing npm subcommand\n${EXEC_USAGE}`)
  }
  const checkout = repo
    ? join(workspaceRoot, 'repos', repo)
    : join(workspaceRoot, 'workareas', 'clones', clone)
  if (!isFolder(checkout)) {
    throw new TimError('NOT_FOUND', `Repo not found: ${checkout}`)
  }
  return ['--prefix', realpathSync(checkout), ...npmArgs]
}
