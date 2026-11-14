import { TimError } from '../errors.js'
import {
  FILTER_NAMES,
  isDirectory,
  rawText,
  readState,
  runFolder,
  sortBySemver,
  stateFilesOfRun,
  versionCounts,
  versionFilter
} from './state.js'

const COUNT_NAMES = ['unplanned', 'todo', 'noop', 'done', 'failed']

const refuse = (code, message) => new TimError(code, `Error: ${message}`)

const checkPlansOptions = ({ runId, filter }) => {
  if (!runId) throw refuse('USAGE', '--run-id TICKET is required')
  if (filter && !FILTER_NAMES.includes(filter)) {
    throw refuse('USAGE', `Invalid --filter: ${filter}`)
  }
}

const repoPlan = (state, { filter, sortSemver }) => {
  const versions = state.versions ?? []
  const matched = filter ? versions.filter(versionFilter(filter)) : versions
  return {
    repo: rawText(state.repo),
    current: rawText(state.current_version),
    target: rawText(state.target_version),
    counts: versionCounts(versions),
    versions: sortSemver ? sortBySemver(matched) : matched
  }
}

const totalCounts = (repos) =>
  Object.fromEntries(
    COUNT_NAMES.map((name) => [
      name,
      repos.reduce((total, { counts }) => total + counts[name], 0)
    ])
  )

/**
 * Every repo's version counts and the versions a filter matches, for one
 * govuk-frontend upgrade run.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.runId]
 * @param {string} [args.repo] - Only this repo
 * @param {string} [args.filter] - One of `FILTER_NAMES`; every version when absent
 * @param {boolean} [args.sortSemver=false] - List versions in ascending version order
 * @returns {{run_id: string, repos: object[], summary: object}}
 * @throws {TimError} USAGE for a missing run id or an unknown filter, NOT_FOUND when the run folder or its state files are missing
 */
export const listPlans = ({
  workspaceRoot,
  runId,
  repo,
  filter,
  sortSemver = false
}) => {
  checkPlansOptions({ runId, filter })
  const folder = runFolder(workspaceRoot, runId)
  if (!isDirectory(folder)) {
    throw refuse(
      'NOT_FOUND',
      `Workspace not found: ${folder}. Run discover-versions.sh first.`
    )
  }
  const files = stateFilesOfRun({ folder, repo })
  if (files.length === 0) {
    throw refuse('NOT_FOUND', `No versions.{repo}.json found under ${folder}`)
  }
  const repos = files.map((path) =>
    repoPlan(readState(path), { filter, sortSemver })
  )
  return { run_id: runId, repos, summary: totalCounts(repos) }
}

const padCount = (count) => String(count).padStart(3)

const repoPlanLines = ({ repo, current, target, counts, versions }, filter) => {
  const versionLines =
    versions.length === 0
      ? []
      : [
          filter ? `  Versions (${filter}):` : '  Versions:',
          ...versions.map(({ version }) => `    ${rawText(version)}`)
        ]
  return [
    '',
    `${repo}  (${current} → ${target})`,
    `  Unplanned: ${padCount(counts.unplanned)}  Todo: ${padCount(counts.todo)}  Noop: ${padCount(counts.noop)}  Done: ${padCount(counts.done)}  Failed: ${padCount(counts.failed)}`,
    ...versionLines
  ]
}

/**
 * @param {ReturnType<typeof listPlans>} plans
 * @param {string} [filter] - The filter the plans were listed with
 * @returns {string}
 */
export const renderPlansText = ({ repos, summary }, filter) =>
  [
    ...repos.flatMap((plan) => repoPlanLines(plan, filter)),
    '',
    '=== Summary ===',
    `  Unplanned:         ${summary.unplanned}`,
    `  Todo (changes):    ${summary.todo}`,
    `  Noop (no changes): ${summary.noop}`,
    `  Done:              ${summary.done}`,
    `  Failed:            ${summary.failed}`
  ].join('\n')
