/**
 * Builds data.js for the Design Release 2.1 build-order page.
 *
 * Everything the page shows is derived here from the backlogs, so the page stays
 * true as themes are built. Nothing is hand-maintained except themes.meta.json,
 * which supplies each theme's display name and Jira ticket.
 *
 * What it works out:
 *   - every theme, its rows and how many are done, blocked, deferred or dropped;
 *   - which themes a theme waits on, from the rows' own dependsOn and
 *     externalDependsOn;
 *   - each theme's level, as the longest path from a theme that waits on nothing;
 *   - the transitive reduction, so the page draws a dependency once rather than
 *     once per path that already implies it;
 *   - which themes have every dependency met and can start now;
 *   - the geometry: node boxes, and an orthogonal route for every drawn line.
 *
 * Run it with `npm run build` in this folder, then republish the page.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const pageDir = path.resolve(here, '..')
const workarea = path.resolve(pageDir, '..', '..')

const META_FILE = path.join(here, 'themes.meta.json')
const TICKETS_FILE = path.join(workarea, 'tickets', 'tickets.json')
const OUT_FILE = path.join(pageDir, 'data.js')

const JIRA_BROWSE = 'https://eaflood.atlassian.net/browse'

/**
 * How each domain reads on a theme's card: a glyph a reader can tell apart at a
 * glance, and the words behind it for the legend and the accessible label.
 *
 * "stub" is not a domain. It is a theme whose only ticket is the one raised at
 * split time to supply the branch name, not yet split by domain — worth showing,
 * because a card with only a stub is a card whose business ticket is still a
 * placeholder.
 *
 * "common" is not a domain either. It is a ticket summarising behaviour both
 * frontends share, already counted in the theme's domain tickets.
 */
const DOMAIN_BADGE = {
  animals: { emoji: '🐄', label: 'Live animals' },
  plants: { emoji: '🌱', label: 'High-risk plants' },
  ins: { emoji: '🚪', label: 'Front door' },
  admin: { emoji: '🗂️', label: 'Animals admin' },
  common: { emoji: '🔗', label: 'Common to both frontends' },
  stub: { emoji: '🎫', label: 'Stub only, not yet split by domain' }
}

const DOMAIN_ORDER = ['animals', 'plants', 'ins', 'admin', 'common', 'stub']

/* ---------------------------------------------------------------- reading --- */

/**
 * Reads a JSON file, failing loudly. A silent fallback here would publish a page
 * with themes or rows missing and no sign anything went wrong.
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

const meta = readJson(META_FILE).themes
const files = backlogFiles()

const rows = []
for (const file of files) {
  const backlog = readJson(file)
  if (!Array.isArray(backlog.increments)) throw new Error('no increments in ' + file)
  for (const inc of backlog.increments) rows.push({ ...inc, from: path.relative(workarea, file) })
}

const seen = new Map()
for (const row of rows) {
  if (seen.has(row.id)) {
    throw new Error('row ' + row.id + ' appears in both ' + seen.get(row.id) + ' and ' + row.from)
  }
  seen.set(row.id, row.from)
}

/* --------------------------------------------------------------- counting --- */

const themeOfRow = new Map(rows.map((row) => [row.id, row.theme]))

/** The theme counter each backlog status adds to, one entry per status in the backlog schema. */
const COUNTER_OF_STATUS = {
  todo: 'todo',
  done: 'done',
  blocked: 'blocked',
  deferred: 'deferred',
  dropped: 'dropped',
  rejected: 'rejected',
  'merged-into': 'merged'
}

const themes = new Map()
for (const row of rows) {
  if (!row.theme) throw new Error('row ' + row.id + ' has no theme')
  if (!themes.has(row.theme)) {
    themes.set(row.theme, {
      id: row.theme,
      rows: 0,
      done: 0,
      todo: 0,
      blocked: 0,
      deferred: 0,
      dropped: 0,
      rejected: 0,
      merged: 0
    })
  }
  const counter = COUNTER_OF_STATUS[row.status]
  if (!counter) throw new Error('row ' + row.id + ' has unknown status ' + row.status)
  const theme = themes.get(row.theme)
  theme.rows += 1
  theme[counter] += 1
}

// Which Jira ticket covers which theme, per domain. Absent on a programme whose
// tickets have not been written yet, which is not an error — the cards simply
// carry no ticket rows.
const ticketsByTheme = fs.existsSync(TICKETS_FILE) ? readJson(TICKETS_FILE).themes || {} : {}

for (const theme of themes.values()) {
  if (!meta[theme.id]) throw new Error('no themes.meta.json entry for theme ' + theme.id)
  theme.name = meta[theme.id].name
  theme.ticket = meta[theme.id].ticket
  // Dropped, rejected and merged rows sit outside the total: they are not work anyone will do.
  theme.excluded = theme.dropped + theme.rejected + theme.merged
  theme.live = theme.rows - theme.excluded

  const forTheme = ticketsByTheme[theme.id] || {}
  theme.tickets = Object.keys(forTheme)
    .sort((a, b) => DOMAIN_ORDER.indexOf(a) - DOMAIN_ORDER.indexOf(b))
    .map((domain) => {
      const badge = DOMAIN_BADGE[domain]
      if (!badge) {
        throw new Error(
          'tickets.json gives theme ' + theme.id + ' a ticket for "' + domain +
            '", which has no badge. Add it to DOMAIN_BADGE in make-data.mjs rather than letting a card show a ticket nobody can place.'
        )
      }
      return {
        domain,
        key: forTheme[domain],
        url: JIRA_BROWSE + '/' + forTheme[domain],
        emoji: badge.emoji,
        label: badge.label
      }
    })
}

/* ----------------------------------------------------------------- graph ---- */

/**
 * Theme-to-theme dependencies, from the cross-row dependencies of rows still to
 * be worked. A dropped, rejected or merged row orders nothing.
 */
const NOT_WORK = new Set(['dropped', 'rejected', 'merged-into'])
const edges = new Set()
for (const row of rows) {
  if (NOT_WORK.has(row.status)) continue
  const deps = [...(row.dependsOn || []), ...(row.externalDependsOn || []).map((dep) => dep.id)]
  for (const dep of deps) {
    const parent = themeOfRow.get(dep)
    if (!parent || parent === row.theme) continue
    edges.add(parent + '>' + row.theme)
  }
}

const pairs = [...edges].map((edge) => edge.split('>'))
const parentsOf = new Map([...themes.keys()].map((id) => [id, []]))
const childrenOf = new Map([...themes.keys()].map((id) => [id, []]))
for (const [parent, child] of pairs) {
  parentsOf.get(child).push(parent)
  childrenOf.get(parent).push(child)
}

/** Longest path from a root, so a theme always sits below everything it waits on. */
const levelCache = new Map()
function levelOf(id, trail = []) {
  if (levelCache.has(id)) return levelCache.get(id)
  if (trail.includes(id)) throw new Error('dependency cycle: ' + [...trail, id].join(' -> '))
  const parents = parentsOf.get(id)
  const level = parents.length === 0 ? 1 : 1 + Math.max(...parents.map((p) => levelOf(p, [...trail, id])))
  levelCache.set(id, level)
  return level
}
for (const id of themes.keys()) themes.get(id).level = levelOf(id)

/** Everything a theme waits on, directly or through another theme. */
function ancestorsOf(id) {
  const found = new Set()
  const stack = [...parentsOf.get(id)]
  while (stack.length) {
    const next = stack.pop()
    if (found.has(next)) continue
    found.add(next)
    stack.push(...parentsOf.get(next))
  }
  return found
}

/**
 * Drops a dependency the graph already implies: if a theme reaches its parent
 * through any other parent, the direct line repeats what is already drawn.
 */
const reduced = pairs.filter(([parent, child]) => {
  return !parentsOf.get(child).some((other) => other !== parent && ancestorsOf(other).has(parent))
})

for (const id of themes.keys()) {
  const theme = themes.get(id)
  theme.follows = reduced.filter(([, child]) => child === id).map(([parent]) => parent)
  theme.followsAll = [...parentsOf.get(id)].sort()
  theme.inherits = ancestorsOf(id).size
}

/* ----------------------------------------------------------------- state ---- */

for (const theme of themes.values()) {
  if (theme.live > 0 && theme.done === theme.live) theme.state = 'done'
  else if (theme.done > 0) theme.state = 'part'
  else if (theme.blocked > 0 && theme.blocked >= theme.live / 2) theme.state = 'blocked'
  else theme.state = 'open'
}

// Ready means every theme it waits on is finished, so nothing stops it starting.
// This needs its own pass: it reads other themes' state, which the loop above
// only finishes assigning once it has been round them all.
for (const theme of themes.values()) {
  theme.ready =
    theme.state === 'open' &&
    theme.followsAll.length > 0 &&
    theme.followsAll.every((parent) => themes.get(parent).state === 'done')
}

/* -------------------------------------------------------------- geometry ---- */

const NODE_W = 150
const NODE_H = 60
const TICKET_ROW_H = 15
const TICKET_PAD = 7
const CORRIDOR = 64
const TOP = 44
const CANVAS_W = 900
const LANE_GAP = 16
const CLEARANCE = 14

/** A card is as tall as its ticket rows need; one with no tickets stays short. */
const heightOf = (theme) =>
  theme.tickets.length ? NODE_H + TICKET_PAD + theme.tickets.length * TICKET_ROW_H : NODE_H

const levels = [...new Set([...themes.values()].map((theme) => theme.level))].sort((a, b) => a - b)

/**
 * Orders each level so a theme sits near the themes it waits on. Two barycentre
 * passes are enough at this size and keep the result stable run to run.
 */
const order = new Map(levels.map((level) => [level, [...themes.values()].filter((t) => t.level === level).map((t) => t.id).sort()]))

for (let pass = 0; pass < 2; pass += 1) {
  for (const level of levels.slice(1)) {
    const above = order.get(level - 1) || []
    const indexAbove = new Map(above.map((id, i) => [id, i]))
    const scored = order.get(level).map((id) => {
      const anchors = parentsOf.get(id).map((p) => indexAbove.get(p)).filter((i) => i !== undefined)
      const score = anchors.length ? anchors.reduce((a, b) => a + b, 0) / anchors.length : above.length / 2
      return { id, score }
    })
    scored.sort((a, b) => a.score - b.score || a.id.localeCompare(b.id))
    order.set(level, scored.map((entry) => entry.id))
  }
}

// Each level starts a clear corridor below the tallest card of the one above,
// so a level holding a three-ticket card pushes the rest of the diagram down
// rather than overlapping it.
const levelHeight = new Map(
  levels.map((level) => [level, Math.max(...order.get(level).map((id) => heightOf(themes.get(id))))])
)

const levelTop = new Map()
levels.forEach((level, i) => {
  const previous = levels[i - 1]
  levelTop.set(level, i === 0 ? TOP : levelTop.get(previous) + levelHeight.get(previous) + CORRIDOR)
})

/** The clear band below a level, where a line may run sideways. */
const corridorOf = (level) => ({
  from: levelTop.get(level) + levelHeight.get(level),
  to: levelTop.get(level + 1) ?? levelTop.get(level) + levelHeight.get(level) + CORRIDOR
})

const box = new Map()
for (const level of levels) {
  const ids = order.get(level)
  const gap = (CANVAS_W - ids.length * NODE_W) / (ids.length + 1)
  ids.forEach((id, i) => {
    const x = Math.round(gap + i * (NODE_W + gap))
    const y = levelTop.get(level)
    const h = heightOf(themes.get(id))
    box.set(id, { x, y, w: NODE_W, h, cx: x + NODE_W / 2, top: y, bottom: y + h })
  })
}

/** True when a straight vertical at x would run through a node between two rows. */
function columnIsClear(x, fromY, toY) {
  for (const [id, b] of box) {
    if (b.bottom <= fromY || b.top >= toY) continue
    if (x > b.x - CLEARANCE && x < b.x + b.w + CLEARANCE) return { blockedBy: id }
  }
  return null
}

/** The nearest x to `near` that can carry a vertical line down the given rows. */
function freeColumn(near, fromY, toY) {
  if (!columnIsClear(near, fromY, toY)) return near
  for (let step = 10; step <= CANVAS_W; step += 10) {
    for (const candidate of [near + step, near - step]) {
      if (candidate < -40 || candidate > CANVAS_W + 60) continue
      if (!columnIsClear(candidate, fromY, toY)) return candidate
    }
  }
  return near
}

// Spread each node's lines across its own edges so two never leave the same point.
const exits = new Map()
const entries = new Map()
for (const [parent, child] of reduced) {
  if (!exits.has(parent)) exits.set(parent, [])
  if (!entries.has(child)) entries.set(child, [])
  exits.get(parent).push(child)
  entries.get(child).push(parent)
}
for (const [id, list] of exits) list.sort((a, b) => box.get(a).cx - box.get(b).cx)
for (const [id, list] of entries) list.sort((a, b) => box.get(a).cx - box.get(b).cx)

/** Spaces n connection points across a node's edge, inside its corners. */
function slot(id, list) {
  const b = box.get(id)
  const usable = b.w - 40
  const n = list.length
  return (other) => {
    const i = list.indexOf(other)
    if (n === 1) return b.cx
    return Math.round(b.x + 20 + (usable * i) / (n - 1))
  }
}

const laneUsage = new Map()

/** Picks a horizontal lane in the gap below a row that no other line is using. */
function lane(level, span) {
  const { from: gapTop, to: gapBottom } = corridorOf(level)
  const slots = Math.max(1, Math.floor((gapBottom - gapTop) / LANE_GAP) - 1)
  if (!laneUsage.has(level)) laneUsage.set(level, [])
  const used = laneUsage.get(level)
  for (let i = 0; i < slots; i += 1) {
    const y = gapTop + LANE_GAP * (i + 1)
    const clash = used.some((entry) => entry.y === y && entry.from < span[1] && span[0] < entry.to)
    if (!clash) {
      used.push({ y, from: span[0], to: span[1] })
      return y
    }
  }
  return gapTop + Math.round((gapBottom - gapTop) / 2)
}

const paths = []
for (const [parent, child] of reduced) {
  const from = box.get(parent)
  const to = box.get(child)
  const exitX = slot(parent, exits.get(parent))(child)
  const entryX = slot(child, entries.get(child))(parent)
  const spansOneRow = themes.get(child).level - themes.get(parent).level === 1

  if (spansOneRow && exitX === entryX) {
    paths.push({ parent, child, d: `M ${exitX} ${from.bottom} V ${to.top}` })
    continue
  }

  if (spansOneRow) {
    const y = lane(themes.get(parent).level, [Math.min(exitX, entryX), Math.max(exitX, entryX)])
    paths.push({ parent, child, d: `M ${exitX} ${from.bottom} V ${y} H ${entryX} V ${to.top}` })
    continue
  }

  // Crossing more than one row: drop into the first gap, run across to a column
  // that is clear all the way down, then come back in along the row above.
  const firstLane = lane(themes.get(parent).level, [Math.min(exitX, entryX), Math.max(exitX, entryX)])
  const column = freeColumn(entryX, firstLane, to.top - 1)
  const parts = [`M ${exitX} ${from.bottom}`, `V ${firstLane}`]
  if (column !== exitX) parts.push(`H ${column}`)
  if (column !== entryX) {
    // Come back in along the gap above the child, so the turn is not inside a row.
    const lastLane = lane(themes.get(child).level - 1, [Math.min(column, entryX), Math.max(column, entryX)])
    parts.push(`V ${lastLane}`, `H ${entryX}`)
  }
  parts.push(`V ${to.top}`)
  paths.push({ parent, child, d: parts.join(' ') })
}

/* ----------------------------------------------------------------- totals --- */

const all = [...themes.values()]
const totals = {
  themes: all.length,
  levels: levels.length,
  rows: all.reduce((n, t) => n + t.rows, 0),
  live: all.reduce((n, t) => n + t.live, 0),
  done: all.reduce((n, t) => n + t.done, 0),
  blocked: all.reduce((n, t) => n + t.blocked, 0),
  deferred: all.reduce((n, t) => n + t.deferred, 0),
  dropped: all.reduce((n, t) => n + t.dropped, 0),
  rejected: all.reduce((n, t) => n + t.rejected, 0),
  merged: all.reduce((n, t) => n + t.merged, 0),
  excluded: all.reduce((n, t) => n + t.excluded, 0),
  ticketed: all.filter((t) => t.ticket).length,
  ready: all.filter((t) => t.ready).length,
  edgesRecorded: pairs.length,
  edgesDrawn: reduced.length
}
totals.percent = Math.round((totals.done / totals.live) * 100)

const data = {
  // Date only, so a rebuild on the same day is not a diff.
  generatedAt: new Date().toISOString().slice(0, 10),
  totals,
  levels,
  themes: all.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)),
  geometry: {
    nodeW: NODE_W,
    nodeH: NODE_H,
    canvasW: CANVAS_W,
    viewBox: `-60 10 ${CANVAS_W + 140} ${
      levelTop.get(levels[levels.length - 1]) + levelHeight.get(levels[levels.length - 1]) + 40
    }`,
    boxes: Object.fromEntries([...box].map(([id, b]) => [id, { x: b.x, y: b.y, w: b.w, h: b.h, cx: b.cx }])),
    // The axis labels each level against where its cards actually start, since
    // a level holding a tall card is no longer a fixed pitch from the last.
    levelBands: Object.fromEntries(levels.map((level) => [level, { top: levelTop.get(level), height: levelHeight.get(level) }])),
    ticketRowH: TICKET_ROW_H,
    ticketPad: TICKET_PAD,
    top: TOP,
    paths
  },
  sources: files.map((file) => path.relative(workarea, file))
}

fs.writeFileSync(OUT_FILE, 'window.DR21_BUILD_ORDER = ' + JSON.stringify(data, null, 2) + '\n')

console.log(
  'build-order data written: ' +
    totals.themes +
    ' themes over ' +
    totals.levels +
    ' levels, ' +
    totals.done +
    ' of ' +
    totals.live +
    ' rows built (' +
    totals.percent +
    '%), ' +
    totals.edgesDrawn +
    ' of ' +
    totals.edgesRecorded +
    ' dependencies drawn'
)
for (const theme of data.themes) {
  if (theme.ready) console.log('  ready to start: ' + theme.name + ' (' + theme.live + ' rows)')
}
