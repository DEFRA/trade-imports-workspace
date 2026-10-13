/**
 * Derives everything a theme's business tickets need, split by domain.
 *
 * Run through derive-scenarios.sh, never directly.
 *
 * The theme's rows each landed as one commit touching openspec/, so the commits
 * say which scenarios changed and the current specs say what they now read. Both
 * are needed: a diff hides a GIVEN line it did not change, so a scenario read
 * from the diff alone comes out truncated.
 *
 * Emits JSON on stdout:
 *   { theme, workarea, branch, totals, domains: { <domain>: { scenarios, files,
 *     rows } }, rows, warnings, checks }
 *
 * Fails rather than guessing when:
 *   - no commits match the theme;
 *   - a spec path sits under an area this script has no domain for;
 *   - the per-domain scenario counts do not sum to the theme's total.
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const WORKSPACE = path.resolve(process.env.HOME, 'git/defra/trade-imports-workspace')
const GITHUB_BLOB = 'https://github.com/DEFRA/trade-imports-workspace/blob'

/** openspec areas to the domain a business reader knows them by. */
const SPEC_AREA_DOMAIN = {
  'live-animals': 'animals',
  plants: 'plants',
  ins: 'ins',
  admin: 'admin'
}

/** Domain display names, for ticket prose. */
const DOMAIN_TITLE = {
  animals: 'Live animals journey',
  plants: 'High-risk plants journey',
  ins: 'Import notification service front door',
  admin: 'Animals admin'
}

/**
 * Which domain a changed service belongs to, from its repository name.
 *
 * A name carrying a domain word belongs to that domain. A name carrying none —
 * reference-data, the stub, the address book — is a shared component, and its
 * changes belong in every domain's ticket.
 *
 * Two names the bare rule gets wrong, both checked first:
 *   - a test suite (`...-tests`) is ignored. These tickets describe application
 *     behaviour a business reader can go and check; that the behaviour is tested
 *     is already proved by the openspec coverage links, so the test repository
 *     adds nothing here. `trade-imports-ins-tests` would otherwise be read as
 *     the front door's, which it is not — it holds every domain's suites.
 *   - `animals-admin` is its own domain, not part of animals, so the longer
 *     word has to win.
 */
function domainOfRepo(repoName) {
  const name = path.basename(repoName)
  if (name.endsWith('-tests')) return 'ignore'
  if (name.includes('animals-admin')) return 'admin'
  if (name.includes('animals')) return 'animals'
  if (name.includes('plants')) return 'plants'
  if (name.includes('ins')) return 'ins'
  return 'shared'
}

/* ------------------------------------------------------------------ args --- */

const args = {}
for (let i = 0; i < process.argv.length - 1; i += 1) {
  if (process.argv[i].startsWith('--')) args[process.argv[i].slice(2)] = process.argv[i + 1]
}

const theme = args.theme
const workarea = args.workarea
if (!theme || !workarea) {
  console.error('usage: derive-scenarios.sh --workarea <path under workareas/> --theme <id>')
  process.exit(2)
}

const git = (...a) => execFileSync('git', ['-C', WORKSPACE, ...a], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

const branch = args.branch || git('rev-parse', '--abbrev-ref', 'HEAD').trim()
const workareaDir = path.join(WORKSPACE, 'workareas', workarea)

const fail = (message) => {
  console.error('derive-scenarios: ' + message)
  process.exit(1)
}

if (!fs.existsSync(workareaDir)) fail('no workarea at ' + workareaDir)

/* ------------------------------------------------------------- the rows --- */

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))

const themeBacklog = path.join(workareaDir, 'themes', theme, 'backlog.json')
const mainBacklog = path.join(workareaDir, 'backlog.json')

let rowSource
if (fs.existsSync(themeBacklog)) rowSource = readJson(themeBacklog).increments
else if (fs.existsSync(mainBacklog)) rowSource = readJson(mainBacklog).increments.filter((r) => r.theme === theme)
else fail('no backlog at ' + themeBacklog + ' or ' + mainBacklog)

if (!rowSource.length) fail('no rows for theme ' + theme)

// Repo keys to repository paths, so a row's repos can be named by domain.
const sourcesFile = path.join(workareaDir, 'sources.json')
const repoPaths = fs.existsSync(sourcesFile) ? readJson(sourcesFile).repos || {} : {}

const warnings = []

const rows = rowSource.map((row) => {
  const repos = row.repos || []
  const perRepo = repos.map((key) => {
    const repoPath = repoPaths[key]
    if (!repoPath) {
      warnings.push('row ' + row.id + ' names repo key "' + key + '" that sources.json does not map; treated as shared')
      return { key, repo: key, domain: 'shared' }
    }
    return { key, repo: path.basename(repoPath), domain: domainOfRepo(repoPath) }
  })
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    gate: row.gate || null,
    repos: perRepo,
    domains: [...new Set(perRepo.map((r) => r.domain).filter((d) => d !== 'shared' && d !== 'ignore'))].sort(),
    sharedRepos: perRepo.filter((r) => r.domain === 'shared').map((r) => r.repo),
    testRepos: perRepo.filter((r) => r.domain === 'ignore').map((r) => r.repo),
    attributedBy: null,
    commit: null
  }
})

// A row that changed nothing but test suites describes no application behaviour
// a business reader can check, so it is left out of every ticket.
for (const row of rows) {
  const touchesApp = row.domains.length > 0 || row.sharedRepos.length > 0
  row.testOnly = !touchesApp
  if (row.domains.length) row.attributedBy = 'repos'
}

/* ---------------------------------------------------------- the commits --- */

const commits = git(
  'log',
  '-E',
  '--grep=^(feat|fix|test)\\(.*' + theme + '\\):',
  '--format=%H%x09%s',
  branch,
  '--',
  'openspec/'
)
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [sha, subject] = line.split('\t')
    return { sha, subject }
  })

if (!commits.length) fail('no commits on ' + branch + ' whose subject scopes "' + theme + '" and which touch openspec/')

/**
 * The scenario headings each commit added, per spec file.
 *
 * -U0 keeps the diff to changed lines only, which is all that is needed to say
 * WHICH scenarios appeared. Their text is read from the current spec below.
 */
function addedHeadings(sha) {
  const diff = execFileSync(
    'git',
    ['-C', WORKSPACE, 'show', '--format=', '-U0', sha, '--', 'openspec/specs/'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  )
  const perFile = new Map()
  let file = null
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) {
      file = line.slice('+++ b/'.length).replace(/^openspec\/specs\//, '')
      continue
    }
    if (file && line.startsWith('+#### Scenario: ')) {
      if (!perFile.has(file)) perFile.set(file, [])
      perFile.get(file).push(line.slice('+#### Scenario: '.length).trim())
    }
  }
  return perFile
}

/* ----------------------------------------------- the scenarios in full ---- */

const specCache = new Map()

/** Every scenario in a spec file as it reads now, keyed by its heading. */
function scenariosOf(relPath) {
  if (specCache.has(relPath)) return specCache.get(relPath)
  const file = path.join(WORKSPACE, 'openspec', 'specs', relPath)
  const byHeading = new Map()
  if (!fs.existsSync(file)) {
    specCache.set(relPath, byHeading)
    return byHeading
  }
  let current = null
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (line.startsWith('#### Scenario: ')) {
      current = { heading: line.slice('#### Scenario: '.length).trim(), id: null, steps: [] }
      byHeading.set(current.heading, current)
      continue
    }
    if (!current) continue
    if (line.startsWith('### ') || line.startsWith('## ')) {
      current = null
      continue
    }
    const id = line.match(/^\*\*ID\*\*:\s*(\S+)/)
    if (id) {
      current.id = id[1]
      continue
    }
    const step = line.match(/^- \*\*(GIVEN|WHEN|THEN|AND)\*\*\s*(.*)$/)
    if (step) current.steps.push({ keyword: step[1], text: step[2].trim() })
  }
  specCache.set(relPath, byHeading)
  return byHeading
}

/* ------------------------------------------------------------- assemble --- */

const domains = {}
let totalAdded = 0
const unknownAreas = new Set()
const fileCounts = new Map()

for (const commit of commits) {
  // The row a commit belongs to, by matching its subject against the row titles.
  const row = rows.find((r) => commit.subject.includes(r.title.slice(0, 40)))
  if (row) row.commit = commit.sha

  for (const [relPath, headings] of addedHeadings(commit.sha)) {
    const area = relPath.split('/')[0]
    const domain = SPEC_AREA_DOMAIN[area]
    if (!domain) {
      unknownAreas.add(area)
      continue
    }

    if (!domains[domain]) {
      domains[domain] = { domain, title: DOMAIN_TITLE[domain] || domain, scenarios: [], files: [], rows: [] }
    }
    const bucket = domains[domain]

    fileCounts.set(relPath, (fileCounts.get(relPath) || 0) + headings.length)
    totalAdded += headings.length

    const inFile = scenariosOf(relPath)
    for (const heading of headings) {
      const found = inFile.get(heading)
      if (!found) {
        warnings.push(
          'scenario "' + heading + '" was added to ' + relPath + ' by ' + commit.sha.slice(0, 8) +
            ' but no longer reads that way — renamed or removed since; counted, text not available'
        )
        bucket.scenarios.push({ heading, id: null, steps: [], file: relPath, row: row ? row.id : null, missing: true })
        continue
      }
      bucket.scenarios.push({
        heading: found.heading,
        id: found.id,
        steps: found.steps,
        file: relPath,
        row: row ? row.id : null,
        missing: false
      })
    }
    if (row && !bucket.rows.includes(row.id)) bucket.rows.push(row.id)
  }
}

if (unknownAreas.size) {
  fail(
    'openspec areas with no domain mapping: ' + [...unknownAreas].join(', ') +
      '. Add them to SPEC_AREA_DOMAIN in derive-scenarios.mjs — a theme must not be split with an area silently dropped.'
  )
}

// Per-domain file tables, biggest first, with a link to the file on this branch.
for (const bucket of Object.values(domains)) {
  const seen = new Map()
  for (const scenario of bucket.scenarios) seen.set(scenario.file, fileCounts.get(scenario.file))
  bucket.files = [...seen]
    .map(([relPath, added]) => ({
      path: relPath,
      added,
      url: GITHUB_BLOB + '/' + branch + '/openspec/specs/' + relPath
    }))
    .sort((a, b) => b.added - a.added || a.path.localeCompare(b.path))
  bucket.scenarioCount = bucket.scenarios.length
  bucket.fileCount = bucket.files.length
}

/**
 * Which domains' tickets a row belongs in.
 *
 * A row's own services decide it: the domains of the repositories it changed
 * that carry a domain word. A shared component coming along for the ride does
 * not widen a row that already belongs somewhere — a row changing the animals
 * frontend and the test suite is an animals row, not a plants one.
 *
 * A row that changed only shared components is genuinely cross-cutting, so it
 * goes in every domain's ticket. A row that changed only test suites goes in
 * none.
 */
const allDomains = Object.keys(domains).sort()
for (const row of rows) {
  if (row.testOnly || row.domains.length) continue
  row.domains = [...allDomains]
  row.attributedBy = 'shared-component'
}

for (const bucket of Object.values(domains)) {
  bucket.rows = rows
    .filter((row) => !row.testOnly && row.domains.includes(bucket.domain))
    .map((row) => row.id)
    .sort()
}

/* --------------------------------------------------------------- checks --- */

const perDomainSum = Object.values(domains).reduce((n, d) => n + d.scenarioCount, 0)
if (perDomainSum !== totalAdded) {
  fail(
    'per-domain scenarios sum to ' + perDomainSum + ' but the theme added ' + totalAdded +
      '. A scenario has been dropped or double-counted; the split is not safe to publish.'
  )
}

const output = {
  theme,
  workarea,
  branch,
  commits: commits.map((c) => ({ sha: c.sha.slice(0, 8), subject: c.subject })),
  totals: {
    scenarios: totalAdded,
    files: fileCounts.size,
    rows: rows.length,
    domains: Object.keys(domains).length
  },
  domains,
  rows,
  warnings,
  checks: {
    scenarioSum: 'ok',
    perDomainSum,
    unknownAreas: []
  }
}

process.stdout.write(JSON.stringify(output, null, 2) + '\n')
