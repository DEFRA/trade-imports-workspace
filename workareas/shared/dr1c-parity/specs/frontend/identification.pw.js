//
// Frontend slice: animal identification in every shape its card can take, plus
// three screens no other slice reaches — the delete prompt, check-your-answers
// on a notification that has already been sent, and the prompt that cancels an
// amendment.
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// frontend is correct. Every step does assert that the journey landed where it
// should, because a mislabelled picture is worse than a missing one and every
// ruling downstream rests on the picture being of what it claims.
//
// It borrows nothing from the frontend repo — not its `fit/` journey driver,
// not its copy modules, not its fixtures. Those belong to another suite, and a
// capture built on them breaks the first time somebody refactors a suite nobody
// runs. Every selector and every stub value below is re-derived here, in the
// open, where a reader can check it against the templates.
//
import { readFileSync } from 'node:fs'

// A spec lives in the corpus workarea, outside any package, so a bare specifier
// resolves to nothing here. tim hands every spec the absolute path to one
// module carrying what it needs, Playwright's own test and expect included.
const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

// ---------------------------------------------------------------------------
// The three commodity lines this slice needs, and why each one.
//
// Which identifier fields a card renders is decided by the LINE'S COMMODITY and
// by nothing else. Each field is an obligation gated on an allow-list of
// commodity names, and the service offers exactly five commodities — Cow,
// Horse, Cat, Dog and Fish. The lists are:
//
//   passport               Horse, Cow, Cat, Dog
//   tattoo                 Cat, Dog, Cow
//   ear tag                Cow
//   horse name             Horse
//   identification details   any commodity in NONE of the four above
//   description              any commodity in NONE of the four above
//   permanent address      Cat, Dog
//
// So Cow, Horse, Fish and Cat are between them every shape the card has: three
// typed identifiers, a typed identifier beside the horse-name field, the
// free-text fallback that only a commodity off all four lists can reach, and
// the per-animal permanent address that only Cat and Dog trigger. Dog is left
// out because it sits on exactly the same three lists as Cat and would
// photograph the same card twice.
//
// The commodity page posts `<commodity>|<species value>` on one checkbox per
// species, and the value is what is selected on below. The visible text is the
// scientific name, which is the half that moves if the species list is ever
// refetched rather than read from the stub; the value is the half that survives.
// ---------------------------------------------------------------------------
const COW_LINE = { value: 'Cow|1148346', card: 'Cow (0102) — Bos taurus' }
const HORSE_LINE = {
  value: 'Horse|822332',
  card: 'Horse (0101) — Equus caballus'
}
const FISH_LINE = { value: 'Fish|801204', card: 'Fish (0301) — Salmo salar' }
const CAT_LINE = { value: 'Cat|923501', card: 'Cat (01061900) — Felis catus' }

// The counter and the card's closing sentence both name the species rather than
// the commodity, so they are spelt out separately from the card title.
const COW_SPECIES = 'Bos taurus'
const HORSE_SPECIES = 'Equus caballus'
const FISH_SPECIES = 'Salmo salar'
const CAT_SPECIES = 'Felis catus'

// Chosen by ISO code, not by name. In stub mode the country list is a fixture
// and otherwise it is refetched from reference data, so the code is the stable
// half — and the list carries "Netherlands (the)" to prove a name-matched
// locator is a hostage.
const COUNTRY_CODE = 'FR'
const TRANSIT_COUNTRY_CODES = ['FR', 'BE']

// The saved-record states need two animals on the line. The identifier
// collection is capped at — and required to equal — the line's animal count, so
// one animal would put the card straight into its at-maximum state on the first
// save and there would be no "one saved, one still to enter" to photograph.
const ONE_ANIMAL = '1'
const TWO_ANIMALS = '2'

const EAR_TAG = 'UK123456789012'
const SECOND_EAR_TAG = 'UK210987654321'

// Aberdeen Harbour. Port option values are the raw codes and the visible text is
// "<name> (<code>)". Most codes carry an embedded space — "GB ABD" — but the
// catalogue breaks that at least once, so the value can never be derived from
// the name by rule. Both halves are spelt out: the widget needs the text and the
// assertion needs the value.
const PORT_OPTION = 'Aberdeen Harbour (GB ABD)'
const PORT_CODE = 'GB ABD'

// Road transport, which puts the transit-countries page in scope. That page is
// the one place in this journey that refuses an empty submit, so it is answered
// rather than avoided.
const MEANS_OF_TRANSPORT = 'ROAD_VEHICLE'

const TRANSPORT_IDENTIFICATION = 'FR-892-LK'
const TRANSPORT_DOCUMENT_REFERENCE = 'CMR-2026-884721'

// Nine digits. The page strips slashes before validating, so "123/456/789"
// would be accepted and stored the same way, but the stripped value must be
// exactly nine digits or the page rejects it.
const CPH_NUMBER = '123456789'

// The first address-book record, chosen by its stable slug rather than by
// position. `.first()` would photograph whatever the picker happened to sort to
// the top; the slug is what the radio actually posts.
const PARTY_VALUE = 'astra-rosales'
const COMMERCIAL_TRANSPORTER_VALUE = 'garcia-livestock-transport'

// The arrival date the frontend accepts is a rolling window — seven days behind
// today to six months ahead, inclusive, in Europe/London. A hardcoded date falls
// out of it silently: the page does not reject it in a way anyone would notice
// walking past, it simply leaves the arrival date unanswered, the review gate
// never opens, and the failure surfaces three helpers later as a missing link on
// the hub with nothing pointing back here.
//
// So it is derived from today, one month ahead, which is inside the window all
// year round. The format is d/M/yyyy with no leading zeros, which is what the
// field's own formatter writes back — "03/01/2026" would disagree with the value
// the page then renders.
const ARRIVAL_DATE = (() => {
  const when = new Date()
  when.setUTCMonth(when.getUTCMonth() + 1)
  return `${when.getUTCDate()}/${when.getUTCMonth() + 1}/${when.getUTCFullYear()}`
})()

// The five consignment parties, in the order the addresses hub lists them. Each
// row's action link is the word "Add" plus a visually-hidden copy of the row
// title in lower case, so the accessible name is the pair. An answered row keeps
// a link in the same cell and swaps the word to "Change" — which is why the
// names below are matched whole rather than a loop being driven off "the first
// link in the actions column", a shape that re-opens the first party for ever.
const PARTIES = [
  { add: 'Add place of origin', picker: /\/place-of-origin\/select$/ },
  { add: 'Add consignor or exporter', picker: /\/consignors\/select$/ },
  { add: 'Add consignee', picker: /\/consignees\/select$/ },
  { add: 'Add importer', picker: /\/importers\/select$/ },
  { add: 'Add place of destination', picker: /\/destinations\/select$/ }
]

const saveAndContinue = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

const continueOn = (page) =>
  page.getByRole('button', { name: 'Continue', exact: true }).click()

// Every page of a notification hangs off /notifications/<id>, and that bare path
// is the hub. The id is minted by the server when the notification is created
// and appears nowhere else, so it is read off whatever page we are standing on
// rather than remembered.
const hubPath = (page) => {
  const found = new URL(page.url()).pathname.match(/^\/notifications\/[^/]+/)
  if (!found) {
    throw new Error(`Not inside a notification: ${page.url()}`)
  }
  return found[0]
}

const openHub = async (page) => {
  await page.goto(hubPath(page))
  await expect(
    page.getByRole('heading', { level: 1 }),
    'the hub should render its task list'
  ).toHaveText('Overview')
}

// Auth is enforced even in stub mode; what stub mode replaces is only the Defra
// ID round-trip. An unauthenticated request is bounced through /auth/sign-in,
// which mints a locally signed session and sends the browser back — so nothing
// here signs in explicitly, and the heading assertion is what proves that
// round-trip happened rather than leaving us on a sign-in page.
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
// exempts; until it is answered every other page bounces back to it.
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

// Pick a species, then say how many animals are on the line. Together with the
// origin country this is what every later task row is blocked on.
//
// The count input is named per LINE, not per page — `-0` is the first commodity
// line. A page-wide "fill the number field" would break the moment a consignment
// carried two species, and silently: the second line's count stays blank and the
// commodities row never completes.
const answerCommodityLine = async (page, line, animals) => {
  await page.locator(`input[name="species"][value="${line.value}"]`).check()
  await saveAndContinue(page)
  await expect(
    page,
    'the commodity page should hand over to consignment details'
  ).toHaveURL(/\/consignment-details$/)

  await page.locator('#numberOfAnimalsQuantity-0').fill(animals)
  await saveAndContinue(page)
}

// The identifier inputs are named `<obligation>-<line index>`, so every locator
// carries the line it belongs to. A page-wide locator on the obligation name
// alone would match the first line of a two-line consignment and read as the
// answer for both.
const identifierField = (page, obligation, line = 0) =>
  page.locator(`#${obligation}-${line}`)

// The permanent-address controls are named on the same `<field>-<line index>`
// convention, and this is deliberately a second helper rather than a reuse of
// the one above: they are a different block, gated on a different obligation,
// and a reader following a locator back should land on the sentence that says
// which. The nine names are the address block's own field order.
const addressField = (page, field, line = 0) =>
  page.locator(`#${field}-${line}`)

// Start a notification carrying one commodity line and stop on the
// identification page, photographing nothing on the way.
//
// The route in is the hub rather than the forward journey, and that is a
// deliberate choice rather than the only one: saving consignment details while
// the opening run is active sequences on to the reason for import, so walking
// forward would mean answering two more pages before the card appeared. Opening
// the hub ends the opening run and the task row goes straight there. The page's
// back link is the hub either way, so the two routes photograph the same screen.
const openIdentificationFor = async (page, line, animals) => {
  await startNotification(page)
  await answerOrigin(page)
  await answerCommodityLine(page, line, animals)

  await openHub(page)
  await page
    .getByRole('link', { name: 'Animal identification details' })
    .click()
  await expect(page).toHaveURL(/\/commodities\/identification$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Animal identification details'
  )

  // The page is one card per commodity line, and every assertion about a card
  // is scoped to it. The card carries an id built from the line index for
  // exactly that reason; a page-wide locator would read the wrong line's fields
  // on a two-line consignment.
  const card = page.locator('#identification-card-0')
  await expect(card, 'the line should have a card of its own').toBeVisible()
  await expect(
    card.getByRole('heading', { level: 2 }),
    'the card should name the commodity, its code and the species'
  ).toHaveText(line.card)
  return card
}

// Port of entry is an accessible-autocomplete over a native select, and that is
// the trap on this page. The enhancement hides the original select, RENAMES it
// to `portOfEntry-select`, and gives the visible combobox an EMPTY name — so the
// box the user types in submits nothing at all. Typing a port and moving on
// leaves the port unanswered, the page saves happily, and the review gate stays
// shut with nothing on this page to show for it. Choose from the listbox, then
// assert the hidden select carries the code.
//
// `exact: true` on the option is load-bearing rather than tidiness: some names
// in the catalogue appear twice against different codes, so a substring match is
// ambiguous by construction and Playwright refuses a click on a locator that
// resolves to more than one node.
const choosePortOfEntry = async (page) => {
  const combobox = page.getByLabel('Port of entry', { exact: true })
  await combobox.click()
  await combobox.fill(PORT_OPTION)
  await page.getByRole('option', { name: PORT_OPTION, exact: true }).click()
  await expect(
    page.locator('select#portOfEntry-select'),
    'choosing from the list should write the select that actually posts'
  ).toHaveValue(PORT_CODE)
}

// The opening run: origin, the commodity leg, the reason and its purpose, the
// identification card and the additional details, each page handing over to the
// next without the hub in between. The run ends when the hub is next opened.
const answerTheOpeningRun = async (page) => {
  await startNotification(page)
  await answerOrigin(page)
  await answerCommodityLine(page, COW_LINE, ONE_ANIMAL)

  await expect(
    page,
    'the opening run should carry on from consignment details to the reason'
  ).toHaveURL(/\/import-reason$/)
  await page
    .locator('input[name="reasonForImport"][value="internalMarket"]')
    .check()
  await saveAndContinue(page)

  // Internal market is the one reason that opens the purpose page, and the
  // purpose is mandatory once it is in scope. It is also the reason that leaves
  // the destination country, the port of exit and the exit date out of scope
  // altogether, which is what keeps this walk from having to answer three more
  // pages before the review gate will open.
  await expect(
    page,
    'internal market should put the purpose page in scope'
  ).toHaveURL(/\/import-purpose$/)
  await page
    .locator('input[name="purposeInInternalMarket"][value="breeding"]')
    .check()
  await saveAndContinue(page)

  await expect(
    page,
    'the run should carry on to the identification card'
  ).toHaveURL(/\/commodities\/identification$/)
  await identifierField(page, 'animalIdentifierEarTag').fill(EAR_TAG)

  // The page renders a second, visually-hidden "Save and finish" button first,
  // purely so that pressing Enter in a text field submits the intended action.
  // It carries aria-hidden, so a role-based locator matches only the real one —
  // a CSS locator on the name and value would match both and click the decoy.
  await page.getByRole('button', { name: 'Save and finish' }).click()

  await expect(
    page,
    'saving the identifier should carry on to the additional details'
  ).toHaveURL(/\/additional-details$/)
  await page
    .locator('input[name="animalsCertifiedFor"][value="slaughter"]')
    .check()

  // The unweaned question is a server-side conditional, not a JS reveal: it is
  // rendered only for a Cow or a Horse line, and it is mandatory when it is
  // there. With any other commodity this locator would find nothing and the walk
  // would stop here rather than at the review gate three helpers later.
  await page
    .locator('input[name="containsUnweanedAnimals"][value="no"]')
    .check()
  await saveAndContinue(page)
}

const answerArrivalAndTransport = async (page) => {
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

  await expect(
    page,
    'land transport should put the transit countries in scope'
  ).toHaveURL(/\/transit-countries$/)
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

  await expect(
    page,
    'a commercial transporter should be picked from the approved list'
  ).toHaveURL(/\/transporters\/select$/)
  await page
    .locator(
      `input[name="commercialTransporter"][value="${COMMERCIAL_TRANSPORTER_VALUE}"]`
    )
    .check()
  await saveAndContinue(page)

  // The transporter picker is the last page of the transport section that this
  // walk puts in scope — the private-transporter details are gated out by the
  // Commercial answer — so saving it falls back to the hub. Asserted rather than
  // assumed: a rejected save re-renders the picker, and the next helper would
  // then be looking for a task row on a page that has none.
  await expect(
    page,
    'the last page of the transport section should return to the hub'
  ).toHaveURL(/\/notifications\/[^/]+$/)
}

const answerAddresses = async (page) => {
  await openHub(page)
  await page.getByRole('link', { name: 'Roles and addresses' }).click()
  await expect(page).toHaveURL(/\/addresses$/)

  for (const party of PARTIES) {
    await page.getByRole('link', { name: party.add }).click()
    await expect(
      page,
      `${party.add} should open that party's picker`
    ).toHaveURL(party.picker)

    // The picker's radios are labelled only by a visually-hidden "Select
    // <name>", and the same name is printed in the row's own cell, so a
    // text-based locator matches the cell rather than the control.
    await page.locator(`input[name="party"][value="${PARTY_VALUE}"]`).check()
    await saveAndContinue(page)
    await expect(
      page,
      `${party.add} should return to the addresses hub`
    ).toHaveURL(/\/addresses$/)
  }

  // An answered row swaps its action from "Add" to "Change", so one "Add" link
  // left is exactly the CPH row and proves all five parties took. Without this,
  // a party that silently failed to save would only surface at the review gate.
  await expect(
    page.getByRole('link', { name: /^Add / }),
    'every party should be answered, leaving only the CPH row to add'
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
}

const answerContact = async (page) => {
  await openHub(page)
  await page.getByRole('link', { name: 'Contact address' }).click()
  await expect(page).toHaveURL(/\/consignment\/contact\/select$/)
  await page
    .locator(`input[name="contactAddress"][value="${PARTY_VALUE}"]`)
    .check()
  await saveAndContinue(page)
}

// Every task row the review gate is blocked on, answered in order. The uploaded
// documents row is not among them: it is optional, which is why the gate opens
// without it.
const answerEveryTaskRow = async (page) => {
  await answerTheOpeningRun(page)
  await answerArrivalAndTransport(page)
  await answerAddresses(page)
  await answerContact(page)
}

// Walk a fully answered notification through the review page and the
// declaration, and leave the browser on the confirmation.
//
// The review row renders as plain text with no link while any task row is
// outstanding, so the visibility assertion below is what proves the whole walk
// above took. Said here rather than left to a bare click failure, which reads
// as a missing page.
const submitNotification = async (page) => {
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
  await continueOn(page)

  // An incomplete journey does not fail here — it redirects to the hub. The URL
  // assertion is what tells those two apart.
  await expect(
    page,
    'a complete review should reach the declaration'
  ).toHaveURL(/\/declaration$/)

  // The declaration is confirmed with a CHECKBOX, not a radio, and there is no
  // fieldset around it. Leaving it unticked re-renders the same URL with an
  // error, so the walk would stall here with nothing submitted.
  await page.locator('input[name="declaration"]').check()
  await continueOn(page)

  await expect(page, 'a confirmed declaration should submit').toHaveURL(
    /\/confirmation$/
  )
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Import notification submitted'
  )
}

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(() => {
  record.write()
})

test('records the identification card for a Cow line', async ({ page }) => {
  const card = await openIdentificationFor(page, COW_LINE, ONE_ANIMAL)

  // Cow sits on the passport, tattoo and ear-tag lists and on neither free-text
  // gate, so this is the card in its three-typed-identifier shape. Both halves
  // are asserted: what is there, and what a card off those lists would have
  // instead.
  await expect(
    identifierField(page, 'animalIdentifierPassport'),
    'a Cow line should ask for a passport number'
  ).toBeVisible()
  await expect(
    identifierField(page, 'animalIdentifierTattoo'),
    'and for a tattoo'
  ).toBeVisible()
  await expect(
    identifierField(page, 'animalIdentifierEarTag'),
    'and for an ear tag number'
  ).toBeVisible()
  await expect(
    identifierField(page, 'animalIdentifierIdentificationDetails'),
    'a commodity with typed identifiers should not fall back to free text'
  ).toHaveCount(0)

  // Photographed empty, before anything is typed. The counter says which animal
  // the open form is for, and with no record saved it is the first of one.
  await expect(
    card.getByRole('heading', { level: 3 }),
    'the counter should name the animal the open form is for'
  ).toHaveText(`Enter details for ${COW_SPECIES} 1 of 1`)
  await expect(
    card.locator('.govuk-summary-list__row'),
    'nothing should have been entered yet'
  ).toHaveCount(0)

  await record.record(page, 'animal-identification')
})

test('records the identification card for a Horse line', async ({ page }) => {
  const card = await openIdentificationFor(page, HORSE_LINE, ONE_ANIMAL)

  // Horse is the only commodity on the horse-name list, and it is on the
  // passport list too, so this card is the only place either the horse-name
  // field or a passport beside it can be seen.
  await expect(
    identifierField(page, 'horseName'),
    'a Horse line should ask for the horse name'
  ).toBeVisible()
  await expect(
    identifierField(page, 'animalIdentifierPassport'),
    'and for a passport number'
  ).toBeVisible()
  await expect(
    identifierField(page, 'animalIdentifierEarTag'),
    'the ear tag is a Cow field and should not be on a Horse card'
  ).toHaveCount(0)
  await expect(
    identifierField(page, 'animalIdentifierTattoo'),
    'and neither should the tattoo'
  ).toHaveCount(0)
  await expect(
    identifierField(page, 'animalIdentifierIdentificationDetails'),
    'a commodity with typed identifiers should not fall back to free text'
  ).toHaveCount(0)

  await expect(
    card.getByRole('heading', { level: 3 }),
    'the counter should name the animal the open form is for'
  ).toHaveText(`Enter details for ${HORSE_SPECIES} 1 of 1`)

  await record.record(page, 'animal-identification-horse')
})

test('records the identification card for a Fish line', async ({ page }) => {
  const card = await openIdentificationFor(page, FISH_LINE, ONE_ANIMAL)

  // Fish is on none of the four typed-identifier lists, and the two free-text
  // fields are gated on exactly that — each applies when the line's commodity
  // is outside the union of those four lists. So this card is the fallback in
  // its only form, and the state a finding about identification details or an
  // animal description has nowhere else to resolve against.
  await expect(
    identifierField(page, 'animalIdentifierIdentificationDetails'),
    'a commodity with no typed identifier should fall back to identification details'
  ).toBeVisible()
  await expect(
    identifierField(page, 'animalIdentifierDescription'),
    'and to a free-text description'
  ).toBeVisible()
  for (const typed of [
    'animalIdentifierPassport',
    'animalIdentifierTattoo',
    'animalIdentifierEarTag',
    'horseName'
  ]) {
    await expect(
      identifierField(page, typed),
      `${typed} is a typed identifier and should not be on a Fish card`
    ).toHaveCount(0)
  }

  await expect(
    card.getByRole('heading', { level: 3 }),
    'the counter should name the animal the open form is for'
  ).toHaveText(`Enter details for ${FISH_SPECIES} 1 of 1`)

  await record.record(page, 'animal-identification-fish')
})

test('records the identification card for a Cat line, which asks for a permanent address', async ({
  page
}) => {
  const card = await openIdentificationFor(page, CAT_LINE, ONE_ANIMAL)

  // Cat and Dog are the only commodities on the permanent-address list, and the
  // two sit on identical lists — passport, tattoo and permanent address — so
  // one of them photographs both. The block is the fourth and last shape the
  // card takes, and the one the other four states cannot show: a Cow, Horse or
  // Fish line never triggers it, so anything said about its placement, its
  // guidance or its labels rests on source alone until this picture exists.
  //
  // It is also the only MANDATORY obligation inside the card. The five typed
  // and free-text identifiers are each optional on their own — the unit record
  // requires any one of the six — whereas a permanent address is required
  // outright for these two commodities.
  await expect(
    identifierField(page, 'animalIdentifierPassport'),
    'a Cat line should ask for a passport number'
  ).toBeVisible()
  await expect(
    identifierField(page, 'animalIdentifierTattoo'),
    'and for a tattoo'
  ).toBeVisible()
  await expect(
    identifierField(page, 'animalIdentifierEarTag'),
    'the ear tag is a Cow field and should not be on a Cat card'
  ).toHaveCount(0)
  await expect(
    identifierField(page, 'horseName'),
    'and the horse name is a Horse field'
  ).toHaveCount(0)
  await expect(
    identifierField(page, 'animalIdentifierIdentificationDetails'),
    'a commodity with typed identifiers should not fall back to free text'
  ).toHaveCount(0)

  // The assertion that makes the name on this picture honest. Without it, a run
  // in which the gate silently stopped firing would photograph an ordinary
  // two-identifier card under a name promising an address form, and no reader
  // downstream could tell. The heading and its sentence are the block's own,
  // rendered by the card rather than by any shared partial.
  await expect(
    card.getByRole('heading', { level: 3, name: 'Permanent address' }),
    'a Cat line should render the permanent-address block'
  ).toBeVisible()
  await expect(
    card.getByText('A permanent address is required for this animal.'),
    'and say that the address is required rather than offered'
  ).toBeVisible()

  // All nine controls, in the block's own field order, present and empty. The
  // count matters as much as the presence: a block rendering two of its nine
  // fields would pass a "the address form is there" check and be the wrong
  // picture for three of the four questions asked about it.
  for (const field of [
    'nameOrOrganisationName',
    'addressLine1',
    'addressLine2',
    'townOrCity',
    'county',
    'postalOrZipCode',
    'country',
    'telephoneNumber',
    'emailAddress'
  ]) {
    await expect(
      addressField(page, field),
      `the permanent address should ask for ${field}, empty`
    ).toHaveValue('')
  }

  // Named rather than matched by level, because this is the one card shape with
  // two third-level headings — the counter and the address block's own — so an
  // unnamed locator resolves to both and asserts nothing about either.
  await expect(
    card.getByRole('heading', {
      level: 3,
      name: `Enter details for ${CAT_SPECIES} 1 of 1`
    }),
    'the counter should name the animal the open form is for'
  ).toBeVisible()
  await expect(
    card.locator('.govuk-summary-list__row'),
    'and nothing should have been entered yet'
  ).toHaveCount(0)

  await record.record(page, 'animal-identification-permanent-address')
})

test('records the identification card with one animal saved, and at its maximum', async ({
  page
}) => {
  const card = await openIdentificationFor(page, COW_LINE, TWO_ANIMALS)

  await identifierField(page, 'animalIdentifierEarTag').fill(EAR_TAG)

  // "Save and add another" is the per-card button, named `action` and valued
  // `add:<line index>`. It appends the record and comes back to this page, which
  // is what makes a saved record and an empty form appear together.
  await page.getByRole('button', { name: 'Save and add another' }).click()
  await expect(
    page,
    'saving a record should return to the identification page'
  ).toHaveURL(/\/commodities\/identification$/)

  // Four things make this the state the findings are about, and each is asserted
  // rather than assumed: the saved record listed in the card's own summary list,
  // the label it was given, the counter naming the animal the form is now for,
  // and the form being open and empty. A card that had silently rejected the
  // save would show the same page, with the same button, and no row.
  await expect(
    card.locator('.govuk-summary-list__row'),
    'one record should have been saved, and only one'
  ).toHaveCount(1)
  await expect(
    card.locator('.govuk-summary-list__key'),
    'the saved record should be listed as the first animal'
  ).toHaveText('Animal 1')
  await expect(
    card.getByRole('heading', { level: 3 }),
    'the counter should have moved on to the second animal'
  ).toHaveText(`Enter details for ${COW_SPECIES} 2 of 2`)
  await expect(
    identifierField(page, 'animalIdentifierEarTag'),
    'the form should be open again, and empty'
  ).toHaveValue('')

  await record.record(page, 'animal-identification-saved')

  // One more save closes the card. The counter and every field are replaced by a
  // single line of text, and the only thing left to do is remove a record.
  await identifierField(page, 'animalIdentifierEarTag').fill(SECOND_EAR_TAG)
  await page.getByRole('button', { name: 'Save and add another' }).click()
  await expect(page).toHaveURL(/\/commodities\/identification$/)

  await expect(
    card.locator('.govuk-summary-list__key'),
    'both animals should now be listed'
  ).toHaveText(['Animal 1', 'Animal 2'])
  await expect(
    card.getByText(
      `You have entered details for all 2 ${COW_SPECIES} animals.`,
      { exact: false }
    ),
    'a full card should say so in place of the counter'
  ).toBeVisible()
  await expect(
    card.getByRole('heading', { level: 3 }),
    'and there is no counter left, because there is nothing left to count'
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Save and add another' }),
    'a full card offers no way to add another'
  ).toHaveCount(0)
  await expect(
    identifierField(page, 'animalIdentifierEarTag'),
    'and no form to add it with'
  ).toHaveCount(0)

  await record.record(page, 'animal-identification-at-maximum')
})

test('records the prompt that deletes a notification', async ({ page }) => {
  await startNotification(page)
  await answerOrigin(page)

  // Delete is offered on every dashboard card whatever the notification's
  // status, so a draft with only its origin answered reaches this screen — no
  // journey behind it and nothing on the prompt that depends on one.
  await openDashboard(page)
  await expect(
    page.locator('.govuk-summary-card'),
    'the notification just started should be the only one listed'
  ).toHaveCount(1)

  // Every dashboard action carries a visually-hidden "notification <reference>"
  // suffix, so the accessible name is never the bare word. The reference is
  // minted per run, so it is matched by prefix rather than in full.
  await page.getByRole('link', { name: /^Delete notification / }).click()

  await expect(page, 'Delete should open the confirmation page').toHaveURL(
    /\/notifications\/[^/]+\/delete$/
  )
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Delete this notification?'
  )

  await record.record(page, 'delete-notification')
})

test('records check your answers on a submitted notification, and cancelling an amendment', async ({
  page
}) => {
  await answerEveryTaskRow(page)
  await submitNotification(page)

  // The dashboard is how a user comes back to a notification they have already
  // sent: a submitted card swaps Resume for View, and View is the review page
  // again. Reached that way rather than by typing the URL, because the question
  // this capture settles is what a user meets on the route the service offers.
  await openDashboard(page)
  await page.getByRole('link', { name: /^View notification / }).click()
  await expect(page).toHaveURL(/\/notification-view$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Check your answers'
  )

  // What makes this a second screen rather than a second photograph of the
  // first: the status tag, and the actions a draft has no counterpart to. The
  // page renders read-only once the notification is submitted, and read-only is
  // what puts Copy as new and Delete at the top of it.
  await expect(
    page.locator('.app-journey-strip .govuk-tag'),
    'the journey strip should say the notification has been submitted'
  ).toHaveText('Submitted')
  await expect(
    page.getByRole('button', { name: 'Copy as new' }),
    'a submitted notification offers to be copied'
  ).toBeVisible()

  await record.record(page, 'check-answers-submitted')

  // Amending is offered only on a submitted notification, and it is a POST
  // button rather than a link. It is what moves the notification into the state
  // the last screen needs — cancelling an amendment is offered only while one is
  // in progress, so this screen needs a submitted notification put back into
  // amendment rather than any draft.
  await openDashboard(page)
  await page.getByRole('button', { name: /^Amend notification / }).click()
  await expect(
    page,
    'amending should open the notification at its hub'
  ).toHaveURL(/\/notifications\/[^/]+$/)

  await openDashboard(page)
  await page.getByRole('link', { name: /^Cancel amendment/ }).click()
  await expect(page).toHaveURL(/\/cancel-amend$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Cancel this amendment?'
  )
  await expect(
    page.locator('.app-journey-strip .govuk-tag'),
    'the strip should say the notification is being amended'
  ).toHaveText('Amending')

  await record.record(page, 'cancel-amend')
})
