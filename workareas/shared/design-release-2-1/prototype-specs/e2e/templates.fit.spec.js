const { test, expect } = require('./support/fixtures')
const { capture } = require('./support/evidence')
const {
  url, urlFor, expectHeading, expectBackLink, saveAndContinue, submitForm, clickAction,
  SPECIES, answerOrigin, answerCommodity
} = require('./support/journey')

// DR2.1 notification templates: manage, view, use, edit, change one section,
// delete, and create a new template through a template-mode journey.

const TEMPLATE_NAMES = ['Arena Aintree', 'Rice Lane City Farm', 'Monk Park Farm', 'Acorn Farm', 'Glen Keen Farm']

test.describe('manage templates', () => {
  test('lists the saved templates with view and use actions', async ({ page }, testInfo) => {
    await page.goto(url('/templates'))
    await expect(page).toHaveTitle('Manage templates - Import notification service - GOV.UK')
    await expectHeading(page, 'Manage templates')
    const main = page.locator('main')
    await expect(main).toContainText('Select, manage or create new notification templates')
    await expect(main.locator('a', { hasText: 'Create new template' })).toHaveAttribute('href', url('/templates/create?new=1'))
    await expect(main.getByRole('heading', { name: 'My templates' })).toBeVisible()
    await expect(main).toContainText('Show 1-5 of 5 results')
    for (const name of TEMPLATE_NAMES) await expect(main).toContainText(name)
    await expect(main.locator('a', { hasText: 'View template' }).first()).toHaveAttribute('href', url('/templates/arena-aintree'))
    await expect(main.locator('a', { hasText: 'Use template' }).first()).toHaveAttribute('href', url('/templates/arena-aintree/use'))
    await expect(page.locator('.govuk-service-navigation__item--active')).toContainText('Templates')
    await capture(page, testInfo)
  })

  test('the dashboard "Use template" button opens manage templates', async ({ page }) => {
    await page.goto(url())
    await page.locator('main').getByRole('button', { name: 'Use template' }).click()
    await expect(page).toHaveURL(urlFor('/templates'))
  })
})

test.describe('a saved template', () => {
  test('view: the template answers with a change link per section', async ({ page }, testInfo) => {
    await page.goto(url('/templates'))
    await page.locator('main a', { hasText: 'View template' }).first().click()
    await expect(page).toHaveURL(urlFor('/templates/arena-aintree'))
    await expectHeading(page, 'Arena Aintree')
    const main = page.locator('main')
    await expect(main).toContainText('Templates')
    await expect(main).toContainText('Date created: 15 April 2026')
    await expect(main.locator('a', { hasText: 'Use template' })).toHaveAttribute('href', url('/templates/arena-aintree/use'))
    await expect(page.locator(`a[href="${url('/templates/arena-aintree/delete')}"]`)).toHaveText('Delete')
    await expect(main.getByRole('link', { name: 'Change' }).first()).toHaveAttribute('href', url('/templates/arena-aintree/change/origin-of-the-import'))
    await expect(main).toContainText('1. About the consignment')
    await expectBackLink(page, url('/templates'))
    await capture(page, testInfo)
  })

  test('use: starts a new draft notification from the template', async ({ page }, testInfo) => {
    await page.goto(url('/templates/arena-aintree/use'))
    await expect(page).toHaveURL(urlFor('/notification-hub'))
    const main = page.locator('main')
    await expect(main).toContainText(/Draft\s+GBN-AG-26-[A-Z0-9]+/)
    await expect(main.getByRole('heading', { name: 'Notification tasklist' })).toBeVisible()
    await expect(main).toContainText('2')
    await capture(page, testInfo, 'from-template')
  })

  test('change one section: save and return goes back to the template', async ({ page }, testInfo) => {
    await page.goto(url('/templates/arena-aintree'))
    await page.locator('main').getByRole('link', { name: 'Change' }).first().click()
    await expect(page).toHaveURL(url('/origin-of-the-import?from=template-review').replace(/\./g, '.'))
    await expect(page.locator('button[name="action"]')).toHaveText(['Save and return'])
    await expect(page.locator('main a', { hasText: /^Cancel$/ })).toBeVisible()
    await capture(page, testInfo, 'template-section-edit')
    await page.locator('#internal-reference').fill('AINTREE-2026')
    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/templates/arena-aintree'))
    await expect(page.locator('.govuk-notification-banner')).toContainText('Arena Aintree has been updated')
    await expect(page.locator('main')).toContainText('AINTREE-2026')
    await capture(page, testInfo, 'updated')
  })

  test('posting to a template page just reloads it, and an unknown template returns to the list', async ({ page }) => {
    await page.goto(url('/templates/arena-aintree'))
    const response = await page.request.post(url('/templates/arena-aintree'), { maxRedirects: 0 })
    expect(response.status()).toBe(302)
    expect(response.headers().location).toBe(url('/templates/arena-aintree'))
    await page.goto(url('/templates/no-such-template'))
    await expect(page).toHaveURL(urlFor('/templates'))
  })

  test('edit: opens the template on its own task list', async ({ page }, testInfo) => {
    await page.goto(url('/templates/arena-aintree/edit'))
    await expect(page).toHaveURL(urlFor('/notification-hub'))
    const main = page.locator('main')
    await expect(main).toContainText(/Template\s+Arena Aintree/)
    await expect(main.getByRole('heading', { name: 'Template tasklist' })).toBeVisible()
    // Templates have no documents section.
    await expect(main.getByRole('heading', { name: '4. Consignment parties' })).toBeVisible()
    await expect(main.getByRole('link', { name: 'Upload documents' })).toHaveCount(0)
    await expect(main.locator('a', { hasText: 'Review template' })).toHaveAttribute('href', url('/review-notification'))
    await expect(main.locator('a', { hasText: 'Return to manage templates' })).toHaveAttribute('href', url('/templates'))
    await capture(page, testInfo, 'template')
  })

  test('delete: confirm, then the list says it was deleted', async ({ page }, testInfo) => {
    await page.goto(url('/templates/arena-aintree'))
    await page.locator(`a[href="${url('/templates/arena-aintree/delete')}"]`).click()
    await expect(page).toHaveURL(urlFor('/templates/arena-aintree/delete'))
    await expect(page).toHaveTitle('Delete this template? - Import notification service - GOV.UK')
    await expectHeading(page, 'Delete this template?')
    const main = page.locator('main')
    await expect(main).toContainText(/Name\s+Arena Aintree/)
    await expect(main).toContainText('Confirm that you want to delete this template.')
    await expect(main).toContainText('This action cannot be undone.')
    await expectBackLink(page, url('/templates/arena-aintree'))
    await capture(page, testInfo)
    await submitForm(page, 'Yes, delete')
    await expect(page).toHaveURL(urlFor('/templates'))
    await expect(page.locator('.govuk-notification-banner')).toContainText('Arena Aintree has been deleted')
    await expect(main).toContainText('Show 1-4 of 4 results')
    await capture(page, testInfo, 'deleted')
  })
})

test.describe('create a new template', () => {
  test('type, name, answers, review, save', async ({ page }, testInfo) => {
    await test.step('create new template asks the notification type first', async () => {
      await page.goto(url('/templates'))
      await page.locator('main a', { hasText: 'Create new template' }).click()
      await expect(page).toHaveURL(urlFor('/notification-type'))
      await page.locator('input[name="notificationType"][value="live-animals"]').check()
      await saveAndContinue(page)
    })

    await test.step('then the template name', async () => {
      await expect(page).toHaveURL(urlFor('/templates/create'))
      await expect(page).toHaveTitle('Enter template name - Import notification service - GOV.UK')
      await expect(page.locator('main')).toContainText('Create a new template')
      await expect(page.getByLabel('Enter template name')).toBeVisible()
      await expect(page.locator('main a', { hasText: 'Cancel and return to manage templates' })).toHaveAttribute('href', url('/templates'))
      await expectBackLink(page, url('/notification-type'))
      await capture(page, testInfo)
      await page.getByLabel('Enter template name').fill('Weekly Irish cattle')
      await submitForm(page, 'Save and continue')
      await expect(page).toHaveURL(urlFor('/origin-of-the-import'))
    })

    await test.step('origin and commodity, after which the template returns to its task list', async () => {
      await answerOrigin(page, { search: 'Irel', country: 'Republic of Ireland' })
      await answerCommodity(page, SPECIES.cattle)
      await expect(page).toHaveURL(urlFor('/notification-hub'))
      await expect(page.locator('main')).toContainText(/Template\s+Weekly Irish cattle/)
      await capture(page, testInfo, 'new-template')
    })

    await test.step('documents and declaration are not part of a template', async () => {
      await page.goto(url('/upload-documents'))
      await expect(page).toHaveURL(urlFor('/notification-hub'))
      await page.goto(url('/declaration'))
      await expect(page).toHaveURL(urlFor('/review-notification'))
    })

    await test.step('review the template and save it', async () => {
      await page.goto(url('/notification-hub'))
      await page.locator('main a', { hasText: 'Review template' }).click()
      await expect(page).toHaveURL(urlFor('/review-notification'))
      await expect(page.locator('main')).toContainText('Weekly Irish cattle')
      await capture(page, testInfo, 'template')
      await page.locator('main form[action$="/review-notification"] button[type="submit"]').first().click()
      await expect(page).toHaveURL(urlFor('/templates'))
      await expect(page.locator('.govuk-notification-banner')).toContainText('Weekly Irish cattle saved to templates')
      await expect(page.locator('main')).toContainText('Show 1-6 of 6 results')
      await capture(page, testInfo, 'saved')
    })
  })

  test('a template with no name is saved as "Untitled template"', async ({ page }) => {
    await page.goto(url('/templates/create?new=1'))
    await page.locator('input[name="notificationType"][value="live-animals"]').check()
    await saveAndContinue(page)
    await submitForm(page, 'Save and continue')
    await expect(page).toHaveURL(urlFor('/origin-of-the-import'))
    await page.goto(url('/templates/save'))
    await expect(page).toHaveURL(urlFor('/templates'))
    await expect(page.locator('.govuk-notification-banner')).toContainText('Untitled template saved to templates')
  })

  test('discard a template being created', async ({ page }, testInfo) => {
    await page.goto(url('/templates/create?new=1'))
    await page.locator('input[name="notificationType"][value="live-animals"]').check()
    await saveAndContinue(page)
    await page.getByLabel('Enter template name').fill('Throwaway')
    await submitForm(page, 'Save and continue')
    await page.goto(url('/templates/discard'))
    await expect(page).toHaveURL(urlFor('/templates/discard'))
    await expectHeading(page, 'Delete this template?')
    await expect(page.locator('main')).toContainText(/Name\s+Throwaway/)
    await expectBackLink(page, url('/review-notification'))
    await capture(page, testInfo)
    await submitForm(page, 'Yes, delete')
    await expect(page).toHaveURL(urlFor('/templates'))
    await expect(page.locator('.govuk-notification-banner')).toContainText('Throwaway has been deleted')
  })

  test('the discard page outside a template journey returns to manage templates', async ({ page }) => {
    await page.goto(url('/templates/discard'))
    await expect(page).toHaveURL(urlFor('/templates'))
  })
})
