import { renderPage } from '../confluence/index.js'
import { escapeForRegExp } from '../../utils/escape-for-reg-exp.js'

const withoutTrailingNewlines = (text) => text.replace(/\n+$/, '')

const shown = (value) => String(value ?? null)

/**
 * The fields read from a ticket, with the stand-ins used when Jira gives none.
 *
 * @param {object} ticket - The ticket's `id`, `summary`, `type`, `status`, `priority`, `assignee`, `parent`, `labels` and `renderedDescription`
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
    `${escapeForRegExp(atlassianBase)}/wiki/spaces/[^"<>\\s]+`,
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
 * @param {object[]} pages - Each page's `title` and body, as the Confluence reader renders it
 * @returns {string}
 */
export const confluenceMarkdown = (pages) =>
  pages.map(confluenceSection).join('')

const parentSection = (parent) =>
  parent
    ? [
        '## Parent',
        '',
        `### ${parent.key}: ${parent.summary} (${parent.status})`,
        '',
        withoutTrailingNewlines(parent.description),
        ''
      ]
    : []

const linkLine = ({ relation, otherKey, otherStatus, otherSummary }) =>
  `- ${shown(relation)} ${shown(otherKey)} (${shown(otherStatus)}): ${otherSummary}`

const linksSection = (links) =>
  links?.length ? ['## Linked tickets', '', ...links.map(linkLine), ''] : []

const subtaskLine = ({ key, status, summary }) =>
  `- ${key} (${shown(status)}): ${summary}`

const subtasksSection = (subtasks) =>
  subtasks?.length ? ['## Subtasks', '', ...subtasks.map(subtaskLine), ''] : []

const attachmentLine = ({ filename, mimeType, savedAs, notSavedBecause }) =>
  savedAs
    ? `- ${filename} (${shown(mimeType)}): saved as ${savedAs}`
    : `- ${filename} (${shown(mimeType)}): not saved, ${notSavedBecause}`

const attachmentsSection = (attachments) =>
  attachments?.length
    ? ['## Attachments', '', ...attachments.map(attachmentLine), '']
    : []

/**
 * The ticket as Markdown: its metadata, description, comments and Confluence
 * pages. Each of `parent`, `links`, `subtasks` and `attachments` adds its own
 * section when given and not empty, and nothing otherwise.
 *
 * @param {object} args
 * @param {ReturnType<typeof refinementFieldsOf>} args.fields
 * @param {number} args.commentCount
 * @param {string} args.comments - From {@link commentsMarkdown}
 * @param {string} args.confluence - From {@link confluenceMarkdown}
 * @param {{key: string, summary: string, status: string, description: string}} [args.parent] - The parent's rendered description
 * @param {Array<{relation: string|null, otherKey: string|null, otherStatus: string|null, otherSummary: string}>} [args.links]
 * @param {Array<{key: string, status: string|null, summary: string}>} [args.subtasks]
 * @param {Array<{filename: string, mimeType: string|null, savedAs?: string, notSavedBecause?: string}>} [args.attachments] - `savedAs` is the file's path when it was saved, else `notSavedBecause` says why not
 * @returns {string}
 */
export const ticketMarkdown = ({
  fields,
  commentCount,
  comments,
  confluence,
  parent,
  links,
  subtasks,
  attachments
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
    ...parentSection(parent),
    ...linksSection(links),
    ...subtasksSection(subtasks),
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
    `${confluence}\n`,
    ...attachmentsSection(attachments)
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
    Object.keys(valueOf).map(escapeForRegExp).join('|'),
    'g'
  )
  const stub = template.replace(placeholder, (found) => valueOf[found])
  return stub === '' || stub.endsWith('\n') ? stub : `${stub}\n`
}
