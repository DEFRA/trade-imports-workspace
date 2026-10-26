const { test, expect } = require('./support/fixtures')
const { capture } = require('./support/evidence')
const {
  url, urlFor, expectHeading, expectErrorSummary, expectBackLink, dateFromToday,
  saveAndContinue, clickAction, fillDocument, fillDate, SPECIES, startNotification, answerOrigin, answerCommodity
} = require('./support/journey')

// Section 4 of the DR2.1 task list: upload documents. Uploads are optional, but
// once a document type is chosen every document field must be completed.

const DOCUMENT_TYPES = [
  'Select one',
  'Intra Trade Animal Health Certificate (ITAHC)',
  'Veterinary health certificate',
  'Air waybill',
  'Import permit',
  'Letter of authority (Directive 2008/61/EC)',
  'Commercial invoice',
  'Sea waybill',
  'Rail waybill',
  'Bill of lading',
  'Catch certificate',
  'Laboratory sampling results for aflatoxin (Reg 2019/1793)',
  'Journey log',
  'Other'
]

test.describe('upload documents', () => {
  test.beforeEach(async ({ page }) => {
    await startNotification(page, 'live-animals')
    await answerOrigin(page)
    await answerCommodity(page, SPECIES.cattle)
    await page.goto(url('/upload-documents'))
  })

  test('renders the upload guidance and document fields', async ({ page }, testInfo) => {
    await expect(page).toHaveTitle('Upload documents - Import notification service - GOV.UK')
    await expectHeading(page, 'Upload documents')
    const main = page.locator('main')
    await expect(main).toContainText('Documents')
    await expect(main).toContainText('You must attach an ITAHC if this consignment requires one. If you do not have it now, you can add it later. All documents should be uploaded before the consignment arrives at the UK port. Documents must be in English and you must upload all pages.')
    await expect(main).toContainText('import licences or authorisations')
    await expect(main).toContainText('commercial documents or invoices')
    await expect(main).toContainText('Check which additional documents you must upload')
    await expect(main.locator('a[href^="https://www.gov.uk/guidance/import-of-products-animals-food-and-feed-system"]')).toHaveCount(1)
    await expect(main).toContainText('File upload')
    await expect(page.getByLabel('Document reference')).toBeVisible()
    await expect(page.locator('#document-type option')).toHaveText(DOCUMENT_TYPES)
    await expect(page.getByLabel('Date of issue')).toBeVisible()
    for (const rule of ['files that are smaller than 50MB', 'PDF, DOC, DOCX, JPEG, JPG, PNG, XLS or XLSX', 'up to a maximum of 15 files', 'ZIP files are not allowed for security reasons']) {
      await expect(main).toContainText(rule)
    }
    await expect(main).toContainText('No file chosen')
    await expect(main.getByRole('button', { name: 'Save and add another' })).toBeVisible()
    await expectBackLink(page, url('/notification-hub'))
    await capture(page, testInfo)
  })

  test('save and add another with nothing entered names every field', async ({ page }, testInfo) => {
    await clickAction(page, 'add-another')
    await expectErrorSummary(page, ['Enter a document reference', 'Select a document type', 'Enter a date of issue', 'Upload a document'])
    await capture(page, testInfo, 'error')
  })

  test('a date of issue that is not a real date', async ({ page }, testInfo) => {
    await page.locator('#document-type').selectOption('itahc')
    await page.getByLabel('Document reference').fill('ITAHC-001')
    await fillDate(page, '#date-of-issue', '30/2/2026')
    await clickAction(page, 'add-another')
    await expectErrorSummary(page, ['Enter a real date', 'Upload a document'])
    await capture(page, testInfo, 'error-real-date')
  })

  test('continuing with a document type chosen but the rest blank is held on the page', async ({ page }) => {
    await page.locator('#document-type').selectOption('air-waybill')
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/upload-documents'))
    await expectErrorSummary(page, ['Enter a document reference', 'Enter a date of issue', 'Upload a document'])
  })

  test('documents are optional: continuing with nothing chosen moves on', async ({ page }) => {
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/roles-and-addresses'))
  })

  test('a complete document is listed with its virus check status, and can be removed', async ({ page }, testInfo) => {
    await fillDocument(page, { reference: 'ITAHC-001', issued: dateFromToday(-2) })
    await expect(page.locator('main')).toContainText('itahc.pdf')
    await capture(page, testInfo, 'file-chosen')
    await clickAction(page, 'add-another')

    const table = page.locator('table.app-upload-documents-table')
    await expect(table.locator('thead th')).toHaveText(['Document reference', 'Document type', 'Date of issue', 'Status', 'Action'])
    await expect(table.locator('tbody tr')).toHaveCount(1)
    await expect(table.locator('tbody tr').first()).toContainText('ITAHC-001')
    await expect(table.locator('tbody tr').first()).toContainText('Intra Trade Animal Health Certificate (ITAHC)')
    await expect(table.locator('tbody tr').first()).toContainText(dateFromToday(-2))
    await expect(table.locator('.app-upload-documents-table__status')).toHaveText('Scanning for virus')
    await capture(page, testInfo, 'one-document')

    // The simulated virus check posts to the unprefixed /upload-documents/virus-check
    // route, which reads the root (DR1) session, so under DR2.1 the tag never
    // moves on from "Scanning for virus".
    await page.waitForTimeout(4000)
    await expect(table.locator('.app-upload-documents-table__status')).toHaveText('Scanning for virus')

    await table.getByRole('button', { name: 'Remove' }).click()
    await expect(page).toHaveURL(urlFor('/upload-documents'))
    await expect(page.locator('table.app-upload-documents-table')).toHaveCount(0)
  })
})

test.describe('upload documents from the hub', () => {
  test('save and return to overview from the hub', async ({ page }) => {
    await startNotification(page, 'live-animals')
    await answerOrigin(page)
    await page.goto(url('/notification-hub'))
    await page.locator('main').getByRole('link', { name: 'Upload documents' }).click()
    await expect(page).toHaveURL(url('/upload-documents?from=hub').replace(/\./g, '.'))
    await expect(page.locator('input[name="from"][value="hub"]')).toHaveCount(1)
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/notification-hub'))
  })
})
