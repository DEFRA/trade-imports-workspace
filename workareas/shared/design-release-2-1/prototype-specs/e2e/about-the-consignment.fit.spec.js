const { test, expect } = require('./support/fixtures')
const { capture } = require('./support/evidence')
const {
  url, urlFor, expectHeading, expectErrorSummary, expectInlineError, expectBackLink, expectNoErrorSummary,
  saveAndContinue, saveAndReturnToOverview, pickFromAutocomplete, chooseSpecies, fillDate, readReference,
  SPECIES, startNotification, answerOrigin, answerCommodity
} = require('./support/journey')

// Section 1 of the DR2.1 task list: notification type (new in DR2.1), origin,
// what are you importing, and main import reason.

const REASON_HINTS = {
  'Internal market': 'For imports of animals intended for sale or use in Great Britain (England, Scotland or Wales).',
  'Transhipment or onward travel': 'For animals intended for direct travel to a third country, that will stay only within the same port or airport in Great Britain while moving to another means of transport.',
  Transit: 'For animals moving through Great Britain for direct travel to a third country, that will enter Great Britain at one port or airport and leave from a different one within England, Scotland or Wales.',
  'Re-entry': 'For animals authorised for re-entry, or rejected exports re-entering Great Britain.',
  'Temporary admission horses': 'For horses authorised for temporary entry.'
}

const INTERNAL_MARKET_PURPOSES = [
  'Transfer of ownership - Sale/gift',
  'Transfer of ownership - Rescue',
  'Breeding',
  'Research',
  'Racing, competition, show or training',
  'Approved premises or body',
  'Companion animal not for resale or rehoming',
  'Production',
  'Slaughter',
  'Fattening',
  'Restocking'
]

test.describe('notification type', () => {
  test('create new asks what is being imported before the journey starts', async ({ page }, testInfo) => {
    await test.step('/create-notification without a category redirects to the type question', async () => {
      await page.goto(url('/create-notification'))
      await expect(page).toHaveURL(urlFor('/notification-type'))
      await expect(page).toHaveTitle('What are you importing? - Import notification service - GOV.UK')
      await expect(page.locator('legend h1')).toHaveText(/About the consignment\s+What are you importing\?/)
      await expect(page.locator('input[name="notificationType"] + label')).toHaveText([
        'Live animals',
        'Germinal products (semen, ova, embryos)',
        'Plants for planting',
        'Potatoes (seed and ware)',
        'Wood products'
      ])
      await expectBackLink(page, url())
      await expect(page.locator('button[name="action"]')).toHaveText(['Continue'])
      await capture(page, testInfo)
    })

    await test.step('continuing with nothing chosen', async () => {
      await saveAndContinue(page)
      await expectErrorSummary(page, ['Select what you are importing'])
      await expectInlineError(page, 'Select what you are importing')
      await expect(page.locator('.govuk-error-summary__list a')).toHaveAttribute('href', '#notificationType')
      await capture(page, testInfo, 'error')
    })

    await test.step('live animals opens the origin page with a draft reference', async () => {
      await page.locator('input[name="notificationType"][value="live-animals"]').check()
      await saveAndContinue(page)
      await expect(page).toHaveURL(urlFor('/origin-of-the-import'))
      expect(await readReference(page)).toMatch(/^GBN-AG-26-[A-Z0-9]+$/)
      await expect(page.locator('main')).toContainText('Draft')
    })
  })

  test('starting from a category dashboard skips the type question', async ({ page }) => {
    await page.goto(url('/live-animals'))
    await page.locator('main').getByRole('button', { name: 'Create new' }).click()
    await expect(page).toHaveURL(urlFor('/origin-of-the-import'))
    await expectBackLink(page, url('/live-animals'))
  })

  test('plants for planting reaches the commodity search, which offers nothing to pick', async ({ page }, testInfo) => {
    await startNotification(page, 'plants-for-planting')
    await answerOrigin(page)
    await expect(page).toHaveURL(urlFor('/what-are-you-importing'))
    const input = page.locator('#commodity-search')
    await input.click()
    await input.pressSequentially('cattle', { delay: 30 })
    await expect(page.locator('input[name="commodity-selection"]')).toHaveCount(0)
    await capture(page, testInfo, 'plants-no-results')
  })
})

test.describe('origin of the import', () => {
  test.beforeEach(async ({ page }) => {
    await startNotification(page, 'live-animals')
  })

  test('renders the origin questions', async ({ page }, testInfo) => {
    await expect(page).toHaveTitle('Origin of the import - Import notification service - GOV.UK')
    await expectHeading(page, 'Origin of the import')
    const main = page.locator('main')
    await expect(main).toContainText('About the consignment')
    await expect(main.getByRole('heading', { name: 'Country of origin' })).toBeVisible()
    await expect(page.locator('#country-of-origin')).toHaveAttribute('placeholder', 'Search for a country')
    await expect(main).toContainText('Does the consignment have a region of origin code?')
    await expect(main).toContainText('Check the health certificate for a region of origin code. You can add the code later if you do not have the certificate now.')
    await expect(page.getByLabel('Your internal reference for this consignment (optional)')).toBeVisible()
    await expect(main).toContainText('Enter any internal reference you want to use to identify this consignment, or leave blank.')
    await expectBackLink(page, url('/notification-type'))
    // DR2.1 origin offers only the forward button: no hub save, no cancel link.
    await expect(page.locator('button[name="action"]')).toHaveText(['Save and continue'])
    await expect(main.getByRole('link', { name: 'Cancel and return to overview' })).toHaveCount(0)
    await capture(page, testInfo)
  })

  test('region code: Yes reveals the code box with the country prefix, and an empty code is an error', async ({ page }, testInfo) => {
    await test.step('Yes reveals the code input', async () => {
      await expect(page.locator('#region-of-origin-code-suffix')).toBeHidden()
      await page.locator('input[name="regionOfOriginRequired"][value="Yes"]').check()
      await expect(page.getByLabel('Enter the region of origin code')).toBeVisible()
      await expect(page.locator('main')).toContainText('Enter up to 5 characters.')
      await capture(page, testInfo, 'region-code-reveal')
    })

    await test.step('Yes with no code', async () => {
      await saveAndContinue(page)
      await expectErrorSummary(page, ['Enter the region of origin code'])
      await expect(page.locator('.govuk-error-summary__list a')).toHaveAttribute('href', '#region-of-origin-code-suffix')
      await expectInlineError(page, 'Enter the region of origin code')
      await capture(page, testInfo, 'error-region-code')
    })

    await test.step('the chosen country prefixes the code box', async () => {
      await pickFromAutocomplete(page, 'country-of-origin', 'Fran', 'France')
      await expect(page.locator('#region-of-origin-code-prefix')).toHaveText('FR')
      await page.locator('#region-of-origin-code-suffix').fill('75')
      await capture(page, testInfo, 'region-code-prefix')
      await saveAndContinue(page)
      await expect(page).toHaveURL(urlFor('/what-are-you-importing'))
    })
  })

  test('country is optional to proceed and the answers are kept', async ({ page }) => {
    await page.locator('input[name="regionOfOriginRequired"][value="No"]').check()
    await page.locator('#internal-reference').fill('REF-2026/01')
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/what-are-you-importing'))
    await page.goto(url('/origin-of-the-import'))
    await expect(page.locator('input[name="regionOfOriginRequired"][value="No"]')).toBeChecked()
    await expect(page.locator('#internal-reference')).toHaveValue('REF-2026/01')
    await expect(page.locator('input[name="countryOfOrigin"]')).toHaveValue('')
  })

  test('the country search offers matching countries and keeps the pick', async ({ page }, testInfo) => {
    const input = page.locator('#country-of-origin')
    await input.click()
    await input.pressSequentially('Neth', { delay: 30 })
    await expect(page.locator('button.app-country-search__option', { hasText: 'Netherlands' })).toBeVisible()
    await capture(page, testInfo, 'country-search-open')
    await page.locator('button.app-country-search__option', { hasText: 'Netherlands' }).click()
    await expect(page.locator('input[name="countryOfOrigin"]')).toHaveValue('Netherlands')
  })
})

test.describe('what are you importing', () => {
  test.beforeEach(async ({ page }) => {
    await startNotification(page, 'live-animals')
    await answerOrigin(page)
    await expect(page).toHaveURL(urlFor('/what-are-you-importing'))
  })

  test('renders the commodity search for live animals', async ({ page }, testInfo) => {
    await expect(page).toHaveTitle('What are you importing? - Import notification service - GOV.UK')
    await expectHeading(page, 'What are you importing?')
    const main = page.locator('main')
    await expect(main).toContainText('You must submit a separate notification for every single ITAHC. You must also submit a notification for goods that do not need an ITAHC.')
    await expect(page.getByLabel('Search for a commodity')).toBeVisible()
    await expect(main).toContainText('You can search by common name (for example, cattle), commodity code (0102), or Latin name (Bos taurus).')
    await expect(page.locator('button[name="action"]')).toHaveText(['Save and continue', 'Save and return to overview'])
    await expect(main.getByRole('link', { name: 'Cancel and return to overview' })).toHaveAttribute('href', url('/notification-hub'))
    await expectBackLink(page, url('/origin-of-the-import'))
    await capture(page, testInfo)

    await test.step('help with commodity codes', async () => {
      await main.getByText('Help with commodity codes').click()
      await expect(main).toContainText('Commodity codes are internationally recognised reference numbers.')
      await expect(main.getByRole('link', { name: 'Trade Tariff tool' })).toHaveAttribute('href', 'https://www.gov.uk/trade-tariff')
      await capture(page, testInfo, 'help-open')
    })
  })

  test('nothing selected is an error', async ({ page }, testInfo) => {
    await saveAndContinue(page)
    await expectErrorSummary(page, ['Select a commodity'])
    await expect(page.locator('.govuk-error-summary__list a')).toHaveAttribute('href', '#commodity-search')
    await expectInlineError(page, 'Select a commodity')
    await capture(page, testInfo, 'error')
  })

  test('search lists the species of a commodity; ticking one adds it to the selection', async ({ page }, testInfo) => {
    const input = page.locator('#commodity-search')
    await input.click()
    await input.pressSequentially('cattle', { delay: 30 })
    await expect(page.locator('main')).toContainText('Cattle (0102)')
    await expect(page.locator('main')).toContainText('11 results available')
    await expect(page.locator('label[for="commodity-species-cattle-bos-taurus"]')).toContainText('Bos taurus')
    await capture(page, testInfo, 'search-results')

    await page.locator('#commodity-species-cattle-bos-taurus').check()
    await input.press('Escape')
    const selected = page.locator('#commodity-search-selected')
    await expect(selected).toContainText('1 selected')
    await expect(selected).toContainText('Cattle (0102):')
    await expect(selected).toContainText('Bos taurus')
    await expect(selected.getByRole('button', { name: 'Clear all' })).toBeVisible()
    await capture(page, testInfo, 'one-selected')
  })

  test('several commodities can be selected together, and cleared', async ({ page }, testInfo) => {
    await chooseSpecies(page, SPECIES.horse.search, SPECIES.horse.id)
    await chooseSpecies(page, 'pig', 'pig-sus-scrofa')
    const selected = page.locator('#commodity-search-selected')
    await expect(selected).toContainText('2 selected')
    await expect(selected).toContainText('Horse (0101):')
    await expect(selected).toContainText('Pig (0103):')
    await expect(selected.getByRole('button', { name: 'Remove Sus scrofa domesticus' })).toBeVisible()
    await capture(page, testInfo, 'two-selected')
    await selected.getByRole('button', { name: 'Clear all' }).click()
    await expect(page.locator('input.app-commodity-search__species-value')).toHaveValue('[]')
  })

  test('save and return to overview keeps the selection without validating', async ({ page }) => {
    await saveAndReturnToOverview(page)
    await expect(page).toHaveURL(urlFor('/notification-hub'))
  })
})

test.describe('main import reason', () => {
  test.beforeEach(async ({ page }) => {
    await startNotification(page, 'live-animals')
    await answerOrigin(page)
    await answerCommodity(page, SPECIES.cattle)
    await expect(page).toHaveURL(urlFor('/reason-for-import'))
  })

  test('lists every reason with its hint', async ({ page }, testInfo) => {
    await expect(page).toHaveTitle('Main import reason - Import notification service - GOV.UK')
    await expectHeading(page, 'Main import reason')
    await expect(page.locator('main')).toContainText('About the consignment')
    await expect(page.locator('input[name="importReason"] + label')).toHaveText(Object.keys(REASON_HINTS))
    for (const hint of Object.values(REASON_HINTS)) {
      await expect(page.locator('main')).toContainText(hint)
    }
    await expectBackLink(page, url('/what-are-you-importing'))
    await capture(page, testInfo)
  })

  test('a reason is optional to proceed', async ({ page }) => {
    await saveAndContinue(page)
    await expectNoErrorSummary(page)
    await expect(page).toHaveURL(urlFor('/consignment-details'))
  })

  test('internal market reveals the purposes and needs one', async ({ page }, testInfo) => {
    await page.locator('input[name="importReason"][value="Internal market"]').check()
    await expect(page.locator('input[name="internalMarketPurpose"] + label')).toHaveText(INTERNAL_MARKET_PURPOSES)
    await expect(page.locator('main')).toContainText('Purpose in the internal market')
    await capture(page, testInfo, 'internal-market-reveal')
    await saveAndContinue(page)
    await expectErrorSummary(page, ['Select a purpose in the internal market'])
    await expect(page.locator('.govuk-error-summary__list a')).toHaveAttribute('href', '#internal-market-purpose')
    await capture(page, testInfo, 'error-internal-market')
    await page.locator('input[name="internalMarketPurpose"][value="Breeding"]').check()
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/consignment-details'))
  })

  test('transhipment needs a destination country', async ({ page }, testInfo) => {
    await page.locator('input[name="importReason"][value="Transhipment or onward travel"]').check()
    await expect(page.locator('label[for="transhipment-destination-country"]')).toHaveText('Destination country')
    await expect(page.locator('#transhipment-destination-country')).toBeVisible()
    await capture(page, testInfo, 'transhipment-reveal')
    await saveAndContinue(page)
    await expectErrorSummary(page, ['Select a destination country'])
    await capture(page, testInfo, 'error-transhipment')
    await page.locator('#transhipment-destination-country').selectOption('Republic of Ireland')
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/consignment-details'))
  })

  test('transit needs a port of exit and a destination country', async ({ page }, testInfo) => {
    await page.locator('input[name="importReason"][value="Transit"]').check()
    await expect(page.locator('#transit-exit-border-control-post option').nth(1)).toHaveText('Edinburgh Airport (animals) - GBEDI4')
    await capture(page, testInfo, 'transit-reveal')
    await saveAndContinue(page)
    await expectErrorSummary(page, ['Select a port of exit', 'Select a destination country'])
    await capture(page, testInfo, 'error-transit')
    await page.locator('#transit-exit-border-control-post').selectOption('Holyhead POE - GBHLY')
    await page.locator('#transit-destination-country').selectOption('Republic of Ireland')
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/consignment-details'))
  })

  test('temporary admission horses needs a real exit date and a port of exit', async ({ page }, testInfo) => {
    await page.locator('input[name="importReason"][value="Temporary admission horses"]').check()
    await expect(page.getByLabel('Exit date')).toBeVisible()
    await expect(page.locator('main')).toContainText('For example, 27/3/2026')
    await capture(page, testInfo, 'temporary-admission-reveal')

    await saveAndContinue(page)
    await expectErrorSummary(page, ['Enter an exit date', 'Select a port of exit'])
    await capture(page, testInfo, 'error-temporary-admission')

    await fillDate(page, '#temporary-admission-exit-date', '31/2/2026')
    await saveAndContinue(page)
    await expectErrorSummary(page, ['Enter a real date', 'Select a port of exit'])
    await capture(page, testInfo, 'error-temporary-admission-real-date')
  })

  test('the prototype seed route jumps straight to the reason page', async ({ page }) => {
    await page.goto(url('/prototype/reason-for-import'))
    await expect(page).toHaveURL(urlFor('/reason-for-import'))
    await expectHeading(page, 'Main import reason')
  })
})

test.describe('germinal products: section 1', () => {
  test('category start, germinal search hint and the reduced list of reasons', async ({ page }, testInfo) => {
    await page.goto(url('/create-notification?category=germinal-products'))
    await expect(page).toHaveURL(urlFor('/origin-of-the-import'))
    await expectBackLink(page, url('/germinal-products'))
    await answerOrigin(page, { search: 'Neth', country: 'Netherlands' })

    await test.step('germinal commodity search', async () => {
      await expect(page.locator('main')).toContainText('You can search for semen, ova or embryos, or by common name (for example, cattle), Latin name (Bos taurus) or commodity code (05119985).')
      const input = page.locator('#commodity-search')
      await input.click()
      await input.pressSequentially('semen', { delay: 30 })
      await expect(page.locator('main')).toContainText('Cattle, Semen (05111000)')
      await capture(page, testInfo, 'germinal-search-results')
      await input.press('Escape')
      await answerCommodity(page, SPECIES.cattleSemen)
    })

    await test.step('only internal market and transit are offered', async () => {
      await expect(page).toHaveURL(urlFor('/reason-for-import'))
      await expect(page.locator('input[name="importReason"] + label')).toHaveText(['Internal market', 'Transit'])
      await page.locator('input[name="importReason"][value="Internal market"]').check()
      await expect(page.locator('input[name="internalMarketPurpose"] + label')).toHaveText([
        'Transfer of ownership - Sale/gift', 'Breeding', 'Research', 'Production'
      ])
      await capture(page, testInfo, 'germinal')
    })
  })
})
