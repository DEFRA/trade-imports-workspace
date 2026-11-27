const { test, expect } = require('./support/fixtures')
const { capture } = require('./support/evidence')
const {
  url, urlFor, expectHeading, expectErrorSummary, expectInlineError, expectBackLink,
  saveAndContinue, chooseSpecies, SPECIES, startNotification, answerOrigin, answerCommodity, answerReason,
  answerConsignmentDetails, answerGerminalCommodityDetails, answerGrossWeight
} = require('./support/journey')

// Section 2 of the DR2.1 task list: commodity details, identification details
// and additional details. Which pages appear depends on the species chosen.

const CERTIFICATION_PURPOSES = [
  'Further keeping', 'Slaughter', 'Confined establishment', 'Germinal products', 'Registered equine animal',
  'Travelling circus/animal act', 'Exhibition', 'Event or activity near borders', 'Release into the wild',
  'Dispatch centre', 'Relaying area / purification centre', 'Ornamental aquaculture establishment',
  'Technical use', 'Quarantine or similar establishment', 'Live aquatic animals for human consumption', 'Other'
]

async function toCommodityDetails (page, species, { type = 'live-animals', reason = {} } = {}) {
  if (type === 'germinal-products') {
    await page.goto(url('/create-notification?category=germinal-products'))
  } else {
    await startNotification(page, type)
  }
  await answerOrigin(page)
  for (const s of species) await chooseSpecies(page, s.search, s.id)
  await saveAndContinue(page)
  await answerReason(page, reason)
  await expect(page).toHaveURL(urlFor('/consignment-details'))
}

const GERMINAL_ID = SPECIES.cattleSemen.id

test.describe('commodity details', () => {
  test('cattle: number of animals is required and must be a whole number', async ({ page }, testInfo) => {
    await toCommodityDetails(page, [SPECIES.cattle])

    await test.step('renders the selected commodity and its fields', async () => {
      await expect(page).toHaveTitle('Commodity details - Import notification service - GOV.UK')
      await expectHeading(page, 'Commodity details')
      const main = page.locator('main')
      await expect(main).toContainText('Description of the goods')
      await expect(main).toContainText('Selected commodities')
      await expect(main).toContainText(/Commodity code\s+Commodity\s+Species\s+0102\s+Cattle\s+Domestic cattle \(Bos taurus\)/)
      await expect(main.getByRole('button', { name: 'Remove' })).toBeVisible()
      await expect(main.getByRole('link', { name: 'Add another commodity' })).toHaveAttribute('href', url('/what-are-you-importing'))
      await expect(main).toContainText('Cattle (0102)')
      await expect(page.getByLabel('Number of animals')).toBeVisible()
      await expect(page.getByLabel('Number of packages (when required)')).toBeVisible()
      await expect(main).toContainText('Such as crates, bags or boxes')
      await expectBackLink(page, url('/what-are-you-importing'))
      await capture(page, testInfo)
    })

    await test.step('empty number of animals', async () => {
      await saveAndContinue(page)
      await expectErrorSummary(page, ['Enter the number of animals'])
      await expect(page.locator('.govuk-error-summary__list a')).toHaveAttribute('href', '#number-of-animals-cattle-bos-taurus')
      await capture(page, testInfo, 'error-required')
    })

    await test.step('zero animals', async () => {
      await page.getByLabel('Number of animals').fill('0')
      await saveAndContinue(page)
      await expectErrorSummary(page, ['Enter a whole number greater than 0'])
      await expectInlineError(page, 'Enter a whole number greater than 0')
      await capture(page, testInfo, 'error-whole-number')
    })

    await test.step('a valid count continues to identification details', async () => {
      await page.getByLabel('Number of animals').fill('2')
      await saveAndContinue(page)
      await expect(page).toHaveURL(urlFor('/animal-identification-details'))
    })
  })

  test('two commodities get one block each; removing the last returns to the search', async ({ page }, testInfo) => {
    await toCommodityDetails(page, [SPECIES.horse, { search: 'pig', id: 'pig-sus-scrofa' }])
    const main = page.locator('main')
    await expect(main).toContainText('Horse (0101)')
    await expect(main).toContainText('Pig (0103)')
    await expect(page.locator('input[name^="numberOfAnimals["]')).toHaveCount(2)
    await capture(page, testInfo, 'two-commodities')

    await main.locator('button[name="removeCommodity"][value="horse"]').click()
    await expect(page).toHaveURL(urlFor('/consignment-details'))
    await expect(main.locator('button[name="removeCommodity"]')).toHaveCount(1)
    await expect(main).toContainText('Pig (0103)')
    await main.locator('button[name="removeCommodity"][value="pig"]').click()
    await expect(page).toHaveURL(urlFor('/what-are-you-importing'))
  })

  test('germinal products: quantity in units or pieces, optional number of packages and storage temperature', async ({ page }, testInfo) => {
    await toCommodityDetails(page, [SPECIES.cattleSemen], { type: 'germinal-products' })
    const main = page.locator('main')
    const quantity = page.locator(`#quantity-${GERMINAL_ID}`)
    const packages = page.locator(`#number-of-packages-${GERMINAL_ID}`)

    await test.step('renders the commodity, its quantity and packages fields and the temperature question', async () => {
      await expectHeading(page, 'Commodity details')
      await expect(main).toContainText(/Commodity code\s+Commodity\s+Species\s+05111000\s+Cattle, Semen\s+Domestic cattle \(Bos taurus\)/)
      await expect(main).toContainText('Cattle, Semen (05111000)')
      await expect(page.getByLabel('Quantity (unit/pieces)')).toHaveAttribute('id', `quantity-${GERMINAL_ID}`)
      await expect(page.getByLabel('Number of packages', { exact: true })).toHaveAttribute('id', `number-of-packages-${GERMINAL_ID}`)
      await expect(main.locator('fieldset', { hasText: 'Temperature' })).toContainText('How the products will be stored.')
      await expect(page.locator('input[name="storageTemperature"] + label')).toHaveText(['Ambient', 'Chilled', 'Frozen'])
      await expectBackLink(page, url('/what-are-you-importing'))
      await capture(page, testInfo, 'germinal')
    })

    await test.step('quantity and temperature are required; packages are not', async () => {
      await saveAndContinue(page)
      await expectErrorSummary(page, ['Enter the quantity', 'Select a temperature'])
      await expect(page.locator('.govuk-error-summary__list a').first()).toHaveAttribute('href', `#quantity-${GERMINAL_ID}`)
      await capture(page, testInfo, 'germinal-error-required')
    })

    await test.step('quantity and packages must be whole numbers greater than 0', async () => {
      await quantity.fill('x')
      await packages.fill('0')
      await saveAndContinue(page)
      await expectErrorSummary(page, ['Enter a whole number greater than 0', 'Number of packages must be a whole number greater than 0', 'Select a temperature'])
      await expect(page.locator('.govuk-error-summary__list a').nth(1)).toHaveAttribute('href', `#number-of-packages-${GERMINAL_ID}`)
      await capture(page, testInfo, 'germinal-error-invalid')
    })

    await test.step('a quantity and a temperature continue to the total gross weight', async () => {
      await quantity.fill('20')
      await packages.fill('')
      await page.locator('input[name="storageTemperature"][value="Frozen"]').check()
      await saveAndContinue(page)
      await expect(page).toHaveURL(urlFor('/consignment-gross-weight'))
    })
  })
})

test.describe('total gross weight', () => {
  test('germinal products: one weight for the consignment, required and greater than 0', async ({ page }, testInfo) => {
    await toCommodityDetails(page, [SPECIES.cattleSemen], { type: 'germinal-products' })
    await answerGerminalCommodityDetails(page, { [GERMINAL_ID]: 20 })
    await expect(page).toHaveURL(urlFor('/consignment-gross-weight'))
    const weight = page.locator('#gross-weight')

    await test.step('renders the question, its hint and the kg suffix', async () => {
      await expect(page).toHaveTitle('What is the total gross weight of the consignment? - Import notification service - GOV.UK')
      await expectHeading(page, 'What is the total gross weight of the consignment?')
      const main = page.locator('main')
      await expect(main).toContainText('Description of the goods')
      await expect(weight).toHaveAccessibleDescription('This includes the weight of all the commodities in the consignment and their packaging.')
      await expect(main.locator('.govuk-input__suffix')).toHaveText('kg')
      await expectBackLink(page, url('/consignment-details'))
      await capture(page, testInfo)
    })

    await test.step('no weight', async () => {
      await saveAndContinue(page)
      await expectErrorSummary(page, ['Enter the total gross weight'])
      await expect(page.locator('.govuk-error-summary__list a')).toHaveAttribute('href', '#gross-weight')
      await capture(page, testInfo, 'error-required')
    })

    await test.step('text and zero are not weights', async () => {
      for (const value of ['abc', '0']) {
        await weight.fill(value)
        await saveAndContinue(page)
        await expectErrorSummary(page, ['Enter a number greater than 0'])
      }
      await expectInlineError(page, 'Enter a number greater than 0')
      await capture(page, testInfo, 'error-invalid')
    })

    await test.step('a decimal weight continues to identification details', async () => {
      await weight.fill('12.5')
      await saveAndContinue(page)
      await expect(page).toHaveURL(urlFor('/animal-identification-details'))
      await expectBackLink(page, url('/consignment-gross-weight'))
    })
  })

  test('live animals have no total gross weight page', async ({ page }) => {
    await toCommodityDetails(page, [SPECIES.cattle])
    await answerConsignmentDetails(page, { [SPECIES.cattle.id]: 1 })
    await expect(page).toHaveURL(urlFor('/animal-identification-details'))
    await page.goto(url('/consignment-gross-weight'))
    await expect(page).not.toHaveURL(urlFor('/consignment-gross-weight'))
  })
})

test.describe('identification details', () => {
  test('cattle: passport, ear tag or identification number for each animal, saved one at a time', async ({ page }, testInfo) => {
    await toCommodityDetails(page, [SPECIES.cattle])
    await answerConsignmentDetails(page, { [SPECIES.cattle.id]: 2 })
    const main = page.locator('main')

    await test.step('first animal', async () => {
      await expect(page).toHaveTitle('Identification details - Import notification service - GOV.UK')
      await expectHeading(page, 'Identification details')
      await expect(main).toContainText('You must add all identification details before the consignment arrives at the port of entry.')
      await expect(main).toContainText('Enter details for Domestic cattle (Bos taurus) 1 of 2')
      await expect(main).toContainText('Enter at least one identifier.')
      await expect(main.locator('input[name^="identifiers["]')).toHaveCount(3)
      for (const label of ['Passport', 'Ear tag', 'Identification number']) {
        await expect(page.getByLabel(label, { exact: true })).toBeVisible()
      }
      await expect(main.getByRole('link', { name: 'Change number of animals' })).toHaveAttribute('href', url('/consignment-details'))
      await expect(main.getByRole('button', { name: 'Save and add another' })).toBeVisible()
      await expectBackLink(page, url('/consignment-details'))
      await capture(page, testInfo, 'animal-1-of-2')
    })

    await test.step('an animal with no identifier is not saved', async () => {
      await page.getByRole('button', { name: 'Save and add another' }).click()
      await expectErrorSummary(page, ['Enter at least one identifier'])
      await expect(page.locator('.govuk-error-summary__list a')).toHaveAttribute('href', '#identifier-cattle-bos-taurus-passport')
      await expect(main).toContainText('Enter details for Domestic cattle (Bos taurus) 1 of 2')
      await capture(page, testInfo, 'error-no-identifier')
    })

    await test.step('saving the first animal moves on to the second and lists the first', async () => {
      await page.getByLabel('Passport', { exact: true }).fill('PP-001')
      await page.getByLabel('Ear tag', { exact: true }).fill('UK123456700001')
      await page.getByRole('button', { name: 'Save and add another' }).click()
      await expect(main).toContainText('Enter details for Domestic cattle (Bos taurus) 2 of 2')
      await expect(main.getByRole('button', { name: 'Save and finish' })).toBeVisible()
      await expect(main).toContainText(/Animal\s+Passport\s+Ear tag\s+Domestic cattle \(Bos taurus\) 1\s+PP-001\s+UK123456700001/)
      await expect(main.locator('button[value="remove:cattle-bos-taurus:0"]')).toHaveText('Remove')
      await capture(page, testInfo, 'animal-2-of-2')
    })

    await test.step('one identifier is enough for the last animal', async () => {
      await page.getByLabel('Identification number', { exact: true }).fill('ID-002')
      await page.getByRole('button', { name: 'Save and finish' }).click()
      await expect(page.locator('button[value="remove:cattle-bos-taurus:1"]')).toBeVisible()
      await expect(main).toContainText(/Animal\s+Passport\s+Ear tag\s+Identification number/)
      await expect(main).toContainText(/Domestic cattle \(Bos taurus\) 2\s+ID-002/)
      await expect(main.locator('input[name^="identifiers["]')).toHaveCount(0)
      await capture(page, testInfo, 'all-animals-saved')
    })

    await test.step('removing an animal reopens its panel', async () => {
      await page.locator('button[value="remove:cattle-bos-taurus:1"]').click()
      await expect(main).toContainText('Enter details for Domestic cattle (Bos taurus) 2 of 2')
    })

    await test.step('continue moves on to additional details', async () => {
      await saveAndContinue(page)
      await expect(page).toHaveURL(urlFor('/additional-animal-details'))
    })
  })

  const IDENTIFIERS_BY_SPECIES = [
    { name: 'horse', species: SPECIES.horse, heading: 'Enter details for Equus cabalus 1 of 2', labels: ['Passport', 'Microchip/transponder', 'Equine name'] },
    { name: 'cat', species: SPECIES.cat, heading: 'Enter details for Domestic cat (Felis catus) 1 of 2', labels: ['Passport', 'Microchip/transponder', 'Tattoo'] },
    { name: 'pig', species: { search: 'pig', id: 'pig-sus-scrofa' }, heading: 'Enter details for Sus scrofa domesticus 1 of 2', labels: ['Ear tag', 'Identification number'] }
  ]

  for (const { name, species, heading, labels } of IDENTIFIERS_BY_SPECIES) {
    test(`${name}: the identifiers asked for depend on the species`, async ({ page }, testInfo) => {
      await toCommodityDetails(page, [species])
      await answerConsignmentDetails(page, { [species.id]: 2 })
      await expect(page).toHaveURL(urlFor('/animal-identification-details'))
      const main = page.locator('main')
      await expect(main).toContainText(heading)
      await expect(main.locator('input[name^="identifiers["]')).toHaveCount(labels.length)
      for (const label of labels) await expect(page.getByLabel(label, { exact: true })).toBeVisible()
      await capture(page, testInfo, name)
    })
  }

  test('poultry: one flock panel per species, with classification and hatching date', async ({ page }, testInfo) => {
    await toCommodityDetails(page, [SPECIES.chicken])
    await answerConsignmentDetails(page, { [SPECIES.chicken.id]: 400 })
    await expect(page).toHaveURL(urlFor('/animal-identification-details'))
    const main = page.locator('main')
    await expect(main).toContainText('Enter details for Gallus domesticus')
    await expect(main).not.toContainText('1 of 400')
    for (const label of ['Flock ID', 'Classification', 'Description', 'Identification details', 'Hatching date']) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible()
    }
    await expect(page.locator(`#identifier-${SPECIES.chicken.id}-classification option`)).toHaveText([
      'Select a classification', 'Broilers', 'Grandparent', 'Laying pullets', 'Parents', 'Pure line', 'Others'
    ])
    await expect(page.getByLabel('Hatching date', { exact: true })).toHaveAccessibleDescription(/Day-old chicks only\. For example, 27\/03\/2026/)
    await expect(main.getByRole('button', { name: 'Save and add another' })).toHaveCount(0)
    await capture(page, testInfo, 'poultry')
  })

  test('germinal products: donor, dates and identification mark, with date and length errors', async ({ page }, testInfo) => {
    await toCommodityDetails(page, [SPECIES.cattleSemen], { type: 'germinal-products' })
    await answerGerminalCommodityDetails(page, { [GERMINAL_ID]: 20 }, { temperature: 'Chilled' })
    await answerGrossWeight(page)
    await expect(page).toHaveURL(urlFor('/animal-identification-details'))

    const main = page.locator('main')
    await expect(main).toContainText('You must add all identification details before the consignment arrives at the port of entry.')
    await expect(main).toContainText(/Commodity code\s+Commodity\s+Species\s+Quantity \(unit\/pieces\)\s+05111000\s+Cattle, Semen\s+Domestic cattle \(Bos taurus\)\s+20/)
    await expect(main.getByRole('link', { name: 'Change number of commodities' })).toHaveAttribute('href', url('/consignment-details'))
    await expect(main).toContainText('Enter details for Domestic cattle (Bos taurus)')
    for (const label of ['Donor name/ID', 'Collection date', 'Production date', 'Identification number/mark']) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible()
    }
    await expect(main).toContainText('For example, 27/03/2026')
    await capture(page, testInfo, 'germinal')

    await page.getByLabel('Donor name/ID', { exact: true }).fill('D'.repeat(60))
    await page.getByLabel('Collection date', { exact: true }).fill('99/99/2026')
    await page.getByLabel('Production date', { exact: true }).fill('2026-09-01')
    await saveAndContinue(page)
    await expectErrorSummary(page, [
      'Donor name/ID must be 58 characters or less',
      'Collection date must be a real date',
      'Enter a production date in the format DD/MM/YYYY'
    ])
    await capture(page, testInfo, 'germinal-error')

    await page.getByLabel('Donor name/ID', { exact: true }).fill('BULL-7')
    await page.getByLabel('Collection date', { exact: true }).fill('1/9/2026')
    await page.getByLabel('Production date', { exact: true }).fill('2/9/2026')
    await page.getByLabel('Identification number/mark', { exact: true }).fill('ID-7')
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/arrival-details'))
  })
})


test.describe('additional details', () => {
  test('cattle: certification purpose and unweaned animals', async ({ page }, testInfo) => {
    await toCommodityDetails(page, [SPECIES.cattle])
    await answerConsignmentDetails(page, { [SPECIES.cattle.id]: 1 })
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/additional-animal-details'))

    await expect(page).toHaveTitle('Additional details - Import notification service - GOV.UK')
    await expectHeading(page, 'Additional details')
    const main = page.locator('main')
    await expect(main).toContainText('Commodity details')
    await expect(main).toContainText('What are the animals certified for?')
    await expect(main).toContainText('You can find this information on the ITAHC.')
    await expect(page.locator('input[name="certificationPurpose"] + label')).toHaveText(CERTIFICATION_PURPOSES)
    await expect(main).toContainText('Does the consignment contain any unweaned animals?')
    await expect(main).toContainText('These are animals that are still feeding from their mother.')
    await expect(page.locator('input[name="unweanedAnimals"] + label')).toHaveText(['Yes', 'No'])
    await expectBackLink(page, url('/animal-identification-details'))
    await capture(page, testInfo, 'cattle')

    // Both questions are optional to proceed.
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/arrival-details'))
  })

  test('poultry: certification purpose only, after identification details', async ({ page }, testInfo) => {
    await toCommodityDetails(page, [SPECIES.chicken])
    await answerConsignmentDetails(page, { [SPECIES.chicken.id]: 400 })
    await expect(page).toHaveURL(urlFor('/animal-identification-details'))
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/additional-animal-details'))
    await expect(page.locator('input[name="certificationPurpose"]')).toHaveCount(CERTIFICATION_PURPOSES.length)
    await expect(page.locator('input[name="unweanedAnimals"]')).toHaveCount(0)
    await expectBackLink(page, url('/animal-identification-details'))
    await capture(page, testInfo, 'poultry')
  })
})
