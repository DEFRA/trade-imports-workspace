import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createChangelogSourceClient } from '../clients/changelog-source-client.js'
import { TimError } from '../errors.js'
import { writeJsonAtomic, writeTextAtomic } from '../review/store.js'
import { isFolder, packagesPath, readJson, runFolder } from './state.js'

export const PREBAKE_USAGE =
  'Usage: tim npm context prebake --run-id TICKET --repo REPO --package PKG'

const CHANGELOG_BRANCHES = ['main', 'master']
const CHANGELOG_NAMES = [
  'CHANGELOG.md',
  'HISTORY.md',
  'changelog.md',
  'History.md',
  'CHANGES.md'
]

const escapedForRegex = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

/**
 * Matches a line that imports or requires the package, or a path inside it.
 *
 * @param {string} packageName
 * @returns {RegExp}
 */
export const usagePatternFor = (packageName) => {
  const name = escapedForRegex(packageName)
  return new RegExp(`from ['"]${name}(/|['"])|require\\(['"]${name}(/|['"])`)
}

const filesUnder = (folder) =>
  readdirSync(folder, { withFileTypes: true })
    .sort((left, right) => (left.name < right.name ? -1 : 1))
    .flatMap((entry) => {
      const path = join(folder, entry.name)
      if (entry.isDirectory()) return filesUnder(path)
      return entry.isFile() ? [path] : []
    })

const linesOf = (text) => {
  const lines = text.split('\n')
  return lines.at(-1) === '' ? lines.slice(0, -1) : lines
}

const usageLinesIn = (path, pattern) => {
  const content = readFileSync(path)
  const lines = linesOf(content.toString('utf8'))
  if (content.includes(0)) {
    return lines.some((line) => pattern.test(line))
      ? [`Binary file ${path} matches`]
      : []
  }
  return lines.flatMap((line, index) =>
    pattern.test(line) ? [`${path}:${index + 1}:${line}`] : []
  )
}

/**
 * Every line under `srcFolder` that imports or requires the package, as
 * `grep -rn` prints it: `path:line:text`, in path order.
 *
 * @param {string} srcFolder
 * @param {string} packageName
 * @returns {string} One line each, each ending in a newline
 */
export const usagesText = (srcFolder, packageName) => {
  const pattern = usagePatternFor(packageName)
  return filesUnder(srcFolder)
    .flatMap((path) => usageLinesIn(path, pattern))
    .map((line) => `${line}\n`)
    .join('')
}

const repositoryUrlOf = (record) => {
  const { repository } = record ?? {}
  if (typeof repository !== 'object' || repository === null) return undefined
  return typeof repository.url === 'string' ? repository.url : undefined
}

/**
 * The `owner/repo` a registry record's repository URL names on GitHub, or
 * nothing when it names no GitHub repository.
 *
 * @param {object} record - The package's npm registry record
 * @returns {string | undefined}
 */
export const githubRepoOf = (record) => {
  const url = repositoryUrlOf(record)
    ?.replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/\.git$/, '')
    .replace(/^ssh:\/\/git@/, 'https://')
  if (!url || !/github.com/.test(url)) return undefined
  return url.replace(/https?:\/\/github.com\//, '').replace(/\/$/, '')
}

const candidateChangelogUrls = (githubRepo) =>
  CHANGELOG_BRANCHES.flatMap((branch) =>
    CHANGELOG_NAMES.map(
      (name) =>
        `https://raw.githubusercontent.com/${githubRepo}/${branch}/${name}`
    )
  )

const packageRecordOf = async (client, packageName) => {
  try {
    return await client.packageRecord(packageName)
  } catch {
    return undefined
  }
}

const downloadedChangelog = async (client, url) => {
  try {
    return { url, body: await client.downloadText(url) }
  } catch {
    return undefined
  }
}

const firstChangelog = async (client, urls) => {
  for (const url of urls) {
    const changelog = await downloadedChangelog(client, url)
    if (changelog) return changelog
  }
  return undefined
}

const findChangelog = async (client, packageName) => {
  const record = await packageRecordOf(client, packageName)
  const githubRepo = githubRepoOf(record)
  if (!githubRepo) return undefined
  return firstChangelog(client, candidateChangelogUrls(githubRepo))
}

const changelogText = (packageName, { url, body }) =>
  `# Changelog for ${packageName}\n\nSource: ${url}\n\n---\n\n${body.replace(/\n+$/, '')}\n`

const asText = (value) => String(value ?? null)

const packageMetaText = (row) =>
  `${JSON.stringify({
    package: row.package,
    current: asText(row.current),
    target: asText(row.target),
    upgrade_type: asText(row.upgrade_type),
    dependency_type: asText(row.dependency_type)
  })}\n`

const contextBakedOf = ({ missing, changelogFound, usagesFound }) => {
  if (missing.length === 0) return true
  return changelogFound || usagesFound ? 'partial' : false
}

const recordContext = (path, packageName, context) => {
  const packagesFile = readJson(path)
  writeJsonAtomic(path, {
    ...packagesFile,
    packages: packagesFile.packages.map((row) =>
      row.package === packageName
        ? {
            ...row,
            context_baked: context.baked,
            context_missing: context.missing
          }
        : row
    )
  })
}

const writeUsages = (contextFolder, srcFolder, packageName) => {
  const text = isFolder(srcFolder)
    ? usagesText(srcFolder, packageName)
    : `# repo src dir not found: ${srcFolder}\n`
  writeTextAtomic(join(contextFolder, 'usages.txt'), text)
  return text.length > 0
}

const writeChangelog = async (contextFolder, client, packageName) => {
  const changelog = await findChangelog(client, packageName)
  if (!changelog) return false
  writeTextAtomic(
    join(contextFolder, 'changelog.md'),
    changelogText(packageName, changelog)
  )
  return true
}

/**
 * Pre-bake one package's context for its planner, under
 * `<run>/<repo>/.context/<package, with / as __>/`: `package-meta.json`,
 * `usages.txt` (the repo's src lines that import it) and, when the npm
 * registry names a GitHub repository with a changelog on main or master,
 * `changelog.md`. A failed download is skipped, not an error. Records what
 * was found as the package row's `context_baked` (true, partial or false)
 * and what was not as `context_missing`.
 *
 * @param {object} opts
 * @param {string} opts.workspaceRoot
 * @param {string} [opts.runId]
 * @param {string} [opts.repo]
 * @param {string} [opts.packageName]
 * @param {ReturnType<typeof createChangelogSourceClient>} [opts.client]
 * @returns {Promise<{packageName: string, repo: string, contextFolder: string, baked: boolean | 'partial', missing: string[]}>}
 * @throws {TimError} USAGE for a missing option; NOT_FOUND when the packages file or the package's row is missing
 */
export const prebakeContext = async ({
  workspaceRoot,
  runId,
  repo,
  packageName,
  client = createChangelogSourceClient()
}) => {
  if (!runId || !repo || !packageName) {
    throw new TimError('USAGE', PREBAKE_USAGE)
  }
  const path = packagesPath(runFolder(workspaceRoot, runId), repo)
  if (!existsSync(path)) {
    throw new TimError('NOT_FOUND', `Packages file not found: ${path}`)
  }
  const contextFolder = join(
    runFolder(workspaceRoot, runId),
    repo,
    '.context',
    packageName.replaceAll('/', '__')
  )
  mkdirSync(contextFolder, { recursive: true })
  const row = readJson(path).packages?.find(
    (candidate) => candidate.package === packageName
  )
  if (!row) throw new TimError('NOT_FOUND', `Package not found: ${packageName}`)

  writeTextAtomic(
    join(contextFolder, 'package-meta.json'),
    packageMetaText(row)
  )
  const srcFolder = join(workspaceRoot, 'repos', repo, 'src')
  const usagesFound = writeUsages(contextFolder, srcFolder, packageName)
  const changelogFound = await writeChangelog(
    contextFolder,
    client,
    packageName
  )
  const missing = [
    ...(isFolder(srcFolder) ? [] : ['usages']),
    ...(changelogFound ? [] : ['changelog']),
    'migration_guide'
  ]
  const baked = contextBakedOf({ missing, changelogFound, usagesFound })
  recordContext(path, packageName, { baked, missing })
  return { packageName, repo, contextFolder, baked, missing }
}

/**
 * @param {Awaited<ReturnType<typeof prebakeContext>>} prebake
 * @returns {string} The line prebake writes to stderr
 */
export const renderPrebakeLine = ({ packageName, repo, contextFolder }) =>
  `Baked context for ${packageName} in ${repo} (${contextFolder})`
