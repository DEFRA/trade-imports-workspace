/**
 * Smoke test for the journey map page's renderer.
 *
 * The page draws itself from data.js, so a change to either one can leave a
 * blank or half-drawn page that only shows up after publishing. This runs the
 * page's own script against a stub DOM and the real data, then checks every
 * region filled, that the spine holds one station per page and one chip per
 * theme on it, that the headline counts add up to the rows counted, and that
 * nothing rendered as `undefined`.
 *
 * Run it with `npm run check` in a journey's build folder, before republishing.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

// The page directory to check, so each journey's copy runs this same check over
// its own markup and data. Defaults to this check's own page.
const pageDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(here, '..')

const html = fs.readFileSync(path.join(pageDir, 'index.html'), 'utf8')
const dataSource = fs.readFileSync(path.join(pageDir, 'data.js'), 'utf8')

/** The page's own inline script: the one script block with no src. */
const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
if (blocks.length !== 1) {
  throw new Error('expected exactly one inline script in index.html, found ' + blocks.length)
}
const pageScript = blocks[0][1]

/* -------------------------------------------------------------- stub DOM --- */

function node(tag) {
  return {
    tag,
    attrs: {},
    dataset: {},
    classes: new Set(),
    children: [],
    textContent: '',
    set className(value) {
      this.classes = new Set(String(value).split(/\s+/).filter(Boolean))
    },
    get className() {
      return [...this.classes].join(' ')
    },
    classList: {
      toggle() {}
    },
    setAttribute(key, value) {
      this.attrs[key] = String(value)
    },
    getAttribute(key) {
      return this.attrs[key] ?? null
    },
    append(...children) {
      for (const child of children) {
        this.children.push(typeof child === 'object' ? child : node('#text', String(child)))
      }
    },
    appendChild(child) {
      this.children.push(child)
      return child
    },
    querySelectorAll() {
      return []
    }
  }
}

function textNode(text) {
  const created = node('#text')
  created.textContent = text
  return created
}

const regions = [
  'eyebrow',
  'heading',
  'standfirst',
  'meta',
  'tiles',
  'spine-list',
  'arriving',
  'cross-cutting-lede',
  'theme-rows',
  'footer'
]

// A card section can legitimately hold nothing — a journey's scope may leave it
// with no themes — so the page hides it instead, and the check reads the
// section itself rather than demanding content.
const sections = [
  { cards: 'cross-cutting', section: 'cross-cutting-section', items: () => data.cards.crossCutting },
  { cards: 'elsewhere', section: 'elsewhere-section', items: () => data.cards.elsewhere }
]

const byRegion = new Map(
  [
    ...regions,
    'elsewhere-heading',
    ...sections.flatMap((pair) => [pair.cards, pair.section])
  ].map((id) => [id, node('div')])
)

const documentStub = {
  title: '',
  createElement: (tag) => node(tag),
  createTextNode: (text) => textNode(text),
  getElementById: (id) => {
    if (!byRegion.has(id)) throw new Error('page asked for unknown region #' + id)
    return byRegion.get(id)
  },
  querySelectorAll: () => []
}

const windowStub = {}
// The semicolon matters: without it the data assignment runs straight into the
// page script's opening bracket and calls the data object as a function.
// eslint-disable-next-line no-new-func
new Function('window', 'document', dataSource + ';\n' + pageScript)(windowStub, documentStub)

/* ---------------------------------------------------------------- reading --- */

const data = windowStub.DATA
const failures = []
const check = (ok, message) => {
  if (!ok) failures.push(message)
}

/** Every node under one, the node itself included. */
function descendants(root) {
  const found = [root]
  for (const child of root.children) found.push(...descendants(child))
  return found
}

/** Everything a region would read as, so an "undefined" anywhere is caught. */
function textOf(root) {
  return descendants(root)
    .map((found) => found.textContent)
    .join(' ')
}

const withClass = (root, name) => descendants(root).filter((found) => found.classes.has(name))

/* ----------------------------------------------------------------- checks --- */

for (const id of regions) {
  const region = byRegion.get(id)
  const filled = region.children.length > 0 || region.textContent.length > 0
  check(filled, 'region #' + id + ' was left empty')
}

check(documentStub.title === data.scope.title, 'the page did not set its title to ' + data.scope.title)

const tiles = withClass(byRegion.get('tiles'), 'tile')
check(tiles.length === 4, 'rendered ' + tiles.length + ' summary tiles, expected 4')

const { landed, ahead, held, aside, rows } = data.summary
check(
  landed + ahead + held + aside === rows,
  'the tiles count ' + (landed + ahead + held + aside) + ' rows, but ' + rows + ' were counted'
)

const spine = byRegion.get('spine-list')
const bandLabels = withClass(spine, 'band')
const stations = withClass(spine, 'station')
const expectedPages = data.bands.reduce((sum, band) => sum + band.pages.length, 0)

check(
  bandLabels.length === data.bands.length,
  'drew ' + bandLabels.length + ' bands, expected ' + data.bands.length
)
check(
  stations.length === expectedPages,
  'drew ' + stations.length + ' stations, expected ' + expectedPages
)
check(
  expectedPages === data.summary.pages,
  'the data counts ' + data.summary.pages + ' pages but holds ' + expectedPages
)

const STATES = ['landed', 'ahead', 'waiting', 'part', 'none']
const chips = withClass(spine, 'chip')
const expectedChips = data.bands.reduce(
  (sum, band) => sum + band.pages.reduce((n, page) => n + page.themes.length, 0),
  0
)
check(chips.length === expectedChips, 'drew ' + chips.length + ' chips, expected ' + expectedChips)
check(
  chips.every((chip) => STATES.some((state) => chip.classes.has(state))),
  'a chip carries no state the page has a colour for'
)
check(
  chips.every((chip) => Boolean(chip.title)),
  'a chip has no hover title saying where its theme stands'
)

const arrivingCards = withClass(byRegion.get('arriving'), 'card')
check(
  arrivingCards.length === data.arriving.length,
  'drew ' + arrivingCards.length + ' arriving cards, expected ' + data.arriving.length
)
check(data.arriving.length > 0, '#arriving has nothing to say')

for (const pair of sections) {
  const items = pair.items()
  const drawn = withClass(byRegion.get(pair.cards), 'card')
  check(
    drawn.length === items.length,
    'drew ' + drawn.length + ' cards in #' + pair.cards + ', expected ' + items.length
  )
  check(
    byRegion.get(pair.section).hidden === (items.length === 0),
    '#' + pair.section + (items.length ? ' was hidden with cards in it' : ' was shown with no cards in it')
  )
}

check(
  byRegion.get('elsewhere-heading').textContent.includes(data.scope.of),
  'the "changes no page" heading does not name ' + data.scope.of
)

const registerRows = byRegion.get('theme-rows').children.filter((row) => row.tag === 'tr')
check(
  registerRows.length === data.summary.themes,
  'the register has ' + registerRows.length + ' rows, expected ' + data.summary.themes
)
check(
  registerRows.every((row) => row.children.length === 5),
  'a register row does not have all five columns'
)

// A theme the register leaves blank is one the page cannot say anything about.
for (const theme of data.register) {
  check(
    theme.pages.length > 0 || Boolean(theme.instead),
    theme.name + ' has no pages and no sentence saying what it changes instead'
  )
}

for (const [id, region] of byRegion) {
  const text = textOf(region)
  check(!text.includes('undefined'), 'region #' + id + ' rendered the word "undefined"')
  check(!text.includes('[object'), 'region #' + id + ' rendered an object instead of text')
}

if (failures.length) {
  for (const failure of failures) console.error('FAIL  ' + failure)
  process.exit(1)
}

console.log(
  'render check passed: ' + stations.length + ' stations in ' + bandLabels.length + ' bands, ' +
    chips.length + ' theme chips, ' +
    (data.arriving.length + data.cards.crossCutting.length + data.cards.elsewhere.length) +
    ' cards, ' + registerRows.length + ' register rows, ' + rows + ' rows accounted for'
)
