import { readFileSync } from 'node:fs'

const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

// -----------------------------------------------------------------------------
// The consignment slice of the frontend — the spine of the notification
// journey. Ten screens: origin, the commodity picker, consignment details,
// animal identification, import reason, import purpose, destination country,
// port of exit, exit date and additional details.
//
// COMMODITY CHOICE (the addresses and transport slices depend on this).
// The picker commits one line per commodity+species pair, and this spec picks
// FOUR of them:
//
//   Cow  | Bos taurus              (0102)
//   Horse| Equus caballus          (0101)
//   Dog  | Canis lupus familiaris  (01061900)
//   Fish | Salmo salar             (0301)
//
// What each turns on, from services/commodities/stub.js and
// obligations/sections/commodities/:
//   - Cow is the ONLY CPH commodity (CPH_COMMODITIES), so it is what opens the
//     CPH row on the addresses hub. Without a Cow line, fe-cph-number is
//     unreachable.
//   - Cat and Dog are the permanent-address commodities. On this frontend the
//     permanent address is NOT a page: it renders inside the animal
//     identification card (_identification-card.njk, `card.showAddress`), so
//     the Dog line is what puts those nine address fields on screen.
//   - Cow and Horse are the unweaned commodities, so either one adds the second
//     radio group to fe-additional-details (`showUnweaned`).
//   - Cow adds an ear tag field, Horse a horse-name field, and Fish is the only
//     one of the four outside the typed-identifier union, so it is the only one
//     showing the free-text "Identification details" and "Animal description"
//     fields (`notInUnionOf`, identifiers.js:159-198).
//   - Fish is not in PACKAGE_COUNT_COMMODITIES, so its group on consignment
//     details has no "Number of packages" input while the other three do.
//
// One selection therefore shows every identifier variant and both quantity
// variants in a single picture, and leaves the CPH row open for the addresses
// slice.
//
// IMPORT REASON. No single reason reaches all three exit screens
// (obligations/sections/import-reason.js):
//   destinationCountry <- transit OR transhipmentOrOnwardTravel
//   portOfExit         <- transit OR temporaryAdmissionHorses
//   exitDate           <- temporaryAdmissionHorses ONLY
// and import purpose is in scope for internalMarket only. So this spec answers
// the reason three times in one journey: internalMarket to reach import
// purpose, then transit to reach destination country and port of exit, then
// temporaryAdmissionHorses to reach exit date. Each flip purges the answers
// that fall out of scope, which is fine — every screen is photographed before
// the flip that drops it.
// -----------------------------------------------------------------------------

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(async () => {
  record.write()
})

// The journey id is minted per run and printed on every journey page by the
// journey strip (shared/layout.njk, `.app-journey-strip`). Left alone it makes
// identical pages produce different pixels on every capture, so it is pinned in
// the live DOM immediately before each shot. The id in the URL and in hrefs is
// left alone — rewriting those would break navigation.
const maskJourneyReference = async (page) => {
  await page.evaluate(() => {
    for (const element of document.querySelectorAll(
      '.app-journey-strip .govuk-body'
    )) {
      element.textContent = 'AAAA-0000-AAAA'
    }
  })
}

const shoot = async (page, name) => {
  await maskJourneyReference(page)
  await record.record(page, name)
}

const saveAndContinue = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

const radio = (page, name, value) =>
  page.locator(`input[name="${name}"][value="${value}"]`)

// One container per page (shared/error-summary.njk over govukErrorSummary), so
// naming the message it holds is a positive assertion that the expected
// rejection is the one on screen — not merely that something went wrong.
const errorSummary = (page) => page.locator('.govuk-error-summary')

// Every list on these pages comes from a reference service in one mode and a
// committed fixture in another, so options are chosen by code and never by
// visible text.
const COUNTRY_OF_ORIGIN = 'FR'
const DESTINATION_COUNTRY = 'DE'
const PORT_OF_EXIT = 'GB DYC'

const COMMODITY_KEYS = [
  'Cow|1148346',
  'Horse|822332',
  'Dog|923502',
  'Fish|801204'
]

// Canonical line order is commodity-list order then species order
// (search/selection/keys.js), so the four lines above land at these indexes and
// the quantity and identifier fields are suffixed with them.
const COW_LINE = 0
const HORSE_LINE = 1
const DOG_LINE = 2
const FISH_LINE = 3

// Two cows so the identification card has a saved state that is not also its
// maximum: the card's cap is the line's number of animals
// (MAX_ENTRIES_FROM.animalIdentifiers -> numberOfAnimalsQuantity).
const COW_ANIMALS = '2'

test('the consignment slice', async ({ page }) => {
  // In stub mode an unauthenticated request to the dashboard is redirected
  // through /auth/sign-in, which mints a session and redirects back, so no
  // explicit sign-in step is needed here.
  await page.goto('/')
  const start = page.getByRole('button', {
    name: 'Start a new notification'
  })
  await expect(start).toBeVisible()

  // ---------------------------------------------------------------------------
  // Origin — the journey entry. Any deep link into a journey with no opening
  // run and no committed answer is redirected here (flow/entry-guard.js), so
  // this is the one journey screen that needs no prior state.
  // ---------------------------------------------------------------------------
  await start.click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/origin$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Origin of the import'
  )
  await shoot(page, 'origin')

  // Country of origin is the one required answer on the page
  // (requiredOneOf, origin/controller.js), so an empty submit is the cheapest
  // error summary in the slice.
  await saveAndContinue(page)
  await expect(page).toHaveURL(/\/origin$/)
  await expect(errorSummary(page)).toContainText(
    'Select the country where the animal originates from'
  )
  await shoot(page, 'origin-error')

  await page.locator('#countryOfOrigin').selectOption(COUNTRY_OF_ORIGIN)
  await radio(page, 'regionOfOriginCodeRequirement', 'yes').check()
  // The region of origin code is a conditional reveal on the Yes radio, not a
  // page of its own.
  await expect(page.locator('#regionOfOriginCode')).toBeVisible()
  await shoot(page, 'origin-region-code-revealed')

  await page.locator('#regionOfOriginCode').fill('FR-75')
  await saveAndContinue(page)

  // ---------------------------------------------------------------------------
  // Commodity picker.
  //
  // NOTE FOR FINDING AUTHORS: on this frontend this page is NOT a search
  // widget. It renders the whole commodity reference list up front as one
  // checkbox fieldset per commodity (search.njk over `commodityGroups`), with
  // no search box, no results panel and no hidden input. There is therefore no
  // "results panel open" state to photograph here — the page as it first
  // renders already is the full list.
  // ---------------------------------------------------------------------------
  await expect(page).toHaveURL(/\/commodities$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'What are you importing?'
  )
  await shoot(page, 'commodity-search')

  await saveAndContinue(page)
  await expect(page).toHaveURL(/\/commodities$/)
  await expect(errorSummary(page)).toContainText('Select a commodity')
  await shoot(page, 'commodity-search-error')

  for (const key of COMMODITY_KEYS) {
    await page.locator(`input[name="species"][value="${key}"]`).check()
  }
  await saveAndContinue(page)

  // ---------------------------------------------------------------------------
  // Consignment details — one table row and one quantity block per committed
  // line. Photographed with the quantity inputs still empty, which is the
  // screen the design defines; the selected-commodities table above them is
  // populated because a line is what makes this page reachable at all.
  // ---------------------------------------------------------------------------
  await expect(page).toHaveURL(/\/consignment-details$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Consignment details'
  )
  await expect(page.getByRole('table')).toBeVisible()
  await shoot(page, 'consignment-details')

  await page.locator(`#numberOfAnimalsQuantity-${COW_LINE}`).fill('two')
  await saveAndContinue(page)
  await expect(page).toHaveURL(/\/consignment-details$/)
  await expect(errorSummary(page)).toContainText(
    'Number of animals must be a whole number, like 25'
  )
  await shoot(page, 'consignment-details-error')

  await page.locator(`#numberOfAnimalsQuantity-${COW_LINE}`).fill(COW_ANIMALS)
  await page.locator(`#numberOfPackages-${COW_LINE}`).fill('1')
  await page.locator(`#numberOfAnimalsQuantity-${HORSE_LINE}`).fill('1')
  await page.locator(`#numberOfPackages-${HORSE_LINE}`).fill('1')
  await page.locator(`#numberOfAnimalsQuantity-${DOG_LINE}`).fill('1')
  await page.locator(`#numberOfPackages-${DOG_LINE}`).fill('1')
  // Fish is outside PACKAGE_COUNT_COMMODITIES, so its group has no packages
  // input to fill.
  await page.locator(`#numberOfAnimalsQuantity-${FISH_LINE}`).fill('1')
  await saveAndContinue(page)

  // ---------------------------------------------------------------------------
  // Import reason. Answered as internalMarket first, because that is the only
  // reason that puts import purpose in scope.
  // ---------------------------------------------------------------------------
  await expect(page).toHaveURL(/\/import-reason$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'What is the main reason for importing the animals?'
  )
  await shoot(page, 'import-reason')

  await radio(page, 'reasonForImport', 'internalMarket').check()
  await saveAndContinue(page)

  // ---------------------------------------------------------------------------
  // Import purpose — in scope only while the reason is internalMarket
  // (purposeInInternalMarket, obligations/sections/import-reason.js).
  // ---------------------------------------------------------------------------
  await expect(page).toHaveURL(/\/import-purpose$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Purpose in the internal market'
  )
  await shoot(page, 'import-purpose')

  await radio(page, 'purposeInInternalMarket', 'breeding').check()
  await saveAndContinue(page)

  // ---------------------------------------------------------------------------
  // Animal identification — one card per commodity line, each card holding the
  // identifier fields its commodity earns, and for Dog the permanent-address
  // block as well.
  // ---------------------------------------------------------------------------
  await expect(page).toHaveURL(/\/commodities\/identification$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Animal identification details'
  )
  await shoot(page, 'animal-identification')

  const saveAndAddAnother = (line) =>
    page.locator(`button[name="action"][value="add:${line}"]`).click()

  // Each card is anchored by its line index (_identification-card.njk), which
  // keeps the per-card assertions below off the other three cards.
  const cowCard = page.locator(`#identification-card-${COW_LINE}`)

  // "Save and add another" with nothing entered on any card: the empty-form
  // guard names the gap rather than appending a blank record.
  await saveAndAddAnother(COW_LINE)
  await expect(page).toHaveURL(/\/commodities\/identification$/)
  await expect(errorSummary(page)).toContainText(
    'Enter at least one identifier for this animal'
  )
  await shoot(page, 'animal-identification-error')

  await page
    .locator(`#animalIdentifierEarTag-${COW_LINE}`)
    .fill('UK123456789012')
  await saveAndAddAnother(COW_LINE)
  await expect(page).toHaveURL(/\/commodities\/identification$/)
  // One of the two cows recorded: the card lists the saved animal and still
  // offers the form for the next one. Addressed by the summary-list key rather
  // than by text, because every action control in this frontend carries a
  // visually-hidden suffix naming its row — the Remove button beside this row
  // reads "Remove animal 1", which a text or accessible-name match would pick
  // up alongside the key it was aimed at.
  await expect(cowCard.locator('.govuk-summary-list__key')).toHaveText(
    'Animal 1'
  )
  await shoot(page, 'animal-identification-saved')

  await page
    .locator(`#animalIdentifierEarTag-${COW_LINE}`)
    .fill('UK123456789013')
  await saveAndAddAnother(COW_LINE)
  await expect(page).toHaveURL(/\/commodities\/identification$/)
  // Both cows recorded, so the cow card is at its cap: the entry form is
  // replaced by copy that renders in no other state.
  await expect(cowCard).toContainText(
    'You have entered details for all 2 Bos taurus animals'
  )
  await shoot(page, 'animal-identification-at-maximum')

  await page
    .locator('button[name="action"][value="finish"]:not([aria-hidden="true"])')
    .click()

  // ---------------------------------------------------------------------------
  // Additional details — the last step of the opening run. The unweaned
  // question is here because the selection includes Cow and Horse.
  // ---------------------------------------------------------------------------
  await expect(page).toHaveURL(/\/additional-details$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Additional animal details'
  )
  // The unweaned question is a whole radio group that appears only when the
  // selection earns it, so its presence is asserted through the control rather
  // than through its legend copy.
  await expect(radio(page, 'containsUnweanedAnimals', 'yes')).toBeAttached()
  await shoot(page, 'additional-details')

  await radio(page, 'animalsCertifiedFor', 'further-keeping').check()
  await radio(page, 'containsUnweanedAnimals', 'no').check()
  await saveAndContinue(page)

  // The opening run ends at the hub, and visiting it is what marks the run
  // complete (hub/controller.js). From here a POST follows the section order
  // rather than the run order, which is how the exit-details pages are reached.
  // The hub belongs to another slice and is not recorded.
  await expect(page).toHaveURL(/\/notifications\/[^/]+$/)

  const journeyPath = new URL(page.url()).pathname

  // The picker revisited with the four lines committed — the checked state of
  // the page, which is as close as this frontend gets to a selected-commodities
  // view on the picker itself.
  await page.goto(`${journeyPath}/commodities`)
  await expect(page).toHaveURL(/\/commodities$/)
  await expect(
    page.locator(`input[name="species"][value="${COMMODITY_KEYS[0]}"]`)
  ).toBeChecked()
  await shoot(page, 'commodity-search-selected')

  // ---------------------------------------------------------------------------
  // Exit details, first pass: transit puts destination country and port of exit
  // in scope and drops import purpose.
  // ---------------------------------------------------------------------------
  await page.goto(`${journeyPath}/import-reason`)
  await expect(page).toHaveURL(/\/import-reason$/)
  await radio(page, 'reasonForImport', 'transit').check()
  // Answering the reason reveals nothing on this frontend — the radios carry
  // hints and no conditional content, and the questions the reason unlocks are
  // separate pages. Worth a picture because that is the whole shape of the
  // difference here.
  await shoot(page, 'import-reason-transit-selected')
  await saveAndContinue(page)

  await expect(page).toHaveURL(/\/destination-country$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Destination country'
  )
  await shoot(page, 'destination-country')

  await saveAndContinue(page)
  await expect(page).toHaveURL(/\/destination-country$/)
  await expect(errorSummary(page)).toContainText(
    'Select the destination country'
  )
  await shoot(page, 'destination-country-error')

  await page.locator('#destinationCountry').selectOption(DESTINATION_COUNTRY)
  await saveAndContinue(page)

  await expect(page).toHaveURL(/\/port-of-exit$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Port of exit'
  )
  await shoot(page, 'port-of-exit')

  await saveAndContinue(page)
  await expect(page).toHaveURL(/\/port-of-exit$/)
  await expect(errorSummary(page)).toContainText('Select the port of exit')
  await shoot(page, 'port-of-exit-error')

  await page.locator('#portOfExit').selectOption(PORT_OF_EXIT)
  await saveAndContinue(page)
  // Exit date is not in scope for transit, so the section skips it and lands on
  // additional details.
  await expect(page).toHaveURL(/\/additional-details$/)

  // ---------------------------------------------------------------------------
  // Exit details, second pass: exit date is in scope for
  // temporaryAdmissionHorses and for nothing else, so the reason has to change
  // again. Port of exit stays in scope across both reasons and keeps its
  // answer; destination country does not, and its answer is purged — which is
  // why it was photographed above rather than here.
  // ---------------------------------------------------------------------------
  await page.goto(`${journeyPath}/import-reason`)
  await expect(page).toHaveURL(/\/import-reason$/)
  await radio(page, 'reasonForImport', 'temporaryAdmissionHorses').check()
  await saveAndContinue(page)

  await expect(page).toHaveURL(/\/port-of-exit$/)
  await saveAndContinue(page)

  await expect(page).toHaveURL(/\/exit-date$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Exit date')
  await shoot(page, 'exit-date')

  // ---------------------------------------------------------------------------
  // One last state of consignment details: dropping a line's animal count below
  // the number of identifier records already saved for it. Left until the end
  // because it needs the identification records that exist by now, and because
  // the submit is rejected so nothing it does survives.
  // ---------------------------------------------------------------------------
  await page.goto(`${journeyPath}/consignment-details`)
  await expect(page).toHaveURL(/\/consignment-details$/)
  await page.locator(`#numberOfAnimalsQuantity-${COW_LINE}`).fill('1')
  await saveAndContinue(page)
  await expect(page).toHaveURL(/\/consignment-details$/)
  await expect(errorSummary(page)).toContainText(
    'You have 2 identifier records for Bos taurus but entered 1 animal'
  )
  await shoot(page, 'consignment-details-count-drop-error')
})
