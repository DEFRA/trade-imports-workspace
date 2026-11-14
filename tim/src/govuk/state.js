import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const STATE_FILE_NAME = /^versions\..*\.json$/

/**
 * The folder a govuk-frontend upgrade run keeps its state in.
 *
 * @param {string} workspaceRoot - From `resolveWorkspaceRoot`
 * @param {string} runId - The run's Jira ticket, such as EUDPA-264
 * @returns {string}
 */
export const runFolder = (workspaceRoot, runId) =>
  join(workspaceRoot, 'workareas', 'govuk-upgrades', runId)

/**
 * @param {string} workspaceRoot
 * @param {string} runId
 * @param {string} repo
 * @returns {string} The repo's `versions.<repo>.json`
 */
export const versionsPath = (workspaceRoot, runId, repo) =>
  join(runFolder(workspaceRoot, runId), repo, `versions.${repo}.json`)

/**
 * @param {string} workspaceRoot
 * @param {string} runId
 * @param {string} repo
 * @param {string} version
 * @returns {string} The pre-baked changelog section for one version
 */
export const changelogPath = (workspaceRoot, runId, repo, version) =>
  join(
    runFolder(workspaceRoot, runId),
    repo,
    `version__${version}.changelog.md`
  )

export const isDirectory = (path) => {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

const stateFilesBelow = (folder, depthLeft) =>
  readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name)
    const matches = STATE_FILE_NAME.test(entry.name) ? [path] : []
    const below =
      entry.isDirectory() && depthLeft > 1
        ? stateFilesBelow(path, depthLeft - 1)
        : []
    return [...matches, ...below]
  })

/**
 * The state files a run holds, in path order: the one `--repo` names when
 * it is there, otherwise every `versions.*.json` up to three folders down.
 *
 * @param {object} args
 * @param {string} args.folder - From {@link runFolder}
 * @param {string} [args.repo]
 * @returns {string[]} Empty when none is there
 */
export const stateFilesOfRun = ({ folder, repo }) => {
  if (repo) {
    const path = join(folder, repo, `versions.${repo}.json`)
    return existsSync(path) ? [path] : []
  }
  const maxDepth = 3
  return stateFilesBelow(folder, maxDepth).sort()
}

export const readState = (path) => JSON.parse(readFileSync(path, 'utf8'))

/**
 * A value as `jq -r` prints it: a string bare, null as `null`, anything
 * else as JSON.
 *
 * @param {unknown} value
 * @returns {string}
 */
export const rawText = (value) =>
  typeof value === 'string' ? value : (JSON.stringify(value) ?? 'null')

export const isUnset = (value) => value === null || value === undefined

const VERSION_FILTERS = {
  unplanned: (entry) => isUnset(entry.classification),
  todo: (entry) =>
    entry.classification === 'todo' && isUnset(entry.implementation_status),
  noop: (entry) => entry.classification === 'noop',
  done: (entry) => entry.implementation_status === 'done',
  failed: (entry) => entry.implementation_status === 'failed',
  pending: (entry) => isUnset(entry.implementation_status)
}

export const FILTER_NAMES = Object.keys(VERSION_FILTERS)

/**
 * @param {string} filter - One of {@link FILTER_NAMES}
 * @returns {(entry: object) => boolean}
 */
export const versionFilter = (filter) => VERSION_FILTERS[filter]

/**
 * How many versions of a repo each filter except `pending` matches.
 *
 * @param {object[]} versions
 * @returns {{unplanned: number, todo: number, noop: number, done: number, failed: number}}
 */
export const versionCounts = (versions) =>
  Object.fromEntries(
    ['unplanned', 'todo', 'noop', 'done', 'failed'].map((filter) => [
      filter,
      versions.filter(VERSION_FILTERS[filter]).length
    ])
  )

const NUMBER_TEXT = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/

const numberOrZero = (part) => (NUMBER_TEXT.test(part) ? Number(part) : 0)

/**
 * The first three dot-separated parts of a version as numbers, with any
 * part that is not a number as 0 and missing parts as 0.
 *
 * @param {string} version
 * @returns {number[]}
 */
export const semverKey = (version) =>
  [...String(version).split('.').map(numberOrZero), 0, 0, 0].slice(0, 3)

/**
 * @param {number[]} left - From {@link semverKey}
 * @param {number[]} right
 * @returns {number} Below 0 when left sorts first
 */
export const compareSemverKeys = (left, right) =>
  left.map((part, index) => part - right[index]).find((gap) => gap !== 0) ?? 0

/**
 * @param {object[]} versions
 * @returns {object[]} A copy in ascending version order, ties kept in place
 */
export const sortBySemver = (versions) =>
  versions.toSorted((left, right) =>
    compareSemverKeys(semverKey(left.version), semverKey(right.version))
  )
