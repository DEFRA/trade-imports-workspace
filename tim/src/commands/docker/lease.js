import { dirname, join, resolve } from 'node:path'
import { z } from 'zod'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK, ERROR } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { parseOptions } from '../backlog/shared.js'
import {
  acquireStack,
  releaseStack,
  stackStatus,
  describeLease,
  defaultLeasePath,
  LEASE_MODES,
  STUB_PROFILES,
  perfStubProfile
} from '../../exec/stack-lease.js'
import { TimError } from '../../errors.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const holderSchema = z
  .string({
    message:
      'Name the holder with --holder, such as the build run’s id, "ibl-20261001T090000Z".'
  })
  .trim()
  .min(
    1,
    'Name the holder with --holder, such as the build run’s id, "ibl-20261001T090000Z".'
  )
  .regex(
    /^[^\n\r"'`$]+$/,
    'The holder must be one line with no quotes, backticks or $.'
  )

const acquireSchema = z.object({
  holder: holderSchema,
  mode: z.enum(LEASE_MODES, {
    message: `--mode must be one of: ${LEASE_MODES.join(', ')}.`
  }),
  logs: z.string().trim().min(1).optional()
})

const releaseSchema = z.object({
  holder: holderSchema,
  logs: z.string().trim().min(1).optional()
})

const stubProfileSchema = z.enum(STUB_PROFILES)

const requireValidStubProfile = (env = process.env) => {
  const profile = perfStubProfile(env)
  if (!stubProfileSchema.safeParse(profile).success) {
    throw new TimError(
      'USAGE',
      `STUB_PROFILE must be ${STUB_PROFILES.join(' or ')}, not "${profile}".`
    )
  }
}

const logsDirFor = (logs, leasePath) =>
  logs ? resolve(logs) : join(dirname(leasePath), 'logs')

const envelopeOf = ({ ok, result, code, message, timVersion }) =>
  ok
    ? jsonEnvelope({ ok: true, result, timVersion })
    : {
        ...jsonEnvelope({ ok: true, result, timVersion }),
        ok: false,
        errors: [{ code, message }]
      }

const acquireText = (outcome) => {
  if (!outcome.acquired) return outcome.reason
  const { holder, mode, stubProfile } = outcome.lease
  if (outcome.reused) {
    return `The workspace stack is already leased to "${holder}". Reused it as it is.`
  }
  const startedIn = stubProfile
    ? `${mode} mode, with both stubs on the ${stubProfile} latency profile,`
    : `${mode} mode`
  return `Started the workspace stack in ${startedIn} and leased it to "${holder}". Release it with tim docker lease release --holder "${holder}".`
}

const acquireFailureCode = (outcome) =>
  outcome.refused ? 'STACK_HELD' : 'STACK_START_FAILED'

const releaseText = (outcome) => {
  if (!outcome.released) return outcome.reason
  return outcome.stoppedStack
    ? `Took the workspace stack down and cleared the lease "${outcome.holder}" held.`
    : `The workspace stack was already down. Cleared the lease "${outcome.holder}" held.`
}

// Releasing with no lease is not a failure: there is nothing to give back,
// and the stack is left alone either way.
const releaseFailureCode = (outcome) => {
  if (outcome.foreign) return 'FOREIGN_STACK'
  if (outcome.released || (!outcome.refused && !outcome.lease)) return null
  return outcome.refused ? 'NOT_HOLDER' : 'STACK_STOP_FAILED'
}

const statusText = ({ up, containers, lease }) => {
  const stack = up
    ? `The workspace stack is up (${containers.length} ${containers.length === 1 ? 'container' : 'containers'}).`
    : 'The workspace stack is down.'
  if (lease) return `${stack} It is leased to ${describeLease(lease)}.`
  return up
    ? `${stack} Nobody holds a lease on it, so somebody started it by hand.`
    : `${stack} Nobody holds a lease on it.`
}

const report = ({ json, ok, result, code, text, timVersion }) => {
  emit(
    json
      ? JSON.stringify(
          envelopeOf({ ok, result, code, message: text, timVersion })
        )
      : text
  )
  process.exit(ok ? OK : ERROR)
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

const leaseAction = (run, timVersion) =>
  async function action(opts) {
    const globalOpts = this.optsWithGlobals()
    try {
      const workspaceRoot = resolveWorkspaceRoot({
        explicit: globalOpts.workspace
      })
      const leasePath = defaultLeasePath()
      report({
        json: globalOpts.json,
        timVersion,
        ...(await run({ workspaceRoot, leasePath, opts }))
      })
    } catch (error) {
      reportError(error, globalOpts.json, timVersion)
    }
  }

const runAcquire = async ({ workspaceRoot, leasePath, opts }) => {
  const parsed = parseOptions(acquireSchema, opts)
  if (parsed.mode === 'perf') requireValidStubProfile()
  const outcome = await acquireStack({
    workspaceRoot,
    holder: parsed.holder,
    mode: parsed.mode,
    leasePath,
    logPath: join(logsDirFor(parsed.logs, leasePath), 'lease-acquire.log')
  })
  return {
    ok: outcome.acquired,
    result: outcome,
    code: outcome.acquired ? null : acquireFailureCode(outcome),
    text: acquireText(outcome)
  }
}

const runRelease = async ({ workspaceRoot, leasePath, opts }) => {
  const parsed = parseOptions(releaseSchema, opts)
  const outcome = await releaseStack({
    workspaceRoot,
    holder: parsed.holder,
    leasePath,
    logPath: join(logsDirFor(parsed.logs, leasePath), 'lease-release.log')
  })
  const code = releaseFailureCode(outcome)
  return {
    ok: code === null,
    result: outcome,
    code,
    text: releaseText(outcome)
  }
}

const runStatus = async ({ leasePath }) => {
  const status = await stackStatus({ leasePath })
  return {
    ok: true,
    result: { ...status, leasePath },
    text: statusText(status)
  }
}

const runPerf = (context) =>
  runAcquire({ ...context, opts: { ...context.opts, mode: 'perf' } })

/**
 * `tim docker perf`: take the stack lease in perf mode.
 *
 * @param {import('commander').Command} docker
 * @param {string} timVersion
 */
export const registerPerf = (docker, timVersion) =>
  docker
    .command('perf')
    .description(
      'Start the workspace stack as a performance target and lease it: published images, with both stubs answering at the latency profile in STUB_PROFILE (default sla). A stack somebody else holds, or one up with no lease, is refused and left alone. The build gate never uses this mode.'
    )
    .option('--holder <text>', 'Who takes the lease', 'perf')
    .option('--logs <dir>', 'Where run-stack.sh writes its log')
    .addHelpText(
      'after',
      '\nExamples:\n  tim docker perf\n  STUB_PROFILE=zero-delay tim docker perf --json\n  tim docker lease release --holder perf'
    )
    .action(leaseAction(runPerf, timVersion))

/**
 * `tim docker lease acquire|release|status`: who holds the workspace stack.
 *
 * @param {import('commander').Command} docker
 * @param {string} timVersion
 */
export const registerLease = (docker, timVersion) => {
  const lease = docker
    .command('lease')
    .description(
      'Who holds the workspace stack. A build run takes the lease once, as its run id, when it starts, every stage and gate reuses it with that same holder, and the run gives it back when it ends, so a stack is never left up with nobody owning it. The lease file is per machine: TIM_STACK_LEASE, or tim/stack-lease.json under XDG_STATE_HOME (default ~/.local/state).'
    )

  lease
    .command('acquire')
    .description(
      'Take the lease. A stack that is down is started and leased to you; one you already hold is reused. A stack leased to anyone else, or up with no lease, is refused and left alone. Exits 1 with STACK_HELD and the holder when refused.'
    )
    .option(
      '--holder <text>',
      'Who takes the lease, such as "<run> <increment> <stage>"'
    )
    .option(
      '--mode <mode>',
      'dev (build from local source), up (published images) or perf (published images, both stubs on the STUB_PROFILE latency profile, default sla)',
      'dev'
    )
    .option('--logs <dir>', 'Where run-stack.sh writes its log')
    .addHelpText(
      'after',
      '\nExample:\n  tim docker lease acquire --holder "ibl-20261001T090000Z" --json'
    )
    .action(leaseAction(runAcquire, timVersion))

  lease
    .command('release')
    .description(
      'Give the lease back: take down the stack you started, then clear the lease. Refuses a lease somebody else holds, and never takes down a stack nobody leases.'
    )
    .option('--holder <text>', 'Who gives the lease back')
    .option('--logs <dir>', 'Where stop-stack.sh writes its log')
    .addHelpText(
      'after',
      '\nExample:\n  tim docker lease release --holder "ibl-20261001T090000Z" --json'
    )
    .action(leaseAction(runRelease, timVersion))

  lease
    .command('status')
    .description(
      'Say whether the workspace stack is up and who holds its lease'
    )
    .addHelpText('after', '\nExample:\n  tim docker lease status --json')
    .action(leaseAction(runStatus, timVersion))
}
