import { run } from '../exec/exec.js'
import { TimError } from '../errors.js'

/**
 * Run git in a workspace and return its stdout.
 *
 * @param {string} workspaceRoot
 * @param {string[]} args
 * @returns {Promise<string>}
 * @throws {TimError} UNKNOWN with git's own message when git exits non-zero
 */
export const gitOutput = async (workspaceRoot, args) => {
  const result = await run('git', ['-C', workspaceRoot, ...args])
  if (result.exitCode !== 0) {
    throw new TimError(
      'UNKNOWN',
      `git ${args.join(' ')} failed: ${result.stderr.trim()}`
    )
  }
  return result.stdout
}

/**
 * @param {string} workspaceRoot
 * @returns {Promise<string>} The branch the workspace has checked out
 */
export const currentBranch = async (workspaceRoot) =>
  (await gitOutput(workspaceRoot, ['rev-parse', '--abbrev-ref', 'HEAD'])).trim()
