import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile } from '../backlog/io.js'
import { TimError } from '../errors.js'
import { compareCodePoints } from './items-ledger.js'
import { renderItemsTable, textOf } from './items-table.js'
import { itemsFilePath, reviewDir } from './paths.js'
import { writeJsonAtomic } from './store.js'

/**
 * The paths of the per-file reviews in one folder, in code-point order of
 * their names.
 *
 * @param {string} folder
 * @param {string} suffix - `.review.json` or `.style.json`
 * @returns {string[]}
 */
export const fileReviewPathsIn = (folder, suffix) =>
  readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) => entry.name)
    .sort(compareCodePoints)
    .map((name) => join(folder, name))

/**
 * A second-precision UTC timestamp, as `date -u +%Y-%m-%dT%H:%M:%SZ`
 * prints it.
 *
 * @param {Date} date
 * @returns {string}
 */
export const utcSeconds = (date) => date.toISOString().replace(/\.\d+Z$/, 'Z')

/**
 * Whether a review records when its reviewer ran.
 *
 * @param {{reviewed_at?: any}} review
 * @returns {boolean}
 */
export const hasBeenReviewed = ({ reviewed_at: reviewedAt }) =>
  reviewedAt !== null &&
  reviewedAt !== undefined &&
  reviewedAt !== false &&
  reviewedAt !== ''

/**
 * Stamps `reconciled_at` on a per-file review.
 *
 * @param {string} path
 * @param {string} reconciledAt
 */
export const stampReconciled = (path, reconciledAt) =>
  writeJsonAtomic(path, {
    ...readJsonFile(path),
    reconciled_at: reconciledAt
  })

/**
 * @typedef {object} FileReviewKind
 * @property {string} suffix - The per-file review file name ending
 * @property {{key: string, severity: string, heading: string}[]} severityColumns - Each severity counted, in column order
 * @property {Record<string, string>} verdictLabels - Each verdict with the text the summary shows; any other shows `—`
 * @property {(items: object[]) => string} renderTable - The `## Items` table
 * @property {(folder: string) => string} missingFolderMessage
 */

/** @type {FileReviewKind} */
const REVIEW_KIND = {
  suffix: '.review.json',
  severityColumns: [
    { key: 'critical', severity: 'Critical', heading: 'Critical' },
    { key: 'major', severity: 'Major', heading: 'Major' },
    { key: 'minor', severity: 'Minor', heading: 'Minor' }
  ],
  verdictLabels: {
    SAFE: 'SAFE',
    NEEDS_ATTENTION: 'NEEDS ATTENTION',
    RISKY: 'RISKY'
  },
  renderTable: renderItemsTable,
  missingFolderMessage: (folder) => `No review dir: ${folder}`
}

const rollupOf =
  ({ severityColumns }) =>
  ({ file, verdict, todos }) => ({
    file,
    verdict,
    ...Object.fromEntries(
      severityColumns.map(({ key, severity }) => [
        key,
        todos.filter((todo) => todo.severity === severity).length
      ])
    ),
    todos
  })

const compareFiles = (left, right) =>
  compareCodePoints(textOf(left.file), textOf(right.file))

const numberedTodos = (rollup) =>
  rollup
    .flatMap(({ file, todos }) => todos.map((todo) => ({ ...todo, file })))
    .map((todo, index) => ({ ...todo, id: index + 1 }))

const freshItems = (rollup) =>
  numberedTodos(rollup).map((todo) => ({
    ...todo,
    disposition: null,
    status: null,
    notes: null
  }))

const SECTIONS = ['file-summary', 'items', 'both']

const usage = (message) => new TimError('USAGE', message)

const existingFileReviews = (folder, kind) => {
  if (!statSync(folder, { throwIfNoEntry: false })?.isDirectory()) {
    throw new TimError('NOT_FOUND', kind.missingFolderMessage(folder))
  }
  const paths = fileReviewPathsIn(folder, kind.suffix)
  if (paths.length === 0) {
    throw new TimError('NOT_FOUND', `No ${kind.suffix} files in ${folder}`)
  }
  return paths
}

const fileSummaryOf = (rollup, { severityColumns, verdictLabels }) => {
  const headings = severityColumns.map(({ heading }) => heading)
  const rows = rollup.map((fileRollup) => {
    const counts = severityColumns.map(({ key }) => fileRollup[key])
    const label = verdictLabels[fileRollup.verdict] ?? '—'
    return `| \`${textOf(fileRollup.file)}\` | ${[label, ...counts].join(' | ')} |`
  })
  return [
    '## File Analysis Summary',
    '',
    `| File | Verdict | ${headings.join(' | ')} |`,
    `|------|---------|${headings.map((heading) => '-'.repeat(heading.length + 2)).join('|')}|`,
    ...rows
  ].join('\n')
}

const itemsSectionOf = (items, { renderTable }) =>
  ['## Items', '', renderTable(items)].join('\n')

const markdownOf = ({ section, rollup, items, kind }) => {
  if (section === 'file-summary') return fileSummaryOf(rollup, kind)
  if (section === 'items') return itemsSectionOf(items, kind)
  return [fileSummaryOf(rollup, kind), '', itemsSectionOf(items, kind)].join(
    '\n'
  )
}

/**
 * A repo's per-file reviews of one kind rolled up: each file's verdict,
 * its count of findings at each severity and its findings, in file order.
 * With `writeItems` it also starts the repo's items.<repo>.json afresh
 * from the findings, numbered from 1 with no disposition, status or
 * notes, and stamps `reconciled_at` on every file review that records a
 * reviewer run. The markdown gives the File Analysis Summary, the
 * `## Items` table or both: the items come from the items file when there
 * is one, else from the findings.
 *
 * @param {object} args
 * @param {string} args.folder - The review's folder
 * @param {string} [args.reviewId]
 * @param {string} [args.repo]
 * @param {string} [args.section] - file-summary, items or both
 * @param {boolean} [args.writeItems]
 * @param {boolean} [args.json] - Skip the markdown and the section check
 * @param {() => Date} [args.now]
 * @param {FileReviewKind} args.kind
 * @returns {{rollup: object[], markdown?: string}}
 * @throws {TimError} USAGE with no review id or repo, or, after any write, an unknown section; NOT_FOUND when the repo has no file reviews
 */
export const aggregatePerFileReviews = ({
  folder,
  reviewId,
  repo,
  section = 'both',
  writeItems = false,
  json = false,
  now = () => new Date(),
  kind
}) => {
  const paths = existingFileReviews(join(folder, 'file-reviews', repo), kind)
  const reviews = paths.map(readJsonFile)
  const rollup = reviews.map(rollupOf(kind)).sort(compareFiles)
  const itemsPath = itemsFilePath(folder, repo)
  if (writeItems) {
    writeJsonAtomic(itemsPath, {
      ticket: reviewId,
      repo,
      items: freshItems(rollup)
    })
    const reconciledAt = utcSeconds(now())
    paths
      .filter((_, index) => hasBeenReviewed(reviews[index]))
      .forEach((path) => stampReconciled(path, reconciledAt))
  }
  if (json) return { rollup }
  if (!SECTIONS.includes(section)) {
    throw usage(`Unknown --section: ${section}`)
  }
  const items = existsSync(itemsPath)
    ? readJsonFile(itemsPath).items
    : numberedTodos(rollup)
  return { rollup, markdown: markdownOf({ section, rollup, items, kind }) }
}

/**
 * @param {string | undefined} reviewId
 * @param {string | undefined} repo
 * @throws {TimError} USAGE `Missing ticket` or `Missing --repo`
 */
export const refuseMissingTicketOrRepo = (reviewId, repo) => {
  if (!reviewId) throw usage('Missing ticket')
  if (!repo) throw usage('Missing --repo')
}

/**
 * A repo's per-file code reviews rolled up, as
 * {@link aggregatePerFileReviews} rolls them up, with each file's Critical,
 * Major and Minor counts.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo]
 * @param {string} [args.section] - file-summary, items or both
 * @param {boolean} [args.writeItems]
 * @param {boolean} [args.json]
 * @param {() => Date} [args.now]
 * @returns {{rollup: object[], markdown?: string}}
 * @throws {TimError} USAGE with no review id or repo, or an unknown section; NOT_FOUND when the repo has no file reviews
 */
export const aggregateFileReviews = ({
  workspaceRoot,
  reviewId,
  repo,
  ...rest
}) => {
  refuseMissingTicketOrRepo(reviewId, repo)
  return aggregatePerFileReviews({
    ...rest,
    folder: reviewDir(workspaceRoot, reviewId),
    reviewId,
    repo,
    kind: REVIEW_KIND
  })
}
