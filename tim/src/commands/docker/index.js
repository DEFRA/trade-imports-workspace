import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { runStackScript } from '../../exec/stack.js'
import { OK, USAGE, ERROR } from '../../constants/exitCodes.js'
import { isTimError } from '../../errors.js'
import { registerLease, registerPerf } from './lease.js'
import {
  readLease,
  describeLease,
  defaultLeasePath
} from '../../exec/stack-lease.js'

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

const makeStackAction = ({ script, extraArgs = [], timVersion }) =>
  async function stackAction() {
    const globalOpts = this.optsWithGlobals()
    // Forward any positional / extra args after the command name to the script.
    const given = this.args ?? []
    const force = given.includes(FORCE)
    const passthrough = given.filter((arg) => arg !== FORCE)
    try {
      const workspaceRoot = resolveWorkspaceRoot({
        explicit: globalOpts.workspace
      })
      const lease = readLease(defaultLeasePath())
      if (lease && !force) {
        refuseUnderLease({ lease, json: globalOpts.json, timVersion })
        return
      }
      const result = await runStackScript({
        workspaceRoot,
        script,
        args: [...extraArgs, ...passthrough]
      })
      if (globalOpts.json) {
        emit(
          JSON.stringify({
            ok: result.exitCode === 0,
            schema_version: SCHEMA_VERSION,
            tim_version: timVersion,
            result: {
              script,
              args: [...extraArgs, ...passthrough],
              exitCode: result.exitCode,
              durationMs: result.durationMs
            },
            errors:
              result.exitCode === 0
                ? []
                : [
                    {
                      code: 'ERROR',
                      message: `${script} exited ${result.exitCode}`
                    }
                  ],
            metadata: { ranAt: new Date().toISOString() }
          })
        )
      }
      process.exit(result.exitCode === 0 ? OK : ERROR)
    } catch (error) {
      if (isTimError(error) && globalOpts.json) {
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
  }

// The stack scripts own their flag surface (-b, -e, --profile). tim forwards
// whatever it does not recognise instead of mirroring those flags, so the
// scripts stay the single source of truth — including `--help`, which
// helpOption(false) hands to the script rather than answering itself.
// allowUnknownOption covers the flags; allowExcessArguments covers their
// values, which arrive as positional operands.
const registerStackCommand = (
  docker,
  { name, description, script, extraArgs, timVersion }
) =>
  docker
    .command(name)
    .description(description)
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .helpOption(false)
    .action(makeStackAction({ script, extraArgs, timVersion }))

const STACK_COMMANDS = [
  {
    name: 'up',
    description: 'Start the workspace stack from Dockerhub images',
    script: 'run-stack.sh'
  },
  {
    name: 'dev',
    description: 'Start the stack built from local source (run-stack.sh -d)',
    script: 'run-stack.sh',
    extraArgs: ['-d']
  },
  {
    name: 'down',
    description: 'Stop the stack and clean up volumes (stop-stack.sh)',
    script: 'stop-stack.sh'
  },
  {
    name: 'restart',
    description: 'Restart the whole stack (restart-stack.sh)',
    script: 'restart-stack.sh'
  },
  {
    name: 'bounce-backend',
    description: 'Restart just the backend container (bounce-backend.sh)',
    script: 'bounce-backend.sh'
  }
]

export const register = (program, { timVersion }) => {
  const docker = program
    .command('docker')
    .description(
      'Workspace Docker stack — wraps scripts/stack/ (run-stack.sh, stop-stack.sh, etc.). While a build holds the stack lease (tim docker lease status), up, dev, down, restart and bounce-backend refuse unless you add --force. perf starts it as a performance target under a lease (tim docker perf).'
    )

  for (const command of STACK_COMMANDS) {
    registerStackCommand(docker, { ...command, timVersion })
  }
  registerLease(docker, timVersion)
  registerPerf(docker, timVersion)
}
