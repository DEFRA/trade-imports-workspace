import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { runStreamed, runToLog } from '../exec/exec.js'
import { coloursFor } from './colour.js'
import { composeInvocation } from './compose.js'
import { ALL_PROFILES, DEV_COMPOSE_FILE, stackDir } from './definition.js'

/** The compose service `tim docker bounce-backend` recreates. */
export const BOUNCED_SERVICE = 'trade-imports-animals-backend'

const SERVICE_ACTIONS = {
  rebuild: {
    heading: 'Rebuilding from local source:',
    steps: (services) => [
      ['up', '--build', '--no-deps', '--wait', '--detach', ...services]
    ]
  },
  restart: {
    heading: 'Restarting:',
    steps: (services) => [
      ['restart', ...services],
      ['up', '--no-deps', '--no-recreate', '--wait', '--detach', ...services]
    ]
  }
}

/** What `tim docker service` can do to a service: rebuild or restart it. */
export const SERVICE_ACTION_NAMES = Object.keys(SERVICE_ACTIONS)

const headingLine = ({ bold, reset }, heading, detail) =>
  `${bold}${heading}${reset}${detail === undefined ? '' : ` ${detail}`}\n`

/**
 * Output to this terminal: headings on standard output, bold when it takes
 * colour, and docker's own output streamed as it comes.
 *
 * @param {object} [opts]
 * @param {Record<string, string | undefined>} [opts.env=process.env] - Decides colour
 * @returns {{heading: (heading: string, detail?: string) => void, docker: (args: string[], env: object) => Promise<{exitCode: number, durationMs: number}>}}
 */
export const terminalOutput = ({ env = process.env } = {}) => {
  const colours = coloursFor({ env, stream: process.stdout })
  return {
    heading: (heading, detail) =>
      process.stdout.write(headingLine(colours, heading, detail)),
    docker: (args, dockerEnv) => runStreamed('docker', args, { env: dockerEnv })
  }
}

/**
 * Output to a log file, replaced now: the log starts with the command line
 * and the folder it ran in, then holds each heading and docker's output.
 *
 * @param {object} opts
 * @param {string} opts.logPath
 * @param {string} opts.commandLine - The command the log is for, as typed
 * @param {string} opts.cwd
 * @returns {{heading: (heading: string, detail?: string) => void, docker: (args: string[], env: object) => Promise<{exitCode: number, durationMs: number, log: string}>}}
 */
export const logOutput = ({ logPath, commandLine, cwd }) => {
  mkdirSync(dirname(logPath), { recursive: true })
  writeFileSync(logPath, `$ ${commandLine}\n# in ${cwd}\n\n`)
  const plain = { bold: '', reset: '' }
  return {
    heading: (heading, detail) =>
      appendFileSync(logPath, headingLine(plain, heading, detail)),
    docker: (args, dockerEnv) =>
      runToLog('docker', args, {
        logPath,
        cwd,
        env: dockerEnv,
        commandHeader: false,
        append: true
      })
  }
}

const stackCompose = ({ workspaceRoot, dev, env }) =>
  composeInvocation({
    workspaceRoot,
    dev,
    profiles: ALL_PROFILES,
    env: { ...process.env, ...env }
  })

const runSteps = async ({ output, compose, steps, env }) => {
  const dockerEnv = { ...env, ...compose.env }
  const finished = []
  for (const step of steps) {
    const result = await output.docker([...compose.args, ...step], dockerEnv)
    finished.push(result)
    if (result.exitCode !== 0) break
  }
  return {
    exitCode: finished.at(-1).exitCode,
    durationMs: finished.reduce(
      (total, { durationMs }) => total + durationMs,
      0
    )
  }
}

/**
 * Rebuild the backend's image and recreate its container on its own,
 * without its dependencies, then wait until it is healthy. The dev overlay
 * is named whenever the workspace has one. Data is kept.
 *
 * @param {object} opts
 * @param {string} opts.workspaceRoot
 * @param {ReturnType<typeof terminalOutput>} opts.output
 * @param {object} [opts.env] - Extra environment for docker
 * @returns {Promise<{exitCode: number, durationMs: number}>}
 * @throws {TimError} MISSING_DEP when docker is not installed
 */
export const bounceBackend = async ({ workspaceRoot, output, env = {} }) => {
  const dev = existsSync(join(stackDir(workspaceRoot), DEV_COMPOSE_FILE))
  const compose = await stackCompose({ workspaceRoot, dev, env })
  output.heading('Bouncing backend (force-recreate, no-deps)...')
  return runSteps({
    output,
    compose,
    env,
    steps: [
      [
        'up',
        '--build',
        '--force-recreate',
        '--no-deps',
        '--wait',
        BOUNCED_SERVICE
      ]
    ]
  })
}

/**
 * Rebuild or restart named services of a running dev stack, with the
 * stack's compose files and default profiles, touching only those services,
 * then wait until each is healthy. A rebuild builds the image from local
 * source and recreates the container; a restart keeps the container. Stops
 * at the first docker call that fails. Data is kept.
 *
 * @param {object} opts
 * @param {string} opts.workspaceRoot
 * @param {'rebuild'|'restart'} opts.action
 * @param {string[]} opts.services - Compose service names, at least one
 * @param {ReturnType<typeof terminalOutput>} opts.output
 * @param {object} [opts.env] - Extra environment for docker
 * @returns {Promise<{exitCode: number, durationMs: number}>}
 * @throws {TimError} MISSING_DEP when docker is not installed
 */
export const runServiceAction = async ({
  workspaceRoot,
  action,
  services,
  output,
  env = {}
}) => {
  const { heading, steps } = SERVICE_ACTIONS[action]
  const compose = await stackCompose({ workspaceRoot, dev: true, env })
  output.heading(heading, services.join(' '))
  return runSteps({ output, compose, env, steps: steps(services) })
}
