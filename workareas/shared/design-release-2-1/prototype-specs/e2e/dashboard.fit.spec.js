const { test, expect } = require('./support/fixtures')
const { capture } = require('./support/evidence')
const { url, urlFor, expectHeading, expectBackLink } = require('./support/journey')

// The DR2.1 dashboard family: the overall dashboard at the mount root, one
// dashboard per notification category, and the three "at a glance" drill-downs.

const serviceNav = (page) => page.locator('.govuk-service-navigation')

test.describe('overall dashboard', () => {
  test('summarises every category and links into each one', async ({ page }, testInfo) => {
    await test.step('the mount root is the overall dashboard', async () => {
      await page.goto(url())
      await expect(page).toHaveTitle('Dashboard - Import notification service - GOV.UK')
      await expectHeading(page, 'Import notification service')
      await expect(page.locator('main')).toContainText('Dashboard')
      await capture(page, testInfo)
    })

    await test.step('service navigation points at the DR2.1 mount', async () => {
      const nav = serviceNav(page)
      await expect(nav.getByRole('link', { name: 'Dashboard', exact: true })).toHaveAttribute('href', url())
      await expect(nav.getByRole('link', { name: 'Templates', exact: true })).toHaveAttribute('href', url('/templates'))
      await expect(nav.getByRole('link', { name: 'Address book', exact: true })).toHaveAttribute('href', url('/address-book'))
    })

    await test.step('messages, create and use-template actions', async () => {
      const main = page.locator('main')
      await expect(main).toContainText('12 unread messages')
      await expect(main.getByRole('button', { name: 'Create new' })).toHaveAttribute('href', url('/create-notification'))
      await expect(main.getByRole('button', { name: 'Use template' })).toHaveAttribute('href', url('/templates'))
    })

    await test.step('one card per category with its glance counts', async () => {
      const main = page.locator('main')
      for (const heading of ['Live animals', 'Germinal products', 'Inspection required']) {
        await expect(main.getByRole('heading', { name: heading }).first()).toBeVisible()
      }
      await expect(main).toContainText('Plants, plant products or')
      await expect(main).toContainText('Consignments due at the BCP')
      await expect(main.getByRole('link', { name: 'View dashboard' }).first()).toHaveAttribute('href', url('/live-animals'))
      await expect(main.getByRole('link', { name: 'View dashboard' }).nth(1)).toHaveAttribute('href', url('/germinal-products'))
      await expect(main.getByRole('link', { name: 'View tasks' }).first()).toHaveAttribute('href', url('/actions?category=live-animals'))
      await expect(main.getByRole('link', { name: 'View updates' }).first()).toHaveAttribute('href', url('/changes?category=live-animals'))
      await expect(main.getByRole('link', { name: 'View tasks' }).nth(1)).toHaveAttribute('href', url('/actions?category=germinal-products'))
      // The plants card and the inspection card are placeholders in DR2.1.
      await expect(main.getByRole('link', { name: 'View dashboard' }).nth(2)).toHaveAttribute('href', '#')
      await expect(main.getByRole('link', { name: 'View requirements' })).toHaveAttribute('href', '#')
    })
  })

  test('/dashboard redirects to the overall dashboard, or to live animals with a query', async ({ page }) => {
    await page.goto(url('/dashboard'))
    await expect(page).toHaveURL(new RegExp(`${url().replace(/\./g, '\\.')}$`))
    await page.goto(url('/dashboard?tab=drafts'))
    await expect(page).toHaveURL(urlFor('/live-animals'))
    await expect(page).toHaveURL(/tab=drafts/)
  })

  test('the prototype index lists every design release', async ({ page }, testInfo) => {
    await page.goto(url('/index'))
    await expect(page).toHaveTitle('Import notification service')
    await expectHeading(page, 'Import notification service')
    const main = page.locator('main')
    await expect(main).toContainText('Choose a prototype version to work on. Each version has its own journey and dashboard, with a shared address book.')
    await expect(main).toContainText('A duplicate of Design release 2 for making changes without affecting the original version.')
    await expect(page.locator('a', { hasText: 'Start design release 2.1' })).toHaveAttribute('href', '/design-release-2.1')
    await capture(page, testInfo)
  })
})

test.describe('category dashboards', () => {
  test('live animals: summary, search, filters, tabs and notification cards', async ({ page }, testInfo) => {
    await test.step('in-progress tab', async () => {
      await page.goto(url('/live-animals'))
      await expect(page).toHaveTitle('Dashboard - Import notification service - GOV.UK')
      await expectHeading(page, 'Live animals')
      await expectBackLink(page, url())
      const main = page.locator('main')
      await expect(main.getByRole('button', { name: 'Create new' })).toHaveAttribute('href', url('/create-notification?category=live-animals'))
      await expect(main.getByRole('heading', { name: 'Summary' })).toBeVisible()
      await expect(main.getByRole('heading', { name: 'Action needed' })).toBeVisible()
      await expect(main.getByRole('heading', { name: 'Status updated' })).toBeVisible()
      await expect(main).toContainText('Tasks requiring your attention')
      await expect(main).toContainText('Changes in the past 24 hours')
      await expect(main.getByLabel('Search by')).toBeVisible()
      await expect(main).toContainText('Keyword, notification number, commodity, consignee or consignor')
      await expect(main.locator('#dashboard-sort option')).toHaveText(['Select one', 'Newest first', 'Oldest first', 'Arrival date'])
      await expect(main.locator('.govuk-tabs__tab')).toHaveText([/In progress\s+\(2\)/, 'Draft', 'Completed'])
      await expect(main.getByRole('heading', { name: 'Notifications in progress' })).toBeVisible()
      await expect(main).toContainText('GBN-AG-26-7K8M2P')
      await expect(main).toContainText('ITAHC is missing')
      await expect(main.getByRole('link', { name: 'View', exact: true }).first()).toHaveAttribute('href', url('/review-notification?reference=GBN-AG-26-7K8M2P'))
      await expect(main.getByRole('link', { name: 'Copy as new' }).first()).toHaveAttribute('href', url('/notifications/copy-as-new?reference=GBN-AG-26-7K8M2P'))
      await capture(page, testInfo, 'in-progress')
    })

    await test.step('additional filters open', async () => {
      await page.locator('.app-dr2-dashboard-filters__summary').click()
      const filters = page.locator('.app-dr2-dashboard-filters__panel')
      await expect(filters).toBeVisible()
      await expect(filters).toContainText('By arrival date')
      await expect(filters).toContainText('By date range')
      await expect(filters).toContainText('For example, 27/3/2026')
      await expect(filters.getByText('Start date')).toBeVisible()
      await expect(filters.getByText('End date')).toBeVisible()
      await expect(page.locator('#dashboard-filter-status option')).toHaveText(['Select one', 'Action required', 'Submitted', 'Completed'])
      await capture(page, testInfo, 'filters-open')
    })

    await test.step('draft tab', async () => {
      await page.getByRole('tab', { name: 'Draft' }).click()
      await expect(page).toHaveURL(/tab=drafts/)
      await expect(page.locator('main').getByRole('heading', { name: 'Draft notifications' })).toBeVisible()
      await expect(page.locator('main')).toContainText('GBN-AG-26-7K8M2S')
      await capture(page, testInfo, 'drafts')
    })

    await test.step('completed tab', async () => {
      await page.getByRole('tab', { name: 'Completed' }).click()
      await expect(page).toHaveURL(/tab=completed/)
      await expect(page.locator('main').getByRole('heading', { name: 'Completed notifications' })).toBeVisible()
      await expect(page.locator('main')).toContainText('GBN-AG-26-7K8M2W')
      await capture(page, testInfo, 'completed')
    })

    await test.step('search and sort submit as a GET to the category list', async () => {
      await page.goto(url('/live-animals'))
      await page.getByLabel('Search by').fill('Horses')
      await page.locator('#dashboard-sort').selectOption('oldest')
      await page.locator('.app-dr2-dashboard-search__button').click()
      await expect(page).toHaveURL(/search=Horses/)
      await expect(page).toHaveURL(/sort=oldest/)
      await expect(page.getByLabel('Search by')).toHaveValue('Horses')
      await capture(page, testInfo, 'search')
    })
  })

  test('germinal products: packages instead of animals', async ({ page }, testInfo) => {
    await page.goto(url('/germinal-products'))
    await expectHeading(page, 'Germinal products')
    const main = page.locator('main')
    await expect(main.getByRole('button', { name: 'Create new' })).toHaveAttribute('href', url('/create-notification?category=germinal-products'))
    await expect(main).toContainText('GBN-GP-26-7K8M2Q')
    await expect(main).toContainText('Cattle, Semen')
    await expect(main).toContainText('Number of packages')
    await capture(page, testInfo, 'in-progress')
  })
})

test.describe('at a glance drill-downs', () => {
  test('action needed lists notifications needing action', async ({ page }, testInfo) => {
    await page.goto(url('/actions'))
    await expect(page).toHaveTitle('Tasks requiring your attention - Import notification service - GOV.UK')
    await expectHeading(page, 'Tasks requiring your attention')
    await expectBackLink(page, url())
    const main = page.locator('main')
    await expect(main).toContainText('Action needed')
    await expect(main).toContainText('Add missing information or upload documents to prevent your consignment from being delayed.')
    await expect(main.getByRole('heading', { name: 'Notifications needing action' })).toBeVisible()
    await expect(main).toContainText('Show 1-2 of 2 results')
    await expect(main).toContainText('GBN-AG-26-7K8M2P')
    await expect(main).toContainText('GBN-GP-26-7K8M2V')
    await capture(page, testInfo)

    await page.goto(url('/actions?category=live-animals'))
    await expectBackLink(page, url('/live-animals'))
    await expect(main).toContainText('GBN-AG-26-7K8M2P')
    await expect(main).not.toContainText('GBN-GP-26-7K8M2V')
    await capture(page, testInfo, 'live-animals')
  })

  test('status updated lists changes in the past 24 hours', async ({ page }, testInfo) => {
    await page.goto(url('/changes'))
    await expect(page).toHaveTitle('Changes in past 24 hours - Import notification service - GOV.UK')
    await expectHeading(page, 'Changes in past 24 hours')
    const main = page.locator('main')
    await expect(main).toContainText('Status updated')
    await expect(main).toContainText('Notifications that have progressed, or been validated, rejected, cancelled, or replaced in the past 24 hours.')
    for (const label of ['Passed inspection', 'Needs inspection', 'Delayed']) {
      await expect(main).toContainText(label)
    }
    await capture(page, testInfo)

    await page.goto(url('/changes?category=germinal-products'))
    await expect(main).toContainText('GBN-GP-26-7K8M2T')
    await capture(page, testInfo, 'germinal-products')
  })

  test('inspection required lists consignments due at the BCP', async ({ page }, testInfo) => {
    await page.goto(url('/inspection'))
    await expect(page).toHaveTitle('Consignments due at the border control post (BCP) - Import notification service - GOV.UK')
    await expectHeading(page, 'Consignments due at the border control post (BCP)')
    const main = page.locator('main')
    await expect(main).toContainText('Inspection required')
    await expect(main).toContainText('Consignments that must go to your chosen BCP for inspection.')
    await expect(main.getByRole('heading', { name: 'Notifications chosen for inspection' })).toBeVisible()
    await expect(main).toContainText('GBN-AG-26-7K8M2U')
    await expect(main).toContainText('GBN-AG-26-7K8M2Z')
    await capture(page, testInfo)

    await test.step('border inspection guidance is collapsed until opened', async () => {
      const details = main.locator('details', { hasText: 'What to do at a border inspection' })
      await expect(details).not.toHaveAttribute('open', '')
      await details.locator('summary').click()
      await expect(details).toContainText('If your consignments need to have sanitary or phytosanitary checks, you or the transporter must take it to your chosen border control post (BCP).')
      await expect(details.getByRole('link', { name: 'what you need to do at a border inspection' })).toHaveAttribute(
        'href', 'https://www.gov.uk/guidance/sanitary-and-phytosanitary-sps-checks-at-border-control-posts-bcps'
      )
      await capture(page, testInfo, 'guidance-open')
    })
  })
})
