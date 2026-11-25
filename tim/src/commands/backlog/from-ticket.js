import { z } from 'zod'
import {
  checkTicketForChanges,
  fetchTicketIntoWorkarea
} from '../../backlog/from-ticket.js'
import { makeBacklogAction, parseOptions } from './shared.js'

const fromTicketArgsSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z][A-Za-z0-9]*-\d+$/,
      'Give a Jira ticket key, such as EUDPA-123.'
    )
    .transform((key) => key.toUpperCase()),
  check: z.boolean().optional().default(false),
  workarea: z
    .string()
    .trim()
    .min(1, '--workarea needs a workarea, such as shared/eudpa-123-my-ticket.')
    .optional()
})

const attachmentLine = ({ filename, savedAs, notSavedBecause }) =>
  savedAs
    ? `  ${filename}: saved as ${savedAs}`
    : `  ${filename}: not saved, ${notSavedBecause}`

const renderFetch = (result) =>
  [
    `Fetched ${result.ticket} into ${result.workarea}.`,
    `Branch: ${result.branch}`,
    `Ticket file: ${result.ticketFile}`,
    result.sourcesFile.written
      ? `Wrote ${result.sourcesFile.path}.`
      : `Kept the ${result.sourcesFile.path} already there.`,
    ...(result.attachments.length
      ? ['Attachments:', ...result.attachments.map(attachmentLine)]
      : []),
    ...(result.blockers.length
      ? ['Blockers:', ...result.blockers.map((blocker) => `  ${blocker}`)]
      : ['No blockers.']),
    ...result.skipped.map(
      ({ source, reason }) => `Could not read ${source}: ${reason}`
    )
  ].join('\n')

const renderCheck = (result) =>
  result.changed
    ? `${result.ticket} has changed in Jira since ${result.workarea} was written: it was updated ${result.recordedUpdated}, and now ${result.currentUpdated}.`
    : `${result.ticket} has not changed in Jira since ${result.workarea} was written.`

export const register = (backlog, { timVersion }) => {
  backlog
    .command('from-ticket <key>')
    .description(
      "Fetch a Jira ticket into a workarea and name it as a distil source. Writes the ticket file (description, comments, linked Confluence pages, parent, links, subtasks and attachments), saves its image and PDF attachments beside it, and writes a sources file with one ticket source. Names the workarea shared/<key in lower case>-<slug> and the branch from the ticket's type, and lists any blockers it sees. Finds the ticket's workarea from its key. With --check, only says whether the ticket has changed in Jira since the workarea was written"
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim backlog from-ticket EUDPA-123 --json\n' +
        '  tim backlog from-ticket EUDPA-123 --check --json\n' +
        '  tim backlog from-ticket EUDPA-123 --workarea shared/eudpa-123-my-ticket --json\n' +
        'Exits 1, writing nothing, when the ticket workarea already has a built row, or when more than one workarea holds the ticket.\n' +
        'Exits 2 when the key is not a Jira key, or with --check when no workarea holds the ticket.'
    )
    .option(
      '--check',
      'Say whether the ticket changed in Jira since the workarea was written. Changes no file'
    )
    .option(
      '--workarea <workarea>',
      "The ticket's workarea, such as shared/eudpa-123-my-ticket. Needed only when the key alone finds more than one"
    )
    .action(
      makeBacklogAction({
        run: async ({ workspaceRoot, args }, opts) => {
          const { key, check, workarea } = parseOptions(fromTicketArgsSchema, {
            key: args[0],
            check: opts.check,
            workarea: opts.workarea
          })
          return check
            ? {
                mode: 'check',
                ...(await checkTicketForChanges({
                  workspaceRoot,
                  key,
                  workarea
                }))
              }
            : {
                mode: 'fetch',
                ...(await fetchTicketIntoWorkarea({
                  workspaceRoot,
                  key,
                  workarea
                }))
              }
        },
        renderText: (result) =>
          result.mode === 'check' ? renderCheck(result) : renderFetch(result),
        timVersion
      })
    )
}
