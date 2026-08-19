//
// Frontend slice: the accompanying-documents page, empty and with a document on
// it.
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// frontend is correct. Every step does assert that the journey landed where it
// should, because a mislabelled capture is worse than a missing one.
//
// It borrows nothing from the frontend repo. Every selector is re-derived from
// the template, the copy file and the upload stub, in the open.
//
import { readFileSync } from 'node:fs'

const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

const COUNTRY_CODE = 'FR'
const SPECIES = 'Bos taurus'

const DOCUMENT_REFERENCE = 'GBHC1234567890'

// The date of issue has no accepted window — unlike the arrival date, its
// validator is built with neither a min nor a max — so a fixed value is safe
// and keeps two runs at one commit producing the same bytes.
const DOCUMENT_DATE_OF_ISSUE = '12/12/2025'

// The trader never chooses a document type: it is derived from the filename by
// matching the type enum's words against it, and anything that matches nothing
// files itself as "Other". A file called something like `test.pdf` would give a
// populated capture whose type column reads Other, which is a picture of the
// harness rather than of the service.
//
// Two names are also reserved by the upload stub: anything matching /virus/i
// comes back rejected, and anything matching /never-scans/i never settles.
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

// Origin and a species: both are "enforced at continue", so until they are
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
  await page.getByRole('checkbox', { name: SPECIES }).check()
  await saveAndContinue(page)
  await expect(page).toHaveURL(/\/consignment-details$/)
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
  await expect(page).toHaveURL(/\/accompanying-documents$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Upload documents'
  )

  await expect(
    page.getByText('You have not added any documents yet.'),
    'a fresh notification should have no documents listed'
  ).toBeVisible()

  await record.record(page, 'documents-empty')

  await page.getByLabel('Document reference').fill(DOCUMENT_REFERENCE)
  await page.getByLabel('Date of issue').fill(DOCUMENT_DATE_OF_ISSUE)
  await page.getByLabel('Upload a file').setInputFiles({
    name: DOCUMENT_FILENAME,
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 capture placeholder')
  })

  // "Save and add another" is the only control that adds a document. The
  // primary button on this page is "Continue", and it saves nothing at all —
  // it only advances — so pressing it here would leave the page still empty and
  // the populated capture would be of the empty state under the wrong name.
  await page.getByRole('button', { name: 'Save and add another' }).click()

  await expect(
    page,
    'adding a document should return to the same page with the form cleared'
  ).toHaveURL(/\/accompanying-documents$/)

  const row = page.locator('.govuk-table__row', {
    hasText: DOCUMENT_REFERENCE
  })
  await expect(row, 'the document just added should be listed').toHaveCount(1)

  // The upload stub reports a scan as PENDING until something asks it to
  // refresh, so the row first renders with a "Checking" tag and the page's own
  // poller then settles it and reloads. Photographing before that lands gives a
  // transient state that differs from run to run — and, worse, one that reads
  // as a service that never finishes scanning.
  await expect(
    row.getByText('Safe'),
    'the scan should settle before the row is photographed'
  ).toBeVisible({ timeout: 60_000 })

  await record.record(page, 'documents-populated')
})
