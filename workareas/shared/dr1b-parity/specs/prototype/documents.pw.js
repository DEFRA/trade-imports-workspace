//
// DR1 slice: upload documents, in every state that one page can reach.
//
// A requirements-gathering spec, not a test. Nothing here asserts the prototype
// is correct. Every step does assert the page reached the state the capture is
// about to be named after, because a mislabelled picture is worse than a missing
// one — and this page has seven states that differ by a single tag or a single
// line of an error summary, which is exactly the kind of difference a
// mislabelled shot hides. The states are also where the requirement lives: the
// empty page says almost nothing, and the rules — every field mandatory once you
// save a row, three fields mandatory once you pick a type, fifteen files, a
// virus check between saving and being usable — are only ever stated by the page
// being in one of them.
//
// DR1 is the ROOT mount. There is no /design-release-1: app/routes.js builds one
// router, mounts it at root and re-mounts it under /design-release-2 and
// /design-release-2.1. The root mount is DR1 and app/views/upload-documents.html
// is the view it renders; the release subfolders under app/views are later
// releases and are not on trial here.
//
// It borrows nothing from the prototype. The retired harness required the
// prototype's own journey-demo/e2e helpers; that suite is unmaintained, and a
// capture built on a test nobody runs is hostage to it. The widget handling is
// here, in the open.
//
// This slice owns dr1-upload-documents and its six states. Any spec that walks
// THROUGH /upload-documents on its way to the review page must pass through
// without recording it, or two specs photograph one screen in two different
// states and the corpus cannot say which one DR1 actually shows.
//
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// A spec imports exactly one thing. It lives in the corpus workarea, outside any
// package, so a bare specifier resolves to nothing here — tim hands every spec
// the absolute path to one module that carries what it needs, Playwright's own
// test and expect included. That path arrives in the capture context, along with
// every other path a spec must not guess.
const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

// The one document type DR1 adds on top of the list every release shares, and
// the type the page's own intro copy is written around ("You must attach an
// ITAHC if this consignment requires one"). The label is worth asserting: the
// same 'itahc' value reads "Health certificate" under the testing session and
// "Intra Trade Animal Health Certificate (ITAHC)" here, so it is the visible
// difference between the two.
const DOCUMENT = {
  reference: 'ITAHC-2026-0001',
  type: 'itahc',
  typeLabel: 'Intra Trade Animal Health Certificate (ITAHC)',
  // Unlike the arrival date, the date of issue has no allowed window: the
  // handler only checks it parses as a real d/m/yyyy. So a fixed date is safe
  // here and keeps the capture byte-stable, where arrival-details cannot be.
  dateOfIssue: '27/3/2026',
  fileName: 'itahc-certificate.pdf'
}

// The cap the page's own copy promises ("up to a maximum of 15 files"), and the
// value of MAX_UPLOADED_DOCUMENTS in routes.js. validateUploadDocument checks it
// ahead of every other rule and returns immediately, so the limit error is a
// state with nothing else in the summary — which is why it earns its own capture
// rather than a footnote on the populated one.
const MAX_DOCUMENTS = 15

const VIRUS_CHECK_ROUTE = '**/upload-documents/virus-check/**'

// The attachment is written to a real file on disk rather than referenced from
// either repository. A fixture borrowed from an application is a fixture that
// moves when somebody tidies that application up, and this corpus must not be
// hostage to either side's test data.
let attachmentDirectory
let attachmentPath

// The kit rewrites its shadow-nunjucks layouts and recompiles its Sass while the
// server is up, bouncing nodemon. A request landing in that window either
// refuses the connection or renders "Unable to call `govukPhaseBanner`" instead
// of the page. Re-request until it settles, rather than photograph the kit's own
// error page under a DR1 name.
//
// The hop through /create-notification is not an access requirement — GET
// /upload-documents carries no journey guard and opens on its own. It is there
// for the session: /create-notification wipes the notification, stamps a fresh
// reference and sets the status to Draft, so the status strip at the top of
// every capture below reads the same on every run, and the saved-documents table
// starts genuinely empty rather than holding whatever a previous test left.
const start = async (page) => {
  await expect(async () => {
    await page.goto('/create-notification')
    await expect(page, 'create-notification should open the journey').toHaveURL(
      /\/origin-of-the-import$/,
      { timeout: 5_000 }
    )

    await page.goto('/upload-documents')
    await expect(page, 'upload-documents should open without a journey guard')
      .toHaveURL(/\/upload-documents$/, { timeout: 5_000 })
    await expect(
      page.locator('main h1'),
      'upload-documents should render, not error'
    ).toHaveText(/upload documents/i, { timeout: 5_000 })
  }).toPass({ timeout: 240_000 })
}

// The form is not multipart — it has no enctype, and the handler reads the file
// name out of a hidden input rather than out of an upload. That hidden input is
// written by app/assets/javascripts/file-upload.js on the file input's change
// event, so if that asset has not loaded, choosing a file changes nothing the
// server will ever see: the submit is rejected with "Upload a document" and the
// capture is of an error state nobody asked for. Assert both the visible status
// and the field that actually posts, here, where the reason is obvious.
const chooseAttachment = async (page) => {
  await page.locator('#attachment').setInputFiles(attachmentPath)

  await expect(
    page.locator('.app-upload-documents-card__dropzone-status'),
    'choosing a file should replace "No file chosen" with the file name'
  ).toHaveText(DOCUMENT.fileName)
  await expect(
    page.locator('input[name="attachmentFileName"]'),
    'the upload module should have written the field that posts'
  ).toHaveValue(DOCUMENT.fileName)
}

// The MOJ picker builds its dialog hidden and opens it only from its own
// calendar button; it registers no listener on the input. So typing the date is
// the whole interaction, and nothing rewrites what was typed. Escape is pressed
// anyway, because a dialog left open overlays whatever control comes next.
//
// It does build a calendar for the CURRENT month at init whether or not the
// dialog is ever opened, and that calendar's <h2> — "August 2026" — sits inside
// main. So every model this page yields carries one heading that moves with the
// month, whatever date is typed. That is the picker's doing, not the capture's.
const fillDocumentForm = async (page, reference = DOCUMENT.reference) => {
  await page.locator('#document-reference').fill(reference)
  await page.locator('#document-type').selectOption(DOCUMENT.type)
  const date = page.locator('#date-of-issue')
  await date.fill(DOCUMENT.dateOfIssue)
  await date.press('Escape')
  await chooseAttachment(page)
}

// Unlike the transporter pages, both of this page's submits carry name="action",
// so each has a locator that can only mean one button. No accessible-name
// fallback, which on a page whose other submit reads "Save and return to
// overview" would be a quiet way to record the notification hub under a
// documents name.
const addAnother = (page) =>
  page.locator('button[name="action"][value="add-another"]').click()

const continueOn = (page) =>
  page.locator('button[name="action"][value="continue"]').click()

// A saved row arrives tagged "Scanning for virus", and
// upload-documents-virus-check.js clears it to "Check completed" from the
// browser 2,500ms later — a fixed-delay stub that always passes. Both are real
// states of this page, so both are captured, but racing a timer with the shutter
// lets the timing of the run decide what the picture shows.
//
// Holding the virus-check request pins the page in the state the SERVER
// rendered. The prototype's own script swallows the failure in a .catch, so
// nothing else on the page changes: this is the arriving state, held still, not
// an invented one.
const holdVirusCheck = (page) =>
  page.route(VIRUS_CHECK_ROUTE, (route) => route.abort())

const errorSummaryItems = (page) => page.locator('.govuk-error-summary__list li')

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.beforeAll(() => {
  attachmentDirectory = mkdtempSync(join(tmpdir(), 'dr1b-parity-documents-'))
  attachmentPath = join(attachmentDirectory, DOCUMENT.fileName)
  writeFileSync(attachmentPath, '%PDF-1.4 dr1b parity capture corpus\n')
})

test.afterAll(() => {
  // The manifest first. A spec that forgets record.write() photographs
  // everything and records nothing, and a failure tidying a temporary directory
  // must not be what costs the run its rows.
  record.write()
  rmSync(attachmentDirectory, { recursive: true, force: true })
})

test('records upload-documents empty, and with a document filled in but not yet saved', async ({
  page
}) => {
  await start(page)

  await expect(
    page.locator('.app-upload-documents-table'),
    'a fresh notification should render no saved-documents table'
  ).toHaveCount(0)

  const empty = await record.record(page, 'upload-documents')

  expect(empty.title, 'the screen should have a title to file it under').toBeTruthy()
  expect(
    empty.model.fields,
    'the empty page should still carry the document form'
  ).toBeGreaterThan(0)

  // Saving resets the form, so this is the only state in which the dropzone
  // shows a chosen file and the date picker shows a typed date. Without it the
  // corpus has no evidence of what the filled controls look like.
  await fillDocumentForm(page)

  await record.record(page, 'upload-documents-file-chosen')
})

test('records a saved document, both while it is scanning and once the check clears', async ({
  page
}) => {
  await start(page)
  await holdVirusCheck(page)
  await fillDocumentForm(page)
  await addAnother(page)

  await expect(page, 'save and add another should return to upload-documents')
    .toHaveURL(/\/upload-documents$/)

  const savedRows = page.locator('.app-upload-documents-table tbody tr')
  await expect(savedRows, 'the saved document should appear as one table row')
    .toHaveCount(1)
  await expect(savedRows.first()).toContainText(DOCUMENT.reference)
  await expect(savedRows.first()).toContainText(DOCUMENT.typeLabel)
  await expect(savedRows.first()).toContainText(DOCUMENT.dateOfIssue)

  const status = savedRows.first().locator('.app-upload-documents-table__status')
  await expect(status, 'a document arrives at the table still being scanned')
    .toHaveText('Scanning for virus')

  await record.record(page, 'upload-documents-populated-scanning')

  // Let the check through and re-render. The server still holds the document as
  // uploading — the earlier request never reached it — so the timer starts again
  // on load and this time completes, which is the state the page settles in and
  // the one a reviewer will meet.
  await page.unroute(VIRUS_CHECK_ROUTE)
  await page.reload()

  await expect(
    status,
    'the virus check should clear itself once its request reaches the server'
  ).toHaveText('Check completed', { timeout: 15_000 })

  const populated = await record.record(page, 'upload-documents-populated')

  expect(populated.title, 'the populated screen should have a title').toBeTruthy()
})

test('records the error state when a blank document is saved', async ({ page }) => {
  await start(page)

  // Every field of the card is mandatory once you ask to save a row, so an empty
  // "Save and add another" is the shortest route to the full summary.
  await addAnother(page)

  // The error render is a POST response, not a redirect, so the URL is the one
  // that was already there and cannot on its own prove the submit was answered.
  // Assert it anyway — the handler's other branches all redirect away, so this
  // rules them out — and then wait on the summary, which is what proves the page
  // re-rendered.
  await expect(page, 'a rejected save should re-render upload-documents in place')
    .toHaveURL(/\/upload-documents$/)
  await expect(
    page.locator('.govuk-error-summary'),
    'saving a blank card should be rejected'
  ).toBeVisible()

  // The count is what separates this capture from the soft-validation one below:
  // four problems means every field of the card was checked.
  await expect(
    errorSummaryItems(page),
    'a blank card should report every mandatory field'
  ).toHaveCount(4)

  await record.record(page, 'upload-documents-error')
})

test('records the soft-validation error raised by continuing with a part-filled document', async ({
  page
}) => {
  await start(page)

  // Uploads are optional — continuing with an untouched card leaves the page and
  // is not an error. Choosing a document type is what arms the check: from there
  // the rest of the card must be completed before the journey moves on. That
  // rule is invisible on the page, and this capture is the only evidence of it.
  await page.locator('#document-type').selectOption(DOCUMENT.type)
  await continueOn(page)

  await expect(page, 'a part-filled document should hold the journey here')
    .toHaveURL(/\/upload-documents$/)
  await expect(page.locator('.govuk-error-summary')).toBeVisible()

  // Three, not four: the type is the field that was answered, so it is the one
  // field the summary leaves out.
  await expect(
    errorSummaryItems(page),
    'the summary should name the three fields left blank'
  ).toHaveCount(3)
  await expect(
    page.locator('#document-type-error'),
    'the answered field should not be shown as in error'
  ).toHaveCount(0)

  await record.record(page, 'upload-documents-continue-error')
})

test('records the state at the 15-document limit the page promises', async ({
  page
}) => {
  await start(page)

  // Nothing in this test turns on the virus check, and fifteen live timers
  // firing during the fills would leave the tags in whatever state the run's
  // timing produced. Hold them all, so every row is captured as it arrived.
  await holdVirusCheck(page)

  for (let saved = 0; saved < MAX_DOCUMENTS; saved += 1) {
    await fillDocumentForm(page, `ITAHC-2026-${String(saved + 1).padStart(4, '0')}`)
    await addAnother(page)
    await expect(page).toHaveURL(/\/upload-documents$/)
    await expect(
      page.locator('.app-upload-documents-table tbody tr'),
      `document ${saved + 1} should have been saved`
    ).toHaveCount(saved + 1)
  }

  // The cap is checked before any field is, so a blank card is enough to reach
  // it — the page stops accepting documents rather than stopping the journey.
  await addAnother(page)

  await expect(page, 'a refused sixteenth document should re-render in place')
    .toHaveURL(/\/upload-documents$/)
  await expect(
    page.locator('.govuk-error-summary'),
    'a sixteenth document should be refused'
  ).toBeVisible()
  await expect(
    errorSummaryItems(page),
    'the cap is reported on its own, ahead of the field-by-field checks'
  ).toHaveCount(1)

  const limit = await record.record(page, 'upload-documents-limit-error')

  expect(limit.title, 'the limit screen should have a title').toBeTruthy()
})
