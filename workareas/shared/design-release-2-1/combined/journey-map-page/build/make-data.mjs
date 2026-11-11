/**
 * Builds data.js for the Design Release 2.1 journey map page.
 *
 * The page is a journey index: every page a trader walks, in the order the
 * service runs it, with the themes that change each one. Everything about
 * themes is derived here from the backlogs — which pages a theme touches, where
 * it stands, how many rows it carries, the wave it lands in — so the page stays
 * true as rows are built. One input is not derived:
 *
 *   - journey.json, the journey itself: each page's name, URL path, the band it
 *     groups under, and the folders it is made of. Themes attach to a page by
 *     those folders, so naming a page's folders is all a new page needs.
 *
 * Theme names and tickets come from the build-order page's themes.meta.json, so
 * all three pages name a theme the same way from one file.
 *
 * The opening run's order is read from the live animals frontend on main rather
 * than written down, so reordering the journey in code reorders it here.
 *
 * Run it with `npm run build` in a journey's build folder, then `npm run
 * check`, then republish the page.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readScope, inputFile, writeScopedPage } from '../../scope.mjs'
import { backlogFiles } from '../../deps.mjs'

const canonicalBuild = path.dirname(fileURLToPath(import.meta.url))
const canonicalPage = path.resolve(canonicalBuild, '..')
const combined = path.resolve(canonicalPage, '..')
const workarea = path.resolve(combined, '..')
const workspace = path.resolve(workarea, '..', '..', '..')

// The build directory to work in, so each journey's copy of the page runs this
// same generator over its own journey and its own scope.
const here = process.argv[2] ? path.resolve(process.argv[2]) : canonicalBuild
const pageDir = path.resolve(here, '..')

const scope = readScope(here)

const JOURNEY_FILE = inputFile(here, canonicalBuild, 'journey.json')
const META_FILE = path.join(combined, 'build-order-page', 'build', 'themes.meta.json')
const SPLIT_FILE = path.join(workarea, 'themes', 'themes.json')
const OUT_FILE = path.join(pageDir, 'data.js')

const JIRA_BROWSE = 'https://eaflood.atlassian.net/browse'

/* ---------------------------------------------------------------- reading --- */

/**
 * Reads a JSON file, failing loudly. A silent fallback here would publish a
 * page with pages or themes missing and no sign anything went wrong.
 */
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (err) {
    throw new Error('cannot read ' + file + ': ' + err.message)
  }
}

if (!fs.existsSync(JOURNEY_FILE)) {
  throw new Error(
    'no journey.json for ' + path.relative(workarea, here) +
      '. The journey map is drawn per journey, so run this from a journey build ' +
      'folder — animals/journey-map-page/build — not from the shared one.'
  )
}

const journey = readJson(JOURNEY_FILE)
const meta = readJson(META_FILE).themes
const split = readJson(SPLIT_FILE)
const splitById = new Map((split.themes || []).map((theme) => [theme.id, theme]))

const everyRow = []
for (const file of backlogFiles(workarea)) {
  const backlog = readJson(file)
  if (!Array.isArray(backlog.increments)) throw new Error('no increments in ' + file)
  for (const inc of backlog.increments) everyRow.push({ ...inc, from: path.relative(workarea, file) })
}

const rows = everyRow.filter(scope.keeps)
if (!rows.length) throw new Error('the scope in ' + path.join(here, 'scope.json') + ' keeps no rows at all')

/* ---------------------------------------------------------------- statuses --- */

/**
 * How each backlog status reads on the page. Dropped, rejected and merged rows
 * are not work anyone will do, so they say nothing about where a theme stands;
 * they are counted apart.
 */
const GROUP_OF_STATUS = {
  todo: 'ahead',
  done: 'landed',
  blocked: 'held',
  deferred: 'deferred',
  dropped: 'dropped',
  rejected: 'dropped',
  'merged-into': 'folded in'
}

const LIVE_GROUPS = ['landed', 'ahead', 'held']
const GROUP_ORDER = ['landed', 'ahead', 'held', 'deferred', 'dropped', 'folded in']

for (const row of rows) {
  const group = GROUP_OF_STATUS[row.status]
  if (!group) throw new Error('row ' + row.id + ' has unknown status ' + row.status)
  row.group = group
}

/* ------------------------------------------------------------------ themes --- */

const themeIds = [...new Set(rows.map((row) => row.theme))]
for (const id of themeIds) {
  if (!meta[id]) {
    throw new Error(
      'no entry for theme ' + id + ' in ' + path.relative(workarea, META_FILE) +
        '. Add its name and ticket there rather than letting the page show a theme by its raw id.'
    )
  }
}

/** The wave a theme lands in: the agreed landing order first, then its own field. */
const waveOfTheme = new Map()
for (const wave of split.landingOrder || []) {
  for (const id of wave.themes || []) waveOfTheme.set(id, String(wave.wave))
}

const waveDisagreements = []
function waveOf(id) {
  const agreed = waveOfTheme.get(id)
  const own = splitById.get(id)?.wave
  if (agreed && own !== undefined && String(own) !== agreed) {
    waveDisagreements.push({ id, agreed, own: String(own) })
  }
  return agreed || (own === undefined ? '—' : String(own))
}

/**
 * Where a theme stands, in one phrase: every bucket that holds rows, or "N of N"
 * when one bucket holds them all.
 */
function standsOf(counts, total) {
  const held = GROUP_ORDER.filter((group) => counts[group])
  if (held.length === 0) return 'no rows'
  if (held.length === 1) return total + ' of ' + total + ' ' + held[0]
  return held.map((group) => counts[group] + ' ' + group).join(', ')
}

/**
 * The one word the page colours a theme by. A theme with nothing left to build
 * has landed; one with nothing but held rows is waiting; one with held rows
 * beside work that can move is part way.
 */
function stateOf(counts) {
  const live = LIVE_GROUPS.reduce((sum, group) => sum + counts[group], 0)
  if (live === 0) return 'none'
  if (counts.landed === live) return 'landed'
  if (counts.held === live) return 'waiting'
  if (counts.held) return 'part'
  return 'ahead'
}

const themes = {}
for (const id of themeIds) {
  const own = rows.filter((row) => row.theme === id)
  const counts = Object.fromEntries(GROUP_ORDER.map((group) => [group, 0]))
  for (const row of own) counts[row.group] += 1
  themes[id] = {
    id,
    name: meta[id].name,
    ticket: meta[id].ticket,
    ticketUrl: meta[id].ticket ? JIRA_BROWSE + '/' + meta[id].ticket : null,
    wave: waveOf(id),
    rows: own.length,
    counts,
    state: stateOf(counts),
    stands: standsOf(counts, own.length)
  }
}

/* --------------------------------------------------------- page attribution --- */

/** A page's or a theme's folder, with journey.json's shorthand expanded. */
function expand(declared) {
  const [prefix, ...rest] = declared.split('/')
  const expanded = journey.pathPrefixes[prefix]
  if (!expanded) {
    throw new Error(
      'the path "' + declared + '" in journey.json starts with no prefix pathPrefixes knows. ' +
        'Add the prefix there, or spell the path with one of ' +
        Object.keys(journey.pathPrefixes).sort().join(', ') + '.'
    )
  }
  return rest.length ? expanded + '/' + rest.join('/') : expanded
}

/** Every folder a theme declares, across the backlog that holds its registry. */
const touchesOfTheme = new Map()
for (const file of backlogFiles(workarea)) {
  for (const theme of readJson(file).themes || []) {
    if (!theme.id) continue
    const found = touchesOfTheme.get(theme.id) || new Set()
    for (const touch of theme.touches || []) found.add(touch)
    touchesOfTheme.set(theme.id, found)
  }
}
for (const theme of split.themes || []) {
  const found = touchesOfTheme.get(theme.id) || new Set()
  for (const touch of theme.touches || []) found.add(touch)
  touchesOfTheme.set(theme.id, found)
}

/** One path contains the other, or they are the same file. A folder claims what is under it. */
const overlaps = (a, b) => a === b || a.startsWith(b + '/') || b.startsWith(a + '/')

/** The themes whose own folders meet one of a page's, named in order. */
function themesOn(paths) {
  const found = []
  for (const id of themeIds) {
    const touches = [...(touchesOfTheme.get(id) || [])]
    if (paths.some((page) => touches.some((touch) => overlaps(touch, page)))) found.push(id)
  }
  return found.sort((a, b) => themes[a].name.localeCompare(themes[b].name))
}

/* ------------------------------------------------- the opening run, in code --- */

/**
 * The opening run's ordered page slugs, read from the frontend's own flow. The
 * run is a list of page objects, each exported from its feature's page.js with
 * an id and a slug, so the two shapes together give the order without running
 * the app.
 */
function openingRunSlugs() {
  const checkout = path.join(workspace, journey.set.checkout)
  if (!fs.existsSync(checkout)) return null

  const slugOfPage = new Map()
  const features = path.join(checkout, journey.set.features)
  for (const file of pageFiles(features)) {
    const source = fs.readFileSync(file, 'utf8')
    const declarations = source.matchAll(
      /export const (\w+)\s*=\s*\{[^}]*?slug:\s*'([^']*)'/gs
    )
    for (const [, name, slug] of declarations) slugOfPage.set(name, slug)
  }

  const run = fs.readFileSync(path.join(checkout, journey.set.run), 'utf8')
  const steps = run.slice(run.indexOf('RUN_STEPS'))
  return [...steps.matchAll(/id:\s*(\w+)\.id/g)]
    .map(([, name]) => slugOfPage.get(name))
    .filter((slug) => slug !== undefined)
}

/** Every page.js under a feature tree. */
function pageFiles(dir) {
  const found = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) found.push(...pageFiles(file))
    else if (entry.name === 'page.js') found.push(file)
  }
  return found
}

const runSlugs = openingRunSlugs()

/* ------------------------------------------------------------- the journey --- */

let pin = 0
const bands = journey.bands.map((band) => ({
  band: band.band,
  pages: band.pages.map((page) => {
    const paths = page.paths.map(expand)
    return {
      name: page.name,
      slug: page.slug,
      pin: band.numbered ? String(++pin) : '·',
      themes: themesOn(paths),
      note: page.note || null,
      paths
    }
  })
}))

const arriving = journey.arriving.map((page) => {
  const paths = page.paths.map(expand)
  return { name: page.name, body: page.body, themes: themesOn(paths), paths }
})

const everyPage = [...bands.flatMap((band) => band.pages), ...arriving]
const themesOnAPage = new Set(everyPage.flatMap((page) => page.themes))

/**
 * The band journey.json marks as the opening run has to be the opening run the
 * service actually walks. A page reordered, added or dropped in the frontend's
 * flow otherwise leaves the map quietly describing a journey nobody takes.
 */
const runBand = journey.bands.find((band) => band.runOrder)
if (runBand && runSlugs) {
  const declared = runBand.pages.map((page) => page.slug)
  if (declared.join(' > ') !== runSlugs.join(' > ')) {
    throw new Error(
      'the opening run in journey.json is not the one ' + journey.set.run + ' runs.\n' +
        '  journey.json: ' + declared.join(' > ') + '\n' +
        '  the frontend: ' + runSlugs.join(' > ') + '\n' +
        '  Put the band in the frontend\'s order, adding or removing pages to match.'
    )
  }
}

/* ----------------------------------------------- themes no page accounts for --- */

const claimed = new Map(journey.claims.map((claim) => [claim.theme, claim]))
const SECTIONS = ['crossCutting', 'elsewhere']

const unclaimed = themeIds.filter((id) => !themesOnAPage.has(id) && !claimed.has(id))
if (unclaimed.length) {
  throw new Error(
    'no page and no claim accounts for ' + unclaimed.sort().join(', ') +
      '. Either name the theme\'s folders on a page in journey.json, or add a claim ' +
      'there saying which section says what it changes instead.'
  )
}

const cards = Object.fromEntries(SECTIONS.map((section) => [section, []]))
const spentClaims = []
for (const claim of journey.claims) {
  if (!cards[claim.section]) {
    throw new Error(
      'the claim for ' + claim.theme + ' names section "' + claim.section +
        '", which the page has no room for. Use one of ' + SECTIONS.join(', ') + '.'
    )
  }
  if (!themes[claim.theme]) continue
  // A claim speaks only for a theme no page shows. Once a theme reaches a page
  // — because it gained a row, or a page gained one of its folders — the page
  // says it better, and the claim would contradict the section it sits in.
  if (themesOnAPage.has(claim.theme)) {
    spentClaims.push(claim.theme)
    continue
  }
  cards[claim.section].push({ theme: claim.theme, body: claim.body })
}

for (const section of SECTIONS) {
  cards[section].sort((a, b) => themes[a.theme].name.localeCompare(themes[b.theme].name))
}

/* ------------------------------------------------- the register, by theme --- */

const pageNamesOfTheme = new Map()
for (const band of bands) {
  for (const page of band.pages) {
    for (const id of page.themes) {
      if (!pageNamesOfTheme.has(id)) pageNamesOfTheme.set(id, [])
      pageNamesOfTheme.get(id).push(page.name)
    }
  }
}
for (const page of arriving) {
  for (const id of page.themes) {
    if (!pageNamesOfTheme.has(id)) pageNamesOfTheme.set(id, [])
    pageNamesOfTheme.get(id).push(page.name + ' (new)')
  }
}

const register = Object.values(themes)
  .map((theme) => ({
    ...theme,
    pages: pageNamesOfTheme.get(theme.id) || [],
    instead: pageNamesOfTheme.has(theme.id) ? null : claimed.get(theme.id).body
  }))
  .sort((a, b) => {
    const order = (wave) => (wave === '—' ? 99 : Number(wave))
    return order(a.wave) - order(b.wave) || a.name.localeCompare(b.name)
  })

/* ----------------------------------------------------------------- totals --- */

const totals = Object.fromEntries(GROUP_ORDER.map((group) => [group, 0]))
for (const row of rows) totals[row.group] += 1

const summary = {
  themes: themeIds.length,
  rows: rows.length,
  pages: bands.reduce((sum, band) => sum + band.pages.length, 0),
  arriving: arriving.length,
  landed: totals.landed,
  ahead: totals.ahead,
  held: totals.held,
  aside: totals.deferred + totals.dropped + totals['folded in']
}

/* ------------------------------------------------------------------ output --- */

const data = {
  builtAt: new Date().toISOString().slice(0, 10),
  scope: { id: scope.id, title: scope.title, of: scope.of, rule: scope.rule },
  standing: journey.standing,
  summary,
  themes,
  bands,
  arriving,
  cards,
  register,
  runInCode: runSlugs
}

fs.writeFileSync(OUT_FILE, 'window.DATA = ' + JSON.stringify(data, null, 2) + '\n')

const written = writeScopedPage(pageDir, canonicalPage, scope)
if (written) console.log('page written from the shared markup: ' + path.relative(workarea, written))

console.log(
  'journey map data written: ' + summary.pages + ' pages in ' + bands.length + ' bands, ' +
    summary.arriving + ' arriving, ' + summary.themes + ' themes, ' + summary.rows + ' rows (' +
    summary.landed + ' landed, ' + summary.ahead + ' ahead, ' + summary.held + ' held, ' +
    summary.aside + ' set aside)'
)

if (runSlugs === null) {
  console.log(
    '  the opening run was not checked: no checkout at ' + journey.set.checkout +
      '. Clone it to have the page prove its own page order.'
  )
}

for (const disagreement of waveDisagreements) {
  console.log(
    '  wave disagreement: ' + disagreement.id + ' is wave ' + disagreement.agreed +
      ' in the agreed landing order and wave ' + disagreement.own + ' in its own entry' +
      ' — the landing order is shown'
  )
}

for (const page of everyPage) {
  if (!page.themes.length) console.log('  no theme changes ' + page.name)
}

for (const theme of spentClaims) {
  console.log(
    '  claim not needed: ' + theme + ' now reaches a page, so the page says where it lands' +
      ' — delete its claim from journey.json'
  )
}
