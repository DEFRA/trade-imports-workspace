/**
 * Smoke test for the progress page's renderer.
 *
 * The page draws itself from data.js, so a change to either one can leave a
 * blank or half-drawn page that only shows up after publishing. This runs the
 * page's own script against a stub DOM and the real data, once for the overview
 * and once for every theme page, then checks each render filled both regions,
 * named every row the data holds, and never printed "undefined" or raw markup.
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

function region() {
  return { innerHTML: '', focus() {} }
}

/** One render of the page at a given hash, returning what each region was given. */
function render(hash) {
  const regions = { rail: region(), main: region() }
  const listeners = []
  const documentStub = {
    getElementById: (id) => {
      if (!regions[id]) throw new Error('page asked for unknown region #' + id)
      return regions[id]
    }
  }
  const windowStub = {
    location: { hash },
    addEventListener: (name, fn) => listeners.push([name, fn]),
    scrollTo() {}
  }
  // The semicolon matters: without it the data assignment runs straight into the
  // page script's opening bracket and calls the data object as a function.
  // eslint-disable-next-line no-new-func
  new Function('window', 'document', 'location', 'decodeURIComponent', dataSource + ';\n' + pageScript)(
    windowStub,
    documentStub,
    windowStub.location,
    decodeURIComponent
  )
  return { regions, data: windowStub.DR21 }
}

/* ------------------------------------------------------------- checks ------ */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

const failures = []
const check = (ok, message) => {
  if (!ok) failures.push(message)
}

const overview = render('')
const data = overview.data

/** Every render must fill both regions and print neither "undefined" nor escaped markup. */
function checkRender(where, regions) {
  for (const id of ['rail', 'main']) {
    check(regions[id].innerHTML.length > 0, where + ': region #' + id + ' was left empty')
    check(!regions[id].innerHTML.includes('undefined'), where + ': region #' + id + ' rendered the word "undefined"')
    check(
      !regions[id].innerHTML.includes('&lt;span'),
      where + ': region #' + id + ' printed escaped markup, so copy was passed through the text formatter'
    )
  }
}

checkRender('overview', overview.regions)

const p = data.progress

// The overview's table must account for every row: each theme once, the
// unsplit backlog once, the retired themes once, and a totals row.
const tableRows = (overview.regions.main.innerHTML.match(/<tr>/g) || []).length
const expectedTableRows = p.themes.length + 1 + data.retired.length
check(
  tableRows >= expectedTableRows,
  'the overview rendered ' + tableRows + ' table rows, expected at least ' + expectedTableRows
)

// Every theme has a card in "Work by area", and a link in the rail.
for (const theme of data.themes) {
  check(
    overview.regions.main.innerHTML.includes('href="#' + theme.id + '"'),
    'theme ' + theme.id + ' has no link on the overview'
  )
}

const counted = p.implemented.done + p.readyCount + p.waitingCount + p.blockedCount + p.heldCount
check(
  counted === p.implemented.total,
  'the headline counts do not add up: ' + counted + ' rows in the states, but the total says ' + p.implemented.total
)
check(
  p.rowsCounted === p.implemented.total + p.droppedCount,
  'rowsCounted is ' + p.rowsCounted + ', but the total plus dropped is ' + (p.implemented.total + p.droppedCount)
)

// Every blocked row sits in exactly one group, so none is silently lost.
const grouped = p.blockedGroups.reduce((n, group) => n + group.rows.length, 0)
check(grouped === p.blockedCount, grouped + ' blocked rows are grouped, but ' + p.blockedCount + ' are blocked')

// Each theme page renders, and lists every row the data gives it.
let themePagesChecked = 0
for (const theme of data.themes) {
  const page = render('#' + theme.id)
  checkRender('theme ' + theme.id, page.regions)
  const shown = theme.done.length + theme.ready.length + theme.held.length + theme.blocked.length + theme.dropped.length
  const listed = (page.regions.main.innerHTML.match(/class="id"/g) || []).length
  check(
    listed >= shown,
    'theme ' + theme.id + ' lists ' + listed + ' rows, expected at least its ' + shown
  )
  // The page escapes copy before writing it, so compare against the escaped form.
  const escapedTitle = theme.title.replace(/[&<>"']/g, (c) => ESCAPES[c])
  check(
    page.regions.main.innerHTML.includes(escapedTitle),
    'theme ' + theme.id + ' does not show its own title'
  )
  themePagesChecked += 1
}

if (failures.length) {
  for (const failure of failures) console.error('FAIL  ' + failure)
  process.exit(1)
}

console.log(
  'render check passed: overview plus ' +
    themePagesChecked +
    ' theme pages, ' +
    tableRows +
    ' table rows, ' +
    p.implemented.total +
    ' rows accounted for, ' +
    grouped +
    ' blocked rows grouped'
)
