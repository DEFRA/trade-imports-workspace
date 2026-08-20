//
// Design Release 1 — review slice.
//
// Three screens, the tail of DR1's notification journey:
// dr1-review-notification, dr1-declaration and dr1-notification-submitted.
// routes.js:1255-1283 declares the step order and it ends
// ... -> /roles-and-addresses -> /contact-address-for-consignment ->
// /review-notification -> /declaration, with /notification-submitted behind the
// declaration POST.
//
// DR1 is the ROOT mount of the prototype's single router, so every path here is
// unprefixed. Because all four mounts serve the same paths, every URL assertion
// below is anchored at the host (see `rootPath`) rather than at the end of the
// string — `toHaveURL(/\/declaration$/)` would pass just as happily on
// /design-release-2.1/declaration, which is a different application.
//
// This is a requirements-gathering tool, not a test. Nothing below asserts that
// the prototype is correct — the assertions exist only to prove that each
// picture is of the page and the state its name claims.
//
// ---------------------------------------------------------------------------
// WHAT DR1 TREATS AS A COMPLETE NOTIFICATION
// ---------------------------------------------------------------------------
//
// This is the rule the whole slice is built around, and it is worth stating
// because it is what the frontend's own review gate gets compared against.
//
// POST /review-notification (routes.js:10068-10076) gates on
// `hasNotificationComplete` (routes.js:4569-4571), which is
// `hasReviewNotificationComplete(sessionData) && hasContactAddress(sessionData)`.
// `hasReviewNotificationComplete` (routes.js:4528-4567) is a straight run of ten
// predicates, and it is the definitive list:
//
//   hasOriginDetails                      country of origin + region-required
//                                         answered (routes.js:230-243)
//   hasCommoditySelection                 at least one species (routes.js:774)
//   hasConsignmentDetails                 a numeric count >= 1 for EVERY selected
//                                         species (routes.js:1201-1214)
//   hasAdditionalAnimalDetailsComplete    whichever of certification purpose /
//                                         temperature / unweaned that commodity
//                                         shows (routes.js:1220-1253)
//   hasImportReasonComplete               a main reason, plus that reason's own
//                                         conditional answers (routes.js:1343-1367)
//   hasArrivalDetailsComplete             arrival date IN RANGE, port of entry
//                                         from the list, means of transport,
//                                         transport identification, transport
//                                         document reference — all five
//                                         (routes.js:1872-1888)
//   hasTransportDetailsComplete           a transporter with a name
//                                         (routes.js:2881-2883)
//   hasConsignmentAddressesComplete       every section the commodity turns on
//                                         (routes.js:2203-2207)
//   hasMinimumAnimalIdentifiersForSubmit  see below (routes.js:1515-1525)
//   hasContactAddress                     a contact address resolvable by id
//                                         (routes.js:1047-1053)
//
// Two things are deliberately NOT required, and both are commented as such in
// the source at routes.js:4558-4559:
//
//   - **Uploaded documents are optional.** No document is ever needed to submit.
//   - **Animal identifiers are optional for a SINGLE species.**
//     `hasMinimumAnimalIdentifiersForSubmit` returns true outright unless
//     `requiresAnimalIdentifiersForSubmit` — which is
//     `hasMultipleSpeciesSelected && hasAnimalIdentifiersRequired`
//     (routes.js:1511-1513). One species, no matter how many identifier fields
//     that commodity carries, needs none of them.
//
// Transit countries are optional too (routes.js:4801, and
// `hasTransitCountriesComplete` at routes.js:1934-1937 returns a literal true).
//
// So this spec completes exactly: origin, commodity, consignment counts,
// additional animal details, import reason, arrival details, transporter, the
// five party addresses, the CPH number, and the contact address. It uploads no
// document and saves no animal identifier, and DR1 still lets it through.
//
// ---------------------------------------------------------------------------
// THE INCOMPLETE REVIEW PAGE, AND WHY ONE PICTURE COVERS BOTH WAYS IN
// ---------------------------------------------------------------------------
//
// GET /review-notification falls through its DR2-only branches to
// `renderReviewNotificationPage(req, res)` with no options (routes.js:10040-10042).
// POST /review-notification, when `hasNotificationComplete` is false, calls
// **the same function with the same (absent) options** (routes.js:10071-10072).
// The two renders are therefore identical — DR1 does not add anything on submit
// that it was not already showing. One picture is the honest record of both, and
// it is taken after the POST because that is the moment the design has to answer
// "I pressed Continue and nothing happened".
//
// What the incomplete page shows is assembled by
// `getReviewNotificationViewModelWithErrors` (routes.js:4870-4890) and lands in
// three places:
//
//   1. A "There is a problem" error summary, one entry per incomplete card,
//      each reading `Complete <card title lowercased>` and linking to that
//      card's id (`reviewCardErrorState`, routes.js:4473-4482;
//      `buildReviewErrorList`, routes.js:4521-4529). It renders whenever
//      `data.errorList` is non-empty (review-notification.html:33-37).
//   2. Per card, a red wrapper (`app-review-card-wrapper--error`) and the same
//      `Complete <title>` repeated as a `govuk-error-message` inside the card
//      (partials/review-summary-card.html:3-18).
//   3. Inside an erroring card only, every row whose value is empty or "Not
//      applicable" is BLANKED and marked missing — the value cell renders as a
//      visually-hidden "Missing" and nothing else
//      (`mapReviewRowsForErrorCard`, routes.js:4083-4094;
//      partials/review-summary-row.html:15-26). So DR1 states what is missing
//      per CARD, not per field: the field-level signal is an empty cell.
//
// ---------------------------------------------------------------------------
// VOLATILE VALUES ON THESE THREE PAGES — THE BIGGEST RISK IN THIS SLICE
// ---------------------------------------------------------------------------
//
// SAFE. The notification reference is the constant `GBN-AG-26-7K8M2P`
// (`DESIGN_RELEASE_NOTIFICATION_REFERENCE`, routes.js:55, aliased to
// `PROTOTYPE_NOTIFICATION_REFERENCE` at routes.js:57 and returned unconditionally
// for any non-testing session by `getPrototypeNotificationReference`,
// routes.js:115-119). It is printed on the review page via
// partials/notification-status.html:21 and in the confirmation panel at
// notification-submitted.html:23. Nothing mints it per run, so nothing masks it.
//
// MASKED — two, and both are derived from the clock:
//
//   1. **Date of declaration.** `renderDeclarationPage` passes
//      `declarationDate: formatDeclarationDate()` (routes.js:5700), and
//      `formatDeclarationDate` defaults to `new Date()` (routes.js:5633-5640).
//      It renders as today's date in
//      `.app-declaration-page__date-value` (declaration.html:86-88), so the
//      declaration screenshot would differ every single day. Masked to
//      `[masked date]` before both declaration shots.
//
//   2. **Arrival date at destination**, on the completed review page. The
//      arrival date has a moving valid window — `[today - 7 days, today + 6
//      months]`, `getArrivalDatePickerBounds` at routes.js:3927-3938, enforced by
//      `isArrivalDateWithinAllowedRange` at routes.js:3951-3963 — so a literal
//      typed here would expire silently and this spec derives it from
//      `new Date()` instead (see `arrivalDate` below). That derived value is then
//      echoed on the review page as the "Arrival date at destination" row
//      (routes.js:4674-4677), which would move the picture every run. Masked to
//      `[masked date]` by `maskArrivalDate` before every review shot.
//
// Nothing else on these three pages is generated. `saveSubmittedNotification`
// (routes.js:6159) does stamp a submitted notification, but
// `renderNotificationSubmittedPage` (routes.js:5707-5719) renders only the
// reference and the follow-up list, neither of which carries a date.
//
// ---------------------------------------------------------------------------
// THE SHORTCUT THIS SPEC TAKES INTO THE JOURNEY
// ---------------------------------------------------------------------------
//
// GET /prototype/reason-for-import (routes.js:9536-9540) is the application's
// own seed: it calls `seedPrototypeSessionForReasonForImport` (routes.js:210-228)
// and redirects to /reason-for-import. It sets country of origin France,
// region-required "No", commodity 0102 / Cattle, species `cattle-bison-bison`,
// five animals, certification purpose "Slaughter" and unweaned "No" — which is
// exactly hasOriginDetails, hasCommoditySelection, hasConsignmentDetails and
// hasAdditionalAnimalDetailsComplete satisfied in one GET.
//
// It is used here for one reason beyond speed: it arrives past
// /what-are-you-importing without driving the commodity search widget, whose
// open results panel overlays the buttons and swallows the mousedown. That
// widget belongs to the consignment slice, which photographs it properly; this
// slice has no business re-driving it.
//
// 0102 is a single species, so — per the completeness rule above — no animal
// identifier is required. It also turns on the `cph` consignment-address section
// and not `permanent-address`
// (app/data/consignment-address-sections.js:108-115), which is why /cph-number
// appears in the completion run below and /permanent-address does not.
//
// The means of transport chosen is "Airplane" on purpose:
// `requiresTransitCountries` (routes.js:1902-1908) is true only for Railway and
// Road Vehicle, so Airplane keeps /transit-countries out of the journey and the
// transit card off the review page — that card belongs to another slice.
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
const rootPath = (path) => new RegExp(`^https?://[^/]+${path}$`)

// What a masked date reads as in every picture this spec takes. Deliberately
// not date-shaped: a reader must be able to tell at a glance that DR1 printed
// something here and that this capture replaced it, rather than wonder whether
// the prototype really shows 1 January.
const MASKED_DATE = '[masked date]'

// The arrival date, derived rather than typed. `formatArrivalPickerDate`
// (routes.js:3919-3921) is `d/m/yyyy` with no leading zeros, and
// `parseArrivalDisplayDate` (routes.js:3894-3917) accepts one or two digits for
// day and month. Seven days out sits inside the allowed window whenever this
// runs.
const arrivalDate = (() => {
  const date = new Date()
  date.setDate(date.getDate() + 7)

  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
})()

// The addresses this spec picks, one per consignment-address section, quoted by
// the fixture id each radio posts (app/data/consignment-addresses.js). Selecting
// by id rather than by row position or visible name matters twice over: two
// sections carry an address called "Green Valley Farm", and the page's Search
// box is a live row filter that hides rows as you type — a spec that typed into
// it would make its own target disappear. Nothing is typed into it here.
const SECTION_ADDRESSES = [
  {
    path: '/place-of-origin',
    heading: 'Place of origin',
    field: 'placeOfOriginAddressId',
    addressId: 'green-valley-farm-sanpetru'
  },
  {
    path: '/consignor-or-exporter',
    heading: 'Consignor',
    field: 'consignorAddressId',
    addressId: 'green-valley-farm-sanpetru-consignor'
  },
  {
    path: '/consignee',
    heading: 'Consignee',
    field: 'consigneeAddressId',
    addressId: 'northern-livestock-imports-consignee'
  },
  {
    path: '/importer',
    heading: 'Importer',
    field: 'importerAddressId',
    addressId: 'northern-livestock-imports-importer'
  },
  {
    path: '/place-of-destination',
    heading: 'Place of destination',
    field: 'placeOfDestinationAddressId',
    addressId: 'riverside-holding-facility'
  }
]

/**
 * Replace the review page's arrival date with a fixed placeholder.
 *
 * Only a cell that actually holds a `d/m/yyyy` value is touched. On the
 * incomplete review the same row renders blank with a visually-hidden "Missing"
 * (routes.js:4083-4094), and overwriting that would destroy the very signal the
 * incomplete picture exists to show.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} masked - What to print in place of the date
 * @returns {Promise<void>}
 */
const maskArrivalDate = async (page, masked) => {
  await page.evaluate((placeholder) => {
    for (const row of document.querySelectorAll('.app-review-card__row')) {
      const key = row.querySelector('.app-review-card__key')
      const value = row.querySelector('.app-review-card__value')

      if (!key || !value) {
        continue
      }

      if (key.textContent.trim() !== 'Arrival date at destination') {
        continue
      }

      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value.textContent.trim())) {
        value.textContent = placeholder
      }
    }
  }, masked)
}

/**
 * Replace the declaration page's "Date of declaration" with a fixed placeholder.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} masked - What to print in place of the date
 * @returns {Promise<void>}
 */
const maskDeclarationDate = async (page, masked) => {
  await page.evaluate((placeholder) => {
    for (const el of document.querySelectorAll('.app-declaration-page__date-value')) {
      el.textContent = placeholder
    }
  }, masked)
}

// One test, because Playwright's `page` fixture is test-scoped and the prototype
// keeps the whole journey in the session: a second test() would start from an
// empty session, and /notification-submitted would then redirect straight back
// to /declaration (routes.js:10107-10112). Every screen in this slice depends on
// the state the lines above it built.
test('the review slice', async ({ page }) => {
  // The GOV.UK Prototype Kit bounces nodemon while it recompiles, so the first
  // navigation on this side can meet a server that is restarting.
  //
  // /prototype/reason-for-import seeds the session and redirects to
  // /reason-for-import — see the header for what it sets and why this slice
  // uses it instead of driving the commodity search widget.
  await expect(async () => {
    await page.goto('/prototype/reason-for-import', { waitUntil: 'domcontentloaded' })
    await expect(
      page.getByRole('heading', { level: 1, name: 'Main reason for import' })
    ).toBeVisible({ timeout: 5_000 })
  }).toPass({ timeout: 240_000 })

  await expect(page).toHaveURL(rootPath('/reason-for-import'))

  // Not photographed — dr1-reason-for-import and its four conditional reveals
  // belong to the consignment slice. "Re-entry" is chosen because it is the one
  // reason of the five with nothing revealed behind it
  // (app/data/import-reasons.js:19-23), so hasImportReasonComplete
  // (routes.js:1343-1367) is satisfied by the radio alone.
  await page.locator('input[name="importReason"][value="Re-entry"]').check()
  await page.getByRole('button', { name: 'Save and continue', exact: true }).click()

  await expect(page).toHaveURL(rootPath('/consignment-details'))

  // ---- dr1-review-notification, incomplete ------------------------------
  //
  // Arrival details, transport, the consignment parties and the contact address
  // are all still unanswered at this point, so the review page renders its
  // error state. See the header for why the picture is taken after the POST and
  // why that one picture also stands for the GET.
  await page.goto('/review-notification')

  await expect(page).toHaveURL(rootPath('/review-notification'))
  await expect(
    page.getByRole('heading', { level: 1, name: 'Review your notification' })
  ).toBeVisible()

  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  // DR1 re-renders in place rather than redirecting (routes.js:10071-10072), so
  // the URL is unchanged and the error summary is the proof the POST refused.
  await expect(page).toHaveURL(rootPath('/review-notification'))
  await expect(
    page.getByRole('heading', { level: 1, name: 'Review your notification' })
  ).toBeVisible()
  await expect(page.locator('.govuk-error-summary')).toBeVisible()
  await expect(page.locator('.govuk-error-summary')).toContainText(
    'Complete arrival details'
  )

  // A no-op here — the arrival row is blank and marked missing — but applied to
  // every review shot so the two pictures are treated identically.
  await maskArrivalDate(page, MASKED_DATE)

  // STATE — the review page before the notification is complete.
  await record.record(page, 'review-notification-incomplete')

  // ---- complete the notification ----------------------------------------
  //
  // None of the pages below is photographed; they belong to other slices. Each
  // is asserted on arrival only so that a failure here names the page it
  // happened on.

  // Arrival details. All five fields, because hasArrivalDetailsComplete
  // (routes.js:1872-1888) wants all five.
  await page.goto('/arrival-details')

  await expect(page).toHaveURL(rootPath('/arrival-details'))
  await expect(
    page.getByRole('heading', { level: 1, name: 'Arrival details' })
  ).toBeVisible()

  // The MoJ date picker's input IS the posted field (name="arrivalDateAtPort",
  // partials/arrival-date-picker.html:6), so it is filled rather than driven
  // through the calendar. The dialog opens only on the calendar button
  // (date-picker.bundle.js:85) and the component rewrites the input only when a
  // day is picked from that dialog (:478), so a fill neither opens it nor gets
  // reformatted — the exact value asserted here is the value that posts.
  await page.locator('#arrival-date-at-port').fill(arrivalDate)
  await expect(page.locator('#arrival-date-at-port')).toHaveValue(arrivalDate)

  // Port of entry is a search widget, not a select. The visible #port-of-entry
  // box only drives a results list that needs three characters
  // (airport-search.js:4, :113-118); the value that posts is the hidden
  // input[name="portOfEntry"] (arrival-details.html:100-105), and it must match
  // one of `${name} - ${code}` exactly for isValidPortOfEntry
  // (routes.js:1840-1848) to accept it.
  await page.locator('#port-of-entry').fill('Heathrow')
  await expect(page.locator('#port-search-results')).toBeVisible()
  await page
    .locator('#port-search-results button[data-option="London Heathrow - LHR"]')
    .click()

  // Selecting closes the panel (airport-search.js:108-112). Prove the hidden
  // field took the value before going near a button — the open panel is
  // absolutely positioned over them and swallows the mousedown.
  await expect(page.locator('#port-search-results')).toBeHidden()
  await expect(page.locator('input[name="portOfEntry"]')).toHaveValue(
    'London Heathrow - LHR'
  )

  // Airplane, not Railway or Road Vehicle — see the header.
  await page.locator('#means-of-transport').selectOption('Airplane')
  await page.locator('#transport-identification').fill('BA1234')
  await page.locator('#transport-document-reference').fill('AWB-125-98765432')

  await page.getByRole('button', { name: 'Save and continue', exact: true }).click()

  await expect(page).toHaveURL(rootPath('/transporter'))

  // Transporter. hasTransportDetailsComplete (routes.js:2881-2883) needs only a
  // transporter with a name, so one radio does it. Selected by the fixture id
  // the radio posts (app/data/transporters.js:3), not by row position, and
  // nothing is typed into this page's search box either — it is the same live
  // row filter as the party pickers.
  await page
    .locator('input[name="transporterId"][value="yusen-logistics-romania"]')
    .check()
  await page.getByRole('button', { name: 'Save and continue', exact: true }).click()

  await expect(page).toHaveURL(rootPath('/upload-documents'))

  // The five consignment parties. Each POST redirects back to
  // /roles-and-addresses (routes.js:3873-3876), so each section is entered by
  // its own path rather than by clicking rows on the hub — an answered hub row
  // still renders a link, and driving off "any link" reopens the first section
  // forever.
  for (const section of SECTION_ADDRESSES) {
    await page.goto(section.path)

    await expect(page).toHaveURL(rootPath(section.path))
    await expect(
      page.getByRole('heading', { level: 1, name: section.heading, exact: true })
    ).toBeVisible()

    await page
      .locator(`input[name="${section.field}"][value="${section.addressId}"]`)
      .check()
    await page.getByRole('button', { name: 'Save and continue', exact: true }).click()

    await expect(page).toHaveURL(rootPath('/roles-and-addresses'))
  }

  // The CPH number, which commodity 0102 turns on. County, parish and holding
  // are three inputs of one govukDateInput (partials/cph-number-input.html), not
  // a reveal, and validateCphNumber (routes.js:2840-2864) only stores a value
  // when all three are filled.
  await page.goto('/cph-number')

  await expect(page).toHaveURL(rootPath('/cph-number'))
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Add the county parish holding number (CPH)'
    })
  ).toBeVisible()

  await page.locator('input[name="cphNumber-county"]').fill('12')
  await page.locator('input[name="cphNumber-parish"]').fill('345')
  await page.locator('input[name="cphNumber-holding"]').fill('6789')
  await page.getByRole('button', { name: 'Save and continue', exact: true }).click()

  await expect(page).toHaveURL(rootPath('/roles-and-addresses'))

  // The contact address — the tenth and last predicate. Its Continue posts no
  // `action`, so getNextJourneyPath sends it straight to /review-notification
  // (routes.js:10976, routes.js:1276-1281).
  await page.goto('/contact-address-for-consignment')

  await expect(page).toHaveURL(rootPath('/contact-address-for-consignment'))

  await page
    .locator('input[name="contactAddressId"][value="aberdeen-livestock-union-street"]')
    .check()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  // ---- dr1-review-notification, complete --------------------------------
  await expect(page).toHaveURL(rootPath('/review-notification'))
  await expect(
    page.getByRole('heading', { level: 1, name: 'Review your notification' })
  ).toBeVisible()

  // The error summary is gone, which is the positive proof that this is the
  // complete render and not the one photographed above. Note that no document
  // was uploaded and no animal identifier saved — DR1 asks for neither to reach
  // this state (see the completeness rule in the header).
  await expect(page.locator('.govuk-error-summary')).toHaveCount(0)

  await maskArrivalDate(page, MASKED_DATE)

  await record.record(page, 'review-notification')

  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  // ---- dr1-declaration ---------------------------------------------------
  await expect(page).toHaveURL(rootPath('/declaration'))
  await expect(
    page.getByRole('heading', { level: 1, name: 'Declaration' })
  ).toBeVisible()

  // Unticked, which is how the page arrives — the screen the design defines.
  await expect(page.locator('#declaration-confirmed')).not.toBeChecked()

  await maskDeclarationDate(page, MASKED_DATE)

  await record.record(page, 'declaration')

  // STATE — the validation error. Submitting without ticking is the only thing
  // validateDeclaration (routes.js:5647-5666) rejects, and it re-renders in
  // place rather than redirecting (routes.js:10087-10093).
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  await expect(page).toHaveURL(rootPath('/declaration'))
  await expect(page.locator('.govuk-error-summary')).toContainText(
    'Confirm that you have reviewed and comply with this declaration'
  )

  // Re-applied: the POST re-rendered the page, so the mask above is gone.
  await maskDeclarationDate(page, MASKED_DATE)

  await record.record(page, 'declaration-error')

  // The declaration is a CHECKBOX, not a radio (declaration.html:66-83).
  await page.locator('#declaration-confirmed').check()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  // ---- dr1-notification-submitted ----------------------------------------
  //
  // Reachable only once hasDeclarationConfirmed passes; otherwise
  // routes.js:10110-10112 bounces back to /declaration.
  //
  // The page carries a "Before the consignment is imported" section here, and
  // that is DR1 behaving normally rather than an artefact of this spec.
  // getConditionalSubmissionItems (routes.js:5674-5697) adds one item because no
  // document was uploaded, and a second because commodity 0102 carries identifier
  // fields (app/data/commodity-identifiers.js:10-13) that were left blank while
  // still meeting the single-species minimum. Both are things DR1 accepts at
  // submission and asks for afterwards — which is the point of the section, and
  // is exactly the comparison a finding author will want to make.
  await expect(page).toHaveURL(rootPath('/notification-submitted'))
  await expect(
    page.getByRole('heading', { level: 1, name: 'Import notification submitted' })
  ).toBeVisible()

  // The reference in the confirmation panel is the constant, not a minted value.
  await expect(page.locator('.govuk-panel__body')).toContainText('GBN-AG-26-7K8M2P')

  await record.record(page, 'notification-submitted')
})
