import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { TimError } from '../errors.js'
import { writeJsonAtomic } from '../review/store.js'
import {
  isFolder,
  packagesPath,
  readJson,
  runFolder,
  utcStamp
} from './state.js'

export const STRATEGIES = ['latest', 'minor', 'patch']

const PRESERVED_FIELDS = [
  'classification',
  'risk',
  'safe_for_automation',
  'rationale',
  'files_affected',
  'changes_required_summary',
  'changelog_url',
  'migration_guide_url',
  'implementation_status',
  'failure_reason',
  'commit_sha',
  'completed_at',
  'demoted_from_auto',
  'context_baked',
  'context_missing'
]

const withoutRangePrefix = (version) => version.replace(/^[\^~>=< ]+/, '')

const versionParts = (version) => withoutRangePrefix(version).split('.')

/**
 * How far an upgrade moves: the first of major, minor and patch whose
 * number differs, with range prefixes such as `^` ignored.
 *
 * @param {string} current - The range package.json holds, such as `^21.3.0`
 * @param {string} target - The range ncu proposes
 * @returns {'major' | 'minor' | 'patch'}
 */
export const upgradeTypeOf = (current, target) => {
  const [currentMajor = '0', currentMinor = '0'] = versionParts(current)
  const [targetMajor = '0', targetMinor = '0'] = versionParts(target)
  if (currentMajor !== targetMajor) return 'major'
  if (currentMinor !== targetMinor) return 'minor'
  return 'patch'
}

const dependencyTypeOf = (packageJson, name) =>
  Object.hasOwn(packageJson.devDependencies ?? {}, name) &&
  !Object.hasOwn(packageJson.dependencies ?? {}, name)
    ? 'devDependencies'
    : 'dependencies'

const freshRow = (packageJson, [name, target]) => {
  const current =
    packageJson.dependencies?.[name] ??
    packageJson.devDependencies?.[name] ??
    target
  return {
    package: name,
    current: withoutRangePrefix(current),
    target: withoutRangePrefix(target),
    upgrade_type: upgradeTypeOf(current, target),
    dependency_type: dependencyTypeOf(packageJson, name),
    ...Object.fromEntries(PRESERVED_FIELDS.map((field) => [field, null])),
    demoted_from_auto: false,
    context_missing: []
  }
}

/**
 * One row per package ncu would upgrade, in ncu's order, with no work done.
 *
 * @param {Record<string, string>} upgrades - What `ncu --jsonUpgraded` gives
 * @param {object} packageJson - The repo's parsed package.json
 * @returns {object[]}
 */
export const freshRowsOf = (upgrades, packageJson) =>
  Object.entries(upgrades).map((entry) => freshRow(packageJson, entry))

const keepEarlierWork = (row, earlier) =>
  earlier === undefined
    ? row
    : {
        ...row,
        ...Object.fromEntries(
          PRESERVED_FIELDS.map((field) => [field, earlier[field] ?? null])
        )
      }

/**
 * The fresh rows, each keeping the classification, status and context an
 * earlier discovery's row for the same package held.
 *
 * @param {object[]} freshRows - From {@link freshRowsOf}
 * @param {object[]} earlierRows - The packages an earlier run wrote
 * @returns {object[]}
 */
export const mergeWithEarlierRows = (freshRows, earlierRows) =>
  freshRows.map((row) =>
    keepEarlierWork(
      row,
      earlierRows.find((earlier) => earlier.package === row.package)
    )
  )

/**
 * Write a repo's `packages.<repo>.json` from what ncu found, keeping the
 * work an earlier discovery's file recorded.
 *
 * @param {object} opts
 * @param {string} opts.path - The packages file
 * @param {{ticket: string, repo: string, strategy: string, ncuVersion: string}} opts.header
 * @param {Record<string, string>} opts.upgrades
 * @param {object} opts.packageJson
 * @returns {object} What it wrote
 */
export const writePackagesFile = ({ path, header, upgrades, packageJson }) => {
  const freshRows = freshRowsOf(upgrades, packageJson)
  const earlierRows = existsSync(path) ? (readJson(path).packages ?? []) : []
  const packagesFile = {
    ticket: header.ticket,
    repo: header.repo,
    discovered_at: utcStamp(),
    strategy: header.strategy,
    ncu_version: header.ncuVersion,
    packages: mergeWithEarlierRows(freshRows, earlierRows)
  }
  writeJsonAtomic(path, packagesFile)
  return packagesFile
}

const FOLDERS_NAMED_FOR_THEIR_PARENT = new Set(['service', 'app', 'src'])

/**
 * The repo a path holds: its folder name, or its parent's when the folder
 * is a `service`, `app` or `src` folder.
 *
 * @param {string} repoPath - An absolute path
 * @returns {string}
 */
export const repoNameOf = (repoPath) =>
  FOLDERS_NAMED_FOR_THEIR_PARENT.has(basename(repoPath))
    ? basename(dirname(repoPath))
    : basename(repoPath)

const countWhere = (rows, matches) => rows.filter(matches).length

const countsOf = (rows) => {
  const pending = countWhere(rows, (row) => row.classification == null)
  return {
    total: rows.length,
    major: countWhere(rows, (row) => row.upgrade_type === 'major'),
    minor: countWhere(rows, (row) => row.upgrade_type === 'minor'),
    patch: countWhere(rows, (row) => row.upgrade_type === 'patch'),
    pending,
    classified: rows.length - pending
  }
}

const metaText = (meta) => `{
    "repo_name": "${meta.repoName}",
    "repo_path": "${meta.repoPath}",
    "workspace_dir": "${meta.repoFolder}",
    "last_discovered": "${utcStamp()}",
    "ncu_version": "${meta.ncuVersion}",
    "upgrade_strategy": "${meta.strategy}",
    "packages_file": "packages.${meta.repoName}.json",
    "total_upgrades": ${meta.total}
}
`

const TICKET_FORMAT = /^[A-Z]+-\d+$/

/**
 * @param {object} opts
 * @param {string} [opts.runId]
 * @param {string} [opts.repoPath]
 * @param {string} opts.strategy
 * @param {(line: string) => void} opts.warn
 * @throws {TimError} USAGE when the run id or repo path is missing, or the strategy is unknown
 */
export const checkDiscoverOptions = ({ runId, repoPath, strategy, warn }) => {
  if (!runId) {
    throw new TimError(
      'USAGE',
      '--run-id TICKET is required (e.g. --run-id EUDPA-12345)'
    )
  }
  if (!repoPath) {
    throw new TimError(
      'USAGE',
      'Repository path is required. Use --help for usage information'
    )
  }
  if (!TICKET_FORMAT.test(runId)) {
    warn(
      `Warning: --run-id '${runId}' does not match expected Jira ticket format (e.g. PROJ-123)`
    )
  }
  if (!STRATEGIES.includes(strategy)) {
    throw new TimError(
      'USAGE',
      `Invalid strategy '${strategy}'. Must be latest, minor, or patch`
    )
  }
}

const readManifest = (repoPath) => {
  if (!isFolder(repoPath)) {
    throw new TimError(
      'NOT_FOUND',
      `Repository path does not exist: ${repoPath}`
    )
  }
  const manifestPath = join(repoPath, 'package.json')
  if (!existsSync(manifestPath)) {
    throw new TimError('NOT_FOUND', `No package.json found in ${repoPath}`)
  }
  return JSON.parse(readFileSync(manifestPath, 'utf8'))
}

const askNcu = async ({ runNcu, repoPath, strategy, log }) => {
  let upgrades
  try {
    upgrades = await runNcu({ cwd: repoPath, target: strategy })
  } catch (error) {
    throw new TimError(
      'UNKNOWN',
      `Failed to run npm-check-updates: ${error.message}`,
      error
    )
  }
  if (!upgrades || Object.keys(upgrades).length === 0) {
    log('No outdated dependencies found')
    return {}
  }
  return upgrades
}

const prepareRepoFolder = ({ repoFolder, force, log }) => {
  if (isFolder(repoFolder) && !force) {
    log(`Updating existing workspace: ${repoFolder}`)
    return
  }
  log(`Creating workspace: ${repoFolder}`)
  mkdirSync(repoFolder, { recursive: true })
}

/**
 * Find a repo's outdated npm dependencies with npm-check-updates and write
 * the run's `packages.<repo>.json` and `.upgrades-meta.json`. A re-run
 * keeps the work recorded for packages still outdated; `force` changes
 * only the progress line.
 *
 * @param {object} opts
 * @param {string} opts.workspaceRoot
 * @param {string} opts.runId
 * @param {string} opts.repoPath
 * @param {string} opts.strategy - latest, minor or patch
 * @param {boolean} [opts.force]
 * @param {(request: {cwd: string, target: string}) => Promise<Record<string, string> | undefined>} opts.runNcu
 * @param {string} opts.ncuVersion
 * @param {(line: string) => void} opts.log - Progress lines
 * @returns {Promise<{repoName: string, repoFolder: string, packagesFile: string, counts: object, state: object}>}
 * @throws {TimError} NOT_FOUND when the repo or its package.json is missing; UNKNOWN when ncu fails
 */
export const discoverUpgrades = async ({
  workspaceRoot,
  runId,
  repoPath: givenPath,
  strategy,
  force = false,
  runNcu,
  ncuVersion,
  log
}) => {
  const repoPath = resolve(givenPath)
  const packageJson = readManifest(repoPath)
  const repoName = repoNameOf(repoPath)
  const repoFolder = join(runFolder(workspaceRoot, runId), repoName)
  prepareRepoFolder({ repoFolder, force, log })
  log('Discovering outdated dependencies...')
  const upgrades = await askNcu({ runNcu, repoPath, strategy, log })
  log(`Writing packages.${repoName}.json...`)
  const packagesFile = packagesPath(runFolder(workspaceRoot, runId), repoName)
  const state = writePackagesFile({
    path: packagesFile,
    header: { ticket: runId, repo: repoName, strategy, ncuVersion },
    upgrades,
    packageJson
  })
  const counts = countsOf(state.packages)
  writeFileSync(
    join(repoFolder, '.upgrades-meta.json'),
    metaText({
      repoName,
      repoPath,
      repoFolder,
      ncuVersion,
      strategy,
      total: counts.total
    })
  )
  return { repoName, repoFolder, packagesFile, counts, state }
}

/**
 * @param {Awaited<ReturnType<typeof discoverUpgrades>>} discovery
 * @returns {string} The summary discover prints after its progress lines
 */
export const renderDiscoverText = ({
  repoName,
  repoFolder,
  packagesFile,
  counts
}) =>
  [
    '',
    '=== NPM Upgrade Discovery Complete ===',
    `Repository: ${repoName}`,
    `Workspace: ${repoFolder}`,
    `State: ${packagesFile}`,
    '',
    `Total packages: ${counts.total}`,
    `  Major: ${counts.major}`,
    `  Minor: ${counts.minor}`,
    `  Patch: ${counts.patch}`,
    '',
    'Classification:',
    `  Pending: ${counts.pending}`,
    `  Already classified: ${counts.classified}`,
    '',
    `Next: spawn PACKAGE_PLANNER subagents for the ${counts.pending} pending packages.`
  ].join('\n')
