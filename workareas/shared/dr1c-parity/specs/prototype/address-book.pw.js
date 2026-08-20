//
// DR1 slice: the address book — the list, the address-type chooser, the add
// page, one saved address, and the edit page that shares the add page's view
// without being it.
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// prototype is correct. Every step DOES assert that the journey landed where it
// should, and on this slice that matters more than usual, because three of the
// five screens answer a wrong request with a silent redirect rather than an
// error:
//
//   - POST /address-book/add with an address type that is not one of the seven
//     DR1 offers redirects to /address-book and says nothing (app/routes.js,
//     `if (!addressBookAddressTypeValues.includes(validation.value)) return
//     res.redirect(addressBookBasePath)`).
//   - GET /address-book/add/lookup with no address type on the session
//     redirects to /address-book/add (`redirectIfNoAddressBookAddressType`).
//   - GET /address-book/:addressId and /address-book/:addressId/edit both
//     redirect to the list when the id resolves to nothing
//     (`renderAddressBookViewPage`, `renderAddressBookEditPage`).
//
// All three land on a page that renders perfectly well. "Not an error" is
// therefore worth nothing here, and every navigation below asserts the URL it
// expected to reach.
//
// ---------------------------------------------------------------------------
// Why these five screens have never been photographed
// ---------------------------------------------------------------------------
//
// Two earlier comparisons of this prototype excluded everything under
// `address-book` on the reasoning that the address book is mounted outside every
// release and so is one shared page. It is not. app/routes.js builds ONE router
// and lib/version-mount.js `copyRouterStack` copies the whole stack under each
// later release's base path, address book included; the later releases point
// their own service navigation at their own copy; and
// `getAddressBookBasePath` — the helper that reasoning rested on — only decides
// whether hrefs carry a release prefix. So DR1 has an address book of its own,
// at the ROOT URLs, and this file is the first capture of it.
//
// DR1 is the root mount. Every path below is `/address-book...` with no release
// prefix — a path under /design-release-2 or /design-release-2.1 would be a
// picture of a different release filed under DR1's name.
//
// ---------------------------------------------------------------------------
// Recorded by this spec
// ---------------------------------------------------------------------------
//
//   address-book                   the list, as the service navigation opens it
//   address-book-add               "What is the new address for?", nothing chosen
//   address-book-lookup            "Add address details", search empty, manual
//                                  fields closed
//   address-book-view              one saved address
//   address-book-edit              "Edit address and contact details" — the same
//                                  view as the lookup page, rendered with
//                                  isEditMode true: no search box at all, and
//                                  the manual fields already open and filled
//   address-book-lookup-from-party a STATE of address-book-lookup, not a sixth
//                                  screen: the same page reached by the "Add a
//                                  new address" button on a consignment party
//                                  picker, which is the DR1 route into it
//                                  (app/routes.js, `addAddressHref:
//                                  '/address-book/add?from=' + section.id` for
//                                  every session that is not DR2.1)
//
// The list is NOT an empty address book, and DR1 has no empty one to record:
// app/data/address-book.js seeds a fixed set and then tops each category up to
// a minimum, so the address book always opens holding addresses. The seeded
// list IS the default state, which is why it carries no state suffix.
//
// ---------------------------------------------------------------------------
// Widget knowledge, re-derived here rather than imported
// ---------------------------------------------------------------------------
//
// Nothing is imported from the prototype repo — not journey-demo/e2e/journey.js.
// That suite is unmaintained, and a capture built on it is hostage to a test
// nobody runs. What it knows is re-derived below, in the open:
//
//   - The address book LIST has a live filter. app/assets/javascripts/
//     address-book.js re-renders the whole table body on every keystroke in
//     `#address-book-search` and hides the pagination while it does. Typing into
//     it before a shot would photograph a filtered table — a screen the design
//     does not define — and typing into it before clicking a row's "View" link
//     can remove the row being aimed at. Nothing is typed into it here.
//
//   - The LOOKUP page's search is a different widget with the same hazard plus
//     one more. app/assets/javascripts/address-book-lookup-search.js posts two
//     HIDDEN inputs (`addressLookup` and `addressBookLookupAddressId`) rather
//     than the visible box, and its results panel calls preventDefault on
//     mousedown — so a click on a button underneath an open panel reaches
//     nothing at all: no error, no navigation, no POST. Escape is what the
//     widget listens for. This spec photographs that page before anything is
//     typed, so the panel is never opened; the hazard is written down because
//     the next spec to drive this page will meet it.
//
//   - The commodity search on /what-are-you-importing has both hazards, and the
//     party-picker test at the foot of this file does drive it. It is dismissed
//     with Escape and its hidden commodityCode field is asserted, because an
//     empty selection leaves the sibling `selectedSpecies` field holding "[]"
//     and a plain "not empty" check would pass with nothing ticked.
//
//   - The GOV.UK Prototype Kit rewrites its shadow layouts and recompiles its
//     Sass while the server is up, bouncing nodemon. A request landing in that
//     window refuses the connection or renders "Unable to call
//     `govukPhaseBanner`" instead of the page, so the first navigation of every
//     test retries until it settles rather than photograph the kit's own error
//     page under a DR1 name.
//
import { readFileSync } from 'node:fs'

// A spec imports exactly one thing. It lives in the corpus workarea, outside any
// package, so a bare specifier resolves to nothing here — tim hands every spec
// the absolute path to one module carrying what it needs, Playwright's own test
// and expect included, through the capture context.
const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

// The address type chosen on /address-book/add to reach the lookup page. Any of
// the seven in app/data/address-book-address-types.js would do; place of origin
// is first in that list and is the type the party-picker route below suggests
// for itself, so both ways into the lookup page arrive carrying the same one.
const ADDRESS_TYPE = 'place-of-origin'

// DR1 shows eight addresses a page (app/data/address-book.js, `pageSize: 8`) and
// the seeded set is far larger than that, so a full first page is what the
// default list looks like. Counted rather than asserted non-empty: a DR2 render
// of this view filters to one category first, and a category tab would also
// leave the table non-empty.
const PAGE_SIZE = 8

// The seven address types DR1 offers, plus one divider that renders no radio
// (app/data/address-book-address-types.js). DR2 replaces the whole list with
// four categories, so this count is the cheapest proof that the add page opened
// on the root mount.
const DR1_ADDRESS_TYPE_COUNT = 7

// Used only by the party-picker test at the foot of this file.
const COUNTRY = 'France'
const CATTLE = { term: 'Cattle', commodityId: 'cattle', code: '0102' }
const PARTY = {
  section: 'place-of-origin',
  path: '/place-of-origin',
  heading: /place of origin/i
}

// Address ids are seeded slugs today, but nothing stops one carrying a
// regex-significant character, and a URL assertion built by interpolating one
// would then quietly match the wrong thing.
const escapeForUrl = (path) => path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// The kit is still compiling when the first request arrives. Re-request until it
// settles. `/` is the DR1 dashboard (app/views/dashboard.html) and the page the
// service navigation hangs off, so this is both the retry and the way in.
const openDashboard = async (page) => {
  await expect(async () => {
    await page.goto('/')
    await expect(page, 'the DR1 dashboard is the root of the mount').toHaveURL(
      /\/$/,
      { timeout: 5_000 }
    )
    await expect(
      page.locator('#dashboard-page-heading'),
      'the dashboard should render, not the kit error page'
    ).toHaveText(/import notification service/i, { timeout: 5_000 })
  }).toPass({ timeout: 240_000 })
}

// Reach the address book the way DR1 offers it, rather than by typing the URL.
//
// The service navigation's address book href is a fallback in the layout —
// app/views/layouts/main.html sets `navAddressBookHref` to
// `serviceNavAddressBookHref if serviceNavAddressBookHref else "/address-book"`,
// and `serviceNavAddressBookHref` is set only by each later release's
// `setupLocals`. So the bare `/address-book` in that link is DR1's own, and
// asserting it is what says this capture is of the root mount's address book and
// not of a release's copy.
const openAddressBook = async (page) => {
  await openDashboard(page)

  const navLink = page
    .locator('.govuk-service-navigation')
    .getByRole('link', { name: 'Address book', exact: true })

  await expect(
    navLink,
    'DR1 should carry the address book in its service navigation'
  ).toHaveCount(1)
  await expect(
    navLink,
    "the DR1 default is the unprefixed /address-book, not a release's copy"
  ).toHaveAttribute('href', '/address-book')

  await navLink.click()
  await expect(page, 'the service navigation should open the list').toHaveURL(
    /\/address-book$/
  )
  await expect(
    page.locator('.app-address-book-page__heading'),
    'the address book should render its own heading'
  ).toHaveText(/address book/i)
}

// What makes this the DR1 render of app/views/address-book.html rather than the
// DR2 one. The view branches on `isDesignRelease2Version` in three places, and
// all three branches are checked: the modifier class on the page, the category
// tabs, and whether "Filter addresses" is a plain heading or a collapsed
// <details>. A capture that passed only a heading check could be either release.
const expectDr1List = async (page) => {
  await expect(
    page.locator('.app-address-book-page--dr2'),
    'the DR2 modifier class should be absent on the root mount'
  ).toHaveCount(0)
  await expect(
    page.locator('.app-address-book-page__tabs'),
    'DR1 has no category tabs — those are the DR2 render of this view'
  ).toHaveCount(0)
  await expect(
    page.locator('.app-address-book-page__filter-heading'),
    'DR1 shows Filter addresses as a heading, not as a collapsed details'
  ).toBeVisible()
  await expect(
    page.locator('.app-address-book-page__filter-details'),
    'the collapsible filter is the DR2 branch of this view'
  ).toHaveCount(0)
}

// Photographed as the navigation opens it: no search typed, no type filter
// chosen, no success banner left over from a save. All three would be states of
// this page rather than the page.
const expectListUnfiltered = async (page) => {
  await expect(
    page.locator('#address-book-search'),
    'the list should be photographed before its live filter hides any row'
  ).toHaveValue('')
  await expect(
    page.locator('#address-book-type'),
    'no type filter should be applied'
  ).toHaveValue('')
  await expect(
    page.locator('.app-address-book-page__success-banner'),
    'a fresh session has saved nothing, so there should be no success banner'
  ).toHaveCount(0)
}

const addressRows = (page) => page.locator('.app-address-book-table__row')

// The view page's summary list and the edit page's manual fields are two
// renderings of ONE object: app/routes.js builds the summary rows with
// `buildAddressBookViewSummaryRows(details)` and the edit page passes the same
// `details` in as `manualAddress`. So the summary read off the view page is
// exactly what the edit page should be holding, field for field.
//
// Comparing them beats checking that the fields are non-empty, which is what a
// first draft of this spec did and what the seeded data quietly defeats: the
// first address in the book is in Romania, its last line is "507190", and
// `parseAddressLinesForManualForm` recognises neither a UK postcode nor a
// "town, postcode" line in it — so it lands in address line 2 and the postcode
// and town fields are legitimately blank. A "should not be empty" check would
// have failed on a page that was rendering perfectly.
//
// Country is deliberately not in this map. It is a <select> whose options come
// from `buildAddressBookCountryItems`, and a saved country that is not among
// them selects the first option instead — which would be a finding about the
// country list, not about whether the edit page opened holding the address.
const SUMMARY_FIELD_IDS = {
  'Name or organisation name': 'address-book-manual-name',
  'Address line 1': 'address-book-manual-address-line-1',
  'Address line 2 (optional)': 'address-book-manual-address-line-2',
  'Town or city': 'address-book-manual-town-or-city',
  'County (optional)': 'address-book-manual-county',
  'Postcode or Zip code': 'address-book-manual-postcode',
  'Email address': 'address-book-manual-email',
  'Phone number': 'address-book-manual-phone'
}

// The six rows every address has. Address line 2 and the county are rendered
// only when they hold something, so they are not counted.
const ALWAYS_SUMMARISED = 6

const readSummary = async (page) =>
  Object.fromEntries(
    await page
      .locator('.app-address-book-view-page__summary-list .govuk-summary-list__row')
      .evaluateAll((rows) =>
        rows.map((row) => [
          row.querySelector('.govuk-summary-list__key').textContent.trim(),
          row.querySelector('.govuk-summary-list__value').textContent.trim()
        ])
      )
  )

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(() => {
  record.write()
})

test('records the address book list as the service navigation opens it', async ({
  page
}) => {
  await openAddressBook(page)
  await expectDr1List(page)
  await expectListUnfiltered(page)

  // A full page of eight is what the seeded data gives DR1, and the count is
  // what says the server rendered the list rather than the client-side filter
  // having re-rendered it — the filter drops the pagination when it runs.
  await expect(
    addressRows(page),
    'DR1 pages the list at eight rows and the seeded set fills a page'
  ).toHaveCount(PAGE_SIZE)
  await expect(
    page.locator('[data-address-book-results-count]'),
    'the results count should describe the first server-rendered page'
  ).toHaveText(/showing 1-8 of \d+/i)
  await expect(
    page.locator('.app-address-book-page__pagination'),
    'the pagination should still be shown, which the live filter would hide'
  ).toBeVisible()

  const row = await record.record(page, 'address-book')
  expect(row.title, 'the screen should have a title to file it under').toBeTruthy()
})

test('records the address type chooser', async ({ page }) => {
  await openAddressBook(page)

  await page.locator('.app-address-book-page__add-button').click()
  await expect(
    page,
    'the list should open the address type chooser'
  ).toHaveURL(/\/address-book\/add$/)

  // "What is the new address for?" is DR1's heading; DR2 renders the same view
  // headed "Choose an address type" over four categories instead of seven types
  // (app/routes.js, renderAddressBookAddPage). Heading and count together are
  // what pin this to the root mount.
  await expect(
    page.locator('.app-address-book-add-page__heading'),
    'DR1 heads this page with the question, not with "Choose an address type"'
  ).toHaveText(/what is the new address for\?/i)
  await expect(
    page.locator('.app-address-book-add-page__caption')
  ).toHaveText(/add a new address/i)
  await expect(
    page.locator('input[name="addressType"]'),
    'DR1 offers seven address types; DR2 offers four categories'
  ).toHaveCount(DR1_ADDRESS_TYPE_COUNT)

  // Photographed empty. GET /address-book/add clears the previous answer from
  // the session before rendering, so nothing should be checked and no error
  // summary should be present.
  await expect(
    page.locator('input[name="addressType"]:checked'),
    'the page should be photographed with nothing chosen'
  ).toHaveCount(0)
  await expect(
    page.locator('.govuk-error-summary'),
    'nothing has been submitted, so there should be no error summary'
  ).toHaveCount(0)

  const row = await record.record(page, 'address-book-add')
  expect(row.title, 'the screen should have a title to file it under').toBeTruthy()
})

test('records the add address page, reached by choosing an address type', async ({
  page
}) => {
  await openAddressBook(page)
  await page.locator('.app-address-book-page__add-button').click()
  await expect(page).toHaveURL(/\/address-book\/add$/)

  // The only way onto the lookup page other than arriving from a party picker.
  // With no type on the session GET /address-book/add/lookup bounces straight
  // back here, and an unrecognised type posts back to the list — so landing on
  // /address-book/add/lookup is the whole assertion.
  await page.locator(`#address-type-${ADDRESS_TYPE}`).check()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(
    page,
    'a chosen address type should open the add address page'
  ).toHaveURL(/\/address-book\/add\/lookup$/)

  await expect(
    page.locator('.app-address-book-lookup-page__heading'),
    'the add flow heads this view "Add address details"'
  ).toHaveText(/add address details/i)
  await expect(
    page.locator('input[name="addressType"]'),
    'the chosen type should be carried on the hidden field this page posts'
  ).toHaveValue(ADDRESS_TYPE)

  // The four things that make this the ADD render of address-book-lookup.html
  // rather than the edit render. The edit page is the same view with isEditMode
  // and hideSearch true, and it renders none of these.
  await expect(
    page.locator('#address-lookup-search'),
    'the add page offers a search for an address'
  ).toBeVisible()
  await expect(
    page.locator('.app-address-book-lookup-page__manual-toggle'),
    'the add page offers "Enter address manually" as a way in'
  ).toBeVisible()
  await expect(
    page.locator('.app-address-book-lookup-page__continue-button'),
    'the add page saves and continues'
  ).toHaveText(/save and continue/i)
  await expect(
    page.locator('.app-address-book-lookup-page__cancel-button'),
    'with nothing to return to, cancelling returns to the address book'
  ).toHaveText(/cancel and return to address book/i)

  // Photographed empty, before the search widget is touched. Its results panel
  // filters live and overlays the page, so a shot taken after typing would be of
  // a screen the design does not define. The manual fields are hidden on arrival
  // and stay hidden here — open, they are a state of this page and belong in
  // their own capture, not in the picture of the page itself.
  await expect(
    page.locator('#address-lookup-search'),
    'the search should be photographed before anything is typed into it'
  ).toHaveValue('')
  await expect(
    page.locator('.app-commodity-search__results'),
    'the results panel should not be open'
  ).toBeHidden()
  await expect(
    page.locator('input[name="addressBookLookupAddressId"]'),
    'no address has been picked, so the hidden field it posts should be empty'
  ).toHaveValue('')
  await expect(
    page.locator('#address-book-manual-address'),
    'the manual fields are a reveal on this page and are closed on arrival'
  ).toBeHidden()

  const row = await record.record(page, 'address-book-lookup')
  expect(row.title, 'the screen should have a title to file it under').toBeTruthy()
})

test('records one saved address', async ({ page }) => {
  await openAddressBook(page)
  await expectListUnfiltered(page)

  // Clicked rather than guessed. The route takes a real address id and redirects
  // to the list for one it cannot resolve, so a URL assembled by hand would
  // photograph the list again under the view page's name. Nothing is typed into
  // the list's search first: it re-renders the table body on every keystroke and
  // would remove the row being aimed at.
  const first = addressRows(page).first()
  await expect(first, 'the list should have a row to open').toBeVisible()

  // Both of these are read while the list is still on screen. A locator scoped
  // to a row re-resolves against whatever page is loaded when it is used, so
  // reading the row's name after the click would look for a table cell on the
  // view page and find nothing.
  const viewHref = await first.getByRole('link', { name: 'View' }).getAttribute('href')
  const rowName = (await first.locator('td').first().innerText()).trim()

  expect(viewHref, 'each row should link to the address').toMatch(
    /^\/address-book\/[^/]+$/
  )
  expect(rowName, 'the row should name the address it opens').toBeTruthy()

  await first.getByRole('link', { name: 'View' }).click()
  await expect(
    page,
    'the row should open its own address, not redirect back to the list'
  ).toHaveURL(new RegExp(`${escapeForUrl(viewHref)}$`))

  // The page is headed with the address's name, so there is no fixed string to
  // check. What can be checked is that the heading is the name in the row that
  // was clicked — which is the difference between a picture of this address and
  // a picture of some other one.
  await expect(
    page.locator('.app-address-book-view-page__heading'),
    'the page should be headed with the address that was opened'
  ).toHaveText(rowName)

  await expect(
    page.locator('.app-address-book-view-page__summary-list .govuk-summary-list__row'),
    'the address should be shown as a summary list'
  ).not.toHaveCount(0)
  await expect(
    page.locator('.app-address-book-view-page__edit-button'),
    'an address book entry can be edited'
  ).toBeVisible()
  await expect(
    page.locator('.app-address-book-view-page__delete-button'),
    'an address book entry can be deleted'
  ).toBeVisible()

  const row = await record.record(page, 'address-book-view')
  expect(row.title, 'the screen should have a title to file it under').toBeTruthy()
})

test('records the edit page, which shares the add page view but is not the add page', async ({
  page
}) => {
  await openAddressBook(page)
  await expectListUnfiltered(page)

  const first = addressRows(page).first()
  const viewPath = await first.getByRole('link', { name: 'View' }).getAttribute('href')
  expect(viewPath, 'each row should link to the address').toMatch(
    /^\/address-book\/[^/]+$/
  )

  // Asserted rather than read back off the page: page.url() can still hold the
  // list while the click's navigation is in flight, and a path read a moment too
  // early would send the rest of this test at the wrong address.
  await first.getByRole('link', { name: 'View' }).click()
  await expect(page, 'the row should open its own address').toHaveURL(
    new RegExp(`${escapeForUrl(viewPath)}$`)
  )

  const addressName = (
    await page.locator('.app-address-book-view-page__heading').innerText()
  ).trim()
  expect(addressName, 'the address should have a name to check against').toBeTruthy()

  // Read off the page it is about to leave, so the edit page can be checked
  // against the address that was actually open rather than against a guess.
  const summary = await readSummary(page)
  expect(
    Object.keys(summary).filter((key) => SUMMARY_FIELD_IDS[key]).length,
    'the view page should summarise every field the edit page has'
  ).toBeGreaterThanOrEqual(ALWAYS_SUMMARISED)
  expect(
    summary['Name or organisation name'],
    'the address should have a name, or an all-blank edit page would pass'
  ).toBeTruthy()

  await page.locator('.app-address-book-view-page__edit-button').click()
  await expect(
    page,
    'Edit should open the edit page for the address that was open'
  ).toHaveURL(new RegExp(`${escapeForUrl(viewPath)}/edit$`))

  // Both pages render app/views/address-book-lookup.html. Everything below is
  // the difference, and it is why one picture of the add page cannot stand in
  // for this one: renderAddressBookEditPage passes isEditMode true, hideSearch
  // true and showManualAddress true, which removes the search block and the
  // manual toggle from the markup entirely and opens the fields already filled.
  await expect(
    page.locator('.app-address-book-lookup-page__heading'),
    'the edit page is headed "Edit address and contact details"'
  ).toHaveText(/edit address and contact details/i)
  await expect(
    page.locator('#address-lookup-search'),
    'hideSearch removes the search block from the edit page altogether'
  ).toHaveCount(0)
  await expect(
    page.locator('.app-address-book-lookup-page__manual-toggle'),
    'there is no "Enter address manually" toggle when the fields are already open'
  ).toHaveCount(0)
  await expect(
    page.locator('#address-book-manual-address'),
    'the manual fields are open on arrival, not revealed'
  ).toBeVisible()
  await expect(
    page.locator('.app-address-book-lookup-page__continue-button'),
    'the edit page saves changes rather than saving and continuing'
  ).toHaveText(/save changes/i)
  await expect(
    page.locator('.app-address-book-lookup-page__cancel-button'),
    'the edit page cancels back to the address rather than to the address book'
    // A string matcher, not an anchored regex: govukButton renders its label on
    // its own line, so the raw textContent a regex sees is "\n  Cancel\n" and
    // /^cancel$/i would never match. A string is whitespace-normalised, which is
    // what makes "Cancel" distinguishable from "Cancel and return to ...".
  ).toHaveText('Cancel')

  // Open AND filled with THIS address. Open but empty would be a different
  // screen, and would mean the edit page had failed to resolve the entry.
  await expect(
    page.locator('#address-book-manual-name'),
    'the fields should already hold the address that was opened'
  ).toHaveValue(addressName)
  for (const [key, value] of Object.entries(summary)) {
    const field = SUMMARY_FIELD_IDS[key]
    if (!field) continue

    await expect(
      page.locator(`#${field}`),
      `"${key}" should have opened holding what the view page showed`
    ).toHaveValue(value)
  }

  // Photographed as it opens — nothing is typed into it, and nothing is
  // submitted. The prefilled fields are the page, not a half-filled form.
  await expect(
    page.locator('.govuk-error-summary'),
    'nothing has been submitted, so there should be no error summary'
  ).toHaveCount(0)

  const row = await record.record(page, 'address-book-edit')
  expect(row.title, 'the screen should have a title to file it under').toBeTruthy()
})

// ---------------------------------------------------------------------------
// The party-picker route into the address book
// ---------------------------------------------------------------------------
//
// Last on purpose. A serial describe block turns one failure into several, and
// this is the only test here that has to walk the journey — so a break in the
// walk cannot cost any of the five screens above.
//
// It records a STATE of address-book-lookup rather than a screen: the same page,
// reached the way a user adding an address a party picker does not have reaches
// it. That route is the enumerator's claim that the address book is part of
// DR1's journey rather than a shelf beside it, and it has never been checked
// against a running application. The link is clicked rather than the URL typed,
// because "the picker offers this href" is half of what is being recorded.

// Two search widgets stand between the start of the journey and a party picker.
// The handling below is re-derived from the widgets' own source, not imported —
// it duplicates addresses.pw.js almost line for line, and the duplication is
// unavoidable: a spec lives outside any package and can import exactly one
// module. Any change to a widget belongs in both files in the same edit.
const startJourney = async (page) => {
  await expect(async () => {
    await page.goto('/create-notification')
    await expect(page).toHaveURL(/\/origin-of-the-import$/, { timeout: 5_000 })
    await expect(page.locator('main h1')).toHaveText(/origin of the import/i, {
      timeout: 5_000
    })
  }).toPass({ timeout: 240_000 })
}

const continueOn = async (page) => {
  const action = page.locator('button[name="action"][value="continue"]')
  if (await action.count()) {
    await action.first().click()
    return
  }
  await page
    .getByRole('button', { name: /save and continue|continue/i })
    .first()
    .click()
}

// The country a user sees is a search box; the field that posts is a hidden
// input the box writes to. Options are stamped with data-country by
// app/assets/javascripts/country-search.js, so the choice is made by value
// rather than by rendered text.
const chooseCountry = async (page, country) => {
  await page.locator('#country-of-origin').fill(country)

  const option = page.locator(
    `.app-country-search__option[data-country="${country}"]`
  )
  await expect(
    option,
    `"${country}" should appear in the country results`
  ).toBeVisible()
  await option.click()

  await expect(
    page.locator('input[name="countryOfOrigin"]'),
    'the search widget should have written the country into the field that posts'
  ).toHaveValue(country)
}

// The commodity search writes hidden inputs too. Its results panel overlays the
// buttons and swallows the mousedown, so it is dismissed with Escape before
// continuing — a click on "Save and continue" while it is open reaches nothing
// at all. The commodity CODE is asserted rather than "something is selected",
// because the sibling selectedSpecies field holds "[]" when nothing is ticked
// and would pass a non-empty check.
const chooseCommodity = async (page, { term, commodityId, code }) => {
  const search = page.locator('.app-commodity-search__input').first()
  await search.fill(term)

  const species = page.locator(
    `input[name="commodity-selection"][data-commodity-id="${commodityId}"]:not([disabled])`
  )
  await expect(
    species.first(),
    `"${term}" should return a selectable species under the ${commodityId} commodity`
  ).toBeVisible()
  await species.first().check()

  await search.press('Escape')
  await expect(
    page.locator('.app-commodity-search__results'),
    'the results panel should close, or it swallows the click on Continue'
  ).toBeHidden()

  await expect(
    page.locator('input[name="commodityCode"]'),
    'the search widget should have written the commodity code into the field that posts'
  ).toHaveValue(code)
}

test('records the add address page reached from a consignment party picker', async ({
  page
}) => {
  await startJourney(page)

  await chooseCountry(page, COUNTRY)
  await page.locator('input[name="regionOfOriginRequired"][value="No"]').check()
  await continueOn(page)
  await expect(
    page,
    'origin-of-the-import should advance to what-are-you-importing'
  ).toHaveURL(/\/what-are-you-importing$/)

  await chooseCommodity(page, CATTLE)
  await continueOn(page)
  await expect(
    page,
    'what-are-you-importing should advance to reason-for-import'
  ).toHaveURL(/\/reason-for-import$/)

  // Which party pickers exist is decided by the commodity, and an inactive one
  // redirects to the addresses hub rather than erroring. Cattle keeps the place
  // of origin, so landing on the path is the proof the walk arrived under the
  // intended commodity.
  await page.goto(PARTY.path)
  await expect(
    page,
    `${PARTY.path} should be an active party for cattle, not redirect to the hub`
  ).toHaveURL(new RegExp(`${PARTY.path}$`))
  await expect(page.locator('main h1')).toHaveText(PARTY.heading)

  // The claim being recorded, before the click that follows it: for every
  // session that is not DR2.1, the picker's "Add a new address" button points at
  // DR1's own address book, carrying the section it came from.
  const addButton = page.locator(
    '.app-consignment-address-select-page__add-button'
  )
  await expect(
    addButton,
    'the party picker should offer to add an address it does not have'
  ).toBeVisible()
  await expect(
    addButton,
    'DR1 sends the party picker into the address book, tagged with the section'
  ).toHaveAttribute('href', `/address-book/add?from=${PARTY.section}`)

  // Arriving with a `from` skips the address type chooser: the section implies
  // the type, so /address-book/add redirects straight to the lookup page.
  await addButton.click()
  await expect(
    page,
    'the party picker should land on the add address page, past the type chooser'
  ).toHaveURL(/\/address-book\/add\/lookup$/)
  await expect(
    page.locator('.app-address-book-lookup-page__heading')
  ).toHaveText(/add address details/i)

  // What makes this a state worth its own picture rather than a second copy of
  // address-book-lookup: the page knows where it came from, so both ways out of
  // it point back at the party picker instead of at the address book.
  await expect(
    page.locator('.govuk-back-link'),
    'the back link should return to the party picker'
  ).toHaveAttribute('href', PARTY.path)
  await expect(
    page.locator('.app-address-book-lookup-page__cancel-button'),
    'cancelling from here is not the "return to address book" of the add flow'
  ).toHaveText(/cancel and return to dashboard/i)
  await expect(
    page.locator('input[name="addressType"]'),
    'the section should have suggested its own address type'
  ).toHaveValue(ADDRESS_TYPE)

  // Photographed empty, like the add page it is a state of.
  await expect(
    page.locator('#address-lookup-search'),
    'the search should be photographed before anything is typed into it'
  ).toHaveValue('')
  await expect(
    page.locator('#address-book-manual-address'),
    'the manual fields are closed on arrival'
  ).toBeHidden()

  await record.record(page, 'address-book-lookup-from-party')
})
