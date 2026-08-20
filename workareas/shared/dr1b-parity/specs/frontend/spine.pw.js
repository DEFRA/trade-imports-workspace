//
// Frontend slice: the journey spine and the end of it — the dashboard in both
// its states, origin, the commodity leg, additional animal details, the hub
// before and after a commodity exists, and the review / declaration /
// confirmation run that closes the journey.
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// frontend is correct. Every step does assert that the journey landed where it
// should, because a mislabelled capture is worse than a missing one: every
// ruling downstream rests on the picture being of what it claims.
//
// It borrows nothing from the frontend repo — not its `fit/` journey driver,
// not its fixtures. Those are another suite's test code, and a capture built on
// them breaks the first time somebody refactors a suite nobody runs. Every
// selector and every value below is re-derived here, in the open, where a
// reader can check it against the templates.
//
// Addresses, documents, transport, animal identification and the import-reason
// branch belong to other slices. Their pages are driven here only because the
// review gate is blocked until every task row is answered, and none of them is
// photographed.
//
import { readFileSync } from 'node:fs'

// A spec imports exactly one thing. It lives in the corpus workarea, outside
// any package, so a bare specifier resolves to nothing here — tim hands every
// spec the absolute path to one module that carries what it needs, Playwright's
// own test and expect included.
const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

// Countries are chosen by ISO code rather than by visible name. In stub mode
// the list is a fixture; in a real run it is refetched from reference data, so
// the code is the half that survives. The list already carries "Netherlands
// (the)", which is what a name-matched locator trips over.
const COUNTRY_CODE = 'FR'
const TRANSIT_COUNTRY_CODES = ['FR', 'BE']

// A Cow line, named by its species because the commodity page lists species
// grouped under a fieldset per commodity. Cow drives three things this slice
// depends on: the ear-tag identifier field, the unweaned-animals question on
// additional details, and the CPH page. All three are allow-lists keyed on the
// commodity and all three are mandatory once in scope, so a cat or a fish
// leaves the review gate shut for reasons three screens apart.
const SPECIES = 'Bos taurus'

// One animal, because the identifier collection is capped at — and required to
// equal — the line's animal count. Two animals means two saved identifier
// records before the row counts as complete.
const ANIMAL_COUNT = '1'
const EAR_TAG = 'UK123456789012'

// Nine digits. The page strips slashes before validating, so "123/456/789"
// would be accepted and stored the same way, but the stripped value must be
// exactly nine digits or the page rejects it.
const CPH_NUMBER = '123456789'

// Aberdeen Harbour. Port option values are the raw codes and the visible text
// is "<name> (<code>)". Most codes carry an embedded space — "GB ABD" — but the
// catalogue breaks that exactly once, at "GBSHS", so the value can never be
// derived from the name by rule. Both halves are spelt out: the widget needs
// the text and the assertion needs the value.
const PORT_OPTION = 'Aberdeen Harbour (GB ABD)'
const PORT_CODE = 'GB ABD'

const MEANS_OF_TRANSPORT = 'ROAD_VEHICLE'
const TRANSPORT_IDENTIFICATION = 'FR-892-LK'
const TRANSPORT_DOCUMENT_REFERENCE = 'CMR-2026-884721'

// The arrival date the frontend accepts is a rolling window — seven days behind
// today to six months ahead — so a hardcoded value expires silently. It does
// not fail loudly either: the page saves with arrivalDateAtPort unanswered, the
// review gate stays shut, and the failure surfaces four helpers later as a
// missing link on the hub with nothing pointing back here.
//
// The format is d/M/yyyy with no leading zeros, which is what the field's own
// formatter writes back. "03/01/2026" would disagree with the value the page
// renders on check your answers.
const ARRIVAL_DATE = (() => {
  const when = new Date()
  when.setUTCMonth(when.getUTCMonth() + 1)
  return `${when.getUTCDate()}/${when.getUTCMonth() + 1}/${when.getUTCFullYear()}`
})()

// The five consignment parties, in the order the addresses hub lists them. The
// CPH row sits in the same summary list and is answered on its own page, so it
// is deliberately not here.
const PARTY_TITLES = [
  'Place of origin',
  'Consignor or exporter',
  'Consignee',
  'Importer',
  'Place of destination'
]

// A party row nobody has answered yet, and only such a row. An answered row
// still renders a link in the same actions cell — "Change" rather than "Add" —
// so a loop driven off "the first action link" re-opens the first party for
// ever. The value cell is the honest discriminator.
const PENDING_PARTY_ROW =
  '.govuk-summary-list__row:has(.govuk-summary-list__value:text-is("Not added yet"))'

const saveAndContinue = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

const continueOn = (page) =>
  page.getByRole('button', { name: 'Continue', exact: true }).click()

// Every page of a notification hangs off /notifications/<id>, and that bare
// path is the hub. Read the id off whatever page we are standing on rather than
// remembering it: the id is minted by the server when the notification is
// created and appears nowhere else.
const hubPath = (page) => {
  const found = new URL(page.url()).pathname.match(/^\/notifications\/[^/]+/)
  if (!found) {
    throw new Error(`Not inside a notification: ${page.url()}`)
  }
  return found[0]
}

const HUB_URL = /\/notifications\/[^/]+$/

const openHub = async (page) => {
  await page.goto(hubPath(page))
  await expect(
    page.getByRole('heading', { level: 1 }),
    'the hub should render its task list'
  ).toHaveText('Overview')
}

// Auth is enforced even in stub mode; what stub mode replaces is only the Defra
// ID round-trip. An unauthenticated request is redirected to /auth/sign-in,
// which mints a locally signed session and sends the browser back — so nothing
// signs in explicitly, and this assertion is what proves the round-trip
// happened rather than leaving us on a sign-in page.
const openDashboard = async (page) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1 }),
    'the dashboard should render, which means stub sign-in completed'
  ).toHaveText('Import notification service')
}

const startNotification = async (page) => {
  await openDashboard(page)
  await page.getByRole('button', { name: 'Start a new notification' }).click()
  await expect(
    page,
    'starting a notification should open the origin page'
  ).toHaveURL(/\/notifications\/[^/]+\/origin$/)
}

// Origin is the journey's entry page and the only surface the deep-link guard
// exempts; until it is answered every other page in the journey bounces back to
// it. It is also the first of the two answers that unblock the rest of the hub.
const answerOrigin = async (page) => {
  await page.locator('#countryOfOrigin').selectOption(COUNTRY_CODE)
  await page
    .locator('input[name="regionOfOriginCodeRequirement"][value="no"]')
    .check()
  await saveAndContinue(page)
  await expect(page, 'origin should hand over to the commodity page').toHaveURL(
    /\/commodities$/
  )
}

// The species checkbox is matched exactly. "Bos taurus" is one of four names
// under the Cow fieldset and a substring match would be ambiguous the moment
// the catalogue grows a subspecies; Playwright fails a check on a locator that
// resolves to more than one node.
const chooseSpecies = (page, species = SPECIES) =>
  page.getByRole('checkbox', { name: species, exact: true }).check()

// Origin plus a species, which is the least that unlocks the rest of the hub.
// Both are enforced at continue: every task row after the commodity page is
// blocked until countryOfOrigin and commoditySelection are answered, so without
// them the hub is a wall of "Cannot start yet" and no link exists to follow.
const answerOriginAndSpecies = async (page) => {
  await startNotification(page)
  await answerOrigin(page)
  await chooseSpecies(page)
  await saveAndContinue(page)
  await expect(
    page,
    'choosing a species should hand over to consignment details'
  ).toHaveURL(/\/consignment-details$/)
}

// The count inputs are named per LINE, not per page — `-0` is the first
// commodity line. A page-wide "fill the number field" would break the moment a
// consignment carried two species, and silently: the second line's count stays
// blank and the commodities row never completes.
const answerAnimalCount = async (page) => {
  await page.locator('#numberOfAnimalsQuantity-0').fill(ANIMAL_COUNT)
  await saveAndContinue(page)

  // Nothing has opened the hub yet, so the opening run is still sequencing and
  // import reason is its next step. Assert it: consignment details re-renders
  // itself on a validation error, and without this the walk carries on with the
  // count unanswered and only stops four helpers later, at the review gate,
  // pointing at nothing.
  await expect(
    page,
    'the opening run should carry on from consignment details to the reason'
  ).toHaveURL(/\/import-reason$/)
}

// Port of entry is an accessible-autocomplete over a native select, and that is
// the trap on this page. The enhancement hides the original select, RENAMES it
// to `portOfEntry-select`, and gives the visible combobox an empty name — so
// the box the user types in submits nothing at all. Typing a port and moving on
// leaves portOfEntry unanswered, the page saves happily, and the review gate
// stays shut with nothing on the arrival page to show for it. Choose from the
// listbox, then assert the hidden select actually carries the code.
//
// `input#portOfEntry` rather than the label: before the enhancement runs the
// label belongs to the select, and the input only exists once it has. The
// locator therefore waits for the widget rather than racing it.
//
// `exact: true` on the option is load-bearing rather than tidiness. Two names
// in the catalogue appear twice — "Pembroke Port" and "Port of Sheerness", each
// against two different codes — so a substring match is ambiguous by
// construction.
const choosePortOfEntry = async (page) => {
  const combobox = page.locator('input#portOfEntry')
  await combobox.click()
  await combobox.fill(PORT_OPTION)
  await page.getByRole('option', { name: PORT_OPTION, exact: true }).click()
  await expect(
    page.locator('select#portOfEntry-select'),
    'choosing from the list should write the select that actually posts'
  ).toHaveValue(PORT_CODE)
}

const answerTransport = async (page) => {
  await openHub(page)
  await page.getByRole('link', { name: 'Arrival details' }).click()
  await expect(page).toHaveURL(/\/port-of-entry$/)

  // Filled rather than picked from the calendar. The MOJ date picker's dialog
  // overlays whatever comes next and swallows the first click anywhere outside
  // itself, so opening it costs a click and buys nothing here.
  await page.locator('#arrivalDateAtPort').fill(ARRIVAL_DATE)
  await choosePortOfEntry(page)
  await page
    .locator(`input[name="meansOfTransport"][value="${MEANS_OF_TRANSPORT}"]`)
    .check()
  await page.locator('#transportIdentification').fill(TRANSPORT_IDENTIFICATION)
  await page
    .locator('#transportDocumentReference')
    .fill(TRANSPORT_DOCUMENT_REFERENCE)
  await saveAndContinue(page)

  // Land transport puts the transit-countries page in scope, and that page is
  // the one place in this journey that refuses an empty submit.
  await expect(page).toHaveURL(/\/transit-countries$/)
  for (const code of TRANSIT_COUNTRY_CODES) {
    await page
      .locator(`input[name="transitedCountries"][value="${code}"]`)
      .check()
  }
  await saveAndContinue(page)

  await expect(page).toHaveURL(/\/transporters$/)
  await page
    .locator('input[name="transporterType"][value="Commercial"]')
    .check()
  await saveAndContinue(page)

  await expect(page).toHaveURL(/\/transporters\/select$/)
  await page.locator('input[name="commercialTransporter"]').first().check()

  // Private transporter details is the only page left in the transport section
  // and its gate is the Private answer, so a commercial transporter ends the
  // section and saving returns to the hub.
  await saveAndContinue(page)
  await expect(
    page,
    'a commercial transporter should end the transport section at the hub'
  ).toHaveURL(HUB_URL)
}

const answerAddresses = async (page) => {
  await openHub(page)
  await page.getByRole('link', { name: 'Roles and addresses' }).click()
  await expect(page).toHaveURL(/\/addresses$/)

  for (const title of PARTY_TITLES) {
    await page
      .locator(PENDING_PARTY_ROW, {
        has: page.getByText(title, { exact: true })
      })
      .getByRole('link', { name: 'Add' })
      .click()

    // The picker's radios are labelled only by a visually-hidden "Select
    // <name>"; the same name is also printed in the row's own cell, so a
    // text-based locator matches the cell rather than the control.
    await page.locator('input[name="party"]').first().check()
    await saveAndContinue(page)
    await expect(page, `${title} should return to the addresses hub`).toHaveURL(
      /\/addresses$/
    )
  }

  // The addresses hub's POST validates nothing — Continue leaves the page with
  // every party still blank. Only the CPH row should be outstanding here.
  await expect(
    page.locator(PENDING_PARTY_ROW),
    'every party should have been answered before leaving the addresses hub'
  ).toHaveCount(1)

  // "Continue", not "Save and continue": this hub overrides the shared button
  // group's primary label.
  await continueOn(page)

  await expect(
    page,
    'a Cow line should carry the addresses section on to the CPH page'
  ).toHaveURL(/\/cph-number$/)
  await page.locator('#countyParishHoldingCph').fill(CPH_NUMBER)
  await saveAndContinue(page)
  await expect(
    page,
    'CPH is the last page in the addresses section, so saving returns to the hub'
  ).toHaveURL(HUB_URL)
}

const answerAnimalIdentification = async (page) => {
  await openHub(page)
  await page
    .getByRole('link', { name: 'Animal identification details' })
    .click()
  await expect(page).toHaveURL(/\/commodities\/identification$/)

  // A Cow card renders a passport, a tattoo and an ear tag; one identifier is
  // enough for the record, and the ear tag is the one a Cow line is normally
  // given.
  await page.locator('#animalIdentifierEarTag-0').fill(EAR_TAG)

  // The page renders a second, visually-hidden "Save and finish" button first,
  // purely so that pressing Enter in a text field submits the intended action.
  // It carries aria-hidden, so a role-based locator matches only the real one —
  // a CSS locator on the name and value would match both and click the decoy.
  await page.getByRole('button', { name: 'Save and finish' }).click()
  await expect(
    page,
    'the identification section holds one page, so saving returns to the hub'
  ).toHaveURL(HUB_URL)
}

const answerContact = async (page) => {
  await openHub(page)
  await page.getByRole('link', { name: 'Contact address' }).click()
  await expect(page).toHaveURL(/\/consignment\/contact\/select$/)
  await page.locator('input[name="contactAddress"]').first().check()
  await saveAndContinue(page)
  await expect(
    page,
    'the contact section holds one page, so saving returns to the hub'
  ).toHaveURL(HUB_URL)
}

// The review row renders as plain text with no link while any task row is
// outstanding, so the link being visible is the assertion that the whole walk
// took. Say so here: a bare click failure reads as a missing page.
const openReview = async (page) => {
  await openHub(page)
  const review = page.getByRole('link', { name: 'Check and submit' })
  await expect(
    review,
    'every task row should be answered, which is what turns the review row into a link'
  ).toBeVisible()
  await review.click()
  await expect(page).toHaveURL(/\/notification-view$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Check your answers'
  )
}

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(() => {
  record.write()
})

test('records the dashboard with nothing started, and with a notification on it', async ({
  page
}) => {
  await openDashboard(page)

  // The dashboard lists the journeys named in the `liveAnimalsKnownJourneys`
  // cookie, not everything the store holds, and Playwright gives each test its
  // own browser context. So "empty" is a property of this context rather than
  // of the run, and the empty shot cannot be spoiled by a test that ran first.
  // Assert the empty paragraph all the same: with a cookie present the page
  // still renders, just with rows, and the two shots would be
  // indistinguishable by name alone.
  await expect(
    page.getByText('You have not started any notifications in this session.'),
    'a fresh session should have no notifications to list'
  ).toBeVisible()

  await record.record(page, 'dashboard-empty')

  await page.getByRole('button', { name: 'Start a new notification' }).click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/origin$/)
  await answerOrigin(page)

  await openDashboard(page)
  await expect(
    page.locator('.govuk-summary-card'),
    'the notification just started should be listed, and only it'
  ).toHaveCount(1)

  await record.record(page, 'dashboard-populated')
})

test('records origin, the commodity search and consignment details', async ({
  page
}) => {
  await startNotification(page)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Origin of the import'
  )

  const origin = await record.record(page, 'origin')
  expect(
    origin.title,
    'the manifest row should carry the page title the report files it under'
  ).toBe('Origin of the import | Import notification service')

  await answerOrigin(page)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'What are you importing?'
  )

  // Photographed before anything is ticked. The commodity page is a set of
  // checkbox fieldsets and a ticked box is a screen nobody specified.
  await expect(
    page.locator('input[name="species"]:checked'),
    'the commodity search should be photographed with nothing chosen'
  ).toHaveCount(0)

  await record.record(page, 'commodity-search')

  await chooseSpecies(page)
  await saveAndContinue(page)
  await expect(page).toHaveURL(/\/consignment-details$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Consignment details'
  )

  // This page is only itself once a line exists — it is a card per commodity
  // line and renders nothing to fill in without one. So the line is the
  // screen's precondition rather than an answer typed into it, and both counts
  // are still empty when the picture is taken.
  await expect(
    page.locator('#numberOfAnimalsQuantity-0'),
    'the chosen line should have a count field, and it should be empty'
  ).toHaveValue('')
  await expect(
    page.locator('#numberOfPackages-0'),
    'and a package count, also empty'
  ).toHaveValue('')

  await record.record(page, 'consignment-details')
})

test('records the hub before any commodity has been chosen', async ({
  page
}) => {
  await startNotification(page)
  await answerOrigin(page)

  // Origin answered and the commodity page left alone. The hub below is
  // photographed with a species chosen, because that is what turns most of the
  // task list from "Cannot start yet" into links — so this is the state that
  // one cannot show, and it is the state every user passes through.
  await expect(page, 'origin should hand over to the commodity page').toHaveURL(
    /\/commodities$/
  )
  await openHub(page)

  // The commodity totals block is built from the consignment's lines and is
  // absent entirely while there are none, rather than showing two zeros.
  // Asserted against both the heading and the panels: the heading alone would
  // still pass if the panels rendered without one.
  await expect(
    page.getByRole('heading', { name: 'Your commodities' }),
    'the commodity totals should not be on the hub before a commodity exists'
  ).toHaveCount(0)
  await expect(
    page.locator('.app-commodity-total'),
    'and neither should the panels the heading introduces'
  ).toHaveCount(0)

  // The far end of the blocking, and the one row blocked by the whole journey
  // rather than by one answer: the review section's gate is
  // readyForCheckYourAnswers, so its row renders as plain text with no way in.
  const review = page
    .locator('.govuk-task-list__item')
    .filter({ hasText: 'Check and submit' })
  await expect(review).toContainText('Cannot start yet')
  await expect(
    review.getByRole('link'),
    'a blocked row offers no link at all, rather than a link to a refusal'
  ).toHaveCount(0)

  await record.record(page, 'hub-no-commodity')
})

test('records the hub once a commodity has been chosen', async ({ page }) => {
  await answerOriginAndSpecies(page)
  await openHub(page)

  // A species and nothing else. That is the state the hub is worth
  // photographing in: the two enforced-at-continue answers are given, so the
  // task list is links rather than a wall of "Cannot start yet", and every row
  // is still outstanding.
  await expect(
    page.getByRole('heading', { name: 'Your commodities' }),
    'a line should put the commodity totals on the hub'
  ).toBeVisible()
  await expect(
    page.locator('.app-commodity-total'),
    'as two panels, animals and packages'
  ).toHaveCount(2)
  await expect(
    page.getByRole('link', { name: 'Animal identification details' }),
    'and should unlock the rows that were blocked on it'
  ).toBeVisible()

  await record.record(page, 'hub')
})

test('records additional animal details, check your answers, the declaration and the confirmation', async ({
  page
}) => {
  await answerOriginAndSpecies(page)
  await answerAnimalCount(page)

  // Opening the hub closes the opening run. From here on the next page after a
  // save is the next page in the SAME section whose gate passes, falling back
  // to the hub — which is what makes every landing below predictable enough to
  // assert rather than merely observe.
  await openHub(page)
  await page.getByRole('link', { name: 'Main reason for importing' }).click()
  await expect(page).toHaveURL(/\/import-reason$/)
  await page
    .locator('input[name="reasonForImport"][value="internalMarket"]')
    .check()
  await saveAndContinue(page)

  // Internal market is the one reason that opens the purpose page, and the
  // purpose is mandatory once in scope. It is also the reason that leaves the
  // whole exit-details row out of scope, which is what keeps this walk from
  // having to answer a destination country, a port of exit and an exit date.
  await expect(
    page,
    'the internal-market reason should open the purpose page'
  ).toHaveURL(/\/import-purpose$/)
  await page
    .locator('input[name="purposeInInternalMarket"][value="breeding"]')
    .check()
  await saveAndContinue(page)

  // Destination country, port of exit and exit date all sit between purpose and
  // additional details in this section, and this reason gates all three out —
  // so additional details is the next page whose gate passes. Reached forwards
  // rather than from the hub, because that is the route a user takes.
  await expect(
    page,
    'purpose should carry the consignment section on to additional details'
  ).toHaveURL(/\/additional-details$/)

  // The hub calls this row "Additional commodity details" and the page calls
  // itself "Additional animal details". Both strings are in play, and a locator
  // built from the wrong one of the pair fails in a way that reads as a missing
  // page rather than as a wrong name.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Additional animal details'
  )

  // The unweaned-animals question is a server-side conditional, not a JS
  // reveal: it is rendered only when a commodity line is a Cow or a Horse. With
  // a cat or a fish the page is one radio group shorter and the capture is of a
  // different screen under the same name.
  await expect(
    page.getByRole('group', {
      name: 'Does the consignment contain any unweaned animals?'
    }),
    'a Cow line should put the unweaned-animals question on the page'
  ).toBeVisible()
  await expect(
    page.locator('input[name="animalsCertifiedFor"]:checked'),
    'and the page should be photographed with nothing answered'
  ).toHaveCount(0)

  await record.record(page, 'additional-details')

  await page
    .locator('input[name="animalsCertifiedFor"][value="slaughter"]')
    .check()
  await page
    .locator('input[name="containsUnweanedAnimals"][value="no"]')
    .check()
  await saveAndContinue(page)
  await expect(
    page,
    'additional details is the last page in its section, so saving returns to the hub'
  ).toHaveURL(HUB_URL)

  // The rest of the task rows, answered only because the review gate is blocked
  // until they are. None of these pages is photographed here — they belong to
  // other slices. Documents is not among them: that row is optional, which is
  // why the gate opens without it.
  await answerAnimalIdentification(page)
  await answerTransport(page)
  await answerAddresses(page)
  await answerContact(page)

  await openReview(page)

  await record.record(page, 'check-answers')

  await continueOn(page)

  // An incomplete journey does not fail here — it redirects to the hub. The URL
  // assertion is what tells those two apart.
  await expect(
    page,
    'a complete review should reach the declaration'
  ).toHaveURL(/\/declaration$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Declaration'
  )
  await expect(
    page.locator('input[name="declaration"]'),
    'the declaration should be photographed unconfirmed'
  ).not.toBeChecked()

  await record.record(page, 'declaration')

  // The declaration is confirmed with a CHECKBOX, not a radio, and there is no
  // fieldset around it. Leaving it unticked re-renders the same URL with an
  // error, so the walk would stall here with nothing submitted.
  await page.locator('input[name="declaration"]').check()
  await continueOn(page)

  await expect(page, 'a confirmed declaration should submit').toHaveURL(
    /\/confirmation$/
  )

  // The confirmation's heading is a GOV.UK panel title, so it is an <h1>
  // carrying the panel's class rather than a heading of the page's own.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Import notification submitted'
  )

  await record.record(page, 'confirmation')
})
