const fs = require('fs')
const path = require('path')
const { META_DIR, slugify } = require('./fixtures')
const { BASE } = require('./journey')

const EVIDENCE_DIR = path.join(__dirname, '..', '..', '..', 'evidence', 'prototype')

/**
 * Stable kebab slug of a prototype URL path, with the Design Release 2.1 mount
 * stripped: /design-release-2.1/address-book/add/lookup → address-book-add-lookup.
 * The mount root (the overall dashboard) is "dashboard".
 */
function pageSlug (urlPath) {
  let p = urlPath.split('?')[0].split('#')[0]
  if (p.startsWith(BASE)) p = p.slice(BASE.length)
  const slug = slugify(p.replace(/\//g, '-'))
  return slug || 'dashboard'
}

async function settle (page) {
  await page.waitForLoadState('load')
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {})
  // Let CSS transitions (details, reveals, banners) finish before the shot.
  await page.waitForTimeout(250)
}

/**
 * Full-page screenshot of the current page state into evidence/prototype, plus
 * a record for evidence/prototype/index.json. `state` names the variant
 * (an error state, a reveal, a branch) and is appended as --<state>.
 */
async function capture (page, testInfo, state = '') {
  await settle(page)
  const url = new URL(page.url())
  const slug = pageSlug(url.pathname)
  const stateSlug = state ? slugify(state) : ''
  const file = `${slug}${stateSlug ? `--${stateSlug}` : ''}.png`

  // One screenshot per page state per run: the first test to reach a state owns it.
  const capturesFile = path.join(META_DIR, 'captures.jsonl')
  if (fs.existsSync(capturesFile) && fs.readFileSync(capturesFile, 'utf8').includes(`"file":"${file}"`)) {
    return
  }

  fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
  await page.screenshot({ path: path.join(EVIDENCE_DIR, file), fullPage: true })

  const heading = await page.locator('h1').first().innerText({ timeout: 2000 })
    .then((text) => text.replace(/\s+/g, ' ').trim())
    .catch(() => '')

  fs.mkdirSync(META_DIR, { recursive: true })
  fs.appendFileSync(capturesFile, JSON.stringify({
    slug,
    url: url.pathname + url.search,
    heading,
    state: stateSlug || 'default',
    file,
    spec: path.basename(testInfo.file).replace(/\.fit\.spec\.js$/, ''),
    test: testInfo.titlePath.slice(1).join(' › ')
  }) + '\n')
}

module.exports = { capture, pageSlug, EVIDENCE_DIR }
