import { resolve } from 'node:path'
import { z } from 'zod'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK, ERROR } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { parseOptions } from '../backlog/shared.js'
import {
  runBuildBranch,
  LIFECYCLES,
  PROTECTED_BRANCHES
} from '../../build/branch.js'
import { runGate, GATE_PHASES } from '../../build/gate.js'

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

const branchOptionsSchema = z
  .object({
    workarea: workareaSchema,
    branch: z
      .string()
      .trim()
      .regex(
        BRANCH_NAME,
        'The branch name is not valid. Use letters, digits and ".", "_", "-" or "/", such as feat/EUDPA-123-origin.'
      ),
    lifecycle: z.enum(LIFECYCLES, {
      message: `--lifecycle must be one of: ${LIFECYCLES.join(', ')}.`
    })
  })
  .superRefine(({ branch, lifecycle }, context) => {
    if (lifecycle === 'local' && PROTECTED_BRANCHES.includes(branch)) {
      context.addIssue({
        code: 'custom',
        path: ['branch'],
        message: `A local run commits straight onto its branch, so name a scratch branch, not ${branch}.`
      })
    }
  })

const gateOptionsSchema = z.object({
  workarea: workareaSchema,
  phase: z.enum(GATE_PHASES, {
    message: `--phase must be one of: ${GATE_PHASES.join(', ')}.`
  }),
  logs: z.string().trim().min(1).optional()
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

const describeStack = ({ wasUp, startedForE2e, stoppedAfter, downError }) => {
  if (wasUp === null) return 'The gate did not use the workspace stack.'
  if (!startedForE2e) {
    return 'The workspace stack was already up. The gate rebuilt it from local source and left it up.'
  }
  return stoppedAfter
    ? 'The gate started the workspace stack from local source and stopped it afterwards.'
    : `The gate started the workspace stack and could not stop it: ${downError}`
}

/**
 * The plain-text report of `tim build gate`.
 *
 * @param {{green: boolean, logs: string, rungs: object[], stack: object}} outcome
 * @returns {string}
 */
export const renderGateText = ({ green, logs, rungs, stack }) => {
  const failures = rungs.filter(({ ok }) => !ok).length
  return [
    green
      ? `Gate passed: ${rungs.length} rungs.`
      : `Gate failed: ${failures} of ${rungs.length} rungs failed.`,
    ...rungs.map(describeRung),
    describeStack(stack),
    `Logs are in ${logs}.`
  ].join('\n')
}

const gateFailureMessage = ({ rungs, stack }) => {
  const failedRungs = rungs
    .filter(({ ok }) => !ok)
    .map(({ repo, name }) => `${repo} ${name}`)
  const stackProblem = stack.downError ? [`stack: ${stack.downError}`] : []
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
    .option(
      '--lifecycle <lifecycle>',
      'local (commits straight onto the branch, so never main) or full',
      'full'
    )
    .description(
      "Put every repo the backlog builds on one branch. Checks it out where it exists, otherwise cuts it with --no-track from the repo's default branch. Refuses before changing anything if a repo has uncommitted work."
    )
    .addHelpText(
      'after',
      '\nExample:\n  tim build branch shared/my-programme feat/EUDPA-123-origin --lifecycle full --json'
    )
    .action(async function branchAction(workarea, branch, opts) {
      const globalOpts = this.optsWithGlobals()
      try {
        const parsed = parseOptions(branchOptionsSchema, {
          workarea,
          branch,
          lifecycle: opts.lifecycle
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
    .description(
      "Run the backlog's rungs from gates.json in order: unit, then FIT, then E2E against the workspace stack built from local source. Every rung writes to its own log. Exits 1 unless every rung passed."
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim build gate shared/my-programme --phase unit --json\n  tim build gate shared/my-programme --logs /tmp/gate-logs'
    )
    .action(async function gateAction(workarea, opts) {
      const globalOpts = this.optsWithGlobals()
      try {
        const parsed = parseOptions(gateOptionsSchema, {
          workarea,
          phase: opts.phase,
          logs: opts.logs
        })
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const outcome = await runGate({
          workspaceRoot,
          workarea: parsed.workarea,
          phase: parsed.phase,
          logsDir: parsed.logs ? resolve(parsed.logs) : undefined
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
      "The build loop's deterministic steps: put the backlog's repos on one branch, and run its gate"
    )
  registerBranch(build, timVersion)
  registerGate(build, timVersion)
}
