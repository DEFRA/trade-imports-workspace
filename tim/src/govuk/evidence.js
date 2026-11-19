import {
  recordEvidenceRow,
  recountEvidenceRows
} from '../deps/evidence/record.js'
import { evidenceRowsVerdict, hitsPhrase } from '../deps/evidence/row.js'
import { evidenceVerdictText } from '../deps/evidence/render.js'
import { loadDependencySets } from '../deps/dependency-sets.js'
import { mergePolicyFor } from '../deps/policy.js'
import { repoPath } from '../constants/repos.js'
import { TimError } from '../errors.js'
import { findVersion, requireOptions, versionEvidence } from './state.js'
import { writeVersion } from './transitions.js'

const PACKAGE = 'govuk-frontend'

const versionIds = ({ runId, repo, version }) => ({
  'run-id': runId,
  repo,
  'govuk-version': version
})

const patternNote = ({ pattern, hitsBefore }) =>
  pattern
    ? `the pattern "${pattern}" has ${hitsPhrase(hitsBefore)}`
    : 'no pattern'

/**
 * Adds an evidence row for one changelog item to the end of a version's
 * evidence, with the pattern's hits in the repo now as `hitsBefore`.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.runId]
 * @param {string} [args.repo]
 * @param {string} [args.version]
 * @param {string} [args.item]
 * @param {string} [args.outcome] - applied, not-applicable or needs-a-person
 * @param {string} [args.pattern] - A fixed string; required when applied
 * @param {string} [args.reason]
 * @returns {Promise<{message: string, row: object, entry: object}>}
 * @throws {TimError} USAGE for a missing option, or an outcome that does not fit the pattern's hits or lacks a reason; NOT_FOUND when the state file or the version is missing; PARSE when the version's evidence is not valid
 */
export const addVersionEvidence = async ({
  workspaceRoot,
  runId,
  repo,
  version,
  item,
  outcome,
  pattern,
  reason = ''
}) => {
  requireOptions({ ...versionIds({ runId, repo, version }), item, outcome })
  const found = findVersion({ workspaceRoot, runId, repo, version })
  const rows = versionEvidence(found)
  const row = await recordEvidenceRow({
    repoPath: repoPath(workspaceRoot, repo),
    item,
    outcome,
    pattern,
    reason
  })
  const entry = writeVersion(found, version, (current) => ({
    ...current,
    evidence: [...rows, row]
  }))
  return {
    message: `Added evidence for ${repo}@${version}: ${outcome}, ${patternNote(row)}`,
    row,
    entry
  }
}

const checkMessage = ({ repo, version }, verdict) =>
  evidenceVerdictText(verdict, `for ${repo}@${version}`)

/**
 * Counts every evidence row's pattern in the repo again, records it as the
 * row's `hitsAfter` and says whether every row is now clean. No rows is not
 * clean.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.runId]
 * @param {string} [args.repo]
 * @param {string} [args.version]
 * @returns {Promise<{message: string, allClean: boolean, rowCount: number, notCleanCount: number, rows: object[]}>}
 * @throws {TimError} USAGE for a missing option, NOT_FOUND when the state file or the version is missing, PARSE when the version's evidence is not valid
 */
export const checkVersionEvidence = async ({
  workspaceRoot,
  runId,
  repo,
  version
}) => {
  requireOptions(versionIds({ runId, repo, version }))
  const found = findVersion({ workspaceRoot, runId, repo, version })
  const recounted = await recountEvidenceRows(
    repoPath(workspaceRoot, repo),
    versionEvidence(found)
  )
  writeVersion(found, version, (current) => ({
    ...current,
    evidence: recounted
  }))
  const verdict = evidenceRowsVerdict(recounted)
  return { message: checkMessage({ repo, version }, verdict), ...verdict }
}

const refuseHeldVersion = ({ repo, version }, { policy, reason }) => {
  if (policy !== 'held') return
  throw new TimError(
    'REFUSED',
    `Can't apply ${repo}@${version} unattended: ${reason}`
  )
}

/**
 * Refuses a version an unattended apply may not make: one a hold on the
 * repo covers, or one whose move from the repo's current version is
 * `changelog-driven` and whose evidence, counted again now, is not all
 * clean. Writes nothing.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.repo
 * @param {string} args.version
 * @param {{path: string, state: {current_version: string}, entry: object}} args.found - From `findVersion`
 * @returns {Promise<void>}
 * @throws {TimError} REFUSED when the version is held or the evidence is not all clean; NOT_FOUND or PARSE when config/dependency-sets.json is missing or not valid; PARSE when the version's evidence is not valid
 */
export const refuseUncleanEvidence = async ({
  workspaceRoot,
  repo,
  version,
  found
}) => {
  const from = found.state.current_version
  const mergePolicy = mergePolicyFor({
    dependencySets: loadDependencySets(workspaceRoot),
    packageName: PACKAGE,
    from,
    to: version,
    repo
  })
  refuseHeldVersion({ repo, version }, mergePolicy)
  if (mergePolicy.policy !== 'changelog-driven') return
  const recounted = await recountEvidenceRows(
    repoPath(workspaceRoot, repo),
    versionEvidence(found)
  )
  const verdict = evidenceRowsVerdict(recounted)
  if (verdict.allClean) return
  throw new TimError(
    'REFUSED',
    [
      `Can't apply ${repo}@${version} unattended: its evidence is not all clean, and govuk-frontend ${from} to ${version} is changelog-driven.`,
      checkMessage({ repo, version }, verdict)
    ].join('\n')
  )
}
