import { readFileSync } from 'node:fs'

const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

// ---------------------------------------------------------------------------
// The `transport-documents` slice of the live-animals frontend.
//
// Six screens: arrival details, transit countries, transporter type, the two
// mutually exclusive transporter detail screens, and accompanying documents.
//
// Everything here is derived from the application's own source:
//   features/transport/{port-of-entry,transit-countries,transporters,
//                       transporters-select,private-transporter-details}/
//   features/documents/
//   obligations/sections/transport.js
//   journeys/linear/flow/{flow.js,task-rows.js,entry-guard.js,run.js}
// Nothing is imported from the application, and nothing here asserts that the
// application is correct — every assertion only pins down which page the next
// picture is of.
// ---------------------------------------------------------------------------

// --- fixture values, chosen by VALUE and not by visible text ---------------
//
// The port and country lists come from a reference service in one mode and a
// JSON fixture in another, and one of the country names is "Netherlands (the)".
// A name-matched locator trips over that, so every list here is driven by the
// code the option carries.
//
// services/_capture/fixtures/ports-of-entry.json  -> "GB DVR" = Port of Dover
// services/_capture/fixtures/countries-origin.json -> FR, DE
// sets/live-animals/services/commodities/stub.js  -> "Dog|923502"
const ORIGIN_COUNTRY = 'FR'
const COMMODITY_SPECIES_KEY = 'Dog|923502'
const PORT_OF_ENTRY = 'GB DVR'
const TRANSIT_COUNTRIES = ['FR', 'DE']

// --- what is masked before every shot, and why -----------------------------
//
// Two things on these pages are derived from the clock or minted per run, and
// both would otherwise produce different pixels for an unchanged page on every
// capture. A drift panel that fires every time teaches its reader to skip it,
// so both are fixed here, at the capture.
//
// 1. The journey id, minted per run and printed on every journey page by
//    shared/layout.njk (`.app-journey-strip span`).
// 2. The arrival window, `today - 7 days` to `today + 6 months`, which the
//    arrival page prints in its date hint and hands to the MoJ picker as
//    `data-min-date` / `data-max-date`. The RUN-BRIEF is explicit that this
//    value is never compared between the two sides — only the field is — so
//    replacing the dates with a fixed pair costs the comparison nothing and
//    keeps a daily change out of the corpus. The sentence keeps its shape.
const REFERENCE_PLACEHOLDER = 'AAAA-0000-AAAA'
const ARRIVAL_WINDOW_PLACEHOLDER = '1/1/2000'

// --- the arrival date window ----------------------------------------------
//
// features/transport/port-of-entry/arrival-window.js is the rule: the window is
// [today - DAYS_BEFORE, today + MONTHS_AHEAD] where "today" is the start of the
// calendar day in Europe/London, DAYS_BEFORE = 7 and MONTHS_AHEAD = 6. It moves
// with `new Date()`, so a literal typed here would expire silently. This
// derives a date fourteen days out — comfortably inside both bounds all year —
// using the same Europe/London day boundary the rule uses
// (lib/validate/calendar.js `startOfDayInZone`) and the same `d/m/yyyy` text
// shape the MoJ picker writes back (`formatDateText`).
const SERVICE_TIME_ZONE = 'Europe/London'
const DAYS_AHEAD = 14

const startOfTodayInService = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SERVICE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())
  const partValue = (type) =>
    Number(parts.find((part) => part.type === type).value)
  return new Date(
    Date.UTC(partValue('year'), partValue('month') - 1, partValue('day'))
  )
}

const arrivalDateText = () => {
  const date = startOfTodayInService()
  date.setUTCDate(date.getUTCDate() + DAYS_AHEAD)
  return `${date.getUTCDate()}/${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`
}

// The date of issue on a document has no window (documents/form/payload.js uses
// a plain `dateText`), so a literal is stable and cannot expire.
const DOCUMENT_DATE_OF_ISSUE = '12/12/2025'

// --- helpers ---------------------------------------------------------------

const maskJourneyReference = (page) =>
  page.evaluate((text) => {
    for (const element of document.querySelectorAll('.app-journey-strip span')) {
      element.textContent = text
    }
  }, REFERENCE_PLACEHOLDER)

// Targeted at the arrival field by id rather than at every hint on the page:
// the documents page prints a fixed example date in its own hint ("For example,
// 12/12/2025"), which is design copy and must not be rewritten.
const maskArrivalWindow = (page) =>
  page.evaluate((placeholder) => {
    const picker = document
      .getElementById('arrivalDateAtPort')
      ?.closest('.moj-datepicker')
    if (!picker) {
      return
    }
    picker.setAttribute('data-min-date', placeholder)
    picker.setAttribute('data-max-date', placeholder)
    for (const hint of picker.querySelectorAll('.govuk-hint')) {
      hint.textContent = hint.textContent.replace(
        /\d{1,2}\/\d{1,2}\/\d{4}/g,
        placeholder
      )
    }
  }, ARRIVAL_WINDOW_PLACEHOLDER)

const shoot = async (page, name) => {
  await maskJourneyReference(page)
  await maskArrivalWindow(page)
  await record.record(page, name)
}

const journeyIdFrom = (page) => {
  const match = /\/notifications\/([^/?]+)/.exec(new URL(page.url()).pathname)
  return match[1]
}

const saveAndContinue = (page) =>
  page.getByRole('button', { name: 'Save and continue', exact: true }).click()

/** A govuk radio or checkbox, addressed by the value it posts. */
const optionByValue = (page, name, value) =>
  page.locator(`input[name="${name}"][value="${value}"]`)

/**
 * Start a fresh notification and answer just enough for the transport and
 * documents pages to be navigable.
 *
 * Two answers are load-bearing, and only two. flow/prerequisites.js holds every
 * page after the commodity leg behind the `ENFORCED_AT_CONTINUE` set in
 * bridge/obligation-source.js — `countryOfOrigin` and `commoditySelection`.
 * Until both are answered, flow/navigation.js `nextInSection` skips every
 * transport page and lands on the hub instead, so the transporter branch could
 * not be shown deciding anything.
 *
 * Neither page is recorded here: origin and commodities belong to other slices.
 */
const startJourney = async (page) => {
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'Start a new notification' })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Start a new notification' }).click()

  await expect(page).toHaveURL(/\/origin$/)
  await page.locator('#countryOfOrigin').selectOption(ORIGIN_COUNTRY)
  await optionByValue(page, 'regionOfOriginCodeRequirement', 'no').check()
  await saveAndContinue(page)

  await expect(page).toHaveURL(/\/commodities$/)
  await optionByValue(page, 'species', COMMODITY_SPECIES_KEY).check()
  await saveAndContinue(page)
  await expect(page).toHaveURL(/\/consignment-details$/)

  return journeyIdFrom(page)
}

/**
 * Fill the arrival details page.
 *
 * Two widgets need re-deriving here rather than driving naively:
 *
 * 1. The port of entry is a govukSelect progressively enhanced by
 *    accessible-autocomplete (components/accessible-autocomplete/macro.njk).
 *    enhanceSelectElement hides the original select, renames its id to
 *    `portOfEntry-select` and leaves the `name` on it, so the SELECT is still
 *    what posts. Setting it directly, by value, never opens the results panel —
 *    and an open results panel overlays the buttons and swallows the Continue
 *    mousedown. `force` is needed only because the select is display:none.
 *
 * 2. The arrival date is a MoJ date picker. The value is typed into the input
 *    rather than driven through the calendar, and Escape dismisses the calendar
 *    if anything opened it.
 *
 * `meansOfTransport` is ROAD_VEHICLE deliberately: obligations/sections/
 * transport.js gates `transitedCountries` on RAILWAY or ROAD_VEHICLE, so this
 * is what puts the transit-countries page in scope and in the forward path.
 */
const fillArrivalDetails = async (page) => {
  await page.locator('#arrivalDateAtPort').fill(arrivalDateText())
  await page.locator('#arrivalDateAtPort').press('Escape')

  const portSelect = page.locator('#portOfEntry-select')
  await expect(portSelect).toBeAttached()
  await portSelect.selectOption({ value: PORT_OF_ENTRY }, { force: true })
  await expect(portSelect).toHaveValue(PORT_OF_ENTRY)

  await optionByValue(page, 'meansOfTransport', 'ROAD_VEHICLE').check()
  await page.locator('#transportIdentification').fill('AB12 CDE')
  await page.locator('#transportDocumentReference').fill('CMR-0099123')
}

const addDocument = async (page, { reference, filename }) => {
  await page.locator('#accompanyingDocumentReference').fill(reference)
  await page
    .locator('#accompanyingDocumentDateOfIssue')
    .fill(DOCUMENT_DATE_OF_ISSUE)
  await page.locator('#accompanyingDocumentDateOfIssue').press('Escape')
  await page.locator('#file').setInputFiles({
    name: filename,
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\nparity capture placeholder\n%%EOF\n')
  })
  await page
    .getByRole('button', { name: 'Save and add another', exact: true })
    .click()
}

// ---------------------------------------------------------------------------

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(async () => {
  record.write()
})

test('the transport and documents slice, on a commercial transporter', async ({
  page
}) => {
  const journeyId = await startJourney(page)
  const at = (slug) => `/notifications/${journeyId}/${slug}`

  // --- arrival details ----------------------------------------------------
  // The URL and the screen id disagree: the source names the template for what
  // it collects (port of entry), the corpus names the screen for what the user
  // sees (arrival details). Recorded under the corpus name.
  await page.goto(at('port-of-entry'))
  await expect(page).toHaveURL(/\/port-of-entry$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Arrival details'
  )
  await shoot(page, 'arrival-details')

  // THE ONE KNOWINGLY VOLATILE PICTURE IN THIS SLICE — opened deliberately.
  //
  // The calendar is the only conditional surface this page has: port-of-entry
  // .njk declares no govukRadios conditional reveal at all, so there is nothing
  // else here to open. DR1 carries the equivalent state, so the comparison
  // needs a picture of it.
  //
  // Open, the grid is clock-derived through and through: the month drawn, the
  // cell marked as today, and which cells sit outside the arrival window and
  // come back disabled. This shot will therefore move whenever a capture
  // crosses a day or a month boundary. It is NOT masked, because the month, the
  // today marker and the disabled range are the whole of what a designer would
  // compare here — masking them would leave a picture of an empty box. The
  // cheaper half of the problem is fixed instead: the window dates the page
  // prints in words are masked on every shot (see `maskArrivalWindow`), so this
  // is the only picture in the slice that moves.
  //
  // A note for whoever writes the findings: the grid is built at page load and
  // sits in the DOM whether the dialog is open or shut — 44 day buttons carrying
  // a `data-testid` of their real date — so it is in the rendered HTML of every
  // page with a date picker, including the documents page. Closed it draws no
  // pixels, so it moves no picture. It is also what makes "a button inside the
  // date picker" resolve to 49 elements; the toggle is addressed by its
  // accessible name instead.
  const datePickerToggle = page.getByRole('button', { name: 'Choose date' })
  await expect(datePickerToggle).toBeVisible()
  await datePickerToggle.click()
  const openDialog = page.locator('.moj-datepicker__dialog--open')
  await expect(openDialog).toBeVisible()
  await shoot(page, 'arrival-details-date-picker')
  // Closed through the widget's own Close button rather than Escape: the
  // dialog overlays the radios below it, and a stray open dialog would
  // intercept the clicks that follow.
  await page.locator('.moj-js-datepicker-cancel').click()
  await expect(openDialog).toBeHidden()

  await fillArrivalDetails(page)
  await saveAndContinue(page)

  // --- transit countries --------------------------------------------------
  // ROAD_VEHICLE put `transitedCountries` in scope, so the forward path from
  // arrival details lands here rather than skipping to the transporter pages.
  await expect(page).toHaveURL(/\/transit-countries$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Which countries will the consignment travel through?'
  )
  await shoot(page, 'transit-countries')

  // Continuing with nothing ticked is a real error here: the controller's own
  // `transitedCountriesErrors` rejects an empty selection before validation
  // runs (transit-countries.controller.js).
  await saveAndContinue(page)
  await expect(page.locator('.govuk-error-summary')).toBeVisible()
  await shoot(page, 'transit-countries-error')

  for (const country of TRANSIT_COUNTRIES) {
    await optionByValue(page, 'transitedCountries', country).check()
  }
  await saveAndContinue(page)
  await expect(page).toHaveURL(/\/transporters$/)

  // The selected state is shot after a round trip to the server, not straight
  // after ticking the boxes: `checked` is a DOM property and is not reflected
  // into the attribute, so a shot taken client-side would pair a screenshot of
  // ticked boxes with rendered HTML showing them all clear. Coming back from
  // the server gives a screenshot and a DOM that agree.
  await page.goto(at('transit-countries'))
  await expect(
    optionByValue(page, 'transitedCountries', TRANSIT_COUNTRIES[0])
  ).toBeChecked()
  await shoot(page, 'transit-countries-selected')

  // --- transporter type ---------------------------------------------------
  await page.goto(at('transporters'))
  await expect(page).toHaveURL(/\/transporters$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'What type of transporter will move the animals?'
  )
  await shoot(page, 'transporter-type')

  // No validation error state is recorded for this page, and none is missing.
  // `transporters.controller.js` validates transporterType with the permissive
  // `oneOf`, which lib/validate/validators.js builds as
  // `.allow('').valid('', ...values)` — and with no radio ticked the key is
  // absent from the payload altogether. Continuing without answering therefore
  // commits an empty answer and moves on; it raises nothing to photograph. The
  // same is true of the commercial transporter page below.

  await optionByValue(page, 'transporterType', 'Commercial').check()
  await saveAndContinue(page)

  // --- commercial transporter ---------------------------------------------
  // This landing is the branch deciding: `commercialTransporter` is in scope
  // only while transporterType is Commercial (obligations/sections/
  // transport.js), so flow/navigation.js `nextInSection` walks past this page
  // when it is not, and stops on it when it is.
  await expect(page).toHaveURL(/\/transporters\/select$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Search for an approved commercial transporter'
  )
  await shoot(page, 'transporter-commercial')

  // --- documents ----------------------------------------------------------
  // The same controller also serves a status fragment and a file download
  // (documents/controller.js). Neither is a screen and neither is recorded.
  await page.goto(at('accompanying-documents'))
  await expect(page).toHaveURL(/\/accompanying-documents$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Upload documents'
  )
  await shoot(page, 'documents')

  await page
    .getByRole('button', { name: 'Save and add another', exact: true })
    .click()
  await expect(page.locator('.govuk-error-summary')).toBeVisible()
  await shoot(page, 'documents-error')

  await addDocument(page, {
    reference: 'GBHC1234567890',
    filename: 'veterinary-health-certificate.pdf'
  })
  await expect(page.locator('#documents-added')).toBeVisible()

  // A freshly uploaded file is PENDING until something asks the upload service
  // to refresh (services/document-uploads/stub.js). The page's own refresh URL
  // is `?attempt=N` — view-model/refresh.js — and the GET handler refreshes
  // whenever attempt > 0 (handlers/load-page.js). Going there directly settles
  // the scan server-side, which is what the "Refresh virus scan status" link
  // does, and gives a settled populated table that does not depend on the
  // client poll having run.
  await page.goto(`${at('accompanying-documents')}?attempt=1`)
  await expect(page.locator('#documents-added')).toBeVisible()
  // The scan status is addressed by the attribute the row carries for the
  // client poll (documents/view-model/rows.js `statusCell`), not by the tag's
  // visible words.
  await expect(page.locator('[data-scan-status="COMPLETE"]')).toBeVisible()
  await shoot(page, 'documents-populated')

  // The stub holds any filename matching /never-scans/i at PENDING forever, so
  // this is the checking state without a race: the server renders the Checking
  // tag and the refresh fallback on load, and the client poll can never settle
  // it. Shot straight away — the client only unhides its "still checking" hint
  // after ten polls, thirty seconds out.
  await addDocument(page, {
    reference: 'GBHC0000000001',
    filename: 'never-scans.pdf'
  })
  await expect(page.locator('[data-scan-status="PENDING"]')).toBeVisible()
  await shoot(page, 'documents-scanning')
})

// A SECOND TEST, DELIBERATELY.
//
// Playwright's `page` fixture is test-scoped: this test gets a new browser
// context, an empty session and a brand new journey, and it drives itself from
// the dashboard again rather than continuing anything above. That is exactly
// what is wanted here. `commercialTransporter` and `privateTransporter` are
// mirror-image gates on the same answer (obligations/sections/transport.js), so
// one journey can only ever reach one of the two detail screens. Photographing
// both means two journeys.
test('the private transporter branch, in a journey of its own', async ({
  page
}) => {
  const journeyId = await startJourney(page)
  const at = (slug) => `/notifications/${journeyId}/${slug}`

  await page.goto(at('transporters'))
  await expect(page).toHaveURL(/\/transporters$/)
  await optionByValue(page, 'transporterType', 'Private').check()
  await saveAndContinue(page)

  // The mirror of the commercial landing: with Private answered,
  // `nextInSection` skips the commercial picker, whose obligation is now out of
  // scope, and stops here.
  await expect(page).toHaveURL(/\/transporters\/private$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Private transporter details'
  )
  await shoot(page, 'transporter-private')

  // Continuing with the form completely empty raises nothing here either:
  // `recordProvided` in private-transporter-details.controller.js only enforces
  // the mandatory fields once at least one field has been filled. Giving the
  // name alone is the cheapest way to the error state the page really has.
  await page.locator('#nameOrOrganisationName').fill('A Nother Haulage')
  await saveAndContinue(page)
  await expect(page.locator('.govuk-error-summary')).toBeVisible()
  await shoot(page, 'transporter-private-error')
})
