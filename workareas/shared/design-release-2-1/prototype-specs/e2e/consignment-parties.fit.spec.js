const { test, expect } = require('./support/fixtures')
const { capture } = require('./support/evidence')
const {
  url, urlFor, expectHeading, expectErrorSummary, expectBackLink, expectNoErrorSummary,
  saveAndContinue, saveAndReturnToOverview, clickAction, submitForm, SPECIES, startNotification, answerOrigin, answerCommodity,
  answerReason, answerConsignmentDetails, chooseAddress, fillCph, CORE_ADDRESSES
} = require('./support/journey')

// Section 5 of the DR2.1 task list: consignment addresses (roles), the
// per-role address pickers, adding an address from inside the journey, CPH
// number (cattle and pigs) and permanent address (pets).

const SECTION_COPY = {
  'place-of-origin': ['Place of origin', 'The address where the animals begin their journey to Great Britain', 'Add a place of origin'],
  'consignor-or-exporter': ['Consignor', 'This is the sender of the consignment.', 'Add a consignor'],
  consignee: ['Consignee', 'This is the receiver or buyer of the consignment being shipped or transported.', 'Add a consignee'],
  importer: ['Importer', 'This is usually the same as the consignee. You can select a different person if needed.', 'Add an importer'],
  'place-of-destination': ['Place of destination', 'This is where the animals will be unloaded and accommodated for at least 48 hours. If a health certificate is required, it will show this address.', 'Add a place of destination']
}

const ADD_ADDRESS_PATH = {
  'place-of-origin': 'add-address',
  'consignor-or-exporter': 'add-address',
  consignee: 'find-address',
  importer: 'find-address',
  'place-of-destination': 'find-address'
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
    await expect(main.locator('.app-roles-and-addresses-page__caption')).toHaveText('Addresses')
    await expect(main).toContainText('Add all the addresses that are involved in the consignment.')
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
        await expect(page.locator('main a', { hasText: 'Add a new address' })).toHaveAttribute('href', url(`/${section}/${ADD_ADDRESS_PATH[section]}`))
        await expect(page.locator(`input[name="${CORE_ADDRESSES[section][0]}"]`).first()).toBeVisible()
        await expect(page.locator('button[name="action"]')).toHaveText(['Save and continue', 'Save and return to hub'])
        await expectBackLink(page, url('/roles-and-addresses'))
        await capture(page, testInfo)
      }
    })

    await test.step('every picker searches by name, address or country; only the place of destination warns about fraud', async () => {
      await page.goto(url('/place-of-origin'))
      await expect(page.locator('label[for="place-of-origin-search"]')).toHaveText('Search')
      await expect(page.locator('main')).toContainText('Name, address or country')
      await expect(page.locator('main')).toContainText('Showing 9 out of 9 results')
      await page.goto(url('/place-of-destination'))
      await expect(page.locator('main .govuk-warning-text')).toHaveText(/Providing a false address is an act of fraud/)
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

    await test.step('a full CPH number completes the section; each address can be changed or removed', async () => {
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
      await expect(main.locator('button[name="action"][value^="remove-address:"]')).toHaveCount(6)
      await capture(page, testInfo, 'complete')
    })

    await test.step('continue moves on to the review', async () => {
      await saveAndContinue(page)
      await expect(page).toHaveURL(urlFor('/review-notification'))
    })
  })

  test('remove takes an address off a role and brings back its add link', async ({ page }, testInfo) => {
    await toRoles(page)
    await chooseAddress(page, 'place-of-origin')
    await chooseAddress(page, 'consignee')
    const main = page.locator('main')
    await expect(main.locator('button[name="action"][value^="remove-address:"]')).toHaveText([/Remove\s+place of origin/, /Remove\s+consignee/])
    await capture(page, testInfo, 'remove-buttons')

    await main.locator('button[name="action"][value="remove-address:place-of-origin"]').click()
    await expect(page).toHaveURL(urlFor('/roles-and-addresses'))
    await expect(main.getByRole('link', { name: 'Add a place of origin' })).toBeVisible()
    await expect(main.getByRole('button', { name: 'Same as place of origin' })).toHaveCount(0)
    await expect(main.locator('button[name="action"][value^="remove-address:"]')).toHaveText([/Remove\s+consignee/])
    await expect(main).toContainText('Northern Livestock Imports Ltd')
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
    await expect(page).toHaveTitle('Add an address for a place of origin - Import notification service - GOV.UK')
    await expectHeading(page, 'Add an address for a place of origin')
    const main = page.locator('main')
    for (const label of ['Name or organisation', 'Address line 1', 'Address line 2 (optional)', 'Town or city', 'Postcode or Zip code', 'Country', 'Email address', 'Phone number']) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible()
    }
    const uses = main.locator('fieldset', { has: page.locator('input[name="addressUses"]') })
    await expect(uses.locator('legend')).toHaveText('Add to your address book')
    await expect(uses).toContainText('This address will be added to your address book as a Place of origin. Select any other types of address this can also be used for.')
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

  test('consignee: a UK address found by postcode, then completed', async ({ page }, testInfo) => {
    await toRoles(page)
    await page.goto(url('/consignee'))
    await page.locator('main a', { hasText: 'Add a new address' }).click()
    await expect(page).toHaveURL(urlFor('/consignee/find-address'))
    const main = page.locator('main')
    const postcode = page.locator('#postcode')

    await test.step('find address asks for a UK postcode', async () => {
      await expect(page).toHaveTitle('Add an address for a consignee – Import notification service – GOV.UK Prototype Kit')
      await expectHeading(page, 'Add an address for a consignee')
      await expect(page.getByLabel('Enter a UK postcode')).toHaveAccessibleDescription('For example, AB12 3CD')
      await expect(main.getByRole('link', { name: 'Enter address manually' })).toHaveAttribute('href', url('/consignee/add-address?manual=true'))
      await expect(main.getByRole('link', { name: 'Cancel and return to hub' })).toHaveAttribute('href', url('/notification-hub'))
      await expectBackLink(page, url('/consignee'))
      await capture(page, testInfo, 'find')
    })

    await test.step('no postcode, and a part postcode', async () => {
      await submitForm(page, 'Find address')
      await expectErrorSummary(page, ['Enter a postcode'])
      await expect(page.locator('.govuk-error-summary__list a')).toHaveAttribute('href', '#postcode')
      await capture(page, testInfo, 'find-error-empty')
      await postcode.fill('M1')
      await submitForm(page, 'Find address')
      await expectErrorSummary(page, ['Enter a full UK postcode, like BB4 4AA'])
      await capture(page, testInfo, 'find-error-partial')
    })

    await test.step('a postcode with no addresses', async () => {
      await postcode.fill('ZZ9 9ZZ')
      await submitForm(page, 'Find address')
      await expect(page).toHaveURL(urlFor('/consignee/find-address/select'))
      await expectHeading(page, 'No addresses found for ZZ9 9ZZ')
      await expect(main.getByRole('link', { name: 'Change postcode' })).toHaveAttribute('href', url('/consignee/find-address?findAddressPostcode=ZZ9%209ZZ'))
      await expect(main.getByRole('link', { name: 'Enter address manually' })).toBeVisible()
      await capture(page, testInfo, 'none-found')
    })

    await test.step('a postcode lists its addresses, and one must be chosen', async () => {
      await main.getByRole('link', { name: 'Change postcode' }).click()
      await postcode.fill('M1 1AL')
      await submitForm(page, 'Find address')
      await expect(page).toHaveTitle('Select an address – Import notification service – GOV.UK Prototype Kit')
      await expectHeading(page, 'Select an address')
      await expect(main).toContainText(/Postcode\s+M1 1AL/)
      await expect(page.locator('#address-id option')).toHaveText([
        '2 addresses found',
        'FLAT 105 OXID HOUSE, 78 NEWTON STREET, MANCHESTER, M1 1AL',
        'FLAT 606 OXID HOUSE, 78 NEWTON STREET, MANCHESTER, M1 1AL'
      ])
      await capture(page, testInfo, 'select')
      await submitForm(page, 'Continue')
      await expectErrorSummary(page, ['Select an address'])
      await expect(page.locator('.govuk-error-summary__list a')).toHaveAttribute('href', '#address-id')
      await capture(page, testInfo, 'select-error')
    })

    await test.step('the chosen address fills the add-address form', async () => {
      await page.locator('#address-id').selectOption('ch-M11AL-0')
      await submitForm(page, 'Continue')
      await expect(page).toHaveURL(urlFor('/consignee/add-address'))
      await expect(page).toHaveURL(/foundAddressId=ch-M11AL-0/)
      await expectHeading(page, 'Add an address for a consignee')
      await expect(page.getByLabel('Address line 1', { exact: true })).toHaveValue('FLAT 105 OXID HOUSE')
      await expect(page.getByLabel('Address line 2 (optional)', { exact: true })).toHaveValue('78 NEWTON STREET')
      await expect(page.getByLabel('Town or city', { exact: true })).toHaveValue('MANCHESTER')
      await expect(page.getByLabel('Postcode', { exact: true })).toHaveValue('M1 1AL')
      await expect(page.locator('input[name="addressUses"] + label')).toHaveText(['Importer', 'Place of destination'])
      await expectBackLink(page, url('/consignee/find-address'))
      await capture(page, testInfo, 'found-address')
    })

    await test.step('name and contact details are still needed', async () => {
      await clickAction(page, 'select')
      await expectErrorSummary(page, ['Enter a name or organisation name', 'Enter an email address', 'Enter a phone number'])
      await capture(page, testInfo, 'found-address-error')
    })

    await test.step('save and select records it and returns to the roles page', async () => {
      await page.getByLabel('Name or organisation', { exact: true }).fill('Oxid House Imports')
      await page.getByLabel('Email address', { exact: true }).fill('oxid@example.com')
      await page.getByLabel('Phone number', { exact: true }).fill('0161 000 0000')
      await clickAction(page, 'select')
      await expect(page).toHaveURL(urlFor('/roles-and-addresses'))
      await expectNoErrorSummary(page)
      await expect(main).toContainText('Oxid House Imports')
    })
  })
})

test.describe('add-address pages for the other roles', () => {
  test('consignor is entered by hand; importer and place of destination start with a UK postcode', async ({ page }, testInfo) => {
    await toRoles(page)
    const cases = [
      ['consignor-or-exporter', 'Add an address for a consignor', 'Consignor', ['Place of origin']],
      ['importer', 'Add an address for an importer', 'Importer', ['Consignee', 'Place of destination']],
      ['place-of-destination', 'Add an address for a place of destination', 'Place of destination', ['Consignee', 'Importer']]
    ]
    for (const [section, heading, role, otherUses] of cases) {
      await page.goto(url(`/${section}`))
      await page.locator('main a', { hasText: 'Add a new address' }).click()
      await expect(page).toHaveURL(urlFor(`/${section}/${ADD_ADDRESS_PATH[section]}`))
      await expectHeading(page, heading)
      await expectBackLink(page, url(`/${section}`))
      if (ADD_ADDRESS_PATH[section] === 'find-address') {
        await expect(page.getByLabel('Enter a UK postcode')).toBeVisible()
        await capture(page, testInfo)
        await page.locator('main').getByRole('link', { name: 'Enter address manually' }).click()
        await expect(page).toHaveURL(urlFor(`/${section}/add-address`))
        await expect(page).toHaveURL(/manual=true/)
        await expectHeading(page, heading)
      }
      await expect(page.getByLabel('Address line 1', { exact: true })).toBeVisible()
      await expect(page.locator('main')).toContainText(new RegExp(`This address will be added to your address book as an? ${role}\\. Select any other types of address this can also be used for\\.`))
      await expect(page.locator('input[name="addressUses"] + label')).toHaveText(otherUses)
      await capture(page, testInfo, ADD_ADDRESS_PATH[section] === 'find-address' ? 'manual' : '')
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
      await expect(main.locator('.app-permanent-address-animal-card__heading')).toHaveText(['Domestic cat (Felis catus) 1', 'Domestic cat (Felis catus) 2'])
      await expect(main.locator('.app-permanent-address-animal-card__legend').first()).toHaveText('Select an address')
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
        'Enter a name or organisation name for Domestic cat (Felis catus) 1',
        'Enter address line 1 for Domestic cat (Felis catus) 1',
        'Enter a town or city for Domestic cat (Felis catus) 1',
        'Enter a postcode or Zip code for Domestic cat (Felis catus) 1',
        'Enter an email address for Domestic cat (Felis catus) 1',
        'Enter a phone number for Domestic cat (Felis catus) 1'
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
  test('the contact address page sends the user to the review', async ({ page }) => {
    await toRoles(page)
    await page.goto(url('/contact-address-for-consignment'))
    await expect(page).toHaveURL(urlFor('/review-notification'))
    await expectHeading(page, 'Review your notification')
  })
})
