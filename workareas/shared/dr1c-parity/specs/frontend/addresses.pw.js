import { readFileSync } from 'node:fs'

const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

/* The `addresses` slice of the live-animals frontend: the consignment-address
 * hub, the five party pickers it links to, the CPH page it conditionally links
 * to, and the contact picker (which is not a hub spoke).
 *
 * Everything below is derived from the application's own source:
 *   features/addresses/{controller.js,parties.js,template.njk,copy/copy.en.js}
 *   features/addresses/party-picker/{party-picker.controller.js,
 *     party-picker.njk,_address-picker.njk,view-model/*}
 *   features/cph-number/{controller.js,template.njk,copy/copy.en.js}
 *   features/contact/{controller.js,template.njk,copy/copy.en.js}
 *   sets/live-animals/services/commodities/{index.js,stub.js}
 *   journeys/linear/flow/entry-guard.js, features/dashboard/controller.js
 *
 * ---------------------------------------------------------------------------
 * WHY THIS SPEC DRIVES ITSELF FROM THE DASHBOARD
 *
 * Playwright's `page` fixture is test-scoped and this application keeps journey
 * state in the session, so nothing survives from another spec file. This is one
 * test that walks from the service root to the end of the slice.
 *
 * ---------------------------------------------------------------------------
 * WHY 'Cow' / 'Bos taurus'
 *
 * fe-cph-number is only linked from the addresses hub when a commodity line
 * triggers CPH. `isCphApplicable` (features/cph-number/controller.js:28-31)
 * tests each line's `commoditySelection` against `commodities.cphCommodities()`,
 * which is `CPH_COMMODITIES = ['Cow']` and nothing else
 * (services/commodities/stub.js:119, exported at services/commodities/index.js:61).
 * A commodity line is one commodity plus ONE species (search/selection/line-key.js),
 * and the checkbox value is `${commodity}|${speciesValue}`
 * (search/view-model/commodity-groups.js:9). Cow's species are listed at
 * services/commodities/stub.js:16-21; 'Bos taurus' is `1148346`. So the value
 * ticked below is `Cow|1148346`. Selected BY VALUE, not by visible text, because
 * the species list comes from a reference service in one mode and this fixture
 * in another.
 *
 * The consignment slice is choosing its own commodity in its own file. This spec
 * does not and cannot depend on it.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS MASKED, AND WHY
 *
 * Every journey page renders a journey strip carrying `journey.journeyId`
 * (shared/kit.js:53-58, shared/layout.njk `.app-journey-strip`). That id is
 * minted per notification, so it is different on every run and would make
 * identical pages produce different pixels. It is blanked to a fixed string in
 * the live DOM immediately before each shot. The id also appears inside back-link
 * and action hrefs in the captured HTML; those are left alone, because rewriting
 * them would break the navigation this spec then performs.
 *
 * ---------------------------------------------------------------------------
 * TWO TRAPS THIS SPEC AVOIDS ON PURPOSE
 *
 * 1. The picker's search box filters the results table
 *    (party-picker.controller.js:100-104 re-renders on `action=search`). Typing
 *    into it before choosing a row would hide the row. So `q` is only ever typed
 *    into for the deliberate no-matches state, and the picker is re-entered by a
 *    fresh GET afterwards — the GET resets `query` to '' (controller.js:66).
 *
 * 2. On the hub an answered row still renders a link: the same
 *    `actions.items[0]` flips its text from 'Add' to 'Change'
 *    (addresses/controller.js:36-44). Every hub row below is addressed by its own
 *    accessible name — 'Add place of origin', 'Change place of origin' — never by
 *    "the next link".
 */

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(async () => {
  record.write()
})

/** `journey.journeyId` is minted per run and printed on every journey page. */
const maskReference = async (page) => {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll(
      '.app-journey-strip .govuk-body'
    )) {
      el.textContent = 'DRAFT-REFERENCE'
    }
  })
}

const shoot = async (page, name) => {
  await maskReference(page)
  await record.record(page, name)
}

/** The journey id is server-minted and goes straight into the URL assertions
 * below, so it is escaped before being spliced into a RegExp. */
const escapeForRegExp = (value) =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Tick one row of the picker's results table, addressing it by the accessible
 * name the template gives that row's radio: a visually hidden "Select <name>"
 * (_address-picker.njk, `copy.selectRowPrefix`). The name is read out of the row
 * rather than hardcoded, so this does not depend on which records the address
 * book happens to hold — and addressing a row by its own name is the only safe
 * way to drive a table whose search box can make a row disappear.
 *
 * A different row is used for each party so that the completed hub shows five
 * different names rather than the same one five times. Page one of the picker
 * holds `PAGE_SIZE` (5) rows, one per party. */
const chooseAddress = async (page, index) => {
  const row = page.locator('.govuk-table__body .govuk-table__row').nth(index)
  await expect(row).toBeVisible()
  const name = (await row.locator('.govuk-table__cell').nth(1).innerText()).trim()
  // `exact` because this is the one name in the spec that comes from data rather
  // than from the application's copy: Playwright matches an accessible name as a
  // substring by default, so two records where one name is a prefix of another
  // would resolve to two radios and fail on strict mode.
  await page.getByRole('radio', { name: `Select ${name}`, exact: true }).check()
  return name
}

test('the addresses slice', async ({ page }) => {
  // ---------------------------------------------------------------- entry
  // In STUB_MODE an unauthenticated request is bounced through
  // /auth/sign-in (plugins/auth.js:106) which mints a local session and
  // redirects back, so the dashboard is reached in one navigation.
  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Import notification service' })
  ).toBeVisible()

  // POST /notifications creates the journey and redirects to the entry page
  // (dashboard/controller.js:111-115). fe-dashboard and fe-origin belong to
  // other slices, so neither is recorded here.
  //
  // The entry page is `/origin` — features/origin/page.js declares
  // `originPage = { id: 'origin', slug: 'origin' }`, and every journey path is
  // `/notifications/{journeyId}/<slug>` (shared/paths.js `pagePath`). It is NOT
  // `/origin-of-the-import`: that is Design Release 1's path for the same
  // question, and 'Origin of the import' is only this page's heading copy
  // (features/origin/copy/copy.en.js `title`).
  await page.getByRole('button', { name: 'Start a new notification' }).click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/origin$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Origin of the import' })
  ).toBeVisible()

  const journeyId = new URL(page.url()).pathname.split('/')[2]
  const at = (slug) => `/notifications/${journeyId}/${slug}`
  const id = escapeForRegExp(journeyId)
  const onHub = new RegExp(`/notifications/${id}$`)
  const onAddresses = new RegExp(`/notifications/${id}/addresses$`)
  const onPage = (slug) => new RegExp(`/notifications/${id}/${slug}$`)

  // Commit one origin answer so the journey has committed user answers and the
  // deep-link entry guard (flow/entry-guard.js:45-57) lets this spec navigate
  // straight to any page in the slice. France is selected BY VALUE.
  await page.locator('#countryOfOrigin').selectOption('FR')
  await page.getByRole('button', { name: 'Save and return to hub' }).click()
  await expect(page).toHaveURL(onHub)

  // ------------------------------------------------- hub, before any commodity
  // The hub's CPH row is conditional on isCphApplicable, so with no commodity
  // line it renders the five party rows and nothing else. This is the only
  // picture of which rows the hub shows when CPH does not apply, and it is also
  // the hub with nothing answered at all.
  await page.goto(at('addresses'))
  await expect(page).toHaveURL(onAddresses)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Consignment addresses' })
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Add place of origin' })
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Add county parish holding number (cph)' })
  ).toHaveCount(0)
  await shoot(page, 'addresses-hub-empty')

  // ------------------------------------------------ commit a CPH commodity line
  // fe-commodity-search belongs to another slice and is not recorded.
  await page.goto(at('commodities'))
  await expect(page).toHaveURL(onPage('commodities'))
  await page.locator('input[name="species"][value="Cow|1148346"]').check()
  await page.getByRole('button', { name: 'Save and return to hub' }).click()
  await expect(page).toHaveURL(onHub)

  // ---------------------------------------------------------- fe-addresses-hub
  // The canonical hub: six rows, every one 'Not added yet'. The CPH row is now
  // present because a Cow line is committed.
  await page.goto(at('addresses'))
  await expect(page).toHaveURL(onAddresses)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Consignment addresses' })
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Add county parish holding number (cph)' })
  ).toBeVisible()
  await shoot(page, 'addresses-hub')

  // ------------------------------------------- fe-address-picker-place-of-origin
  // Entered by its own hub row, which is the journey's real route in.
  await page.getByRole('link', { name: 'Add place of origin' }).click()
  await expect(page).toHaveURL(onPage('place-of-origin/select'))
  await expect(
    page.getByRole('heading', { level: 1, name: 'Place of origin' })
  ).toBeVisible()
  await shoot(page, 'address-picker-place-of-origin')

  // Page two. The book holds more records than the picker's page size
  // (address-book/index.js PAGE_SIZE = 5), so govukPagination renders
  // (view-model/pagination/index.js). The page is a plain GET query parameter
  // (party-picker.controller.js:66, request-params.js), so it is requested
  // directly rather than by guessing the pagination link's accessible name.
  await page.goto(at('place-of-origin/select?page=2'))
  await expect(page).toHaveURL(
    new RegExp(`/notifications/${id}/place-of-origin/select\\?page=2$`)
  )
  await expect(
    page.getByRole('heading', { level: 1, name: 'Place of origin' })
  ).toBeVisible()
  await expect(page.locator('.govuk-pagination__item--current')).toContainText(
    '2'
  )
  await shoot(page, 'address-picker-place-of-origin-page-2')

  // The empty-results state, which is where the "no addresses" copy lives
  // (_address-picker.njk `copy.noMatches`). Typed into `q` deliberately and only
  // here; the picker is re-entered by a fresh GET straight afterwards so the
  // filter cannot hide the row this spec then picks.
  await page.goto(at('place-of-origin/select'))
  await page.getByRole('textbox', { name: 'Search' }).fill('zzzzzzzz')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page).toHaveURL(onPage('place-of-origin/select'))
  await expect(
    page.getByRole('heading', { level: 1, name: 'Place of origin' })
  ).toBeVisible()
  await expect(page.getByText('No addresses match your search.')).toBeVisible()
  await shoot(page, 'address-picker-place-of-origin-no-matches')

  await page.goto(at('place-of-origin/select'))
  const originName = await chooseAddress(page, 0)
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page).toHaveURL(onAddresses)

  // How a committed choice reads back on return: the row is pre-ticked from the
  // stored address id (party-picker/selection.js `committedId`) and an inset
  // repeats it as "Selected address: …".
  await page.goto(at('place-of-origin/select'))
  await expect(page).toHaveURL(onPage('place-of-origin/select'))
  await expect(
    page.getByRole('heading', { level: 1, name: 'Place of origin' })
  ).toBeVisible()
  await expect(page.getByText(`Selected address: ${originName}`)).toBeVisible()
  await shoot(page, 'address-picker-place-of-origin-selected')

  // ------------------------------- fe-address-picker-consignor-or-exporter
  await page.goto(at('addresses'))
  await page.getByRole('link', { name: 'Add consignor or exporter' }).click()
  await expect(page).toHaveURL(
    onPage('consignors/select')
  )
  await expect(
    page.getByRole('heading', { level: 1, name: 'Consignor or exporter' })
  ).toBeVisible()
  await shoot(page, 'address-picker-consignor-or-exporter')

  // Continuing without choosing. The POST finds no selection and re-renders at
  // 400 with the party's own error message (party-picker.controller.js:110-121).
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page).toHaveURL(
    onPage('consignors/select')
  )
  await expect(
    page.getByText('Select a consignor from the list').first()
  ).toBeVisible()
  await shoot(page, 'address-picker-consignor-or-exporter-error')

  await page.goto(at('consignors/select'))
  await chooseAddress(page, 1)
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page).toHaveURL(onAddresses)

  // ------------------------------------------------ fe-address-picker-consignee
  await page.getByRole('link', { name: 'Add consignee' }).click()
  await expect(page).toHaveURL(
    onPage('consignees/select')
  )
  await expect(
    page.getByRole('heading', { level: 1, name: 'Consignee' })
  ).toBeVisible()
  await shoot(page, 'address-picker-consignee')

  await chooseAddress(page, 2)
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page).toHaveURL(onAddresses)

  // ------------------------------------------------- fe-address-picker-importer
  await page.getByRole('link', { name: 'Add importer' }).click()
  await expect(page).toHaveURL(
    onPage('importers/select')
  )
  await expect(
    page.getByRole('heading', { level: 1, name: 'Importer' })
  ).toBeVisible()
  await shoot(page, 'address-picker-importer')

  await chooseAddress(page, 3)
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page).toHaveURL(onAddresses)

  // -------------------------------- fe-address-picker-place-of-destination
  await page.getByRole('link', { name: 'Add place of destination' }).click()
  await expect(page).toHaveURL(
    onPage('destinations/select')
  )
  await expect(
    page.getByRole('heading', { level: 1, name: 'Place of destination' })
  ).toBeVisible()
  await shoot(page, 'address-picker-place-of-destination')

  await chooseAddress(page, 4)
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page).toHaveURL(onAddresses)

  // ------------------------------------------------------------ fe-cph-number
  // The addresses hub is the only link into this page (addresses/controller.js:29),
  // and the link carries ?return=addresses so saving comes back here. The page is
  // ONE text input with no conditional reveal — county, parish and holding are not
  // separate revealed fields on this side (features/cph-number/template.njk).
  await page
    .getByRole('link', { name: 'Add county parish holding number (cph)' })
    .click()
  await expect(page).toHaveURL(
    new RegExp(`/notifications/${id}/cph-number\\?return=addresses$`)
  )
  await expect(
    page.getByRole('heading', { level: 1, name: 'County Parish Holding (CPH)' })
  ).toBeVisible()
  await shoot(page, 'cph-number')

  // Continuing with the field empty. requiredExactDigits gives 'Enter a CPH
  // number' at 400 (features/cph-number/controller.js:38-44, :74-84).
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page).toHaveURL(
    new RegExp(`/notifications/${id}/cph-number\\?return=addresses$`)
  )
  await expect(
    page.getByRole('heading', { level: 1, name: 'County Parish Holding (CPH)' })
  ).toBeVisible()
  await expect(page.getByText('Enter a CPH number').first()).toBeVisible()
  await shoot(page, 'cph-number-error')

  await page.locator('#countyParishHoldingCph').fill('123456789')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page).toHaveURL(onAddresses)

  // -------------------------------------------------- addresses-hub, complete
  // Every party chosen and CPH answered: each row now carries a value and its
  // action reads 'Change'. What the statuses say is a large part of what this
  // comparison looks at, so both ends of the hub are photographed.
  await expect(
    page.getByRole('heading', { level: 1, name: 'Consignment addresses' })
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Change place of origin' })
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Change county parish holding number (cph)' })
  ).toBeVisible()
  await expect(page.getByText('Not added yet')).toHaveCount(0)
  await shoot(page, 'addresses-hub-complete')

  // ---------------------------------------------------------------- fe-contact
  // Reached from the notification hub's own contact task row, not from the
  // addresses hub — CONTACT_PARTY is declared outside PARTIES
  // (addresses/parties.js:59-70) and has its own page and template. It renders a
  // flat radio list of the whole book with no search and no pagination
  // (features/contact/controller.js:76-79, template.njk).
  await page.goto(at('consignment/contact/select'))
  await expect(page).toHaveURL(
    onPage('consignment/contact/select')
  )
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Contact address for consignment'
    })
  ).toBeVisible()
  await shoot(page, 'contact')

  // NOT SHOT, deliberately: a validation error on the contact page. Continuing
  // with nothing selected is ALLOWED here — `oneOf` permits '' (lib/validate/
  // validators.js:114-121) and the comment at features/contact/controller.js:29-32
  // says so outright: the trader returns to the hub with the task incomplete.
  // The only way to raise 'Select a contact address' is to post a value that is
  // not in the offered list, which no user interaction can produce. A stated
  // absence, not a missing picture.
})
