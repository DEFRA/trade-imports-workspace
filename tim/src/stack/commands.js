import { stopStack } from './down.js'
import { restartStack } from './restart.js'
import { bounceBackend, terminalOutput } from './services.js'
import { startStack } from './start.js'

const COMPOSE = 'docker compose'

const startCommand = (leadingArgs) => ({
  ran: COMPOSE,
  run: ({ workspaceRoot, args }) =>
    startStack({
      workspaceRoot,
      args: [...leadingArgs, ...args],
      output: terminalOutput()
    })
})

const STACK_COMMANDS = {
  up: startCommand([]),
  dev: startCommand(['-d']),
  down: {
    ran: COMPOSE,
    run: ({ workspaceRoot, args }) =>
      stopStack({ workspaceRoot, args, output: terminalOutput() })
  },
  restart: {
    ran: COMPOSE,
    run: ({ workspaceRoot, args }) => restartStack({ workspaceRoot, args })
  },
  'bounce-backend': {
    ran: COMPOSE,
    run: ({ workspaceRoot }) =>
      bounceBackend({ workspaceRoot, output: terminalOutput() })
  }
}

/** The stack commands `tim docker` and its menu share. */
export const STACK_COMMAND_NAMES = Object.keys(STACK_COMMANDS)

/**
 * Run one of the stack commands against the workspace, its output on this
 * terminal.
 *
 * @param {object} opts
 * @param {string} opts.workspaceRoot
 * @param {string} opts.command - One of {@link STACK_COMMAND_NAMES}
 * @param {string[]} [opts.args] - The command's own flags
 * @returns {Promise<{exitCode: number, durationMs: number, ran: string}>} ran names the step whose exit code this is
 * @throws {TimError} as the command's own steps throw
 */
export const runStackCommand = async ({
  workspaceRoot,
  command,
  args = []
}) => {
  const { ran, run } = STACK_COMMANDS[command]
  const result = await run({ workspaceRoot, args })
  return { exitCode: result.exitCode, durationMs: result.durationMs, ran }
}
