import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../errors.js'
import { writeJsonAtomic } from '../review/store.js'
import { alternative, listPackages, runLabel } from './queries.js'
import {
  fragmentFileName,
  fragmentsFolder,
  isFolder,
  listsPackage,
  packagesPath,
  readJson,
  readPackagesFile,
  requireOneOf,
  requireOptions,
  requireRunFolder,
  runFolder,
  utcStamp
} from './state.js'

const emptyAsNull = (value) => (value === '' ? null : value)

const valueWhenGiven = (value) =>
  value === undefined ? null : emptyAsNull(value)

const statusFields = (status, { commitSha, failureReason }, now) => {
  if (status === 'done') {
    return {
      completed_at: utcStamp(now),
      commit_sha: valueWhenGiven(commitSha),
      failure_reason: null
    }
  }
  if (status === 'failed') {
    return {
      completed_at: utcStamp(now),
      commit_sha: null,
      failure_reason: valueWhenGiven(failureReason)
    }
  }
  return { completed_at: null, commit_sha: null, failure_reason: null }
}

export const SET_STATUS_USAGE =
  'Usage: tim npm packages set-status --run-id TICKET --repo REPO --package PKG --status todo|inprogress|done|failed [--failure-reason "..."] [--commit-sha SHA]'

/**
 * Sets one package's implementation status in its repo's packages file.
 * `done` and `failed` stamp `completed_at`; `done` keeps only the commit,
 * `failed` only the reason; `todo` and `inprogress` clear all three.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.runId
 * @param {string} args.repo
 * @param {string} args.packageName
 * @param {string} args.status - todo, inprogress, done or failed
 * @param {string} [args.commitSha] - Kept on done; an empty one is null
 * @param {string} [args.failureReason] - Kept on failed; an empty one is null
 * @param {Date} [args.now]
 * @returns {{message: string, path: string}}
 * @throws {TimError} USAGE for a missing option or an unknown status; NOT_FOUND for a missing file or package
 */
export const setPackageStatus = ({
  workspaceRoot,
  runId,
  repo,
  packageName,
  status,
  commitSha,
  failureReason,
  now = new Date()
}) => {
  requireOptions(
    { 'run-id': runId, repo, package: packageName, status },
    SET_STATUS_USAGE
  )
  requireOneOf('status', status, ['todo', 'inprogress', 'done', 'failed'])
  const path = packagesPath(runFolder(workspaceRoot, runId), repo)
  const packagesFile = readPackagesFile(path)
  if (!listsPackage(packagesFile, packageName)) {
    throw new TimError(
      'NOT_FOUND',
      `Package not found in ${path}: ${packageName}`
    )
  }
  const fields = {
    implementation_status: status,
    ...statusFields(status, { commitSha, failureReason }, now)
  }
  writeJsonAtomic(path, {
    ...packagesFile,
    packages: packagesFile.packages.map((row) =>
      row.package === packageName ? { ...row, ...fields } : row
    )
  })
  return {
    message: `Status ${packageName} in ${repo}: ${status}`,
    path
  }
}

const filesAffectedList = (filesAffected) =>
  filesAffected === ''
    ? []
    : filesAffected
        .split(',')
        .map((file) => file.replace(/^[\t\n\v\f\r ]+|[\t\n\v\f\r ]+$/g, ''))

const optionalFragmentFields = ({
  filesAffected,
  changesRequired,
  changelogUrl,
  migrationGuideUrl,
  demotedFromAuto
}) => ({
  ...(filesAffected !== undefined && {
    files_affected: filesAffectedList(filesAffected)
  }),
  ...(changesRequired !== undefined && {
    changes_required_summary: emptyAsNull(changesRequired)
  }),
  ...(changelogUrl !== undefined && {
    changelog_url: emptyAsNull(changelogUrl)
  }),
  ...(migrationGuideUrl !== undefined && {
    migration_guide_url: emptyAsNull(migrationGuideUrl)
  }),
  ...(demotedFromAuto !== undefined && {
    demoted_from_auto: demotedFromAuto === 'true'
  })
})

export const SET_CLASSIFICATION_USAGE =
  'Usage: tim npm packages set-classification --run-id TICKET --repo REPO --package PKG --classification auto|manual --risk LOW|MEDIUM|HIGH --safe-for-automation true|false --rationale "..." [--files-affected "p1,p2,..."] [--changes-required "..."] [--changelog-url URL] [--migration-guide-url URL] [--demoted-from-auto true|false]'

/**
 * Writes one package's classification to its own fragment file under the
 * repo's `classifications/` folder, named for the package with each `/` as
 * `__`. Planners running at once each write their own file; `aggregate`
 * folds the fragments into the packages file. An optional value given
 * empty is written as null, or as `[]` for the files affected.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.runId
 * @param {string} args.repo
 * @param {string} args.packageName
 * @param {string} args.classification - auto or manual
 * @param {string} args.risk - LOW, MEDIUM or HIGH
 * @param {string} args.safeForAutomation - true or false
 * @param {string} args.rationale
 * @param {string} [args.filesAffected] - Comma-separated paths
 * @param {string} [args.changesRequired]
 * @param {string} [args.changelogUrl]
 * @param {string} [args.migrationGuideUrl]
 * @param {string} [args.demotedFromAuto] - true sets it; any other value clears it
 * @param {Date} [args.now]
 * @returns {{message: string, path: string}}
 * @throws {TimError} USAGE for a missing option or a value outside its list; NOT_FOUND for a missing file or package
 */
export const setPackageClassification = ({
  workspaceRoot,
  runId,
  repo,
  packageName,
  classification,
  risk,
  safeForAutomation,
  rationale,
  now = new Date(),
  ...optional
}) => {
  requireOptions(
    {
      'run-id': runId,
      repo,
      package: packageName,
      classification,
      risk,
      'safe-for-automation': safeForAutomation,
      rationale
    },
    SET_CLASSIFICATION_USAGE
  )
  requireOneOf(
    'classification',
    classification,
    ['auto', 'manual'],
    ' (auto|manual)'
  )
  requireOneOf('risk', risk, ['LOW', 'MEDIUM', 'HIGH'], ' (LOW|MEDIUM|HIGH)')
  requireOneOf(
    'safe-for-automation',
    safeForAutomation,
    ['true', 'false'],
    ' (true|false)'
  )
  const folder = runFolder(workspaceRoot, runId)
  const canonicalPath = packagesPath(folder, repo)
  if (!listsPackage(readPackagesFile(canonicalPath), packageName)) {
    throw new TimError(
      'NOT_FOUND',
      `Package not in seed manifest (${canonicalPath}): ${packageName}`
    )
  }
  const path = join(
    fragmentsFolder(folder, repo),
    fragmentFileName(packageName)
  )
  writeJsonAtomic(path, {
    package: packageName,
    classification,
    risk,
    safe_for_automation: safeForAutomation === 'true',
    rationale,
    classified_at: utcStamp(now),
    ...optionalFragmentFields(optional)
  })
  return {
    message: `Classified ${packageName} in ${repo}: ${classification} (risk=${risk}) → ${path}`,
    path
  }
}

const OPTIONAL_MERGED_FIELDS = [
  'files_affected',
  'changes_required_summary',
  'changelog_url',
  'migration_guide_url',
  'demoted_from_auto'
]

const mergeFragment = (row, fragment) => ({
  ...row,
  classification: alternative(fragment.classification, row.classification),
  risk: alternative(fragment.risk, row.risk),
  safe_for_automation: Object.hasOwn(fragment, 'safe_for_automation')
    ? fragment.safe_for_automation
    : (row.safe_for_automation ?? null),
  rationale: alternative(fragment.rationale, row.rationale),
  ...Object.fromEntries(
    OPTIONAL_MERGED_FIELDS.filter((field) =>
      Object.hasOwn(fragment, field)
    ).map((field) => [field, fragment[field]])
  )
})

const withFragment = (fragments) => (row) => {
  const fragment = fragments.find(({ package: name }) => name === row.package)
  return fragment ? mergeFragment(row, fragment) : row
}

const fragmentPathsIn = (folder) =>
  isFolder(folder)
    ? readdirSync(folder)
        .filter((name) => name.endsWith('.json'))
        .sort()
        .map((name) => join(folder, name))
    : []

const repoFolderNames = (folder) =>
  readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

const foldRepoFragments = (folder, repo) => {
  const target = packagesPath(folder, repo)
  if (!existsSync(target)) return []
  const fragmentPaths = fragmentPathsIn(fragmentsFolder(folder, repo))
  if (fragmentPaths.length === 0) return []
  const packagesFile = readJson(target)
  const fragments = fragmentPaths.map(readJson)
  writeJsonAtomic(target, {
    ...packagesFile,
    packages: (packagesFile.packages ?? []).map(withFragment(fragments))
  })
  return [{ repo, target, count: fragmentPaths.length }]
}

export const AGGREGATE_USAGE =
  'Usage: tim npm packages aggregate --run-id TICKET [--repo REPO]'

/**
 * Folds every classification fragment of a run, or of one repo, into its
 * repo's packages file. A fragment's fields replace the row's; a row with
 * no fragment is left as it is, and a repo with no packages file or no
 * fragments is skipped. Run it once the planners have finished.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.runId
 * @param {string} [args.repo]
 * @returns {{merged: {repo: string, target: string, count: number}[], total: number}}
 * @throws {TimError} USAGE for a missing run id; NOT_FOUND for a missing run folder
 */
export const aggregateClassifications = ({ workspaceRoot, runId, repo }) => {
  if (!runId) throw new TimError('USAGE', AGGREGATE_USAGE)
  const folder = runFolder(workspaceRoot, runId)
  requireRunFolder(folder)
  const repos = repo ? [repo] : repoFolderNames(folder)
  const merged = repos.flatMap((name) => foldRepoFragments(folder, name))
  return {
    merged,
    total: merged.reduce((sum, { count }) => sum + count, 0)
  }
}

/**
 * @param {ReturnType<typeof aggregateClassifications>} aggregate
 * @returns {string}
 */
export const renderAggregateText = ({ merged, total }) =>
  [
    ...merged.map(
      ({ target, count }) =>
        `Aggregated ${count} classification(s) into ${target}`
    ),
    `Total fragments merged: ${total}`
  ].join('\n')

export const VERIFY_USAGE =
  'Usage: tim npm packages verify --run-id TICKET [--repo REPO] [--json]'

const foldFragmentsForVerify = async (args, warn) => {
  try {
    await warn(renderAggregateText(aggregateClassifications(args)))
  } catch (error) {
    await warn(error.message)
  }
}

/**
 * The classification gate: folds the run's fragments into its packages
 * files, writing what that did to `warn`, then lists every package still
 * not classified. A missing run folder has none.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.runId
 * @param {string} [args.repo]
 * @param {(text: string) => Promise<void>} args.warn
 * @returns {Promise<{pending_count: number, pending: object[]}>}
 * @throws {TimError} USAGE for a missing run id
 */
export const verifyClassificationCoverage = async ({
  workspaceRoot,
  runId,
  repo,
  warn
}) => {
  if (!runId) throw new TimError('USAGE', VERIFY_USAGE)
  await foldFragmentsForVerify({ workspaceRoot, runId, repo }, warn)
  const pending = listPackages({
    workspaceRoot,
    runId,
    repo,
    classification: 'pending',
    emptyWhenRunMissing: true
  })
  return { pending_count: pending.length, pending }
}

/**
 * @param {Awaited<ReturnType<typeof verifyClassificationCoverage>>} coverage
 * @param {{runId: string, repo?: string}} run
 * @returns {string | null} The all-classified line, or null when some are pending
 */
export const renderVerifyText = (
  { pending_count: pendingCount },
  { runId, repo }
) =>
  pendingCount === 0
    ? `✓ All packages classified for ${runLabel(runId, repo)}`
    : null

const pendingLine = (row) =>
  `  ${row.repo}  ${row.package}  ${row.current ?? 'null'} → ${row.target ?? 'null'}  (${row.upgrade_type ?? 'null'})`

/**
 * @param {Awaited<ReturnType<typeof verifyClassificationCoverage>>} coverage
 * @returns {string} Each pending package under a count line, or nothing
 */
export const renderVerifyPendingText = ({
  pending,
  pending_count: pendingCount
}) =>
  pendingCount === 0
    ? ''
    : [
        `✗ ${pendingCount} package(s) still pending classification:`,
        ...pending.map(pendingLine)
      ].join('\n')
