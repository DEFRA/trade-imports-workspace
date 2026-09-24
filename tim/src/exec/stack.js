import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { run, runStreamed, runToLog } from './exec.js'
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

/**
 * Run a script under scripts/stack/ with its output written to a log file
 * instead of the terminal — the same scripts `tim docker dev|down` run.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.script
 * @param {string[]} [args.args]
 * @param {string} args.logPath
 * @param {object} [args.env] - Extra environment for the script
 * @returns {Promise<{exitCode: number, durationMs: number, log: string}>}
 */
export const runStackScriptToLog = ({
  workspaceRoot,
  script,
  args = [],
  logPath,
  env
}) =>
  runToLog(stackScriptPath(workspaceRoot, script), args, {
    cwd: workspaceRoot,
    logPath,
    env
  })

// docker/stack/compose.yml's `name:`. Every container the stack starts
// carries it as its compose project label.
export const STACK_PROJECT = 'trade-imports'

const nonEmptyLines = (text) =>
  text.split('\n').filter((line) => line.trim().length > 0)

/**
 * The workspace stack's running containers, by name.
 *
 * @param {object} [opts]
 * @param {object} [opts.env] - Extra environment for docker
 * @returns {Promise<string[]>}
 * @throws {TimError} MISSING_DEP when docker is not installed, UNKNOWN when docker cannot list containers
 */
export const stackContainers = async ({ env } = {}) => {
  const result = await run(
    'docker',
    [
      'ps',
      '--filter',
      `label=com.docker.compose.project=${STACK_PROJECT}`,
      '--format',
      '{{.Names}}'
    ],
    { env }
  )
  if (result.exitCode !== 0) {
    throw new TimError(
      'UNKNOWN',
      `Can't list the workspace stack's containers: ${result.stderr.trim() || `docker exited ${result.exitCode}`}`
    )
  }
  return nonEmptyLines(result.stdout)
}
