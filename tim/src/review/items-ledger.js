import { existsSync, statSync } from 'node:fs'
import { readJsonFile } from '../backlog/io.js'
import { TimError } from '../errors.js'
import {
  FINDING_CATEGORIES,
  nextIdAfter,
  parseJsonOption,
  refuseOutside,
  SEVERITIES
} from './file-review.js'
import { refuseCategoryOutside } from './finding-categories.js'
import { itemsFilePath, reviewDir } from './paths.js'
import { readReviewItems, writeJsonAtomic } from './store.js'

const DISPOSITION_BY_FILTER = {
  pending: '',
  fix: 'Fix',
  'wont-fix': "Won't Fix",
  discuss: 'Discuss',
  'auto-resolved': 'Auto-Resolved',
  merged: 'Merged'
}

export const STATUS_BY_FILTER = {
  'not-done': 'Not Done',
  done: 'Done',
  failed: 'Failed'
}

export const NO_STATUS = '—'

export const DISPOSITIONS = [
  'Fix',
  "Won't Fix",
  'Discuss',
  'Auto-Resolved',
  'Merged'
]
export const STATUSES = ['Not Done', 'Done', 'Failed', NO_STATUS]

const STATUS_FOR_DISPOSITION = {
  Fix: 'Not Done',
  Discuss: 'Not Done',
  "Won't Fix": NO_STATUS,
  'Auto-Resolved': NO_STATUS,
  Merged: NO_STATUS
}

/**
 * Whether jq's `//` would pass over the value: null, missing or false.
 *
 * @param {any} value
 * @returns {boolean}
 */
export const isAbsent = (value) =>
  value === null || value === undefined || value === false

/**
 * The value, or an empty string where jq's `// ""` would give one.
 *
 * @param {any} value
 * @returns {any}
 */
export const orEmpty = (value) => (isAbsent(value) ? '' : value)

const usage = (message) => new TimError('USAGE', message)

/**
 * @param {[string, string | undefined][]} namedValues - Each option's name and value, in the order to check them
 * @throws {TimError} USAGE `--<name> required` for the first one missing or empty
 */
export const refuseFirstMissingOption = (namedValues) => {
  const missing = namedValues.find(([, value]) => !value)
  if (missing) throw usage(`--${missing[0]} required`)
}

/**
 * @param {string | undefined} reviewId
 * @param {string} usageLine - The command's usage, without `Usage: `
 * @throws {TimError} USAGE naming the usage line when there is no review id
 */
export const refuseMissingReviewId = (reviewId, usageLine) => {
  if (!reviewId) throw usage(`Usage: ${usageLine}`)
}

/**
 * The label a filter option's value stands for.
 *
 * @param {Record<string, string>} labels - Each value the option takes, with its label
 * @param {string} option - The option's name, for the refusal
 * @param {string | undefined} value
 * @returns {string | undefined} Undefined when the option was not given
 * @throws {TimError} USAGE when the value is not one of the labels' keys
 */
export const labelFor = (labels, option, value) => {
  if (value === undefined) return undefined
  if (!Object.hasOwn(labels, value)) {
    throw usage(`Invalid ${option}: ${value}`)
  }
  return labels[value]
}

const isFolder = (path) =>
  statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false

/**
 * @param {string} folder
 * @param {string} workspaceName - What the folder holds, such as `Review workspace`
 * @returns {string} The folder
 * @throws {TimError} NOT_FOUND `<workspaceName> not found: <folder>` when it is missing or is not a folder
 */
export const existingLedgerFolder = (folder, workspaceName) => {
  if (!isFolder(folder)) {
    throw new TimError('NOT_FOUND', `${workspaceName} not found: ${folder}`)
  }
  return folder
}

/**
 * A filter that keeps the items with this disposition, status and file,
 * ignoring each one left undefined. A missing disposition or status
 * matches the empty label.
 *
 * @param {{disposition?: string, status?: string, file?: string}} filters
 * @returns {(item: object) => boolean}
 */
export const matchesFilters =
  ({ disposition, status, file }) =>
  (item) =>
    (disposition === undefined || orEmpty(item.disposition) === disposition) &&
    (status === undefined || orEmpty(item.status) === status) &&
    (file === undefined || item.file === file)

/**
 * A review's items, each with its repo, narrowed by every filter given.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo] - Read only this repo's items file
 * @param {string} [args.file] - Only the items for this file, matched exactly
 * @param {string} [args.filter] - pending, fix, wont-fix, discuss, auto-resolved or merged
 * @param {string} [args.status] - not-done, done or failed
 * @returns {object[]}
 * @throws {TimError} USAGE with no review id or an unknown filter or status; NOT_FOUND when the review folder is missing
 */
export const listReviewItems = ({
  workspaceRoot,
  reviewId,
  repo,
  file,
  filter,
  status
}) => {
  refuseMissingReviewId(
    reviewId,
    'tim review items list <review-id> [--repo REPO] [--file PATH] [--filter DISPOSITION] [--status STATUS]'
  )
  const folder = existingLedgerFolder(
    reviewDir(workspaceRoot, reviewId),
    'Review workspace'
  )
  const matches = matchesFilters({
    disposition: labelFor(DISPOSITION_BY_FILTER, '--filter', filter),
    status: labelFor(STATUS_BY_FILTER, '--status', status),
    file
  })
  return (readReviewItems(folder, { repo }) ?? []).filter(matches)
}

const tsvCell = (value) =>
  String(orEmpty(value))
    .replaceAll('\\', '\\\\')
    .replaceAll('\t', '\\t')
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\r')

/**
 * Items as tab-separated lines, one per item, in the columns given. Tabs,
 * newlines, carriage returns and backslashes in a value are escaped as jq's
 * `@tsv` escapes them, and a missing value is empty. Null when there are
 * no items.
 *
 * @param {object[]} items
 * @param {string[]} columns - The item fields to print, in order
 * @returns {string | null}
 */
export const renderLedgerTsv = (items, columns) =>
  items.length === 0
    ? null
    : items
        .map((item) =>
          columns.map((column) => tsvCell(item[column])).join('\t')
        )
        .join('\n')

const ITEM_COLUMNS = [
  'repo',
  'id',
  'file',
  'line',
  'severity',
  'category',
  'issue',
  'fix',
  'disposition',
  'status',
  'notes'
]

/**
 * Items as tab-separated lines, one per item, in the columns repo, id,
 * file, line, severity, category, issue, fix, disposition, status and
 * notes. Null when there are no items.
 *
 * @param {object[]} items - From {@link listReviewItems}
 * @returns {string | null}
 */
export const renderItemsTsv = (items) => renderLedgerTsv(items, ITEM_COLUMNS)

/**
 * Orders text by code point, as jq's `sort` does.
 *
 * @param {string} left
 * @param {string} right
 * @returns {number}
 */
export const compareCodePoints = (left, right) => {
  if (left < right) return -1
  return left > right ? 1 : 0
}

const breakdownOf = (items) => {
  const counts = new Map()
  for (const item of items) {
    const disposition = isAbsent(item.disposition)
      ? 'Pending'
      : item.disposition
    const status = orEmpty(item.status)
    const key = JSON.stringify([disposition, status])
    const row = counts.get(key) ?? { disposition, status, count: 0 }
    counts.set(key, { ...row, count: row.count + 1 })
  }
  return [...counts.values()].sort(
    (left, right) =>
      compareCodePoints(left.disposition, right.disposition) ||
      compareCodePoints(left.status, right.status)
  )
}

/**
 * How many items have each disposition and status, with the total. An
 * item with no disposition counts as `Pending`, and one with no status as
 * an empty status.
 *
 * @param {object[]} items
 * @returns {{breakdown: {disposition: string, status: string, count: number}[], total: number}}
 */
export const countItems = (items) => {
  const breakdown = breakdownOf(items)
  return {
    breakdown,
    total: breakdown.reduce((total, { count }) => total + count, 0)
  }
}

/**
 * How many of a review's items have each disposition and status.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo] - Count only this repo's items
 * @returns {{reviewId: string, repo?: string, breakdown: {disposition: string, status: string, count: number}[], total: number}}
 * @throws {TimError} USAGE with no review id; NOT_FOUND when the review folder is missing
 */
export const countReviewItems = ({ workspaceRoot, reviewId, repo }) => {
  refuseMissingReviewId(
    reviewId,
    'tim review items counts <review-id> [--repo REPO]'
  )
  const folder = existingLedgerFolder(
    reviewDir(workspaceRoot, reviewId),
    'Review workspace'
  )
  return {
    reviewId,
    ...(repo === undefined ? {} : { repo }),
    ...countItems(readReviewItems(folder, { repo }) ?? [])
  }
}

const fieldsReadByBash = (cells) => {
  const fields = cells
    .join('\t')
    .replace(/^\t+|\t+$/g, '')
    .split(/\t+/)
  return [fields[0], fields[1] ?? '', fields.slice(2).join('\t')]
}

const padEndToBytes = (text, width) =>
  text + ' '.repeat(Math.max(0, width - Buffer.byteLength(text)))

const breakdownLine = ({ count, disposition, status }) => {
  const [countText, dispositionText, statusText] = fieldsReadByBash([
    tsvCell(count),
    tsvCell(disposition),
    tsvCell(status === '' ? NO_STATUS : status)
  ])
  return `  ${countText.padStart(4)}  ${padEndToBytes(dispositionText, 15)}  ${statusText}`
}

/**
 * The counts as a table: a heading, a line per disposition and status, then
 * the total.
 *
 * @param {{reviewId: string, repo?: string, breakdown: object[], total: number}} counts
 * @returns {string}
 */
export const renderCountsText = ({ reviewId, repo, breakdown, total }) =>
  [
    `Counts for ${reviewId}${repo ? ` (repo: ${repo})` : ''}:`,
    ...breakdown.map(breakdownLine),
    '  ----',
    `  ${String(total).padStart(4)}  TOTAL`
  ].join('\n')

/**
 * Appends an item to an items file after its highest id, starting the
 * file as `{ticket, repo, items: []}` when there is none.
 *
 * @param {object} args
 * @param {string} args.path - The items file
 * @param {string} args.reviewId - Stored as the ticket of a new file
 * @param {string} args.repo - Stored as the repo of a new file
 * @param {(id: number) => object} args.itemWithId - The item to append, given its id
 * @returns {{id: number, path: string, item: object}}
 */
export const appendLedgerItem = ({ path, reviewId, repo, itemWithId }) => {
  const ledger = existsSync(path)
    ? readJsonFile(path)
    : { ticket: reviewId, repo, items: [] }
  const item = itemWithId(nextIdAfter(ledger.items))
  writeJsonAtomic(path, { ...ledger, items: [...ledger.items, item] })
  return { id: item.id, path, item }
}

/**
 * Appends an item to a repo's items file, after its highest id, starting
 * the file when the repo has none. The item's disposition, status and
 * notes start null.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo]
 * @param {string} [args.file]
 * @param {string} [args.line] - Stored as the text given
 * @param {string} [args.severity] - Critical, Major or Minor
 * @param {string} [args.category] - One of the finding categories
 * @param {string} [args.issue]
 * @param {string} [args.fix]
 * @param {string} [args.bestPractice] - Stored only when not empty
 * @returns {{id: number, path: string, item: object}}
 * @throws {TimError} USAGE for a missing or invalid option; NOT_FOUND when the review folder is missing
 */
export const addReviewItem = ({
  workspaceRoot,
  reviewId,
  repo,
  file,
  line,
  severity,
  category,
  issue,
  fix,
  bestPractice = ''
}) => {
  refuseMissingReviewId(
    reviewId,
    'tim review items add <review-id> --repo REPO --file PATH --line N --severity S --category C --issue "..." --fix "..." [--best-practice PATH]'
  )
  refuseFirstMissingOption([
    ['repo', repo],
    ['file', file],
    ['line', line],
    ['severity', severity],
    ['category', category],
    ['issue', issue],
    ['fix', fix]
  ])
  refuseOutside(
    SEVERITIES,
    severity,
    `Invalid --severity: ${severity} (must be ${SEVERITIES.join('|')})`
  )
  refuseCategoryOutside(category, FINDING_CATEGORIES)
  const folder = existingLedgerFolder(
    reviewDir(workspaceRoot, reviewId),
    'Review workspace'
  )
  return appendLedgerItem({
    path: itemsFilePath(folder, repo),
    reviewId,
    repo,
    itemWithId: (id) => ({
      id,
      file,
      line,
      severity,
      category,
      issue,
      fix,
      disposition: null,
      status: null,
      notes: null,
      ...(bestPractice === '' ? {} : { best_practice: bestPractice })
    })
  })
}

const MERGED_NOTE = /^merged into #\d+$/

const nullWhenEmpty = (text) => (text === '' ? null : text)

/**
 * Changes one item of an items file and writes it back.
 *
 * @param {object} args
 * @param {string} args.itemsPath
 * @param {string} args.item - The item's id, as JSON text
 * @param {object} args.changes - Fields to set on the item
 * @returns {{path: string, item: object}} The item as written
 * @throws {TimError} NOT_FOUND when the items file or the item is missing; USAGE when the id is not JSON
 */
export const updateLedgerItem = ({ itemsPath, item, changes }) => {
  if (!existsSync(itemsPath)) {
    throw new TimError('NOT_FOUND', `Items file not found: ${itemsPath}`)
  }
  const id = parseJsonOption('--item', item)
  const ledger = readJsonFile(itemsPath)
  if (!ledger.items.some((entry) => entry.id === id)) {
    throw new TimError('NOT_FOUND', `Item #${item} not found in ${itemsPath}`)
  }
  const items = ledger.items.map((entry) =>
    entry.id === id ? { ...entry, ...changes } : entry
  )
  writeJsonAtomic(itemsPath, { ...ledger, items })
  return { path: itemsPath, item: items.find((entry) => entry.id === id) }
}

/**
 * The fields a disposition sets: the disposition and the status it
 * implies, both null when the disposition is empty.
 *
 * @param {string} disposition
 * @returns {{disposition: string | null, status: string | null}}
 */
export const dispositionChange = (disposition) => ({
  disposition: nullWhenEmpty(disposition),
  status: STATUS_FOR_DISPOSITION[disposition] ?? null
})

/**
 * The notes change a `--note` makes: none when it was not given, else the
 * note, with an empty one stored as null.
 *
 * @param {string | undefined} note
 * @returns {{notes?: string | null}}
 */
export const noteChange = (note) =>
  note === undefined ? {} : { notes: nullWhenEmpty(note) }

/**
 * The fields a status sets: the status, null when it is empty.
 *
 * @param {string} status
 * @returns {{status: string | null}}
 */
export const statusChange = (status) => ({ status: nullWhenEmpty(status) })

const reviewItemsPath = ({ workspaceRoot, reviewId, repo }) =>
  itemsFilePath(reviewDir(workspaceRoot, reviewId), repo)

/**
 * Sets an item's disposition and the status it implies: `Not Done` for Fix
 * and Discuss, `—` for Won't Fix, Auto-Resolved and Merged, and null when
 * the disposition is cleared with an empty value. A note, when given,
 * replaces the item's notes; an empty note clears them.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo]
 * @param {string} [args.item] - The item's id, as JSON text
 * @param {string} [args.disposition] - One of {@link DISPOSITIONS}, or empty to clear
 * @param {string} [args.note] - Must be `merged into #N` with Merged
 * @returns {{repo: string, path: string, item: object}}
 * @throws {TimError} USAGE for a missing or invalid option; NOT_FOUND when the items file or the item is missing
 */
export const markReviewItem = ({
  workspaceRoot,
  reviewId,
  repo,
  item,
  disposition = '',
  note
}) => {
  refuseMissingReviewId(
    reviewId,
    'tim review items mark <review-id> --repo REPO --item N --disposition VALUE [--note "..."]'
  )
  refuseFirstMissingOption([
    ['repo', repo],
    ['item', item]
  ])
  if (disposition !== '') {
    refuseOutside(
      DISPOSITIONS,
      disposition,
      `Invalid --disposition: ${disposition}`
    )
  }
  if (disposition === 'Merged' && !MERGED_NOTE.test(note ?? '')) {
    throw usage('Merged needs --note "merged into #N", naming the owner item.')
  }
  const updated = updateLedgerItem({
    itemsPath: reviewItemsPath({ workspaceRoot, reviewId, repo }),
    item,
    changes: { ...dispositionChange(disposition), ...noteChange(note) }
  })
  return { repo, ...updated }
}

/**
 * Sets an item's status and leaves its disposition. A note, when given,
 * replaces the item's notes; an empty note clears them.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo]
 * @param {string} [args.item] - The item's id, as JSON text
 * @param {string} [args.status] - One of {@link STATUSES}, or empty to clear
 * @param {string} [args.note]
 * @returns {{repo: string, path: string, item: object}}
 * @throws {TimError} USAGE for a missing or invalid option; NOT_FOUND when the items file or the item is missing
 */
export const setReviewItemStatus = ({
  workspaceRoot,
  reviewId,
  repo,
  item,
  status = '',
  note
}) => {
  refuseMissingReviewId(
    reviewId,
    'tim review items status <review-id> --repo REPO --item N --status VALUE [--note "..."]'
  )
  refuseFirstMissingOption([
    ['repo', repo],
    ['item', item]
  ])
  if (status !== '') {
    refuseOutside(STATUSES, status, `Invalid --status: ${status}`)
  }
  const updated = updateLedgerItem({
    itemsPath: reviewItemsPath({ workspaceRoot, reviewId, repo }),
    item,
    changes: { ...statusChange(status), ...noteChange(note) }
  })
  return { repo, ...updated }
}

/**
 * A field as the confirmation line shows it: `<null>` when absent.
 *
 * @param {any} value
 * @returns {any}
 */
export const shownOrNull = (value) => (isAbsent(value) ? '<null>' : value)

/**
 * @param {ReturnType<typeof markReviewItem>} marked
 * @returns {string}
 */
export const renderMarkedText = ({ repo, item }) =>
  `Marked #${item.id} in ${repo}: Disposition=${shownOrNull(item.disposition)}, Status=${shownOrNull(item.status)}, Notes set`

/**
 * @param {ReturnType<typeof setReviewItemStatus>} updated
 * @returns {string}
 */
export const renderStatusText = ({ repo, item }) =>
  `Updated #${item.id} in ${repo}: Status=${shownOrNull(item.status)}, Notes set`
