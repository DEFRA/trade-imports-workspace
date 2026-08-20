//
// Design Release 1 — consignment slice.
//
// Six screens, in journey order: dr1-origin-of-the-import,
// dr1-what-are-you-importing, dr1-reason-for-import, dr1-consignment-details,
// dr1-animal-identification-details and dr1-additional-animal-details. That is
// the spine of DR1's notification journey — routes.js:1256-1285 declares the
// step order and it is exactly origin -> what are you importing -> reason for
// import -> consignment details -> [animal identification] -> additional animal
// details -> arrival details -> ...
//
// DR1 is the ROOT mount of the prototype's single router, so every path here is
// unprefixed. A picture taken under /design-release-2, /design-release-2.1 or
// /testing is a picture of a different application, and because all four mounts
// serve the same paths, every URL assertion below is anchored at the host (see
// `rootPath`) rather than at the end of the string.
//
// This is a requirements-gathering tool, not a test. Nothing below asserts that
// the prototype is correct — the assertions exist only to prove that each
// picture is of the page and the state its name claims.
//
// THE CONDITIONAL REVEALS ARE THE POINT OF THIS SLICE
//
// DR1 asks for an internal-market purpose, a transhipment destination country, a
// transit port of exit and destination country, and a temporary-admission exit
// date and port of exit. None of them has a view file, so a reader who greps
// app/views for a page will conclude DR1 never asks. It does. All four are radio
// conditionals on /reason-for-import: renderReasonForImportPage pre-renders four
// partials (routes.js:8944-8990) and hands the HTML to buildImportReasonItems
// (routes.js:8778-8821), which attaches each one to the radio whose value it
// names. Derived from that code, the mapping is:
//
//   importReason value                | partial                                        | fields inside
//   ----------------------------------|------------------------------------------------|--------------------------------------------
//   'Internal market'                 | partials/internal-market-purpose-select.html    | internalMarketPurpose (radios, 11 options)
//   'Transhipment or onward travel'   | partials/transhipment-destination-country-...   | transhipmentDestinationCountry (select)
//   'Transit'                         | partials/transit-options-select.html            | transitExitBorderControlPost (select),
//                                     |                                                 | transitDestinationCountry (select)
//   'Temporary admission horses'      | partials/temporary-admission-horses-select.html | temporaryAdmissionExitDate (MoJ date picker),
//                                     |                                                 | temporaryAdmissionPortOfExit (select)
//   'Re-entry'                        | — none —                                        | —
//
// The fifth reason, 'Re-entry' (app/data/import-reasons.js:19-23), is the only
// one with nothing behind it. Each reveal is photographed below as a named state
// of dr1-reason-for-import, empty, because an empty revealed question is the
// screen the design defines.
//
// The same shape appears on the origin page: the region-of-origin code is a
// reveal on the "Does the consignment have a region of origin code?" radios
// (origin-of-the-import.html:101-147, partials/region-of-origin-code-input.html),
// not a page. It is shot as dr1-origin-of-the-import-region-revealed.
//
// THE COMMODITY THIS SLICE CHOOSES, AND WHAT IT TURNS ON
//
// Cattle / Bos taurus — species id `cattle-bos-taurus`, CN code 0102
// (app/data/commodities.js:11-24, app/data/commodities-0102-species.js:8).
// Three things follow from that choice, and the last one matters to the
// addresses slice:
//
//   1. 0102 carries animal identifiers — Ear tag and Passport
//      (app/data/commodity-identifiers.js:9-12) — so hasAnimalIdentifiersRequired
//      is true (routes.js:1489) and /animal-identification-details is in the
//      journey at all. A commodity with no identifiers skips that screen.
//   2. 0102 has unweanedOptions, and is not a germinal product, so
//      /additional-animal-details shows both the certification-purpose question
//      and the unweaned question (routes.js:1187-1199).
//   3. **0102 turns on the CPH section and NOT the permanent-address section.**
//      app/data/consignment-address-sections.js:108-115 maps 0102 to place of
//      origin, consignor, consignee, importer, place of destination and `cph`.
//      Only 01061900 (other live mammals) maps to `permanent-address`
//      (:124-131), and 0101 (horses) maps to neither. So a session built on
//      cattle reaches /cph-number but never /permanent-address, and whoever owns
//      dr1-cph-number and dr1-permanent-address-animals needs a selection that
//      covers both codes — the section list is the union over every selected
//      commodity code (getActiveConsignmentAddressSectionsForCommodityCodes,
//      :167-177), so picking one 0102 species and one 01061900 species in the
//      same search gets both.
//
// Nothing on these six screens is minted per run, so there is nothing to mask:
// the notification reference is the constant 'GBN-AG-26-7K8M2P'
// (routes.js:55-57) and no date is generated. The two identifier values typed in
// below are fixed literals for the same reason.
//
import { readFileSync } from 'node:fs'

const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(async () => {
  record.write()
})

// A URL assertion anchored at the host, so it can only pass on the root mount.
// `toHaveURL(/\/reason-for-import$/)` would pass just as happily on
// /design-release-2.1/reason-for-import, which is a different application.
const rootPath = (path) => new RegExp(`^https?://[^/]+${path}$`)

// The species this slice imports. See the header for what it turns on.
const SPECIES_ID = 'cattle-bos-taurus'

// One test, because Playwright's page fixture is test-scoped and the prototype
// keeps the whole journey in the session: a second test() would start from an
// empty session and every guard-dependent page below would render its blank
// variant instead of the state its name claims.
test('the consignment slice', async ({ page }) => {
  // The GOV.UK Prototype Kit bounces nodemon while it recompiles, so the first
  // navigation on this side can meet a server that is restarting. This file
  // sorts before dashboard.pw.js, so it is the likely one to meet a cold server.
  //
  // /create-notification resets the journey session and redirects straight to
  // /origin-of-the-import (routes.js:9223-9227). It is the entry point for this
  // slice and it guarantees the pages below are photographed unanswered.
  await expect(async () => {
    await page.goto('/create-notification', { waitUntil: 'domcontentloaded' })
    await expect(
      page.getByRole('heading', { level: 1, name: 'Origin of the import' })
    ).toBeVisible({ timeout: 5_000 })
  }).toPass({ timeout: 240_000 })

  await expect(page).toHaveURL(rootPath('/origin-of-the-import'))

  await record.record(page, 'origin-of-the-import')

  // Country of origin is a search widget, not a select. It posts a hidden input
  // (origin-of-the-import.html:91-96, name="countryOfOrigin"); the visible
  // #country-of-origin box only drives a results list that needs three
  // characters (country-search.js:5, :194-243). Select by the option's
  // data-country value rather than by its visible text: "France" also matches
  // "French Guiana (France)", "Guadeloupe (France)" and four more territories,
  // all of which carry France in their label.
  await page.locator('#country-of-origin').fill('France')
  await expect(page.locator('#country-search-results')).toBeVisible()
  await page.locator('#country-search-results button[data-country="France"]').click()

  // The results panel closes on selection (country-search.js:169-173, :188-192).
  // Prove the hidden field took the value before going anywhere near a button.
  await expect(page.locator('#country-search-results')).toBeHidden()
  await expect(page.locator('input[name="countryOfOrigin"]')).toHaveValue('France')

  // STATE — the region-of-origin code reveal, opened by regionOfOriginRequired
  // = "Yes". The country is chosen first on purpose: the ISO prefix shown before
  // the code is written by the country search, not by the radio
  // (country-search.js:106-115, app/data/country-region-prefixes.js:15), so a
  // reveal opened before a country is picked shows an empty prefix box and is a
  // state nobody specified.
  await page.locator('input[name="regionOfOriginRequired"][value="Yes"]').check()
  await expect(page.locator('#region-of-origin-code-suffix')).toBeVisible()
  await expect(page.locator('#region-of-origin-code-prefix')).toHaveText('FR')

  await record.record(page, 'origin-of-the-import-region-revealed')

  // Answer "No" to move on. The reveal above is photographed empty because that
  // is the question the design defines; filling it would put a region code on
  // the review and hub pages, which belong to other slices, without adding
  // anything to this one. Answering "Yes" and leaving the code blank is the one
  // combination validateOriginOfImport rejects (routes.js:246-263).
  await page.locator('input[name="regionOfOriginRequired"][value="No"]').check()
  await expect(page.locator('#region-of-origin-code-suffix')).toBeHidden()

  await page.getByRole('button', { name: 'Save and continue', exact: true }).click()

  await expect(page).toHaveURL(rootPath('/what-are-you-importing'))
  await expect(
    page.getByRole('heading', { level: 1, name: 'What are you importing?' })
  ).toBeVisible()

  await record.record(page, 'what-are-you-importing')

  // The commodity search is the same widget shape as the country search, with
  // two extra traps.
  //
  // First, it posts four hidden inputs (what-are-you-importing.html:111-114) and
  // updateHiddenFields runs once at init (commodity-search.js:684), which seeds
  // `selectedSpecies` with the literal "[]" — so "assert not empty" passes
  // before anything has been chosen. The assertion below is against /^(\[\])?$/.
  //
  // Second, the open results panel is absolutely positioned over the buttons and
  // swallows the mousedown, so clicking "Save and continue" while it is open
  // reaches nothing at all. It is dismissed with Escape
  // (commodity-search.js:669-673) before any button is touched.
  await page.locator('#commodity-search').fill('Bos taurus')
  await expect(page.locator('#commodity-search-results')).toBeVisible()
  await expect(page.locator(`#commodity-species-${SPECIES_ID}`)).toBeVisible()

  // STATE — the search results open. Same page, not a second screen: the results
  // are rendered into #commodity-search-results by JS, and the GET handler
  // deletes any stored search term on every visit (routes.js:9289), so the
  // default picture above can never show them.
  await record.record(page, 'what-are-you-importing-results')

  await page.locator(`#commodity-species-${SPECIES_ID}`).check()
  await page.locator('#commodity-search').press('Escape')
  await expect(page.locator('#commodity-search-results')).toBeHidden()

  await expect(page.locator('input[name="selectedSpecies"]')).not.toHaveValue(/^(\[\])?$/)
  await expect(page.locator('input[name="commodityCode"]')).toHaveValue('0102')

  await page.getByRole('button', { name: 'Save and continue', exact: true }).click()

  // /what-are-you-importing posts to /reason-for-import, not to
  // /consignment-details (routes.js:9339).
  await expect(page).toHaveURL(rootPath('/reason-for-import'))
  await expect(
    page.getByRole('heading', { level: 1, name: 'Main reason for import' })
  ).toBeVisible()

  // The page as the design defines it: five radios, nothing chosen, every
  // conditional closed. The session was reset at /create-notification so no
  // reason is pre-selected.
  await expect(page.locator('input[name="importReason"]:checked')).toHaveCount(0)

  await record.record(page, 'reason-for-import')

  // STATES — the four conditional reveals, one picture each, each opened by the
  // radio VALUE that buildImportReasonItems attaches it to (routes.js:8795-8817).
  // Selecting by value and not by visible text is what keeps this honest: the
  // radio labels and the reason values are the same strings today, and a label
  // change would silently move a reveal onto the wrong picture.
  //
  // Radios are mutually exclusive, so each check closes the previous reveal and
  // every picture shows exactly one question open. Each is photographed empty —
  // an unanswered revealed question is the thing being compared.

  // 'Internal market' -> partials/internal-market-purpose-select.html.
  // Field: internalMarketPurpose, radios, 11 options from
  // app/data/internal-market-purposes.js.
  await page.locator('input[name="importReason"][value="Internal market"]').check()
  await expect(page.locator('.app-internal-market-purpose-reveal')).toBeVisible()
  await expect(page.locator('input[name="internalMarketPurpose"]').first()).toBeVisible()

  await record.record(page, 'reason-for-import-internal-market-revealed')

  // 'Transhipment or onward travel' ->
  // partials/transhipment-destination-country-select.html.
  // Field: transhipmentDestinationCountry, a select of every country option.
  await page
    .locator('input[name="importReason"][value="Transhipment or onward travel"]')
    .check()
  await expect(page.locator('#transhipment-destination-country')).toBeVisible()

  await record.record(page, 'reason-for-import-transhipment-revealed')

  // 'Transit' -> partials/transit-options-select.html. TWO fields:
  // transitExitBorderControlPost (labelled "Port of exit", options from
  // app/data/exit-border-control-posts.js) and transitDestinationCountry.
  await page.locator('input[name="importReason"][value="Transit"]').check()
  await expect(page.locator('#transit-exit-border-control-post')).toBeVisible()
  await expect(page.locator('#transit-destination-country')).toBeVisible()

  await record.record(page, 'reason-for-import-transit-revealed')

  // 'Temporary admission horses' ->
  // partials/temporary-admission-horses-select.html. TWO fields:
  // temporaryAdmissionExitDate (a MoJ date picker, labelled "Exit date") and
  // temporaryAdmissionPortOfExit (labelled "Port of exit", the same
  // exit-border-control-post list as Transit). The date field is left empty and
  // the picker is never opened — the value would be a date, and a typed date is
  // not part of the question being compared.
  await page
    .locator('input[name="importReason"][value="Temporary admission horses"]')
    .check()
  await expect(page.locator('#temporary-admission-exit-date')).toBeVisible()
  await expect(page.locator('#temporary-admission-port-of-exit')).toBeVisible()

  await record.record(page, 'reason-for-import-temporary-admission-revealed')

  // Answer the page for real and move on. 'Internal market' is the mainline
  // reason and the only one this slice can answer without inventing a date; its
  // purpose must be filled or validateImportReasonProceed rejects the page
  // (routes.js:1387-1394). 'Transit' is deliberately not chosen: it is the one
  // reason that also needs a port of exit, and nothing downstream of this slice
  // is helped by it.
  await page.locator('input[name="importReason"][value="Internal market"]').check()
  await expect(page.locator('.app-internal-market-purpose-reveal')).toBeVisible()
  await page.locator('input[name="internalMarketPurpose"][value="Breeding"]').check()

  await page.getByRole('button', { name: 'Save and continue', exact: true }).click()

  await expect(page).toHaveURL(rootPath('/consignment-details'))
  await expect(
    page.getByRole('heading', { level: 1, name: 'Commodity details' })
  ).toBeVisible()

  // Empty, before a number is typed. The selected-commodities table above the
  // form is server-rendered from the session and is part of the page, not an
  // answer.
  await record.record(page, 'consignment-details')

  // Two animals rather than one, so that /animal-identification-details renders
  // its multi-animal flow: the "Save and add another" button only appears when
  // totalAnimals > 1 (routes.js:1711-1722), and without it the saved-animals
  // list below can never be reached. Number of animals is the only field the
  // page requires for a live animal: the "Number of packages (when required)"
  // input beside it is optional, and net weight and package type have no input
  // on this view at all — their validation fires for germinal products only
  // (routes.js:900-994), which DR1 cannot select (see the end of this file).
  await page.locator(`#number-of-animals-${SPECIES_ID}`).fill('2')

  await page.getByRole('button', { name: 'Save and continue', exact: true }).click()

  await expect(page).toHaveURL(rootPath('/animal-identification-details'))
  await expect(
    page.getByRole('heading', { level: 1, name: 'Identification details' })
  ).toBeVisible()
  await expect(page.locator(`#identifier-${SPECIES_ID}-ear-tag`)).toBeVisible()

  await record.record(page, 'animal-identification-details')

  // STATE — the same page with one animal saved. Saved animals are re-listed
  // inside this page by partials/animal-identification-saved-animals.html
  // (animal-identification-details.html:131-133), so the populated view is a
  // state of this screen and not a second screen. Both identifier fields must be
  // filled or the entry does not count as complete (routes.js:1526-1532) and
  // nothing is listed. The two values are fixed literals, not generated.
  await page.locator(`#identifier-${SPECIES_ID}-ear-tag`).fill('UK123456700001')
  await page.locator(`#identifier-${SPECIES_ID}-passport`).fill('PP0000001')

  await page.getByRole('button', { name: 'Save and add another', exact: true }).click()

  await expect(page).toHaveURL(rootPath('/animal-identification-details'))
  await expect(page.locator('.app-animal-identification-panel__saved')).toBeVisible()
  await expect(
    page.locator('.app-animal-identification-panel__saved-row', { hasText: 'Bos taurus 1' })
  ).toBeVisible()

  await record.record(page, 'animal-identification-details-saved')

  await page.getByRole('button', { name: 'Save and continue', exact: true }).click()

  await expect(page).toHaveURL(rootPath('/additional-animal-details'))
  await expect(
    page.getByRole('heading', { level: 1, name: 'Additional details' })
  ).toBeVisible()

  // Both questions this consignment gets: what the animals are certified for,
  // and whether any are unweaned. Asserted before the shot so the picture cannot
  // be mislabelled as the fuller page.
  await expect(page.locator('input[name="certificationPurpose"]').first()).toBeVisible()
  await expect(page.locator('input[name="unweanedAnimals"]').first()).toBeVisible()

  await record.record(page, 'additional-animal-details')

  // NOT CAPTURED — the storage-temperature question on
  // /additional-animal-details, and any germinal-product variant of
  // /consignment-details or /animal-identification-details.
  //
  // Not skipped: unreachable on DR1. showTemperatureQuestion is
  // hasGerminalProductsOnly(sessionData) (routes.js:1189), and a DR1 session can
  // never select a germinal product at all — getSearchCommodities returns the
  // live-animal list only, and returns allCommodities (which adds
  // app/data/commodities-germinal-products.js) solely when
  // _isDesignRelease21Version is set on the session (routes.js:65-73). That flag
  // is set by the DR2.1 mount and never at the root. So DR1's commodity search
  // offers no semen, embryos or ova, the temperature question has no DR1 state,
  // and the net-weight and package-type answers that /consignment-details
  // validates for germinal products have no input on this side at all. (The
  // optional "Number of packages" input IS rendered for cattle and is in the
  // picture above.) That absence is itself worth comparing against the frontend
  // and is recorded here rather than photographed.
  //
  // NOT CAPTURED — the error states of these six pages. Every one of them has an
  // error summary branch, but an error state is one design decision per field
  // and belongs to whoever compares validation, not to the slice that walks the
  // journey. The screens and the conditional reveals are what this slice owns.
})
