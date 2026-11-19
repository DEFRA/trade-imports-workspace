import { TimError } from '../errors.js'
import {
  isFolder,
  packageRowsOf,
  packagesFilesOfRun,
  requireOneOf,
  runFolder
} from './state.js'

const CLASSIFICATIONS = ['pending', 'auto', 'manual']
const STATUSES = ['pending', 'todo', 'inprogress', 'done', 'failed']
const RISKS = ['LOW', 'MEDIUM', 'HIGH']

const isUnset = (value) => value === null || value === undefined

/**
 * jq's `value // fallback`: the fallback when the value is null, missing
 * or false.
 *
 * @param {unknown} value
 * @param {unknown} fallback
 * @returns {unknown}
 */
export const alternative = (value, fallback) =>
  isUnset(value) || value === false ? (fallback ?? null) : value

const matchesClassification = (wanted, row) =>
  !wanted ||
  (wanted === 'pending'
    ? isUnset(row.classification)
    : row.classification === wanted)

const matchesStatus = (wanted, row) =>
  !wanted ||
  (wanted === 'pending'
    ? isUnset(row.implementation_status) || row.implementation_status === 'todo'
    : row.implementation_status === wanted)

const matchesFilters =
  ({ classification, status, risk, packageName }) =>
  (row) =>
    matchesClassification(classification, row) &&
    matchesStatus(status, row) &&
    (!risk || row.risk === risk) &&
    (!packageName || row.package === packageName)

const requireRunId = (runId, usage) => {
  if (!runId) throw new TimError('USAGE', usage)
}

export const LIST_USAGE =
  'Usage: tim npm packages list --run-id TICKET [--repo REPO] [--package PKG] [--classification pending|auto|manual] [--risk LOW|MEDIUM|HIGH] [--status pending|todo|inprogress|done|failed] [--json]'

/**
 * The package rows of a run that match every filter given, each with its
 * repo. A `pending` classification matches a row nobody has classified; a
 * `pending` status matches a row with no status or with `todo`.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.runId
 * @param {string} [args.repo]
 * @param {string} [args.packageName]
 * @param {string} [args.classification] - pending, auto or manual
 * @param {string} [args.risk] - LOW, MEDIUM or HIGH
 * @param {string} [args.status] - pending, todo, inprogress, done or failed
 * @param {boolean} [args.emptyWhenRunMissing=false] - Give no rows, not an error, when the run folder is missing
 * @returns {object[]}
 * @throws {TimError} USAGE for a missing run id or a filter value outside its list; NOT_FOUND for a missing run folder
 */
export const listPackages = ({
  workspaceRoot,
  runId,
  repo,
  packageName,
  classification,
  risk,
  status,
  emptyWhenRunMissing = false
}) => {
  requireRunId(runId, LIST_USAGE)
  const folder = runFolder(workspaceRoot, runId)
  if (!isFolder(folder)) {
    if (emptyWhenRunMissing) return []
    throw new TimError('NOT_FOUND', `Run dir not found: ${folder}`)
  }
  const files = packagesFilesOfRun(folder, repo)
  if (files.length === 0) return []
  requireOneOf('classification', classification, CLASSIFICATIONS)
  requireOneOf('status', status, STATUSES)
  requireOneOf('risk', risk, RISKS)
  return packageRowsOf(files).filter(
    matchesFilters({ classification, status, risk, packageName })
  )
}

const TSV_ESCAPES = { '\\': '\\\\', '\t': '\\t', '\n': '\\n', '\r': '\\r' }

const tsvField = (value) => {
  if (isUnset(value)) return ''
  if (typeof value === 'string') {
    return value.replace(/[\\\t\n\r]/g, (character) => TSV_ESCAPES[character])
  }
  return String(value)
}

const tsvColumnsOf = (row) => [
  row.repo,
  row.package,
  row.current,
  row.target,
  row.upgrade_type,
  row.dependency_type,
  alternative(row.classification, 'pending'),
  alternative(row.risk, ''),
  alternative(row.implementation_status, 'pending'),
  alternative(row.commit_sha, ''),
  alternative(row.failure_reason, '')
]

/**
 * Rows as `@tsv` lines: repo, package, current, target, upgrade type,
 * dependency type, classification, risk, status, commit and failure reason.
 *
 * @param {object[]} rows - From {@link listPackages}
 * @returns {string | null} null when there are no rows
 */
export const renderPackagesTsv = (rows) =>
  rows.length === 0
    ? null
    : rows.map((row) => tsvColumnsOf(row).map(tsvField).join('\t')).join('\n')

const TYPE_ORDER = ['null', 'boolean', 'number', 'string']

const typeRank = (value) =>
  TYPE_ORDER.indexOf(value === null ? 'null' : typeof value)

const compareKeys = (left, right) => {
  const rankGap = typeRank(left) - typeRank(right)
  if (rankGap !== 0) return rankGap
  if (left === right) return 0
  return left < right ? -1 : 1
}

const countsByKey = (rows, keyOf) => {
  const counts = new Map()
  rows.forEach((row) => {
    const key = keyOf(row)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })
  return [...counts.entries()]
    .sort(([left], [right]) => compareKeys(left, right))
    .map(([key, count]) => ({ key, count }))
}

const countWhere = (rows, matches) => rows.filter(matches).length

const repoSummary = (repo, rows) => ({
  repo,
  total: rows.length,
  pending: countWhere(rows, (row) => isUnset(row.classification)),
  auto: countWhere(rows, (row) => row.classification === 'auto'),
  manual: countWhere(rows, (row) => row.classification === 'manual'),
  done: countWhere(rows, (row) => row.implementation_status === 'done'),
  failed: countWhere(rows, (row) => row.implementation_status === 'failed')
})

const repoSummaries = (rows) => {
  const byRepo = new Map()
  rows.forEach((row) =>
    byRepo.set(row.repo, [...(byRepo.get(row.repo) ?? []), row])
  )
  return [...byRepo.entries()]
    .sort(([left], [right]) => compareKeys(left, right))
    .map(([repo, repoRows]) => repoSummary(repo, repoRows))
}

const summaryOf = (rows) => ({
  total: rows.length,
  by_classification: countsByKey(rows, (row) =>
    alternative(row.classification, 'pending')
  ),
  by_status: countsByKey(rows, (row) =>
    alternative(row.implementation_status, 'pending')
  ),
  by_risk: countsByKey(
    rows.filter((row) => row.classification === 'manual'),
    (row) => alternative(row.risk, 'UNKNOWN')
  ),
  by_repo: repoSummaries(rows)
})

const emptySummary = () => ({
  total: 0,
  by_classification: [],
  by_status: [],
  by_risk: []
})

export const COUNTS_USAGE =
  'Usage: tim npm packages counts --run-id TICKET [--repo REPO] [--json]'

/**
 * A run's package counts by classification, by status, by risk for the
 * manual ones and by repo. With no packages file, or with a missing run
 * folder when `emptyWhenRunMissing` is set, the summary has no `by_repo`
 * and `found` is false.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.runId
 * @param {string} [args.repo]
 * @param {boolean} [args.emptyWhenRunMissing=false]
 * @returns {{found: boolean, summary: object}}
 * @throws {TimError} USAGE for a missing run id; NOT_FOUND for a missing run folder
 */
export const countPackages = ({
  workspaceRoot,
  runId,
  repo,
  emptyWhenRunMissing = false
}) => {
  requireRunId(runId, COUNTS_USAGE)
  const folder = runFolder(workspaceRoot, runId)
  if (!isFolder(folder)) {
    if (emptyWhenRunMissing) {
      return { found: false, summary: emptySummary() }
    }
    throw new TimError('NOT_FOUND', `Run dir not found: ${folder}`)
  }
  const files = packagesFilesOfRun(folder, repo)
  if (files.length === 0) {
    return { found: false, summary: emptySummary() }
  }
  return { found: true, summary: summaryOf(packageRowsOf(files)) }
}

/**
 * @param {string} runId
 * @param {string} [repo]
 * @returns {string} The run id, and the repo when one is named
 */
export const runLabel = (runId, repo) =>
  repo ? `${runId} (repo: ${repo})` : runId

const countLines = (counts) =>
  counts.map(({ key, count }) => `    ${count}  ${key}`)

const repoLine = ({ repo, total, pending, auto, manual, done, failed }) =>
  `    ${repo ?? 'null'}: total=${total}  pending=${pending}  auto=${auto}  manual=${manual}  done=${done}  failed=${failed}`

/**
 * @param {ReturnType<typeof countPackages>} counts
 * @param {{runId: string, repo?: string}} run
 * @returns {string}
 */
export const renderCountsText = ({ found, summary }, { runId, repo }) => {
  if (!found) {
    return `No packages.*.json files found for ${runLabel(runId, repo)}`
  }
  const riskLines =
    summary.by_risk.length === 0 ? ['    (none)'] : countLines(summary.by_risk)
  return [
    `NPM upgrade counts for ${runLabel(runId, repo)}:`,
    '',
    `  Total packages: ${summary.total}`,
    '',
    '  Classification:',
    ...countLines(summary.by_classification),
    '',
    '  Implementation status:',
    ...countLines(summary.by_status),
    '',
    '  Manual upgrades by risk:',
    ...riskLines,
    '',
    '  By repo:',
    ...summary.by_repo.map(repoLine)
  ].join('\n')
}
