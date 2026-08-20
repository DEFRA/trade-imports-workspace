//
// Frontend slice: the accompanying-documents page, empty and with one document
// on it.
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// frontend is correct. Every step does assert that the journey landed where it
// should, because a picture filed under the wrong name is worse than a missing
// one: every ruling downstream rests on the picture being of what it claims.
//
// It borrows nothing from the frontend repo — no journey driver, no fixture, no
// page object. Every selector below is re-derived from the template, the copy
// file, the add-form validators and the upload stub, in the open.
//
// The empty page is photographed before anything is typed into it. The
// populated one is a named STATE of the same page, which is why it is allowed
// to carry an answer at all: `-populated` says so in the screen id.
//
// Screens recorded here:
//   documents-empty, documents-populated
//
import { readFileSync } from 'node:fs'

const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

const COUNTRY_CODE = 'FR'
const SPECIES = 'Bos taurus'

const DOCUMENT_REFERENCE = 'GBHC1234567890'

// A fixed date is safe HERE, and this is the one place in the frontend where
// that is worth saying out loud. The arrival date on the transport slice is
// range-checked against a window computed from `new Date()`, so a literal there
// expires by itself; this validator is built with neither a min nor a max, so
// the date of issue is only ever checked for being a real calendar date. A
// literal cannot silently fall out of a window that does not exist.
const DOCUMENT_DATE_OF_ISSUE = '12/12/2025'

// The trader never chooses a document type. It is derived from the filename by
// matching the type enum's words against it, longest match winning, and
// anything matching nothing files itself as "Other". A file called `test.pdf`
// would give a populated capture whose type column reads Other, which is a
// picture of the harness rather than of the service. This name derives
// "Veterinary health certificate".
//
// Two names are reserved by the upload stub and must be avoided: anything
// matching /virus/i comes back rejected, and anything matching /never-scans/i
// never settles.
const DOCUMENT_FILENAME = 'veterinary-health-certificate.pdf'

const saveAndContinue = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

const hubPath = (page) => {
  const found = new URL(page.url()).pathname.match(/^\/notifications\/[^/]+/)
  if (!found) {
    throw new Error(`Not inside a notification: ${page.url()}`)
  }
  return found[0]
}

const openHub = async (page) => {
  await page.goto(hubPath(page))
  await expect(
    page.getByRole('heading', { level: 1 }),
    'the hub should render its task list'
  ).toHaveText('Overview')
}

// Auth is enforced even in stub mode; only the Defra ID round-trip is replaced.
// An unauthenticated request is bounced through /auth/sign-in, which mints a
// locally signed session and returns — this assertion proves it did.
const startNotification = async (page) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1 }),
    'the dashboard should render, which means stub sign-in completed'
  ).toHaveText('Import notification service')
  await page.getByRole('button', { name: 'Start a new notification' }).click()
  await expect(
    page,
    'starting a notification should open the origin page'
  ).toHaveURL(/\/notifications\/[^/]+\/origin$/)
}

// Origin and a species: both are enforced at continue, so until they are
// answered every later task row is blocked and renders no link to follow.
const unlockTheHub = async (page) => {
  await startNotification(page)
  await page.locator('#countryOfOrigin').selectOption(COUNTRY_CODE)
  await page
    .locator('input[name="regionOfOriginCodeRequirement"][value="no"]')
    .check()
  await saveAndContinue(page)

  await expect(page, 'origin should hand over to the commodity page').toHaveURL(
    /\/commodities$/
  )
  await page.getByRole('checkbox', { name: SPECIES, exact: true }).check()
  await saveAndContinue(page)
  await expect(
    page,
    'a chosen species should open the consignment-details page'
  ).toHaveURL(/\/consignment-details$/)
}

const documentRow = (page) =>
  page.locator('.govuk-table__row', { hasText: DOCUMENT_REFERENCE })

// There is no search widget on this page — the reference is a plain text input,
// the type is derived rather than picked, and the only enhanced control is the
// date of issue, a dd/mm/yyyy text input with a calendar dialog attached. The
// dialog starts hidden and opens only from its own toggle, so nothing here has
// to dismiss it; what does matter is that the enhancement has run before the
// shot, because the unenhanced field has no calendar button and is a different
// picture from the one a user meets.
const expectAddFormReady = async (page) => {
  await expect(
    page.getByRole('button', { name: 'Choose date' }),
    'the date picker should have been enhanced before the page is photographed'
  ).toBeVisible()
  await expect(
    page.locator('#accompanyingDocumentReference'),
    'this screen is photographed empty, so the reference should be blank'
  ).toHaveValue('')
  await expect(
    page.locator('#accompanyingDocumentDateOfIssue'),
    'this screen is photographed empty, so the date of issue should be blank'
  ).toHaveValue('')
}

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(() => {
  record.write()
})

test('records the documents page with nothing uploaded, and with one document', async ({
  page
}) => {
  await unlockTheHub(page)
  await openHub(page)

  // The hub row is "Uploaded documents" and the page calls itself "Upload
  // documents". Both are asserted: a locator built from the wrong half of that
  // pair fails in a way that reads as a missing page rather than a wrong name.
  await page.getByRole('link', { name: 'Uploaded documents' }).click()
  await expect(
    page,
    'the Uploaded documents row should open the accompanying-documents page'
  ).toHaveURL(/\/accompanying-documents$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Upload documents'
  )

  await expect(
    page.getByText('You have not added any documents yet.'),
    'a fresh notification should say it has no documents'
  ).toBeVisible()
  await expect(
    page.locator('#documents-added'),
    'a fresh notification should render no documents table at all'
  ).toHaveCount(0)
  await expectAddFormReady(page)

  // Twice, from the one render. `documents-empty` is the state other findings
  // are written against; `documents` is the page under the name the enumerator
  // gives it, and the empty form is the screen the design defines — nothing
  // typed, no document added — so it is the render the bare name belongs to.
  await record.record(page, 'documents')
  await record.record(page, 'documents-empty')

  await page.getByLabel('Document reference').fill(DOCUMENT_REFERENCE)
  await page.getByLabel('Date of issue').fill(DOCUMENT_DATE_OF_ISSUE)
  await page.getByLabel('Upload a file').setInputFiles({
    name: DOCUMENT_FILENAME,
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 capture placeholder')
  })

  // "Save and add another" is the only control that adds a document. The
  // primary button on this page is "Continue", and it saves nothing at all — it
  // only advances — so pressing it here would leave the page still empty and
  // the populated capture would be of the empty state under the wrong name.
  await page.getByRole('button', { name: 'Save and add another' }).click()

  await expect(
    page,
    'adding a document should return to the same page with the form cleared'
  ).toHaveURL(/\/accompanying-documents$/)
  await expect(
    documentRow(page),
    'the document just added should be listed'
  ).toHaveCount(1)

  // The upload stub reports every new upload as PENDING until something asks it
  // to refresh, so the row first renders with a blue "Checking" tag. The page's
  // own poller then asks, the status settles, and the poller replaces the whole
  // page with a fresh server render at `?attempt=1`.
  //
  // Waiting on that navigation rather than on the tag is what keeps the picture
  // honest. The tag is rewritten in the DOM a beat BEFORE the poller navigates
  // away, so a shot taken the moment "Safe" appears is a shot taken into a
  // navigation, and it also captures a page still carrying the refresh
  // fallback link that the settled render drops. Waiting for the settled URL
  // photographs a page that is finished moving.
  await expect(
    page,
    'the scan poller should settle the status and re-render from the server'
  ).toHaveURL(/\/accompanying-documents\?attempt=1$/, { timeout: 60_000 })

  await expect(
    documentRow(page).getByText('Safe', { exact: true }),
    'the settled render should show the scan as safe'
  ).toBeVisible()
  await expect(
    page.locator('#js-refresh-fallback'),
    'a settled page offers no refresh link, and the picture should show none'
  ).toHaveCount(0)

  await record.record(page, 'documents-populated')
})
