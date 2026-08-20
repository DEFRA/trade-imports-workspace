//
// Design Release 1 — transport and documents slice.
//
// Seven screens, in journey order:
//
//   /arrival-details            dr1-arrival-details
//   /transit-countries          dr1-transit-countries
//   /transporter                dr1-transporter
//   /transporter/add            dr1-transporter-add
//   /transporter/add/private    dr1-transporter-add-private
//   /transporter/add/commercial dr1-transporter-add-commercial
//   /upload-documents           dr1-upload-documents
//
// DR1 is the ROOT mount of the prototype's single router (app/routes.js:7 builds
// one router; routes.js:10994-10997 copies the whole stack under
// /design-release-2, /design-release-2.1 and /testing). Every path below is
// therefore unprefixed, and the views being photographed are the loose .html
// files at the root of app/views. A picture taken under a release prefix is a
// picture of a different application.
//
// This is a requirements-gathering tool, not a test. Nothing below asserts that
// the prototype is correct — the assertions exist only to prove that each
// picture is of the page and the state its name claims.
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

//
// The arrival date has a moving window, so it is derived and never typed as a
// literal.
//
// app/routes.js:3927-3937 (getArrivalDatePickerBounds) builds the window from
// `new Date()`: minimum is today minus 7 days, maximum is today plus 6 months,
// each formatted by formatArrivalPickerDate (routes.js:3919) as d/m/yyyy with no
// leading zeros. routes.js:3951-3963 (isArrivalDateWithinAllowedRange) rejects
// anything outside it. A hardcoded date therefore passes today and fails
// silently in three weeks, which is why this is computed per run.
//
// Today plus 14 days sits well inside the window at both ends.
//
const arrivalDateWithinWindow = () => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 14)

  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

//
// MASK — the arrival date picker's window bounds.
//
// partials/arrival-date-picker.html passes arrivalDateMinDate/arrivalDateMaxDate
// into mojDatePicker, which renders them as data-min-date and data-max-date on
// the wrapper div (@ministryofjustice/frontend .../date-picker/template.njk).
// Both move every day, so the rendered HTML this capture writes out would differ
// between two runs of an unchanged page. They are replaced with stable sentinels
// before every arrival-details picture; the rule they encode is documented above
// and cited to source, so nothing is lost by not carrying the day's values.
//
// The attributes are read once when the component initialises, so rewriting them
// afterwards does not change what the picker does.
//
const maskArrivalDateWindow = async (page) => {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('[data-min-date]')) {
      el.setAttribute('data-min-date', 'MASKED-MIN-DATE')
    }
    for (const el of document.querySelectorAll('[data-max-date]')) {
      el.setAttribute('data-max-date', 'MASKED-MAX-DATE')
    }
  })
}

//
// MASK — the uploaded document's id.
//
// routes.js:9161 mints it as `doc-${Date.now()}-${n}`, and it reaches the DOM
// twice per row: as data-document-id on the status tag, and inside the Remove
// button's value ("remove:<id>"). It is different on every run, so it is
// replaced with a stable sentinel before each picture of a populated table.
//
const maskUploadedDocumentIds = async (page) => {
  await page.evaluate(() => {
    document.querySelectorAll('[data-document-id]').forEach((el, index) => {
      el.setAttribute('data-document-id', `doc-MASKED-${index + 1}`)
    })
    document.querySelectorAll('button[value^="remove:doc-"]').forEach((el, index) => {
      el.setAttribute('value', `remove:doc-MASKED-${index + 1}`)
    })
  })
}

// One test for the whole slice.
//
// Playwright's page fixture is test-scoped, so a second test() would get a fresh
// browser context and an empty prototype session — and this slice is a chain:
// /transit-countries is only served when the session's means of transport is
// Railway or Road Vehicle (routes.js:3882-3889, requiresTransitCountries at
// routes.js:1902), and the two transporter detail pages are only served when the
// session carries the matching transporterAddType (routes.js:3014).
test('the transport and documents slice', async ({ page }) => {
  // The GOV.UK Prototype Kit bounces nodemon while it recompiles, so the first
  // navigation can meet a server that is restarting.
  await expect(async () => {
    await page.goto('/arrival-details', { waitUntil: 'domcontentloaded' })
    await expect(
      page.getByRole('heading', { level: 1, name: 'Arrival details' })
    ).toBeVisible({ timeout: 5_000 })
  }).toPass({ timeout: 240_000 })

  // ------------------------------------------------------------------
  // /arrival-details
  // ------------------------------------------------------------------
  await expect(page).toHaveURL(/\/arrival-details$/)

  // Empty, before anything is typed into it. Nothing on this page is minted per
  // run except the date picker's window bounds, masked here; the notification
  // reference is the fixed literal at routes.js:55.
  await maskArrivalDateWindow(page)
  await record.record(page, 'arrival-details')

  // STATE — the date picker open.
  //
  // The arrival date is a MoJ date picker (partials/arrival-date-picker.html),
  // and its calendar is a dialog the component builds in the browser and reveals
  // on the toggle button. Closed, the picture shows only an input; the calendar
  // is where the design's date-choosing behaviour actually lives, so it earns a
  // second picture.
  //
  // Shot with the input still empty, which is the state a user meets it in. That
  // also means no date this spec derived reaches any picture.
  //
  // The calendar's month heading and day numbers are computed from the run date
  // by the MoJ component, so THIS ONE PICTURE moves day to day. It is left
  // unmasked deliberately: the grid is a fixed 6x7 table
  // (date-picker.mjs createCalendar), so its structure is stable and only its
  // digits move, and faking the digits would produce a calendar that contradicts
  // its own highlighted "today". A reader comparing date-picker behaviour needs
  // a real calendar more than a frozen one.
  await page.locator('.app-arrival-details-page__date .moj-js-datepicker-toggle').click()
  await expect(page.locator('.app-arrival-details-page__date .moj-datepicker__dialog')).toBeVisible()
  await maskArrivalDateWindow(page)
  await record.record(page, 'arrival-details-datepicker-open')

  // Dismiss with Escape, and type into the input rather than driving the
  // calendar.
  await page.keyboard.press('Escape')
  await expect(page.locator('.app-arrival-details-page__date .moj-datepicker__dialog')).toBeHidden()

  // Port of entry is a search widget: what it posts is the hidden
  // input.app-airport-search__value, not the visible search box
  // (arrival-details.html:100-106, app/assets/javascripts/airport-search.js).
  // Choose by the option's value, not by its visible text.
  await page.locator('#port-of-entry').fill('Heathrow')
  const portResults = page.locator('#port-search-results')
  await expect(portResults).toBeVisible()
  await portResults.locator('[data-option="London Heathrow - LHR"]').click()

  // Selecting closes the results panel (selectOption -> closeResults in
  // airport-search.js). Prove the panel is gone before touching the buttons —
  // an open panel overlays them and swallows the mousedown — and prove the
  // hidden field carries a value, since that is the only thing the POST sees.
  await expect(portResults).toBeHidden()
  await expect(page.locator('input.app-airport-search__value')).not.toHaveValue('')

  await page.locator('#arrival-date-at-port').fill(arrivalDateWithinWindow())
  await page.keyboard.press('Escape')

  // Road Vehicle is one of the two means of transport that make DR1 ask for
  // transit countries (TRANSIT_MEANS_OF_TRANSPORT, routes.js:49). Selected by
  // value.
  await page.locator('#means-of-transport').selectOption('Road Vehicle')
  await page.locator('#transport-identification').fill('AB12 CDE')
  await page.locator('#transport-document-reference').fill('CMR-000123')

  await page.getByRole('button', { name: 'Save and continue' }).click()

  // ------------------------------------------------------------------
  // /transit-countries
  // ------------------------------------------------------------------
  await expect(page).toHaveURL(/\/transit-countries$/)
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Which countries will the consignment travel through?'
    })
  ).toBeVisible()
  await record.record(page, 'transit-countries')

  // STATE — countries chosen and listed.
  //
  // The selected-countries table is hidden until something is chosen
  // (transit-countries.html:119-124), so the default picture shows none of the
  // list, the remove links or the row layout the design defines. Two countries
  // rather than one, so the picture shows how repeated rows sit together.
  const transitSearch = page.locator('#transit-country-search')
  const transitResults = page.locator('#transit-country-search-results')

  // Chosen by value (the data-country attribute), not by visible text: this list
  // carries entries like "Guadeloupe (France)" and "Netherlands (the)" that a
  // name-matched locator trips over. The widget needs three characters before it
  // will search (MIN_SEARCH_LENGTH, transit-country-search.js).
  for (const country of ['France', 'Germany']) {
    await transitSearch.fill(country.slice(0, 4))
    await expect(transitResults).toBeVisible()
    await transitResults.locator(`[data-country="${country}"]`).click()
    // Choosing clears the search box and closes the panel (addCountry ->
    // clearSearch), so the buttons below are reachable again.
    await expect(transitResults).toBeHidden()
  }

  // The hidden field is seeded with the literal "[]" the moment the widget
  // initialises (syncValueInput runs at init), so "not empty" is true before
  // anything is chosen. Assert against the seed as well as the blank.
  await expect(page.locator('input.app-transit-country-search__value')).not.toHaveValue(/^(\[\])?$/)
  await expect(page.locator('#transit-countries-selected-rows > *')).toHaveCount(2)
  await record.record(page, 'transit-countries-selected')

  await page.getByRole('button', { name: 'Save and continue' }).click()

  // ------------------------------------------------------------------
  // /transporter
  // ------------------------------------------------------------------
  await expect(page).toHaveURL(/\/transporter$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Transporter details' })
  ).toBeVisible()
  await record.record(page, 'transporter')

  // STATE — the list filtered by a search term.
  //
  // The search box on this page is not the hidden-input widget the port field
  // uses. It is a live row filter: transporter-search.js hides table rows whose
  // data-search-text does not contain the query, with no results panel and no
  // POST. A filtered table is a distinct thing the design defines, so it earns
  // its own picture.
  const transporterRows = page.locator('[data-transporter-row]')
  const totalTransporterRows = await transporterRows.count()

  await page.locator('#transporter-search').fill('Aberdeen')
  const visibleTransporterRows = page.locator('[data-transporter-row]:not([hidden])')
  await expect(visibleTransporterRows).not.toHaveCount(totalTransporterRows)
  await expect(visibleTransporterRows).not.toHaveCount(0)
  await record.record(page, 'transporter-results')

  // Clear the filter before going anywhere near the radios. A live row filter
  // will hide the row this spec is about to select.
  await page.locator('#transporter-search').fill('')
  await expect(visibleTransporterRows).toHaveCount(totalTransporterRows)

  // ------------------------------------------------------------------
  // /transporter/add
  // ------------------------------------------------------------------
  await page.getByRole('button', { name: 'Add a transporter' }).click()
  await expect(page).toHaveURL(/\/transporter\/add$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Choose a transporter type' })
  ).toBeVisible()

  // Empty, with neither radio chosen — this is the first visit, so nothing is
  // pre-selected from the session (renderTransporterAddPage, routes.js:2966).
  await record.record(page, 'transporter-add')

  // ------------------------------------------------------------------
  // /transporter/add/private
  // ------------------------------------------------------------------
  //
  // Both detail pages sit behind redirectIfTransporterAddTypeNot
  // (routes.js:3014), which compares the requested type against the single
  // session value transporterAddType and redirects back to /transporter/add on a
  // mismatch. So only one of the two is reachable at any moment.
  //
  // They are photographed by answering /transporter/add twice in this one
  // session rather than by adding a second test(). A second test() would get a
  // fresh context, and reaching this page from an empty session means walking
  // the whole slice again — more machinery, and a second journey whose earlier
  // pages differ from the ones already photographed. Changing the answer is also
  // what the application itself supports: the POST simply overwrites
  // transporterAddType (routes.js:10589), which is exactly what a user who
  // picked the wrong type would do.
  await page.locator('#transporter-type-private').check()
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page).toHaveURL(/\/transporter\/add\/private$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Add private transporter' })
  ).toBeVisible()
  await record.record(page, 'transporter-add-private')

  // ------------------------------------------------------------------
  // /transporter/add/commercial
  // ------------------------------------------------------------------
  //
  // Back to the type question to change the answer. A direct GET, because
  // /transporter/add carries no journey guard of its own (routes.js:10572) and
  // the private page's own back link is not the route under test here. The radio
  // now renders with "private" pre-selected from the session; that is why the
  // picture of /transporter/add was taken on the first visit and is not retaken.
  await page.goto('/transporter/add')
  await expect(page).toHaveURL(/\/transporter\/add$/)
  await page.locator('#transporter-type-commercial').check()
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page).toHaveURL(/\/transporter\/add\/commercial$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Add commercial transporter' })
  ).toBeVisible()

  // The authorisation banner (partials/transporter-authorisation-banner.html,
  // included at transporter-add-commercial.html:43) is the thing that makes this
  // page different from the private one, so prove it is on screen before the
  // shutter. It sits above the form, so the full-page shot carries it.
  await expect(
    page.locator('.app-transporter-authorisation-banner')
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Help with transporter authorisation' })
  ).toBeVisible()
  await record.record(page, 'transporter-add-commercial')

  // ------------------------------------------------------------------
  // /upload-documents
  // ------------------------------------------------------------------
  //
  // Back to the transporter list to answer it and continue down the journey.
  // Neither add form is submitted: submitting one would push a session-owned
  // transporter into the list (saveAddedTransporter, routes.js:10648) and change
  // the very table already photographed above.
  await page.goto('/transporter')
  await expect(page).toHaveURL(/\/transporter$/)

  // Select by value. The radio value is the transporter's fixture id
  // (app/data/transporters.js), which is stable; the visible name is not what
  // the POST reads.
  await page.locator('input[name="transporterId"][value="aberdeen-livestock"]').check()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  await expect(page).toHaveURL(/\/upload-documents$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Upload documents' })
  ).toBeVisible()

  // Empty, under the page's own name. On first arrival there are no uploaded
  // documents and the saved-documents table is not rendered at all
  // (upload-documents.html:187), so this picture IS the empty state; a separate
  // "upload-documents-empty" would be the same pixels under a second name.
  await record.record(page, 'upload-documents')

  // STATE — the whole card in error.
  //
  // "Save and add another" with nothing filled fails all four field validations
  // at once (validateUploadDocument, routes.js:9101-9155): document reference,
  // document type, date of issue and attachment. One click reaches the error
  // summary and every inline error message the design defines for this card,
  // which is why this state is worth a picture and the fifteen-file maximum
  // (routes.js:9106) is not — that one needs fifteen successful uploads first.
  await page.getByRole('button', { name: 'Save and add another' }).click()
  await expect(page).toHaveURL(/\/upload-documents$/)
  await expect(page.locator('.govuk-error-summary')).toBeVisible()
  await expect(page.locator('.govuk-error-summary a')).not.toHaveCount(0)
  await record.record(page, 'upload-documents-errors')

  // STATE — a document saved and still being scanned.
  //
  // A saved document starts at virusStatus "uploading" and renders a blue
  // "Scanning for virus" tag (routes.js:9082-9084). The browser then waits 2.5
  // seconds and POSTs /upload-documents/virus-check/<id>, which flips it to a
  // green "Check completed" (upload-documents-virus-check.js).
  //
  // Holding that POST off makes the scanning picture deterministic instead of a
  // race against a 2.5 second timer. It changes nothing the server renders — the
  // session's status genuinely is "uploading" until that POST arrives — it only
  // stops the page advancing itself out of the state while the camera is open.
  await page.route('**/upload-documents/virus-check/**', (route) => route.abort())

  await page.locator('#document-reference').fill('ITAHC-000123')
  // Selected by value: the option text is the long
  // "Intra Trade Animal Health Certificate (ITAHC)" (routes.js:9016).
  await page.locator('#document-type').selectOption('itahc')

  // A fixed date, unlike the arrival date. Date of issue has no window: it is
  // validated only as a real d/m/yyyy date (routes.js:9132-9144), so a literal
  // cannot expire — and it is printed in the saved-documents table, so deriving
  // it from today would put a moving value into two pictures.
  await page.locator('#date-of-issue').fill('27/3/2026')
  await page.keyboard.press('Escape')

  // The form has no enctype, so the file itself is never posted; what the server
  // reads is the hidden attachmentFileName the browser fills in from the chosen
  // file (file-upload.js, upload-documents.html:180). Prove it landed.
  await page.locator('#attachment').setInputFiles({
    name: 'health-certificate.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 capture fixture')
  })
  await expect(page.locator('input[name="attachmentFileName"]')).toHaveValue('health-certificate.pdf')

  await page.getByRole('button', { name: 'Save and add another' }).click()
  await expect(page).toHaveURL(/\/upload-documents$/)

  const documentStatus = page.locator('.app-upload-documents-table__status')
  await expect(documentStatus).toHaveCount(1)
  await expect(documentStatus).toHaveAttribute('data-virus-status', 'uploading')
  await maskUploadedDocumentIds(page)
  await record.record(page, 'upload-documents-scanning')

  // STATE — a document saved and scanned.
  //
  // Let the virus check through. The first reload lets the browser make the POST
  // the abort was swallowing, which is what moves the session's own status to
  // "passed" (markUploadedDocumentVirusCheckPassed, routes.js:9172). The second
  // reload then renders that settled row from the template rather than from the
  // client-side tag rewrite, so the picture is of a page at rest.
  await page.unroute('**/upload-documents/virus-check/**')
  await page.reload()
  await expect(documentStatus).toHaveAttribute('data-virus-status', 'passed')
  await page.reload()
  await expect(page).toHaveURL(/\/upload-documents$/)
  await expect(documentStatus).toHaveAttribute('data-virus-status', 'passed')
  await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible()
  await maskUploadedDocumentIds(page)
  await record.record(page, 'upload-documents-populated')
})
