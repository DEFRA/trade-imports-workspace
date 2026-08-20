//
// DR1 slice: identifying the individual animals in the consignment.
//
// One screen, and it is the last page of a walk rather than a page that can be
// opened cold — so almost all of this file is the four answers that make DR1
// render it at all, and the assertions that prove each one landed.
//
// A requirements-gathering spec, not a test. Nothing here asserts the prototype
// is correct. Every step does assert the journey landed where it should: a
// Prototype Kit page that rejects a POST re-renders the same URL rather than
// erroring, and every guard on this route redirects instead of refusing, so
// "not an error" would be true of a walk that never got anywhere.
//
// DR1 is the ROOT mount. app/routes.js builds one router, mounts it at root and
// re-mounts it under /design-release-2 and /design-release-2.1; only the root
// URLs are DR1, and app/views/animal-identification-details.html is the view
// they render.
//
// It borrows nothing from the prototype's own journey-demo or e2e helpers. Those
// are unmaintained, and a capture built on a suite nobody runs breaks the first
// time somebody refactors it.
//
// This slice owns dr1-animal-identification-details. Any spec that walks THROUGH
// it on the way to arrival or review must pass through without recording it, or
// two specs photograph one screen in two states and the corpus cannot say which
// one DR1 shows.
//
import { readFileSync } from 'node:fs'

// A spec imports exactly one thing. It lives in the corpus workarea, outside any
// package, so a bare specifier resolves to nothing — tim hands every spec the
// absolute path to one support module carrying what it needs, Playwright's own
// test and expect included.
const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

const COUNTRY_OF_ORIGIN = 'France'
const COMMODITY_SEARCH = 'Cattle'

// Whether this page exists at all is decided by the commodity: getJourneySteps
// adds /animal-identification-details only when hasAnimalIdentifiersRequired is
// true, which asks app/data/commodity-identifiers.js whether the chosen
// species's CN code has identifier fields. 0102 (cattle) has two — ear tag and
// passport — so a cattle species is what makes the screen reachable, and the
// species is named by id rather than taken as "the first row offered": the
// results list is built by commodity-search.js from a data file whose row order
// is not alphabetical by anything visible here, so naming the id means a change
// to that catalogue fails this spec loudly instead of quietly photographing a
// different animal under the same screen name.
const SPECIES_ID = 'cattle-11-syncerus-spp'
const SPECIES_LABEL = 'Syncerus spp.'
const COMMODITY_HEADING = /cattle \(0102\)/i

// The page renders one entry form per animal and counts them out — "Enter
// details for Syncerus spp. 1 of 2" — so the number given on consignment details
// is what the identification screen is a picture of. Two is enough to show the
// page counting; one would hide that it does.
const ANIMAL_COUNT = '2'

const continueOn = async (page) => {
  const action = page.locator('button[name="action"][value="continue"]')
  if (await action.count()) {
    await action.first().click()
    return
  }
  await page
    .getByRole('button', { name: /save and continue|continue/i })
    .first()
    .click()
}

// The kit rewrites its shadow-nunjucks layouts and recompiles its Sass while the
// server is up, bouncing nodemon. A request landing in that window either
// refuses the connection or renders the kit's own error page. Re-request until
// it settles rather than photograph that under a DR1 name.
//
// /create-notification also wipes the notification, stamps a fresh reference and
// sets the status to Draft, so the status strip at the top of the capture reads
// the same on every run.
const start = async (page) => {
  await expect(async () => {
    await page.goto('/create-notification')
    await expect(page, 'create-notification should open origin-of-the-import')
      .toHaveURL(/\/origin-of-the-import$/, { timeout: 5_000 })
    await expect(
      page.locator('main h1'),
      'origin-of-the-import should render, not error'
    ).toHaveText(/origin of the import/i, { timeout: 5_000 })
  }).toPass({ timeout: 240_000 })
}

// The country of origin is a search box the user types in, with a separate
// hidden input carrying the value the form actually posts. Typing alone leaves
// that hidden input untouched. The results panel also overlays the buttons below
// and calls preventDefault on its own mousedown, so a click on Continue while it
// is open reaches nothing at all — no error, no navigation, no POST. Choosing
// from the list is what closes it.
const fillOrigin = async (page) => {
  await page.locator('#country-of-origin').fill(COUNTRY_OF_ORIGIN)

  const match = page
    .locator(`.app-country-search__option[data-country="${COUNTRY_OF_ORIGIN}"]`)
    .first()
  await expect(match, `"${COUNTRY_OF_ORIGIN}" should appear in the results`)
    .toBeVisible()
  await match.click()

  await expect(
    page.locator('input[name="countryOfOrigin"]'),
    'choosing from the results should write the field that posts'
  ).toHaveValue(COUNTRY_OF_ORIGIN)

  await page.locator('input[name="regionOfOriginRequired"][value="No"]').check()
  await continueOn(page)
}

// The commodity widget posts a JSON array, and updateHiddenFields() runs at init
// — so the field already reads "[]" before anything is ticked and "not empty"
// would be true of a page nobody had touched. Assert the species itself is in
// there.
const fillCommodity = async (page) => {
  const search = page.locator('.app-commodity-search__input').first()
  await search.fill(COMMODITY_SEARCH)

  const species = page.locator(
    `input[name="commodity-selection"][value="species:${SPECIES_ID}"]`
  )
  await expect(species, `the search should offer ${SPECIES_ID}`).toBeVisible()
  await species.check()

  // Ticking a row re-renders the whole results list, so the panel is still open
  // and still overlaying the buttons. Escape is what the module listens for.
  await search.press('Escape')
  await expect(
    page.locator('.app-commodity-search__results'),
    'the results panel should close, or it swallows the click on Continue'
  ).toBeHidden()
  await expect(
    page.locator('input[name="selectedSpecies"]'),
    'the widget should have written the selection into the field that posts'
  ).toHaveValue(new RegExp(SPECIES_ID))

  await continueOn(page)
}

const fillReason = async (page) => {
  await page.locator('input[name="importReason"][value="Internal market"]').check()
  // Choosing Internal market opens a conditional reveal of purposes, and the
  // reason is rejected without one.
  await page.locator('input[name="internalMarketPurpose"]').first().check()
  await continueOn(page)
}

// The consignment page asks one question per selected species, named after that
// species, so the field name carries the id chosen above. Number of animals is
// the only mandatory one for a live-animal commodity — validateNumberOfPackages
// only fires for germinal products — and it is the answer this whole spec exists
// to set, because it is what the identification page counts out.
const fillConsignmentDetails = async (page) => {
  await page
    .locator(`input[name="numberOfAnimals[${SPECIES_ID}]"]`)
    .fill(ANIMAL_COUNT)
  await continueOn(page)
}

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(() => {
  record.write()
})

test('records animal-identification-details, empty, for a species that needs identifiers', async ({
  page
}) => {
  await start(page)

  await fillOrigin(page)
  await expect(page, 'origin should advance to what-are-you-importing').toHaveURL(
    /\/what-are-you-importing$/
  )

  await fillCommodity(page)
  await expect(page, 'the commodity should advance to reason-for-import').toHaveURL(
    /\/reason-for-import$/
  )

  await fillReason(page)
  await expect(page, 'the reason should advance to consignment-details').toHaveURL(
    /\/consignment-details$/
  )

  await fillConsignmentDetails(page)

  // This is the assertion the whole walk is for. getPostConsignmentDetailsPath
  // sends the journey to /additional-animal-details when the chosen species
  // needs no identifiers, so landing here is also the proof that the species
  // picked above is one DR1 asks identifiers for — and it rules out the other
  // outcome, a rejected post re-rendering /consignment-details in place.
  await expect(
    page,
    'consignment details should advance to the identification page for a species that needs identifiers'
  ).toHaveURL(/\/animal-identification-details$/)
  await expect(page.locator('main h1')).toHaveText(/identification details/i)

  // The page is a set of per-species panels, and a panel for the wrong species
  // would still satisfy the heading and the URL. Name what should be on it.
  await expect(
    page.locator('.app-animal-identification-commodity__heading'),
    'the panel should be grouped under the commodity that was chosen'
  ).toHaveText(COMMODITY_HEADING)
  await expect(
    page.locator('.app-animal-identification-panel__species-name'),
    'the panel should be for the species that was chosen'
  ).toHaveText(SPECIES_LABEL)
  await expect(
    page.locator('.app-animal-identification-panel__entry-heading'),
    'the page should be counting out the animals declared on consignment details'
  ).toHaveText(
    new RegExp(`enter details for ${SPECIES_LABEL} 1 of ${ANIMAL_COUNT}`, 'i')
  )

  // Photograph it empty, before anything is typed into it. The identifier fields
  // are what the screen is about, and a screen carrying somebody's made-up ear
  // tag is a screen nobody specified.
  const identifiers = page.locator('input[name^="identifiers["]')
  await expect(
    identifiers,
    'the identifier fields should be on the page'
  ).not.toHaveCount(0)
  const values = await identifiers.evaluateAll((fields) =>
    fields.map((field) => field.value)
  )
  expect(
    values.every((value) => value === ''),
    'the identifier fields should be empty when the page is photographed'
  ).toBe(true)

  const row = await record.record(page, 'animal-identification-details')

  expect(row.title, 'the screen should have a title to file it under').toBeTruthy()
  expect(
    row.model.fields,
    'the identification screen should carry the identifier form'
  ).toBeGreaterThan(0)
})
