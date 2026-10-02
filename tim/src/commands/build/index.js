import { resolve } from 'node:path'
import { z } from 'zod'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK, ERROR } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { parseOptions } from '../backlog/shared.js'
import { runBuildBranch } from '../../build/branch.js'
import { runGate, GATE_PHASES } from '../../build/gate.js'
import { registerRuns } from './runs.js'
import { registerStart } from './start.js'

const SCHEMA_VERSION = 1

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const workareaSchema = z
  .string()
  .trim()
  .min(1, 'Name a workarea, such as shared/my-programme.')

// The shape `git check-ref-format --branch` accepts, checked without running
// git so a bad name is refused before anything touches a repo.
const BRANCH_NAME =
  /^(?!-)(?!.*\.\.)(?!.*\/\/)(?!.*@\{)(?!.*\.lock(\/|$))[A-Za-z0-9._/-]+(?<![./])$/

const branchOptionsSchema = z.object({
  workarea: workareaSchema,
  branch: z
    .string()
    .trim()
    .regex(
      BRANCH_NAME,
      'The branch name is not valid. Use letters, digits and ".", "_", "-" or "/", such as feat/EUDPA-123-origin.'
    )
})

const gateOptionsSchema = z.object({
  workarea: workareaSchema,
  phase: z.enum(GATE_PHASES, {
    message: `--phase must be one of: ${GATE_PHASES.join(', ')}.`
  }),
  logs: z.string().trim().min(1).optional(),
  holder: z
    .string()
    .trim()
    .regex(
      /^[^\n\r"'`$]+$/,
      'The holder must be one line with no quotes, backticks or $.'
    )
    .optional(),
  serial: z.boolean()
})

const describeBranchRepo = ({
  repo,
  branch,
  head,
  created,
  switched,
  createdFrom,
  ok,
  error
}) => {
  if (!ok) return `  ${repo}  FAILED — ${error}`
  const shortHead = head?.slice(0, 12) ?? 'no commits'
  if (created) {
    return `  ${repo}  cut ${branch} from ${createdFrom} at ${shortHead}`
  }
  if (switched) return `  ${repo}  switched to ${branch} at ${shortHead}`
  return `  ${repo}  already on ${branch} at ${shortHead}`
}

/**
 * The plain-text report of `tim build branch`.
 *
 * @param {{branch: string, repos: object[]}} outcome
 * @returns {string}
 */
export const renderBranchText = ({ branch, repos }) =>
  [`Every repo on ${branch}:`, ...repos.map(describeBranchRepo)].join('\n')

const describeRung = ({ repo, name, phase, ok, durationMs, reason }) =>
  ok
    ? `  pass  ${phase}  ${repo} ${name} (${Math.round(durationMs / 1000)}s)`
    : `  FAIL  ${phase}  ${repo} ${name} — ${reason}`

const seconds = (durationMs) => `${Math.round(durationMs / 1000)}s`

const listOrNone = (services) =>
  services.length > 0 ? services.join(', ') : 'none'

const STACK_FILES_UNKNOWN =
  ' The workspace is not a git checkout, so the gate cannot tell whether its stack files (docker/stack, scripts/stack) changed, and did not start the whole stack again.'

const describeServices = (refresh) =>
  refresh.restacked
    ? ` The workspace’s stack files had changed, so the gate started the whole stack again with them. Read ${refresh.restackLog}.`
    : ` Rebuilt: ${listOrNone(refresh.rebuilt)}. Restarted: ${listOrNone(refresh.restarted)}. Left as they were: ${listOrNone(refresh.left)}.`

const describeRefresh = (refresh) => {
  if (!refresh) return ''
  const unknown = refresh.stackFilesKnown === false ? STACK_FILES_UNKNOWN : ''
  return `${describeServices(refresh)}${unknown}`
}

const describeStack = ({
  wasUp,
  startedForE2e,
  stoppedAfter,
  downError,
  held,
  refresh = null
}) => {
  if (held) {
    return `The workspace stack was not the gate’s to use: ${held.detail}`
  }
  if (wasUp === null) return 'The gate did not use the workspace stack.'
  if (!startedForE2e) {
    return `The workspace stack was already up under this holder’s lease. The gate brought each service up to date with local source and left the stack up.${describeRefresh(refresh)}`
  }
  return stoppedAfter
    ? 'The gate started the workspace stack from local source and stopped it afterwards.'
    : `The gate started the workspace stack and could not stop it: ${downError}`
}

const describeTiming = ({ durationMs, phases, serial }) => {
  const perPhase = Object.entries(phases)
    .map(([phase, { durationMs: phaseMs }]) => `${phase} ${seconds(phaseMs)}`)
    .join(', ')
  const how = serial
    ? 'one rung at a time'
    : 'unit and FIT first, repos at the same time, then performance, then E2E'
  return `Took ${seconds(durationMs)}${perPhase ? ` (${perPhase})` : ''}, ${how}.`
}

/**
 * The plain-text report of `tim build gate`.
 *
 * @param {{green: boolean, logs: string, rungs: object[], stack: object}} outcome
 * @returns {string}
 */
export const renderGateText = ({
  green,
  logs,
  rungs,
  stack,
  durationMs,
  phases = {},
  serial = false
}) => {
  const failures = rungs.filter(({ ok }) => !ok).length
  return [
    green
      ? `Gate passed: ${rungs.length} rungs.`
      : `Gate failed: ${failures} of ${rungs.length} rungs failed.`,
    ...rungs.map(describeRung),
    describeStack(stack),
    ...(durationMs === undefined
      ? []
      : [describeTiming({ durationMs, phases, serial })]),
    `Logs are in ${logs}.`
  ].join('\n')
}

const gateFailureMessage = ({ rungs, stack }) => {
  const failedRungs = rungs
    .filter(({ ok }) => !ok)
    .map(({ repo, name }) => `${repo} ${name}`)
  const stackProblem = [
    ...(stack.held ? [`stack held: ${stack.held.detail}`] : []),
    ...(stack.downError ? [`stack: ${stack.downError}`] : [])
  ]
  return `The gate failed: ${[...failedRungs, ...stackProblem].join(', ')}.`
}

const gateEnvelope = (outcome, timVersion) => ({
  ok: outcome.green,
  schema_version: SCHEMA_VERSION,
  tim_version: timVersion,
  result: outcome,
  errors: outcome.green
    ? []
    : [{ code: 'GATE_FAILED', message: gateFailureMessage(outcome) }],
  metadata: { ranAt: new Date().toISOString() }
})

// A checkout that failed after others succeeded still reports every repo, so
// the result stays on the envelope alongside the errors.
const branchEnvelope = (outcome, ok, timVersion) => ({
  ...jsonEnvelope({ ok: true, result: outcome, timVersion }),
  ok,
  errors: outcome.repos
    .filter((repo) => !repo.ok)
    .map(({ repo, error }) => ({
      code: 'CHECKOUT_FAILED',
      message: `${repo}: ${error}`
    }))
})

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

const registerBranch = (build, timVersion) =>
  build
    .command('branch')
    .argument(
      '<workarea>',
      'The workarea under workareas/, such as shared/my-programme'
    )
    .argument('<branch>', 'The branch every repo in the backlog should be on')
    .description(
      'Put every repo the backlog builds on one branch. Checks it out where it exists, otherwise cuts it with --no-track from the repo\'s default branch. Refuses before changing anything if a repo has uncommitted work, except the workspace repo itself (path "." in the backlog\'s repos), whose uncommitted files travel with it.'
    )
    .addHelpText(
      'after',
      '\nExample:\n  tim build branch shared/my-programme feat/EUDPA-123-origin --json'
    )
    .action(async function branchAction(workarea, branch) {
      const globalOpts = this.optsWithGlobals()
      try {
        const parsed = parseOptions(branchOptionsSchema, {
          workarea,
          branch
        })
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const outcome = await runBuildBranch({ workspaceRoot, ...parsed })
        const ok = outcome.repos.every((repo) => repo.ok)
        emit(
          globalOpts.json
            ? JSON.stringify(branchEnvelope(outcome, ok, timVersion))
            : renderBranchText(outcome)
        )
        process.exit(ok ? OK : ERROR)
      } catch (error) {
        reportError(error, globalOpts.json, timVersion)
      }
    })

const registerGate = (build, timVersion) =>
  build
    .command('gate')
    .argument(
      '<workarea>',
      'The workarea under workareas/, such as shared/my-programme'
    )
    .option('--phase <phase>', 'unit, fit, e2e or all', 'all')
    .option(
      '--logs <dir>',
      'Where each rung writes its log (default: logs/ beside the backlog)'
    )
    .option(
      '--holder <text>',
      'Who the gate takes the workspace stack lease as for its E2E phase: a build run passes its run id, so the gate reuses the run’s stack (default: this gate run)'
    )
    .option(
      '--serial',
      'Run one rung at a time: every unit rung, then every FIT rung, then E2E (to compare against the default)',
      false
    )
    .description(
      "Run the backlog's rungs from gates.json: unit and FIT rungs, and E2E against the workspace stack built from local source, under a lease (see tim docker lease). It runs in three layers, each once the one before has finished (passed or not): every unit and FIT rung, each repo's in order while other repos run at the same time; then every exclusive E2E rung (a performance test) on its own; then the other E2E rungs one after another. The stack gets ready during the first layer. --serial runs one rung at a time instead. A stack this holder already leases is not rebuilt: only the services whose files changed are rebuilt or restarted, unless the workspace’s own stack files (docker/stack, scripts/stack) changed, when the whole stack starts again. A rung with a cwd runs in that folder of its repo. A stack leased to anyone else, or up with no lease, is refused and left alone, and the result's stack.held names who has it. Every rung writes to its own log. Exits 1 unless every rung passed."
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim build gate shared/my-programme --phase unit --json\n  tim build gate shared/my-programme --phase e2e --holder "ibl-20261001T150000Z" --json\n  tim build gate shared/my-programme --serial --json\n  tim build gate shared/my-programme --logs /tmp/gate-logs'
    )
    .action(async function gateAction(workarea, opts) {
      const globalOpts = this.optsWithGlobals()
      try {
        const parsed = parseOptions(gateOptionsSchema, {
          workarea,
          phase: opts.phase,
          logs: opts.logs,
          holder: opts.holder,
          serial: opts.serial === true
        })
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const outcome = await runGate({
          workspaceRoot,
          workarea: parsed.workarea,
          phase: parsed.phase,
          serial: parsed.serial,
          logsDir: parsed.logs ? resolve(parsed.logs) : undefined,
          ...(parsed.holder ? { holder: parsed.holder } : {})
        })
        emit(
          globalOpts.json
            ? JSON.stringify(gateEnvelope(outcome, timVersion))
            : renderGateText(outcome)
        )
        process.exit(outcome.green ? OK : ERROR)
      } catch (error) {
        reportError(error, globalOpts.json, timVersion)
      }
    })

export const register = (program, { timVersion }) => {
  const build = program
    .command('build')
    .description(
      "The build loop's deterministic steps: start an increment (ticket and branch), put the backlog's repos on one branch, run its gate, and archive and report its runs"
    )
  registerStart(build, timVersion)
  registerBranch(build, timVersion)
  registerGate(build, timVersion)
  registerRuns(build, timVersion)
}
