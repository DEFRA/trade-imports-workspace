//
// Design Release 1 — the consignment addresses slice.
//
// DR1 is the ROOT mount of the GB-notification-service prototype: one router,
// four journeys, and DR1 is the one with no path prefix (app/routes.js:7 builds
// the router; routes.js:10994-10997 copy the whole stack under the other three
// base paths). Every path below is therefore a bare path — /roles-and-addresses,
// never /design-release-2.1/roles-and-addresses — and the views are the loose
// .html files at the root of app/views.
//
// Screens this file owns, recorded without the dr1- prefix (the harness adds it):
//
//   roles-and-addresses              app/views/roles-and-addresses.html
//   consignment-address-select       app/views/consignment-address-select.html
//   cph-number                       app/views/cph-number.html
//   permanent-address-animals        app/views/permanent-address-animals.html
//   contact-address-for-consignment  app/views/contact-address-for-consignment.html
//
// The five address-book screens are a different slice and are not recorded here.
//
// ONE SCREEN, FIVE PARTIES. /place-of-origin, /consignor-or-exporter,
// /consignee, /importer and /place-of-destination are the same handler and the
// same view: routes.js:10914-10918 registers handleConsignmentAddressSelectGet
// for every section marked selectable:true in
// app/data/consignment-address-sections.js, and renderConsignmentAddressSelectPage
// (routes.js:3569) renders consignment-address-select.html with a heading and
// hint taken from that section. The implementation side has five separate picker
// screens, so one picture would leave four headings unrepresented. The screen is
// recorded once under its own id from /place-of-origin, and the other four are
// recorded as named states. Coverage attributes <screen>-<state> to <screen> by
// prefix, so this costs no coverage and gives the pairing a picture per party.
//
// THE "ADD A NEW ADDRESS" SEAM. routes.js:3598-3600 sets addAddressHref to
// `/address-book/add?from=<section.id>` for every session that is not DR2.1, and
// the view renders it as a secondary button-link reading "Add a new address".
// Every picker shot below therefore contains that seam. This spec photographs
// it and does not follow it — the address book is another slice.
//
// NOTHING HERE ASSERTS THE APPLICATION IS CORRECT. Every assertion exists only
// to prove the picture is of the page it claims to be of.
//
// Nothing is masked. DR1's notification reference is the fixed literal
// 'GBN-AG-26-7K8M2P' (routes.js:56-57), not minted per run, so the status bar
// is byte-identical between runs. The arrival date, which does move, is not on
// any page in this slice.
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

//
// The Prototype Kit bounces nodemon while it recompiles, so the first
// navigation of the file gets a long retry window rather than a 30s timeout.
//
async function openSeededCattleJourney (page) {
  await expect(async () => {
    await page.goto('/prototype/reason-for-import')
    await expect(page).toHaveURL(/\/reason-for-import$/)
  }).toPass({ timeout: 240_000 })

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Main reason for import')
}

//
// Pick the first address in a picker's table and submit.
//
// Deliberately NOT via the search box. That box is a live client-side row
// filter (app/assets/javascripts/consignment-address-search.js:68-78 sets
// row.hidden from data-search-text on every input event), so anything that
// types into every field on the page hides the row it is about to pick.
//
async function selectFirstAddress (page, fieldName, hubHeading) {
  await page.locator(`input[name="${fieldName}"]`).first().check()
  await page.getByRole('button', { name: 'Save and continue', exact: true }).click()
  await expect(page).toHaveURL(/\/roles-and-addresses$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(hubHeading)
}

//
// Open one hub row by its own accessible name.
//
// Deliberately NOT "the next link in the page". An answered row still renders a
// link — roles-and-addresses.html:66 renders "Change" in the same container the
// unanswered row uses for "Add …" — so a loop driving off any link reopens the
// first section for ever. Each section's linkText is unique
// (consignment-address-sections.js), so exact names are enough.
//
async function openHubRow (page, linkText, path, heading) {
  await page.getByRole('link', { name: linkText, exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`${path}$`))
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading)
}

//
// TEST 1 — a cattle consignment, commodity code 0102.
//
// 0102's section set is the five parties plus CPH
// (consignment-address-sections.js:107-115), so this journey reaches every
// party picker, the hub in each of its unanswered/shortcut/answered renderings,
// the CPH page and the contact address page.
//
// /prototype/reason-for-import (routes.js:9536) is DR1's own seeding route: it
// sets France, cattle, 0102, five animals and slaughter, then redirects. It is
// used instead of walking /origin-of-the-import and /what-are-you-importing
// because none of those screens belongs to this slice and driving two search
// widgets to reach a hub is failure surface this spec does not need. The hub it
// produces is a real cattle consignment, not an empty session.
//
test('the consignment addresses slice for a cattle consignment (0102)', async ({ page }) => {
  await openSeededCattleJourney(page)

  // The hub, before anything is answered: six sections, each offering "Add …".
  await page.goto('/roles-and-addresses')
  await expect(page).toHaveURL(/\/roles-and-addresses$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Consignment addresses')
  await expect(page.getByRole('link', { name: 'Add a place of origin', exact: true })).toBeVisible()
  await record.record(page, 'roles-and-addresses')

  // Contact address, shot here while nothing is selected on it. It has no
  // journey guard (routes.js:10540) and its radio list is independent of the
  // party addresses, so this is the page empty, as the design defines it.
  await page.goto('/contact-address-for-consignment')
  await expect(page).toHaveURL(/\/contact-address-for-consignment$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contact address for consignment')
  await record.record(page, 'contact-address-for-consignment')

  // Party picker 1 of 5 — the screen under its own id.
  await page.goto('/place-of-origin')
  await expect(page).toHaveURL(/\/place-of-origin$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Place of origin')
  await record.record(page, 'consignment-address-select')

  // The picker with its result list narrowed. The ?search= query is handled
  // server-side (buildConsignmentAddressResults, routes.js:3550-3556), so this
  // state is deterministic and needs no typing into the live filter box.
  await page.goto('/place-of-origin?search=Romania')
  await expect(page).toHaveURL(/\/place-of-origin\?search=Romania$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Place of origin')
  await expect(page.locator('#place-of-origin-search')).toHaveValue('Romania')
  await record.record(page, 'consignment-address-select-search-filtered')

  await page.goto('/place-of-origin')
  await expect(page).toHaveURL(/\/place-of-origin$/)
  await selectFirstAddress(page, 'placeOfOriginAddressId', 'Consignment addresses')

  // The hub's first shortcut. Once a place of origin is answered and the
  // consignor is not, the consignor row offers "Same as place of origin"
  // (roles-and-addresses.html:88-91). That window closes the moment the
  // consignor is answered, so it is shot now.
  await expect(page.getByRole('button', { name: 'Same as place of origin', exact: true })).toBeVisible()
  await record.record(page, 'roles-and-addresses-same-as-place-of-origin')

  // Party picker 2 of 5.
  await openHubRow(page, 'Add a consignor', '/consignor-or-exporter', 'Consignor')
  await record.record(page, 'consignment-address-select-consignor-or-exporter')
  await selectFirstAddress(page, 'consignorAddressId', 'Consignment addresses')

  // Party picker 3 of 5.
  await openHubRow(page, 'Add a consignee', '/consignee', 'Consignee')
  await record.record(page, 'consignment-address-select-consignee')
  await selectFirstAddress(page, 'consigneeAddressId', 'Consignment addresses')

  // The hub's second shortcut, and a different one: with a consignee answered,
  // both the importer and the place of destination offer "Same as consignee"
  // (roles-and-addresses.html:92-98). Two rows carry it at once, which the
  // first shortcut state cannot show.
  await expect(page.getByRole('button', { name: 'Same as consignee', exact: true }).first()).toBeVisible()
  await record.record(page, 'roles-and-addresses-same-as-consignee')

  // Party picker 4 of 5.
  await openHubRow(page, 'Add an importer', '/importer', 'Importer')
  await record.record(page, 'consignment-address-select-importer')
  await selectFirstAddress(page, 'importerAddressId', 'Consignment addresses')

  // Party picker 5 of 5.
  await openHubRow(page, 'Add a place of destination', '/place-of-destination', 'Place of destination')
  await record.record(page, 'consignment-address-select-place-of-destination')
  await selectFirstAddress(page, 'placeOfDestinationAddressId', 'Consignment addresses')

  // CPH. County, parish and holding are three always-visible inputs of one
  // govukDateInput (partials/cph-number-input.html), not a conditional reveal
  // and not three pages, so there is no "revealed" state of this page to shoot.
  await openHubRow(page, 'Add a CPH number', '/cph-number', 'Add the county parish holding number (CPH)')
  await record.record(page, 'cph-number')

  // What the page does hide by default is its guidance disclosure. That content
  // is only ever visible in this state, so it gets its own picture.
  await page.locator('details.app-cph-number-page__details > summary').click()
  await expect(
    page.getByText('A county parish holding (CPH) number is a unique 9-digit number')
  ).toBeVisible()
  await record.record(page, 'cph-number-details-open')

  await page.locator('#cph-number-county').fill('12')
  await page.locator('#cph-number-parish').fill('345')
  await page.locator('#cph-number-holding').fill('6789')
  await page.getByRole('button', { name: 'Save and continue', exact: true }).click()
  await expect(page).toHaveURL(/\/roles-and-addresses$/)

  // The hub with every row answered — the inset-text rendering with "Change",
  // which is a different layout from the unanswered hub above.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Consignment addresses')
  await expect(page.getByText('12/345/6789')).toBeVisible()
  await record.record(page, 'roles-and-addresses-answered')
})

//
// TEST 2 — a dog consignment, commodity code 01061900.
//
// A SECOND TEST, AND ON PURPOSE. Playwright's page fixture is test-scoped, so
// this test gets a new browser context, new cookies and an empty session; it
// drives itself from the entry point again rather than continuing test 1.
//
// It has to. The two commodity-dependent rows are mutually exclusive within one
// consignment: CPH belongs to 0102/0103 and the default set, permanent address
// only to 01061900 (consignment-address-sections.js:100-146), and the
// permanent-address row is dropped again unless a selected species is one whose
// commodity sets requiresPermanentAddress (routes.js:2033-2036). Adding dog to
// the cattle session would produce a two-commodity hub carrying both rows —
// a union state, not either of the two the design defines.
//
test('the permanent address screen for a dog consignment (01061900)', async ({ page }) => {
  await openSeededCattleJourney(page)

  // Swap cattle for dog. The seeding route leaves an origin in the session, so
  // /what-are-you-importing is reachable (redirectIfNoOrigin, routes.js:9286)
  // and only the commodity has to change.
  await page.goto('/what-are-you-importing')
  await expect(page).toHaveURL(/\/what-are-you-importing$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What are you importing?')

  await page.getByRole('button', { name: 'Clear all', exact: true }).click()

  // Three characters is the search widget's minimum
  // (commodity-search.js:5, MIN_SEARCH_LENGTH).
  await page.locator('#commodity-search').fill('Dog')

  // click() + a locator-based toBeChecked(), not check(). Ticking a row calls
  // refreshUi(), which rewrites results.innerHTML (commodity-search.js:501-509,
  // 640), so the element clicked is replaced during the action. A locator
  // assertion re-resolves on every poll; a handle-based check() is racing a
  // detached node.
  await page.locator('#commodity-species-dog-canis-familiaris').click()
  await expect(page.locator('#commodity-species-dog-canis-familiaris')).toBeChecked()

  // The open results panel overlays the buttons and swallows the mousedown, so
  // it is dismissed before anything is clicked (Escape closes it —
  // commodity-search.js:666-670).
  await page.locator('#commodity-search').press('Escape')

  // The widget posts a hidden field, and that field is seeded with the literal
  // "[]" — so "not empty" passes before anything is chosen.
  await expect(page.locator('input[name="selectedSpecies"]')).not.toHaveValue(/^(\[\])?$/)
  await expect(page.locator('input[name="selectedSpecies"]')).toHaveValue(/dog-canis-familiaris/)

  await page.getByRole('button', { name: 'Save and continue', exact: true }).click()
  await expect(page).toHaveURL(/\/reason-for-import$/)

  // Re-entry is the one reason with no conditional reveal to fill in
  // (app/data/import-reasons.js), which keeps this pass-through minimal.
  await page.getByRole('radio', { name: 'Re-entry', exact: true }).check()
  await page.getByRole('button', { name: 'Save and continue', exact: true }).click()
  await expect(page).toHaveURL(/\/consignment-details$/)

  // One animal, so the permanent address page renders exactly one card.
  // buildPermanentAddressAnimalList (routes.js:2351) builds one card per animal
  // from numberOfAnimals, and permanent-address-animals.html:66 falls back to
  // "Add the number of animals on consignment details" when there are none.
  await page.locator('#number-of-animals-dog-canis-familiaris').fill('1')
  await page.getByRole('button', { name: 'Save and continue', exact: true }).click()
  await expect(page).toHaveURL(/\/animal-identification-details$/)

  // The hub for 01061900: a Permanent address row, and no CPH row. This is the
  // picture that shows the row set is commodity-dependent.
  await page.goto('/roles-and-addresses')
  await expect(page).toHaveURL(/\/roles-and-addresses$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Consignment addresses')
  await expect(page.getByRole('link', { name: 'Add a permanent address', exact: true })).toBeVisible()
  await record.record(page, 'roles-and-addresses-permanent-address')

  // /permanent-address redirects to /permanent-address/select (routes.js:10801),
  // and so does /permanent-address/enter-address (routes.js:10900), so
  // permanent-address-animals.html is the only permanent-address page DR1 shows.
  await page.getByRole('link', { name: 'Add a permanent address', exact: true }).click()
  await expect(page).toHaveURL(/\/permanent-address\/select$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Permanent address')
  await expect(page.getByRole('heading', { level: 3, name: 'Canis familiaris 1' })).toBeVisible()
  await record.record(page, 'permanent-address-animals')

  // "Enter a new address" is a radio conditional carrying a whole address form
  // (partials/permanent-address-new-address-fields.html, attached at
  // routes.js:2503-2507). It has no view of its own, so it is only ever visible
  // as a state of this page.
  await page.getByRole('radio', { name: 'Enter a new address', exact: true }).check()
  await expect(page.getByLabel('Name or organisation name')).toBeVisible()
  await record.record(page, 'permanent-address-animals-new-address-revealed')
})
