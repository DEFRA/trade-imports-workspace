//
// DR1 slice: consignment parties — the addresses hub, the address picker every
// role shares, permanent address, and the contact address for the consignment.
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// prototype is correct. Every navigation does assert that it landed where it
// should, because a mislabelled capture is worse than a missing one — and on
// this slice a wrong landing is silent: every inactive role page answers with a
// redirect to the hub rather than an error, so a capture taken without checking
// the URL would be a second photograph of the hub filed under a role's name.
//
// DR1 is the ROOT URLs. app/routes.js is one router mounted at root and
// re-mounted under /design-release-2 and /design-release-2.1; the root mount is
// DR1, and app/views/*.html (not the release subfolders) are its views.
//
// It borrows nothing from the prototype's own journey-demo/e2e/journey.js: that
// suite is unmaintained, and a capture built on it is hostage to a test nobody
// runs. The widget handling is here, in the open.
//
// cph-number belongs to origin-and-reason.pw.js. It is filled here — the hub is
// not complete without it — but never photographed.
//
import { readFileSync } from 'node:fs'

// A spec imports exactly one thing. It lives in the corpus workarea, outside
// any package, so a bare specifier resolves to nothing here — tim hands every
// spec the absolute path to one module carrying what it needs, Playwright's own
// test and expect included, through the capture context.
const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

const COUNTRY = 'France'

// Which roles the hub offers is decided by the commodity, not by the journey,
// and no single commodity offers all of them. So this slice needs two.
//
// Cattle (CN 0102) offers the five selectable roles plus the CPH number, and is
// the commodity the rest of the corpus uses — so the hub and the shared picker
// are captured under it.
//
// Dog (CN 01061900, requiresPermanentAddress) reaches the permanent-address
// section, which cattle cannot: app/data/consignment-address-sections.js lists
// that section for 01061900 alone, and routes.js then drops it again unless a
// chosen species carries requiresPermanentAddress — which under 01061900 only
// dog and ferret do. Cattle offers no permanent address; Dog offers no CPH.
const CATTLE = { term: 'Cattle', commodityId: 'cattle', code: '0102' }
const DOG = { term: 'Dog', commodityId: 'dog', code: '01061900' }

const ANIMAL_COUNT = '2'

// The five roles that share consignment-address-select.html, each with the
// radio name that view is handed as `formFieldName`. Same view, same markup,
// five different field names — which is exactly why the picker is captured once
// rather than five times.
const SELECTABLE_ROLES = [
  { path: '/place-of-origin', field: 'placeOfOriginAddressId' },
  { path: '/consignor-or-exporter', field: 'consignorAddressId' },
  { path: '/consignee', field: 'consigneeAddressId' },
  { path: '/importer', field: 'importerAddressId' },
  { path: '/place-of-destination', field: 'placeOfDestinationAddressId' }
]

// The kit rewrites its shadow-nunjucks layouts and recompiles its Sass while
// the server is up, bouncing nodemon. A request landing in that window either
// refuses the connection or renders "Unable to call `govukPhaseBanner`" instead
// of the page. Re-request until it settles, rather than photograph the kit's own
// error page under a DR1 name.
const start = async (page) => {
  await expect(async () => {
    await page.goto('/create-notification')
    await expect(page, 'create-notification should open origin-of-the-import')
      .toHaveURL(/\/origin-of-the-import$/, { timeout: 5_000 })
    await expect(
      page.locator('main h1'),
      'origin-of-the-import should render, not error'
    ).toHaveText(/origin of the import/i, { timeout: 5_000 })
  }).toPass({ timeout: 240_000 })
}

// Not every page carries the action=continue button group. The hub does; the
// address picker uses a plain submit with no name at all. Fall back to the
// accessible name rather than to a class.
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
// input the search box writes to. Driving the search box is the only way to
// fill it the way the design intends.
const chooseCountry = async (page, country) => {
  await page.locator('#country-of-origin').fill(country)
  const option = page.locator(
    `.app-country-search__option[data-country="${country}"]`
  )
  await expect(option, `"${country}" should appear in the country results`)
    .toBeVisible()
  await option.click()
  await expect(page.locator('input[name="countryOfOrigin"]')).toHaveValue(country)
}

// The commodity search writes hidden inputs too, and two things have to happen
// after ticking a species and before continuing.
//
// The results panel has to be dismissed. It overlays the buttons and swallows
// the mousedown, so a click on "Save and continue" while it is open reaches
// nothing and the form never posts — no error, no navigation, just a page that
// sits there. Escape is what the widget listens for and what a user presses.
//
// And which species is ticked has to be pinned down, because this slice depends
// on the commodity CODE: the wrong one silently produces a different set of
// roles on the hub. The widget stamps each checkbox with data-commodity-id
// (app/assets/javascripts/commodity-search.js), so the species is chosen by the
// commodity it belongs to rather than by being first in the list.
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

  // Assert the CODE, not that selectedSpecies is non-empty. The widget writes
  // JSON into its hidden fields, so an empty selection leaves selectedSpecies
  // holding "[]" — a check for "not empty" passes with nothing ticked. The
  // commodity code is what decides which roles the hub offers and whether
  // permanent address exists at all, so that is the field worth pinning.
  await expect(
    page.locator('input[name="commodityCode"]'),
    'the search widget should have written the commodity code into the field that posts'
  ).toHaveValue(code)
  await expect(page.locator('input[name="commodityId"]')).toHaveValue(commodityId)
}

// Walk the three screens origin-and-reason.pw.js owns, without photographing
// them, and stop on consignment details.
const toConsignmentDetails = async (page, commodity) => {
  await start(page)

  await chooseCountry(page, COUNTRY)
  await page.locator('input[name="regionOfOriginRequired"][value="No"]').check()
  await continueOn(page)
  await expect(page, 'origin should advance to what-are-you-importing')
    .toHaveURL(/\/what-are-you-importing$/)

  await chooseCommodity(page, commodity)
  await continueOn(page)
  await expect(page, 'commodity should advance to reason-for-import')
    .toHaveURL(/\/reason-for-import$/)

  await page
    .locator('input[name="importReason"][value="Internal market"]')
    .check()
  await page.locator('input[name="internalMarketPurpose"]').first().check()
  await continueOn(page)
  await expect(page, 'reason should advance to consignment-details')
    .toHaveURL(/\/consignment-details$/)
}

// The hub is reachable from any point in the journey — GET /roles-and-addresses
// has no guard — so the walk stops as soon as the session carries what the
// addresses pages need, rather than crossing arrival, transport and documents
// for nothing.
//
// It needs the animal counts because the permanent-address page is one card per
// animal, built from numberOfAnimals; with the counts unset it renders "Add the
// number of animals on consignment details" and a capture of that is a capture
// of an empty page.
const toAddressesHub = async (page, commodity) => {
  await toConsignmentDetails(page, commodity)

  const counts = page.locator('input[name^="numberOfAnimals["]')
  await expect(
    counts.first(),
    'consignment details should ask for a number of animals'
  ).toBeVisible()
  for (let i = 0; i < (await counts.count()); i += 1) {
    await counts.nth(i).fill(ANIMAL_COUNT)
  }

  // Species that ship in packages ask for a package count on the same page.
  // For cattle and dog that field is optional — routes.js only validates
  // packaging for germinal products — but a commodity that does require it
  // would otherwise stop the walk here with an error the capture never sees.
  // Fill whatever else the page is asking for rather than naming fields that
  // vary by commodity.
  const others = page.locator(
    'form input[type="text"]:not([name^="numberOfAnimals["]), form input[type="number"]:not([name^="numberOfAnimals["])'
  )
  for (let i = 0; i < (await others.count()); i += 1) {
    const field = others.nth(i)
    if (!(await field.isVisible())) continue
    if (await field.inputValue()) continue
    await field.fill('1')
  }

  // A rejected consignment-details post is re-rendered at the same URL rather
  // than redirected, so "did it leave the page" is the whole test. Counting
  // error summaries instead would prove nothing: the assertion resolves against
  // the pre-click DOM, which has none either way, and passes before the post
  // has even landed.
  await continueOn(page)
  await expect(
    page,
    'consignment details should have been accepted and advanced'
  ).not.toHaveURL(/\/consignment-details$/)

  await page.goto('/roles-and-addresses')
  await expect(page, 'the addresses hub should open').toHaveURL(
    /\/roles-and-addresses$/
  )
}

// Answer one role from its own page. The URL assertion is the point: an
// inactive role does not error, it redirects to the hub, so without this a run
// against the wrong commodity would sail on and leave the hub half-answered.
const answerRole = async (page, { path: rolePath, field }) => {
  await page.goto(rolePath)
  await expect(
    page,
    `${rolePath} should be an active role for this commodity, not redirect to the hub`
  ).toHaveURL(new RegExp(`${rolePath}$`))

  const choice = page.locator(`input[type="radio"][name="${field}"]`).first()
  await expect(choice, `${rolePath} should offer an address to select`).toBeVisible()
  await choice.check()

  await continueOn(page)
  await expect(page, `${rolePath} should return to the addresses hub`).toHaveURL(
    /\/roles-and-addresses$/
  )

  // Landing on the hub proves nothing on its own. handleConsignmentAddressSelectPost
  // redirects there whether or not it saved: an address id it cannot resolve is
  // treated as a no-op, not an error, so a role that silently discarded the
  // answer is indistinguishable from one that took it. Reopen the page — the
  // picker re-renders the saved id as the checked radio — and make the failure
  // land on the role that dropped it.
  await page.goto(rolePath)
  await expect(
    page.locator(`input[type="radio"][name="${field}"]:checked`),
    `${rolePath} should have saved the chosen address, not discarded it silently`
  ).toHaveCount(1)

  await page.goto('/roles-and-addresses')
  await expect(page).toHaveURL(/\/roles-and-addresses$/)
}

// CPH is a role on the hub but not an address, and its page belongs to
// origin-and-reason.pw.js. Answered here only so the "complete" hub really is.
const answerCph = async (page) => {
  await page.goto('/cph-number')
  await expect(page, 'cph-number should be active for cattle').toHaveURL(
    /\/cph-number$/
  )

  await page.locator('input[name="cphNumber-county"]').fill('12')
  await page.locator('input[name="cphNumber-parish"]').fill('345')
  await page.locator('input[name="cphNumber-holding"]').fill('6789')

  await continueOn(page)
  await expect(page, 'cph-number should return to the addresses hub').toHaveURL(
    /\/roles-and-addresses$/
  )
}

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(() => {
  record.write()
})

test('records the addresses hub empty, the shared picker, and the hub with every role answered', async ({
  page
}) => {
  await toAddressesHub(page, CATTLE)

  const sections = page.locator('.app-roles-and-addresses-page__section')
  const answered = page.locator('.app-roles-and-addresses-page__selected-address')

  await expect(
    sections,
    'the hub should list the roles cattle requires'
  ).not.toHaveCount(0)
  await expect(
    answered,
    'nothing has been answered yet, so no section should show an address'
  ).toHaveCount(0)

  const empty = await record.record(page, 'roles-and-addresses')
  expect(empty.title, 'the screen should have a title to file it under').toBeTruthy()

  // One view, consignment-address-select.html, serves all five selectable
  // roles — the heading, hint, form action and radio name are the only things
  // that differ. Photograph it once, under the role that opens the set, rather
  // than five near-identical captures of the same markup.
  await page.goto(SELECTABLE_ROLES[0].path)
  await expect(page, 'place-of-origin should open the address picker').toHaveURL(
    /\/place-of-origin$/
  )
  await expect(
    page.locator(
      `input[type="radio"][name="${SELECTABLE_ROLES[0].field}"]`
    ),
    'the picker should list addresses to choose between'
  ).not.toHaveCount(0)

  await record.record(page, 'consignment-address-select')

  for (const role of SELECTABLE_ROLES) {
    await answerRole(page, role)
  }
  await answerCph(page)

  // Every section answered means every section renders its inset summary with a
  // "Change" link instead of an "Add a …" link. Counting the summaries against
  // the sections is what makes this capture provably the complete state rather
  // than a mostly-complete one.
  await expect(
    answered,
    'every section should show an answer, or this is not the complete hub'
  ).toHaveCount(await sections.count())

  await record.record(page, 'roles-and-addresses-complete')
})

test('records permanent-address-animals, and shows /permanent-address has no page in DR1', async ({
  page
}) => {
  await toAddressesHub(page, DOG)

  // Same-as-the-place-of-destination is one of the two choices the page offers,
  // and it is rejected unless a place of destination is already on the
  // notification. Answer that role first so the capture shows the page as a
  // user reaching it in order would see it — with the POD address as the hint
  // under the first radio.
  await answerRole(
    page,
    SELECTABLE_ROLES.find((role) => role.path === '/place-of-destination')
  )

  // /permanent-address is a section path on the hub, but it is not a page.
  // routes.js renders the permanent-address view nowhere: renderPermanentAddressPage
  // is defined and never called, and both GET and POST /permanent-address clear
  // the previous answer and redirect to /permanent-address/select. So DR1 has no
  // dr1-permanent-address screen to capture, and this assertion is what will say
  // so out loud if that ever changes.
  await page.goto('/permanent-address')
  await expect(
    page,
    '/permanent-address should redirect to the select page — DR1 renders no page of its own here'
  ).toHaveURL(/\/permanent-address\/select$/)

  // The per-animal cards are the page. Without them the view still renders, but
  // as the "add the number of animals" empty message — which would be a capture
  // of a dead end filed under the name of the real screen.
  const cards = page.locator('.app-permanent-address-animal-card')
  await expect(
    cards,
    'the page should show one card per animal, not the empty-state message'
  ).toHaveCount(Number(ANIMAL_COUNT))
  await expect(
    page.locator('input[type="radio"][name^="permanentAddressChoice"]'),
    'each card should offer the address choice radios'
  ).not.toHaveCount(0)

  // The place of destination is what this capture is answered around, and the
  // only mark it leaves on the page is a hint under the first radio: routes.js
  // gives "Same as the place of destination" a hint only once a POD address is
  // on the notification, while "Enter a new address" always carries one. Two
  // item hints per card is therefore exactly the difference between the screen
  // a user reaching this page in order sees and the one they do not.
  await expect(
    cards.first().locator('.govuk-radios__hint'),
    'a saved place of destination should show as the hint under the first radio'
  ).toHaveCount(2)

  await record.record(page, 'permanent-address-animals')
})

test('records contact-address-for-consignment', async ({ page }) => {
  // The contact address sits after the addresses hub in the journey but its GET
  // has no guard, so it is reachable as soon as a notification exists. Going
  // straight there keeps the capture of a page that asks one question to a walk
  // that answers none.
  await start(page)

  await page.goto('/contact-address-for-consignment')
  await expect(page, 'the contact address page should open').toHaveURL(
    /\/contact-address-for-consignment$/
  )
  await expect(page.locator('main h1')).toHaveText(
    /contact address for consignment/i
  )
  await expect(
    page.locator('input[type="radio"][name="contactAddressId"]'),
    'the page should list contact addresses to choose between'
  ).not.toHaveCount(0)

  const row = await record.record(page, 'contact-address-for-consignment')
  expect(row.title, 'the screen should have a title to file it under').toBeTruthy()

  // Answering it returns to the journey rather than to the hub, which is the
  // one thing about this page a screenshot cannot show.
  await page.locator('input[type="radio"][name="contactAddressId"]').first().check()
  await continueOn(page)
  await expect(
    page,
    'a chosen contact address should advance out of the page'
  ).not.toHaveURL(/\/contact-address-for-consignment$/)
})

test('records the addresses hub part-answered, where the copy shortcuts render', async ({
  page
}) => {
  await toAddressesHub(page, CATTLE)

  // The two shortcut buttons are why this state needs a screen of its own, and
  // why neither of the captures above can stand in for it. A section offers
  // "Same as place of origin" only while a place of origin is on the
  // notification AND that section is still empty; "Same as consignee" the same
  // way against the consignee. Both tests sit in the same else-if chain as
  // `selectedAddress` (roles-and-addresses.html), so answering a section
  // replaces its shortcut with the inset summary. The empty hub has no source
  // address to copy from and the complete hub has no empty target to copy into,
  // which leaves this the only state in which either button is rendered at all.
  await answerRole(
    page,
    SELECTABLE_ROLES.find((role) => role.path === '/place-of-origin')
  )
  await answerRole(
    page,
    SELECTABLE_ROLES.find((role) => role.path === '/consignee')
  )

  await expect(
    page.locator('.app-roles-and-addresses-page__selected-address'),
    'the place of origin and the consignee, and nothing else, should be answered'
  ).toHaveCount(2)

  // Counted rather than merely asserted visible, because the counts are what
  // pin the capture to this state. Cattle's hub is six sections
  // (app/data/consignment-address-sections.js, code 0102): five roles plus CPH.
  // Consignor is the one section carrying canUseSameAsPlaceOfOrigin; importer
  // and place of destination are the two carrying canUseSameAsConsignee. A hub
  // one role further on would still show a shortcut somewhere and still pass a
  // bare visibility check.
  await expect(
    page.getByRole('button', { name: 'Same as place of origin', exact: true }),
    'the consignor section should offer to copy the place of origin'
  ).toHaveCount(1)
  await expect(
    page.getByRole('button', { name: 'Same as consignee', exact: true }),
    'the importer and the place of destination should offer to copy the consignee'
  ).toHaveCount(2)

  await record.record(page, 'roles-and-addresses-partial')
})

