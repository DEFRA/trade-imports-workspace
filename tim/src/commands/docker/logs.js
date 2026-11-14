import { z } from 'zod'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { runStreamed } from '../../exec/exec.js'
import { SERVICES, STACK_PROJECT } from '../../stack/definition.js'
import { OK, ERROR } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { parseOptions } from '../backlog/shared.js'

const DEFAULT_SERVICES = [
  'trade-imports-animals-frontend',
  'trade-imports-animals-admin',
  'trade-imports-animals-backend'
]

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const optionsSchema = z.object({
  follow: z.boolean(),
  tail: z
    .string()
    .regex(/^(\d+|all)$/, '--tail must be a whole number of lines, or "all".')
    .optional()
})

/**
 * The short labels `-e` takes, mapped to their compose service names.
 *
 * @returns {Map<string, string>}
 */
export const serviceLabels = () =>
  new Map(SERVICES.map(({ label, composeName }) => [label, composeName]))

const composeServicesFor = (requested, labels) =>
  requested.length === 0
    ? DEFAULT_SERVICES
    : requested.map((name) => labels.get(name) ?? name)

const composeLogsArgs = ({ services, follow, tail }) => [
  'compose',
  '-p',
  STACK_PROJECT,
  'logs',
  ...(follow ? ['-f'] : []),
  ...(tail ? ['--tail', tail] : []),
  ...services
]

const reportOutcome = ({ json, args, exitCode, timVersion }) => {
  if (!json) return
  const ok = exitCode === 0
  emit(
    JSON.stringify(
      jsonEnvelope({
        ok,
        result: { args, exitCode },
        error: ok
          ? undefined
          : {
              code: 'ERROR',
              message: `docker compose logs exited ${exitCode}`
            },
        timVersion
      })
    )
  )
}

const reportError = (error, json, timVersion) => {
  if (json) {
    emit(
      JSON.stringify(
        jsonEnvelope({ ok: false, error: errorPayloadFor(error), timVersion })
      )
    )
  } else {
    emitError(error.message ?? String(error))
  }
  process.exit(exitCodeFor(error))
}

const logsAction = (timVersion) =>
  async function action(requested, opts) {
    const globalOpts = this.optsWithGlobals()
    try {
      const { follow, tail } = parseOptions(optionsSchema, opts)
      const workspaceRoot = resolveWorkspaceRoot({
        explicit: globalOpts.workspace
      })
      const services = composeServicesFor(requested, serviceLabels())
      const args = composeLogsArgs({ services, follow, tail })
      const { exitCode } = await runStreamed('docker', args, {
        cwd: workspaceRoot
      })
      reportOutcome({ json: globalOpts.json, args, exitCode, timVersion })
      process.exit(exitCode === 0 ? OK : ERROR)
    } catch (error) {
      reportError(error, globalOpts.json, timVersion)
    }
  }

/**
 * `tim docker logs [services...]`: show the workspace stack's service logs.
 * It only reads, so it never takes or checks the stack lease.
 *
 * @param {import('commander').Command} docker
 * @param {string} timVersion
 */
export const registerLogs = (docker, timVersion) =>
  docker
    .command('logs')
    .description(
      'Follow the logs of services in the workspace stack. Press Ctrl-C to stop. With no services, follows the animals frontend, admin and backend. Name a service by its compose name, such as trade-imports-ins-backend, or by the short label run-stack.sh -e takes, such as frontend, backend or gateway. It only reads, so it works while a build holds the stack lease.'
    )
    .argument('[services...]', 'Services to show logs for')
    .option('--no-follow', 'Print the logs so far and stop')
    .option('--tail <lines>', 'Start from the last <lines> lines of each log')
    .addHelpText(
      'after',
      '\nExamples:\n  tim docker logs\n  tim docker logs backend ins-backend\n  tim docker logs trade-imports-stub --no-follow --tail 100'
    )
    .action(logsAction(timVersion))
