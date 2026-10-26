const { test, expect } = require('./support/fixtures')
const { shoot, shootNoJs, shootMobile } = require('./support/snagging')
const {
  url, urlFor, dateFromToday, saveAndContinue, clickAction, submitForm, chooseSpecies, fillDate,
  pickFromAutocomplete, fillDocument, fillCph, SPECIES, startNotification, answerOrigin, answerCommodity,
  answerReason, answerConsignmentDetails, answerAdditionalDetails, answerArrival, answerTransporter,
  chooseAddress, CORE_ADDRESSES, answerContactAddress
} = require('./support/journey')

// The live-animals snag list (snagging/snags.json): one test per snag, each
// reaching the prototype page state the designers' snag is about and saving
// full-page screenshots to snagging/screens/prototype/. Doubles as a demo of
// the Design Release 2.1 pages, so the titles read "S0X <page>: <state>".
// S30 is left out: the designers say no action is needed.

// --- getting to a page ---------------------------------------------------

async function toCommoditySearch (page) {
  await startNotification(page, 'live-animals')
  await answerOrigin(page)
  await expect(page).toHaveURL(urlFor('/what-are-you-importing'))
}

async function toReason (page) {
  await toCommoditySearch(page)
  await answerCommodity(page, SPECIES.cattle)
  await expect(page).toHaveURL(urlFor('/reason-for-import'))
}

async function toCommodityDetails (page, species = [SPECIES.cattle]) {
  await toCommoditySearch(page)
  for (const s of species) await chooseSpecies(page, s.search, s.id)
  await saveAndContinue(page)
  await answerReason(page)
  await expect(page).toHaveURL(urlFor('/consignment-details'))
}

async function toIdentification (page, count = 2) {
  await toCommodityDetails(page)
  await answerConsignmentDetails(page, { [SPECIES.cattle.id]: count })
  await expect(page).toHaveURL(urlFor('/animal-identification-details'))
}

async function toArrival (page) {
  await startNotification(page, 'live-animals')
  await answerOrigin(page)
  await answerCommodity(page, SPECIES.chicken)
  await answerReason(page)
  await answerConsignmentDetails(page, { [SPECIES.chicken.id]: 100 })
  await page.goto(url('/arrival-details'))
  await expect(page).toHaveURL(urlFor('/arrival-details'))
}

async function toTransit (page) {
  await toArrival(page)
  await answerArrival(page, { means: 'Road', port: { search: 'Dover', option: 'Dover' }, transportId: 'AB12 CDE' })
  await expect(page).toHaveURL(urlFor('/transit-countries'))
}

async function toTransporter (page) {
  await toArrival(page)
  await answerArrival(page, { means: 'Air' })
  await expect(page).toHaveURL(urlFor('/transporter'))
}

async function toDocuments (page) {
  await startNotification(page, 'live-animals')
  await answerOrigin(page)
  await answerCommodity(page, SPECIES.cattle)
  await page.goto(url('/upload-documents'))
  await expect(page).toHaveURL(urlFor('/upload-documents'))
}

async function toRoles (page) {
  await startNotification(page, 'live-animals')
  await answerOrigin(page)
  await answerCommodity(page, SPECIES.cattle)
  await answerReason(page)
  await answerConsignmentDetails(page, { [SPECIES.cattle.id]: 1 })
  await page.goto(url('/roles-and-addresses'))
  await expect(page).toHaveURL(urlFor('/roles-and-addresses'))
}

async function toIncompleteReview (page) {
  await startNotification(page, 'live-animals')
  await answerOrigin(page)
  await answerCommodity(page, SPECIES.cattle)
  await answerReason(page)
  await answerConsignmentDetails(page, { [SPECIES.cattle.id]: 1 })
  await page.goto(url('/review-notification'))
  await expect(page).toHaveURL(urlFor('/review-notification'))
}

// --- page actions --------------------------------------------------------

/** Types into a search box one key at a time, as a user would. */
async function typeInto (page, selector, text) {
  const input = page.locator(selector)
  await input.click()
  await input.fill('')
  await input.pressSequentially(text, { delay: 40 })
}

/** Opens the MOJ date picker calendar next to the given input. */
async function openCalendar (page, inputSelector) {
  const picker = page.locator('.moj-datepicker', { has: page.locator(inputSelector) })
  await picker.locator('button.moj-datepicker__toggle').click()
  await expect(picker.locator('.moj-datepicker__dialog')).toBeVisible()
}

async function saveAnimal (page, n) {
  await page.getByLabel('Ear tag').fill(`UK12345670000${n}`)
  await page.getByLabel('Passport').fill(`PP-00${n}`)
  await page.locator(`button[value="save:${SPECIES.cattle.id}"]`).click()
  await page.waitForLoadState('load')
}

// --- About the consignment: origin ---------------------------------------

test.describe('origin of the import', () => {
  test.beforeEach(async ({ page }) => {
    await startNotification(page, 'live-animals')
  })

  test('S01 Origin: hint text under the country of origin', async ({ page }) => {
    await shoot(page, 'S01', 'default')
  })

  test('S02 Origin: country search box, closed and with suggestions open', async ({ page, browser }) => {
    await shoot(page, 'S02', 'default')
    await typeInto(page, '#country-of-origin', 'Fran')
    await expect(page.locator('button.app-country-search__option', { hasText: 'France' }).first()).toBeVisible()
    await shoot(page, 'S02', 'suggestions-open')
    await shootNoJs(browser, page, 'S02', 'default')
    await shootNoJs(browser, page, 'S02', 'typed', (p) => p.locator('#country-of-origin').fill('Fran'))
  })

  test('S03 Origin: region of origin code hint, revealed by Yes', async ({ page, browser }) => {
    await page.locator('input[name="regionOfOriginRequired"][value="Yes"]').check()
    await expect(page.locator('#region-of-origin-code-suffix')).toBeVisible()
    await shoot(page, 'S03', 'region-code-revealed')
    await shootNoJs(browser, page, 'S03', 'default')
  })

  test('S04 Origin: region code prefix box, before and after a country is chosen', async ({ page, browser }) => {
    await page.locator('input[name="regionOfOriginRequired"][value="Yes"]').check()
    await shoot(page, 'S04', 'no-country-yet')
    await pickFromAutocomplete(page, 'country-of-origin', 'Fran', 'France')
    await expect(page.locator('#region-of-origin-code-prefix')).toHaveText('FR')
    await page.locator('#region-of-origin-code-suffix').fill('75')
    await shoot(page, 'S04', 'france-prefix')
    await shootNoJs(browser, page, 'S04', 'default')
  })

  test('S05 Origin: your internal reference question', async ({ page }) => {
    await shoot(page, 'S05', 'default')
    await page.locator('#internal-reference').fill('CATTLE-2026-01')
    await shoot(page, 'S05', 'filled')
  })
})

// --- About the consignment: what are you importing -----------------------

test.describe('what are you importing', () => {
  test.beforeEach(async ({ page }) => {
    await toCommoditySearch(page)
  })

  test('S06 What are you importing?: inset under the heading', async ({ page }) => {
    await shoot(page, 'S06', 'default')
  })

  test('S07 What are you importing?: search box hint', async ({ page, browser }) => {
    await shoot(page, 'S07', 'default')
    await shootNoJs(browser, page, 'S07', 'default')
  })

  test('S08 What are you importing?: searching and ticking species', async ({ page, browser }) => {
    await shoot(page, 'S08', 'default')
    await typeInto(page, '#commodity-search', 'cattle')
    await expect(page.locator('main')).toContainText('Cattle (0102)')
    await shoot(page, 'S08', 'cattle-results-open')
    await page.locator(`#commodity-species-${SPECIES.cattle.id}`).check()
    await shoot(page, 'S08', 'cattle-ticked-results-open')
    await page.locator('#commodity-search').press('Escape')
    await shoot(page, 'S08', 'one-selected')
    await typeInto(page, '#commodity-search', '0101')
    await shoot(page, 'S08', 'code-0101-results-open')
    await typeInto(page, '#commodity-search', 'Bos')
    await shoot(page, 'S08', 'latin-bos-results-open')
    await shootNoJs(browser, page, 'S08', 'default')
    await shootNoJs(browser, page, 'S08', 'typed', (p) => p.locator('#commodity-search').fill('cattle'))
  })
})

// --- About the consignment: main import reason ----------------------------

test.describe('main import reason', () => {
  test.beforeEach(async ({ page }) => {
    await toReason(page)
  })

  test('S09 Main import reason: heading', async ({ page }) => {
    await shoot(page, 'S09', 'default')
  })

  test('S10 Main import reason: fields under each child radio', async ({ page, browser }) => {
    const reveals = {
      'Internal market': 'internal-market',
      'Transhipment or onward travel': 'transhipment',
      Transit: 'transit',
      'Temporary admission horses': 'temporary-admission'
    }
    for (const [value, state] of Object.entries(reveals)) {
      await page.locator(`input[name="importReason"][value="${value}"]`).check()
      await shoot(page, 'S10', `${state}-revealed`)
    }
    await page.locator('input[name="importReason"][value="Transhipment or onward travel"]').check()
    await page.locator('#transhipment-destination-country').focus()
    await shoot(page, 'S10', 'transhipment-select-focused')
    await shootNoJs(browser, page, 'S10', 'default')
  })

  test('S11 Main import reason: temporary admission exit date picker', async ({ page, browser }) => {
    await page.locator('input[name="importReason"][value="Temporary admission horses"]').check()
    await shoot(page, 'S11', 'exit-date')
    await openCalendar(page, '#temporary-admission-exit-date')
    await shoot(page, 'S11', 'calendar-open')
    await shootNoJs(browser, page, 'S11', 'default', (p) =>
      p.locator('input[name="importReason"][value="Temporary admission horses"]').check())
  })

  test('S12 Main import reason: spacing between the exit date and the port of exit', async ({ page, browser }) => {
    await page.locator('input[name="importReason"][value="Temporary admission horses"]').check()
    await fillDate(page, '#temporary-admission-exit-date', dateFromToday(60))
    await shoot(page, 'S12', 'exit-date-filled')
    await saveAndContinue(page)
    await shoot(page, 'S12', 'error')
    await page.goto(url('/reason-for-import'))
    await shootNoJs(browser, page, 'S12', 'default', (p) =>
      p.locator('input[name="importReason"][value="Temporary admission horses"]').check())
  })
})

// --- Description of the goods: commodity details -------------------------

test.describe('commodity details', () => {
  test('S13 Commodity details: selected commodities table', async ({ page }) => {
    await toCommodityDetails(page)
    await shoot(page, 'S13', 'cattle')
  })

  test('S14 Commodity details: spacing above each commodity title', async ({ page }) => {
    await toCommodityDetails(page, [SPECIES.horse, { search: 'pig', id: 'pig-sus-scrofa' }])
    await shoot(page, 'S14', 'two-commodities')
    await page.goto(url('/consignment-details'))
    await saveAndContinue(page)
    await shoot(page, 'S14', 'two-commodities-error')
  })
})

// --- Description of the goods: identification details --------------------

test.describe('identification details', () => {
  test.beforeEach(async ({ page }) => {
    await toIdentification(page)
  })

  test('S15 Identification details: species in the saved animals table', async ({ page }) => {
    await shoot(page, 'S15', 'first-animal')
    await saveAnimal(page, 1)
    await shoot(page, 'S15', 'one-animal-saved')
  })

  test('S16 Identification details: page layout and grey panels', async ({ page, browser }) => {
    await shoot(page, 'S16', 'first-animal')
    await shootMobile(browser, page, 'S16', 'first-animal')
    await shootNoJs(browser, page, 'S16', 'first-animal')
    await saveAnimal(page, 1)
    await shoot(page, 'S16', 'one-animal-saved')
    await shootMobile(browser, page, 'S16', 'one-animal-saved')
  })

  test('S17 Identification details: where saved animals appear after adding one', async ({ page, browser }) => {
    await saveAnimal(page, 1)
    await expect(page.locator('main')).toContainText('Enter details for Bos taurus 2 of 2')
    await shoot(page, 'S17', 'one-animal-saved')
    await shootMobile(browser, page, 'S17', 'one-animal-saved')
    await shootNoJs(browser, page, 'S17', 'one-animal-saved')
  })

  test('S18 Identification details: text shown once every animal is entered', async ({ page }) => {
    await saveAnimal(page, 1)
    await page.getByLabel('Ear tag').fill('UK123456700002')
    await page.getByLabel('Passport').fill('PP-002')
    await page.getByRole('button', { name: 'Save and finish' }).click()
    await page.waitForLoadState('load')
    await expect(page.locator(`button[value="remove:${SPECIES.cattle.id}:1"]`)).toBeVisible()
    await shoot(page, 'S18', 'all-animals-saved')
  })
})

// --- Transport and arrival: arrival details -----------------------------

test.describe('arrival details', () => {
  test.beforeEach(async ({ page }) => {
    await toArrival(page)
  })

  test('S19 Arrival details: date of arrival hint', async ({ page, browser }) => {
    await shoot(page, 'S19', 'default')
    await openCalendar(page, '#arrival-date-at-port')
    await shoot(page, 'S19', 'calendar-open')
    await shootNoJs(browser, page, 'S19', 'default')
  })

  test('S20 Arrival details: port of entry hint', async ({ page }) => {
    await shoot(page, 'S20', 'default')
  })

  test('S21 Arrival details: port of entry search box', async ({ page, browser }) => {
    await shoot(page, 'S21', 'default')
    await typeInto(page, '#port-of-entry', 'Heath')
    await expect(page.locator('button.app-country-search__option', { hasText: 'Heathrow' }).first()).toBeVisible()
    await shoot(page, 'S21', 'suggestions-open')
    await page.locator('button.app-country-search__option', { hasText: 'Heathrow' }).first().click()
    await shoot(page, 'S21', 'port-chosen')
    await shootNoJs(browser, page, 'S21', 'default')
  })

  test('S22 Arrival details: means of transport options', async ({ page }) => {
    await shoot(page, 'S22', 'default')
    // A native select cannot be photographed open, so list its options in place.
    await page.locator('#means-of-transport').evaluate((select) => {
      select.size = select.options.length
      select.style.height = 'auto'
    })
    await shoot(page, 'S22', 'options-listed')
  })

  test('S23 Arrival details: transport identification hint', async ({ page }) => {
    await shoot(page, 'S23', 'default')
  })
})

// --- Transport and arrival: transit countries ----------------------------

test.describe('transit countries', () => {
  test.beforeEach(async ({ page }) => {
    await toTransit(page)
  })

  test('S24 Which countries will the consignment travel through?: search box', async ({ page, browser }) => {
    await shoot(page, 'S24', 'default')
    await typeInto(page, '#transit-country-search', 'Bel')
    await expect(page.locator('button.app-country-search__option', { hasText: 'Belgium' }).first()).toBeVisible()
    await shoot(page, 'S24', 'suggestions-open')
    await shootNoJs(browser, page, 'S24', 'default')
  })

  test('S25 Which countries will the consignment travel through?: searching and adding countries', async ({ page, browser }) => {
    await typeInto(page, '#transit-country-search', 'Bel')
    await expect(page.locator('button.app-country-search__option', { hasText: 'Belgium' }).first()).toBeVisible()
    await shoot(page, 'S25', 'bel-suggestions-open')
    await page.locator('button.app-country-search__option', { hasText: 'Belgium' }).first().click()
    await shoot(page, 'S25', 'one-country-added')
    await typeInto(page, '#transit-country-search', 'Ger')
    await expect(page.locator('button.app-country-search__option', { hasText: 'Germany' }).first()).toBeVisible()
    await shoot(page, 'S25', 'ger-suggestions-open')
    await page.locator('button.app-country-search__option', { hasText: 'Germany' }).first().click()
    await shoot(page, 'S25', 'two-countries-added')
    await shootNoJs(browser, page, 'S25', 'default')
  })
})

// --- Transport and arrival: transporter ----------------------------------

test.describe('transporter details', () => {
  test.beforeEach(async ({ page }) => {
    await toTransporter(page)
  })

  test('S26 Transporter details: search box', async ({ page, browser }) => {
    await shoot(page, 'S26', 'default')
    await typeInto(page, '#transporter-search', 'Aber')
    await shoot(page, 'S26', 'filtered-aber')
    await shootNoJs(browser, page, 'S26', 'default')
  })

  test('S27 Transporter details: where the add a transporter link sits', async ({ page }) => {
    await shoot(page, 'S27', 'default')
  })
})

// --- Documents: upload documents -----------------------------------------

test.describe('upload documents', () => {
  test.beforeEach(async ({ page }) => {
    await toDocuments(page)
  })

  test('S28 Upload documents: date of issue picker', async ({ page, browser }) => {
    await shoot(page, 'S28', 'default')
    await openCalendar(page, '#date-of-issue')
    await shoot(page, 'S28', 'calendar-open')
    await shootNoJs(browser, page, 'S28', 'default')
  })

  test('S29 Upload documents: before any document is added', async ({ page }) => {
    await shoot(page, 'S29', 'no-documents')
  })

  test('S31 Upload documents: the table after upload and add another', async ({ page, browser }) => {
    await fillDocument(page, { reference: 'ITAHC-001' })
    await shoot(page, 'S31', 'file-chosen')
    await clickAction(page, 'add-another')
    await expect(page.locator('table.app-upload-documents-table tbody tr')).toHaveCount(1)
    await shoot(page, 'S31', 'one-document-added')
    await fillDocument(page, { type: 'air-waybill', reference: 'AWB-002', file: { name: 'awb.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% awb\n') } })
    await clickAction(page, 'add-another')
    await expect(page.locator('table.app-upload-documents-table tbody tr')).toHaveCount(2)
    await shoot(page, 'S31', 'two-documents-added')
    await shootNoJs(browser, page, 'S31', 'two-documents-added')
  })
})

// --- Consignment parties --------------------------------------------------

test.describe('consignment addresses', () => {
  test.beforeEach(async ({ page }) => {
    await toRoles(page)
  })

  test('S32 Consignment addresses: page layout, empty and complete', async ({ page, browser }) => {
    await shoot(page, 'S32', 'empty')
    await shootMobile(browser, page, 'S32', 'empty')
    for (const section of Object.keys(CORE_ADDRESSES)) await chooseAddress(page, section)
    await page.locator('main').getByRole('link', { name: 'Add a CPH number' }).click()
    await fillCph(page)
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/roles-and-addresses'))
    await shoot(page, 'S32', 'complete')
    await shootMobile(browser, page, 'S32', 'complete')
  })

  test('S33 Place of origin: address search bar', async ({ page, browser }) => {
    await page.goto(url('/place-of-origin'))
    await shoot(page, 'S33', 'default')
    await typeInto(page, '#place-of-origin-search', 'Green')
    await shoot(page, 'S33', 'filtered-green')
    await page.goto(url('/consignor-or-exporter'))
    await shoot(page, 'S33', 'consignor-default')
    await typeInto(page, '#consignor-search', 'Nordic')
    await shoot(page, 'S33', 'consignor-filtered-nordic')
    await shootNoJs(browser, page, 'S33', 'consignor-default')
    await page.goto(url('/place-of-origin'))
    await shootNoJs(browser, page, 'S33', 'default')
  })

  test('S36 Address selection pages: how each address is shown', async ({ page, browser }) => {
    for (const section of Object.keys(CORE_ADDRESSES)) {
      await page.goto(url(`/${section}`))
      await shoot(page, 'S36', section)
      await shootMobile(browser, page, 'S36', section)
    }
    await page.goto(url('/consignee'))
    await page.locator(`input[name="${CORE_ADDRESSES.consignee[0]}"]`).first().check()
    await shoot(page, 'S36', 'consignee-one-chosen')
  })

  test('S37 CPH number: typing moves to the next box', async ({ page, browser }) => {
    await page.locator('main').getByRole('link', { name: 'Add a CPH number' }).click()
    await expect(page).toHaveURL(urlFor('/cph-number'))
    await shoot(page, 'S37', 'default')
    await page.locator('#cph-number-county').click()
    await page.keyboard.type('12', { delay: 60 })
    await shoot(page, 'S37', 'county-typed-focus-moved')
    await page.keyboard.type('345', { delay: 60 })
    await page.keyboard.type('6789', { delay: 60 })
    await shoot(page, 'S37', 'all-typed-continuously')
    await shootNoJs(browser, page, 'S37', 'default')
    await shootNoJs(browser, page, 'S37', 'typed-continuously', async (p) => {
      await p.locator('#cph-number-county').click()
      await p.keyboard.type('123456789', { delay: 60 })
    })
  })
})

// --- Review and submit ----------------------------------------------------

test.describe('review your notification', () => {
  test.beforeEach(async ({ page }) => {
    await toIncompleteReview(page)
  })

  test('S34 Review your notification: answers still missing', async ({ page }) => {
    await shoot(page, 'S34', 'missing-answers')
    await submitForm(page, 'Continue')
    await shoot(page, 'S34', 'after-refused-continue')
  })

  test('S35 Review your notification: error handling on a refused submit', async ({ page, browser }) => {
    await shoot(page, 'S35', 'missing-answers')
    await submitForm(page, 'Continue')
    await expect(page).toHaveURL(urlFor('/review-notification'))
    await shoot(page, 'S35', 'after-refused-continue')
    const firstError = page.locator('.govuk-error-summary__list a').first()
    if (await firstError.count()) {
      await firstError.click()
      await page.waitForLoadState('load')
      await shoot(page, 'S35', 'first-error-link-followed')
    }
    await page.goto(url('/review-notification'))
    await shootNoJs(browser, page, 'S35', 'missing-answers')
  })
})

test.describe('notification submitted', () => {
  test('S38 Submit screen: import notification submitted', async ({ page }) => {
    test.setTimeout(240_000)
    await startNotification(page, 'live-animals')
    await answerOrigin(page, { search: 'Fran', country: 'France', region: 'Yes', code: '75', reference: 'CATTLE-2026-01' })
    await answerCommodity(page, SPECIES.cattle)
    await answerReason(page, { reason: 'Internal market', purpose: 'Breeding' })
    await answerConsignmentDetails(page, { [SPECIES.cattle.id]: 1 })
    await expect(page).toHaveURL(urlFor('/animal-identification-details'))
    await page.getByLabel('Ear tag').fill('UK123456700001')
    await page.getByLabel('Passport').fill('PP-001')
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/additional-animal-details'))
    await answerAdditionalDetails(page, { purpose: 'Further keeping', unweaned: 'No' })
    await expect(page).toHaveURL(urlFor('/arrival-details'))
    await answerArrival(page, { means: 'Air' })
    await expect(page).toHaveURL(urlFor('/transporter'))
    await answerTransporter(page)
    await expect(page).toHaveURL(urlFor('/upload-documents'))
    await fillDocument(page)
    await clickAction(page, 'add-another')
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/roles-and-addresses'))
    for (const section of Object.keys(CORE_ADDRESSES)) await chooseAddress(page, section)
    await page.locator('main').getByRole('link', { name: 'Add a CPH number' }).click()
    await fillCph(page)
    await saveAndContinue(page)
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/contact-address-for-consignment'))
    await answerContactAddress(page)
    await page.goto(url('/review-notification'))
    await shoot(page, 'S38', 'review-complete')
    await submitForm(page, 'Continue')
    await expect(page).toHaveURL(urlFor('/declaration'))
    await shoot(page, 'S38', 'declaration')
    await page.locator('#declaration-confirmed').check()
    await submitForm(page, 'Continue')
    await expect(page).toHaveURL(urlFor('/notification-submitted'))
    await shoot(page, 'S38', 'submitted')
  })
})
