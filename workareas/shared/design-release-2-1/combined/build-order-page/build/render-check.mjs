/**
 * Smoke test for the build-order page's renderer.
 *
 * The page draws itself from data.js, so a change to either one can leave a
 * blank or half-drawn page that only shows up after publishing. This runs the
 * page's own script against a stub DOM and the real data, then checks every
 * region filled and that the drawing has one box per theme and one line per
 * drawn dependency.
 *
 * Run it with `npm run check` in this folder, before republishing.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const pageDir = path.resolve(here, '..')

const html = fs.readFileSync(path.join(pageDir, 'index.html'), 'utf8')
const dataSource = fs.readFileSync(path.join(pageDir, 'data.js'), 'utf8')

/** The page's own inline script: the last script block, the one with no src. */
const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
if (blocks.length !== 1) throw new Error('expected exactly one inline script in index.html, found ' + blocks.length)
const pageScript = blocks[0][1]

/* ------------------------------------------------------------ stub DOM ----- */

function node(tag) {
  return {
    tag,
    attrs: {},
    children: [],
    textContent: '',
    innerHTML: '',
    setAttribute(key, value) {
      this.attrs[key] = String(value)
    },
    appendChild(child) {
      this.children.push(child)
      return child
    }
  }
}

const regions = [
  'standfirst',
  'asof',
  'figures',
  'plate',
  'badge-legend',
  'figcaption',
  'register',
  'readings',
  'provenance'
]
const byRegion = new Map(regions.map((id) => [id, node('div')]))

const documentStub = {
  createElement: (tag) => node(tag),
  createElementNS: (_ns, tag) => node(tag),
  getElementById: (id) => {
    if (!byRegion.has(id)) throw new Error('page asked for unknown region #' + id)
    return byRegion.get(id)
  }
}

const windowStub = {}
// The semicolon matters: without it the data assignment runs straight into the
// page script's opening bracket and calls the data object as a function.
// eslint-disable-next-line no-new-func
new Function('window', 'document', dataSource + ';\n' + pageScript)(windowStub, documentStub)

/* ------------------------------------------------------------- checks ------ */

const data = windowStub.DR21_BUILD_ORDER
const failures = []

const check = (ok, message) => {
  if (!ok) failures.push(message)
}

for (const id of regions) {
  const region = byRegion.get(id)
  const filled = region.innerHTML.length > 0 || region.textContent.length > 0 || region.children.length > 0
  check(filled, 'region #' + id + ' was left empty')
}

const svg = byRegion.get('plate').children.find((child) => child.tag === 'svg')
check(Boolean(svg), 'no svg was added to the plate')

if (svg) {
  const groups = svg.children.filter((child) => child.tag === 'g')
  const boxes = groups.flatMap((group) => group.children.filter((child) => child.tag === 'rect' && child.attrs.class && child.attrs.class.startsWith('node-box')))
  const lines = groups.flatMap((group) => group.children.filter((child) => child.tag === 'path'))

  check(
    boxes.length === data.totals.themes,
    'drew ' + boxes.length + ' theme boxes, expected ' + data.totals.themes
  )
  check(
    lines.length === data.totals.edgesDrawn,
    'drew ' + lines.length + ' dependency lines, expected ' + data.totals.edgesDrawn
  )
  check(Boolean(svg.attrs['aria-label']), 'the svg has no aria-label')
  check(svg.attrs.viewBox === data.geometry.viewBox, 'the svg viewBox does not match the generated geometry')

  // One link per ticket, each with an href and a label a screen reader can use.
  const links = groups.flatMap((group) => group.children.filter((child) => child.tag === 'a'))
  const expectedLinks = data.themes.reduce((n, theme) => n + theme.tickets.length, 0)
  check(
    links.length === expectedLinks,
    'drew ' + links.length + ' ticket links, expected ' + expectedLinks
  )
  check(
    links.every((link) => (link.attrs.href || '').startsWith('https://')),
    'a ticket link has no absolute href'
  )
  check(
    links.every((link) => Boolean(link.attrs['aria-label'])),
    'a ticket link has no aria-label'
  )
}

const registerRows = (byRegion.get('register').innerHTML.match(/<tr>/g) || []).length
check(
  registerRows === data.totals.themes,
  'register has ' + registerRows + ' rows, expected ' + data.totals.themes
)

const readingCount = (byRegion.get('readings').innerHTML.match(/class="reading/g) || []).length
check(readingCount >= 3, 'only ' + readingCount + ' readings rendered')

check(
  !byRegion.get('readings').innerHTML.includes('undefined'),
  'a reading rendered the word "undefined"'
)
check(
  !byRegion.get('register').innerHTML.includes('undefined'),
  'the register rendered the word "undefined"'
)

if (failures.length) {
  for (const failure of failures) console.error('FAIL  ' + failure)
  process.exit(1)
}

console.log(
  'render check passed: ' +
    data.totals.themes +
    ' boxes, ' +
    data.totals.edgesDrawn +
    ' lines, ' +
    data.themes.reduce((n, theme) => n + theme.tickets.length, 0) +
    ' ticket links, ' +
    registerRows +
    ' register rows, ' +
    readingCount +
    ' readings'
)
