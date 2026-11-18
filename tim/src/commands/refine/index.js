import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { makeRunAction } from '../_run-action.js'
import { writeLine } from '../_write-line.js'
import { checkedVerdict, finalizeRefinement } from './finalize.js'
import { prepareRefinement } from './prepare.js'

/**
 * The plain-text report `tim refine prepare` ends with.
 *
 * @param {{directory: string, meta: {ticket: string, type: string, summary: string}}} prepared
 * @returns {string}
 */
export const renderPreparedText = ({ directory, meta }) =>
  [
    '',
    '=== Refinement Workspace Ready ===',
    `Ticket: ${meta.ticket} (${meta.type})`,
    `Summary: ${meta.summary}`,
    `Directory: ${directory}`,
    '',
    'Created:',
    '  ✓ ticket.md',
    '  ✓ .refinement-meta.json (verdict: null)',
    '  ✓ review.md (stub from template)',
    '',
    `Next: fill review.md, then run tim refine finalize ${meta.ticket} --verdict {READY|NEEDS WORK|SPIKE REQUIRED}`
  ].join('\n')

/**
 * @param {{ticket: string, verdict: string, reason: string|null, metaPath: string}} finalized
 * @returns {string}
 */
export const renderFinalizedText = ({ ticket, verdict, reason, metaPath }) =>
  [
    `Verdict recorded for ${ticket}: ${verdict}`,
    ...(reason === null ? [] : [`Reason: ${reason}`]),
    `Meta: ${metaPath}`
  ].join('\n')

const progressWriter = ({ json }) =>
  json ? async () => {} : (line) => writeLine(process.stdout, line)

const registerPrepare = (refine, { timVersion }) =>
  refine
    .command('prepare')
    .description(
      "Set up a ticket's refinement folder under workareas/ticket-refinement/<ticket>: ticket.md from the ticket, its comments and the Confluence pages its description links to, .refinement-meta.json with no verdict, and a review.md stub from the ticket-refiner template. A review.md that already has content is kept. Running it again resets the verdict."
    )
    .argument('<ticket>', 'The Jira ticket key')
    .addHelpText(
      'after',
      '\nExamples:\n  tim refine prepare EUDPA-1234\n  tim refine prepare EUDPA-1234 --json'
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          workspaceRoot: resolveWorkspaceRoot({ explicit: opts.workspace }),
          log: progressWriter(opts)
        }),
        run: ({ args: [ticket] }, { workspaceRoot, log }) =>
          prepareRefinement({ workspaceRoot, ticket, log }),
        renderText: renderPreparedText,
        timVersion
      })
    )

const registerFinalize = (refine, { timVersion }) =>
  refine
    .command('finalize')
    .description(
      "Record the verdict on a ticket's .refinement-meta.json once review.md is filled in. The verdict must be READY, NEEDS WORK or SPIKE REQUIRED."
    )
    .argument('<ticket>', 'The Jira ticket key')
    .requiredOption(
      '--verdict <verdict>',
      'READY, NEEDS WORK or SPIKE REQUIRED'
    )
    .option('--reason <text>', 'Why, in a sentence')
    .addHelpText(
      'after',
      '\nExamples:\n  tim refine finalize EUDPA-1234 --verdict READY --reason "Clear AC, repos identified"\n  tim refine finalize EUDPA-1234 --verdict "NEEDS WORK"'
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          verdict: checkedVerdict(opts.verdict),
          reason: opts.reason ?? '',
          workspaceRoot: resolveWorkspaceRoot({ explicit: opts.workspace })
        }),
        run: ({ args: [ticket] }, parsed) =>
          finalizeRefinement({ ticket, ...parsed }),
        renderText: renderFinalizedText,
        timVersion
      })
    )

/**
 * `tim refine`: the ticket-refiner skill's workarea.
 *
 * @param {import('commander').Command} program
 * @param {{timVersion: string}} options
 */
export const register = (program, { timVersion }) => {
  const refine = program
    .command('refine')
    .description(
      'Prepare a Jira ticket for a refinement check, then record its verdict'
    )
  registerPrepare(refine, { timVersion })
  registerFinalize(refine, { timVersion })
}
