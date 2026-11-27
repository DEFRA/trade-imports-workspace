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
    await expect(main).toContainText('Choose a version of the prototype. Each one has its own journey, dashboard and saved data. They all share one address book.')
    await expect(main).toContainText('The latest design for importing live animals and germinal products. It adds a dashboard, templates and an address book to the first journey, and has the newest changes.')
    await expect(page.locator('a', { hasText: 'Start design release 2' })).toHaveAttribute('href', '/design-release-2.1')
    await capture(page, testInfo)
  })
})

const notificationCard = (page, reference) => page.locator(`article[aria-label="Notification ${reference}"]`)

async function expectCard (page, reference, { status, quantityLabel = 'Number of animals', viewHref = url(`/review-notification?reference=${reference}`) }) {
  const card = notificationCard(page, reference)
  await expect(card.locator('dt')).toHaveText(['Commodity', 'Arrival date', 'Consignee', 'Notification status', quantityLabel, 'Origin', 'Consignor'])
  await expect(card.locator('.app-dr2-dashboard-notification-card__field', { hasText: 'Notification status' }).locator('dd')).toHaveText(status)
  await expect(card.getByRole('link')).toHaveText(['View'])
  await expect(card.getByRole('link', { name: 'View' })).toHaveAttribute('href', viewHref)
}

const DASHBOARD_TABS = [/Submitted\s+\(2\)/, /Draft and Amend\s+\(3\)/, 'Past']

test.describe('category dashboards', () => {
  test('live animals: summary, search, filters, tabs and notification cards', async ({ page }, testInfo) => {
    const main = page.locator('main')

    await test.step('submitted tab', async () => {
      await page.goto(url('/live-animals'))
      await expect(page).toHaveTitle('Dashboard - Import notification service - GOV.UK')
      await expectHeading(page, 'Live animals')
      await expectBackLink(page, url())
      await expect(main.getByRole('button', { name: 'Create new' })).toHaveAttribute('href', url('/create-notification?category=live-animals'))
      await expect(main.getByRole('heading', { name: 'Summary' })).toBeVisible()
      await expect(main.getByRole('heading', { name: 'Action needed' })).toBeVisible()
      await expect(main.getByRole('heading', { name: 'Status updated' })).toBeVisible()
      await expect(main).toContainText('Tasks requiring your attention')
      await expect(main).toContainText('Changes in the past 24 hours')
      await expect(main.getByLabel('Search by')).toBeVisible()
      await expect(main).toContainText('Keyword, notification number, commodity, consignee or consignor')
      await expect(main.locator('#dashboard-sort option')).toHaveText(['Select one', 'Newest first', 'Oldest first', 'Arrival date'])
      await expect(main.locator('.govuk-tabs__tab')).toHaveText(DASHBOARD_TABS)
      await expect(main.getByRole('heading', { name: 'Submitted notifications' })).toBeVisible()
      await expect(main).toContainText('Notifications you have submitted. You can still change them and add documents.')
      await expect(main.locator('.app-dr2-dashboard-notification-card__reference')).toHaveText(['GBN-AG-26-7K8M2P', 'GBN-AG-26-7K8M2U'])
      await expect(notificationCard(page, 'GBN-AG-26-7K8M2P')).toContainText('ITAHC is missing')
      await expectCard(page, 'GBN-AG-26-7K8M2P', { status: 'Submitted' })
      await expectCard(page, 'GBN-AG-26-7K8M2U', { status: 'Submitted' })
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
      await expect(page.locator('#dashboard-filter-status option')).toHaveText(['All statuses', 'Draft', 'Amend', 'Submitted', 'Past'])
      await expect(filters.getByLabel('Only show notifications that need action')).not.toBeChecked()
      await expect(filters.getByRole('button', { name: 'Apply filters' })).toBeVisible()
      await capture(page, testInfo, 'filters-open')
    })

    await test.step('draft and amend tab: drafts and notifications being amended', async () => {
      await page.getByRole('tab', { name: /Draft and Amend/ }).click()
      await expect(page).toHaveURL(/tab=drafts/)
      await expect(main.getByRole('heading', { name: 'Draft notifications' })).toBeVisible()
      await expect(main).toContainText('Notifications you have started but not submitted, and notifications that are being amended.')
      await expect(main.locator('.app-dr2-dashboard-notification-card__reference')).toHaveText(['GBN-AG-26-7K8M2S', 'GBN-AG-26-7K8M3F', 'GBN-AG-26-7K8M3G'])
      await expectCard(page, 'GBN-AG-26-7K8M2S', { status: 'Draft' })
      await expectCard(page, 'GBN-AG-26-7K8M3F', { status: 'Amend', viewHref: url('/notifications/amend?reference=GBN-AG-26-7K8M3F&resume=1') })
      await expectCard(page, 'GBN-AG-26-7K8M3G', { status: 'Amend', viewHref: url('/notifications/amend?reference=GBN-AG-26-7K8M3G&resume=1') })
      await capture(page, testInfo, 'drafts')
    })

    await test.step('past tab', async () => {
      await page.getByRole('tab', { name: 'Past' }).click()
      await expect(page).toHaveURL(/tab=completed/)
      await expect(main.getByRole('heading', { name: 'Past notifications' })).toBeVisible()
      await expect(main).toContainText('Notifications that have been processed. They move here 2 weeks after the commodity arrival date.')
      await expectCard(page, 'GBN-AG-26-7K8M2W', { status: 'Past' })
      await capture(page, testInfo, 'completed')
    })

    await test.step('an amend card opens the notification being amended', async () => {
      await page.goto(url('/live-animals?tab=drafts'))
      await notificationCard(page, 'GBN-AG-26-7K8M3F').getByRole('link', { name: 'View' }).click()
      await expect(page).toHaveURL(urlFor('/review-notification'))
      await expect(page.locator('.app-dr2-notification-status')).toContainText('Amend')
      await expect(page.locator('.app-dr2-notification-status')).toContainText('GBN-AG-26-7K8M3F')
      await capture(page, testInfo, 'amend-resumed')
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

  test('live animals filters: needs action and status replace the tabs with filtered results', async ({ page }, testInfo) => {
    const main = page.locator('main')

    await test.step('only notifications that need action', async () => {
      await page.goto(url('/live-animals?needsAction=1'))
      await page.locator('.app-dr2-dashboard-filters__summary').click()
      await expect(page.getByLabel('Only show notifications that need action')).toBeChecked()
      await expect(main.locator('.govuk-tabs__tab')).toHaveCount(0)
      await expect(main.getByRole('heading', { name: 'Filtered results' })).toBeVisible()
      await expect(main.getByRole('status')).toHaveText(/1 notification matches your filters\.\s+Clear filters/)
      await expect(main.locator('.app-dr2-dashboard-notification-card__reference')).toHaveText(['GBN-AG-26-7K8M2P'])
      await expectCard(page, 'GBN-AG-26-7K8M2P', { status: 'Submitted' })
      await capture(page, testInfo, 'needs-action')
    })

    await test.step('one status', async () => {
      await page.goto(url('/live-animals'))
      await page.locator('.app-dr2-dashboard-filters__summary').click()
      await page.locator('#dashboard-filter-status').selectOption('amend')
      await page.getByRole('button', { name: 'Apply filters' }).click()
      await expect(page).toHaveURL(/status=amend/)
      await expect(main.getByRole('status')).toHaveText(/2 notifications match your filters\.\s+Clear filters/)
      await expect(main.locator('.app-dr2-dashboard-notification-card__reference')).toHaveText(['GBN-AG-26-7K8M3F', 'GBN-AG-26-7K8M3G'])
      await capture(page, testInfo, 'status-amend')
    })

    await test.step('clear filters brings the tabs back', async () => {
      await main.getByRole('link', { name: 'Clear filters' }).click()
      await expect(page).toHaveURL(urlFor('/live-animals'))
      await expect(main.locator('.govuk-tabs__tab')).toHaveText(DASHBOARD_TABS)
    })
  })

  test('germinal products: quantity in units or pieces, and amend examples that open in amend', async ({ page }, testInfo) => {
    const main = page.locator('main')
    const quantityLabel = 'Quantity (unit/pieces)'
    await page.goto(url('/germinal-products'))
    await expectHeading(page, 'Germinal products')
    await expect(main.getByRole('button', { name: 'Create new' })).toHaveAttribute('href', url('/create-notification?category=germinal-products'))
    await expect(main.locator('.govuk-tabs__tab')).toHaveText(DASHBOARD_TABS)
    await expect(main.locator('.app-dr2-dashboard-notification-card__reference')).toHaveText(['GBN-GP-26-7K8M2Q', 'GBN-GP-26-7K8M2V'])
    await expectCard(page, 'GBN-GP-26-7K8M2Q', { status: 'Submitted', quantityLabel })
    await expect(notificationCard(page, 'GBN-GP-26-7K8M2Q')).toContainText('Cattle, Semen')
    await expect(notificationCard(page, 'GBN-GP-26-7K8M2V')).toContainText('ITAHC is missing')
    await capture(page, testInfo, 'in-progress')

    await test.step('draft and amend tab', async () => {
      await page.getByRole('tab', { name: /Draft and Amend/ }).click()
      await expect(main.locator('.app-dr2-dashboard-notification-card__reference')).toHaveText(['GBN-GP-26-7K8M2T', 'GBN-GP-26-7K8M3H', 'GBN-GP-26-7K8M3J'])
      await expectCard(page, 'GBN-GP-26-7K8M2T', { status: 'Draft', quantityLabel })
      await expectCard(page, 'GBN-GP-26-7K8M3H', { status: 'Amend', quantityLabel, viewHref: url('/notifications/amend?reference=GBN-GP-26-7K8M3H&resume=1') })
      await expectCard(page, 'GBN-GP-26-7K8M3J', { status: 'Amend', quantityLabel, viewHref: url('/notifications/amend?reference=GBN-GP-26-7K8M3J&resume=1') })
      await expect(notificationCard(page, 'GBN-GP-26-7K8M3J')).toContainText('Horse, Embryos/Ova')
      await capture(page, testInfo, 'drafts')
    })

    await test.step('past tab', async () => {
      await page.getByRole('tab', { name: 'Past' }).click()
      await expect(main.locator('.app-dr2-dashboard-notification-card__reference')).toHaveText(['GBN-GP-26-7K8M2R', 'GBN-GP-26-7K8M2Y', 'GBN-GP-26-7K8M3B', 'GBN-GP-26-7K8M3D'])
      await expectCard(page, 'GBN-GP-26-7K8M2R', { status: 'Past', quantityLabel })
      await capture(page, testInfo, 'completed')
    })

    await test.step('a germinal amend example opens as germinal products being amended', async () => {
      await page.goto(url('/germinal-products?tab=drafts'))
      await notificationCard(page, 'GBN-GP-26-7K8M3H').getByRole('link', { name: 'View' }).click()
      await expect(page).toHaveURL(urlFor('/review-notification'))
      await expect(page.locator('.app-dr2-notification-status')).toContainText('Amend')
      await expect(page.locator('.app-dr2-notification-status')).toContainText('GBN-GP-26-7K8M3H')
      await expectHeading(page, 'Review your notification')
      await capture(page, testInfo, 'amend-resumed')
    })
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
