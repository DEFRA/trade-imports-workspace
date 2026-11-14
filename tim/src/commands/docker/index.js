import { Argument } from 'commander'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { otherCloneOwningStack } from '../../exec/stack.js'
import { OK, USAGE, ERROR } from '../../constants/exitCodes.js'
import { isTimError } from '../../errors.js'
import { registerLease, registerPerf } from './lease.js'
import { registerLogs } from './logs.js'
import { registerOwner } from './owner.js'
import {
  readLease,
  describeLease,
  defaultLeasePath
} from '../../exec/stack-lease.js'
import { runStackCommand } from '../../stack/commands.js'
import { asksForHelp, DOWN_USAGE } from '../../stack/down.js'
import { printRestartHelp } from '../../stack/restart.js'
import {
  SERVICE_ACTION_NAMES,
  runServiceAction,
  terminalOutput
} from '../../stack/services.js'

const SCHEMA_VERSION = 1

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const FORCE = '--force'

const leaseRefusal = (lease) =>
  `The workspace stack is leased to ${describeLease(lease)}, so tim docker leaves it alone: a build is using it. Ask its holder to release it (tim docker lease release --holder "${lease.holder}"). To go ahead anyway, add ${FORCE}; the holder will then refuse to reuse or take down what you start.`

const refuseUnderLease = ({ lease, json, timVersion }) => {
  const message = leaseRefusal(lease)
  if (json) {
    emit(
      JSON.stringify({
        ok: false,
        schema_version: SCHEMA_VERSION,
        tim_version: timVersion,
        result: { holder: lease.holder, lease },
        errors: [{ code: 'STACK_HELD', message }]
      })
    )
  } else {
    emitError(message)
  }
  process.exit(ERROR)
}

const otherCloneRefusal = ({ owner, workspaceRoot }) =>
  `The workspace stack running now was started from another clone, ${owner}, so tim docker leaves it alone. This clone is ${workspaceRoot}. Run tim docker from that clone, or take the stack down there first. To go ahead anyway, add ${FORCE}.`

const refuseOtherClone = ({ owner, workspaceRoot, json, timVersion }) => {
  const message = otherCloneRefusal({ owner, workspaceRoot })
  if (json) {
    emit(
      JSON.stringify({
        ok: false,
        schema_version: SCHEMA_VERSION,
        tim_version: timVersion,
        result: { workspace: owner },
        errors: [{ code: 'STACK_OTHER_CLONE', message }]
      })
    )
  } else {
    emitError(message)
  }
  process.exit(ERROR)
}

const reportRun = ({ command, args, result, json, timVersion }) => {
  if (json) {
    emit(
      JSON.stringify({
        ok: result.exitCode === 0,
        schema_version: SCHEMA_VERSION,
        tim_version: timVersion,
        result: {
          command,
          args,
          exitCode: result.exitCode,
          durationMs: result.durationMs
        },
        errors:
          result.exitCode === 0
            ? []
            : [
                {
                  code: 'ERROR',
                  message: `${result.ran} exited ${result.exitCode}`
                }
              ],
        metadata: { ranAt: new Date().toISOString() }
      })
    )
  }
  process.exit(result.exitCode === 0 ? OK : ERROR)
}

const reportError = ({ error, json, timVersion }) => {
  if (isTimError(error) && json) {
    emit(
      JSON.stringify({
        ok: false,
        schema_version: SCHEMA_VERSION,
        tim_version: timVersion,
        result: null,
        errors: [{ code: error.code, message: error.message }]
      })
    )
  } else {
    emitError(error.message ?? String(error))
  }
  process.exit(isTimError(error) && error.code === 'USAGE' ? USAGE : ERROR)
}

const refuseUnlessFree = async ({ workspaceRoot, force, json, timVersion }) => {
  if (force) return
  const lease = readLease(defaultLeasePath())
  if (lease) {
    refuseUnderLease({ lease, json, timVersion })
    return
  }
  const owner = await otherCloneOwningStack({ workspaceRoot })
  if (owner) refuseOtherClone({ owner, workspaceRoot, json, timVersion })
}

const runGuarded = async ({
  command,
  args,
  force,
  globalOpts,
  timVersion,
  run
}) => {
  const json = globalOpts.json
  try {
    const workspaceRoot = resolveWorkspaceRoot({
      explicit: globalOpts.workspace
    })
    await refuseUnlessFree({ workspaceRoot, force, json, timVersion })
    const result = await run({ workspaceRoot })
    reportRun({ command, args, result, json, timVersion })
  } catch (error) {
    reportError({ error, json, timVersion })
  }
}

const answerRestartHelp = async (globalOpts, timVersion) => {
  try {
    const workspaceRoot = resolveWorkspaceRoot({
      explicit: globalOpts.workspace
    })
    const result = await printRestartHelp({ workspaceRoot })
    process.exit(result.exitCode === 0 ? OK : ERROR)
  } catch (error) {
    reportError({ error, json: globalOpts.json, timVersion })
  }
}

const forwardingAction = ({ name, timVersion }) =>
  async function stackAction() {
    const globalOpts = this.optsWithGlobals()
    const given = this.args ?? []
    const args = given.filter((arg) => arg !== FORCE)
    if (name === 'restart' && asksForHelp(args)) {
      await answerRestartHelp(globalOpts, timVersion)
      return
    }
    if (name === 'down' && asksForHelp(args)) {
      process.stdout.write(DOWN_USAGE)
      process.exit(OK)
    }
    await runGuarded({
      command: name,
      args,
      force: given.includes(FORCE),
      globalOpts,
      timVersion,
      run: ({ workspaceRoot }) =>
        runStackCommand({ workspaceRoot, command: name, args })
    })
  }

const FORWARDING_COMMANDS = [
  {
    name: 'up',
    description: 'Start the workspace stack from Dockerhub images'
  },
  {
    name: 'dev',
    description: 'Start the stack built from local source (run-stack.sh -d)'
  },
  {
    name: 'down',
    description:
      'Stop the stack, every profile included, removing its containers and wiping its volumes (tim docker down --help)'
  },
  {
    name: 'restart',
    description:
      'Stop the stack, wiping its volumes, then start it again with the flags given (tim docker restart --help lists them)'
  }
]

// The stack scripts own their flag surface (-b, -e, --profile). tim forwards
// whatever it does not recognise instead of mirroring those flags, so the
// scripts stay the single source of truth for them and for their `--help`,
// which helpOption(false) leaves to the action. allowUnknownOption covers
// the flags; allowExcessArguments covers their values, which arrive as
// positional operands.
const registerForwardingCommand = (docker, { name, description, timVersion }) =>
  docker
    .command(name)
    .description(description)
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .helpOption(false)
    .action(forwardingAction({ name, timVersion }))

const exitWithUsageOnError = (error) =>
  process.exit(error.exitCode === 0 ? OK : USAGE)

const registerBounceBackend = (docker, timVersion) =>
  docker
    .command('bounce-backend')
    .description(
      'Rebuild the backend image and recreate its container on its own, without its dependencies, then wait until it is healthy. Use it after a pom.xml or dependency change, which hot reload does not pick up. Data is kept.'
    )
    .option(FORCE, 'Go ahead under a lease or on a stack another clone started')
    .addHelpText('after', '\nExample:\n  tim docker bounce-backend')
    .exitOverride(exitWithUsageOnError)
    .action(async function bounceAction(options) {
      await runGuarded({
        command: 'bounce-backend',
        args: [],
        force: Boolean(options.force),
        globalOpts: this.optsWithGlobals(),
        timVersion,
        run: ({ workspaceRoot }) =>
          runStackCommand({ workspaceRoot, command: 'bounce-backend' })
      })
    })

const registerService = (docker, timVersion) =>
  docker
    .command('service')
    .description(
      'Rebuild or restart named services of a running dev stack (tim docker dev), touching only those services, then wait until they are healthy. rebuild builds the image from local source and recreates the container. restart keeps the container, for source changes its bind mount already carries. Data is kept.'
    )
    .addArgument(
      new Argument('<action>', 'rebuild or restart').choices(
        SERVICE_ACTION_NAMES
      )
    )
    .argument('<services...>', 'Compose service names')
    .option(FORCE, 'Go ahead under a lease or on a stack another clone started')
    .addHelpText(
      'after',
      '\nExamples:\n  tim docker service rebuild trade-imports-animals-frontend\n  tim docker service restart trade-imports-stub trade-imports-reference-data'
    )
    .exitOverride(exitWithUsageOnError)
    .action(async function serviceAction(action, services, options) {
      await runGuarded({
        command: 'service',
        args: [action, ...services],
        force: Boolean(options.force),
        globalOpts: this.optsWithGlobals(),
        timVersion,
        run: async ({ workspaceRoot }) => ({
          ...(await runServiceAction({
            workspaceRoot,
            action,
            services,
            output: terminalOutput()
          })),
          ran: 'docker compose'
        })
      })
    })

export const register = (program, { timVersion }) => {
  const docker = program
    .command('docker')
    .description(
      'Workspace Docker stack. up and dev run scripts/stack/run-stack.sh; down, restart, bounce-backend and service run docker compose from tim. While a build holds the stack lease (tim docker lease status), or another clone of the workspace started the running stack, up, dev, down, restart, bounce-backend and service refuse unless you add --force. There is one stack per machine, and any clone may own it. perf starts it as a performance target under a lease (tim docker perf). logs follows service logs and never needs the lease. owner prints the clone that owns the stack, the only clone that runs local E2E.'
    )

  for (const command of FORWARDING_COMMANDS) {
    registerForwardingCommand(docker, { ...command, timVersion })
  }
  registerBounceBackend(docker, timVersion)
  registerService(docker, timVersion)
  registerLease(docker, timVersion)
  registerPerf(docker, timVersion)
  registerLogs(docker, timVersion)
  registerOwner(docker, timVersion)
}
