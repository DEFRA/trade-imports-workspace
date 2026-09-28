import { createJiraClient } from '../../clients/jira-client.js'
import { makeClientAction } from '../_client-action.js'
import { register as registerCreate } from './create.js'
import { register as registerAttach } from './attach.js'
import { register as registerLink } from './link.js'
import { register as registerEpics } from './epics.js'

export const renderTicket = (t) =>
  [
    `${t.id}  ${t.summary}`,
    `Status:    ${t.status ?? '?'}`,
    `Type:      ${t.type ?? '?'}`,
    `Assignee:  ${t.assignee ?? 'unassigned'}`,
    `Priority:  ${t.priority ?? '?'}`,
    '',
    t.description?.trim() ?? ''
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
      'Read Jira tickets and comments, and raise a ticket from a manifest (create, attach, link and epics are dry run by default)'
    )

  jira
    .command('ticket <id>')
    .description('Fetch a Jira ticket by id (e.g. EUDPA-200)')
    .action(
      makeClientAction({
        client: () => createJiraClient(),
        call: (c, [id]) => c.getTicket(id),
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
}
