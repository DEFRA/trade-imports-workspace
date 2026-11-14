import { composeArgs } from './compose.js'
import { ALL_PROFILES, OPT_IN_PROFILES } from './definition.js'

/**
 * Whether a stack command's arguments ask for help: `-h` or `--help` before
 * any `--`, after which every argument belongs to docker compose.
 *
 * @param {string[]} args
 * @returns {boolean}
 */
export const asksForHelp = (args) => {
  const separator = args.indexOf('--')
  const ownArgs = separator === -1 ? args : args.slice(0, separator)
  return ownArgs.some((arg) => arg === '-h' || arg === '--help')
}

/** `tim docker down --help`. */
export const DOWN_USAGE = [
  'Usage: tim docker down [--force] [<docker compose down args>]',
  '',
  'Stops the whole stack, every profile included, and removes its containers,',
  'its volumes and any orphan containers. Every database and queue is wiped.',
  'Anything given is passed on to `docker compose ... down`.',
  '',
  '  --force       Go ahead under a lease or on a stack another clone started.',
  '  -h, --help    Show this help.',
  '',
  'Examples:',
  '  tim docker down',
  '  tim docker down --timeout 1',
  ''
].join('\n')

/**
 * Take the whole stack down, every profile included, opt-in ones too so a
 * ZAP or Grafana started on its own is not left running, removing its
 * containers, its volumes and any orphan containers.
 *
 * @param {object} opts
 * @param {string} opts.workspaceRoot
 * @param {{heading: (heading: string) => void, docker: (args: string[], env: object) => Promise<{exitCode: number, durationMs: number}>}} opts.output - From terminalOutput or logOutput
 * @param {string[]} [opts.args] - Passed on to `docker compose ... down`
 * @param {object} [opts.env] - Extra environment for docker
 * @returns {Promise<{exitCode: number, durationMs: number}>} docker compose's own
 * @throws {TimError} MISSING_DEP when docker is not installed
 */
export const stopStack = ({ workspaceRoot, output, args = [], env = {} }) => {
  output.heading('Tearing down stack...')
  return output.docker(
    [
      ...composeArgs({
        workspaceRoot,
        profiles: [...ALL_PROFILES, ...OPT_IN_PROFILES]
      }),
      'down',
      '--volumes',
      '--remove-orphans',
      ...args
    ],
    env
  )
}
