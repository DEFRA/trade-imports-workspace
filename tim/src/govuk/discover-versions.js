import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { writeJsonAtomic } from '../backlog/io.js'
import { repoPath } from '../constants/repos.js'
import { TimError } from '../errors.js'
import {
  compareSemverKeys,
  isDirectory,
  readState,
  runFolder,
  semverKey,
  versionsPath
} from './state.js'
import { stateTimestamp } from './transitions.js'

const PACKAGE = 'govuk-frontend'

const BEST_PRACTICE_SOURCES = [
  'docs/best-practices/node/govuk-frontend.md',
  'docs/best-practices/gds/components.md',
  'docs/best-practices/gds/patterns.md',
  'docs/best-practices/gds/accessibility.md',
  'docs/best-practices/gds/styles.md'
]

const STALE_CHANGELOG = /^version__(.*)\.changelog\.md$/

const silent = () => undefined

const refuse = (code, message, cause) =>
  new TimError(code, `Error: ${message}`, cause)

const withoutPrefix = (version) => version.replace(/^\D*/, '')

const isNewer = (left, right) =>
  compareSemverKeys(
    semverKey(withoutPrefix(left)),
    semverKey(withoutPrefix(right))
  ) > 0

const escapeForRegExp = (text) => text.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')

const headingOf = (version) =>
  new RegExp(`^## v${escapeForRegExp(version)}(\\s|\\(|$)`)

const linesOf = (text) => {
  const lines = text.split('\n')
  return text.endsWith('\n') ? lines.slice(0, -1) : lines
}

const hasSection = (changelog, version) =>
  linesOf(changelog).some((line) => headingOf(version).test(line))

const sectionOf = (changelog, version) => {
  const lines = linesOf(changelog)
  const start = lines.findIndex((line) => headingOf(version).test(line))
  if (start === -1) return ''
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => line.startsWith('## v'))
  const body = end === -1 ? rest : rest.slice(0, end)
  return body.join('\n').replace(/\n+$/, '')
}

const writeThroughTemp = (path, text) => {
  writeFileSync(`${path}.tmp`, text)
  renameSync(`${path}.tmp`, path)
}

const readConstraint = (repoDir) => {
  const packagePath = join(repoDir, 'package.json')
  if (!existsSync(packagePath)) {
    throw refuse('NOT_FOUND', `No package.json found in ${repoDir}`)
  }
  const manifest = JSON.parse(readFileSync(packagePath, 'utf8'))
  const raw =
    manifest.dependencies?.[PACKAGE] ?? manifest.devDependencies?.[PACKAGE]
  if (!raw) {
    throw refuse(
      'NOT_FOUND',
      `govuk-frontend not found in dependencies or devDependencies in ${packagePath}`
    )
  }
  return { raw, prefix: raw.match(/^\D*/)[0], current: withoutPrefix(raw) }
}

const fetchingFromNpm = async (fetch, failure) => {
  try {
    return await fetch()
  } catch (error) {
    throw refuse(error.code ?? 'NETWORK', `${failure}: ${error.message}`, error)
  }
}

const versionsBetween = (published, current, target) =>
  published
    .filter((version) => version && !version.includes('-'))
    .filter((version) => isNewer(version, current))
    .filter((version) => !isNewer(version, target))
    .toSorted((left, right) =>
      compareSemverKeys(semverKey(left), semverKey(right))
    )

const refreshChangelog = async ({
  changelogPath,
  target,
  force,
  changelogs,
  say
}) => {
  const cached = existsSync(changelogPath)
  const missesTarget =
    cached && !force && !hasSection(readFileSync(changelogPath, 'utf8'), target)
  if (missesTarget) {
    await say(`Cached CHANGELOG.md is missing v${target} — refreshing`)
  }
  if (cached && !force && !missesTarget) {
    await say('Using cached CHANGELOG.md')
    return
  }
  await say('Fetching CHANGELOG.md from GitHub...')
  let changelog
  try {
    changelog = await changelogs.fetchChangelog()
  } catch (error) {
    throw refuse(
      'NETWORK',
      `Failed to fetch CHANGELOG.md from ${changelogs.url}`,
      error
    )
  }
  writeFileSync(changelogPath, changelog)
  await say(`Cached: ${changelogPath}`)
}

const pruneStaleSections = async (folder, versions, say) => {
  const stale = readdirSync(folder)
    .map((name) => name.match(STALE_CHANGELOG)?.[1])
    .filter((version) => version !== undefined && !versions.includes(version))
    .sort()
  for (const version of stale) {
    rmSync(join(folder, `version__${version}.changelog.md`), { force: true })
    await say(
      `  Pruned stale changelog cache: version__${version}.changelog.md`
    )
  }
}

const writeSections = async ({ folder, versions, changelog, force, say }) => {
  for (const version of versions) {
    const path = join(folder, `version__${version}.changelog.md`)
    if (existsSync(path) && !force) continue
    const section = sectionOf(changelog, version)
    if (section === '') {
      await say(`  WARN: no CHANGELOG section found for v${version}`)
      continue
    }
    writeThroughTemp(
      path,
      `## govuk-frontend v${version} — Changelog\n\n${section}\n`
    )
  }
}

const bestPracticeSection = (workspaceRoot, relPath) => {
  const source = join(workspaceRoot, relPath)
  const body = existsSync(source)
    ? readFileSync(source, 'utf8')
    : `_(missing — file not found at \`${source}\`)_\n`
  return `\n---\n\n## Source: \`${relPath}\`\n\n${body}`
}

const writeBestPractices = async ({
  workspaceRoot,
  folder,
  repo,
  force,
  say
}) => {
  const path = join(folder, 'best-practices.md')
  if (existsSync(path) && !force) return
  const header = `# Best practices applicable to ${repo} (govuk-frontend upgrade)\n\nConcatenated at Phase 1. Apply these standards when planning changes.\n`
  writeThroughTemp(
    path,
    header +
      BEST_PRACTICE_SOURCES.map((relPath) =>
        bestPracticeSection(workspaceRoot, relPath)
      ).join('')
  )
  await say(`Cached: ${path}`)
}

const seededEntry = (version) => ({
  version,
  classification: null,
  classified_at: null,
  implementation_status: null,
  implemented_at: null,
  commit_sha: null,
  failure_reason: null,
  changelog_path: `version__${version}.changelog.md`,
  summary: null,
  changes: []
})

const writeState = ({
  path,
  force,
  versions,
  runId,
  repo,
  current,
  target,
  prefix
}) => {
  const now = stateTimestamp()
  const prior = existsSync(path) && !force ? readState(path) : null
  const priorVersions = prior?.versions ?? []
  writeJsonAtomic(path, {
    ticket: runId,
    repo,
    package: PACKAGE,
    current_version: current,
    target_version: target,
    original_constraint_prefix: prefix,
    created_at: prior?.created_at || now,
    last_discovered_at: now,
    versions: versions.map(
      (version) =>
        priorVersions.find((entry) => entry.version === version) ??
        seededEntry(version)
    )
  })
}

const summaryLines = ({
  repo,
  current,
  target,
  prefix,
  versions,
  statePath
}) => [
  '',
  '=== govuk-frontend Version Discovery Complete ===',
  `Repository:  ${repo}`,
  `Upgrade:     ${current} → ${target}  (constraint prefix: '${prefix}')`,
  `Versions:    ${versions.length} intermediate versions`,
  `State:       ${statePath}`,
  '',
  'Versions:',
  ...versions.map((version) => `  ${version}`),
  '',
  'Next: Phase 2 spawns VERSION_PLANNER workers per pending version'
]

/**
 * Seeds one repo's state for a govuk-frontend upgrade run: one entry for
 * every stable version after the repo's current one up to the target,
 * keeping the state of entries already there unless `force`. Caches the
 * upstream CHANGELOG.md (again when it lacks the target's section), writes
 * each version's section beside it, removes sections for versions no
 * longer in range and writes the best-practices bundle.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.runId
 * @param {string} args.repo
 * @param {string} [args.target] - Defaults to the registry's latest
 * @param {boolean} [args.force=false] - Download the changelog again and seed every entry afresh
 * @param {{latestVersion: Function, publishedVersions: Function}} args.registry - From `createNpmRegistryClient`
 * @param {{url: string, fetchChangelog: Function}} args.changelogs - From `createGovukChangelogClient`
 * @param {(line: string) => void | Promise<void>} [args.say]
 * @param {(line: string) => void | Promise<void>} [args.warn]
 * @returns {Promise<{repo: string, status: 'up-to-date'|'no-versions'|'discovered', current: string, target: string, versions: string[]}>}
 * @throws {TimError} NOT_FOUND when the repo, its package.json or its govuk-frontend dependency is missing; the client's code when npm or the changelog cannot be read
 */
export const discoverVersions = async ({
  workspaceRoot,
  runId,
  repo,
  target: givenTarget,
  force = false,
  registry,
  changelogs,
  say = silent,
  warn = silent
}) => {
  if (!/^[A-Z]+-[0-9]+$/.test(runId)) {
    await warn(
      `Warning: --run-id '${runId}' does not match expected Jira ticket format (e.g. PROJ-123)`
    )
  }
  const repoDir = repoPath(workspaceRoot, repo)
  if (!isDirectory(repoDir)) {
    throw refuse('NOT_FOUND', `Repository path does not exist: ${repoDir}`)
  }
  const { raw, prefix, current } = readConstraint(repoDir)
  await say(`Current govuk-frontend version: ${current} (constraint: ${raw})`)

  let rawTarget = givenTarget
  if (!rawTarget) {
    await say('Fetching latest govuk-frontend version from npm...')
    rawTarget = await fetchingFromNpm(
      () => registry.latestVersion(PACKAGE),
      'Failed to fetch latest version from npm'
    )
  }
  const target = withoutPrefix(rawTarget)
  await say(`Target govuk-frontend version: ${target}`)

  const folder = join(runFolder(workspaceRoot, runId), repo)
  mkdirSync(folder, { recursive: true })
  const outcome = { repo, current, target }

  if (!isNewer(target, current)) {
    await say(
      `Already up to date: govuk-frontend ${current} (target: ${target})`
    )
    return { ...outcome, status: 'up-to-date', versions: [] }
  }

  await say('Fetching version list from npm...')
  const published = await fetchingFromNpm(
    () => registry.publishedVersions(PACKAGE),
    'Failed to fetch version list from npm'
  )
  const versions = versionsBetween(published, current, target)
  if (versions.length === 0) {
    await say(`No stable versions found between ${current} and ${target}`)
    return { ...outcome, status: 'no-versions', versions }
  }
  await say(`Found ${versions.length} versions to process`)

  const changelogPath = join(folder, 'CHANGELOG.md')
  await refreshChangelog({ changelogPath, target, force, changelogs, say })
  await pruneStaleSections(folder, versions, say)
  await writeSections({
    folder,
    versions,
    changelog: readFileSync(changelogPath, 'utf8'),
    force,
    say
  })
  await writeBestPractices({ workspaceRoot, folder, repo, force, say })

  const statePath = versionsPath(workspaceRoot, runId, repo)
  writeState({
    path: statePath,
    force,
    versions,
    runId,
    repo,
    current,
    target,
    prefix
  })
  await say(
    summaryLines({ repo, current, target, prefix, versions, statePath }).join(
      '\n'
    )
  )
  return { ...outcome, status: 'discovered', versions }
}
