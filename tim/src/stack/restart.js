import { runStreamed } from '../exec/exec.js'
import { stackScriptPath } from '../exec/stack.js'
import { coloursFor } from './colour.js'

const STOP_SCRIPT = 'stop-stack.sh'
const START_SCRIPT = 'run-stack.sh'

/**
 * Whether restart's arguments ask for help: `-h` or `--help` before any
 * `--`, after which every argument belongs to docker compose.
 *
 * @param {string[]} args
 * @returns {boolean}
 */
export const asksForRestartHelp = (args) => {
  const separator = args.indexOf('--')
  const ownArgs = separator === -1 ? args : args.slice(0, separator)
  return ownArgs.some((arg) => arg === '-h' || arg === '--help')
}

/**
 * Print restart's usage, then the start flags it passes on, without
 * touching Docker.
 *
 * @param {object} opts
 * @param {string} opts.workspaceRoot
 * @returns {Promise<{exitCode: number, durationMs: number}>}
 * @throws {TimError} USAGE when the workspace has no run-stack.sh
 */
export const printRestartHelp = ({ workspaceRoot }) => {
  const startScript = stackScriptPath(workspaceRoot, START_SCRIPT)
  process.stdout.write(
    [
      'Usage: tim docker restart [tim docker up flags] [--force]',
      '',
      'Stops the stack the way tim docker down does, which removes its',
      'containers and wipes its volumes, so every database and queue starts',
      'empty. Then starts it again the way tim docker up does, passing on',
      'every flag given here.',
      '',
      "tim docker up's flags:",
      '',
      ''
    ].join('\n')
  )
  return runStreamed(startScript, ['--help'], { cwd: workspaceRoot })
}

/**
 * Stop the stack, wiping its volumes, then start it again with the given
 * start flags. The start runs whether or not the stop succeeded.
 *
 * @param {object} opts
 * @param {string} opts.workspaceRoot
 * @param {string[]} [opts.args] - Flags for the start
 * @param {Record<string, string | undefined>} [opts.env=process.env] - Decides colour
 * @returns {Promise<{exitCode: number, durationMs: number}>} The start's exit code
 * @throws {TimError} USAGE when the workspace has no stop-stack.sh or run-stack.sh
 */
export const restartStack = async ({
  workspaceRoot,
  args = [],
  env = process.env
}) => {
  const stopScript = stackScriptPath(workspaceRoot, STOP_SCRIPT)
  const startScript = stackScriptPath(workspaceRoot, START_SCRIPT)
  const { bold, reset } = coloursFor({ env, stream: process.stdout })
  process.stdout.write(`${bold}Restarting stack...${reset}\n`)
  const stopped = await runStreamed(stopScript, [], { cwd: workspaceRoot })
  const started = await runStreamed(startScript, args, { cwd: workspaceRoot })
  return {
    exitCode: started.exitCode,
    durationMs: stopped.durationMs + started.durationMs
  }
}
