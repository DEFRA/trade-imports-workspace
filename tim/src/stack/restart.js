import { coloursFor } from './colour.js'
import { stopStack } from './down.js'
import { START_USAGE } from './flags.js'
import { terminalOutput } from './services.js'
import { startStack } from './start.js'

/** `tim docker restart --help`, ending with the start flags it passes on. */
export const RESTART_USAGE = [
  'Usage: tim docker restart [tim docker up flags] [--force]',
  '',
  'Stops the stack the way tim docker down does, which removes its',
  'containers and wipes its volumes, so every database and queue starts',
  'empty. Then starts it again the way tim docker up does, passing on',
  'every flag given here.',
  '',
  "tim docker up's flags:",
  '',
  START_USAGE
].join('\n')

/**
 * Stop the stack, wiping its volumes, then start it again with the given
 * start flags. The start runs whether or not the stop succeeded.
 *
 * @param {object} opts
 * @param {string} opts.workspaceRoot
 * @param {string[]} [opts.args] - Flags for the start
 * @param {Record<string, string | undefined>} [opts.env=process.env] - Decides colour
 * @returns {Promise<{exitCode: number, durationMs: number}>} The start's exit code
 * @throws {TimError} MISSING_DEP when docker is not installed, and as startStack does
 */
export const restartStack = async ({
  workspaceRoot,
  args = [],
  env = process.env
}) => {
  const { bold, reset } = coloursFor({ env, stream: process.stdout })
  process.stdout.write(`${bold}Restarting stack...${reset}\n`)
  const output = terminalOutput({ env })
  const stopped = await stopStack({ workspaceRoot, output })
  const started = await startStack({ workspaceRoot, args, output })
  return {
    exitCode: started.exitCode,
    durationMs: stopped.durationMs + started.durationMs
  }
}
