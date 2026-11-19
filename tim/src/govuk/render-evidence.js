import { existsSync } from 'node:fs'
import { renderEvidenceTable } from '../deps/evidence/render.js'
import { TimError } from '../errors.js'
import {
  changelogPath,
  isUnset,
  readState,
  requireOptions,
  sortBySemver,
  versionEvidence,
  versionsPath
} from './state.js'

const needsAPerson = (item, reason) => ({
  item,
  pattern: null,
  hitsBefore: null,
  hitsAfter: null,
  outcome: 'needs-a-person',
  reason
})

const statusRows = (entry, { hasChangelog, rowCount }) => {
  const planned = !isUnset(entry.classification)
  return [
    hasChangelog
      ? null
      : needsAPerson(
          'No changelog section',
          'Read the release notes and record each item.'
        ),
    planned
      ? null
      : needsAPerson('Version not planned', 'Nobody has classified it.'),
    entry.implementation_status === 'failed'
      ? needsAPerson('Apply failed', entry.failure_reason ?? '')
      : null,
    planned && isUnset(entry.implementation_status)
      ? needsAPerson('Not applied', 'tim govuk apply has not run for it.')
      : null,
    planned && rowCount === 0
      ? needsAPerson(
          'No evidence recorded',
          'Every changelog item needs a row.'
        )
      : null
  ].filter((row) => row !== null)
}

const withVersion = (version) => (row) => ({
  ...row,
  item: `v${version}: ${row.item}`
})

const rowsOfVersion = (found, hasChangelog) => {
  const recorded = versionEvidence(found)
  return [
    ...statusRows(found.entry, { hasChangelog, rowCount: recorded.length }),
    ...recorded
  ].map(withVersion(found.entry.version))
}

const loadRepoState = (workspaceRoot, runId, repo) => {
  const path = versionsPath(workspaceRoot, runId, repo)
  if (!existsSync(path)) {
    throw new TimError('NOT_FOUND', `Versions file not found: ${path}`)
  }
  return { path, state: readState(path) }
}

/**
 * The changelog evidence of every version of one repo in a run, as the
 * markdown for its pull request description: a heading naming the repo and
 * the version range, then one table across the versions in version order.
 * A version also gets a needs-a-person row when it has no changelog
 * section, is not planned, failed to apply, is planned but not applied, or
 * is planned with no evidence. Reads the counts as recorded; it counts
 * nothing.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.runId]
 * @param {string} [args.repo]
 * @returns {{repo: string, current: string, target: string, markdown: string, allClean: boolean, rowCount: number, notCleanCount: number}}
 * @throws {TimError} USAGE for a missing option, NOT_FOUND when the state file is missing, PARSE when a version's evidence is not valid
 */
export const renderRunEvidence = ({ workspaceRoot, runId, repo }) => {
  requireOptions({ 'run-id': runId, repo })
  const { path, state } = loadRepoState(workspaceRoot, runId, repo)
  const rows = sortBySemver(state.versions ?? []).flatMap((entry) =>
    rowsOfVersion(
      { path, entry },
      existsSync(changelogPath(workspaceRoot, runId, repo, entry.version))
    )
  )
  const table = renderEvidenceTable(rows)
  const heading = `## Changelog evidence\n\n### \`${repo}\`: govuk-frontend ${state.current_version} to ${state.target_version}\n\n`
  return {
    repo,
    current: state.current_version,
    target: state.target_version,
    markdown: `${heading}${table.markdown}`,
    allClean: table.allClean,
    rowCount: table.rowCount,
    notCleanCount: table.notCleanCount
  }
}
