import { join } from 'node:path'
import { readJsonFile } from '../backlog/io.js'
import { createJiraClient } from '../clients/jira-client.js'
import { runComment } from '../commands/jira/comment.js'
import { TimError } from '../errors.js'
import { backlogTicketOf } from './backlog-ticket.js'

const HEADING = 'h4. What shipped'

const countOf = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`

const linkLabelOf = (heading) =>
  heading
    .replace(/[[\]|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const scenarioLineOf =
  (files) =>
  ({ heading, file }) =>
    `* [${linkLabelOf(heading)}|${files.find(({ path }) => path === file).url}]`

const domainSectionOf = ({ title, scenarios, files }) => [
  `h5. ${title} (${countOf(scenarios.length, 'scenario')})`,
  ...scenarios.map(scenarioLineOf(files))
]

/**
 * The what-shipped comment for a derived theme, in Jira wiki markup: a fixed
 * heading line, then each domain with its scenarios, each linked to the spec
 * file URL the derived theme holds for it.
 *
 * @param {{domains: Object<string, {title: string, scenarios: Array<{heading: string, file: string}>, files: Array<{path: string, url: string}>}>}} derived
 * @returns {string}
 */
export const renderWhatShippedComment = ({ domains }) => {
  const sections = Object.keys(domains)
    .sort()
    .map((domain) => domains[domain])
  const scenarioTotal = sections.reduce(
    (total, { scenarios }) => total + scenarios.length,
    0
  )
  return [
    HEADING,
    `${countOf(scenarioTotal, 'scenario')} in ${countOf(sections.length, 'domain')}, each linked to its specification.`,
    ...sections.flatMap(domainSectionOf)
  ].join('\n')
}

const isWhatShipped = ({ body }) =>
  body?.trim().split('\n')[0].trim() === HEADING

const earlierCommentIn = (key, comments) => {
  const earlier = comments.filter(isWhatShipped)
  if (earlier.length > 1) {
    throw new TimError(
      'UNKNOWN',
      `tim theme-ticket comment: ${key} has ${earlier.length} what-shipped comments (${earlier.map(({ id }) => id).join(', ')}). Delete all but one in Jira, then run this again.`
    )
  }
  return earlier[0]
}

/**
 * Posts the what-shipped comment on the ticket the workarea's backlog names,
 * or edits the one already there, found by its heading line. It never
 * changes the ticket's description or summary. Without `confirm` it sends
 * nothing.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.workarea - A path under `workareas/`
 * @param {string} args.derivedFile
 * @param {boolean} [args.confirm=false]
 * @returns {Promise<{mode: 'dry-run'|'commented'|'edited'|'unchanged', key: string, body: string, replaceCommentId?: string, comment?: object}>}
 * @throws {TimError} USAGE without a workarea or derived file, or when the backlog names no ticket; UNKNOWN when the ticket has more than one what-shipped comment; NOT_FOUND or PARSE reading the derived file
 */
export const postWhatShippedComment = async ({
  workspaceRoot,
  workarea,
  derivedFile,
  confirm = false
}) => {
  if (!workarea || !derivedFile) {
    throw new TimError(
      'USAGE',
      'Usage: tim theme-ticket comment --workarea <path under workareas/> --derived <file>'
    )
  }
  const workareaDir = join(workspaceRoot, 'workareas', workarea)
  const key = backlogTicketOf(workareaDir)
  if (!key) {
    throw new TimError(
      'USAGE',
      `tim theme-ticket comment: the backlog in ${workareaDir} names no ticket. Only a ticket backlog gets a what-shipped comment.`
    )
  }
  const body = renderWhatShippedComment(readJsonFile(derivedFile))
  const earlier = earlierCommentIn(
    key,
    await createJiraClient().getComments(key)
  )
  return runComment({ key, body, confirm, replaceCommentId: earlier?.id })
}
