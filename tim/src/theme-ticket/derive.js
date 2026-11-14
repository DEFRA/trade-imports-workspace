import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { TimError } from '../errors.js'
import { currentBranch, gitOutput } from './git.js'
import { addedHeadingsInDiff, parseScenarios } from './scenarios.js'

const GITHUB_BLOB = 'https://github.com/DEFRA/trade-imports-workspace/blob'

const SPEC_AREA_DOMAIN = {
  'live-animals': 'animals',
  plants: 'plants',
  ins: 'ins',
  admin: 'admin'
}

const DOMAIN_TITLE = {
  animals: 'Live animals journey',
  plants: 'High-risk plants journey',
  ins: 'Import notification service front door',
  admin: 'Animals admin'
}

/**
 * The domain a repository belongs to, from its name: `ignore` for a test
 * suite, `shared` for a name that carries no domain word.
 *
 * @param {string} repoPath
 * @returns {'ignore'|'admin'|'animals'|'plants'|'ins'|'shared'}
 */
export const domainOfRepo = (repoPath) => {
  const name = basename(repoPath)
  if (name.endsWith('-tests')) return 'ignore'
  if (name.includes('animals-admin')) return 'admin'
  if (name.includes('animals')) return 'animals'
  if (name.includes('plants')) return 'plants'
  if (name.includes('ins')) return 'ins'
  return 'shared'
}

const deriveFailure = (message) =>
  new TimError('UNKNOWN', `tim theme-ticket derive: ${message}`)

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))

const readJsonIfThere = (file, fallback) =>
  existsSync(file) ? readJson(file) : fallback

const escapeForRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const scopeAlternatives = (scopes) => scopes.map(escapeForRegExp).join('|')

const conventionalSubjectScoping = (scopes) =>
  `^[a-z]+\\(.*(${scopeAlternatives(scopes)})\\):`

const themeRows = (workareaDir, theme) => {
  const themeBacklog = join(workareaDir, 'themes', theme, 'backlog.json')
  const mainBacklog = join(workareaDir, 'backlog.json')
  if (existsSync(themeBacklog)) return readJson(themeBacklog).increments
  if (!existsSync(mainBacklog)) {
    throw deriveFailure(`no backlog at ${themeBacklog} or ${mainBacklog}`)
  }
  const increments = readJson(mainBacklog).increments
  const unthemed = increments.every((row) => !row.theme)
  return unthemed ? increments : increments.filter((row) => row.theme === theme)
}

const repoOfRow = (row, repoPaths, warnings) => (key) => {
  const repoPath = repoPaths[key]
  if (!repoPath) {
    warnings.push(
      `row ${row.id} names repo key "${key}" that sources.json does not map; treated as shared`
    )
    return { key, repo: key, domain: 'shared' }
  }
  return { key, repo: basename(repoPath), domain: domainOfRepo(repoPath) }
}

const isOwnDomain = (domain) => domain !== 'shared' && domain !== 'ignore'

const exclusionOf = (row, touchesApp) => {
  if (!touchesApp) return 'test-only'
  return row.status === 'dropped' ? 'dropped' : null
}

const describeRow = (row, repoPaths, warnings) => {
  const repos = (row.repos || []).map(repoOfRow(row, repoPaths, warnings))
  const domains = [
    ...new Set(repos.map((repo) => repo.domain).filter(isOwnDomain))
  ].sort()
  const sharedRepos = repos
    .filter((repo) => repo.domain === 'shared')
    .map((repo) => repo.repo)
  const touchesApp = domains.length > 0 || sharedRepos.length > 0
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    gate: row.gate || null,
    repos,
    domains,
    sharedRepos,
    testRepos: repos
      .filter((repo) => repo.domain === 'ignore')
      .map((repo) => repo.repo),
    attributedBy: domains.length ? 'repos' : null,
    commit: null,
    testOnly: !touchesApp,
    excluded: exclusionOf(row, touchesApp)
  }
}

const listSpecFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return listSpecFiles(full)
    return entry.name === 'spec.md' ? [full] : []
  })

const createSpecReader = (workspaceRoot) => {
  const specsDir = join(workspaceRoot, 'openspec', 'specs')
  const current = new Map()
  let currentIds = null

  const scenariosNow = (relPath) => {
    if (!current.has(relPath)) {
      const file = join(specsDir, relPath)
      current.set(
        relPath,
        existsSync(file)
          ? parseScenarios(readFileSync(file, 'utf8'))
          : new Map()
      )
    }
    return current.get(relPath)
  }

  const scenariosAt = async (sha, relPath) =>
    parseScenarios(
      await gitOutput(workspaceRoot, [
        'show',
        `${sha}:openspec/specs/${relPath}`
      ])
    )

  const idsInCurrentSpecs = () => {
    currentIds ??= new Set(
      listSpecFiles(specsDir).flatMap((file) =>
        [...parseScenarios(readFileSync(file, 'utf8')).values()]
          .map((scenario) => scenario.id)
          .filter(Boolean)
      )
    )
    return currentIds
  }

  return { scenariosNow, scenariosAt, idsInCurrentSpecs }
}

const findById = (byHeading, id) =>
  [...byHeading.values()].find((scenario) => scenario.id === id)

const locateAddedScenario = async (specs, warnings, sha, relPath, heading) => {
  const where = `${relPath} by ${sha.slice(0, 8)}`
  const current = specs.scenariosNow(relPath)
  if (current.has(heading)) {
    return { state: 'current', heading, found: current.get(heading) }
  }

  const id = (await specs.scenariosAt(sha, relPath)).get(heading)?.id
  const renamed = id ? findById(current, id) : null
  if (renamed) return { state: 'renamed', heading, found: renamed }

  if (id && !specs.idsInCurrentSpecs().has(id)) {
    warnings.push(
      `scenario ${id} "${heading}" was added to ${where} then removed; not counted`
    )
    return { state: 'removed', heading, found: null }
  }

  warnings.push(
    `scenario "${heading}" was added to ${where} but no longer reads that way and its id is elsewhere or unknown; counted, text not available`
  )
  return { state: 'unaccounted', heading, found: null }
}

const listedFor = (listing, relPath, heading) =>
  (listing[relPath] || []).includes(heading)

const readOverrides = (workareaDir, theme) => {
  const overrides = readJsonIfThere(
    join(workareaDir, 'tickets', 'footprint-overrides.json'),
    {}
  )
  return {
    included: overrides.include?.[theme] || {},
    excluded: overrides.exclude?.[theme] || {}
  }
}

const readScopes = (workareaDir, theme) => {
  const tickets = readJsonIfThere(
    join(workareaDir, 'tickets', 'tickets.json'),
    {}
  )
  const themeKeys = Object.values(tickets.themes?.[theme] || {})
  const rowScopes = tickets.rowScopes?.[theme] || []
  return {
    all: [theme, ...themeKeys, ...rowScopes],
    rows: [theme, ...rowScopes]
  }
}

const commitsMatching = async (workspaceRoot, commitsRef, pattern) =>
  (
    await gitOutput(workspaceRoot, [
      'log',
      '-E',
      `--grep=${pattern}`,
      '--format=%H%x09%s',
      commitsRef,
      '--',
      'openspec/'
    ])
  )
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [sha, subject] = line.split('\t')
      return { sha, subject }
    })

const addedHeadingsOf = async (workspaceRoot, sha) =>
  addedHeadingsInDiff(
    await gitOutput(workspaceRoot, [
      'show',
      '--format=',
      '-U0',
      sha,
      '--',
      'openspec/specs/'
    ])
  )

const scenarioEntry =
  (relPath, row) =>
  ({ heading, found }) =>
    found
      ? {
          heading: found.heading,
          id: found.id,
          steps: found.steps,
          file: relPath,
          row: row ? row.id : null,
          missing: false
        }
      : {
          heading,
          id: null,
          steps: [],
          file: relPath,
          row: row ? row.id : null,
          missing: true
        }

const fileTableOf = (bucket, fileCounts, branch) =>
  [...new Set(bucket.scenarios.map((scenario) => scenario.file))]
    .map((relPath) => ({
      path: relPath,
      added: fileCounts.get(relPath),
      url: `${GITHUB_BLOB}/${branch}/openspec/specs/${relPath}`
    }))
    .sort(
      (left, right) =>
        right.added - left.added || left.path.localeCompare(right.path)
    )

const attributeRowsToDomains = (rows, domains) => {
  const allDomains = Object.keys(domains).sort()
  for (const row of rows) {
    if (row.excluded || row.domains.length) continue
    row.domains = [...allDomains]
    row.attributedBy = 'shared-component'
  }
  for (const bucket of Object.values(domains)) {
    bucket.rows = rows
      .filter((row) => !row.excluded && row.domains.includes(bucket.domain))
      .map((row) => row.id)
      .sort()
    bucket.excludedRows = rows
      .filter((row) => row.excluded && row.domains.includes(bucket.domain))
      .map((row) => ({ id: row.id, title: row.title, why: row.excluded }))
  }
}

/**
 * Everything a theme's business tickets need, split by domain: the
 * scenarios its commits added to `openspec/specs/`, read as the current
 * specs hold them, the spec files they sit in and the backlog rows behind
 * them.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.workarea - A path under `workareas/`
 * @param {string} args.theme
 * @param {string} [args.branch] - The branch spec links point at; the checked-out branch when left out
 * @param {string} [args.commitsFrom] - Where the row commits are read; `branch` when left out
 * @returns {Promise<object>} The derived theme, in the shape `derived.json` holds
 * @throws {TimError} USAGE without a workarea or theme; UNKNOWN when there is no workarea, backlog, row or matching commit, when a spec area has no domain, or when the per-domain counts do not sum to the theme total
 */
export const deriveTheme = async ({
  workspaceRoot,
  workarea,
  theme,
  branch: branchOption,
  commitsFrom
}) => {
  if (!theme || !workarea) {
    throw new TimError(
      'USAGE',
      'Usage: tim theme-ticket derive --workarea <path under workareas/> --theme <id>'
    )
  }
  const branch = branchOption || (await currentBranch(workspaceRoot))
  const commitsRef = commitsFrom || branch
  const workareaDir = join(workspaceRoot, 'workareas', workarea)
  if (!existsSync(workareaDir)) {
    throw deriveFailure(`no workarea at ${workareaDir}`)
  }

  const rowSource = themeRows(workareaDir, theme)
  if (!rowSource.length) throw deriveFailure(`no rows for theme ${theme}`)

  const repoPaths =
    readJsonIfThere(join(workareaDir, 'sources.json'), {}).repos || {}
  const warnings = []
  const rows = rowSource.map((row) => describeRow(row, repoPaths, warnings))

  const scopes = readScopes(workareaDir, theme)
  const rowCommits = await commitsMatching(
    workspaceRoot,
    commitsRef,
    conventionalSubjectScoping(scopes.rows)
  )
  const commits = await commitsMatching(
    workspaceRoot,
    commitsRef,
    conventionalSubjectScoping(scopes.all)
  )
  if (!commits.length) {
    throw deriveFailure(
      `no commits on ${commitsRef} whose subject scopes "${theme}" and which touch openspec/`
    )
  }
  if (!rowCommits.length) {
    throw deriveFailure(
      `no commits on ${commitsRef} scoped by the theme slug "${theme}" or a row scope tickets.json lists for it — without them there is no footprint to judge review commits against`
    )
  }

  const footprint = new Set()
  for (const commit of rowCommits) {
    for (const relPath of (
      await addedHeadingsOf(workspaceRoot, commit.sha)
    ).keys()) {
      footprint.add(relPath)
    }
  }

  const specs = createSpecReader(workspaceRoot)
  const { included, excluded } = readOverrides(workareaDir, theme)
  const rowShas = new Set(rowCommits.map((commit) => commit.sha))
  const domains = {}
  const unknownAreas = new Set()
  const fileCounts = new Map()
  const counted = new Set()
  const outsideFootprint = []
  const excludedByOverride = []
  let totalAdded = 0

  const firstCount = (relPath) => (scenario) => {
    const key = `${relPath}#${scenario.found ? scenario.found.id : scenario.heading}`
    if (counted.has(key)) return false
    counted.add(key)
    return true
  }

  for (const commit of commits) {
    const row = rows.find((candidate) =>
      commit.subject.includes(candidate.title.slice(0, 40))
    )
    if (row) row.commit = commit.sha

    for (let [relPath, headings] of await addedHeadingsOf(
      workspaceRoot,
      commit.sha
    )) {
      if (!rowShas.has(commit.sha) && !footprint.has(relPath)) {
        const kept = headings.filter((heading) =>
          listedFor(included, relPath, heading)
        )
        const dropped = headings.filter(
          (heading) => !listedFor(included, relPath, heading)
        )
        if (dropped.length) {
          outsideFootprint.push({
            commit: commit.sha.slice(0, 8),
            subject: commit.subject,
            file: relPath,
            scenarios: dropped
          })
        }
        if (!kept.length) continue
        headings = kept
      }

      const judgedOut = headings.filter((heading) =>
        listedFor(excluded, relPath, heading)
      )
      if (judgedOut.length) {
        excludedByOverride.push({
          commit: commit.sha.slice(0, 8),
          file: relPath,
          scenarios: judgedOut
        })
        headings = headings.filter(
          (heading) => !listedFor(excluded, relPath, heading)
        )
        if (!headings.length) continue
      }

      const area = relPath.split('/')[0]
      const domain = SPEC_AREA_DOMAIN[area]
      if (!domain) {
        unknownAreas.add(area)
        continue
      }

      const located = []
      for (const heading of headings) {
        located.push(
          await locateAddedScenario(
            specs,
            warnings,
            commit.sha,
            relPath,
            heading
          )
        )
      }
      const newlyCounted = located
        .filter((scenario) => scenario.state !== 'removed')
        .filter(firstCount(relPath))
      if (!newlyCounted.length) continue

      domains[domain] ??= {
        domain,
        title: DOMAIN_TITLE[domain] || domain,
        scenarios: [],
        files: [],
        rows: []
      }
      const bucket = domains[domain]

      fileCounts.set(
        relPath,
        (fileCounts.get(relPath) || 0) + newlyCounted.length
      )
      totalAdded += newlyCounted.length
      bucket.scenarios.push(...newlyCounted.map(scenarioEntry(relPath, row)))
      if (row && !bucket.rows.includes(row.id)) bucket.rows.push(row.id)
    }
  }

  if (unknownAreas.size) {
    throw deriveFailure(
      `openspec areas with no domain mapping: ${[...unknownAreas].join(', ')}. Add them to SPEC_AREA_DOMAIN in tim/src/theme-ticket/derive.js — a theme must not be split with an area silently dropped.`
    )
  }

  for (const bucket of Object.values(domains)) {
    bucket.files = fileTableOf(bucket, fileCounts, branch)
    bucket.scenarioCount = bucket.scenarios.length
    bucket.fileCount = bucket.files.length
  }

  attributeRowsToDomains(rows, domains)

  const perDomainSum = Object.values(domains).reduce(
    (sum, bucket) => sum + bucket.scenarioCount,
    0
  )
  if (perDomainSum !== totalAdded) {
    throw deriveFailure(
      `per-domain scenarios sum to ${perDomainSum} but the theme added ${totalAdded}. A scenario has been dropped or double-counted; the split is not safe to publish.`
    )
  }

  return {
    theme,
    workarea,
    branch,
    commitsFrom: commitsRef,
    commits: commits.map((commit) => ({
      sha: commit.sha.slice(0, 8),
      subject: commit.subject
    })),
    totals: {
      scenarios: totalAdded,
      files: fileCounts.size,
      rows: rows.length,
      domains: Object.keys(domains).length
    },
    domains,
    rows,
    warnings,
    outsideFootprint,
    excludedByOverride,
    checks: {
      scenarioSum: 'ok',
      perDomainSum,
      unknownAreas: [],
      footprintFiles: footprint.size
    }
  }
}
