import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { runStreamed } from './exec.js'
import { TimError } from '../errors.js'

/**
 * Resolve the path to a script in scripts/stack/ under the workspace root.
 *
 * @param {string} workspaceRoot
 * @param {string} scriptName - File name (e.g. "run-stack.sh")
 * @returns {string} Absolute path
 * @throws {TimError} USAGE when the script does not exist
 */
export const stackScriptPath = (workspaceRoot, scriptName) => {
  const path = join(workspaceRoot, 'scripts', 'stack', scriptName)
  if (!existsSync(path)) {
    throw new TimError(
      'USAGE',
      `Cannot find ${scriptName} at ${path}. Is this a trade-imports workspace?`
    )
  }
  return path
}

/**
 * Run a script under scripts/stack/ with its stdio inherited so the child
 * controls the terminal (handy for `up` progress, `restart` output etc.).
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.script
 * @param {string[]} [args.args]
 * @returns {Promise<{exitCode: number, durationMs: number}>}
 */
export const runStackScript = ({ workspaceRoot, script, args = [] }) =>
  runStreamed(stackScriptPath(workspaceRoot, script), args, {
    cwd: workspaceRoot
  })
