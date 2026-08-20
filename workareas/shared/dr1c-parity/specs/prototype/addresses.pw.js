//
// DR1 slice: consignment parties — the addresses hub in three states, the
// address picker every selectable role shares, the CPH number, the permanent
// address, and the contact address for the consignment.
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// prototype is correct. Every navigation does assert that it landed where it
// should, and on this slice that is not a formality: every INACTIVE role page
// answers with a redirect to the hub rather than an error
// (handleConsignmentAddressSelectGet, and the guards on /cph-number and
// /permanent-address in app/routes.js all call
// isConsignmentAddressSectionActive and redirect on false). A capture taken
// without checking the URL would be a second photograph of the hub filed under a
// role's name, and nothing downstream could tell.
//
// DR1 is the ROOT URLs. app/routes.js is one router mounted at root and
// re-mounted under /design-release-2 and /design-release-2.1; the root mount is
// DR1, and app/views/*.html — not the release subfolders — are its views.
//
// It borrows nothing from the prototype's own journey-demo/e2e/journey.js. That
// suite is unmaintained, and a capture built on it is hostage to a test nobody
// runs. The widget handling is re-derived here, in the open.
//
import { readFileSync } from 'node:fs'

// A spec imports exactly one thing. It lives in the corpus workarea, outside any
// package, so a bare specifier resolves to nothing here — tim hands every spec
// the absolute path to one module carrying what it needs, Playwright's own test
// and expect included, through the capture context.
const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

const COUNTRY = 'France'

// Which roles the addresses hub offers is decided by the COMMODITY, not by the
// journey, and no single commodity offers all of them — so this slice needs two.
//
// Cattle (CN 0102) is what app/data/consignment-address-sections.js gives the six
// sections this corpus's hub captures show: the five selectable roles plus the
// CPH number. It is also the commodity the rest of the corpus walks under.
//
// Dog is the commodity that opens the permanent address. That takes two separate
// conditions, and both are in the data rather than in the journey:
//   1. app/data/consignment-address-sections.js lists the 'permanent-address'
//      section for commodity code 01061900 alone, and
//   2. getSessionConsignmentAddressSections in app/routes.js then filters it out
//      again unless hasPermanentAddressRequiredSpecies is true, which reads the
//      commodity's requiresPermanentAddress flag.
// In app/data/commodities.js exactly three commodities carry
// requiresPermanentAddress: cat, dog and ferret — all three under code 01061900.
// The fourth commodity sharing that code, other-live-mammals, does not, so
// picking the code is not enough and the species has to be pinned.
//
// Dog is the one used here because the previous capture of
// dr1-permanent-address-animals was taken under it — its cards are headed
// "Canis familiaris 1" and "Canis familiaris 2" — and two corpora comparing the
// same screen have to be photographs of the same thing.
//
// Cattle offers no permanent address; dog offers no CPH.
const CATTLE = { term: 'Cattle', commodityId: 'cattle', code: '0102' }
const DOG = { term: 'Dog', commodityId: 'dog', code: '01061900' }

// The permanent-address page is one card per animal, built from the numbers
// given on consignment details. Two is enough to show that it repeats.
const ANIMAL_COUNT = '2'

// The five roles that share app/views/consignment-address-select.html, each with
// the radio name that view is handed as `formFieldName`
// (app/data/consignment-address-sections.js). Same view, same markup, five
// different field names and headings — which is exactly why the picker is
// captured once rather than five times.
//
// Place of origin is first because it is the role the previous capture of
// dr1-consignment-address-select was taken in: that row's url in the evidence
// manifest is /place-of-origin. Taking it in a different role would compare a
// picture of one heading against a picture of another.
const SELECTABLE_ROLES = [
  { path: '/place-of-origin', field: 'placeOfOriginAddressId' },
  { path: '/consignor-or-exporter', field: 'consignorAddressId' },
  { path: '/consignee', field: 'consigneeAddressId' },
  { path: '/importer', field: 'importerAddressId' },
  { path: '/place-of-destination', field: 'placeOfDestinationAddressId' }
]

const PICKER_ROLE = SELECTABLE_ROLES[0]

const roleByPath = (rolePath) =>
  SELECTABLE_ROLES.find((role) => role.path === rolePath)

// The GOV.UK Prototype Kit rewrites its shadow-nunjucks layouts and recompiles
// its Sass while the server is up, bouncing nodemon. A request landing in that
// window either refuses the connection or renders "Unable to call
// `govukPhaseBanner`" instead of the page. Re-request until it settles, rather
// than photograph the kit's own error page under a DR1 name.
const start = async (page) => {
  await expect(async () => {
    await page.goto('/create-notification')
    await expect(
      page,
      'create-notification should open origin-of-the-import'
    ).toHaveURL(/\/origin-of-the-import$/, { timeout: 5_000 })
    await expect(
      page.locator('main h1'),
      'origin-of-the-import should render, not error'
    ).toHaveText(/origin of the import/i, { timeout: 5_000 })
  }).toPass({ timeout: 240_000 })
}

// Not every page on this slice carries the action=continue button group. The hub
// does; the address picker uses a plain submit with no name at all. Fall back to
// the accessible name rather than to a class — and never to "the first button",
// because the hub's second button is a soft save that redirects to the overview.
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
// input the search box writes to (`.app-country-search__value`,
// name="countryOfOrigin"). Driving the search box is the only way to fill it the
// way the design intends. Options are stamped with data-country by
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

// The commodity search writes hidden inputs too, and two things have to happen
// after ticking a species and before continuing.
//
// The results panel has to be dismissed. It filters live on every keystroke and
// overlays the buttons, and it swallows the mousedown — so a click on "Save and
// continue" while it is open reaches nothing and the form never posts. No error,
// no navigation, just a page that sits there until the step times out. Escape is
// what the widget listens for and what a user presses.
//
// And which species is ticked has to be pinned down, because this whole slice
// turns on the commodity CODE: the wrong one silently produces a different set
// of sections on the hub, and every role page then redirects away. The widget
// stamps each checkbox with data-commodity-id
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
  // holding "[]" and a check for "not empty" passes with nothing ticked. The
  // commodity code is what decides which sections the hub offers and whether the
  // permanent address exists at all, so that is the field worth pinning.
  await expect(
    page.locator('input[name="commodityCode"]'),
    'the search widget should have written the commodity code into the field that posts'
  ).toHaveValue(code)
  await expect(page.locator('input[name="commodityId"]')).toHaveValue(commodityId)
}

// Walk far enough that the session carries a commodity — which is all the
// section guards read (getSessionConsignmentAddressSections derives everything
// from the selected species and commodity code). Nothing here is photographed;
// these screens belong to other slices.
const toCommodityChosen = async (page, commodity) => {
  await start(page)

  await chooseCountry(page, COUNTRY)
  await page.locator('input[name="regionOfOriginRequired"][value="No"]').check()
  await continueOn(page)
  await expect(
    page,
    'origin-of-the-import should advance to what-are-you-importing'
  ).toHaveURL(/\/what-are-you-importing$/)

  await chooseCommodity(page, commodity)
  await continueOn(page)
  await expect(
    page,
    'what-are-you-importing should advance to reason-for-import'
  ).toHaveURL(/\/reason-for-import$/)
}

// Carry on to consignment details, which is where the animal counts are given.
const toConsignmentDetails = async (page, commodity) => {
  await toCommodityChosen(page, commodity)

  await page.locator('input[name="importReason"][value="Internal market"]').check()
  await page.locator('input[name="internalMarketPurpose"]').first().check()
  await continueOn(page)
  await expect(
    page,
    'reason-for-import should advance to consignment-details'
  ).toHaveURL(/\/consignment-details$/)
}

// The hub is reachable from any point in the journey — GET /roles-and-addresses
// has no guard beyond ensuring a notification reference — so the walk stops as
// soon as the session carries what the addresses pages need, rather than
// crossing arrival, transport and documents for nothing.
//
// It goes as far as the animal counts because the permanent-address page is one
// card per animal, built from numberOfAnimals; with the counts unset that page
// renders "Add the number of animals on consignment details" instead
// (app/views/permanent-address-animals.html), and a capture of that is a capture
// of a dead end.
const toAddressesHub = async (page, commodity) => {
  await toConsignmentDetails(page, commodity)

  const counts = page.locator('input[name^="numberOfAnimals["]')
  await expect(
    counts.first(),
    'consignment details should ask for a number of animals'
  ).toBeVisible()
  for (let index = 0; index < (await counts.count()); index += 1) {
    await counts.nth(index).fill(ANIMAL_COUNT)
  }

  // Species that ship in packages ask for a package count on the same page. For
  // cattle and dog that field is optional, but a commodity that required it
  // would otherwise stop the walk here behind an error the capture never sees.
  // Fill whatever else the page is asking for rather than naming fields that
  // vary by commodity — the form carries nothing but these two kinds of input
  // (app/views/consignment-details.html).
  const others = page.locator(
    'form input[type="text"]:not([name^="numberOfAnimals["]), form input[type="number"]:not([name^="numberOfAnimals["])'
  )
  for (let index = 0; index < (await others.count()); index += 1) {
    const field = others.nth(index)
    if (!(await field.isVisible())) continue
    if (await field.inputValue()) continue
    await field.fill('1')
  }

  // A rejected consignment-details post is re-rendered at the same URL rather
  // than redirected, so "did it leave the page" is the whole check. Counting
  // error summaries instead would prove nothing: the assertion resolves against
  // the pre-click DOM, which has none either way, and passes before the post has
  // even landed.
  await continueOn(page)
  await expect(
    page,
    'consignment details should have been accepted and advanced'
  ).not.toHaveURL(/\/consignment-details$/)

  await page.goto('/roles-and-addresses')
  await expect(page, 'the addresses hub should open').toHaveURL(
    /\/roles-and-addresses$/
  )
  await expect(
    page.locator('main h1'),
    'the hub should render its own heading, not the kit error page'
  ).toHaveText(/consignment addresses/i)
}

// Answer one role from its own page. The URL assertion is the point: an inactive
// role does not error, it redirects to the hub, so without this a run against
// the wrong commodity would sail on and leave the hub half-answered while every
// step still passed.
const answerRole = async (page, { path: rolePath, field }) => {
  await page.goto(rolePath)
  await expect(
    page,
    `${rolePath} should be an active role for this commodity, not redirect to the hub`
  ).toHaveURL(new RegExp(`${rolePath}$`))

  const choice = page.locator(`input[type="radio"][name="${field}"]`).first()
  await expect(
    choice,
    `${rolePath} should offer an address to select`
  ).toBeVisible()
  await choice.check()

  await continueOn(page)
  await expect(
    page,
    `${rolePath} should return to the addresses hub`
  ).toHaveURL(/\/roles-and-addresses$/)

  // Landing on the hub proves nothing on its own. handleConsignmentAddressSelectPost
  // redirects there whether or not it saved: an address id it cannot resolve is
  // treated as a no-op, not an error, so a role that silently discarded the
  // answer is indistinguishable from one that took it. Reopen the page — the
  // picker re-renders the saved id as the checked radio — and make the failure
  // land on the role that dropped it rather than three screens later.
  await page.goto(rolePath)
  await expect(
    page.locator(`input[type="radio"][name="${field}"]:checked`),
    `${rolePath} should have saved the chosen address, not discarded it silently`
  ).toHaveCount(1)

  await page.goto('/roles-and-addresses')
  await expect(page).toHaveURL(/\/roles-and-addresses$/)
}

// CPH is a section on the hub but not an address. Filled here so that the
// "complete" hub really is complete; photographed empty in its own test.
const answerCph = async (page) => {
  await page.goto('/cph-number')
  await expect(
    page,
    'cph-number should be an active section for cattle, not redirect to the hub'
  ).toHaveURL(/\/cph-number$/)

  await page.locator('input[name="cphNumber-county"]').fill('12')
  await page.locator('input[name="cphNumber-parish"]').fill('345')
  await page.locator('input[name="cphNumber-holding"]').fill('6789')

  await continueOn(page)
  await expect(
    page,
    'a valid CPH number should return to the addresses hub'
  ).toHaveURL(/\/roles-and-addresses$/)
}

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(() => {
  record.write()
})

test('records the addresses hub empty, the shared picker, and the hub with every section answered', async ({
  page
}) => {
  await toAddressesHub(page, CATTLE)

  const sections = page.locator('.app-roles-and-addresses-page__section')
  const answered = page.locator('.app-roles-and-addresses-page__selected-address')

  // Six sections is cattle's hub: the five selectable roles plus the CPH number
  // (app/data/consignment-address-sections.js, code 0102). Counting them is what
  // says the walk arrived under the intended commodity — a hub built for a
  // different code renders a different set and would still photograph cleanly.
  await expect(
    sections,
    'cattle should give a hub of five roles plus the CPH number'
  ).toHaveCount(6)
  await expect(
    answered,
    'nothing has been answered yet, so no section should show an address'
  ).toHaveCount(0)

  const empty = await record.record(page, 'roles-and-addresses')
  expect(empty.title, 'the screen should have a title to file it under').toBeTruthy()

  // One view, app/views/consignment-address-select.html, serves all five
  // selectable roles — the heading, the intro, the form action and the radio
  // name are the only things that differ. Photograph it once, in the role the
  // previous capture used, rather than five near-identical pictures of the same
  // markup filed under five names.
  await page.goto(PICKER_ROLE.path)
  await expect(
    page,
    'place-of-origin should open the shared address picker'
  ).toHaveURL(new RegExp(`${PICKER_ROLE.path}$`))
  await expect(page.locator('main h1'), 'the picker should open in the place-of-origin role')
    .toHaveText(/place of origin/i)
  await expect(
    page.locator(`input[type="radio"][name="${PICKER_ROLE.field}"]`),
    'the picker should list addresses to choose between'
  ).not.toHaveCount(0)

  // The picker is photographed as it opens, with an empty search box and nothing
  // selected. Its search filters the table live on every keystroke, so anything
  // typed before the shot would photograph a filtered list — a screen the design
  // does not define.
  await expect(
    page.locator('.app-consignment-address-select-page__search-input'),
    'the picker should be photographed before its live search filters anything'
  ).toHaveValue('')
  await expect(
    page.locator(`input[type="radio"][name="${PICKER_ROLE.field}"]:checked`),
    'no address should be selected yet'
  ).toHaveCount(0)

  await record.record(page, 'consignment-address-select')

  for (const role of SELECTABLE_ROLES) {
    await answerRole(page, role)
  }
  await answerCph(page)

  // Every section answered means every section renders its inset summary with a
  // "Change" link instead of an "Add a …" link. Counting the summaries against
  // the sections is what makes this capture provably the complete state rather
  // than a mostly-complete one — a single dropped answer would still leave a
  // hub full of inset text.
  await expect(
    answered,
    'every section should show an answer, or this is not the complete hub'
  ).toHaveCount(await sections.count())

  await record.record(page, 'roles-and-addresses-complete')
})

test('records the addresses hub part-answered, where the copy shortcuts render', async ({
  page
}) => {
  await toAddressesHub(page, CATTLE)

  // The two shortcut buttons are why this state needs a screen of its own, and
  // why neither of the hub captures above can stand in for it. A section offers
  // "Same as place of origin" only while a place of origin is on the
  // notification AND that section is still empty; "Same as consignee" the same
  // way against the consignee. Both tests sit in the same else-if chain as
  // `selectedAddress` in app/views/roles-and-addresses.html, so answering a
  // section replaces its shortcut with the inset summary. The empty hub has no
  // source address to copy from and the complete hub has no empty target to copy
  // into, which leaves this the only state in which either button is rendered.
  await answerRole(page, roleByPath('/place-of-origin'))
  await answerRole(page, roleByPath('/consignee'))

  await expect(
    page.locator('.app-roles-and-addresses-page__selected-address'),
    'the place of origin and the consignee, and nothing else, should be answered'
  ).toHaveCount(2)

  // Counted rather than merely asserted visible, because the counts are what pin
  // the capture to this exact state. Consignor is the one section carrying
  // canUseSameAsPlaceOfOrigin; importer and place of destination are the two
  // carrying canUseSameAsConsignee (app/data/consignment-address-sections.js). A
  // hub one role further on would still show a shortcut somewhere and still pass
  // a bare visibility check.
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

test('records cph-number', async ({ page }) => {
  // /cph-number is guarded only on the CPH section being active for the chosen
  // commodity, and that is derived from the commodity alone — so the walk stops
  // as soon as cattle is on the session rather than crossing consignment details
  // for a page that does not read them.
  await toCommodityChosen(page, CATTLE)

  await page.goto('/cph-number')
  await expect(
    page,
    'cph-number should be active for cattle, not redirect to roles-and-addresses'
  ).toHaveURL(/\/cph-number$/)
  await expect(page.locator('main h1')).toHaveText(
    /add the county parish holding number/i
  )

  // Photographed empty. The three parts are one govukDateInput with the
  // namePrefix "cphNumber" (app/views/partials/cph-number-input.html), and a
  // filled one is a screen nobody specified.
  for (const part of ['county', 'parish', 'holding']) {
    await expect(
      page.locator(`input[name="cphNumber-${part}"]`),
      `the ${part} box should be empty`
    ).toHaveValue('')
  }

  const row = await record.record(page, 'cph-number')
  expect(row.title, 'the screen should have a title to file it under').toBeTruthy()
})

test('records contact-address-for-consignment', async ({ page }) => {
  // The contact address sits after the addresses hub in the journey but its GET
  // has no guard at all, so it is reachable as soon as a notification exists.
  // Going straight there keeps a capture of a page that asks one question to a
  // walk that answers none.
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
  await expect(
    page.locator('input[type="radio"][name="contactAddressId"]:checked'),
    'the page should be photographed with nothing chosen'
  ).toHaveCount(0)

  const row = await record.record(page, 'contact-address-for-consignment')
  expect(row.title, 'the screen should have a title to file it under').toBeTruthy()

  // Answering it moves the journey on rather than returning to a hub, which is
  // the one thing about this page a screenshot cannot show.
  await page.locator('input[type="radio"][name="contactAddressId"]').first().check()
  await continueOn(page)
  await expect(
    page,
    'a chosen contact address should advance out of the page'
  ).not.toHaveURL(/\/contact-address-for-consignment$/)
})

test('records permanent-address-animals', async ({ page }) => {
  await toAddressesHub(page, DOG)

  // Dog's hub is the five selectable roles plus the permanent address, and no
  // CPH — the proof that the walk arrived under 01061900 with a species that
  // carries requiresPermanentAddress rather than under some other commodity.
  await expect(
    page.locator('.app-roles-and-addresses-page__section'),
    'dog should give a hub of five roles plus the permanent address'
  ).toHaveCount(6)
  await expect(
    page.getByRole('heading', {
      name: 'Permanent address',
      exact: true,
      level: 2
    }),
    'the permanent-address section should be on the hub for dog'
  ).toHaveCount(1)

  // "Same as the place of destination" is one of the two choices each card
  // offers, and routes.js gives it a hint only once a place of destination is on
  // the notification. Answer that role first so the capture shows the page as a
  // user reaching it in journey order would see it.
  await answerRole(page, roleByPath('/place-of-destination'))

  // /permanent-address is the section path on the hub, but it is not a page.
  // renderPermanentAddressAnimalsPage is only reached through
  // /permanent-address/select; both GET and POST /permanent-address clear the
  // previous answer and redirect there. So DR1 has no separate
  // dr1-permanent-address screen, and this assertion is what will say so out
  // loud if that ever changes.
  await page.goto('/permanent-address')
  await expect(
    page,
    '/permanent-address should redirect to the select page — DR1 renders no page of its own there'
  ).toHaveURL(/\/permanent-address\/select$/)
  await expect(page.locator('main h1')).toHaveText(/permanent address/i)

  // The per-animal cards are the page. Without them the view still renders, but
  // as the "Add the number of animals on consignment details" empty message —
  // which would be a capture of a dead end filed under the name of the real
  // screen.
  const cards = page.locator('.app-permanent-address-animal-card')
  await expect(
    cards,
    'the page should show one card per animal, not the empty-state message'
  ).toHaveCount(Number(ANIMAL_COUNT))
  await expect(
    page.locator('input[type="radio"][name^="permanentAddressChoice"]'),
    'each card should offer the address choice radios'
  ).not.toHaveCount(0)
  await expect(
    page.locator('input[type="radio"][name^="permanentAddressChoice"]:checked'),
    'the page should be photographed with no choice made'
  ).toHaveCount(0)

  // The saved place of destination leaves exactly one mark on the page: a hint
  // under the first radio. "Enter a new address" always carries one, so two item
  // hints per card is precisely the difference between the screen a user
  // reaching this page in order sees and the one they do not.
  await expect(
    cards.first().locator('.govuk-radios__hint'),
    'a saved place of destination should show as the hint under the first radio'
  ).toHaveCount(2)

  await record.record(page, 'permanent-address-animals')
})
