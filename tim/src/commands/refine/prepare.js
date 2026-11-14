import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { createConfluenceClient } from '../../clients/confluence-client.js'
import { createJiraClient } from '../../clients/jira-client.js'
import { TimError, isTimError } from '../../errors.js'
import { writeJsonAtomic } from '../../review/store.js'
import {
  commentsMarkdown,
  confluenceLinksIn,
  confluenceMarkdown,
  refinementFieldsOf,
  reviewStub,
  ticketMarkdown
} from './ticket-markdown.js'
import {
  metaPath,
  refinementDir,
  reviewTemplatePath,
  utcSeconds
} from './workarea.js'

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

export const fetchComments = async (ticket, skipped) => {
  try {
    return await createJiraClient().getComments(ticket)
  } catch (error) {
    skipped.push({ source: `comments on ${ticket}`, reason: error.message })
    return []
  }
}

export const fetchPages = async (links, { log, skipped }) => {
  const pages = []
  for (const link of links) {
    await log(`  Fetching: ${link}`)
    try {
      pages.push(await createConfluenceClient().getPage(link))
    } catch (error) {
      skipped.push({ source: link, reason: error.message })
    }
  }
  return pages
}

const metaFor = (fields, created) => ({
  ticket: fields.key,
  summary: fields.summary,
  type: fields.type,
  priority: fields.priority,
  parent: fields.parent,
  labels: fields.labels,
  status: fields.status,
  created,
  verdict: null,
  verdict_reason: null,
  completed_at: null
})

const holdsReview = (path) =>
  (statSync(path, { throwIfNoEntry: false })?.size ?? 0) > 0

const readTemplate = (workspaceRoot) => {
  const templatePath = reviewTemplatePath(workspaceRoot)
  if (!existsSync(templatePath)) {
    throw new TimError(
      'MISSING_DEP',
      `Error: Refinement template not found at ${templatePath}`
    )
  }
  return readFileSync(templatePath, 'utf8')
}

/**
 * Sets up a ticket's refinement folder: `ticket.md` from the ticket, its
 * comments and the Confluence pages its description links to, a
 * `.refinement-meta.json` with no verdict (a run again resets the verdict),
 * and a `review.md` stub, which is kept when one with content is there.
 * Comments or a page that cannot be read are left out, and listed in
 * `skipped` with the reason.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.ticket
 * @param {(line: string) => Promise<void>} [args.log] - Receives each progress line
 * @param {() => Date} [args.now]
 * @returns {Promise<{directory: string, meta: object, reviewKept: boolean, skipped: Array<{source: string, reason: string}>}>}
 * @throws {TimError} when the ticket cannot be read or the review template is missing
 */
export const prepareRefinement = async ({
  workspaceRoot,
  ticket,
  log = async () => {},
  now = () => new Date()
}) => {
  const directory = refinementDir(workspaceRoot, ticket)
  await log('Creating refinement workspace...')
  mkdirSync(directory, { recursive: true })

  await log('Fetching ticket details...')
  const fields = refinementFieldsOf(await fetchTicket(ticket))

  await log('Fetching comments...')
  const skipped = []
  const comments = await fetchComments(ticket, skipped)

  await log('Checking for Confluence links...')
  const links = confluenceLinksIn(
    fields.description,
    process.env.JIRA_BASE_URL ?? ''
  )
  const pages = await fetchPages(links, { log, skipped })

  await log('Writing ticket.md...')
  writeFileSync(
    join(directory, 'ticket.md'),
    ticketMarkdown({
      fields,
      commentCount: comments.length,
      comments: commentsMarkdown(comments),
      confluence: confluenceMarkdown(pages)
    })
  )

  await log('Writing .refinement-meta.json...')
  const startedAt = now()
  const meta = metaFor(fields, utcSeconds(startedAt))
  writeJsonAtomic(metaPath(directory), meta)

  await log('Stubbing review.md...')
  const template = readTemplate(workspaceRoot)
  const reviewPath = join(directory, 'review.md')
  const reviewKept = holdsReview(reviewPath)
  if (reviewKept) {
    await log(
      '  review.md already present — leaving in place (run from scratch by deleting it first)'
    )
  } else {
    writeFileSync(
      reviewPath,
      reviewStub(template, {
        ...fields,
        today: utcSeconds(startedAt).slice(0, 10)
      })
    )
  }
  return { directory, meta, reviewKept, skipped }
}
