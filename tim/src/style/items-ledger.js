import { refuseOutside } from '../review/file-review.js'
import {
  CODE_QUALITY_CATEGORIES,
  DESIGN_CATEGORIES,
  refuseCategoryOutside
} from '../review/finding-categories.js'
import {
  appendLedgerItem,
  compareCodePoints,
  countItems,
  dispositionChange,
  existingLedgerFolder,
  labelFor,
  matchesFilters,
  noteChange,
  refuseFirstMissingOption,
  refuseMissingReviewId,
  renderLedgerTsv,
  shownOrNull,
  STATUS_BY_FILTER,
  STATUSES,
  statusChange,
  updateLedgerItem
} from '../review/items-ledger.js'
import { itemsFilePath } from '../review/paths.js'
import { readReviewItems } from '../review/store.js'
import { styleDir } from './paths.js'

export const STYLE_SEVERITIES = ['FAIL', 'WARN']
export const STYLE_CATEGORIES = [
  ...CODE_QUALITY_CATEGORIES,
  ...DESIGN_CATEGORIES
]
export const STYLE_DISPOSITIONS = [
  'Fix',
  "Won't Fix",
  'Discuss',
  'Auto-Resolved'
]

const DISPOSITION_BY_FILTER = {
  pending: '',
  fix: 'Fix',
  'wont-fix': "Won't Fix",
  discuss: 'Discuss',
  'auto-resolved': 'Auto-Resolved'
}

const WORKSPACE_NAME = 'Style review workspace'

const existingStyleFolder = (workspaceRoot, reviewId) =>
  existingLedgerFolder(styleDir(workspaceRoot, reviewId), WORKSPACE_NAME)

const keyText = (value) => (typeof value === 'string' ? value : '')

const compareRepoAndFile = (left, right) =>
  compareCodePoints(keyText(left.repo), keyText(right.repo)) ||
  compareCodePoints(keyText(left.file), keyText(right.file))

const isSameGroup = (group, item) =>
  group.repo === item.repo && group.file === item.file

const addToGroups = (groups, item) => {
  const last = groups.at(-1)
  if (last && isSameGroup(last, item)) {
    return [...groups.slice(0, -1), { ...last, items: [...last.items, item] }]
  }
  return [...groups, { repo: item.repo, file: item.file, items: [item] }]
}

/**
 * Items grouped by repo and file, as jq's `group_by([.repo, .file])`
 * groups them: groups in repo then file order, each keeping its items in
 * the order given.
 *
 * @param {object[]} items
 * @returns {{repo: string, file: string, items: object[]}[]}
 */
export const groupItemsByFile = (items) =>
  [...items].sort(compareRepoAndFile).reduce(addToGroups, [])

/**
 * A code style review's items, each with its repo, narrowed by every
 * filter given.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo] - Read only this repo's items file
 * @param {string} [args.file] - Only the items for this file, matched exactly
 * @param {string} [args.filter] - pending, fix, wont-fix, discuss or auto-resolved
 * @param {string} [args.status] - not-done, done or failed
 * @param {boolean} [args.byFile] - Group the items by repo and file
 * @returns {{items: object[], byFile: boolean, foundItemsFiles: boolean}}
 * @throws {TimError} USAGE with no review id or an unknown filter or status; NOT_FOUND when the style review folder is missing
 */
export const listStyleItems = ({
  workspaceRoot,
  reviewId,
  repo,
  file,
  filter,
  status,
  byFile = false
}) => {
  refuseMissingReviewId(
    reviewId,
    'tim style items list <review-id> [--repo REPO] [--file PATH] [--filter DISPOSITION] [--status STATUS] [--by-file]'
  )
  const folder = existingStyleFolder(workspaceRoot, reviewId)
  const matches = matchesFilters({
    disposition: labelFor(DISPOSITION_BY_FILTER, '--filter', filter),
    status: labelFor(STATUS_BY_FILTER, '--status', status),
    file
  })
  const items = readReviewItems(folder, { repo })
  return {
    items: (items ?? []).filter(matches),
    byFile,
    foundItemsFiles: items !== null
  }
}

/**
 * The listed items as --json gives them: the items, or with `byFile` the
 * groups.
 *
 * @param {ReturnType<typeof listStyleItems>} listed
 * @returns {object[]}
 */
export const listedStyleJson = ({ items, byFile }) =>
  byFile ? groupItemsByFile(items) : items

const STYLE_COLUMNS = [
  'repo',
  'id',
  'file',
  'line',
  'rule',
  'severity',
  'issue',
  'fix',
  'disposition',
  'status',
  'notes'
]

/**
 * The listed items as text: nothing when no items file matched; with
 * `byFile`, the groups as indented JSON; else a tab-separated line per
 * item in the columns repo, id, file, line, rule, severity, issue, fix,
 * disposition, status and notes.
 *
 * @param {ReturnType<typeof listStyleItems>} listed
 * @returns {string | null}
 */
export const renderListedStyleText = (listed) => {
  if (!listed.foundItemsFiles) return null
  if (listed.byFile) {
    return JSON.stringify(groupItemsByFile(listed.items), null, 2)
  }
  return renderLedgerTsv(listed.items, STYLE_COLUMNS)
}

/**
 * How many of a code style review's items have each disposition and
 * status. An item with no disposition counts as `Pending`.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo] - Count only this repo's items
 * @returns {{reviewId: string, repo?: string, breakdown: {disposition: string, status: string, count: number}[], total: number}}
 * @throws {TimError} USAGE with no review id; NOT_FOUND when the style review folder is missing
 */
export const countStyleItems = ({ workspaceRoot, reviewId, repo }) => {
  refuseMissingReviewId(
    reviewId,
    'tim style items counts <review-id> [--repo REPO]'
  )
  const folder = existingStyleFolder(workspaceRoot, reviewId)
  return {
    reviewId,
    ...(repo === undefined ? {} : { repo }),
    ...countItems(readReviewItems(folder, { repo }) ?? [])
  }
}

/**
 * Appends an item to a repo's items file in a code style review, after
 * its highest id, starting the file, and the review's folder, when there
 * is none. The item's disposition, status and notes start null.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo]
 * @param {string} [args.file]
 * @param {string} [args.line] - Stored as the text given; empty when not given
 * @param {string} [args.rule]
 * @param {string} [args.severity] - FAIL or WARN
 * @param {string} [args.category] - A code-quality or design category; stored only when not empty
 * @param {string} [args.issue]
 * @param {string} [args.fix]
 * @param {string} [args.bestPractice] - Stored only when not empty
 * @returns {{id: number, path: string, item: object}}
 * @throws {TimError} USAGE for a missing or invalid option
 */
export const addStyleItem = ({
  workspaceRoot,
  reviewId,
  repo,
  file,
  line = '',
  rule,
  severity,
  category = '',
  issue,
  fix,
  bestPractice = ''
}) => {
  refuseMissingReviewId(
    reviewId,
    'tim style items add <review-id> --repo REPO --file PATH --line N --rule R --severity S --issue "..." --fix "..." [--category C] [--best-practice PATH]'
  )
  refuseFirstMissingOption([
    ['repo', repo],
    ['file', file],
    ['rule', rule],
    ['severity', severity],
    ['issue', issue],
    ['fix', fix]
  ])
  refuseOutside(
    STYLE_SEVERITIES,
    severity,
    `Invalid --severity: ${severity} (must be ${STYLE_SEVERITIES.join('|')})`
  )
  if (category !== '') refuseCategoryOutside(category, STYLE_CATEGORIES)
  return appendLedgerItem({
    path: itemsFilePath(styleDir(workspaceRoot, reviewId), repo),
    reviewId,
    repo,
    itemWithId: (id) => ({
      id,
      file,
      line,
      rule,
      ...(category === '' ? {} : { category }),
      severity,
      issue,
      fix,
      disposition: null,
      status: null,
      notes: null,
      ...(bestPractice === '' ? {} : { best_practice: bestPractice })
    })
  })
}

const styleItemsPath = ({ workspaceRoot, reviewId, repo }) =>
  itemsFilePath(styleDir(workspaceRoot, reviewId), repo)

/**
 * Sets a style item's disposition and the status it implies: `Not Done`
 * for Fix and Discuss, `—` for Won't Fix and Auto-Resolved, and null when
 * the disposition is cleared with an empty value. A note, when given,
 * replaces the item's notes; an empty note clears them.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo]
 * @param {string} [args.item] - The item's id, as JSON text
 * @param {string} [args.disposition] - One of {@link STYLE_DISPOSITIONS}, or empty to clear
 * @param {string} [args.note]
 * @returns {{repo: string, path: string, item: object, noteGiven: boolean}}
 * @throws {TimError} USAGE for a missing or invalid option; NOT_FOUND when the items file or the item is missing
 */
export const markStyleItem = ({
  workspaceRoot,
  reviewId,
  repo,
  item,
  disposition = '',
  note
}) => {
  refuseMissingReviewId(
    reviewId,
    'tim style items mark <review-id> --repo REPO --item N --disposition VALUE [--note "..."]'
  )
  refuseFirstMissingOption([
    ['repo', repo],
    ['item', item]
  ])
  if (disposition !== '') {
    refuseOutside(
      STYLE_DISPOSITIONS,
      disposition,
      `Invalid --disposition: ${disposition}`
    )
  }
  const updated = updateLedgerItem({
    itemsPath: styleItemsPath({ workspaceRoot, reviewId, repo }),
    item,
    changes: { ...dispositionChange(disposition), ...noteChange(note) }
  })
  return { repo, ...updated, noteGiven: note !== undefined }
}

/**
 * Sets a style item's status and leaves its disposition. A note, when
 * given, replaces the item's notes; an empty note clears them.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo]
 * @param {string} [args.item] - The item's id, as JSON text
 * @param {string} [args.status] - Not Done, Done, Failed or —, or empty to clear
 * @param {string} [args.note]
 * @returns {{repo: string, path: string, item: object, noteGiven: boolean}}
 * @throws {TimError} USAGE for a missing or invalid option; NOT_FOUND when the items file or the item is missing
 */
export const setStyleItemStatus = ({
  workspaceRoot,
  reviewId,
  repo,
  item,
  status = '',
  note
}) => {
  refuseMissingReviewId(
    reviewId,
    'tim style items status <review-id> --repo REPO --item N --status VALUE [--note "..."]'
  )
  refuseFirstMissingOption([
    ['repo', repo],
    ['item', item]
  ])
  if (status !== '') {
    refuseOutside(STATUSES, status, `Invalid --status: ${status}`)
  }
  const updated = updateLedgerItem({
    itemsPath: styleItemsPath({ workspaceRoot, reviewId, repo }),
    item,
    changes: { ...statusChange(status), ...noteChange(note) }
  })
  return { repo, ...updated, noteGiven: note !== undefined }
}

const notesSetText = (noteGiven) => (noteGiven ? ', Notes set' : '')

/**
 * @param {ReturnType<typeof markStyleItem>} marked
 * @returns {string}
 */
export const renderStyleMarkedText = ({ repo, item, noteGiven }) =>
  `Marked #${item.id} in ${repo}: Disposition=${shownOrNull(item.disposition)}, Status=${shownOrNull(item.status)}${notesSetText(noteGiven)}`

/**
 * @param {ReturnType<typeof setStyleItemStatus>} updated
 * @returns {string}
 */
export const renderStyleStatusText = ({ repo, item, noteGiven }) =>
  `Updated #${item.id} in ${repo}: Status=${shownOrNull(item.status)}${notesSetText(noteGiven)}`
