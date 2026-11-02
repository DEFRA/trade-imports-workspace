const { test, expect } = require('./support/fixtures')
const { capture } = require('./support/evidence')
const {
  url, urlFor, expectHeading, expectErrorSummary, expectInlineError, expectBackLink,
  saveAndContinue, chooseSpecies, SPECIES, startNotification, answerOrigin, answerCommodity, answerReason,
  answerConsignmentDetails
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

test.describe('commodity details', () => {
  test('cattle: number of animals is required and must be a whole number', async ({ page }, testInfo) => {
    await toCommodityDetails(page, [SPECIES.cattle])

    await test.step('renders the selected commodity and its fields', async () => {
      await expect(page).toHaveTitle('Commodity details - Import notification service - GOV.UK')
      await expectHeading(page, 'Commodity details')
      const main = page.locator('main')
      await expect(main).toContainText('Description of the goods')
      await expect(main).toContainText('Selected commodities')
      await expect(main).toContainText(/Commodity code\s+Common name\s+Species\s+0102\s+Cattle\s+Bos taurus/)
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
    await expect(main).not.toContainText('Horse (0101)')
    await main.locator('button[name="removeCommodity"][value="pig"]').click()
    await expect(page).toHaveURL(urlFor('/what-are-you-importing'))
  })

  test('germinal products: weight, packages and storage temperature', async ({ page }, testInfo) => {
    await toCommodityDetails(page, [SPECIES.cattleSemen], { type: 'germinal-products' })
    const main = page.locator('main')
    await expect(main).toContainText('Cattle, Semen (05111000)')
    await expect(page.getByLabel('Total gross weight')).toBeVisible()
    await expect(main).toContainText('kg')
    await expect(page.getByLabel('Number of packages')).toBeVisible()
    await expect(main).toContainText('How will the products be stored')
    await expect(page.locator('input[name="storageTemperature"] + label')).toHaveText(['Ambient', 'Chilled', 'Frozen'])
    await capture(page, testInfo, 'germinal')

    await saveAndContinue(page)
    await expectErrorSummary(page, ['Enter the total gross weight', 'Enter the number of packages', 'Select a temperature'])
    await capture(page, testInfo, 'germinal-error-required')

    await page.getByLabel('Total gross weight').fill('0')
    await page.getByLabel('Number of packages').fill('x')
    await saveAndContinue(page)
    await expectErrorSummary(page, ['Enter a number greater than 0', 'Enter a whole number greater than 0', 'Select a temperature'])
    await capture(page, testInfo, 'germinal-error-invalid')

    await page.getByLabel('Total gross weight').fill('1.5')
    await page.getByLabel('Number of packages').fill('3')
    await page.locator('input[name="storageTemperature"][value="Frozen"]').check()
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/animal-identification-details'))
  })
})

test.describe('identification details', () => {
  test('cattle: one identification panel per animal, saved one at a time', async ({ page }, testInfo) => {
    await toCommodityDetails(page, [SPECIES.cattle])
    await answerConsignmentDetails(page, { [SPECIES.cattle.id]: 2 })

    await test.step('first animal', async () => {
      await expect(page).toHaveTitle('Identification details - Import notification service - GOV.UK')
      await expectHeading(page, 'Identification details')
      const main = page.locator('main')
      await expect(main).toContainText('You must add all animal identification details before the consignment arrives at the port of entry.')
      await expect(main).toContainText('Enter details for Bos taurus 1 of 2')
      await expect(page.getByLabel('Ear tag')).toBeVisible()
      await expect(page.getByLabel('Passport')).toBeVisible()
      await expect(main.getByRole('link', { name: 'Change number of animals' })).toHaveAttribute('href', url('/consignment-details'))
      await expect(main.getByRole('button', { name: 'Save and add another' })).toBeVisible()
      await expectBackLink(page, url('/consignment-details'))
      await capture(page, testInfo, 'animal-1-of-2')
    })

    await test.step('saving the first animal moves on to the second and lists the first', async () => {
      await page.getByLabel('Ear tag').fill('UK123456700001')
      await page.getByLabel('Passport').fill('PP-001')
      await page.getByRole('button', { name: 'Save and add another' }).click()
      const main = page.locator('main')
      await expect(main).toContainText('Enter details for Bos taurus 2 of 2')
      await expect(main.getByRole('button', { name: 'Save and finish' })).toBeVisible()
      await expect(main).toContainText(/Animal\s+Ear tag\s+Passport\s+Bos taurus 1\s+UK123456700001\s+PP-001/)
      await expect(main.locator('button[value="remove:cattle-bos-taurus:0"]')).toHaveText('Remove')
      await capture(page, testInfo, 'animal-2-of-2')
    })

    await test.step('the last animal with a blank identifier is not saved, and no error is shown', async () => {
      await page.getByLabel('Ear tag').fill('UK123456700002')
      await page.getByRole('button', { name: 'Save and finish' }).click()
      await expect(page.locator('main')).toContainText('Enter details for Bos taurus 2 of 2')
      await expect(page.locator('.govuk-error-summary')).toHaveCount(0)
      await expect(page.locator('button[value="remove:cattle-bos-taurus:1"]')).toHaveCount(0)
    })

    await test.step('saving the last animal', async () => {
      await page.getByLabel('Ear tag').fill('UK123456700002')
      await page.getByLabel('Passport').fill('PP-002')
      await page.getByRole('button', { name: 'Save and finish' }).click()
      await expect(page.locator('button[value="remove:cattle-bos-taurus:1"]')).toBeVisible()
      await expect(page.locator('main')).toContainText(/Bos taurus 2\s+UK123456700002\s+PP-002/)
      await capture(page, testInfo, 'all-animals-saved')
    })

    await test.step('removing an animal reopens its panel', async () => {
      await page.locator('button[value="remove:cattle-bos-taurus:1"]').click()
      await expect(page.locator('main')).toContainText('Enter details for Bos taurus 2 of 2')
    })

    await test.step('continue moves on to additional details', async () => {
      await saveAndContinue(page)
      await expect(page).toHaveURL(urlFor('/additional-animal-details'))
    })
  })

  test('germinal products: donor, dates and identification mark, with date and length errors', async ({ page }, testInfo) => {
    await toCommodityDetails(page, [SPECIES.cattleSemen], { type: 'germinal-products' })
    await page.getByLabel('Total gross weight').fill('1.5')
    await page.getByLabel('Number of packages').fill('3')
    await page.locator('input[name="storageTemperature"][value="Chilled"]').check()
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/animal-identification-details'))

    const main = page.locator('main')
    await expect(main).toContainText('Enter details for Bos taurus')
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
    // Germinal-only consignments have no additional details page.
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

  test('poultry: no identification page and no unweaned question', async ({ page }, testInfo) => {
    await toCommodityDetails(page, [SPECIES.chicken])
    await answerConsignmentDetails(page, { [SPECIES.chicken.id]: 400 })
    await expect(page).toHaveURL(urlFor('/additional-animal-details'))
    await expect(page.locator('input[name="certificationPurpose"]')).toHaveCount(CERTIFICATION_PURPOSES.length)
    await expect(page.locator('input[name="unweanedAnimals"]')).toHaveCount(0)
    await expectBackLink(page, url('/consignment-details'))
    await capture(page, testInfo, 'poultry')
  })
})
