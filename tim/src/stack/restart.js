import { runStreamed } from '../exec/exec.js'
import { stackScriptPath } from '../exec/stack.js'
import { coloursFor } from './colour.js'
import { stopStack } from './down.js'
import { terminalOutput } from './services.js'

const START_SCRIPT = 'run-stack.sh'

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
 * @throws {TimError} USAGE when the workspace has no run-stack.sh, MISSING_DEP when docker is not installed
 */
export const restartStack = async ({
  workspaceRoot,
  args = [],
  env = process.env
}) => {
  const startScript = stackScriptPath(workspaceRoot, START_SCRIPT)
  const { bold, reset } = coloursFor({ env, stream: process.stdout })
  process.stdout.write(`${bold}Restarting stack...${reset}\n`)
  const stopped = await stopStack({
    workspaceRoot,
    output: terminalOutput({ env })
  })
  const started = await runStreamed(startScript, args, { cwd: workspaceRoot })
  return {
    exitCode: started.exitCode,
    durationMs: stopped.durationMs + started.durationMs
  }
}
