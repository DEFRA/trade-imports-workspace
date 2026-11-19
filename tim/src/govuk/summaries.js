import { TimError } from '../errors.js'
import {
  compareSemverKeys,
  isDirectory,
  isUnset,
  rawText,
  readState,
  runFolder,
  semverKey,
  stateFilesOfRun
} from './state.js'

const isWaitingToApply = (entry) =>
  isUnset(entry.implementation_status) &&
  (entry.classification ?? 'unplanned') !== 'noop'

const summaryRow = (repo, entry) => ({
  repo: repo ?? null,
  version: entry.version ?? null,
  classification: entry.classification ?? 'unplanned',
  change_count: (entry.changes ?? []).length,
  summary: entry.summary ?? ''
})

const compareRepoNames = (left, right) => {
  if (left === right) return 0
  return left < right ? -1 : 1
}

const byRepoThenVersion = (left, right) =>
  compareRepoNames(left.repo, right.repo) ||
  compareSemverKeys(semverKey(left.version), semverKey(right.version))

/**
 * One row for each version still to apply that is not a noop, across a
 * run's repos, sorted by repo and then by version. A version nobody has
 * classified shows as `unplanned`.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.runId]
 * @param {string} [args.repo] - Only this repo
 * @returns {{repo: string, version: string, classification: string, change_count: number, summary: string}[]} Empty when the run holds no state files
 * @throws {TimError} USAGE for a missing run id, NOT_FOUND when the run folder is missing
 */
export const listPlanSummaries = ({ workspaceRoot, runId, repo }) => {
  if (!runId) throw new TimError('USAGE', '--run-id required')
  const folder = runFolder(workspaceRoot, runId)
  if (!isDirectory(folder)) {
    throw new TimError('NOT_FOUND', `Workspace not found: ${folder}`)
  }
  return stateFilesOfRun({ folder, repo })
    .map(readState)
    .flatMap((state) =>
      (state.versions ?? [])
        .filter(isWaitingToApply)
        .map((entry) => summaryRow(state.repo, entry))
    )
    .sort(byRepoThenVersion)
}

const TSV_ESCAPES = { '\\': '\\\\', '\t': '\\t', '\n': '\\n', '\r': '\\r' }

const tsvCell = (value) =>
  (isUnset(value) ? '' : rawText(value)).replace(
    /[\\\t\n\r]/g,
    (character) => TSV_ESCAPES[character]
  )

const summaryLine = (row) =>
  [row.repo, row.version, row.classification, row.change_count, row.summary]
    .map(tsvCell)
    .join('\t')

/**
 * @param {ReturnType<typeof listPlanSummaries>} rows
 * @returns {string | null} Tab-separated lines, or null when there are no rows
 */
export const renderSummariesText = (rows) =>
  rows.length === 0 ? null : rows.map(summaryLine).join('\n')
