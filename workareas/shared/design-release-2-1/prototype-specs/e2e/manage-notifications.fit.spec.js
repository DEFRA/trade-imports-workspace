const { test, expect } = require('./support/fixtures')
const { capture } = require('./support/evidence')
const { url, urlFor, expectHeading, expectBackLink, clickAction, submitForm, pickFromAutocomplete, fillDate, dateFromToday } = require('./support/journey')

// What a trader can do with an existing notification from the DR2.1 dashboards:
// view it (per status), amend it, cancel an amendment, copy it as new, delete it.

const DATE_PATTERN = '\\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) \\d{4}'

/** Opens the review page's Actions menu and returns its items. */
async function openActions (page) {
  const header = page.locator('.app-dr2-review-page-header__actions')
  await header.getByRole('button', { name: 'Actions' }).click()
  return header.locator('a')
}

test.describe('view a notification from the dashboard', () => {
  test('submitted with action required: warning, import references, read-only answers', async ({ page }, testInfo) => {
    await page.goto(url('/live-animals'))
    await page.locator('main').getByRole('link', { name: 'View', exact: true }).first().click()
    await expect(page).toHaveURL(url('/review-notification?reference=GBN-AG-26-7K8M2P').replace(/\./g, '.'))
    const main = page.locator('main')
    await expect(page.locator('.app-dr2-review-page-header__reference')).toHaveText('GBN-AG-26-7K8M2P')
    await expect(page.locator('.app-dr2-review-page-header .app-dr2-review-status__tag')).toHaveText('Submitted')
    await expect(main).toContainText('You need to upload a health certificate')
    await expect(main).toContainText(new RegExp(`Date submitted:\\s*${DATE_PATTERN}`))
    await expect(main).toContainText('Import reference numbers')
    await expect(main).toContainText('You must use the correct reference and code on the customs declaration or your consignment will be delayed.')
    await expect(main).toContainText(/Customs document code\s+C640/)
    await expect(main.getByRole('button', { name: 'Copy', exact: true })).toHaveCount(2)
    await expect(main).toContainText('Upload a valid health certificate')
    await expect(main).toContainText('Enter a minimum of 1 identifier')
    await expect(main.getByRole('link', { name: 'Change' })).toHaveCount(0)
    await expectBackLink(page, url())
    await capture(page, testInfo, 'action-required')

    await test.step('the actions menu: amend, make template, copy as new and delete', async () => {
      const items = await openActions(page)
      await expect(items).toHaveText(['Amend', 'Make template', 'Copy as new', 'Delete'])
      await expect(items.nth(0)).toHaveAttribute('href', url('/notifications/amend?reference=GBN-AG-26-7K8M2P'))
      await expect(items.nth(1)).toHaveAttribute('href', url('/notifications/make-template?reference=GBN-AG-26-7K8M2P'))
      await expect(items.nth(2)).toHaveAttribute('href', url('/notifications/copy-as-new?reference=GBN-AG-26-7K8M2P'))
      await expect(items.nth(3)).toHaveAttribute('href', url('/notifications/delete?reference=GBN-AG-26-7K8M2P'))
      await capture(page, testInfo, 'actions-menu')
    })
  })

  test('submitted, past and draft notifications', async ({ page }, testInfo) => {
    const status = page.locator('.app-dr2-review-page-header .app-dr2-review-status__tag')

    await test.step('submitted', async () => {
      await page.goto(url('/review-notification?reference=GBN-AG-26-7K8M2U'))
      await expect(status).toHaveText('Submitted')
      await expect(page.locator('main')).toContainText(new RegExp(`Date submitted:\\s*${DATE_PATTERN}`))
      await capture(page, testInfo, 'submitted')
    })

    await test.step('past', async () => {
      await page.goto(url('/review-notification?reference=GBN-AG-26-7K8M2W'))
      await expect(status).toHaveText('Past')
      await capture(page, testInfo, 'completed')
    })

    await test.step('draft: editable, with the incomplete sections listed', async () => {
      await page.goto(url('/review-notification?reference=GBN-GP-26-7K8M2T'))
      const main = page.locator('main')
      await expect(page.locator('.app-dr2-review-page-header__reference')).toHaveText('GBN-GP-26-7K8M2T')
      await expect(status).toHaveText('Draft')
      await expect(main).toContainText(new RegExp(`Date created:\\s*${DATE_PATTERN}`))
      await expect(page.locator('.govuk-error-summary')).toContainText('Complete arrival details')
      await expect(main.getByRole('link', { name: 'Change' }).first()).toHaveAttribute('href', url('/origin-of-the-import'))
      await capture(page, testInfo, 'draft')
    })
  })
})

test.describe('amend a submitted notification', () => {
  test('confirm, change an answer, save and return, then resubmit', async ({ page }, testInfo) => {
    await page.goto(url('/review-notification?reference=GBN-AG-26-7K8M2U'))

    await test.step('amend asks for confirmation on its own page', async () => {
      await (await openActions(page)).filter({ hasText: 'Amend' }).click()
      await expect(page).toHaveURL(urlFor('/notifications/amend'))
      await expect(page).toHaveTitle('Amend this notification? - Import notification service - GOV.UK')
      await expectHeading(page, 'Amend this notification?')
      const main = page.locator('main')
      await expect(main.locator('.govuk-summary-list__key')).toHaveText(['Reference number', 'Commodity', 'Number', 'Origin'])
      await expect(main.locator('.govuk-summary-list__value')).toHaveText(['GBN-AG-26-7K8M2U', 'Cattle (Bison Bison)', '5', 'Republic of Ireland'])
      await expect(main).toContainText('Confirm that you want to amend this notification.')
      await expect(main.getByRole('link', { name: 'No, cancel' })).toHaveAttribute('href', url('/review-notification?reference=GBN-AG-26-7K8M2U'))
      await expectBackLink(page, url('/review-notification?reference=GBN-AG-26-7K8M2U'))
      await capture(page, testInfo, 'amend-confirm')
      await main.getByRole('link', { name: 'No, cancel' }).click()
      await expect(page.locator('.app-dr2-review-page-header .app-dr2-review-status__tag')).toHaveText('Submitted')
      await page.goto(url('/notifications/amend?reference=GBN-AG-26-7K8M2U'))
      await submitForm(page, 'Yes, amend')
    })

    await test.step('the amend review', async () => {
      await expect(page).toHaveURL(urlFor('/review-notification'))
      const main = page.locator('main')
      await expect(main).toContainText(/Amend\s+GBN-AG-26-7K8M2U/)
      await expect(main.getByRole('button', { name: 'Cancel amend' }).first()).toBeVisible()
      await expect(main.getByRole('link', { name: 'Change' }).first()).toHaveAttribute('href', url('/origin-of-the-import'))
      await capture(page, testInfo, 'amend')
    })

    await test.step('a page opened from the amend review offers save and return', async () => {
      await page.locator('main').getByRole('link', { name: 'Change' }).first().click()
      await expect(page).toHaveURL(urlFor('/origin-of-the-import'))
      await expect(page.locator('button[name="action"]')).toHaveText(['Save and return', 'Save and continue', 'Save and return to overview'])
      await capture(page, testInfo, 'amend')
      await page.locator('#internal-reference').fill('AMENDED-REF')
      await clickAction(page, 'review')
      await expect(page).toHaveURL(urlFor('/review-notification'))
      await expect(page.locator('main')).toContainText('AMENDED-REF')
    })

    await test.step('continue is silently held while the seeded arrival date and port of entry are not in the formats the arrival page saves', async () => {
      await expect(page.locator('main')).toContainText(/Port of entry\s+London Heathrow/)
      await submitForm(page, 'Continue')
      await expect(page).toHaveURL(urlFor('/review-notification'))
      await expect(page.locator('.govuk-error-summary')).toHaveCount(0)
    })

    await test.step('an arrival date and a port picked from the search let the amendment through', async () => {
      await page.goto(url('/arrival-details'))
      await expect(page.locator('button[name="action"]')).toHaveText(['Save and return', 'Save and continue', 'Save and return to overview'])
      await fillDate(page, '#arrival-date-at-port', dateFromToday(10))
      await pickFromAutocomplete(page, 'port-of-entry', 'Heathrow', 'London Heathrow - LHR')
      await capture(page, testInfo, 'amend')
      await clickAction(page, 'review')
      await expect(page).toHaveURL(urlFor('/review-notification'))
    })

    await test.step('continue to the declaration and resubmit', async () => {
      await submitForm(page, 'Continue')
      await expect(page).toHaveURL(urlFor('/declaration'))
      await page.locator('#declaration-confirmed').check()
      await submitForm(page, 'Continue')
      await expect(page).toHaveURL(urlFor('/notification-submitted'))
      await expect(page.locator('main')).toContainText('GBN-AG-26-7K8M2U')
      await capture(page, testInfo, 'amended')
    })
  })

  test('cancel an amendment from the amend review', async ({ page }, testInfo) => {
    await page.goto(url('/notifications/amend?reference=GBN-AG-26-7K8M2U'))
    await submitForm(page, 'Yes, amend')
    await expect(page).toHaveURL(urlFor('/review-notification'))
    await page.locator('main').getByRole('button', { name: 'Cancel amend' }).first().click()
    const modal = page.locator('#cancel-amend-modal')
    await expect(modal).toBeVisible()
    await expect(modal.getByRole('heading', { name: 'Are you sure you want to cancel this amendment?' })).toBeVisible()
    await capture(page, testInfo, 'cancel-amend-modal')
    await modal.locator('a', { hasText: 'Yes, cancel amendment' }).click()
    await expect(page).toHaveURL(url('/review-notification?reference=GBN-AG-26-7K8M2U').replace(/\./g, '.'))
    await expect(page.locator('.app-dr2-review-page-header .app-dr2-review-status__tag')).toHaveText('Submitted')
  })
})

test.describe('amend and copy guards', () => {
  test('cancel-amend with no amendment in progress, and unknown references, return to the dashboard', async ({ page }) => {
    const root = new RegExp(`${url().replace(/\./g, '\\.')}$`)
    await page.goto(url('/notifications/cancel-amend'))
    await expect(page).toHaveURL(root)
    await page.goto(url('/notifications/amend?reference=GBN-AG-26-NOSUCH'))
    await expect(page).toHaveURL(root)
    await page.goto(url('/notifications/copy-as-new?reference=GBN-AG-26-NOSUCH'))
    await expect(page).toHaveURL(root)
  })
})

test.describe('copy as new', () => {
  test('copying a submitted notification opens a new draft on the hub', async ({ page }, testInfo) => {
    await page.goto(url('/review-notification?reference=GBN-AG-26-7K8M2U'))
    await (await openActions(page)).filter({ hasText: 'Copy as new' }).click()
    await expect(page).toHaveURL(urlFor('/notification-hub'))
    await expectHeading(page, 'Overview')
    const main = page.locator('main')
    await expect(main).toContainText('Draft')
    // The copy gets its own reference, not the source's.
    await expect(main).not.toContainText('GBN-AG-26-7K8M2U')
    await expect(main).toContainText(/GBN-AG-26-[A-Z0-9]+/)
    await capture(page, testInfo, 'copied')
  })
})

test.describe('delete a notification', () => {
  test('confirm the deletion; the dashboard shows a success banner', async ({ page }, testInfo) => {
    await page.goto(url('/review-notification?reference=GBN-AG-26-7K8M2P'))
    await (await openActions(page)).filter({ hasText: 'Delete' }).click()
    await expect(page).toHaveURL(/\/notifications\/delete\?reference=GBN-AG-26-7K8M2P$/)
    await expect(page).toHaveTitle('Delete this notification? - Import notification service - GOV.UK')
    await expectHeading(page, 'Delete this notification?')
    const main = page.locator('main')
    await expect(main).toContainText(/Reference number\s+GBN-AG-26-7K8M2P/)
    await expect(main).toContainText(/Commodity\s+Sheep \(Ovis Aries\), Goat \(Capra Hircus\)/)
    await expect(main).toContainText('Confirm that you want to delete this notification.')
    await expect(main).toContainText('This action cannot be undone.')
    await expect(main.locator('a', { hasText: 'No, cancel' })).toHaveAttribute('href', url('/review-notification?reference=GBN-AG-26-7K8M2P'))
    await expectBackLink(page, url('/review-notification?reference=GBN-AG-26-7K8M2P'))
    await capture(page, testInfo)

    await submitForm(page, 'Yes, delete')
    // Deleting returns to the overall dashboard, which shows no banner itself.
    await expect(page).toHaveURL(new RegExp(`${url().replace(/\./g, '\\.')}$`))
    await expect(page.locator('.govuk-notification-banner')).toHaveCount(0)
    await page.goto(url('/live-animals'))
    await expect(page.locator('.govuk-notification-banner')).toContainText('GBN-AG-26-7K8M2P has been deleted.')
    await expect(page.locator('.app-dr2-dashboard-notification-list')).not.toContainText('GBN-AG-26-7K8M2P')
    await capture(page, testInfo, 'deleted')
  })
})
