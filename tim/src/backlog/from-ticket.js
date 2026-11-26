import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { createJiraClient } from '../clients/jira-client.js'
import {
  fetchCommentsAndPages,
  fetchTicket
} from '../commands/refine/prepare.js'
import {
  commentsMarkdown,
  confluenceMarkdown,
  refinementFieldsOf,
  ticketMarkdown
} from '../commands/refine/ticket-markdown.js'
import { utcSeconds } from '../commands/refine/workarea.js'
import { TESTS_FOLDER } from '../build/stack-domains.js'
import { distilLayout } from '../distil/files.js'
import { TimError } from '../errors.js'
import { readJsonFile, writeJsonAtomic } from './io.js'
import { normaliseWorkarea, workareaDirFor } from './workarea.js'

const isFinished = (status) => status === 'Done' || status === 'Closed'

const isSavedKind = (mimeType) =>
  mimeType?.startsWith('image/') || mimeType === 'application/pdf'

const noProgress = async () => {}

const slugWordOf = (word) => word.toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * The branch prefix a ticket's type gets: `fix` for a Bug, `feat` for a
 * Story, `chore` for every other type.
 *
 * @param {string|null} type
 * @returns {'fix'|'feat'|'chore'}
 */
export const branchPrefixOf = (type) => {
  if (type === 'Bug') return 'fix'
  return type === 'Story' ? 'feat' : 'chore'
}

/**
 * The first five words of a summary, lower case, joined by hyphens, with
 * everything but letters and digits dropped from each word.
 *
 * @param {string} summary
 * @returns {string}
 */
export const slugOfSummary = (summary) => {
  const wordsInSlug = 5
  return summary
    .split(/\s+/)
    .map(slugWordOf)
    .filter(Boolean)
    .slice(0, wordsInSlug)
    .join('-')
}

const slugOfFolder = (folder, key) => {
  const prefix = `${key.toLowerCase()}-`
  return folder.startsWith(prefix) ? folder.slice(prefix.length) : ''
}

const sharedFoldersFor = (workspaceRoot, key) => {
  const sharedDir = join(workspaceRoot, 'workareas', 'shared')
  if (!existsSync(sharedDir)) return []
  const lowerKey = key.toLowerCase()
  return readdirSync(sharedDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name === lowerKey || name.startsWith(`${lowerKey}-`))
}

/**
 * The workarea that already belongs to a ticket, found from its key alone.
 * With `workarea` given, that is the one. Otherwise it is the one folder
 * under `workareas/shared/` named for the key in lower case, or starting
 * with it and a hyphen.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.key - The ticket key, in upper case
 * @param {string} [args.workarea]
 * @returns {{workarea: string, slug: string}|null} `slug` is what follows the key in the folder name, empty when the folder is named by the key alone; null when no workarea holds the ticket
 * @throws {TimError} REFUSED when more than one folder matches
 */
export const existingWorkareaFor = ({ workspaceRoot, key, workarea }) => {
  if (workarea !== undefined) {
    const named = normaliseWorkarea(workarea)
    return { workarea: named, slug: slugOfFolder(basename(named), key) }
  }
  const folders = sharedFoldersFor(workspaceRoot, key)
  if (folders.length > 1) {
    throw new TimError(
      'REFUSED',
      `More than one workarea holds ${key}: ${folders.map((folder) => `shared/${folder}`).join(', ')}. Name the one you mean with --workarea.`
    )
  }
  if (folders.length === 0) return null
  return {
    workarea: `shared/${folders[0]}`,
    slug: slugOfFolder(folders[0], key)
  }
}

const doneRowIdsIn = (workspaceRoot, workarea) => {
  const backlogPath = distilLayout(
    workareaDirFor(workspaceRoot, workarea)
  ).backlog
  if (!existsSync(backlogPath)) return []
  return (readJsonFile(backlogPath).increments ?? [])
    .filter((row) => row.status === 'done')
    .map((row) => row.id)
}

const refuseWorkareaWithBuiltRows = ({ workspaceRoot, key, workarea }) => {
  const built = doneRowIdsIn(workspaceRoot, workarea)
  if (built.length > 0) {
    throw new TimError(
      'REFUSED',
      `${workarea} already has built rows for ${key} (${built.join(', ')}), so fetching the ticket again would put it out of step with them.`
    )
  }
}

const openBlockerBlockers = (links) =>
  links
    .filter(
      (link) =>
        link.direction === 'inward' &&
        link.relation === 'is blocked by' &&
        !isFinished(link.otherStatus)
    )
    .map(
      (link) =>
        `${link.otherKey} blocks this ticket and is ${link.otherStatus ?? 'in an unknown status'}.`
    )

const noCriteriaHeadingBlockers = (description) => {
  const acceptanceCriteriaHeading = /^(h[1-6]\.\s*|\*\s*)acceptance criteria/i
  return description
    .split('\n')
    .some((line) => acceptanceCriteriaHeading.test(line.trim()))
    ? []
    : ['The description has no acceptance criteria heading.']
}

const finishedStatusBlockers = (status) =>
  isFinished(status) ? [`The ticket is already ${status}.`] : []

/**
 * Why a ticket may not be ready to build, in plain words: a status of Done
 * or Closed, a description with no acceptance criteria heading, and each open
 * "is blocked by" link.
 *
 * @param {{status: string|null, description: string, links: object[]}} ticket
 * @returns {string[]}
 */
export const blockersOf = ({ status, description, links }) => [
  ...finishedStatusBlockers(status),
  ...noCriteriaHeadingBlockers(description),
  ...openBlockerBlockers(links)
]

const ticketFilePathOf = (workarea, key) =>
  `workareas/${workarea}/sources/ticket-${key.toLowerCase()}.md`

const recordPathOf = (workspaceRoot, workarea, key) =>
  join(
    workareaDirFor(workspaceRoot, workarea),
    'sources',
    `ticket-${key.toLowerCase()}.json`
  )

const sourcesFileFor = ({ key, programme, summary, ticketFile }) => {
  const testsPath = `repos/${TESTS_FOLDER}`
  return {
    programme,
    goal: `Build what ${key} asks for: ${summary}`,
    repos: { tests: testsPath },
    reposWhy:
      "The tests repo holds every domain's end-to-end specs, which show what is already proven.",
    precedence: ['repo:tests', `ticket:${key}`],
    sources: [
      {
        id: 'repo:tests',
        kind: 'repo',
        locator: testsPath,
        scope: "every domain's e2e specs and journey flows",
        role: 'what is already proven end to end'
      },
      {
        id: `ticket:${key}`,
        kind: 'ticket',
        locator: ticketFile,
        scope:
          'the whole ticket: description, acceptance criteria, comments, linked Confluence pages and saved attachments',
        role: 'what the ticket asks for, and what its comments have changed'
      }
    ]
  }
}

const readParent = async (ticket, skipped) => {
  if (!ticket.parent) return undefined
  try {
    return refinementFieldsOf(await fetchTicket(ticket.parent))
  } catch (error) {
    skipped.push({ source: `parent ${ticket.parent}`, reason: error.message })
    return undefined
  }
}

const saveAttachment = async ({
  attachment,
  attachmentsDir,
  workarea,
  skipped
}) => {
  const listed = {
    filename: attachment.filename,
    mimeType: attachment.mimeType
  }
  if (!isSavedKind(attachment.mimeType)) {
    return {
      ...listed,
      notSavedBecause: 'only images and PDFs are saved'
    }
  }
  const fileName = `${attachment.id}-${basename(attachment.filename)}`
  try {
    const bytes = await createJiraClient().downloadAttachment(attachment.id)
    writeFileSync(join(attachmentsDir, fileName), bytes)
    return {
      ...listed,
      savedAs: `workareas/${workarea}/sources/attachments/${fileName}`
    }
  } catch (error) {
    skipped.push({
      source: `attachment ${attachment.id} (${attachment.filename})`,
      reason: error.message
    })
    return {
      ...listed,
      notSavedBecause: `the download failed: ${error.message}`
    }
  }
}

const listAttachments = async (key, skipped) => {
  try {
    return await createJiraClient().listAttachments(key)
  } catch (error) {
    skipped.push({ source: `attachments on ${key}`, reason: error.message })
    return []
  }
}

const saveAttachments = async ({ key, attachmentsDir, workarea, skipped }) => {
  const attachments = await listAttachments(key, skipped)
  const saved = []
  for (const attachment of attachments) {
    saved.push(
      await saveAttachment({ attachment, attachmentsDir, workarea, skipped })
    )
  }
  return saved
}

const findOrRefuseWorkarea = ({ workspaceRoot, key, workarea }) => {
  const existing = existingWorkareaFor({ workspaceRoot, key, workarea })
  if (existing) {
    refuseWorkareaWithBuiltRows({
      workspaceRoot,
      key,
      workarea: existing.workarea
    })
  }
  return existing
}

const fetchTicketAndContext = async (key) => {
  const ticket = await fetchTicket(key)
  const fields = refinementFieldsOf(ticket)
  const skipped = []
  const { comments, pages } = await fetchCommentsAndPages({
    ticket: key,
    description: fields.description,
    log: noProgress,
    skipped
  })
  const parent = await readParent(ticket, skipped)
  return { ticket, fields, comments, pages, parent, skipped }
}

const workareaAndBranchFor = ({ existing, key, ticket }) => {
  const summarySlug = slugOfSummary(ticket.summary)
  const slug = existing?.slug ? existing.slug : summarySlug
  return {
    workarea:
      existing?.workarea ?? `shared/${key.toLowerCase()}-${summarySlug}`,
    branch: `${branchPrefixOf(ticket.type)}/${key}-${slug}`
  }
}

const prepareSourcesDir = ({ workspaceRoot, workarea }) => {
  const attachmentsDir = join(
    workareaDirFor(workspaceRoot, workarea),
    'sources',
    'attachments'
  )
  mkdirSync(attachmentsDir, { recursive: true })
  return attachmentsDir
}

const writeTicketFile = ({
  workspaceRoot,
  workarea,
  key,
  fetched: { fields, comments, pages, parent, ticket },
  attachments
}) => {
  const ticketFile = ticketFilePathOf(workarea, key)
  writeFileSync(
    join(workspaceRoot, ticketFile),
    ticketMarkdown({
      fields,
      commentCount: comments.length,
      comments: commentsMarkdown(comments),
      confluence: confluenceMarkdown(pages),
      parent,
      links: ticket.links,
      subtasks: ticket.subtasks,
      attachments
    })
  )
  return ticketFile
}

const writeRecord = ({ workspaceRoot, workarea, key, ticket, branch, now }) => {
  const recordFile = recordPathOf(workspaceRoot, workarea, key)
  writeJsonAtomic(recordFile, {
    ticket: key,
    updated: ticket.updated,
    branch,
    fetchedAt: utcSeconds(now())
  })
  return recordFile
}

const writeSourcesFileIfAbsent = ({
  workspaceRoot,
  workarea,
  key,
  summary,
  ticketFile
}) => {
  const path = distilLayout(workareaDirFor(workspaceRoot, workarea)).sources
  const written = !existsSync(path)
  if (written) {
    writeJsonAtomic(
      path,
      sourcesFileFor({
        key,
        programme: basename(workarea),
        summary,
        ticketFile
      })
    )
  }
  return { path, written }
}

/**
 * Fetches a ticket into a workarea: the ticket file, a record of its branch
 * and of when Jira last updated it, its image and PDF attachments, and a sources file naming
 * the ticket as a source. A sources file already there is kept. Comments,
 * Confluence pages, a parent or an attachment that cannot be read are left
 * out, and listed in `skipped` with the reason.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.key - The ticket key, in upper case
 * @param {string} [args.workarea] - Names the workarea when the key alone finds none or more than one
 * @param {() => Date} [args.now]
 * @returns {Promise<{ticket: string, workarea: string, branch: string, ticketFile: string, recordFile: string, sourcesFile: {path: string, written: boolean}, attachments: Array<{filename: string, mimeType: string|null, savedAs?: string, notSavedBecause?: string}>, blockers: string[], skipped: Array<{source: string, reason: string}>}>}
 * @throws {TimError} REFUSED when the workarea already has a built row, or more than one workarea holds the ticket; the Jira client's errors when the ticket cannot be read
 */
export const fetchTicketIntoWorkarea = async ({
  workspaceRoot,
  key,
  workarea: namedWorkarea,
  now = () => new Date()
}) => {
  const existing = findOrRefuseWorkarea({
    workspaceRoot,
    key,
    workarea: namedWorkarea
  })
  const fetched = await fetchTicketAndContext(key)
  const { ticket, skipped } = fetched
  const { workarea, branch } = workareaAndBranchFor({ existing, key, ticket })
  const attachmentsDir = prepareSourcesDir({ workspaceRoot, workarea })
  const attachments = await saveAttachments({
    key,
    attachmentsDir,
    workarea,
    skipped
  })
  const ticketFile = writeTicketFile({
    workspaceRoot,
    workarea,
    key,
    fetched,
    attachments
  })
  const recordFile = writeRecord({
    workspaceRoot,
    workarea,
    key,
    ticket,
    branch,
    now
  })
  const sourcesFile = writeSourcesFileIfAbsent({
    workspaceRoot,
    workarea,
    key,
    summary: ticket.summary,
    ticketFile
  })
  return {
    ticket: key,
    workarea,
    branch,
    ticketFile,
    recordFile,
    sourcesFile,
    attachments,
    blockers: blockersOf(ticket),
    skipped
  }
}

/**
 * Whether Jira has updated a ticket since its workarea's record was written.
 * Changes no file.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.key - The ticket key, in upper case
 * @param {string} [args.workarea]
 * @returns {Promise<{ticket: string, workarea: string, changed: boolean, recordedUpdated: string|null, currentUpdated: string|null}>}
 * @throws {TimError} NOT_FOUND when no workarea, or no record in it, holds the ticket; REFUSED when more than one workarea holds it
 */
export const checkTicketForChanges = async ({
  workspaceRoot,
  key,
  workarea: namedWorkarea
}) => {
  const existing = existingWorkareaFor({
    workspaceRoot,
    key,
    workarea: namedWorkarea
  })
  if (!existing) {
    throw new TimError(
      'NOT_FOUND',
      `No workarea holds ${key}. Run tim backlog from-ticket ${key} first.`
    )
  }
  const recordFile = recordPathOf(workspaceRoot, existing.workarea, key)
  if (!existsSync(recordFile)) {
    throw new TimError(
      'NOT_FOUND',
      `${existing.workarea} has no record of ${key}. Run tim backlog from-ticket ${key} --workarea ${existing.workarea} first.`
    )
  }
  const recordedUpdated = readJsonFile(recordFile).updated
  const currentUpdated = (await fetchTicket(key)).updated
  return {
    ticket: key,
    workarea: existing.workarea,
    changed: currentUpdated !== recordedUpdated,
    recordedUpdated,
    currentUpdated
  }
}
