import { createJiraClient } from '../../clients/jira-client.js'
import { makeClientAction } from '../_client-action.js'
import { register as registerCreate } from './create.js'
import { register as registerAttach } from './attach.js'
import { register as registerLink } from './link.js'
import { register as registerEpics } from './epics.js'
import { register as registerSearch } from './search.js'
import { register as registerTransition } from './transition.js'
import { register as registerAssign } from './assign.js'
import { register as registerComment } from './comment.js'
import { register as registerUpdate } from './update.js'

const alignColumns = (rows) => {
  const gap = 2
  const widths = rows[0].map((_, column) =>
    Math.max(...rows.map((row) => row[column].length))
  )
  return rows.map((row) =>
    row
      .map((cell, column) =>
        column === row.length - 1 ? cell : cell.padEnd(widths[column] + gap)
      )
      .join('')
  )
}

const renderSection = (heading, rows) =>
  rows.length === 0
    ? []
    : ['', `=== ${heading} (${rows.length}) ===`, ...alignColumns(rows)]

const subtaskRow = ({ key, status, summary }) => [key, status ?? '?', summary]

const linkRow = ({ otherKey, relation, otherStatus, otherSummary }) => [
  otherKey ?? '?',
  relation ?? '?',
  otherStatus ?? '?',
  otherSummary
]

const descriptionShown = (ticket, { rendered }) =>
  (rendered ? ticket.renderedDescription : ticket.description)?.trim() ?? ''

export const renderTicket = (ticket, { rendered = false } = {}) =>
  [
    `${ticket.id}  ${ticket.summary}`,
    `Status:    ${ticket.status ?? '?'}`,
    `Type:      ${ticket.type ?? '?'}`,
    `Assignee:  ${ticket.assignee ?? 'unassigned'}`,
    `Priority:  ${ticket.priority ?? '?'}`,
    `Parent:    ${ticket.parent ?? 'none'}`,
    `Labels:    ${ticket.labels?.length ? ticket.labels.join(', ') : 'none'}`,
    `Updated:   ${ticket.updated ?? '?'}`,
    '',
    descriptionShown(ticket, { rendered }),
    ...renderSection('Subtasks', (ticket.subtasks ?? []).map(subtaskRow)),
    ...renderSection('Linked Issues', (ticket.links ?? []).map(linkRow))
  ]
    .join('\n')
    .trimEnd()

export const renderComments = (comments) => {
  if (comments.length === 0) return '(no comments)'
  return comments
    .map((c) =>
      [`--- ${c.author ?? 'unknown'} on ${c.createdAt}`, c.body].join('\n')
    )
    .join('\n\n')
}

export const register = (program, { timVersion }) => {
  const jira = program
    .command('jira')
    .description(
      "Read and search Jira tickets and comments, raise a ticket from a manifest, rewrite a ticket's summary or description, comment on, link and assign tickets, and move a ticket's status (create, update, attach, comment, link and assign are dry run by default; transition is not)"
    )

  jira
    .command('ticket <id>')
    .description(
      'Fetch a Jira ticket by id (e.g. EUDPA-200), with its parent, labels, last update, subtasks and linked issues'
    )
    .option(
      '--rendered',
      'Show the description as Jira renders it to HTML, and add it to --json as renderedDescription'
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim jira ticket EUDPA-200\n  tim jira ticket EUDPA-200 --rendered --json'
    )
    .action(
      makeClientAction({
        client: () => createJiraClient(),
        call: (client, [id], { rendered }) =>
          client.getTicket(id, { withRendered: Boolean(rendered) }),
        renderText: renderTicket,
        timVersion
      })
    )

  jira
    .command('comments <id>')
    .description('Fetch the comments on a Jira ticket')
    .action(
      makeClientAction({
        client: () => createJiraClient(),
        call: (c, [id]) => c.getComments(id),
        renderText: renderComments,
        timVersion
      })
    )

  registerCreate(jira, { timVersion })
  registerAttach(jira, { timVersion })
  registerLink(jira, { timVersion })
  registerEpics(jira, { timVersion })
  registerSearch(jira, { timVersion })
  registerTransition(jira, { timVersion })
  registerAssign(jira, { timVersion })
  registerComment(jira, { timVersion })
  registerUpdate(jira, { timVersion })
}
