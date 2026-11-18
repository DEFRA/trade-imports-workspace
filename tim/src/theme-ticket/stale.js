import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createJiraClient } from '../clients/jira-client.js'
import { TimError } from '../errors.js'
import { run } from '../exec/exec.js'
import { currentBranch } from './git.js'

const CITED_SPEC = /openspec\/specs\/[A-Za-z0-9/_-]+spec\.md/g
const SHOWN_TIMESTAMP_LENGTH = 19

const byCodePoint = (left, right) => {
  if (left < right) return -1
  return left > right ? 1 : 0
}

const isFolder = (path) =>
  statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false

const ticketFoldersIn = (ticketsDir) =>
  readdirSync(ticketsDir)
    .filter((name) => !name.startsWith('.'))
    .filter((name) => isFolder(join(ticketsDir, name)))
    .sort(byCodePoint)

const recordedKeyIn = (folder) => {
  const created = join(folder, 'ticket.created.json')
  if (!existsSync(created)) return ''
  const key = JSON.parse(readFileSync(created, 'utf8')).key
  if (key === null || key === undefined || key === false) return ''
  return String(key)
}

/**
 * The spec files a ticket description links to, each once, in code point
 * order.
 *
 * @param {string} description
 * @returns {string[]} Paths from the workspace root
 */
export const citedSpecFiles = (description) =>
  [...new Set(description.match(CITED_SPEC) ?? [])].sort(byCodePoint)

const specLastChanged = async (workspaceRoot, branch, specs) => {
  const result = await run('git', [
    '-C',
    workspaceRoot,
    'log',
    '-1',
    '--format=%cI',
    branch,
    '--',
    ...specs
  ])
  return result.exitCode === 0 ? result.stdout.trim() : ''
}

const createTicketUpdatedReader = () => {
  let client = null
  return async (key) => {
    try {
      client ??= createJiraClient()
      return (await client.getTicket(key)).updated ?? ''
    } catch {
      return ''
    }
  }
}

const instantOf = (timestamp) =>
  Date.parse(timestamp.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'))

/**
 * Whether a ticket describes behaviour its specs have since changed: the
 * specs' last change is later than the ticket's last update. Both are
 * compared as instants, offsets included.
 *
 * @param {string} specChanged - An ISO 8601 timestamp
 * @param {string} ticketUpdated - A Jira timestamp, such as 2026-11-11T11:42:00.000+0000
 * @returns {'stale'|'current'|null} Null when either timestamp cannot be read
 */
export const compareTimes = (specChanged, ticketUpdated) => {
  const specInstant = instantOf(specChanged)
  const ticketInstant = instantOf(ticketUpdated)
  if (Number.isNaN(specInstant) || Number.isNaN(ticketInstant)) return null
  return specInstant > ticketInstant ? 'stale' : 'current'
}

const VERDICT_TEXT = {
  stale: 'STALE — regenerate',
  current: 'current'
}

const checkFolder = async ({
  workspaceRoot,
  branch,
  ticketsDir,
  folder,
  ticketUpdatedOf
}) => {
  const folderDir = join(ticketsDir, folder)
  const descriptionFile = join(folderDir, 'description.txt')
  if (!existsSync(descriptionFile)) return null

  const entry = {
    folder,
    key: recordedKeyIn(folderDir),
    specs: [],
    specLastChanged: '',
    ticketUpdated: '',
    compared: false,
    verdict: 'no key recorded'
  }
  if (!entry.key) return entry

  entry.specs = citedSpecFiles(readFileSync(descriptionFile, 'utf8'))
  if (!entry.specs.length) return { ...entry, verdict: 'cites no spec files' }

  entry.specLastChanged = await specLastChanged(
    workspaceRoot,
    branch,
    entry.specs
  )
  entry.ticketUpdated = await ticketUpdatedOf(entry.key)
  entry.compared = true
  if (!entry.specLastChanged || !entry.ticketUpdated) {
    return { ...entry, verdict: 'cannot compare' }
  }
  const comparison = compareTimes(entry.specLastChanged, entry.ticketUpdated)
  return {
    ...entry,
    verdict: comparison ? VERDICT_TEXT[comparison] : 'cannot compare'
  }
}

/**
 * Reports which of a workarea's theme tickets openspec has moved on from.
 * For each ticket folder with a `description.txt`, compares when the spec
 * files it links to last changed on the branch with when its Jira ticket
 * was last updated. Reads only.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.workarea] - A path under `workareas/`
 * @param {string} [args.branch] - The checked-out branch when left out
 * @returns {Promise<{workarea: string, branch: string, tickets: object[], checked: number, stale: number}>}
 * @throws {TimError} USAGE without a workarea; NOT_FOUND when it has no tickets folder
 */
export const checkStaleTickets = async ({
  workspaceRoot,
  workarea,
  branch
}) => {
  if (!workarea) {
    throw new TimError(
      'USAGE',
      'tim theme-ticket stale: --workarea is required'
    )
  }
  const ticketsDir = `${workspaceRoot}/workareas/${workarea}/tickets`
  if (!isFolder(ticketsDir)) {
    throw new TimError(
      'NOT_FOUND',
      `tim theme-ticket stale: no tickets folder at ${ticketsDir}`
    )
  }
  const checkedBranch = branch || (await currentBranch(workspaceRoot))
  const ticketUpdatedOf = createTicketUpdatedReader()

  const tickets = []
  for (const folder of ticketFoldersIn(ticketsDir)) {
    const entry = await checkFolder({
      workspaceRoot,
      branch: checkedBranch,
      ticketsDir,
      folder,
      ticketUpdatedOf
    })
    if (entry) tickets.push(entry)
  }

  return {
    workarea,
    branch: checkedBranch,
    tickets,
    checked: tickets.filter((ticket) => ticket.compared).length,
    stale: tickets.filter((ticket) => ticket.verdict === VERDICT_TEXT.stale)
      .length
  }
}

const tableRow = (columns) => {
  const widths = [22, 12, 22, 22]
  return columns
    .map((column, index) =>
      index < widths.length ? column.padEnd(widths[index]) : column
    )
    .join(' ')
}

const shownTimestamp = (timestamp) =>
  timestamp ? timestamp.slice(0, SHOWN_TIMESTAMP_LENGTH) : '-'

const ticketRow = (ticket) => {
  if (!ticket.key) {
    return tableRow([ticket.folder, '-', '-', '-', ticket.verdict])
  }
  if (!ticket.compared) {
    return tableRow([ticket.folder, ticket.key, '-', '-', ticket.verdict])
  }
  const bothRead = ticket.specLastChanged && ticket.ticketUpdated
  const shown = bothRead ? shownTimestamp : (timestamp) => timestamp || '-'
  return tableRow([
    ticket.folder,
    ticket.key,
    shown(ticket.specLastChanged),
    shown(ticket.ticketUpdated),
    ticket.verdict
  ])
}

/**
 * The report `tim theme-ticket stale` prints: a fixed-width table, one row
 * per ticket folder, then the counts.
 *
 * @param {object} report - From {@link checkStaleTickets}
 * @returns {string}
 */
export const renderStaleText = (report) =>
  [
    tableRow([
      'FOLDER',
      'TICKET',
      'SPEC LAST CHANGED',
      'TICKET UPDATED',
      'VERDICT'
    ]),
    ...report.tickets.map(ticketRow),
    '',
    `${report.checked} ticket(s) compared, ${report.stale} stale.`,
    ...(report.stale > 0
      ? [
          'Regenerate a stale ticket by re-deriving its theme and rewriting its description.txt.'
        ]
      : [])
  ].join('\n')
