const { expect } = require('@playwright/test')
const L = require('./lib')
const { ANIMALS, PLANTS, settle, exact, dateText } = L

// ---------- navigation ----------

// Mirrors BasePage.signInWhenRequested: the OIDC chain is server 302s, so the
// stub's form is either showing now or this context is already signed in.
async function signInIfAsked(page) {
  const form = page.getByRole('heading', { level: 1, name: 'Sign in using Government Gateway' })
  if (!(await form.isVisible().catch(() => false))) return false
  await page.getByRole('textbox', { name: 'Government Gateway user ID' }).fill(L.USER_ID)
  await page.getByRole('textbox', { name: 'Password' }).fill(L.PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('heading', { level: 1 }).filter({ hasNotText: 'Sign in using Government Gateway' }).first().waitFor(settle)
  return true
}

async function go(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  if (await signInIfAsked(page)) {
    const want = new URL(url).pathname
    if (new URL(page.url()).pathname !== want) await page.goto(url, { waitUntil: 'domcontentloaded' })
  }
  await page.waitForLoadState('load').catch(() => {})
}

// Click something that submits a form or follows a link and wait for the next document.
async function press(page, locator) {
  const navigated = page
    .waitForEvent('framenavigated', { predicate: (f) => f === page.mainFrame(), timeout: 30_000 })
    .catch(() => null)
  await locator.click()
  await navigated
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  await page.waitForLoadState('load').catch(() => {})
  await signInIfAsked(page)
}

const button = (page, name) => page.getByRole('button', { name, exact: true })
const saveContinue = (page) => button(page, 'Save and continue')
const softSave = (page) => button(page, 'Save and return to overview')
const h1 = (page, name) => page.getByRole('heading', { level: 1, name })

function slugOf(page) {
  const m = new URL(page.url()).pathname.match(/\/notifications\/([^/]+)(?:\/(.*?))?\/?$/)
  return m ? m[2] || '' : null
}

function idOf(page) {
  const m = new URL(page.url()).pathname.match(/\/notifications\/([^/]+)/)
  return m ? m[1] : null
}

const animalsUrl = (id, slug = '') => `${ANIMALS}/live-animals/notifications/${id}${slug ? '/' + slug : ''}`
const plantsUrl = (id, slug = '') => `${PLANTS}/high-risk-plants/notifications/${id}${slug ? '/' + slug : ''}`

// ---------- form helpers ----------

async function selectByText(select, re) {
  const options = await select.locator('option').evaluateAll((os) => os.map((o) => ({ v: o.value, t: o.textContent.trim() })))
  const hit = options.find((o) => o.v && re.test(o.t)) || (re.firstFallback ? options.find((o) => o.v) : undefined)
  if (!hit) throw new Error(`No option matching ${re} in [${options.slice(0, 8).map((o) => o.t).join(', ')}...]`)
  await select.selectOption(hit.v)
}

// Works for the JS type-ahead (an input) and the no-JS dropdown (a select).
async function pickFromCombo(page, field, typed, optionRe) {
  await page.waitForLoadState('domcontentloaded')
  const first = field.first()
  const tag = await first.evaluate((el) => el.tagName)
  if (tag === 'SELECT') {
    await selectByText(first, optionRe)
    return
  }
  await first.click()
  await first.fill(typed)
  await page.getByRole('option').filter({ hasText: optionRe }).first().click()
}

async function fillAll(locator, value) {
  const n = await locator.count()
  for (let i = 0; i < n; i += 1) {
    const el = locator.nth(i)
    if (await el.isEditable().catch(() => false)) await el.fill(value)
  }
}

async function errorsShown(page) {
  return page.locator('.govuk-error-summary').first().isVisible().catch(() => false)
}

async function errorSummaryText(page) {
  const box = page.locator('.govuk-error-summary').first()
  if (!(await box.isVisible().catch(() => false))) return null
  return (await box.innerText()).replace(/\s+/g, ' ').trim()
}

// ---------- animals page handlers ----------

const PARTIES = [
  ['Consignor or exporter', 'Astra Rosales'],
  ['Place of destination', 'Tech Imports Ltd'],
  ['Place of origin', 'Origin Farm'],
  ['Consignee', 'British Livestock Ltd'],
  ['Importer', 'Import Co UK']
]

const defaultArrival = () => ({
  means: 'Road',
  portTyped: 'Aberdeen',
  portRe: /^Aberdeen Harbour/,
  transportId: 'FR-892-LK',
  transportDoc: 'CMR-2026-884721'
})

const ROAD = () => ({
  country: 'France',
  regionCode: '75',
  internalReference: 'Imports456GB',
  species: ['Bos taurus'],
  reason: { reason: 'Internal market', purpose: 'Breeding' },
  animals: '1',
  packages: '5',
  identifiers: [{ earTag: 'UK123456789012' }],
  certifiedFor: 'Slaughter',
  unweaned: 'No',
  arrival: defaultArrival(),
  transit: ['France', 'Belgium'],
  transporter: /García Livestock Transport SL/,
  document: null,
  cph: true
})

const AIR = () => ({
  ...ROAD(),
  internalReference: 'CATTLE-2026-01',
  animals: '2',
  packages: '1',
  identifiers: [
    { earTag: 'UK000000000001', passport: 'PASSPORT-0001' },
    { earTag: 'UK000000000002', passport: 'PASSPORT-0002' }
  ],
  certifiedFor: 'Further keeping',
  arrival: { means: 'Air', portTyped: 'Heathrow', portRe: /^Heathrow Airport/, transportId: 'BA0117', transportDoc: 'AWB-2026-0001' },
  transit: [],
  document: { reference: 'ITAHC2026AIR01', type: 'ITAHC' },
  cph: false
})

const H = {}

H.origin = async (page, A) => {
  const country = A.country || 'France'
  await pickFromCombo(page, page.locator('#countryOfOrigin'), country, exact(country))
  if (A.regionCode) {
    await page.getByRole('radio', { name: 'Yes', exact: true }).check()
    await page.getByLabel('Enter the region of origin code', { exact: true }).fill(A.regionCode)
  } else {
    await page.getByRole('radio', { name: 'No', exact: true }).check()
  }
  if (A.internalReference) await page.getByLabel('Your internal reference for this consignment (optional)').fill(A.internalReference)
  await press(page, saveContinue(page))
}

async function tickSpecies(page, species) {
  for (const name of species) {
    await page.getByLabel('Search for a commodity').fill(name)
    await press(page, button(page, 'Search'))
    await page.getByRole('checkbox', { name }).first().check()
  }
}

H.commodities = async (page, A) => {
  await tickSpecies(page, A.species)
  await press(page, saveContinue(page))
}

async function chooseSelect(page, selector, re) {
  const select = page.locator(selector).first()
  await select.waitFor({ state: 'attached', timeout: 10_000 })
  const tag = await select.evaluate((el) => el.tagName)
  if (tag === 'SELECT') {
    await selectByText(select, Object.assign(re || /./, { firstFallback: true }))
    return
  }
  await select.click()
  await select.fill('')
  await select.pressSequentially(re ? re.source.replace(/[\^$\\]/g, '').slice(0, 3) : 'a')
  await page.getByRole('option').filter({ hasText: re || /./ }).first().click()
}

H['import-reason'] = async (page, A) => {
  const R = A.reason
  if (R) {
    await page.getByRole('radio', { name: R.reason, exact: true }).check()
    if (R.purpose) await page.getByRole('radio', { name: R.purpose, exact: true }).check()
    if (R.exitDate) await page.locator('#temporaryAdmissionExitDate').fill(R.exitDate)
    for (const [selector, re] of Object.entries(R.selects || {})) await chooseSelect(page, selector, re)
  }
  await press(page, saveContinue(page))
}

H['consignment-details'] = async (page, A) => {
  const box = (re) => page.locator('.govuk-form-group', { has: page.locator('label', { hasText: re }) }).locator('input:not([type=hidden])')
  await fillAll(box(/Number of animals/), A.animals)
  await fillAll(box(/Number of packages/), A.packages)
  await press(page, saveContinue(page))
}

H['commodities/identification'] = async (page, A) => {
  const ids = A.identifiers || [{ earTag: 'UK123456789012' }]
  const fillOne = async (id) => {
    const ear = page.getByLabel('Ear tag', { exact: true })
    if (await ear.count()) await ear.first().fill(id.earTag || 'UK123456789012')
    const passport = page.getByLabel('Passport', { exact: true })
    if (id.passport && (await passport.count())) await passport.first().fill(id.passport)
    const chip = page.getByLabel('Microchip number', { exact: true })
    if (id.microchip && (await chip.count())) await chip.first().fill(id.microchip)
  }
  if (ids.length === 1) {
    await fillOne(ids[0])
    await press(page, saveContinue(page))
    return
  }
  for (let i = 0; i < ids.length; i += 1) {
    await fillOne(ids[i])
    if (i < ids.length - 1) {
      await press(page, button(page, 'Save and add another'))
    } else {
      await press(page, button(page, 'Save and finish'))
    }
  }
  await press(page, saveContinue(page))
}

H['additional-details'] = async (page, A) => {
  const certified = page.getByRole('radio', { name: A.certifiedFor || 'Slaughter', exact: true })
  if (await certified.count()) await certified.first().check()
  const unweaned = page.getByRole('group', { name: /unweaned/i }).getByRole('radio', { name: A.unweaned || 'No', exact: true })
  if (await unweaned.count()) await unweaned.first().check()
  await press(page, saveContinue(page))
}

async function fillArrival(page, AR, { means = true, rest = true } = {}) {
  if (rest) {
    await page.locator('input[name="arrivalDateAtPort"]').fill(AR.date || dateText({ monthOffset: 1 }))
    await pickFromCombo(page, page.getByLabel('Port of entry', { exact: true }), AR.portTyped, AR.portRe)
  }
  if (means) await selectByText(page.getByLabel('Means of transport to the port of entry', { exact: true }), new RegExp(`^${AR.means}`))
  if (rest) {
    await page.getByLabel('Transport identification').fill(AR.transportId)
    await page.getByLabel('Transport document reference').fill(AR.transportDoc)
  }
}

H['port-of-entry'] = async (page, A) => {
  const AR = A.arrival
  if (AR.meansOnly) {
    await fillArrival(page, AR, { means: true, rest: false })
    await press(page, saveContinue(page))
    if (slugOf(page) === 'port-of-entry' && (await errorsShown(page))) {
      await fillArrival(page, AR, { means: true, rest: true })
      await press(page, saveContinue(page))
    }
    return
  }
  await fillArrival(page, AR)
  await press(page, saveContinue(page))
}

H['transit-countries'] = async (page, A) => {
  for (const name of A.transit || []) {
    await pickFromCombo(page, page.locator('#transitedCountry'), name, exact(name))
    await page.getByRole('button', { name: 'Add country', exact: true }).click()
    await expect(page.getByRole('cell', { name, exact: true })).toBeVisible()
  }
  await press(page, saveContinue(page))
}

H.transporters = async (page, A) => {
  const radio = page.getByRole('radio', { name: A.transporter })
  if (A.blankTransporter) {
    await press(page, saveContinue(page))
    if (slugOf(page) !== 'transporters' || !(await errorsShown(page))) return
  }
  await radio.first().check()
  await press(page, saveContinue(page))
}

H['accompanying-documents'] = async (page, A) => {
  const doc = A.document
  if (doc) {
    try {
      await page.getByLabel('Document reference').fill(doc.reference)
      await page.getByLabel('Document type').selectOption(doc.type)
      await page.locator('input[name="accompanyingDocumentDateOfIssue"]').fill('03/01/2026')
      await page.locator('input[type="file"]').setInputFiles(L.PDF)
      await page.getByText('safe-file-1kb.pdf').first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {})
      await page.waitForTimeout(1500)
      if (process.env.TRACE) {
        page.on('response', (r) => console.log(`resp ${r.status()} ${r.request().method()} ${r.url().slice(0, 140)}`))
        page.on('requestfailed', (r) => console.log(`reqfailed ${r.url().slice(0, 140)} ${r.failure() && r.failure().errorText}`))
      }
      await press(page, button(page, 'Save and add another'))
      if (process.env.TRACE) await page.screenshot({ path: '/tmp/claude-501/docdebug.png', fullPage: true })
      const done = page.locator('.govuk-table__row', { hasText: doc.reference }).filter({ hasText: 'Check completed' })
      const refused = page.getByText('The file could not be uploaded', { exact: false }).first()
      await done.or(refused).first().waitFor({ state: 'visible', timeout: 90_000 })
      if (await refused.isVisible().catch(() => false)) throw new Error('upload refused by the stack: "The file could not be uploaded. Try again."')
      A.documentUploaded = true
    } catch (error) {
      A.documentUploaded = false
      A.documentError = String(error.message).split('\n')[0]
      await go(page, page.url())
    }
  }
  await press(page, page.getByRole('button', { name: /^(Continue|Save and continue)$/ }))
}

H.addresses = async (page, A) => {
  for (const [role, name] of PARTIES) {
    const row = page.locator('.govuk-summary-list__row', { has: page.getByText(role, { exact: true }) })
    const add = row.getByRole('link', { name: /^Add/ })
    if (!(await add.count())) continue
    await press(page, add.first())
    await page.getByLabel('Search').fill(name)
    await press(page, button(page, 'Search'))
    await page.getByRole('radio', { name: `Select ${name}`, exact: true }).check()
    await press(page, saveContinue(page))
    await h1(page, 'Consignment addresses').waitFor(settle)
  }
  if (A.cph) {
    const cphLink = page.locator('.govuk-summary-list__row', { hasText: /holding|CPH/i }).getByRole('link').first()
    if (await cphLink.count()) {
      await press(page, cphLink)
      await H['cph-number'](page, A)
      await h1(page, 'Consignment addresses').waitFor(settle)
    }
  }
  await press(page, page.getByRole('button', { name: /^(Continue|Save and continue)$/ }))
}

H['cph-number'] = async (page) => {
  await page.getByLabel('County', { exact: true }).fill('12')
  await page.getByLabel('Parish', { exact: true }).fill('345')
  await page.getByLabel('Holding number', { exact: true }).fill('6789')
  await press(page, saveContinue(page))
}

H['consignment/contact/select'] = async (page, A) => {
  await page.getByRole('radio', { name: /Animal and Plant Health Agency/ }).first().check()
  await press(page, saveContinue(page))
}

const ORDER = [
  'commodities',
  'import-reason',
  'consignment-details',
  'commodities/identification',
  'additional-details',
  'port-of-entry',
  'transit-countries',
  'transporters',
  'accompanying-documents',
  'addresses',
  'consignment/contact/select'
]

async function createAnimals(page) {
  await go(page, `${ANIMALS}/live-animals`)
  await h1(page, 'Import notification service').waitFor(settle)
  await press(page, page.getByRole('button', { name: 'Start a new notification' }))
  if (slugOf(page) !== 'origin') await h1(page, 'Origin of the import').waitFor(settle)
  return idOf(page)
}

// Walks the opening run page by page from wherever the app lands, filling what each
// page needs. hooks.onLand(slug, prev, first) may photograph a page before it is filled.
async function walkRun(page, A, { onLand, stop, maxSteps = 40 } = {}) {
  const seen = new Set()
  let prev = null
  let repeats = 0
  const visits = {}
  const id = idOf(page)
  for (let step = 0; step < maxSteps; step += 1) {
    let slug = slugOf(page)
    if (slug === '' || slug === null) {
      const next = ORDER.find((s) => !seen.has(s))
      if (stop && stop('', prev)) return { slug, prev }
      if (!next || slug === null) return { slug, prev }
      await go(page, animalsUrl(id, next))
      slug = slugOf(page)
      if (slug === '' || slug === null) {
        seen.add(next)
        continue
      }
    }
    const first = !seen.has(slug)
    if (onLand) await onLand(slug, prev, first)
    if (stop && stop(slug, prev)) return { slug, prev }
    if (!H[slug]) return { slug, prev }
    visits[slug] = (visits[slug] || 0) + 1
    if (process.env.TRACE) console.log(`walk: ${slug} (visit ${visits[slug]})`)
    if (visits[slug] > 2) throw new Error(`Looping on ${slug}: ${await errorSummaryText(page)}`)
    repeats = slug === prev ? repeats + 1 : 0
    if (repeats >= 2) {
      throw new Error(`Stuck on ${slug}: ${await errorSummaryText(page)}`)
    }
    seen.add(slug)
    await H[slug](page, A)
    prev = slug
  }
  throw new Error('Run did not finish in the step limit')
}

// Fills every task by its own route, in an order that suits both branches.
async function completeByRoute(page, id, A, { only } = {}) {
  const steps = [
    ['origin', H.origin],
    ...ORDER.map((slug) => [slug, H[slug]])
  ].filter(([slug]) => (only ? only.includes(slug) : true))
  const skipped = []
  let pending = steps
  for (let pass = 0; pass < 2 && pending.length; pass += 1) {
    const retry = []
    for (const [slug, handler] of pending) {
      if (slug === 'transit-countries' && A.transit && A.transit.length === 0) continue
      if (slug === 'accompanying-documents' && !A.document) continue
      await go(page, animalsUrl(id, slug))
      if (slugOf(page) !== slug) {
        retry.push([slug, handler])
        continue
      }
      await handler(page, A)
    }
    pending = retry
    if (pass === 1) skipped.push(...retry.map(([s]) => s))
  }
  return skipped
}

async function openOverview(page, id) {
  await go(page, animalsUrl(id))
  await h1(page, 'Overview').waitFor(settle)
}

// Opens the draft review: directly by route, else through the overview's button.
async function openReview(page, id) {
  await go(page, animalsUrl(id, 'notification-view'))
  if (slugOf(page) === 'notification-view') return
  await openOverview(page, id)
  await press(page, page.getByRole('button', { name: 'Review and submit' }))
}

async function submitFromReview(page) {
  await press(page, button(page, 'Continue'))
  await h1(page, 'Declaration').waitFor(settle)
  await page.getByRole('checkbox', { name: /I confirm that I have reviewed/ }).check()
  await press(page, button(page, 'Continue'))
  await page.getByRole('heading', { name: 'Import notification submitted' }).waitFor(settle)
}

async function openFromList(page, id, locatorFor) {
  await go(page, `${ANIMALS}/live-animals?referenceNumber=${id}`)
  const target = locatorFor(page.locator('.govuk-summary-card').filter({ hasText: id }))
  await target.first().waitFor(settle)
  await press(page, target.first())
}

// ---------- plants ----------

async function ensureAddress(page, name) {
  const headers = { 'Trade-Imports-Organisation-Id': L.ORGANISATION_ID, 'content-type': 'application/json' }
  const base = `${L.ADDRESS_BOOK}/organisation/${L.ORGANISATION_ID}/addresses`
  const found = await page.request.get(`${base}?q=${encodeURIComponent(name)}`, { headers })
  if (found.ok()) {
    const body = await found.json()
    if (body.items && body.items.some((a) => a.name === name)) return
  }
  const made = await page.request.post(base, {
    headers,
    data: {
      name,
      addressLine1: '4 Nursery Lane',
      townOrCity: 'Perth',
      postcode: 'PH1 5EX',
      countryCode: 'GB',
      phone: '01738 555 0143',
      email: 'review@example.co.uk'
    }
  })
  if (!made.ok()) throw new Error(`Address book would not take ${name}: ${made.status()}`)
}

// The tests repo seeds these in Playwright globalSetup (domain/shared/fixtures/e2e-address-book.ts); a freshly restarted stack has none.
const FIXTURE_ADDRESSES = [
  ['Animal and Plant Health Agency', 'Woodham Lane', 'Addlestone', 'KT15 3NB', 'GB'],
  ['Astra Rosales', '43 East Hague Extension', 'Bern', '30055', 'CH'],
  ['Tech Imports Ltd', '18 Dockside Road', 'London', 'E14 9GE', 'GB'],
  ['Origin Farm', '1 Farm Lane', 'Ennis', 'V95 X7P2', 'IE'],
  ['British Livestock Ltd', '10 Market Street', 'Leeds', 'LS1 6HB', 'GB'],
  ['Import Co UK', '20 Trade Road', 'London', 'EC1A 1BB', 'GB']
]

async function ensureFixtureAddresses(page) {
  const headers = { 'Trade-Imports-Organisation-Id': L.ORGANISATION_ID, 'content-type': 'application/json' }
  const base = `${L.ADDRESS_BOOK}/organisation/${L.ORGANISATION_ID}/addresses`
  const created = []
  for (const [name, addressLine1, townOrCity, postcode, countryCode] of FIXTURE_ADDRESSES) {
    const found = await page.request.get(`${base}?q=${encodeURIComponent(name)}`, { headers })
    if (found.ok() && (await found.json()).items.some((a) => a.name === name)) continue
    const made = await page.request.post(base, {
      headers,
      data: { name, addressLine1, townOrCity, postcode, countryCode, phone: '+44 1234 567890', email: 'contact@example.com' }
    })
    if (!made.ok()) throw new Error(`Address book would not take ${name}: ${made.status()}`)
    created.push(name)
  }
  return created
}

const PLANTS_ADDRESS = 'Business Review Nursery'

const PA = () => ({
  type: 'Plants for planting',
  category: 'Plants for planting',
  line: { Species: 'Picea abies', 'Commodity code': '0602 20 20', Quantity: '40', 'EPPO code': 'PIEAB' },
  genus: 'Picea (spruce)',
  country: 'Germany',
  arrivalStatus: 'No, it has not arrived yet',
  arrivalDate: dateText({ dayOffset: 7 }),
  address: PLANTS_ADDRESS,
  supplier: 'DE-12345',
  consignment: 'JOURNEY_123'
})

const POTATOES = () => ({
  type: 'Potatoes (seed or ware)',
  category: 'Ware potatoes',
  line: { Variety: 'Maris Piper', Quantity: '250', 'Intended use': 'Eating' },
  country: 'Spain',
  arrivalDate: dateText({ dayOffset: 7 }),
  address: PLANTS_ADDRESS,
  producer: 'P123',
  crop: 'C123',
  consignment: 'JOURNEY_123'
})

const P = {}

P['commodity-type'] = async (page, A) => {
  await page.getByRole('radio', { name: A.type, exact: true }).check()
  await press(page, saveContinue(page))
}

P['commodities/details'] = async (page, A) => {
  await page.getByRole('radio', { name: A.category, exact: true }).check()
  await press(page, button(page, 'Continue'))
  await saveContinue(page).waitFor(settle)
  if (A.genus) await pickFromCombo(page, page.locator('#genus'), A.genus, exact(A.genus))
  for (const [label, value] of Object.entries(A.line)) await page.getByLabel(label, { exact: true }).fill(value)
  await press(page, saveContinue(page))
}

P.commodities = async (page) => {
  await press(page, saveContinue(page))
}

P.origin = async (page, A) => {
  await pickFromCombo(page, page.locator('#countryOfOrigin'), A.country, exact(A.country))
  await press(page, saveContinue(page))
}

P['arrival-status'] = async (page, A) => {
  await page.getByRole('radio', { name: A.arrivalStatus, exact: true }).check()
  await press(page, saveContinue(page))
}

P['arrival-details'] = async (page, A) => {
  if (A.minimal) {
    await press(page, saveContinue(page))
    if (slugOf(page) !== 'arrival-details' || !(await errorsShown(page))) return
  }
  await page.locator('#arrivalDate').fill(A.arrivalDate)
  if (await page.locator('#arrivalTime').count()) await page.locator('#arrivalTime').fill('14:30')
  const landing = page.locator('#proposedPlaceOfLanding')
  if (await landing.count()) await pickFromCombo(page, landing, 'Aberdeen', /^Aberdeen Harbour/)
  await press(page, saveContinue(page))
}

async function pickAddress(page, A) {
  await page.getByLabel('Search', { exact: true }).fill(A.address)
  await press(page, button(page, 'Search'))
  await page.getByRole('radio', { name: `Select ${A.address}`, exact: true }).first().check()
  await press(page, saveContinue(page))
}

P['destinations/select'] = pickAddress
P['consignors/select'] = pickAddress
P['consignment/contact/select'] = pickAddress

P['identification-numbers'] = async (page, A) => {
  if (A.minimal) {
    await press(page, saveContinue(page))
    if (slugOf(page) !== 'identification-numbers' || !(await errorsShown(page))) return
  }
  const supplier = page.getByLabel('Identification number of the supplier of the plants', { exact: true })
  if (await supplier.count()) await supplier.fill(A.supplier || 'DE-12345')
  const producer = page.getByLabel('Identification number of the producer of the potatoes', { exact: true })
  if (await producer.count()) await producer.fill(A.producer || 'P123')
  const crop = page.getByLabel('Crop identification number', { exact: true })
  if (await crop.count()) await crop.fill(A.crop || 'C123')
  await page.getByLabel('Consignment number (optional)', { exact: true }).fill(A.consignment)
  await press(page, saveContinue(page))
}

async function createPlants(page) {
  await go(page, `${PLANTS}/high-risk-plants`)
  await h1(page, 'Import notification service').waitFor(settle)
  await press(page, page.getByRole('button', { name: 'Start a new notification' }))
  if (slugOf(page) !== 'commodity-type') await h1(page, 'What are you importing?').waitFor(settle)
  return idOf(page)
}

const PLANTS_ORDER = [
  'commodity-type',
  'commodities/details',
  'commodities',
  'origin',
  'arrival-status',
  'arrival-details',
  'destinations/select',
  'consignors/select',
  'identification-numbers',
  'consignment/contact/select'
]

async function walkPlantsRun(page, A, { onLand, stop, maxSteps = 30 } = {}) {
  const seen = new Set()
  let prev = null
  let repeats = 0
  for (let step = 0; step < maxSteps; step += 1) {
    const slug = slugOf(page)
    if (slug === null || slug === '' || slug === 'notification-view') {
      if (onLand) await onLand(slug, prev, true)
      return { slug, prev }
    }
    const first = !seen.has(slug)
    if (onLand) await onLand(slug, prev, first)
    if (stop && stop(slug, prev)) return { slug, prev }
    if (!P[slug]) return { slug, prev }
    repeats = slug === prev ? repeats + 1 : 0
    if (repeats >= 2) throw new Error(`Stuck on ${slug}: ${await errorSummaryText(page)}`)
    seen.add(slug)
    await P[slug](page, A)
    prev = slug
  }
  throw new Error('Plants run did not finish in the step limit')
}

async function completePlantsByRoute(page, id, A, slugs) {
  for (const slug of slugs || PLANTS_ORDER) {
    await go(page, plantsUrl(id, slug))
    if (slugOf(page) !== slug) {
      await go(page, plantsUrl(id, slug))
      if (slugOf(page) !== slug) throw new Error(`Could not open ${slug}; landed on ${slugOf(page)}`)
    }
    await P[slug](page, A)
  }
}

async function openPlantsReview(page, id) {
  await go(page, plantsUrl(id, 'notification-view'))
  if (slugOf(page) === 'notification-view') return
  await go(page, plantsUrl(id))
  await press(page, page.getByRole('button', { name: /Review|Check your answers/ }).or(page.getByRole('link', { name: /Check your answers|Review/ })).first())
}

module.exports = {
  signInIfAsked,
  go,
  press,
  button,
  saveContinue,
  softSave,
  h1,
  slugOf,
  idOf,
  animalsUrl,
  plantsUrl,
  selectByText,
  pickFromCombo,
  fillAll,
  errorsShown,
  errorSummaryText,
  ROAD,
  AIR,
  H,
  P,
  ORDER,
  PARTIES,
  createAnimals,
  walkRun,
  completeByRoute,
  openOverview,
  openReview,
  submitFromReview,
  openFromList,
  ensureAddress,
  ensureFixtureAddresses,
  PLANTS_ADDRESS,
  PA,
  POTATOES,
  createPlants,
  walkPlantsRun,
  completePlantsByRoute,
  openPlantsReview,
  fillArrival,
  tickSpecies,
  defaultArrival
}
