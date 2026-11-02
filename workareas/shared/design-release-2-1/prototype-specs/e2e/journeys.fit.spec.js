const { test, expect } = require('./support/fixtures')
const { capture } = require('./support/evidence')
const {
  url, urlFor, expectHeading, expectErrorSummary, expectBackLink, readReference, dateFromToday,
  saveAndContinue, clickAction, submitForm, chooseSpecies, fillDate, fillDocument, fillCph,
  SPECIES, startNotification, answerOrigin, answerReason, answerAdditionalDetails, answerArrival,
  answerTransitCountries, answerTransporter, chooseAddress, CORE_ADDRESSES, answerContactAddress
} = require('./support/journey')

// End-to-end walks of the DR2.1 notification journey, one per branch the
// species and transport choices open up, from "Create new" to "Import
// notification submitted", with the hub, review and declaration on the way.

const HUB_ROWS = [
  'Where is this consignment coming from?',
  'What are you importing?',
  'Main import reason',
  'Commodity details',
  'Additional details',
  'Arrival details',
  'Transport details',
  'Upload documents',
  'Roles and addresses',
  'Contact address for this consignment'
]

function hubRow (page, name) {
  return page.locator('.app-notification-hub-tasklist__item').filter({
    has: page.getByRole('link', { name, exact: true })
  })
}

async function walk (page, testInfo, j) {
  let reference

  await test.step('notification type and origin', async () => {
    if (j.category) {
      await page.goto(url(`/create-notification?category=${j.category}`))
    } else {
      await startNotification(page, j.type || 'live-animals')
    }
    await expect(page).toHaveURL(urlFor('/origin-of-the-import'))
    reference = await readReference(page)
    await answerOrigin(page, j.origin)
  })

  await test.step('what are you importing', async () => {
    await expect(page).toHaveURL(urlFor('/what-are-you-importing'))
    for (const s of j.species) await chooseSpecies(page, s.search, s.id)
    await saveAndContinue(page)
  })

  await test.step('main import reason', async () => {
    await expect(page).toHaveURL(urlFor('/reason-for-import'))
    await answerReason(page, j.reason)
  })

  await test.step('commodity details', async () => {
    await expect(page).toHaveURL(urlFor('/consignment-details'))
    for (const s of j.species) {
      if (j.germinal) {
        await page.locator(`input[name="netWeight[${s.id}]"]`).fill('2.5')
        await page.locator(`input[name="numberOfPackages[${s.id}]"]`).fill('4')
      } else {
        await page.locator(`input[name="numberOfAnimals[${s.id}]"]`).fill(String(j.counts[s.id]))
      }
    }
    if (j.germinal) await page.locator('input[name="storageTemperature"][value="Frozen"]').check()
    await saveAndContinue(page)
  })

  if (j.identifiers) {
    await test.step('identification details', async () => {
      await expect(page).toHaveURL(urlFor('/animal-identification-details'))
      await j.identifiers(page)
    })
  }

  if (j.additional) {
    await test.step('additional details', async () => {
      await expect(page).toHaveURL(urlFor('/additional-animal-details'))
      await answerAdditionalDetails(page, j.additional)
    })
  }

  await test.step('arrival details', async () => {
    await expect(page).toHaveURL(urlFor('/arrival-details'))
    await answerArrival(page, j.arrival)
  })

  if (j.transit) {
    await test.step('transit countries', async () => {
      await expect(page).toHaveURL(urlFor('/transit-countries'))
      await answerTransitCountries(page, j.transit)
    })
  }

  await test.step('transporter', async () => {
    await expect(page).toHaveURL(urlFor('/transporter'))
    await answerTransporter(page, j.transporter)
  })

  await test.step('upload documents', async () => {
    await expect(page).toHaveURL(urlFor('/upload-documents'))
    await fillDocument(page, { reference: `${j.id.toUpperCase()}-ITAHC` })
    await clickAction(page, 'add-another')
    await expect(page.locator('table.app-upload-documents-table tbody tr')).toHaveCount(1)
    await saveAndContinue(page)
  })

  await test.step('consignment addresses', async () => {
    await expect(page).toHaveURL(urlFor('/roles-and-addresses'))
    for (const section of Object.keys(CORE_ADDRESSES)) await chooseAddress(page, section)
    if (j.cph) {
      await page.locator('main').getByRole('link', { name: 'Add a CPH number' }).click()
      await fillCph(page)
      await saveAndContinue(page)
    }
    if (j.permanent) {
      await page.locator('main').getByRole('link', { name: 'Add a permanent address' }).click()
      await j.permanent(page)
    }
    await expect(page).toHaveURL(urlFor('/roles-and-addresses'))
    await capture(page, testInfo, `${j.id}-complete`)
    await saveAndContinue(page)
  })

  await test.step('contact address', async () => {
    await expect(page).toHaveURL(urlFor('/contact-address-for-consignment'))
    await answerContactAddress(page)
  })

  return reference
}

async function reviewAndSubmit (page, testInfo, j, reference) {
  await test.step('hub shows every task complete', async () => {
    await page.goto(url('/notification-hub'))
    await expectHeading(page, 'Overview')
    for (const row of j.hubRows || HUB_ROWS) {
      await expect(hubRow(page, row)).toContainText('Complete')
    }
    await capture(page, testInfo, `${j.id}-complete`)
  })

  await test.step('review your notification', async () => {
    await page.locator('main').getByRole('button', { name: 'Review and submit' }).click()
    await expect(page).toHaveURL(urlFor('/review-notification'))
    await expect(page).toHaveTitle('Review your notification - Import notification service - GOV.UK')
    await expectHeading(page, 'Review your notification')
    await expect(page.locator('.govuk-error-summary')).toHaveCount(0)
    const main = page.locator('main')
    for (const section of ['1. About the consignment', '2. Description of the goods', '3. Transport and arrival', '4. Uploaded documents', '5. Consignment addresses', '6. Contact address']) {
      await expect(main).toContainText(section)
    }
    await expect(main).toContainText(reference)
    for (const text of j.reviewContains) await expect(main).toContainText(text)
    await capture(page, testInfo, `${j.id}-complete`)
  })

  await test.step('declaration', async () => {
    await submitForm(page, 'Continue')
    await expect(page).toHaveURL(urlFor('/declaration'))
    await expect(page).toHaveTitle('Declaration - Import notification service - GOV.UK')
    await expectHeading(page, 'Declaration')
    const main = page.locator('main')
    await expect(main).toContainText('I am the contact for the authorities and located in the UK.')
    await expect(main).toContainText('I am complying with the requirements of Regulation (EU) 2017/625 including on animal health and welfare.')
    await expect(main).toContainText('any costs needed for destruction and disposal of consignments, when instructed by the authorities')
    await expect(page.getByLabel('I confirm that I have reviewed and comply with this declaration and that the information submitted in this notification is true and correct.')).toBeVisible()
    await expect(main).toContainText('Date of declaration:')
    await expectBackLink(page, url('/review-notification'))
    await capture(page, testInfo)

    await submitForm(page, 'Continue')
    await expectErrorSummary(page, ['Confirm that you have reviewed and comply with this declaration'])
    await capture(page, testInfo, 'error')

    await page.locator('#declaration-confirmed').check()
    await submitForm(page, 'Continue')
  })

  await test.step('notification submitted', async () => {
    await expect(page).toHaveURL(urlFor('/notification-submitted'))
    await expect(page).toHaveTitle('Import notification submitted - Import notification service - GOV.UK')
    await expectHeading(page, 'Import notification submitted')
    const main = page.locator('main')
    await expect(main).toContainText('Your reference number')
    await expect(main).toContainText(reference)
    await expect(main).toContainText('Tell the transporter that this consignment must go directly to the place of destination on entry to Great Britain.')
    await expect(main).toContainText('You can view or change this notification from your dashboard.')
    await expect(main.getByRole('link', { name: 'Return to your dashboard' })).toHaveAttribute('href', url())
    await expect(main.getByRole('link', { name: 'Create a new notification' })).toHaveAttribute('href', url('/create-notification'))
    await expect(main).toContainText('importsriskmanagement@apha.gov.uk')
    await expect(main).toContainText('Telephone: 0330 041 6999')
    for (const text of j.submittedContains || []) await expect(main).toContainText(text)
    await capture(page, testInfo, j.id)
  })

  await test.step('the submitted notification can be viewed', async () => {
    await page.goto(url(`/review-notification?reference=${reference}`))
    await expect(page.locator('main')).toContainText(reference)
    await expect(page.locator('main')).toContainText('Submitted')
    await capture(page, testInfo, 'just-submitted')
  })
}

async function identifyAnimals (page, speciesId, fields, count) {
  for (let n = 1; n <= count; n += 1) {
    for (const field of fields) {
      await page.locator(`[name="identifiers[${speciesId}][${field}]"]`).fill(`${field.toUpperCase()}-${n}`)
    }
    if (count > 1) {
      await page.locator(`button[value="save:${speciesId}"]`).click()
      await page.waitForLoadState('load')
    }
  }
  await saveAndContinue(page)
}

const JOURNEYS = [
  {
    id: 'cattle-air',
    title: 'cattle by air: identification, unweaned question, CPH number',
    species: [SPECIES.cattle],
    counts: { [SPECIES.cattle.id]: 2 },
    origin: { search: 'Fran', country: 'France', region: 'Yes', code: '75', reference: 'CATTLE-2026-01' },
    reason: { reason: 'Internal market', purpose: 'Breeding' },
    identifiers: (page) => identifyAnimals(page, SPECIES.cattle.id, ['ear-tag', 'passport'], 2),
    additional: { purpose: 'Further keeping', unweaned: 'No' },
    arrival: { means: 'Air', port: { search: 'Heathrow', option: 'Heathrow' } },
    transporter: 'aberdeen-livestock',
    cph: true,
    hubRows: [...HUB_ROWS, 'Identification details'],
    reviewContains: ['FR-75', 'CATTLE-2026-01', 'Bos Taurus', 'Breeding', 'Further keeping', '12/345/6789', 'Aberdeen Livestock Ltd']
  },
  {
    id: 'poultry-rail',
    title: 'poultry by rail: no identification, transit countries',
    species: [SPECIES.chicken],
    counts: { [SPECIES.chicken.id]: 400 },
    origin: { search: 'Germ', country: 'Germany' },
    reason: { reason: 'Transit', exitPort: 'Holyhead POE - GBHLY', transitCountry: 'Republic of Ireland' },
    additional: { purpose: 'Slaughter' },
    arrival: { means: 'Rail', port: { search: 'Dover', option: 'Dover' }, transportId: 'EU-RAIL-77' },
    transit: [{ search: 'Belg', option: 'Belgium' }, { search: 'Fran', option: 'France' }],
    transporter: 'danish-meat-export',
    cph: true,
    reviewContains: ['Germany', 'Transit', 'Belgium', 'Danish Meat Export ApS']
  },
  {
    id: 'cat-air',
    title: 'pet cats by air: microchip identification and permanent address',
    species: [SPECIES.cat],
    counts: { [SPECIES.cat.id]: 2 },
    origin: { search: 'Spa', country: 'Spain' },
    reason: { reason: 'Internal market', purpose: 'Companion animal not for resale or rehoming' },
    identifiers: (page) => identifyAnimals(page, SPECIES.cat.id, ['microchip', 'passport', 'tattoo'], 2),
    additional: { purpose: 'Other' },
    arrival: { means: 'Air', port: { search: 'Heathrow', option: 'Heathrow' } },
    transporter: 'aberdeen-livestock',
    permanent: async (page) => {
      await page.locator('input[name="permanentAddressChoice[cat-felis-catus:0]"][value="same-as-pod"]').check()
      await page.locator('input[name="permanentAddressChoice[cat-felis-catus:1]"][value="new-address"]').check()
      const p = 'permanentAddressDetails-cat-felis-catus-1'
      await page.locator(`#${p}-name`).fill('Jo Bloggs')
      await page.locator(`#${p}-address-line-1`).fill('4 High Street')
      await page.locator(`#${p}-town-or-city`).fill('York')
      await page.locator(`#${p}-postcode`).fill('YO1 7HH')
      await page.locator(`#${p}-email`).fill('jo@example.com')
      await page.locator(`#${p}-phone`).fill('01904 000000')
      await saveAndContinue(page)
    },
    hubRows: [...HUB_ROWS, 'Identification details'],
    reviewContains: ['Spain', 'Companion animal not for resale or rehoming', 'Felis Catus', '4 High Street']
  },
  {
    id: 'horse-sea',
    title: 'horse by sea: temporary admission',
    species: [SPECIES.horse],
    counts: { [SPECIES.horse.id]: 1 },
    origin: { search: 'Irel', country: 'Republic of Ireland' },
    reason: { reason: 'Temporary admission horses', exitDate: dateFromToday(60), exitPort: 'Holyhead POE - GBHLY' },
    identifiers: (page) => identifyAnimals(page, SPECIES.horse.id, ['microchip', 'passport', 'horse-name'], 1),
    additional: { purpose: 'Registered equine animal' },
    arrival: { means: 'Sea', port: { search: 'Holyhead', option: 'Holyhead' }, transportId: 'STENA ADVENTURER' },
    transporter: 'roadtrain-ltd',
    hubRows: [...HUB_ROWS, 'Identification details'],
    reviewContains: ['Temporary admission horses', 'Holyhead POE - GBHLY', 'Registered equine animal', 'Roadtrain Ltd']
  },
  {
    id: 'germinal-semen',
    title: 'germinal products: bovine semen with donor identification',
    category: 'germinal-products',
    germinal: true,
    species: [SPECIES.cattleSemen],
    origin: { search: 'Neth', country: 'Netherlands' },
    reason: { reason: 'Internal market', purpose: 'Breeding' },
    identifiers: async (page) => {
      const id = SPECIES.cattleSemen.id
      await page.locator(`[name="identifiers[${id}][donor-id]"]`).fill('BULL-007')
      await fillDate(page, `[name="identifiers[${id}][collection-date]"]`, '1/9/2026')
      await fillDate(page, `[name="identifiers[${id}][production-date]"]`, '2/9/2026')
      await page.locator(`[name="identifiers[${id}][identification-number]"]`).fill('NL-BULL-007')
      await saveAndContinue(page)
    },
    arrival: { means: 'Road', port: { search: 'Dover', option: 'Dover' }, transportId: 'NL-12-AB' },
    transit: [{ search: 'Belg', option: 'Belgium' }],
    transporter: 'portuguese-livestock',
    hubRows: HUB_ROWS.filter((row) => row !== 'Additional details').concat('Identification details'),
    reviewContains: ['Netherlands', 'Cattle, Semen', 'BULL-007', 'Portuguese Livestock Lda']
  }
]

test.describe('notification journeys end to end', () => {
  for (const j of JOURNEYS) {
    test(j.title, async ({ page }, testInfo) => {
      const reference = await walk(page, testInfo, j)
      await reviewAndSubmit(page, testInfo, j, reference)
    })
  }
})

test.describe('the notification hub', () => {
  test('a fresh notification lists every task as to do', async ({ page }, testInfo) => {
    await startNotification(page, 'live-animals')
    await page.goto(url('/notification-hub'))
    await expect(page).toHaveTitle('Overview - Import notification service - GOV.UK')
    await expectHeading(page, 'Overview')
    const main = page.locator('main')
    await expect(main).toContainText('Draft')
    await expect(main.getByRole('heading', { name: 'Your commodities' })).toBeVisible()
    await expect(main).toContainText('Total number of animals in this consignment')
    await expect(main).toContainText('Total number of packages in this consignment')
    await expect(main.getByRole('heading', { name: 'Notification tasklist' })).toBeVisible()
    for (const heading of ['1. About the consignment', '2. Description of the goods', '3. Transport and arrival', '4. Documents', '5. Consignment parties', '6. Contact address']) {
      await expect(main.getByRole('heading', { name: heading })).toBeVisible()
    }
    for (const row of HUB_ROWS) {
      await expect(hubRow(page, row)).toContainText('To do')
    }
    await expect(main).toContainText('Consignor or Exporter, Consignee, Importer and Place of Destination')
    await expect(main.getByRole('link', { name: 'Where is this consignment coming from?' })).toHaveAttribute('href', url('/origin-of-the-import?from=hub'))
    await expect(main.getByRole('button', { name: 'Review and submit' })).toHaveAttribute('href', url('/review-notification'))
    await expect(main.getByRole('button', { name: 'Return to dashboard' })).toHaveAttribute('href', url())
    await capture(page, testInfo, 'empty')
  })

  test('a hub task link returns to the hub after saving', async ({ page }) => {
    await startNotification(page, 'live-animals')
    await page.goto(url('/notification-hub'))
    await page.locator('main').getByRole('link', { name: 'Main import reason' }).click()
    await expect(page).toHaveURL(url('/reason-for-import?from=hub').replace(/\./g, '.'))
    await page.locator('input[name="importReason"][value="Re-entry"]').check()
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/notification-hub'))
    await expect(hubRow(page, 'Main import reason')).toContainText('Complete')
  })

  test('review with tasks missing lists each incomplete section', async ({ page }, testInfo) => {
    await startNotification(page, 'live-animals')
    await answerOrigin(page)
    await chooseSpecies(page, SPECIES.cattle.search, SPECIES.cattle.id)
    await saveAndContinue(page)
    await answerReason(page)
    await page.locator(`input[name="numberOfAnimals[${SPECIES.cattle.id}]"]`).fill('1')
    await saveAndContinue(page)
    await page.goto(url('/review-notification'))
    await expectErrorSummary(page, [
      'Complete additional details',
      'Complete arrival details',
      'Complete transport details',
      'Complete roles and addresses',
      'Complete contact address for this consignment'
    ])
    const main = page.locator('main')
    await expect(main).toContainText('Missing')
    await expect(page.getByRole('button', { name: 'Delete', exact: true })).toBeVisible()
    await capture(page, testInfo, 'incomplete')

    // Continuing from an incomplete review stays on the review page.
    await submitForm(page, 'Continue')
    await expect(page).toHaveURL(urlFor('/review-notification'))
  })

  test('the submitted page is guarded until the declaration is confirmed', async ({ page }) => {
    await startNotification(page, 'live-animals')
    await page.goto(url('/notification-submitted'))
    await expect(page).toHaveURL(urlFor('/declaration'))
  })
})
