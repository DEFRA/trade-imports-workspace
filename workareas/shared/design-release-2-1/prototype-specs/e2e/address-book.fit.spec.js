const { test, expect } = require('./support/fixtures')
const { capture } = require('./support/evidence')
const { url, urlFor, expectHeading, expectErrorSummary, expectBackLink, submitForm, clickAction } = require('./support/journey')

// The address book under the DR2.1 mount. Its views are shared with the other
// releases (only the delete confirmation is a DR2.1 override), but every route is
// reachable at /design-release-2.1/address-book and links stay inside the mount.

const MANUAL_ERRORS = [
  'Enter a name or organisation name', 'Enter address line 1', 'Enter a town or city',
  'Enter a postcode or Zip code', 'Enter an email address', 'Enter a phone number'
]

async function chooseType (page, type) {
  await page.goto(url('/address-book/add'))
  await page.locator(`input[name="addressType"][value="${type}"]`).check()
  await submitForm(page, 'Continue')
}

test.describe('address book list', () => {
  test('categories, pagination and filters', async ({ page }, testInfo) => {
    await test.step('origin and consignor addresses by default', async () => {
      await page.goto(url('/address-book'))
      await expect(page).toHaveTitle('Address book - Import notification service - GOV.UK')
      await expectHeading(page, 'Address book')
      const main = page.locator('main')
      await expect(main).toContainText('Manage your addresses for use across all your import notifications')
      await expect(main.locator('a', { hasText: 'Add a new address' })).toHaveAttribute('href', url('/address-book/add'))
      await expect(main).toContainText('Filter addresses')
      for (const [name, category] of [['Origin and Consignor', 'origin-and-consignor'], ['Destination, Consignee and Importer', 'destination-consignee-importer'], ['Transporter', 'transporter'], ['Branch', 'branch']]) {
        await expect(main.locator(`a[href="${url(`/address-book?category=${category}`)}"]`).first()).toContainText(name)
      }
      await expect(main.getByRole('heading', { name: 'Origin and Consignor addresses' })).toBeVisible()
      await expect(main).toContainText('Showing 1-8 of 23')
      await expect(main).toContainText(/Name\s+Type\s+Address\s+Country/)
      await expect(page.locator('#address-book-type option')).toHaveText(['Select one', 'Place of Origin', 'Consignor'])
      await expect(main.getByRole('link', { name: 'View' }).first()).toHaveAttribute('href', url('/address-book/green-valley-farm-sanpetru-0'))
      await expect(page.locator('.govuk-service-navigation__item--active')).toContainText('Address book')
      await capture(page, testInfo, 'origin-and-consignor')
    })

    await test.step('page 2', async () => {
      await page.locator('.govuk-pagination').getByRole('link', { name: 'Next' }).click()
      await expect(page).toHaveURL(/page=2/)
      await expect(page.locator('main')).toContainText('Showing 9-16 of 23')
      await capture(page, testInfo, 'page-2')
    })

    for (const category of ['destination-consignee-importer', 'transporter', 'branch']) {
      await test.step(`${category} addresses`, async () => {
        await page.goto(url(`/address-book?category=${category}`))
        await expect(page.locator('main table')).toBeVisible()
        await capture(page, testInfo, category)
      })
    }

    await test.step('search within a category', async () => {
      await page.goto(url('/address-book'))
      // Search and type sit inside a collapsed "Filter addresses" disclosure.
      await expect(page.locator('#address-book-search')).toBeHidden()
      await page.locator('.app-address-book-page__filter-summary').click()
      await expect(page.locator('label[for="address-book-search"]')).toHaveText('Search')
      await expect(page.locator('#address-book-search')).toHaveAttribute('placeholder', 'Search by name, address or country')
      await page.locator('#address-book-search').pressSequentially('Ballymore', { delay: 30 })
      // Ballymore Farm is held twice: once as a place of origin, once as a consignor.
      await expect(page.locator('main tbody tr:visible')).toHaveCount(2)
      await expect(page.locator('main tbody tr:visible')).toContainText(['Ballymore', 'Ballymore'])
      await capture(page, testInfo, 'search')
    })
  })
})

test.describe('add an address to the address book', () => {
  test('choose an address type', async ({ page }, testInfo) => {
    await page.goto(url('/address-book/add'))
    await expect(page).toHaveTitle('Choose an address type - Import notification service - GOV.UK')
    await expectHeading(page, 'Choose an address type')
    const main = page.locator('main')
    await expect(main).toContainText('Add a new address')
    await expect(page.locator('input[name="addressType"] + label')).toHaveText(['Origin or Consignor', 'Destination, Consignee or Importer', 'Transporter', 'Branch'])
    for (const hint of ['Place of origin, Consignor', 'Place of destination, Consignee, Importer', 'Private, Commercial', 'Branch address']) {
      await expect(main).toContainText(hint)
    }
    await expectBackLink(page, url('/address-book'))
    await capture(page, testInfo)

    await submitForm(page, 'Continue')
    await expectErrorSummary(page, ['Select an address type'])
    await expect(page.locator('.govuk-error-summary__list a')).toHaveAttribute('href', '#address-type-origin-and-consignor')
    await capture(page, testInfo, 'error')
  })

  test('origin or consignor: an address entered by hand with its uses', async ({ page }, testInfo) => {
    await chooseType(page, 'origin-and-consignor')
    await expect(page).toHaveURL(urlFor('/address-book/add/lookup'))
    await expect(page).toHaveTitle('Add an address - Import notification service - GOV.UK')
    await expectHeading(page, 'Add an address')
    const uses = page.locator('main fieldset', { has: page.locator('input[name="addressUses"]') })
    await expect(uses.locator('legend')).toHaveText('Add to your address book')
    await expect(uses).toContainText('Select what types of address this can be used for in your address book.')
    await expect(page.locator('input[name="addressUses"] + label')).toHaveText(['Place of origin', 'Consignor'])
    await capture(page, testInfo, 'origin-and-consignor')

    await clickAction(page, 'continue')
    await expectErrorSummary(page, MANUAL_ERRORS)
    await capture(page, testInfo, 'origin-and-consignor-error')

    await page.getByLabel('Name or organisation', { exact: true }).fill('Hof Sonnenberg')
    await page.getByLabel('Address line 1', { exact: true }).fill('Bergstrasse 5')
    await page.getByLabel('Town or city', { exact: true }).fill('Munich')
    await page.getByLabel('Postcode or Zip code', { exact: true }).fill('80331')
    const country = page.locator('#address-book-manual-country')
    if (await country.evaluate((el) => el.tagName === 'SELECT')) {
      await country.selectOption('Germany')
    }
    await page.getByLabel('Email address', { exact: true }).fill('hof@example.com')
    await page.getByLabel('Phone number', { exact: true }).fill('+49 89 000000')
    await page.locator('input[name="addressUses"][value="place-of-origin"]').check()
    await clickAction(page, 'continue')
    await expect(page).toHaveURL(/\/design-release-2\.1\/address-book/)
    await expect(page.locator('main')).toContainText('Hof Sonnenberg')
    await capture(page, testInfo, 'address-added')
  })

  test('destination, consignee or importer: a UK address found by postcode', async ({ page }, testInfo) => {
    await chooseType(page, 'destination-consignee-importer')
    await expect(page).toHaveURL(urlFor('/address-book/add/find-address'))
    await expect(page).toHaveTitle('Add an address – Import notification service – GOV.UK Prototype Kit')
    await expectHeading(page, 'Add an address')
    const main = page.locator('main')
    await expect(page.getByLabel('Enter a UK postcode')).toHaveAccessibleDescription('For example, AB12 3CD')
    await expect(main.getByRole('link', { name: 'Enter address manually' })).toHaveAttribute('href', url('/address-book/add/lookup?manual=true'))
    await expect(main.getByRole('link', { name: 'Cancel and return to address book' })).toHaveAttribute('href', url('/address-book'))
    await expectBackLink(page, url('/address-book/add'))
    await capture(page, testInfo, 'destination-consignee-importer')

    await submitForm(page, 'Find address')
    await expectErrorSummary(page, ['Enter a postcode'])
    await capture(page, testInfo, 'destination-consignee-importer-error')

    await page.locator('#postcode').fill('BB4 4JG')
    await submitForm(page, 'Find address')
    await expect(page).toHaveURL(urlFor('/address-book/add/find-address/select'))
    await expectHeading(page, 'Select an address')
    await expect(page.locator('#address-id option').first()).toHaveText('5 addresses found')
    await expect(page.locator('#address-id option')).toContainText(['UNIT 2 YORK AVENUE, HASLINGDEN, ROSSENDALE, BB4 4JG'])
    await capture(page, testInfo, 'destination-select')

    await page.locator('#address-id').selectOption({ label: 'UNIT 2 YORK AVENUE, HASLINGDEN, ROSSENDALE, BB4 4JG' })
    await submitForm(page, 'Continue')
    await expect(page).toHaveURL(urlFor('/address-book/add/lookup'))
    await expect(page.getByLabel('Address line 1', { exact: true })).toHaveValue('UNIT 2 YORK AVENUE')
    await expect(page.getByLabel('Town or city', { exact: true })).toHaveValue('ROSSENDALE')
    await expect(page.locator('input[name="addressUses"] + label')).toHaveText(['Place of destination', 'Consignee', 'Importer'])
    await capture(page, testInfo, 'destination-picked')
  })

  test('branch: a UK address found by postcode, with the branch address use', async ({ page }, testInfo) => {
    await chooseType(page, 'branch')
    await expect(page).toHaveURL(urlFor('/address-book/add/find-address'))
    await page.locator('main').getByRole('link', { name: 'Enter address manually' }).click()
    await expect(page).toHaveURL(urlFor('/address-book/add/lookup'))
    await expect(page).toHaveURL(/manual=true/)
    await expect(page.locator('input[name="addressUses"]')).toHaveCount(1)
    await expect(page.locator('input[name="addressUses"] + label')).toHaveText(['Branch address'])
    await capture(page, testInfo, 'branch')
  })

  test('transporter: hands over to the add-a-transporter pages', async ({ page }) => {
    await chooseType(page, 'transporter')
    await expect(page).toHaveURL(urlFor('/transporter/add'))
    await expectHeading(page, 'Choose a transporter type')
  })

  test('the usage step is only reachable with an address pending', async ({ page }) => {
    await page.goto(url('/address-book/add/usage'))
    await expect(page).toHaveURL(urlFor('/address-book/add'))
  })
})

test.describe('an address book entry', () => {
  const ENTRY = '/address-book/green-valley-farm-sanpetru-0'

  test('view, edit and save', async ({ page }, testInfo) => {
    await test.step('view', async () => {
      await page.goto(url(ENTRY))
      await expect(page).toHaveTitle('Green Valley Farm - Import notification service - GOV.UK')
      await expectHeading(page, 'Green Valley Farm')
      const main = page.locator('main')
      await expect(main).toContainText(/Name or organisation name\s+Green Valley Farm/)
      await expect(main).toContainText(/Country\s+Romania/)
      await expect(main).toContainText(/Email address\s+info@greenvalleyfarm\.eu/)
      await capture(page, testInfo)
    })

    await test.step('edit', async () => {
      await page.locator('main').locator('a', { hasText: /^\s*Edit\s*$/ }).click()
      await expect(page).toHaveURL(urlFor(`${ENTRY}/edit`))
      await expect(page).toHaveTitle('Edit address and contact details - Import notification service - GOV.UK')
      await expectHeading(page, 'Edit address and contact details')
      await expect(page.getByLabel('Name or organisation name', { exact: true })).toHaveValue('Green Valley Farm')
      await capture(page, testInfo)
    })

    await test.step('clearing a required field is an error', async () => {
      await page.getByLabel('Name or organisation name', { exact: true }).fill('')
      await page.locator('main form button[type="submit"]').first().click()
      await expect(page.locator('.govuk-error-summary')).toContainText('Enter a name or organisation name')
      await capture(page, testInfo, 'error')
    })

    await test.step('saving the edit returns to the list with a banner', async () => {
      await page.getByLabel('Name or organisation name', { exact: true }).fill('Green Valley Farm SRL')
      await page.getByLabel('Town or city', { exact: true }).fill('Sânpetru')
      await page.getByLabel('Postcode or Zip code', { exact: true }).fill('507190')
      await page.locator('main form button[type="submit"]').first().click()
      await expect(page).toHaveURL(urlFor('/address-book'))
      await expect(page.locator('.govuk-notification-banner')).toContainText(/Green valley farm srl address updated/i)
      await capture(page, testInfo, 'updated')
    })
  })

  test('delete: confirm, then the list says it was deleted', async ({ page }, testInfo) => {
    await page.goto(url(`${ENTRY}/delete`))
    await expect(page).toHaveTitle('Delete this address? - Import notification service - GOV.UK')
    await expectHeading(page, 'Delete this address?')
    const main = page.locator('main')
    await expect(main).toContainText(/Address\s+Green Valley Farm/)
    await expect(main.locator('.govuk-inset-text')).toHaveText('This will not remove the address from existing notifications.')
    await expect(main).toContainText('This action cannot be undone.')
    await expect(main.locator('a', { hasText: 'No, cancel' })).toBeVisible()
    await capture(page, testInfo)
    await submitForm(page, 'Yes, delete')
    await expect(page).toHaveURL(urlFor('/address-book'))
    await expect(page.locator('.govuk-notification-banner')).toContainText('Green valley farm address deleted')
    await expect(page.locator('main')).toContainText('Showing 1-8 of 22')
    await capture(page, testInfo, 'deleted')
  })
})
