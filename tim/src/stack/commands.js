import { runStackScript } from '../exec/stack.js'
import { restartStack } from './restart.js'
import { bounceBackend, terminalOutput } from './services.js'

const COMPOSE = 'docker compose'

const scriptCommand = (script, leadingArgs) => ({
  ran: script,
  run: ({ workspaceRoot, args }) =>
    runStackScript({ workspaceRoot, script, args: [...leadingArgs, ...args] })
})

const STACK_COMMANDS = {
  up: scriptCommand('run-stack.sh', []),
  dev: scriptCommand('run-stack.sh', ['-d']),
  down: scriptCommand('stop-stack.sh', []),
  restart: {
    ran: 'run-stack.sh',
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
 * @param {string[]} [opts.args] - Flags passed on to the stack scripts
 * @returns {Promise<{exitCode: number, durationMs: number, ran: string}>} ran names the step whose exit code this is
 * @throws {TimError} USAGE when the workspace is missing a stack script; others as the command's own steps throw
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
