const { test, expect } = require('./support/fixtures')
const { capture } = require('./support/evidence')
const {
  url, urlFor, expectHeading, expectErrorSummary, expectInlineError, expectBackLink, dateFromToday,
  saveAndContinue, submitForm, pickFromAutocomplete, fillDate, SPECIES, startNotification, answerOrigin,
  answerCommodity, answerReason, answerConsignmentDetails, answerArrival
} = require('./support/journey')

// Section 3 of the DR2.1 task list: arrival details, transit countries (rail and
// road only), transporter details and adding a new transporter.

async function toArrival (page, species = SPECIES.chicken, count = 100) {
  await startNotification(page, 'live-animals')
  await answerOrigin(page)
  await answerCommodity(page, species)
  await answerReason(page)
  await answerConsignmentDetails(page, { [species.id]: count })
  await page.goto(url('/arrival-details'))
}

test.describe('arrival details', () => {
  test('means of transport is the one required answer', async ({ page }, testInfo) => {
    await toArrival(page)

    await test.step('renders the arrival questions', async () => {
      await expect(page).toHaveTitle('Arrival details - Import notification service - GOV.UK')
      await expectHeading(page, 'Arrival details')
      const main = page.locator('main')
      await expect(main).toContainText('Transport and arrival')
      await expect(page.getByLabel('Arrival date at port of entry')).toBeVisible()
      await expect(main).toContainText('The expected date of arrival at the port of entry. For example, 27/3/2026')
      await expect(page.getByLabel('Port of entry', { exact: true })).toBeVisible()
      await expect(main).toContainText('Select where the transporter will enter with the consignment. Start typing to search by port or airport name or code.')
      await expect(page.locator('#means-of-transport option')).toHaveText(['Select one', 'Air', 'Rail', 'Road', 'Sea'])
      await expect(page.getByLabel('Transport identification')).toBeVisible()
      for (const item of ['flight number', 'train number', 'road vehicle registration number', 'vessel name (for ferries, also the road vehicle registration number)']) {
        await expect(main).toContainText(item)
      }
      await expect(page.getByLabel('Transport document reference')).toBeVisible()
      await expect(main).toContainText('Enter the reference number on the air waybill, bill of lading, sea waybill, road consignment note (CMR) or other transport document.')
      await expectBackLink(page, url('/notification-hub'))
      await capture(page, testInfo)
    })

    await test.step('continuing without a means of transport', async () => {
      await saveAndContinue(page)
      await expectErrorSummary(page, ['Select a means of transport to the port of entry'])
      await expect(page.locator('.govuk-error-summary__list a')).toHaveAttribute('href', '#means-of-transport')
      await expectInlineError(page, 'Select a means of transport to the port of entry')
      await capture(page, testInfo, 'error')
    })

    await test.step('the port of entry search', async () => {
      await fillDate(page, '#arrival-date-at-port', dateFromToday(14))
      const input = page.locator('#port-of-entry')
      await input.click()
      await input.pressSequentially('Dover', { delay: 30 })
      await expect(page.locator('button.app-country-search__option', { hasText: 'Dover' }).first()).toBeVisible()
      await capture(page, testInfo, 'port-search-open')
      await page.locator('button.app-country-search__option', { hasText: 'Dover' }).first().click()
      await expect(page.locator('input[name="portOfEntry"]')).toHaveValue(/Dover/)
    })

    await test.step('rail goes on to transit countries', async () => {
      await page.locator('#means-of-transport').selectOption('Rail')
      await saveAndContinue(page)
      await expect(page).toHaveURL(urlFor('/transit-countries'))
    })
  })

  test('air and sea skip transit countries', async ({ page }) => {
    await toArrival(page)
    await answerArrival(page, { means: 'Air' })
    await expect(page).toHaveURL(urlFor('/transporter'))
    await page.goto(url('/transit-countries'))
    // The transit page is guarded: with no rail or road leg it sends the user to the hub.
    await expect(page).toHaveURL(urlFor('/notification-hub'))
  })
})

test.describe('transit countries', () => {
  test('add and remove the countries the consignment travels through', async ({ page }, testInfo) => {
    await toArrival(page)
    await answerArrival(page, { means: 'Road', port: { search: 'Dover', option: 'Dover' }, transportId: 'AB12 CDE' })
    await expect(page).toHaveURL(urlFor('/transit-countries'))

    await test.step('renders the transit question', async () => {
      await expect(page).toHaveTitle('Transit countries - Import notification service - GOV.UK')
      await expectHeading(page, 'Which countries will the consignment travel through?')
      const main = page.locator('main')
      await expect(main).toContainText('Movement')
      await expect(main).toContainText('Countries the consignment will travel through are countries between the country of origin and the destination country.')
      await expect(main).toContainText('This does not include the United Kingdom.')
      await expect(page.getByLabel('Enter a country')).toBeVisible()
      await expect(main).toContainText('Enter each country that the consignment will travel through')
      await expectBackLink(page, url('/arrival-details'))
      await capture(page, testInfo)
    })

    await test.step('adding two countries lists them', async () => {
      await pickFromAutocomplete(page, 'transit-country-search', 'Belg', 'Belgium')
      await pickFromAutocomplete(page, 'transit-country-search', 'Germ', 'Germany')
      await expect(page.locator('input[name="transitCountries"]')).toHaveValue('["Belgium","Germany"]')
      await expect(page.locator('main')).toContainText(/Country\s+Belgium/)
      await capture(page, testInfo, 'two-countries')
    })

    await test.step('removing one', async () => {
      await page.locator('main').getByRole('link', { name: 'Remove' }).first().click()
      await expect(page.locator('input[name="transitCountries"]')).toHaveValue('["Germany"]')
    })

    await test.step('countries are optional; continue goes to the transporter', async () => {
      await saveAndContinue(page)
      await expect(page).toHaveURL(urlFor('/transporter'))
    })
  })
})

test.describe('transporter details', () => {
  test.beforeEach(async ({ page }) => {
    await toArrival(page)
    await answerArrival(page, { means: 'Air' })
    await expect(page).toHaveURL(urlFor('/transporter'))
  })

  test('select a transporter from the list', async ({ page }, testInfo) => {
    await expect(page).toHaveTitle('Transporter details - Import notification service - GOV.UK')
    await expectHeading(page, 'Transporter details')
    const main = page.locator('main')
    await expect(main).toContainText('This is the person or company responsible for transporting the consignment.')
    await expect(main).toContainText('Your transporter must hold a valid transporter authorisation, issued by DAERA or APHA in the UK if they are:')
    await expect(main).toContainText('Documents issued in any EU member state are not valid for use in GB.')
    await expect(main.getByRole('link', { name: 'Find out how to transport animals in connection with an economic activity (opens in a new tab)' })).toBeVisible()
    await expect(main.locator('a', { hasText: 'Add a transporter' })).toHaveAttribute('href', url('/transporter/add'))
    await expect(main).toContainText(/Name\s+Address\s+Approval number\s+Type\s+Status/)
    await expect(page.locator('input[name="transporterId"]')).toHaveCount(8)
    await expect(main).toContainText('UK/ABERDEEN/T1/00092001')
    // View details opens the shared (unprefixed) address book entry.
    await expect(main.getByRole('link', { name: 'View details' }).first()).toHaveAttribute('href', '/address-book/yusen-logistics-romania?return=%2Ftransporter')
    await expectBackLink(page, url('/notification-hub'))
    await capture(page, testInfo)

    await page.locator('input[name="transporterId"][value="aberdeen-livestock"]').check()
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/upload-documents'))
  })

  test('transporter is optional to proceed', async ({ page }) => {
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/upload-documents'))
  })

  test('the legacy transport-details path redirects to the transporter page', async ({ page }) => {
    await page.goto(url('/transport-details'))
    await expect(page).toHaveURL(urlFor('/transporter'))
  })
})

test.describe('add a transporter', () => {
  test.beforeEach(async ({ page }) => {
    await toArrival(page)
    await answerArrival(page, { means: 'Air' })
    await page.locator('main a', { hasText: 'Add a transporter' }).click()
    await expect(page).toHaveURL(urlFor('/transporter/add'))
  })

  test('choose a transporter type', async ({ page }, testInfo) => {
    await expect(page).toHaveTitle('Choose a transporter type - Import notification service - GOV.UK')
    await expectHeading(page, 'Choose a transporter type')
    const main = page.locator('main')
    await expect(main).toContainText('Add a new transporter')
    await expect(main).toContainText('Check the transporter list before adding new transporters to avoid duplicates.')
    await expect(page.locator('input[name="transporterType"] + label')).toHaveText(['Private transporter', 'Commercial'])
    await expect(main).toContainText('This can only be a commercial transporter from Northern Ireland.')
    await capture(page, testInfo)

    await submitForm(page, 'Continue')
    await expectErrorSummary(page, ['Select a transporter type'])
    await expect(page.locator('.govuk-error-summary__list a')).toHaveAttribute('href', '#transporter-type-private')
    await capture(page, testInfo, 'error')
  })

  test('private transporter: every required field is named, then it is added and selectable', async ({ page }, testInfo) => {
    await page.locator('input[name="transporterType"][value="private"]').check()
    await submitForm(page, 'Continue')
    await expect(page).toHaveURL(urlFor('/transporter/add/private'))
    await expect(page).toHaveTitle('Add a private transporter - Import notification service - GOV.UK')
    await expectHeading(page, 'Add a private transporter')
    for (const label of ['Name or organisation name', 'Address line 1', 'Address line 2 (optional)', 'Town or city', 'County (optional)', 'Postcode or Zip code', 'Country', 'Email address', 'Phone number']) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible()
    }
    await expect(page.getByLabel('Country', { exact: true })).toHaveValue('United Kingdom')
    await expect(page.locator('main')).toContainText('Enter contact details')
    await expect(page.locator('main')).toContainText('For international numbers include the country code')
    await expectBackLink(page, url('/transporter/add'))
    await capture(page, testInfo)

    await submitForm(page, 'Save and continue')
    await expectErrorSummary(page, [
      'Enter a name or organisation name', 'Enter address line 1', 'Enter a town or city',
      'Enter a postcode or Zip code', 'Enter an email address', 'Enter a phone number'
    ])
    await capture(page, testInfo, 'error')

    await page.getByLabel('Name or organisation name', { exact: true }).fill('Hill Haulage')
    await page.getByLabel('Address line 1', { exact: true }).fill('1 Farm Lane')
    await page.getByLabel('Town or city', { exact: true }).fill('Hexham')
    await page.getByLabel('Postcode or Zip code', { exact: true }).fill('NE46 1AA')
    await page.getByLabel('Email address', { exact: true }).fill('hill@example.com')
    await page.getByLabel('Phone number', { exact: true }).fill('01434 600000')
    await submitForm(page, 'Save and continue')
    await expect(page).toHaveURL(urlFor('/transporter'))
    await expect(page.locator('main')).toContainText('Hill haulage transporter added')
    await expect(page.locator('main')).toContainText('Hill Haulage')
    await capture(page, testInfo, 'transporter-added')
  })

  test('private transporter: cancel leaves the journey for the dashboard', async ({ page }) => {
    await page.locator('input[name="transporterType"][value="private"]').check()
    await submitForm(page, 'Continue')
    await submitForm(page, 'Cancel and return to dashboard')
    // From inside the journey, cancel lands on the overall dashboard, not the transporter list.
    await expect(page).toHaveURL(new RegExp(`${url().replace(/\./g, '\\.')}$`))
    await expectHeading(page, 'Import notification service')
  })

  test('commercial transporter: authorisation number, address search or manual entry', async ({ page }, testInfo) => {
    await page.locator('input[name="transporterType"][value="commercial"]').check()
    await submitForm(page, 'Continue')
    await expect(page).toHaveURL(urlFor('/transporter/add/commercial'))
    await expect(page).toHaveTitle('Add a commercial transporter - Import notification service - GOV.UK')
    await expectHeading(page, 'Add a commercial transporter')
    const main = page.locator('main')
    await expect(main).toContainText('Help with transporter authorisation')
    await expect(page.getByLabel('Transporter authorisation number')).toBeVisible()
    await expect(page.getByLabel('Name or organisation name', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Search for an address')).toBeVisible()
    await expect(page.getByLabel('Address line 1', { exact: true })).toBeHidden()
    await capture(page, testInfo)

    await test.step('enter address manually reveals the address fields, fixed to Northern Ireland', async () => {
      await main.getByRole('button', { name: 'Enter address manually' }).click()
      await expect(page.getByLabel('Address line 1', { exact: true })).toBeVisible()
      await expect(page.locator('#transporter-commercial-country')).toHaveValue('Northern Ireland')
      await capture(page, testInfo, 'manual-address')
    })

    await test.step('every required field is named', async () => {
      await submitForm(page, 'Save and continue')
      await expectErrorSummary(page, [
        'Enter a transporter authorisation number', 'Enter a name or organisation name', 'Enter address line 1',
        'Enter a town or city', 'Enter a postcode or Zip code', 'Enter an email address', 'Enter a phone number'
      ])
      await capture(page, testInfo, 'error')
    })

    await test.step('a complete commercial transporter is added', async () => {
      await page.getByLabel('Transporter authorisation number').fill('UK/BELFAST/T1/00012345')
      await page.getByLabel('Name or organisation name', { exact: true }).fill('Lough Livestock Ltd')
      await page.getByLabel('Address line 1', { exact: true }).fill('2 Quay Street')
      await page.getByLabel('Town or city', { exact: true }).fill('Belfast')
      await page.getByLabel('Postcode or Zip code', { exact: true }).fill('BT1 1AA')
      await page.getByLabel('Email address', { exact: true }).fill('lough@example.com')
      await page.getByLabel('Phone number', { exact: true }).fill('028 9000 0000')
      await submitForm(page, 'Save and continue')
      await expect(page).toHaveURL(urlFor('/transporter'))
      await expect(page.locator('main')).toContainText('Lough livestock ltd transporter added')
      await expect(page.locator('main')).toContainText('UK/BELFAST/T1/00012345')
    })
  })
})
