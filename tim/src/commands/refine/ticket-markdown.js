import { renderPage } from '../confluence/index.js'

const withoutTrailingNewlines = (text) => text.replace(/\n+$/, '')

const shown = (value) => String(value ?? null)

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The fields a refinement reads from a ticket, with the stand-ins used when
 * Jira gives none.
 *
 * @param {object} ticket - From the Jira client's `getTicket(id, {withRendered: true})`
 * @returns {{key: string, summary: string, type: string, status: string, priority: string, assignee: string, parent: string, labels: string[], description: string}}
 */
export const refinementFieldsOf = (ticket) => ({
  key: shown(ticket.id),
  summary: shown(ticket.summary),
  type: shown(ticket.type),
  status: shown(ticket.status),
  priority: ticket.priority ?? 'None',
  assignee: ticket.assignee ?? 'Unassigned',
  parent: ticket.parent ?? 'None',
  labels: ticket.labels ?? [],
  description: withoutTrailingNewlines(
    ticket.renderedDescription ?? 'No description'
  )
})

/**
 * Every Confluence space link in a description, once each, in code point
 * order.
 *
 * @param {string} description
 * @param {string} atlassianBase - The value of JIRA_BASE_URL
 * @returns {string[]}
 */
export const confluenceLinksIn = (description, atlassianBase) => {
  const linkPattern = new RegExp(
    `${escapeRegExp(atlassianBase)}/wiki/spaces/[^"<>\\s]+`,
    'g'
  )
  return [...new Set(description.match(linkPattern) ?? [])].sort()
}

const commentDate = (createdAt) => shown(createdAt).split('T')[0]

const commentSection = ({ author, createdAt, body }) =>
  `### ${shown(author)} (${commentDate(createdAt)})\n${shown(body)}\n`

/**
 * @param {Array<{author: string|null, createdAt: string, body: string}>} comments
 * @returns {string}
 */
export const commentsMarkdown = (comments) =>
  withoutTrailingNewlines(comments.map(commentSection).join('\n'))

const confluenceSection = (page) =>
  `### ${shown(page.title)}\n\n${withoutTrailingNewlines(renderPage(page))}\n\n`

/**
 * @param {object[]} pages - From the Confluence client's `getPage`
 * @returns {string}
 */
export const confluenceMarkdown = (pages) =>
  pages.map(confluenceSection).join('')

/**
 * The `ticket.md` a refinement assesses.
 *
 * @param {object} args
 * @param {ReturnType<typeof refinementFieldsOf>} args.fields
 * @param {number} args.commentCount
 * @param {string} args.comments - From {@link commentsMarkdown}
 * @param {string} args.confluence - From {@link confluenceMarkdown}
 * @returns {string}
 */
export const ticketMarkdown = ({
  fields,
  commentCount,
  comments,
  confluence
}) =>
  [
    `# ${fields.key}: ${fields.summary}`,
    '',
    '## Metadata',
    `- **Type:** ${fields.type}`,
    `- **Status:** ${fields.status}`,
    `- **Priority:** ${fields.priority}`,
    `- **Labels:** ${fields.labels.join(', ')}`,
    `- **Parent:** ${fields.parent}`,
    `- **Assignee:** ${fields.assignee}`,
    '',
    '## Description',
    '',
    fields.description,
    '',
    '## Acceptance Criteria',
    '',
    '<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->',
    '',
    `## Comments (${commentCount})`,
    '',
    comments,
    '',
    '## Confluence References',
    '',
    `${confluence}\n`
  ].join('\n')

/**
 * The review stub: the template with each placeholder replaced by the
 * ticket's value, taken literally.
 *
 * @param {string} template
 * @param {object} values
 * @param {string} values.key
 * @param {string} values.summary
 * @param {string} values.today - `YYYY-MM-DD`
 * @param {string} values.type
 * @param {string} values.priority
 * @returns {string}
 */
export const reviewStub = (
  template,
  { key, summary, today, type, priority }
) => {
  const valueOf = {
    'EUDPA-XXXXX': key,
    '[Ticket summary]': summary,
    '[Date]': today,
    '[Story/Bug/Task]': type,
    '[Priority]': priority
  }
  const placeholder = new RegExp(
    Object.keys(valueOf).map(escapeRegExp).join('|'),
    'g'
  )
  const stub = template.replace(placeholder, (found) => valueOf[found])
  return stub === '' || stub.endsWith('\n') ? stub : `${stub}\n`
}
