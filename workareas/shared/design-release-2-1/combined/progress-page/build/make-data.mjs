/**
 * Builds data.js for the Design Release 2.1 progress page.
 *
 * The page is a theme index: an overview of where the build stands, then one
 * page per theme listing its rows. Everything countable is derived here from
 * the backlogs, so the page stays true as rows are built. Three inputs are not
 * derived, and each has its own file:
 *
 *   - editorial.json, the copy no backlog records: each theme's background,
 *     the blocker groupings, the open design questions and the page's own
 *     standing notes;
 *   - prs.json, fetched from GitHub by fetch-prs.sh, because a row records the
 *     pull request it was built in but not what later became of it;
 *   - delivery.meta.json, the extra branches a theme split into per-ticket
 *     pull requests was delivered on.
 *
 * Theme names and tickets come from the build-order page's themes.meta.json,
 * so both pages name a theme the same way from one file.
 *
 * Run it with `npm run build` in this folder, then `npm run check`, then
 * republish the page.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readScope, inputFile, writeScopedPage } from '../../scope.mjs'

const canonicalBuild = path.dirname(fileURLToPath(import.meta.url))
const canonicalPage = path.resolve(canonicalBuild, '..')
const combined = path.resolve(canonicalPage, '..')
const workarea = path.resolve(combined, '..')

// The build directory to work in, so a journey copy of the page can run this
// same generator over its own scope. Defaults to this generator's own.
const here = process.argv[2] ? path.resolve(process.argv[2]) : canonicalBuild
const pageDir = path.resolve(here, '..')

const scope = readScope(here)

const EDITORIAL_FILE = inputFile(here, canonicalBuild, 'editorial.json')
const PRS_FILE = inputFile(here, canonicalBuild, 'prs.json')
const DELIVERY_FILE = inputFile(here, canonicalBuild, 'delivery.meta.json')
const META_FILE = path.join(combined, 'build-order-page', 'build', 'themes.meta.json')
const SPLIT_FILE = path.join(workarea, 'themes', 'themes.json')
const TICKETS_FILE = path.join(workarea, 'tickets', 'tickets.json')
const OUT_FILE = path.join(pageDir, 'data.js')

const JIRA_BROWSE = 'https://eaflood.atlassian.net/browse'

/** The short label each repo reads as in a list of pull requests. */
const REPO_LABEL = {
  'trade-imports-animals-frontend': 'animals frontend',
  'trade-imports-animals-backend': 'animals backend',
  'trade-imports-ins-frontend': 'INS frontend',
  'trade-imports-ins-backend': 'INS backend',
  'trade-imports-plants-frontend': 'plants frontend',
  'trade-imports-plants-backend': 'plants backend',
  'trade-imports-ins-tests': 'tests',
  'trade-imports-stub': 'stub',
  'trade-imports-reference-data': 'reference-data',
  'trade-imports-performance-tests': 'performance tests',
  'trade-imports-address-book': 'address book',
  'trade-imports-defra-id-stub': 'Defra ID stub'
}

/* ---------------------------------------------------------------- reading --- */

/**
 * Reads a JSON file, failing loudly. A silent fallback here would publish a
 * page with rows or themes missing and no sign anything went wrong.
 */
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (err) {
    throw new Error('cannot read ' + file + ': ' + err.message)
  }
}

/** Every backlog in the workarea: the main one, then one per split-off theme. */
function backlogFiles() {
  const files = [path.join(workarea, 'backlog.json')]
  const themesDir = path.join(workarea, 'themes')
  for (const entry of fs.readdirSync(themesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const file = path.join(themesDir, entry.name, 'backlog.json')
    if (fs.existsSync(file)) files.push(file)
  }
  return files
}

const editorial = readJson(EDITORIAL_FILE)
const meta = readJson(META_FILE).themes
const splitThemes = readJson(SPLIT_FILE).themes || []
const splitById = new Map(splitThemes.map((theme) => [theme.id, theme]))
const ticketsByTheme = fs.existsSync(TICKETS_FILE) ? readJson(TICKETS_FILE).themes || {} : {}
const prsByBranch = readJson(PRS_FILE).branches || {}
const prsFetchedAt = readJson(PRS_FILE).fetchedAt
const delivery = readJson(DELIVERY_FILE).themes || {}

const files = backlogFiles()
const everyRow = []
for (const file of files) {
  const backlog = readJson(file)
  if (!Array.isArray(backlog.increments)) throw new Error('no increments in ' + file)
  for (const inc of backlog.increments) everyRow.push({ ...inc, from: path.relative(workarea, file) })
}

const rows = everyRow.filter(scope.keeps)
if (!rows.length) throw new Error('the scope in ' + path.join(here, 'scope.json') + ' keeps no rows at all')

/* ------------------------------------------------------------- row lookup --- */

/**
 * A row id is unique within one backlog, but two backlogs can carry the same
 * one: the split-off themes numbered their new rows from a sequence the parent
 * backlog was already using. A dependency is therefore read in the depending
 * row's own backlog first, which always lands on the row that was meant. A
 * clash that forces a lookup across backlogs throws instead of guessing.
 */
const rowInBacklog = new Map(rows.map((row) => [row.from + '#' + row.id, row]))

const rowsOfId = new Map()
for (const row of rows) {
  if (!rowsOfId.has(row.id)) rowsOfId.set(row.id, [])
  rowsOfId.get(row.id).push(row)
}

const sharedIds = [...rowsOfId]
  .filter(([, found]) => found.length > 1)
  .map(([id, found]) => ({ id, backlogs: found.map((row) => row.from).sort() }))
  .sort((a, b) => a.id.localeCompare(b.id))

/** The row a dependency names, read in the depending row's own backlog first. */
function dependency(backlog, dependencyId) {
  const sameBacklog = rowInBacklog.get(backlog + '#' + dependencyId)
  if (sameBacklog) return sameBacklog
  const found = rowsOfId.get(dependencyId) || []
  if (found.length === 0) return null
  if (found.length > 1) {
    throw new Error(
      'the dependency on ' + dependencyId + ' in ' + backlog + ' names no row in that backlog, and ' +
        dependencyId + ' is used by rows in themes ' +
        [...new Set(found.map((row) => row.theme))].sort().join(', ') +
        '. Renumber one of them before the page can say what waits on what.'
    )
  }
  return found[0]
}

/** Everything a row waits on, whichever field records it. */
function dependenciesOf(row) {
  const ids = [...(row.dependsOn || []), ...(row.externalDependsOn || []).map((dep) => dep.id)]
  return [...new Set(ids)].map((id) => dependency(row.from, id)).filter(Boolean)
}

/* --------------------------------------------------------------- statuses --- */

/**
 * How each backlog status reads on the page. "held" is the backlog's `deferred`:
 * a row withheld on purpose, not one waiting on anyone. Dropped, rejected and
 * merged rows are not work anyone will do, so they sit outside every total.
 */
const GROUP_OF_STATUS = {
  todo: 'todo',
  done: 'done',
  blocked: 'blocked',
  deferred: 'held',
  dropped: 'dropped',
  rejected: 'dropped',
  'merged-into': 'merged'
}

for (const row of rows) {
  const group = GROUP_OF_STATUS[row.status]
  if (!group) throw new Error('row ' + row.id + ' has unknown status ' + row.status)
  row.group = group
}

const isBuilt = (row) => row.group === 'done'

/** A row to build whose every dependency is built: nothing stops it starting. */
function startableNow(row) {
  return row.group === 'todo' && dependenciesOf(row).every(isBuilt)
}

/** For a row to build, the rows it waits on that are not built yet. */
function landsAfter(row) {
  return dependenciesOf(row)
    .filter((dep) => !isBuilt(dep))
    .map((dep) => ({ id: dep.id, theme: dep.theme, title: dep.title }))
}

/** The shape a row takes on the page: enough to list it and say what it waits on. */
function pageRow(row) {
  return {
    id: row.id,
    title: row.title,
    theme: row.theme,
    landsAfter: landsAfter(row),
    reviewPoint: Boolean(row.gate)
  }
}

/* ----------------------------------------------------------------- themes --- */

const themeIds = [...new Set(rows.map((row) => row.theme))]
for (const id of themeIds) {
  if (!meta[id]) {
    throw new Error(
      'no entry for theme ' + id + ' in ' + path.relative(workarea, META_FILE) +
        '. Add its name and ticket there rather than letting the page show a theme by its raw id.'
    )
  }
}

const themes = themeIds.map((id) => {
  const own = rows.filter((row) => row.theme === id)
  const split = splitById.get(id)
  const editorialTheme = editorial.themes[id] || {}
  return {
    id,
    // The split-off themes carry a sentence of a title; the rest have a short name.
    title: split && split.title ? split.title : meta[id].name,
    name: meta[id].name,
    why: editorialTheme.why || null,
    prose: editorialTheme.prose || null,
    splitOff: split ? { branch: split.branch, workarea: split.workarea } : null,
    staleBranch: Boolean(split && split.staleBranch),
    staleBranchNote: split && split.staleBranch ? split.staleBranch.note : null,
    done: own.filter((row) => row.group === 'done').map(pageRow),
    ready: own.filter((row) => row.group === 'todo').map(pageRow),
    held: own.filter((row) => row.group === 'held').map(pageRow),
    blocked: own.filter((row) => row.group === 'blocked').map(pageRow),
    dropped: own.filter((row) => row.group === 'dropped').map(pageRow),
    merged: own.filter((row) => row.group === 'merged').map(pageRow)
  }
})

const themeById = new Map(themes.map((theme) => [theme.id, theme]))

/** The themes a theme waits on, from its rows' own cross-theme dependencies. */
for (const theme of themes) {
  const waitsOn = new Set()
  for (const row of rows.filter((row) => row.theme === theme.id && row.group !== 'dropped' && row.group !== 'merged')) {
    for (const dep of dependenciesOf(row)) {
      if (dep.theme !== theme.id) waitsOn.add(dep.theme)
    }
  }
  theme.dependsOn = [...waitsOn].sort()
}

/**
 * A theme split off and now holding no rows: its rows were ported in full onto
 * another theme's, which carry their criteria. It is listed rather than shown
 * as a theme page, so a theme with a branch and open pull requests does not
 * simply vanish from the page.
 */
const themesWithRows = new Set(everyRow.map((row) => row.theme))
const retired = splitThemes
  .filter((theme) => !themesWithRows.has(theme.id))
  .map((theme) => ({
    id: theme.id,
    title: theme.title || (meta[theme.id] ? meta[theme.id].name : theme.id),
    branch: theme.branch,
    staleBranch: Boolean(theme.staleBranch)
  }))

/* ------------------------------------------------------- pull requests ----- */

/** Every pull request raised from the branches that deliver a theme. */
function pullRequestsFor(themeId) {
  const split = splitById.get(themeId)
  const extra = (delivery[themeId] || {}).branches || []
  const branches = [...new Set([...(split ? [split.branch] : []), ...extra])]
  return branches
    .flatMap((branch) => (prsByBranch[branch] || []).map((pr) => ({ ...pr, branch })))
    .map((pr) => {
      const label = REPO_LABEL[pr.repo]
      if (!label) {
        throw new Error(
          'pull request ' + pr.repo + ' #' + pr.number + ' is in a repo with no label. Add it to REPO_LABEL in ' +
            'make-data.mjs rather than letting the page show a bare repo name.'
        )
      }
      return { label, repo: pr.repo, number: pr.number, url: pr.url, state: pr.state, branch: pr.branch }
    })
    .sort((a, b) => a.branch.localeCompare(b.branch) || a.label.localeCompare(b.label))
}

for (const theme of themes) theme.prs = pullRequestsFor(theme.id)
for (const theme of retired) theme.prs = pullRequestsFor(theme.id)

/* ------------------------------------------------------------- the totals --- */

const counted = rows.filter((row) => row.group !== 'merged')
const live = counted.filter((row) => row.group !== 'dropped')
const built = live.filter(isBuilt)
const toBuild = live.filter((row) => row.group === 'todo')
const startable = toBuild.filter(startableNow)
const waiting = toBuild.filter((row) => !startableNow(row))
const held = live.filter((row) => row.group === 'held')
const blocked = live.filter((row) => row.group === 'blocked')
const dropped = counted.filter((row) => row.group === 'dropped')

/** How many rows to build wait on a given row, directly. */
const waitersOf = new Map()
for (const row of toBuild) {
  for (const dep of dependenciesOf(row)) {
    if (isBuilt(dep)) continue
    waitersOf.set(dep.id, (waitersOf.get(dep.id) || 0) + 1)
  }
}

const mostAwaited = [...waitersOf]
  .map(([id, waiters]) => {
    const found = rowsOfId.get(id) || []
    return { id, title: found.length ? found[0].title : id, waiters }
  })
  .sort((a, b) => b.waiters - a.waiters || a.id.localeCompare(b.id))
  .slice(0, 10)

/** The counts a theme shows in the progress table. */
function countsOf(themeId) {
  const own = rows.filter((row) => row.theme === themeId && row.group !== 'merged')
  const ownToBuild = own.filter((row) => row.group === 'todo')
  return {
    total: own.filter((row) => row.group !== 'dropped').length,
    done: own.filter(isBuilt).length,
    ready: ownToBuild.filter(startableNow).length,
    waiting: ownToBuild.filter((row) => !startableNow(row)).length,
    blocked: own.filter((row) => row.group === 'blocked').length,
    held: own.filter((row) => row.group === 'held').length,
    dropped: own.filter((row) => row.group === 'dropped').length
  }
}

/**
 * What a theme's row in the progress table says about it, in one or two
 * sentences: whether it is built, what it is waiting for, and whether its
 * branch still counts.
 */
function stateOf(theme) {
  const counts = countsOf(theme.id)
  const merged = theme.prs.filter((pr) => pr.state === 'MERGED').length
  const open = theme.prs.filter((pr) => pr.state === 'OPEN').length
  const lines = []

  if (counts.total > 0 && counts.done === counts.total) {
    lines.push(merged ? 'All rows built and merged to main.' : 'All rows built.')
  } else if (counts.done > 0) {
    lines.push(counts.done + ' of ' + counts.total + ' rows built' + (merged ? ' and merged to main' : '') + '.')
  } else if (counts.blocked === counts.total && counts.total > 0) {
    lines.push('Every row blocked.')
  } else {
    lines.push('Not started.')
  }

  if (theme.staleBranch) {
    lines.push(
      'Built once on ' + theme.splitOff.branch + ', which will not be merged: the rows went back to being unbuilt ' +
        'and the theme is played again on a fresh branch from main, taking code from the old one as each row’s ' +
        'salvage note says.' + (open ? ' Its ' + open + ' open pull requests are on that stale branch.' : '')
    )
  }

  if (counts.held) lines.push(counts.held + ' rows held for review.')
  if (counts.blocked && counts.blocked !== counts.total) lines.push(counts.blocked + ' rows blocked.')

  return lines.join('\n\n')
}

/** The Jira tickets covering a theme, per domain, newest split last. */
function ticketsOf(themeId) {
  const forTheme = ticketsByTheme[themeId] || {}
  return Object.keys(forTheme)
    .sort()
    .map((domain) => ({ domain, key: forTheme[domain], url: JIRA_BROWSE + '/' + forTheme[domain] }))
}

/* --------------------------------------------------------------- blockers --- */

/**
 * The blocker groups, each holding the blocked rows still in it. A group whose
 * rows have all moved on is dropped, and blocked rows no group claims are
 * gathered into one, so the page never silently loses a blocked row.
 */
const claimed = new Set()
const blockedGroups = []
for (const group of editorial.blockers) {
  const inGroup = blocked.filter((row) => group.rowIds.includes(row.id))
  for (const row of inGroup) claimed.add(row.id)
  if (!inGroup.length) continue
  blockedGroups.push({
    key: group.key,
    title: group.title,
    what: group.what,
    unblocks: group.unblocks,
    rows: inGroup.map((row) => ({ id: row.id, title: row.title, theme: row.theme }))
  })
}

const unclaimed = blocked.filter((row) => !claimed.has(row.id))
if (unclaimed.length) {
  blockedGroups.push({
    key: 'other',
    title: 'Waiting on something else',
    what: 'These rows are blocked, and no group in editorial.json claims them yet.\n\nRead each row’s notes in the backlog for what it waits on.',
    unblocks: 'Add them to a group in editorial.json, with what they wait on and what unblocks them.',
    rows: unclaimed.map((row) => ({ id: row.id, title: row.title, theme: row.theme }))
  })
}

/* ------------------------------------------------------------------- data --- */

const progressThemes = themes
  .filter((theme) => theme.splitOff)
  .map((theme) => {
    const tickets = ticketsOf(theme.id)
    return {
      id: theme.id,
      title: theme.title,
      ticket: meta[theme.id].ticket || (tickets.length ? tickets[0].key : null),
      ticketUrl: meta[theme.id].ticket
        ? JIRA_BROWSE + '/' + meta[theme.id].ticket
        : tickets.length
          ? tickets[0].url
          : null,
      tickets,
      branch: theme.splitOff.branch,
      staleBranch: theme.staleBranch,
      prs: theme.prs,
      counts: countsOf(theme.id),
      state: stateOf(theme)
    }
  })
  .sort((a, b) => a.title.localeCompare(b.title))

const unsplitThemes = themes.filter((theme) => !theme.splitOff)
const mainBacklog = unsplitThemes.reduce(
  (sum, theme) => {
    const counts = countsOf(theme.id)
    for (const key of Object.keys(sum)) if (key in counts) sum[key] += counts[key]
    return sum
  },
  { total: 0, done: 0, ready: 0, waiting: 0, blocked: 0, held: 0, dropped: 0 }
)
mainBacklog.note =
  editorial.page.mainBacklogNote +
  '\n\n' +
  unsplitThemes.length +
  ' themes: ' +
  unsplitThemes
    .map((theme) => theme.name)
    .sort()
    .join(', ') +
  '.'

/**
 * What the scope leaves out, so a journey copy can say so rather than looking
 * like the whole programme with fewer rows. A theme the scope drops entirely is
 * named; a theme it only thins is counted.
 */
const cutRows = everyRow.filter((row) => !scope.keeps(row))
const cutThemes = [...new Set(cutRows.map((row) => row.theme))]
  .map((id) => ({
    id,
    name: meta[id] ? meta[id].name : id,
    cut: cutRows.filter((row) => row.theme === id).length,
    whole: !themeById.has(id)
  }))
  .sort((a, b) => b.cut - a.cut || a.name.localeCompare(b.name))

const excluded = {
  rows: cutRows.length,
  themes: cutThemes.filter((theme) => theme.whole).length,
  thinned: cutThemes.filter((theme) => !theme.whole).length,
  byTheme: cutThemes
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const today = new Date()
const readableToday = today.getDate() + ' ' + MONTHS[today.getMonth()] + ' ' + today.getFullYear()

const data = {
  // Date only, so a rebuild on the same day is not a diff.
  generatedAt: today.toISOString().slice(0, 10),
  prsFetchedAt,
  backlogCount: files.length,
  progress: {
    asOf: readableToday,
    implemented: {
      done: built.length,
      total: live.length,
      percent: Math.round((built.length / live.length) * 1000) / 10,
      dropped: dropped.length
    },
    readyCount: startable.length,
    waitingCount: waiting.length,
    blockedCount: blocked.length,
    heldCount: held.length,
    droppedCount: dropped.length,
    rowsCounted: counted.length,
    heldReason: editorial.page.heldReason,
    themes: progressThemes,
    mainBacklog,
    combined: editorial.page.combined,
    readyRows: startable.map(pageRow),
    waitingRows: waiting.map((row) => ({ ...pageRow(row), waitsOn: landsAfter(row) })),
    mostAwaited,
    heldRows: held.map(pageRow),
    blockedGroups,
    droppedRows: dropped.map(pageRow),
    reviewLinks: editorial.page.reviewLinks
  },
  themes,
  retired,
  scope: { id: scope.id, title: scope.title, of: scope.of, rule: scope.rule },
  excluded,
  blockers: blockedGroups,
  questions: editorial.questions.filter((question) => themeById.has(question.theme)),
  staleProse: editorial.page.staleProse,
  sharedIds,
  sources: files.map((file) => path.relative(workarea, file))
}

fs.writeFileSync(OUT_FILE, 'window.DR21 = ' + JSON.stringify(data) + ';\n')

const scopedPage = writeScopedPage(pageDir, canonicalPage, scope)
if (scopedPage) console.log('page written from the whole-programme markup: ' + path.relative(workarea, scopedPage))

const p = data.progress
console.log(
  'progress data written: ' +
    themes.length +
    ' themes, ' +
    p.rowsCounted +
    ' rows counted, ' +
    p.implemented.done +
    ' of ' +
    p.implemented.total +
    ' built (' +
    p.implemented.percent +
    '%), ' +
    p.readyCount +
    ' ready, ' +
    p.waitingCount +
    ' waiting, ' +
    p.blockedCount +
    ' blocked, ' +
    p.heldCount +
    ' held, ' +
    p.droppedCount +
    ' dropped'
)
for (const theme of progressThemes) {
  if (theme.staleBranch) console.log('  stale branch: ' + theme.title + ' (' + theme.counts.total + ' rows to rebuild)')
}
for (const theme of retired) console.log('  retired, no rows left: ' + theme.title)
for (const shared of sharedIds) {
  console.log('  id used by more than one backlog: ' + shared.id + ' in ' + shared.backlogs.join(' and '))
}
if (scope.id !== 'all') {
  const rowWord = (n) => n + (n === 1 ? ' row' : ' rows')
  console.log(
    '  scope ' + scope.id + ' leaves out ' + rowWord(excluded.rows) + ': ' +
      excluded.themes + ' themes dropped whole, ' + excluded.thinned + ' thinned'
  )
  for (const theme of excluded.byTheme) {
    console.log('    ' + theme.name + ': ' + rowWord(theme.cut) + (theme.whole ? ', the whole theme' : ''))
  }
}
