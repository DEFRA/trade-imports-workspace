const { expect } = require('@playwright/test')

// Design Release 2.1 is a mirror mount of the root route table.
const BASE = '/design-release-2.1'
const url = (p = '') => `${BASE}${p}`
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Matches the given DR2.1 path exactly, optionally followed by a query string.
const urlFor = (p) => new RegExp(`${escapeRegExp(url(p))}(\\?.*)?$`)

/** d/m/yyyy, the format every DR2.1 date picker takes, `days` from today. */
function dateFromToday (days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

async function clickAction (page, value) {
  await page.locator(`button[name="action"][value="${value}"]`).first().click()
  await page.waitForLoadState('load')
}

const saveAndContinue = (page) => clickAction(page, 'continue')
const saveAndReturnToOverview = (page) => clickAction(page, 'hub')

/** The page's main form submit (pages without the action button group). */
async function submitForm (page, name) {
  const button = name
    ? page.locator('main').getByRole('button', { name, exact: true })
    : page.locator('main form button[type="submit"]').first()
  await button.first().click()
  await page.waitForLoadState('load')
}

async function expectHeading (page, text) {
  await expect(page.locator('h1').first()).toHaveText(text, { useInnerText: true })
}

/** Error summary title plus the exact list of linked messages, in order. */
async function expectErrorSummary (page, messages) {
  const summary = page.locator('.govuk-error-summary')
  await expect(summary).toBeVisible()
  await expect(summary.locator('.govuk-error-summary__title')).toHaveText('There is a problem')
  await expect(summary.locator('.govuk-error-summary__list a')).toHaveText(messages)
}

async function expectNoErrorSummary (page) {
  await expect(page.locator('.govuk-error-summary')).toHaveCount(0)
}

/** Inline error message under a field (GOV.UK "Error:" prefix). */
async function expectInlineError (page, text) {
  await expect(page.locator('.govuk-error-message', { hasText: text }).first()).toBeVisible()
}

/** Back link target, as rendered. */
async function expectBackLink (page, href) {
  await expect(page.locator('.govuk-back-link')).toHaveAttribute('href', href)
}

/** The draft strip (status tag + notification reference) on journey pages. */
async function readReference (page) {
  const text = await page.locator('main').innerText()
  const match = text.match(/GBN-[A-Z]{2}-\d{2}-[A-Z0-9]+/)
  return match ? match[0] : null
}

/**
 * Bespoke type-and-pick autocompletes (country of origin, port of entry, transit
 * country). They render on each input event, so type per key, then click the
 * rendered option, which writes the hidden value the server reads.
 */
async function pickFromAutocomplete (page, inputId, search, option) {
  const input = page.locator(`#${inputId}`)
  const choice = page.locator('button.app-country-search__option', { hasText: option }).first()
  await input.click()
  await input.fill('')
  await input.pressSequentially(search, { delay: 30 })
  try {
    await choice.waitFor({ state: 'visible', timeout: 4000 })
  } catch {
    await input.press('Backspace')
    await input.pressSequentially(search.slice(-1), { delay: 30 })
    await choice.waitFor({ state: 'visible', timeout: 8000 })
  }
  await choice.click()
}

/**
 * The commodity search: type, tick the species checkbox, wait for the hidden
 * selectedSpecies value to carry it, then close the results so they do not
 * cover the buttons.
 */
async function chooseSpecies (page, search, speciesId) {
  const input = page.locator('#commodity-search')
  await input.click()
  await input.fill('')
  await input.pressSequentially(search, { delay: 30 })
  await page.locator(`#commodity-species-${speciesId}`).check()
  await expect(page.locator('input.app-commodity-search__species-value')).toHaveValue(new RegExp(speciesId))
  await input.press('Escape')
}

/** Opens the MOJ date picker input, types the date, dismisses the calendar. */
async function fillDate (page, selector, value) {
  const input = page.locator(selector)
  await input.fill(value)
  await input.press('Escape')
}

// --- species used across the walks --------------------------------------
const SPECIES = {
  cattle: { search: 'cattle', id: 'cattle-bos-taurus', latin: 'Bos taurus', code: '0102', name: 'Cattle' },
  chicken: { search: 'chicken', id: 'chicken-gallus-domesticus', latin: 'Gallus domesticus', code: '010511', name: 'Chicken' },
  cat: { search: 'felis', id: 'cat-felis-catus', latin: 'Felis catus', code: '01061900', name: 'Cat' },
  horse: { search: 'horse', id: 'horse-equus-caballus', latin: 'Equus cabalus', code: '0101', name: 'Horse' },
  cattleSemen: { search: 'semen', id: 'cattle-semen-bos-taurus', latin: 'Bos taurus', code: '05111000', name: 'Cattle, Semen' }
}

// --- journey steps -------------------------------------------------------

/** Dashboard "Create new" → notification type → origin. */
async function startNotification (page, type = 'live-animals') {
  await page.goto(url('/create-notification'))
  await expect(page).toHaveURL(urlFor('/notification-type'))
  await page.locator(`input[name="notificationType"][value="${type}"]`).check()
  await saveAndContinue(page)
  await expect(page).toHaveURL(urlFor('/origin-of-the-import'))
}

async function answerOrigin (page, { search = 'Fran', country = 'France', region = 'No', code = '', reference = '' } = {}) {
  await pickFromAutocomplete(page, 'country-of-origin', search, country)
  await page.locator(`input[name="regionOfOriginRequired"][value="${region}"]`).check()
  if (region === 'Yes') await page.locator('#region-of-origin-code-suffix').fill(code)
  if (reference) await page.locator('#internal-reference').fill(reference)
  await saveAndContinue(page)
}

async function answerCommodity (page, species) {
  for (const s of [].concat(species)) {
    await chooseSpecies(page, s.search, s.id)
  }
  await saveAndContinue(page)
}

async function answerReason (page, { reason = 'Internal market', purpose = 'Breeding', transhipmentCountry, exitPort, transitCountry, exitDate } = {}) {
  await page.locator(`input[name="importReason"][value="${reason}"]`).check()
  if (reason === 'Internal market' && purpose) {
    await page.locator(`input[name="internalMarketPurpose"][value="${purpose}"]`).check()
  }
  if (transhipmentCountry) await page.locator('#transhipment-destination-country').selectOption(transhipmentCountry)
  if (reason === 'Transit') {
    if (exitPort) await page.locator('#transit-exit-border-control-post').selectOption(exitPort)
    if (transitCountry) await page.locator('#transit-destination-country').selectOption(transitCountry)
  }
  if (reason === 'Temporary admission horses') {
    if (exitDate) await fillDate(page, '#temporary-admission-exit-date', exitDate)
    if (exitPort) await page.locator('#temporary-admission-port-of-exit').selectOption(exitPort)
  }
  await saveAndContinue(page)
}

async function answerConsignmentDetails (page, counts) {
  for (const [speciesId, value] of Object.entries(counts)) {
    await page.locator(`input[name="numberOfAnimals[${speciesId}]"]`).fill(String(value))
  }
  await saveAndContinue(page)
}

async function answerAdditionalDetails (page, { purpose = 'Slaughter', unweaned } = {}) {
  if (purpose) await page.locator(`input[name="certificationPurpose"][value="${purpose}"]`).check()
  if (unweaned) await page.locator(`input[name="unweanedAnimals"][value="${unweaned}"]`).check()
  await saveAndContinue(page)
}

async function answerArrival (page, { means = 'Air', port = { search: 'Heathrow', option: 'Heathrow' }, transportId = 'BA0123', documentReference = 'AWB-123', date = dateFromToday(14) } = {}) {
  await fillDate(page, '#arrival-date-at-port', date)
  if (port) await pickFromAutocomplete(page, 'port-of-entry', port.search, port.option)
  await page.locator('#means-of-transport').selectOption(means)
  await page.locator('#transport-identification').fill(transportId)
  await page.locator('#transport-document-reference').fill(documentReference)
  await saveAndContinue(page)
}

async function answerTransitCountries (page, countries = [{ search: 'Belg', option: 'Belgium' }]) {
  for (const c of countries) {
    await pickFromAutocomplete(page, 'transit-country-search', c.search, c.option)
  }
  await saveAndContinue(page)
}

async function answerTransporter (page, transporterId = 'aberdeen-livestock') {
  await page.locator(`input[name="transporterId"][value="${transporterId}"]`).check()
  await saveAndContinue(page)
}

const PDF = { name: 'itahc.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% prototype walk\n') }

async function fillDocument (page, { type = 'itahc', reference = 'ITAHC-001', issued = dateFromToday(-2), file = PDF } = {}) {
  await page.locator('#document-type').selectOption(type)
  await page.locator('#document-reference').fill(reference)
  await fillDate(page, '#date-of-issue', issued)
  if (file) {
    await page.locator('#attachment').setInputFiles(file)
    await expect(page.locator('input[name="attachmentFileName"]')).toHaveValue(file.name)
  }
}

const CORE_ADDRESSES = {
  'place-of-origin': ['placeOfOriginAddressId', 'green-valley-livestock-farm'],
  'consignor-or-exporter': ['consignorAddressId', 'nordic-livestock-export'],
  consignee: ['consigneeAddressId', 'northern-livestock-imports-consignee'],
  importer: ['importerAddressId', 'britannia-trade-livestock'],
  'place-of-destination': ['placeOfDestinationAddressId', 'riverside-holding-facility']
}

async function chooseAddress (page, section) {
  const [field, value] = CORE_ADDRESSES[section]
  await page.locator(`a[href="${url(`/${section}`)}"]`).first().click()
  await expect(page).toHaveURL(urlFor(`/${section}`))
  await page.locator(`input[name="${field}"][value="${value}"]`).check()
  await saveAndContinue(page)
  await expect(page).toHaveURL(urlFor('/roles-and-addresses'))
}

async function fillCph (page, { county = '12', parish = '345', holding = '6789' } = {}) {
  await page.locator('#cph-number-county').fill(county)
  await page.locator('#cph-number-parish').fill(parish)
  await page.locator('#cph-number-holding').fill(holding)
}

async function answerContactAddress (page, id = 'aberdeen-livestock-union-street') {
  await page.locator(`input[name="contactAddressId"][value="${id}"]`).check()
  await saveAndContinue(page)
}

module.exports = {
  BASE,
  url,
  urlFor,
  dateFromToday,
  saveAndContinue,
  saveAndReturnToOverview,
  clickAction,
  submitForm,
  expectHeading,
  expectErrorSummary,
  expectNoErrorSummary,
  expectInlineError,
  expectBackLink,
  readReference,
  pickFromAutocomplete,
  chooseSpecies,
  fillDate,
  SPECIES,
  PDF,
  startNotification,
  answerOrigin,
  answerCommodity,
  answerReason,
  answerConsignmentDetails,
  answerAdditionalDetails,
  answerArrival,
  answerTransitCountries,
  answerTransporter,
  fillDocument,
  CORE_ADDRESSES,
  chooseAddress,
  fillCph,
  answerContactAddress
}
