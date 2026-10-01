import { z } from 'zod'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK, ERROR } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { parseOptions } from '../backlog/shared.js'
import { createJiraClient } from '../../clients/jira-client.js'
import { runBuildStart } from '../../build/start.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const required = (flag, example) =>
  z
    .string({ message: `Give ${flag}, such as ${example}.` })
    .trim()
    .min(1, `Give ${flag}, such as ${example}.`)

const incrementId = (flag) =>
  z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9._-]+$/,
      `${flag} must be an increment id, such as inc-003.`
    )
    .optional()

const startOptionsSchema = z.object({
  workarea: required('a workarea', 'shared/my-programme'),
  id: incrementId('--id'),
  last: incrementId('--last'),
  base: required('--base', 'main'),
  project: required('--jira-project', 'EUDPA'),
  epic: required('--epic', 'EUDPA-20628').regex(
    /^[A-Z][A-Z0-9]*-\d+$/,
    '--epic must be a Jira key, such as EUDPA-20628.'
  ),
  inDevStatus: required('--in-dev-status', '"In Dev"'),
  doneStatus: required('--done-status', 'Done'),
  board: required('--board', '13780').regex(
    /^\d+$/,
    '--board must be the numeric board id, such as 13780.'
  )
})

const describeTicket = ({ key, created, status }) =>
  `${created ? 'Raised' : 'Reused'} ${key}, now ${status}, on the board.`

/**
 * The plain-text report of `tim build start`.
 *
 * @param {object} outcome
 * @returns {string}
 */
export const renderStartText = (outcome) => {
  if (outcome.failedStep === null && outcome.id === null) {
    return 'Nothing in the backlog is buildable.'
  }
  if (outcome.repeat) {
    return `${outcome.id} is next again, so the last attempt at it did not land. Nothing was done.`
  }
  return [
    ...(outcome.id ? [`Increment ${outcome.id}.`] : []),
    ...(outcome.ticket ? [describeTicket(outcome.ticket)] : []),
    ...outcome.warnings,
    ...outcome.branched.map(
      ({ repo, branch, head, cut, from }) =>
        `  ${repo}  ${cut ? `cut ${branch} from ${from}` : `on ${branch}`} at ${head}`
    ),
    ...(outcome.resumeAt ? [`Resume at ${outcome.resumeAt}.`] : []),
    ...(outcome.failedStep
      ? [`The ${outcome.failedStep} step failed: ${outcome.reason}`]
      : [])
  ].join('\n')
}

const startEnvelope = (outcome, timVersion) => ({
  ...jsonEnvelope({ ok: true, result: outcome, timVersion }),
  ok: outcome.failedStep === null,
  errors: outcome.failedStep
    ? [
        {
          code: `${outcome.failedStep.toUpperCase()}_FAILED`,
          message: outcome.reason
        }
      ]
    : []
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

/**
 * `tim build start`: the build loop's start-up in one call.
 *
 * @param {import('commander').Command} build
 * @param {string} timVersion
 */
export const registerStart = (build, timVersion) =>
  build
    .command('start')
    .argument(
      '<workarea>',
      'The workarea under workareas/, such as shared/my-programme'
    )
    .option(
      '--id <increment>',
      'Start this increment rather than the next buildable one'
    )
    .option(
      '--last <increment>',
      'The increment the previous attempt built. Met again, start stops before the ticket and reports repeat'
    )
    .option('--base <branch>', 'The branch a new increment branch is cut from')
    .option('--jira-project <key>', 'The Jira project a raised ticket lands in')
    .option('--epic <key>', 'The epic a raised ticket hangs off')
    .option(
      '--in-dev-status <name>',
      "The board's working status, by its exact name"
    )
    .option(
      '--done-status <name>',
      "The board's finished status, by its exact name"
    )
    .option(
      '--board <id>',
      'The numeric id of the board tickets are moved onto'
    )
    .description(
      'Start an increment, in order: derive it (the next buildable one, or --id), give it a Jira ticket in the working status on the board (reusing the one on its row, or raising one and recording it at once), then put its repos on its branch, cut with --no-track from a freshly fetched origin/<base>. Safe to run again. A failure names its step (derive, ticket or branch) and its exact reason. Exits 1 when a step failed; nothing buildable is not a failure.'
    )
    .addHelpText(
      'after',
      '\nExample:\n  tim build start shared/my-programme --base main --jira-project EUDPA --epic EUDPA-20628 --in-dev-status "In Dev" --done-status Done --board 13780 --json'
    )
    .action(async function startAction(workarea, opts) {
      const globalOpts = this.optsWithGlobals()
      try {
        const parsed = parseOptions(startOptionsSchema, {
          workarea,
          id: opts.id,
          last: opts.last,
          base: opts.base,
          project: opts.jiraProject,
          epic: opts.epic,
          inDevStatus: opts.inDevStatus,
          doneStatus: opts.doneStatus,
          board: opts.board
        })
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const outcome = await runBuildStart({
          workspaceRoot,
          workarea: parsed.workarea,
          id: parsed.id,
          last: parsed.last,
          base: parsed.base,
          config: {
            project: parsed.project,
            epic: parsed.epic,
            inDevStatus: parsed.inDevStatus,
            doneStatus: parsed.doneStatus,
            board: Number(parsed.board)
          },
          jira: () => createJiraClient()
        })
        emit(
          globalOpts.json
            ? JSON.stringify(startEnvelope(outcome, timVersion))
            : renderStartText(outcome)
        )
        process.exit(outcome.failedStep === null ? OK : ERROR)
      } catch (error) {
        reportError(error, globalOpts.json, timVersion)
      }
    })
