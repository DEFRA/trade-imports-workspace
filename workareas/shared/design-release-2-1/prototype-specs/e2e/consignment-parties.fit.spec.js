const { test, expect } = require('./support/fixtures')
const { capture } = require('./support/evidence')
const {
  url, urlFor, expectHeading, expectErrorSummary, expectBackLink, expectNoErrorSummary,
  saveAndContinue, saveAndReturnToOverview, clickAction, SPECIES, startNotification, answerOrigin, answerCommodity,
  answerReason, answerConsignmentDetails, chooseAddress, fillCph, CORE_ADDRESSES
} = require('./support/journey')

// Sections 5 and 6 of the DR2.1 task list: consignment addresses (roles), the
// per-role address pickers, adding an address from inside the journey, CPH
// number (cattle and pigs), permanent address (pets), and the contact address.

const SECTION_COPY = {
  'place-of-origin': ['Place of origin', 'The address where the animals begin their journey to Great Britain', 'Add a place of origin'],
  'consignor-or-exporter': ['Consignor', 'This is the sender of the consignment.', 'Add a consignor'],
  consignee: ['Consignee', 'This is the receiver or buyer of the consignment being shipped or transported.', 'Add a consignee'],
  importer: ['Importer', 'This is usually the same as the consignee. You can select a different person if needed.', 'Add an importer'],
  'place-of-destination': ['Place of destination', 'This is where the animals will be unloaded and accommodated for at least 48 hours. If a health certificate is required, it will show this address.', 'Add a place of destination']
}

async function toRoles (page, species = SPECIES.cattle, count = 1) {
  await startNotification(page, 'live-animals')
  await answerOrigin(page)
  await answerCommodity(page, species)
  await answerReason(page)
  await answerConsignmentDetails(page, { [species.id]: count })
  await page.goto(url('/roles-and-addresses'))
  await expect(page).toHaveURL(urlFor('/roles-and-addresses'))
}

test.describe('consignment addresses', () => {
  test('cattle: five roles plus the CPH number', async ({ page }, testInfo) => {
    await toRoles(page)
    await expect(page).toHaveTitle('Consignment addresses - Import notification service - GOV.UK')
    await expectHeading(page, 'Consignment addresses')
    const main = page.locator('main')
    await expect(main).toContainText('Consignment parties')
    await expect(main).toContainText('Add all the addresses that are involved in the consignment.')
    await expect(main).toContainText('Providing a false address is an act of fraud')
    for (const [section, [heading, hint, linkText]] of Object.entries(SECTION_COPY)) {
      await expect(main).toContainText(heading)
      await expect(main).toContainText(hint)
      await expect(main.getByRole('link', { name: linkText })).toHaveAttribute('href', url(`/${section}`))
    }
    await expect(main).toContainText('County parish holding (CPH) number')
    await expect(main).toContainText('The county parish holding (CPH) number identifies the holding where the animals will be kept.')
    await expect(main.getByRole('link', { name: 'Add a CPH number' })).toHaveAttribute('href', url('/cph-number'))
    await expect(main.getByRole('link', { name: 'Add a permanent address' })).toHaveCount(0)
    await expectBackLink(page, url('/notification-hub'))
    await capture(page, testInfo, 'cattle-empty')
  })

  test('cat: permanent address replaces the CPH number', async ({ page }, testInfo) => {
    await toRoles(page, SPECIES.cat, 2)
    const main = page.locator('main')
    await expect(main).toContainText('Permanent address')
    await expect(main).toContainText('A permanent address is where an animal:')
    await expect(main).toContainText('will permanently reside')
    await expect(main).toContainText('can be checked by the Animal and Plant Health Agency (APHA)')
    await expect(main.getByRole('link', { name: 'Add a permanent address' })).toHaveAttribute('href', url('/permanent-address'))
    await expect(main.getByRole('link', { name: 'Add a CPH number' })).toHaveCount(0)
    await capture(page, testInfo, 'cat-empty')

    // CPH is not part of a pet consignment, so the CPH page sends the user back.
    await page.goto(url('/cph-number'))
    await expect(page).toHaveURL(urlFor('/roles-and-addresses'))
  })

  test('picking an address for every role, then the CPH number', async ({ page }, testInfo) => {
    await toRoles(page)

    await test.step('each picker lists the addresses for that role', async () => {
      for (const [section, [heading, hint]] of Object.entries(SECTION_COPY)) {
        await page.goto(url(`/${section}`))
        await expect(page).toHaveTitle(`${heading} - Import notification service - GOV.UK`)
        await expectHeading(page, heading)
        await expect(page.locator('main')).toContainText(hint)
        await expect(page.locator('main a', { hasText: 'Add a new address' })).toHaveAttribute('href', url(`/${section}/add-address`))
        await expect(page.locator(`input[name="${CORE_ADDRESSES[section][0]}"]`).first()).toBeVisible()
        await expect(page.locator('button[name="action"]')).toHaveText(['Save and continue', 'Save and return to hub'])
        await expectBackLink(page, url('/roles-and-addresses'))
        await capture(page, testInfo)
      }
      // Place of origin's search box is labelled with the transit-country copy.
      await page.goto(url('/place-of-origin'))
      await expect(page.locator('label[for="place-of-origin-search"]')).toHaveText('Enter a country')
      await expect(page.locator('main')).toContainText('Showing 9 out of 9 results')
    })

    await test.step('choosing an address per role', async () => {
      await page.goto(url('/roles-and-addresses'))
      for (const section of Object.keys(CORE_ADDRESSES)) {
        await chooseAddress(page, section)
      }
    })

    await test.step('the CPH number page', async () => {
      await page.locator('main').getByRole('link', { name: 'Add a CPH number' }).click()
      await expect(page).toHaveURL(urlFor('/cph-number'))
      await expect(page).toHaveTitle('Add the county parish holding number (CPH) - Import notification service - GOV.UK')
      await expectHeading(page, 'Add the county parish holding number (CPH)')
      const main = page.locator('main')
      await expect(main).toContainText('CPH number')
      await expect(main).toContainText('For example 12/345/6789')
      for (const label of ['County', 'Parish', 'Holding number']) {
        await expect(page.getByLabel(label, { exact: true })).toBeVisible()
      }
      await main.getByText('What is a CPH number?').click()
      await expect(main).toContainText('You can find your CPH number on documents from the Animal and Plant Health Agency (APHA)')
      await expectBackLink(page, url('/roles-and-addresses'))
      await capture(page, testInfo)
    })

    await test.step('a partial CPH number is accepted without error but not stored', async () => {
      await fillCph(page, { county: '12', parish: '', holding: '' })
      await saveAndContinue(page)
      await expectNoErrorSummary(page)
      await expect(page).toHaveURL(urlFor('/roles-and-addresses'))
      await expect(page.locator('main').getByRole('link', { name: 'Add a CPH number' })).toBeVisible()
    })

    await test.step('a full CPH number completes the section', async () => {
      await page.locator('main').getByRole('link', { name: 'Add a CPH number' }).click()
      await fillCph(page)
      await saveAndContinue(page)
      const main = page.locator('main')
      await expect(main).toContainText('Green Valley Livestock Farm')
      await expect(main).toContainText('Nordic Livestock Export AB')
      await expect(main).toContainText('Northern Livestock Imports Ltd')
      await expect(main).toContainText('Britannia Trade & Livestock Ltd')
      await expect(main).toContainText('Riverside Holding Facility')
      await expect(main).toContainText('12/345/6789')
      await expect(main.getByRole('link', { name: 'Change' })).toHaveCount(6)
      await capture(page, testInfo, 'complete')
    })

    await test.step('continue moves on to the contact address', async () => {
      await saveAndContinue(page)
      await expect(page).toHaveURL(urlFor('/contact-address-for-consignment'))
    })
  })

  test('same as place of origin / same as consignee shortcuts', async ({ page }, testInfo) => {
    await toRoles(page)
    await chooseAddress(page, 'place-of-origin')
    await chooseAddress(page, 'consignee')
    const main = page.locator('main')
    await expect(main.getByRole('button', { name: 'Same as place of origin' })).toHaveCount(1)
    await expect(main.getByRole('button', { name: 'Same as consignee' })).toHaveCount(2)
    await capture(page, testInfo, 'same-as-shortcuts')

    await main.getByRole('button', { name: 'Same as place of origin' }).click()
    await expect(page).toHaveURL(urlFor('/roles-and-addresses'))
    await expect(main.getByRole('button', { name: 'Same as place of origin' })).toHaveCount(0)
    await main.getByRole('button', { name: 'Same as consignee' }).first().click()
    await main.getByRole('button', { name: 'Same as consignee' }).first().click()
    await expect(main.getByRole('button', { name: 'Same as consignee' })).toHaveCount(0)
    // Every role now shows an address with a change link.
    await expect(main.getByRole('link', { name: 'Change' })).toHaveCount(5)
    await capture(page, testInfo, 'same-as-applied')
  })

  test('the address search on a picker filters the list', async ({ page }, testInfo) => {
    await toRoles(page)
    await page.goto(url('/consignor-or-exporter'))
    await expect(page.locator('label[for="consignor-search"]')).toHaveText('Search')
    await expect(page.locator('main')).toContainText('Name, address or country')
    await page.locator('#consignor-search').fill('Nordic')
    await expect(page.locator('input[name="consignorAddressId"]:visible')).toHaveCount(1)
    await capture(page, testInfo, 'search')
  })

  test('a picker continued with nothing chosen returns to the roles page unchanged', async ({ page }) => {
    await toRoles(page)
    await page.goto(url('/importer'))
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/roles-and-addresses'))
    await expect(page.locator('main').getByRole('link', { name: 'Add an importer' })).toBeVisible()
  })

  test('save and return to hub from a picker', async ({ page }) => {
    await toRoles(page)
    await page.goto(url('/consignee'))
    await page.locator('input[name="consigneeAddressId"]').first().check()
    await saveAndReturnToOverview(page)
    await expect(page).toHaveURL(urlFor('/notification-hub'))
  })
})

test.describe('add an address from the journey', () => {
  test('place of origin: an international address entered by hand', async ({ page }, testInfo) => {
    await toRoles(page)
    await page.goto(url('/place-of-origin'))
    await page.locator('main a', { hasText: 'Add a new address' }).click()
    await expect(page).toHaveURL(urlFor('/place-of-origin/add-address'))
    await expect(page).toHaveTitle('Add address and contact details - Import notification service - GOV.UK')
    await expectHeading(page, 'Add address and contact details')
    const main = page.locator('main')
    await expect(main).toContainText('Add new address')
    for (const label of ['Name or organisation', 'Address line 1', 'Address line 2 (optional)', 'Town or city', 'Postcode or Zip code', 'Country', 'Email address', 'Phone number']) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible()
    }
    await expect(main).toContainText('What else should this address be used for?')
    await expect(main).toContainText('This address is being added as a Place of origin address. Select any other roles or addresses this address should be used for.')
    await expect(page.locator('input[name="addressUses"] + label')).toHaveText(['Consignor'])
    await expect(page.locator('button[name="action"]')).toHaveText(['Save and select', 'Save and return to address page'])
    await expectBackLink(page, url('/place-of-origin'))
    await capture(page, testInfo)

    await clickAction(page, 'select')
    await expectErrorSummary(page, [
      'Enter a name or organisation name', 'Enter address line 1', 'Enter a town or city',
      'Enter a postcode or Zip code', 'Select a country', 'Enter an email address', 'Enter a phone number'
    ])
    await capture(page, testInfo, 'error')

    await page.getByLabel('Name or organisation', { exact: true }).fill('Ferme du Lac')
    await page.getByLabel('Address line 1', { exact: true }).fill('3 Rue du Lac')
    await page.getByLabel('Town or city', { exact: true }).fill('Annecy')
    await page.getByLabel('Postcode or Zip code', { exact: true }).fill('74000')
    await page.getByLabel('Country', { exact: true }).selectOption('France')
    await page.getByLabel('Email address', { exact: true }).fill('lac@example.com')
    await page.getByLabel('Phone number', { exact: true }).fill('+33 4 50 00 00 00')
    await page.locator('input[name="addressUses"][value="consignor"]').check()
    await clickAction(page, 'return')
    await expect(page).toHaveURL(urlFor('/place-of-origin'))
    await expect(main).toContainText('Ferme du Lac')
    await capture(page, testInfo, 'address-added')
  })

  test('consignee: a UK address found by search, then completed', async ({ page }, testInfo) => {
    await toRoles(page)
    await page.goto(url('/consignee/add-address'))
    const main = page.locator('main')
    await expect(page.getByLabel('Search for an address')).toBeVisible()
    await expect(page.locator('#consignment-address-lookup-search')).toHaveAttribute('placeholder', 'Start typing...')
    await expect(page.getByLabel('Address line 1', { exact: true })).toBeHidden()
    await capture(page, testInfo, 'lookup')

    await test.step('submitting before searching names the hidden address fields', async () => {
      await clickAction(page, 'select')
      await expectErrorSummary(page, [
        'Enter a name or organisation name', 'Enter address line 1', 'Enter a town or city',
        'Enter a postcode or Zip code', 'Enter an email address', 'Enter a phone number'
      ])
      await capture(page, testInfo, 'lookup-error')
    })

    await test.step('searching and picking an address fills and reveals the form', async () => {
      const search = page.locator('#consignment-address-lookup-search')
      await search.click()
      await search.pressSequentially('Acorn', { delay: 30 })
      const option = page.locator('.app-address-book-lookup-search__option').first()
      await expect(option).toBeVisible()
      await capture(page, testInfo, 'lookup-results')
      await option.click()
      await expect(page.getByLabel('Address line 1', { exact: true })).toBeVisible()
      await expect(page.getByLabel('Name or organisation', { exact: true })).not.toHaveValue('')
      await expect(page.locator('input[name="addressUses"] + label')).toHaveText(['Importer', 'Place of destination'])
      await capture(page, testInfo, 'lookup-picked')
    })

    await test.step('save and select records it and returns to the roles page', async () => {
      await page.getByLabel('Email address', { exact: true }).fill('acorn@example.com')
      await page.getByLabel('Phone number', { exact: true }).fill('01234 567890')
      await clickAction(page, 'select')
      await expect(page).toHaveURL(urlFor('/roles-and-addresses'))
      await expectNoErrorSummary(page)
    })
  })
})

test.describe('add-address pages for the other roles', () => {
  test('consignor is entered by hand; importer and place of destination search UK addresses', async ({ page }, testInfo) => {
    await toRoles(page)
    const cases = [
      ['consignor-or-exporter', 'Consignor', ['Place of origin'], false],
      ['importer', 'Importer', ['Consignee', 'Place of destination'], true],
      ['place-of-destination', 'Place of destination', ['Consignee', 'Importer'], true]
    ]
    for (const [section, role, otherUses, lookup] of cases) {
      await page.goto(url(`/${section}`))
      await page.locator('main a', { hasText: 'Add a new address' }).click()
      await expect(page).toHaveURL(urlFor(`/${section}/add-address`))
      await expectHeading(page, 'Add address and contact details')
      await expect(page.locator('main')).toContainText(new RegExp(`This address is being added as an? ${role} address\\.`))
      await expect(page.locator('input[name="addressUses"] + label')).toHaveText(otherUses)
      if (lookup) {
        await expect(page.getByLabel('Search for an address')).toBeVisible()
      } else {
        await expect(page.getByLabel('Address line 1', { exact: true })).toBeVisible()
      }
      await expectBackLink(page, url(`/${section}`))
      await capture(page, testInfo)
    }
  })
})

test.describe('permanent address', () => {
  test('cat: one choice per animal, same as destination or a new address', async ({ page }, testInfo) => {
    await toRoles(page, SPECIES.cat, 2)

    await test.step('the permanent address link opens the per-animal page', async () => {
      await page.locator('main').getByRole('link', { name: 'Add a permanent address' }).click()
      await expect(page).toHaveURL(urlFor('/permanent-address/select'))
      await expect(page).toHaveTitle('Permanent address - Import notification service - GOV.UK')
      await expectHeading(page, 'Permanent address')
      const main = page.locator('main')
      await expect(main).toContainText('Providing a false address is an act of fraud')
      await expect(main).toContainText('Where will their permanent address be?')
      await expect(main).toContainText('Felis catus 1')
      await expect(main).toContainText('Felis catus 2')
      await expect(page.locator('input[name="permanentAddressChoice[cat-felis-catus:0]"] + label')).toHaveText([
        'Same as the place of destination (POD)', 'Enter a new address'
      ])
      await expect(main).toContainText('This is where they will stay after spending 48 hours at the place of destination.')
      await expect(page.locator('button[name="action"]')).toHaveText(['Save and continue', 'Save and return to hub'])
      await expectBackLink(page, url('/roles-and-addresses'))
      await capture(page, testInfo, 'select')
    })

    await test.step('same as POD before a place of destination is chosen', async () => {
      await page.locator('input[name="permanentAddressChoice[cat-felis-catus:0]"][value="same-as-pod"]').check()
      await saveAndContinue(page)
      await expectErrorSummary(page, ['Add a place of destination before you can continue'])
      await capture(page, testInfo, 'error-no-place-of-destination')
    })

    await test.step('a new address reveals the address form, and every blank field is named per animal', async () => {
      await page.locator('input[name="permanentAddressChoice[cat-felis-catus:0]"][value="new-address"]').check()
      await expect(page.locator('#permanentAddressDetails-cat-felis-catus-0-name')).toBeVisible()
      await capture(page, testInfo, 'new-address-reveal')
      await saveAndContinue(page)
      await expectErrorSummary(page, [
        'Enter a name or organisation name for Felis catus 1',
        'Enter address line 1 for Felis catus 1',
        'Enter a town or city for Felis catus 1',
        'Enter a postcode or Zip code for Felis catus 1',
        'Enter an email address for Felis catus 1',
        'Enter a phone number for Felis catus 1'
      ])
      await capture(page, testInfo, 'error-new-address')
    })

    await test.step('with a place of destination chosen, both animals can use it', async () => {
      await page.goto(url('/roles-and-addresses'))
      await chooseAddress(page, 'place-of-destination')
      await page.locator('main').getByRole('link', { name: 'Add a permanent address' }).click()
      await page.locator('input[name="permanentAddressChoice[cat-felis-catus:0]"][value="same-as-pod"]').check()
      await page.locator('input[name="permanentAddressChoice[cat-felis-catus:1]"][value="same-as-pod"]').check()
      await saveAndContinue(page)
      await expect(page).toHaveURL(urlFor('/roles-and-addresses'))
      await expect(page.locator('main')).toContainText(/Permanent address[\s\S]*Riverside Holding Facility/)
      await capture(page, testInfo, 'cat-permanent-added')
    })
  })

  test('the enter-address path is retired and lands on the per-animal page', async ({ page }) => {
    await toRoles(page, SPECIES.cat, 1)
    await page.goto(url('/permanent-address/enter-address'))
    await expect(page).toHaveURL(urlFor('/permanent-address/select'))
  })
})

test.describe('contact address for consignment', () => {
  test('choose the contact address', async ({ page }, testInfo) => {
    await toRoles(page)
    await page.goto(url('/contact-address-for-consignment'))
    await expect(page).toHaveTitle('Contact address for consignment - Import notification service - GOV.UK')
    await expectHeading(page, 'Contact address for consignment')
    const main = page.locator('main')
    await expect(main).toContainText('This is the contact address of the person responsible for the consignment from when it enters Great Britain until authorities complete their checks.')
    await expect(main).toContainText('If the correct address is not shown, add a new branch address, then return to this page.')
    await expect(page.locator('input[name="contactAddressId"] + label')).toHaveText([
      'Aberdeen Livestock Ltd', 'West Country Livestock Ltd', 'Cymru Animal Imports Ltd'
    ])
    await expect(main).toContainText('15 Union Street, Aberdeen, AB11 5BN')
    await expect(page.locator('button[name="action"]')).toHaveText(['Save and continue', 'Save and return to hub'])
    await capture(page, testInfo)

    await saveAndContinue(page)
    await expectErrorSummary(page, ['Select a contact address'])
    await expect(page.locator('.govuk-error-summary__list a')).toHaveAttribute('href', '#contact-address')
    await capture(page, testInfo, 'error')

    await page.locator('input[name="contactAddressId"][value="aberdeen-livestock-harbour-road"]').check()
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/review-notification'))
  })

  test('add a new branch address from the contact page', async ({ page }, testInfo) => {
    await toRoles(page)
    await page.goto(url('/contact-address-for-consignment'))
    await page.locator('main').getByRole('link', { name: 'add a new branch address' }).click()
    await expect(page).toHaveURL(/\/address-book\/add\/lookup/)
    await capture(page, testInfo, 'from-contact')
  })
})
