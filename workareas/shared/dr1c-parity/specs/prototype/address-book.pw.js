//
// Design Release 1 — address book slice.
//
// Five screens: dr1-address-book (the list), dr1-address-book-add (the address
// type chooser), dr1-address-book-lookup (search for an address, with manual
// entry as a reveal), dr1-address-book-view (one saved address) and
// dr1-address-book-edit (the same view as the add flow, in edit mode).
//
// DR1 is the ROOT mount of the prototype's single router, so every path here is
// unprefixed. The address book exists under every release prefix — copyRouterStack
// copies it like every other route — so a picture taken at
// /design-release-2/address-book or /design-release-2.1/address-book is a picture
// of a different application, and on this slice that mistake is especially easy
// to make.
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
// keeps the address-book flow in the session: the type chosen on
// /address-book/add is what lets /address-book/add/lookup render at all
// (redirectIfNoAddressBookAddressType, routes.js:8546), and a second test()
// would start from an empty session and be redirected away.
test('the address book slice', async ({ page }) => {
  // The GOV.UK Prototype Kit bounces nodemon while it recompiles, so the first
  // navigation on this side can meet a server that is restarting. This spec
  // sorts first alphabetically among the prototype specs, so it is the likely
  // one to meet a cold server. Retry until the list renders.
  await expect(async () => {
    await page.goto('/address-book', { waitUntil: 'domcontentloaded' })
    await expect(
      page.getByRole('heading', { level: 1, name: 'Address book' })
    ).toBeVisible({ timeout: 5_000 })
  }).toPass({ timeout: 240_000 })

  await expect(page).toHaveURL(/\/address-book$/)

  // Nothing on any page in this slice is minted per run, so there is nothing to
  // mask. The rows come from the static fixture app/data/address-book.js, whose
  // ids are `${address.id}-${index}` over a fixed array; the 500 lookup
  // addresses in app/data/address-book-lookup-addresses.js are generated from
  // index arithmetic with no Math.random and no Date; and the address-book views
  // carry no notification reference (the view models never pass one, and
  // layouts/main.html does not print one).
  await record.record(page, 'address-book')

  // NOT CAPTURED — address-book-empty and address-book-populated.
  //
  // The picture above IS the populated list, and DR1 has no empty state.
  // getAddressBookAddresses (routes.js:7536) returns session-added addresses
  // concatenated with the static app/data/address-book.js array minus any
  // deleted ids, and that array is non-empty at module load: it is built from
  // consignment-addresses.js, contact-addresses.js and transporters.js and then
  // topped up by ensureCategoryCount to at least 16 + 16 + 8 + 3 entries. There
  // is no seeding route that empties it, so the only way to an empty list is to
  // delete every seeded address one at a time through the view page.
  //
  // Not captured either: a filtered list. The filter search box and Type select
  // are a client-side row filter (app/assets/javascripts/address-book.js,
  // data-module="app-address-book-search") that REPLACES the whole table body —
  // so typing into it would hide the row this spec is about to click. It is
  // deliberately left alone until every row-clicking step below is done, and
  // then not used at all: the frontend has no address book, so there is nothing
  // on the other side for a filter state to be compared against, and the search
  // and Type markup is already in the rendered HTML of the shot above.

  // The view page for one saved address. The id has to be a real one, so click
  // the first row's "View" link rather than guessing a URL (routes.js:10002 ->
  // renderAddressBookViewPage, which redirects to the list for an id it cannot
  // find).
  const firstRow = page.locator('[data-address-row]').first()
  await expect(firstRow).toBeVisible()
  await firstRow.getByRole('link', { name: 'View' }).click()

  await expect(page).toHaveURL(/\/address-book\/[^\/?]+$/)
  await expect(page.locator('.app-address-book-view-page__summary-list')).toBeVisible()
  await expect(
    page.locator('.govuk-summary-list__key', { hasText: 'Name or organisation name' })
  ).toBeVisible()

  await record.record(page, 'address-book-view')

  // The edit page. It renders address-book-lookup.html — the SAME view as the
  // add flow — at routes.js:7877 with isEditMode true, which changes the
  // heading, hides the search and opens the manual fields (routes.js:7881-7889).
  // That is why it is a screen of its own: a picture of the add page would show
  // none of it. Reached by clicking Edit rather than by URL, so the id is real.
  await page.locator('a.app-address-book-view-page__edit-button').click()

  await expect(page).toHaveURL(/\/address-book\/[^\/?]+\/edit$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Edit address and contact details' })
  ).toBeVisible()
  // The three things edit mode changes, asserted before the shot so the picture
  // cannot be mislabelled as the add page.
  await expect(page.locator('#address-lookup-search')).toHaveCount(0)
  await expect(page.locator('#address-book-manual-name')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible()

  await record.record(page, 'address-book-edit')

  // The address type chooser, reached the way a user reaches it — from the
  // "Add a new address" button on the list.
  await page.goto('/address-book')
  await expect(page).toHaveURL(/\/address-book$/)
  await page.locator('a.app-address-book-page__add-button').click()

  await expect(page).toHaveURL(/\/address-book\/add$/)
  // DR1's heading. renderAddressBookAddPage (routes.js:8505) uses
  // 'What is the new address for?' when isDesignRelease2Version is false and
  // 'Choose an address type' when it is true, so this assertion is also the
  // proof that this picture is of the root mount and not of a release prefix.
  await expect(
    page.getByRole('heading', { level: 1, name: 'What is the new address for?' })
  ).toBeVisible()

  await record.record(page, 'address-book-add')

  // The lookup page. Choosing a type here is what gets past
  // redirectIfNoAddressBookAddressType on GET /address-book/add/lookup
  // (routes.js:9795, guard at routes.js:8546) — an answer given to move on, not
  // to dress the picture, and the lookup page below is photographed empty.
  await page.locator('#address-type-place-of-origin').check()
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page).toHaveURL(/\/address-book\/add\/lookup$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Add address details' })
  ).toBeVisible()
  await expect(page.locator('#address-lookup-search')).toBeVisible()
  // The manual fields are present in the DOM but display:none until revealed
  // (app/assets/sass/application.scss:6375), so this really is the empty page.
  await expect(page.locator('#address-book-manual-address')).toHaveClass(
    /app-address-book-lookup-page__manual--hidden/
  )

  await record.record(page, 'address-book-lookup')

  // STATE — the search results panel open.
  //
  // The widget searches the 500 static addresses in
  // app/data/address-book-lookup-addresses.js client-side, needs two characters
  // (MIN_SEARCH_LENGTH) and shows at most eight rows (MAX_RESULTS). 'Germany'
  // matches on the country in each entry's searchText, and the data is generated
  // from index arithmetic, so the eight rows are the same every run.
  await page.locator('#address-lookup-search').fill('Germany')
  await expect(page.locator('#address-lookup-search-results')).toBeVisible()
  await expect(
    page.locator('.app-address-book-lookup-search__option').first()
  ).toBeVisible()

  await record.record(page, 'address-book-lookup-results')

  // Dismiss the panel before touching anything else. This is the search widget
  // the run brief warns about: it posts a hidden input rather than the visible
  // one, and while the results list is open it sits over the buttons and
  // swallows the mousedown (the list preventDefaults mousedown in
  // address-book-lookup-search.js). Escape closes it; clearing the input then
  // fires the input handler, which closes it again and blanks both hidden
  // fields, so the manual shot below is of an untouched form.
  await page.locator('#address-lookup-search').press('Escape')
  await page.locator('#address-lookup-search').fill('')
  await expect(page.locator('#address-lookup-search-results')).toBeHidden()
  await expect(page.locator('input[name="addressLookup"]')).toHaveValue('')
  await expect(page.locator('input[name="addressBookLookupAddressId"]')).toHaveValue('')

  // STATE — the manual-entry reveal open.
  //
  // This is where DR1 states which address fields it collects, so it is the one
  // state on this slice that cannot be skipped. The reveal is a plain button,
  // not a link, and it is the whole of what the partial
  // partials/address-book-manual-address-fields.html renders: name or
  // organisation name, address line 1, address line 2 (optional), town or city,
  // county (optional), postcode or Zip code, country, then a second heading and
  // email address and phone number.
  await page.getByRole('button', { name: 'Enter address manually' }).click()

  await expect(page.locator('#address-book-manual-address')).not.toHaveClass(
    /app-address-book-lookup-page__manual--hidden/
  )
  await expect(page.locator('#address-book-manual-name')).toBeVisible()
  await expect(page.locator('#address-book-manual-address-line-1')).toBeVisible()
  await expect(page.locator('#address-book-manual-country')).toBeVisible()
  await expect(page.locator('#address-book-manual-phone')).toBeVisible()

  await record.record(page, 'address-book-lookup-manual')

  // NOT CAPTURED — app/views/address-book-add-usage.html.
  //
  // It is a root view, so it looks like a DR1 screen, and it is not. GET
  // /address-book/add/usage is gated on the SECOND release flag: routes.js:9879
  // does `if (!res.locals.isDesignRelease2Version) return res.redirect(basePath
  // + '/add')`, and that local is set only by
  // app/lib/design-release-2-version.js:31 and the 2.1 equivalent, never at the
  // root mount. A DR1 user is bounced back to the type chooser every time. The
  // root view exists only because DR2 inherits it — presence of a view is not
  // presence of a screen. Asserted here rather than assumed, and nothing is
  // recorded for it.
  await page.goto('/address-book/add/usage')
  await expect(page).toHaveURL(/\/address-book\/add$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'What is the new address for?' })
  ).toBeVisible()

  // STATE — arriving from a consignment party picker.
  //
  // This is the seam between the address book and the notification journey, and
  // the whole scope question turns on it. The party picker sets its "add an
  // address" link to /address-book/add?from=<section.id> for every session that
  // is not DR2.1 (routes.js:3598-3600), which on DR1 is every session. What the
  // route then does (routes.js:9713-9725) is the evidence: it does NOT render
  // the type chooser. It records where to return to, derives the address type
  // from the section (setAddressBookConsignmentReturn, routes.js:8026, via
  // CONSIGNMENT_SECTION_ADDRESS_TYPE_MAP at routes.js:7982) and redirects
  // straight to the lookup page.
  //
  // The redirect through /address-book/add above has cleared the session, so
  // 'consignee' below can only have come from the ?from= query.
  await page.goto('/address-book/add?from=consignee')

  await expect(page).toHaveURL(/\/address-book\/add\/lookup$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Add address details' })
  ).toBeVisible()
  // The type the journey picked for us, carried in the hidden input the form
  // posts. It is not printed anywhere on the DR1 page, so the DOM is the only
  // place this is visible.
  await expect(page.locator('input[name="addressType"]')).toHaveValue('consignee')
  // And the back link now points at the party picker, not at the address book.
  await expect(page.locator('.govuk-back-link').first()).toHaveAttribute(
    'href',
    '/consignee'
  )

  await record.record(page, 'address-book-add-from-party-picker')
})
