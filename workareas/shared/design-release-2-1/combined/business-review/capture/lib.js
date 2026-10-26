const fs = require('fs')
const path = require('path')

// Hosts and canned user mirror trade-imports-ins-tests/playwright.docker-compose.config.ts
// and config/users.ts, so OIDC stays on one hostname (localhost).
const ANIMALS = 'http://localhost:3000'
const INS = 'http://localhost:3002'
const PLANTS = 'http://localhost:3003'
const BACKEND = process.env.TRADE_IMPORTS_ANIMALS_BACKEND_URL || 'http://localhost:8085'
const ADDRESS_BOOK = process.env.TRADE_IMPORTS_ADDRESS_BOOK_URL || 'http://localhost:8089'
const ORGANISATION_ID = '5900001'
const USER_ID = '2100010101'
const PASSWORD = process.env.AUTH_PASSWORD || 'Password123'
const PDF = path.resolve(__dirname, 'safe-file-1kb.pdf')

const SIDE = process.env.SIDE
if (!['before', 'after'].includes(SIDE)) throw new Error('Set SIDE=before or SIDE=after')

const OUT_DIR = path.resolve(__dirname, '..', 'screens', SIDE)
const FAILED_DIR = path.join(OUT_DIR, '_failed')
const MANIFEST = path.join(OUT_DIR, 'manifest.json')
const settle = { timeout: 30_000 }

fs.mkdirSync(OUT_DIR, { recursive: true })
fs.mkdirSync(FAILED_DIR, { recursive: true })
if (process.env.CLEAN === '1' && fs.existsSync(MANIFEST)) fs.rmSync(MANIFEST)

function readManifest() {
  return fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : []
}

function record(entry) {
  const entries = readManifest()
  const at = entries.findIndex((e) => e.key === entry.key)
  if (at >= 0) entries[at] = entry
  else entries.push(entry)
  fs.writeFileSync(MANIFEST, JSON.stringify(entries, null, 2) + '\n')
}

function isRecorded(key) {
  return readManifest().some((e) => e.key === key)
}

function dateText({ dayOffset = 0, monthOffset = 0 } = {}) {
  const d = new Date()
  d.setMonth(d.getMonth() + monthOffset)
  d.setDate(d.getDate() + dayOffset)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

function dateParts(offsets) {
  const [day, month, year] = dateText(offsets).split('/')
  return { day, month, year }
}

const exact = (text) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)

// ---- notes read from the DOM (cards.json alsoCapture) ----

async function backLinkHref(page) {
  const link = page.locator('a.govuk-back-link').first()
  return (await link.count()) ? link.getAttribute('href') : null
}

const optionTexts = (page, selector) =>
  page
    .locator(`${selector} option`)
    .allTextContents()
    .then((list) => list.map((t) => t.trim()))
    .catch(() => null)

async function regionLines(page) {
  const snapshot = await page.locator('body').ariaSnapshot()
  return snapshot.split('\n').filter((line) => /\bregion\b/.test(line)).map((line) => line.trim())
}

async function mainLinks(page) {
  return page.locator('main a').evaluateAll((links) =>
    links.map((a) => ({
      text: a.textContent.trim().replace(/\s+/g, ' '),
      ariaLabel: a.getAttribute('aria-label'),
      href: a.getAttribute('href'),
      target: a.getAttribute('target')
    }))
  )
}

const ALSO = {
  'a-origin-country-search': async (page) => ({ countryOptions: await optionTexts(page, 'select[name="countryOfOrigin"]') }),
  'a-import-reason-transit-reveal': async (page) => ({
    portOfExitOptions: await optionTexts(page, '#transitPortOfExit, #transitPortOfExit-select'),
    destinationCountryOptions: await optionTexts(page, '#transitDestinationCountry, #transitDestinationCountry-select')
  }),
  'a-import-reason-tempadmission-reveal': async (page) => ({
    portOfExitOptions: await optionTexts(page, '#temporaryAdmissionPortOfExit, #temporaryAdmissionPortOfExit-select')
  }),
  'a-import-reason-transhipment-reveal': async (page) => ({
    destinationCountryOptions: await optionTexts(page, '#transhipmentDestinationCountry, #transhipmentDestinationCountry-select')
  }),
  'a-arrival-empty': async (page) => ({
    meansOfTransportOptions: await page
      .getByLabel('Means of transport to the port of entry', { exact: true })
      .locator('option')
      .allTextContents()
      .then((l) => l.map((t) => t.trim()))
      .catch(() => null)
  }),
  'a-arrival-port-search': async (page) => ({ portOptions: await optionTexts(page, 'select[name="portOfEntry"]') }),
  'a-transit-search-subdivision': async (page) => ({ transitCountryOptions: await optionTexts(page, 'select[name="transitedCountry"]') }),
  'a-overview-complete': async (page) => ({ regions: await regionLines(page) }),
  'p-overview-new': async (page) => ({ regions: await regionLines(page) }),
  'p-arrival-port-search': async (page) => ({ placeOfLandingOptions: await optionTexts(page, 'select[name="proposedPlaceOfLanding"]') }),
  'a-confirmation-no-documents': async (page) => ({ links: await mainLinks(page) }),
  'i-address-book-add-country': async (page) => {
    const options = await page
      .getByLabel('Country')
      .locator('option')
      .allTextContents()
      .then((l) => l.map((t) => t.trim()).filter(Boolean))
      .catch(() => null)
    return { countryOptionCount: options ? options.length : null, countryOptions: options }
  }
}

async function settlePage(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
  await page.waitForTimeout(500)
}

class Shooter {
  constructor(page) {
    this.page = page
    this.done = new Set()
  }

  async snap(key, notes = {}) {
    const page = this.page
    await settlePage(page)
    const file = `${key}.png`
    const auto = ALSO[key] ? await ALSO[key](page).catch((e) => ({ alsoError: String(e.message).split('\n')[0] })) : {}
    const backLink = await backLinkHref(page).catch(() => null)
    const title = await page.title().catch(() => null)
    await page.screenshot({ path: path.join(OUT_DIR, file), fullPage: true, animations: 'disabled' })
    this.done.add(key)
    record({ key, ok: true, file, url: page.url(), title, notes: { backLinkHref: backLink, ...auto, ...notes } })
  }

  // fn drives the page to the state; its return value (an object) goes into notes.
  async shot(key, fn, notes = {}) {
    try {
      const extra = (fn ? await fn() : {}) || {}
      await this.snap(key, { ...notes, ...extra })
      return true
    } catch (error) {
      await this.fail(key, error)
      return false
    }
  }

  async fail(key, error) {
    const message = String((error && error.message) || error).split('\n').slice(0, 3).join(' | ')
    let url = null
    let title = null
    try {
      url = this.page.url()
      title = await this.page.title()
      await this.page.screenshot({ path: path.join(FAILED_DIR, `${key}.png`), fullPage: true, animations: 'disabled' })
    } catch {
      /* page already gone */
    }
    this.done.add(key)
    record({ key, ok: false, file: null, url, title, notes: {}, error: message })
  }

  absent(key, reason) {
    this.done.add(key)
    record({ key, ok: false, file: null, url: null, title: null, notes: {}, error: reason })
  }
}

module.exports = {
  ANIMALS,
  INS,
  PLANTS,
  BACKEND,
  ADDRESS_BOOK,
  ORGANISATION_ID,
  USER_ID,
  PASSWORD,
  PDF,
  SIDE,
  OUT_DIR,
  settle,
  record,
  isRecorded,
  readManifest,
  dateText,
  dateParts,
  exact,
  optionTexts,
  Shooter
}
