import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createJiraClient } from '../clients/jira-client.js'
import { TimError, isTimError } from '../errors.js'
import { writeJsonAtomic } from '../review/store.js'
import { fetchComments, fetchPages } from '../commands/refine/prepare.js'
import {
  commentsMarkdown,
  confluenceLinksIn,
  confluenceMarkdown,
  refinementFieldsOf,
  ticketMarkdown
} from '../commands/refine/ticket-markdown.js'
import { utcSeconds } from '../commands/refine/workarea.js'
import { bestPracticesBundle, detectTechPerRepo } from './repo-tech.js'
import { planningDir } from './workarea.js'

const fetchTicket = async (ticket) => {
  try {
    return await createJiraClient().getTicket(ticket, { withRendered: true })
  } catch (error) {
    throw new TimError(
      isTimError(error) && error.code !== 'USAGE' ? error.code : 'UNKNOWN',
      `Error: failed to fetch ticket ${ticket}`,
      error
    )
  }
}

/**
 * The fields a ticket's `ticket.md` shows, with the stand-ins used when
 * Jira gives none; a missing priority shows as `null`.
 *
 * @param {object} ticket - From the Jira client's `getTicket(id, {withRendered: true})`
 * @returns {ReturnType<typeof refinementFieldsOf>}
 */
export const planFieldsOf = (ticket) => ({
  ...refinementFieldsOf(ticket),
  priority: String(ticket.priority ?? null)
})

/**
 * The repo names a `--repos` list holds, trimmed, with empty entries
 * dropped.
 *
 * @param {string} [repoList] - Comma-separated repo names
 * @returns {string[]}
 */
export const reposIn = (repoList = '') =>
  repoList
    .split(',')
    .map((repo) => repo.trim())
    .filter((repo) => repo !== '')

const writeBundles = ({ workspaceRoot, directory, entries }) =>
  entries.forEach(({ repo, tech }) =>
    writeFileSync(
      join(directory, 'best-practices', `${repo}.md`),
      bestPracticesBundle({
        workspaceRoot,
        repo,
        bestPractices: tech.best_practices
      })
    )
  )

const bundleRepos = async ({ workspaceRoot, directory, repoList, log }) => {
  if (!repoList) return []
  await log('')
  await log('Detecting tech per repo...')
  const entries = await detectTechPerRepo({
    workspaceRoot,
    repos: reposIn(repoList),
    log
  })
  writeBundles({ workspaceRoot, directory, entries })
  return entries
}

/**
 * Sets up a ticket's planning folder under
 * `workareas/ticket-planning/<ticket>`: `ticket.md` from the ticket, its
 * comments and the Confluence pages its description links to, then for
 * each repo in `repoList` a best-practices bundle, and `.plan-meta.json`
 * naming each repo's technologies. Comments or a page that cannot be read
 * are left out.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.ticket
 * @param {string} [args.repoList] - Comma-separated repo names; empty bakes no bundles
 * @param {(line: string) => Promise<void>} [args.log] - Receives each progress line
 * @param {() => Date} [args.now]
 * @returns {Promise<{directory: string, repoList: string, meta: object}>}
 * @throws {TimError} when the ticket cannot be read
 */
export const preparePlan = async ({
  workspaceRoot,
  ticket,
  repoList = '',
  log = async () => {},
  now = () => new Date()
}) => {
  const directory = planningDir(workspaceRoot, ticket)
  mkdirSync(join(directory, 'best-practices'), { recursive: true })

  await log('Fetching ticket details...')
  const fields = planFieldsOf(await fetchTicket(ticket))

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

  const repos = await bundleRepos({ workspaceRoot, directory, repoList, log })
  const meta = {
    ticket: fields.key,
    summary: fields.summary,
    type: fields.type,
    status: fields.status,
    priority: fields.priority,
    parent: fields.parent,
    labels: fields.labels.filter((label) => label !== ''),
    created: utcSeconds(now()),
    repos
  }
  writeJsonAtomic(join(directory, '.plan-meta.json'), meta)
  return { directory, repoList, meta }
}
