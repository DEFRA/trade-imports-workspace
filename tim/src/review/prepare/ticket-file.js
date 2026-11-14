import { createJiraClient } from '../../clients/jira-client.js'
import { fetchComments, fetchPages } from '../../commands/refine/prepare.js'
import {
  commentsMarkdown,
  confluenceLinksIn,
  confluenceMarkdown,
  ticketMarkdown
} from '../../commands/refine/ticket-markdown.js'
import { TimError, isTimError } from '../../errors.js'
import { planFieldsOf } from '../../ticket/prepare-plan.js'

const fetchTicket = async (ticket) => {
  try {
    return await createJiraClient().getTicket(ticket, { withRendered: true })
  } catch (error) {
    throw new TimError(
      isTimError(error) ? error.code : 'UNKNOWN',
      `Error: Failed to fetch ticket ${ticket}`,
      error
    )
  }
}

/**
 * The `ticket.md` a ticket's review reads: the ticket from Jira, its
 * comments and the Confluence pages its description links to. Comments or
 * a page that cannot be read are left out.
 *
 * @param {object} args
 * @param {string} args.ticket
 * @param {(line: string) => void} args.log - Receives each progress line
 * @returns {Promise<{type: string, summary: string, markdown: string}>}
 * @throws {TimError} When Jira cannot give the ticket
 */
export const ticketFileFromJira = async ({ ticket, log }) => {
  log('Fetching ticket details...')
  const fields = planFieldsOf(await fetchTicket(ticket))

  log('Fetching comments...')
  const comments = await fetchComments(ticket, [])

  log('Checking for Confluence links...')
  const links = confluenceLinksIn(
    fields.description,
    process.env.JIRA_BASE_URL ?? ''
  )
  const pages = await fetchPages(links, {
    log: async (line) => log(line),
    skipped: []
  })

  return {
    type: fields.type,
    summary: fields.summary,
    markdown: ticketMarkdown({
      fields,
      commentCount: comments.length,
      comments: commentsMarkdown(comments),
      confluence: confluenceMarkdown(pages)
    })
  }
}

/**
 * The `ticket.md` a branch review reads in place of a ticket.
 *
 * @param {object} args
 * @param {string} args.reviewId
 * @param {string} args.branch
 * @param {string} args.description
 * @returns {string}
 */
export const branchTicketFile = ({ reviewId, branch, description }) =>
  [
    `# ${reviewId}`,
    '',
    '## Description',
    '',
    description,
    '',
    '## Branch',
    '',
    `\`${branch}\``,
    '',
    '## Acceptance Criteria',
    '',
    '<!-- No ticket - define acceptance criteria manually -->',
    '',
    ''
  ].join('\n')
