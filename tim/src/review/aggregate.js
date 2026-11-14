import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile } from '../backlog/io.js'
import { TimError } from '../errors.js'
import { renderItemsTable, textOf } from './items-table.js'
import { itemsFilePath, reviewDir } from './paths.js'
import { writeJsonAtomic } from './store.js'

const FILE_REVIEW_SUFFIX = '.review.json'

const compareCodePoints = (left, right) => {
  if (left < right) return -1
  return left > right ? 1 : 0
}

/**
 * The paths of the per-file reviews in one folder, in code-point order of
 * their names.
 *
 * @param {string} folder
 * @param {string} suffix - `.review.json` or `.style.json`
 * @returns {string[]}
 */
export const fileReviewPathsIn = (folder, suffix = FILE_REVIEW_SUFFIX) =>
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

const countOf = (todos, severity) =>
  todos.filter((todo) => todo.severity === severity).length

const rollupOf = ({ file, verdict, todos }) => ({
  file,
  verdict,
  critical: countOf(todos, 'Critical'),
  major: countOf(todos, 'Major'),
  minor: countOf(todos, 'Minor'),
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

const existingFileReviewsFolder = (folder) => {
  if (!statSync(folder, { throwIfNoEntry: false })?.isDirectory()) {
    throw new TimError('NOT_FOUND', `No review dir: ${folder}`)
  }
  const paths = fileReviewPathsIn(folder)
  if (paths.length === 0) {
    throw new TimError('NOT_FOUND', `No .review.json files in ${folder}`)
  }
  return paths
}

const VERDICT_LABELS = {
  SAFE: 'SAFE',
  NEEDS_ATTENTION: 'NEEDS ATTENTION',
  RISKY: 'RISKY'
}

const fileSummaryOf = (rollup) =>
  [
    '## File Analysis Summary',
    '',
    '| File | Verdict | Critical | Major | Minor |',
    '|------|---------|----------|-------|-------|',
    ...rollup.map(
      ({ file, verdict, critical, major, minor }) =>
        `| \`${textOf(file)}\` | ${VERDICT_LABELS[verdict] ?? '—'} | ${critical} | ${major} | ${minor} |`
    )
  ].join('\n')

const itemsSectionOf = (items) =>
  ['## Items', '', renderItemsTable(items)].join('\n')

const markdownOf = ({ section, rollup, items }) => {
  if (section === 'file-summary') return fileSummaryOf(rollup)
  if (section === 'items') return itemsSectionOf(items)
  return [fileSummaryOf(rollup), '', itemsSectionOf(items)].join('\n')
}

/**
 * A repo's per-file reviews rolled up: each file's verdict, its count of
 * findings at each severity and its findings, in file order. With
 * `writeItems` it also starts the repo's items.<repo>.json afresh from
 * the findings, numbered from 1 with no disposition, status or notes, and
 * stamps `reconciled_at` on every file review that records a reviewer
 * run. The markdown gives the File Analysis Summary, the `## Items`
 * table or both: the items come from the items file when there is one,
 * else from the findings.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo]
 * @param {string} [args.section] - file-summary, items or both
 * @param {boolean} [args.writeItems]
 * @param {boolean} [args.json] - Skip the markdown and the section check
 * @param {() => Date} [args.now]
 * @returns {{rollup: object[], markdown?: string}}
 * @throws {TimError} USAGE with no review id or repo, or, after any write, an unknown section; NOT_FOUND when the repo has no file reviews
 */
export const aggregateFileReviews = ({
  workspaceRoot,
  reviewId,
  repo,
  section = 'both',
  writeItems = false,
  json = false,
  now = () => new Date()
}) => {
  if (!reviewId) throw usage('Missing ticket')
  if (!repo) throw usage('Missing --repo')
  const folder = reviewDir(workspaceRoot, reviewId)
  const paths = existingFileReviewsFolder(join(folder, 'file-reviews', repo))
  const reviews = paths.map(readJsonFile)
  const rollup = reviews.map(rollupOf).sort(compareFiles)
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
  return { rollup, markdown: markdownOf({ section, rollup, items }) }
}
