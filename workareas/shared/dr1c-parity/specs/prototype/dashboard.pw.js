//
// Design Release 1 — dashboard slice.
//
// Two screens: dr1-dashboard (the service landing page at the bare root URL)
// and dr1-notification-hub (the task list for one notification).
//
// DR1 is the ROOT mount of the prototype's single router, so every path here is
// unprefixed. A picture taken under /design-release-2, /design-release-2.1 or
// /testing is a picture of a different application.
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

// One test, because Playwright's page fixture is test-scoped and the prototype
// keeps journey state in the session: a second test() would start from an empty
// session and the seeded hub state below would be lost.
test('the dashboard slice', async ({ page }) => {
  // The GOV.UK Prototype Kit bounces nodemon while it recompiles, so the first
  // navigation of the whole prototype side can meet a server that is restarting.
  // This spec sorts first alphabetically on this side, so it is very likely the
  // one that meets a cold server. Retry until the landing page renders.
  await expect(async () => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(
      page.getByRole('heading', { level: 1, name: 'Import notification service' })
    ).toBeVisible({ timeout: 5_000 })
  }).toPass({ timeout: 240_000 })

  await expect(page).toHaveURL(/\/$/)

  // Nothing on this page is minted per run. The notification references, the
  // arrival dates and the "Show 1-N of N results" count all come from the static
  // fixture app/data/dashboard-notifications.js, so the pixels are reproducible
  // and there is nothing to mask.
  await record.record(page, 'dashboard')

  // STATE — the three filter panels open.
  //
  // "Search by", "Status" and "By date" are <details> elements that render
  // closed, so the default picture shows none of the fields the design defines
  // for filtering. Those fields are exactly what this comparison reads, so they
  // are worth a second picture with every panel expanded.
  const filterSections = page.locator('.app-dashboard-filters__section')
  const filterSectionCount = await filterSections.count()

  for (let index = 0; index < filterSectionCount; index++) {
    await filterSections.nth(index).locator('summary').click()
  }

  await expect(page.locator('#dashboard-search-keyword')).toBeVisible()
  await expect(page.locator('#dashboard-search-commodity')).toBeVisible()
  await expect(page.locator('#dashboard-search-consignee')).toBeVisible()
  await expect(page.locator('#dashboard-filter-status')).toBeVisible()
  await expect(page.locator('#dashboard-start-date')).toBeVisible()
  await expect(page.locator('#dashboard-end-date')).toBeVisible()

  await record.record(page, 'dashboard-filters-open')

  // NOT CAPTURED — dashboard-empty and dashboard-populated.
  //
  // The DR1 dashboard list is never empty and never seeded. Its rows are the
  // static fixture in app/data/dashboard-notifications.js, merged with two
  // session lists (routes.js:6602 draftNotifications, routes.js:6633
  // submittedNotifications). Neither session list can be written from DR1:
  // saveDraftNotification has one caller, copyNotificationAsNewIntoSession
  // (routes.js:5426), reached only from the "Copy as new" href, which DR1's own
  // view hardcodes to "#" (dashboard.html) because buildDashboardNotificationCopyHref
  // is gated on isDesignRelease2SessionData; and submittedNotifications is only
  // written by submitting the journey, which belongs to another slice. There is
  // also no delete path on DR1 (deletedNotificationReferences is DR2-only), so
  // the list cannot be emptied either. The picture above IS the populated
  // dashboard, and an empty one is not a state DR1 has.
  //
  // The only /prototype/ seeding route in the whole application is
  // /prototype/reason-for-import (routes.js:9536). It seeds the journey session,
  // not the dashboard list. It is used below for the hub.

  // NOT CAPTURED — the gated dashboard tabs.
  //
  // DR1's dashboard renders no tabs at all: dashboard.html has no tab list, and
  // the `tabs` view-model entry is built only for the DR2/DR2.1 views
  // (routes.js:7160-7194, hrefs into /design-release-2.1). The tab routes do
  // exist on the root mount — /templates (routes.js:9556), /actions
  // (routes.js:9680), /changes (routes.js:9684) and /inspection
  // (routes.js:9688) — and each handler redirects to '/' for a session that is
  // not DR2 (routes.js:7275, 7338, 7356, 7390). So a DR1 user has no tab to
  // click, and reaching a tab URL directly lands back on the dashboard already
  // photographed above. Nothing there is a DR1 screen and nothing is recorded.

  // NOT CAPTURED — app/views/index.html. It is the release chooser that sits
  // above all four journeys, reachable from the service-navigation service link
  // on every page, and the enumeration classifies it as not a screen.

  // The hub, on a session that has answered nothing. This context has only
  // visited the dashboard, which writes no journey state, so the task list is
  // at its starting point.
  await page.goto('/notification-hub')
  await expect(page).toHaveURL(/\/notification-hub$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
  await expect(page.locator('.app-notification-hub-tasklist__tag').first()).toBeVisible()

  await record.record(page, 'notification-hub')

  // STATE — the hub with some rows answered.
  //
  // The task-row statuses are a large part of what this comparison looks at, and
  // the picture above shows only one of the two tags the hub can render. The
  // prototype's own seeding shortcut sets country of origin, commodity, species
  // and animal count (seedPrototypeSessionForReasonForImport, routes.js:210), so
  // it completes the first two rows of section 1 and fills the "Animals" summary
  // card, without driving any page this slice does not own.
  await page.goto('/prototype/reason-for-import')
  await expect(page).toHaveURL(/\/reason-for-import$/)

  await page.goto('/notification-hub')
  await expect(page).toHaveURL(/\/notification-hub$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()

  // Prove the state the name claims actually took, so the picture is not
  // mislabelled: at least one row now reads Complete.
  await expect(
    page.locator('.app-notification-hub-tasklist__tag', { hasText: 'Complete' }).first()
  ).toBeVisible()

  await record.record(page, 'notification-hub-partly-complete')

  // NOT CAPTURED — a hub with every row Complete. Reaching it means answering
  // every page in the journey, which is other slices' territory and would make
  // this slice hostage to their widgets. The two tag states are both shown above.
})
