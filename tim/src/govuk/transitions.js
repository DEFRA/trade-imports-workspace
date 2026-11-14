import { writeJsonAtomic } from '../backlog/io.js'
import { TimError } from '../errors.js'
import { findVersion, requireOptions } from './state.js'

const CLASSIFICATIONS = ['todo', 'noop']

/**
 * The time now as the state file stamps it: UTC to the second, such as
 * `2026-11-14T03:00:00Z`.
 *
 * @param {Date} [now]
 * @returns {string}
 */
export const stateTimestamp = (now = new Date()) =>
  `${now.toISOString().slice(0, 19)}Z`

const writeVersion = ({ path, state }, version, updateEntry) => {
  const versions = state.versions.map((entry) =>
    entry.version === version ? updateEntry(entry) : entry
  )
  writeJsonAtomic(path, { ...state, versions })
  return versions.find((entry) => entry.version === version)
}

/**
 * Sets one version's classification and stamps `classified_at`. A noop
 * loses its changes. With `summary` given, an empty one sets it to null;
 * without, the summary stays as it is.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.runId]
 * @param {string} [args.repo]
 * @param {string} [args.version]
 * @param {string} [args.classification] - todo or noop
 * @param {string} [args.summary]
 * @param {Date} [args.now]
 * @returns {{message: string, entry: object}}
 * @throws {TimError} USAGE for a missing option or another classification, NOT_FOUND when the state file or the version is missing
 */
export const classifyVersion = ({
  workspaceRoot,
  runId,
  repo,
  version,
  classification,
  summary,
  now
}) => {
  requireOptions({
    'run-id': runId,
    repo,
    'govuk-version': version,
    classification
  })
  if (!CLASSIFICATIONS.includes(classification)) {
    throw new TimError(
      'USAGE',
      `Invalid --classification: ${classification} (must be todo|noop)`
    )
  }
  const found = findVersion({
    workspaceRoot,
    runId,
    repo,
    version,
    missingFileHint: ' — run discover-versions.sh first'
  })
  const entry = writeVersion(found, version, (current) => ({
    ...current,
    classification,
    classified_at: stateTimestamp(now),
    ...(summary === undefined ? {} : { summary: summary || null }),
    ...(classification === 'noop' ? { changes: [] } : {})
  }))
  return {
    message: `Classified ${repo}@${version} as ${classification}`,
    entry
  }
}

/**
 * Adds a `{file, why, change}` entry to the end of one version's changes.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.runId]
 * @param {string} [args.repo]
 * @param {string} [args.version]
 * @param {string} [args.file]
 * @param {string} [args.why]
 * @param {string} [args.change]
 * @returns {{message: string, entry: object}}
 * @throws {TimError} USAGE for a missing option, NOT_FOUND when the state file or the version is missing
 */
export const addVersionChange = ({
  workspaceRoot,
  runId,
  repo,
  version,
  file,
  why,
  change
}) => {
  requireOptions({
    'run-id': runId,
    repo,
    'govuk-version': version,
    file,
    why,
    change
  })
  const found = findVersion({ workspaceRoot, runId, repo, version })
  const entry = writeVersion(found, version, (current) => ({
    ...current,
    changes: [...(current.changes ?? []), { file, why, change }]
  }))
  return { message: `Added change for ${repo}@${version}: ${file}`, entry }
}

/**
 * Marks one version done: stamps `implemented_at`, records the commit (null
 * when there is none) and clears any failure reason.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.runId]
 * @param {string} [args.repo]
 * @param {string} [args.version]
 * @param {string} [args.commit] - The commit's SHA; leave out for a noop
 * @param {Date} [args.now]
 * @returns {{message: string, entry: object}}
 * @throws {TimError} USAGE for a missing option, NOT_FOUND when the state file or the version is missing
 */
export const markVersionDone = ({
  workspaceRoot,
  runId,
  repo,
  version,
  commit,
  now
}) => {
  requireOptions({ 'run-id': runId, repo, 'govuk-version': version })
  const found = findVersion({ workspaceRoot, runId, repo, version })
  const entry = writeVersion(found, version, (current) => ({
    ...current,
    implementation_status: 'done',
    implemented_at: stateTimestamp(now),
    commit_sha: commit || null,
    failure_reason: null
  }))
  const commitNote = commit ? ` (commit ${commit})` : ''
  return { message: `Marked ${repo}@${version} as done${commitNote}`, entry }
}

/**
 * Marks one version failed: stamps `implemented_at` and records the reason.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.runId]
 * @param {string} [args.repo]
 * @param {string} [args.version]
 * @param {string} [args.reason]
 * @param {Date} [args.now]
 * @returns {{message: string, entry: object}}
 * @throws {TimError} USAGE for a missing option, NOT_FOUND when the state file or the version is missing
 */
export const markVersionFailed = ({
  workspaceRoot,
  runId,
  repo,
  version,
  reason,
  now
}) => {
  requireOptions({ 'run-id': runId, repo, 'govuk-version': version, reason })
  const found = findVersion({ workspaceRoot, runId, repo, version })
  const entry = writeVersion(found, version, (current) => ({
    ...current,
    implementation_status: 'failed',
    implemented_at: stateTimestamp(now),
    failure_reason: reason
  }))
  return { message: `Marked ${repo}@${version} as failed: ${reason}`, entry }
}
