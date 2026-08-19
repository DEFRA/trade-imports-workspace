//
// Frontend slice: the commodity pages, the contact address, and the end of the
// journey — check your answers, the declaration, the confirmation, and the
// prompt that cancels an amendment.
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// frontend is correct. Every step does assert that the journey landed where it
// should, because a mislabelled capture is worse than a missing one.
//
// It borrows nothing from the frontend repo — not its `fit/` journey driver,
// not its happy-path fixture. Those are another suite's test code, and a
// capture built on them breaks the first time somebody refactors a suite nobody
// runs. Every selector and every stub value below is re-derived here, in the
// open, where a reader can check it against the templates.
//
// This is the slice that has to answer EVERYTHING. The review section is the
// journey's one authored gate: it opens only when every task row is fulfilled,
// optional or out of scope. A row left blank does not announce itself — the
// hub's "Check and submit" row simply renders as plain text with no link — so
// the walk below answers each row in turn and the click that opens the review
// page is the proof they all took.
//
import { readFileSync } from 'node:fs'

const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

// Chosen by ISO code rather than by name: the country list is a fixture in stub
// mode and refetched from reference data otherwise, so the code is the half
// that survives.
const COUNTRY_CODE = 'FR'

// A Cow line. Cow drives three things this slice depends on: the ear-tag
// identifier field, the unweaned-animals question, and the CPH page — all three
// are allow-lists keyed on the commodity, and every one of them is a mandatory
// obligation once it is in scope. Choose a cat and the review gate never opens
// for reasons three screens apart.
const SPECIES = 'Bos taurus'

// One animal, because the identifier collection is capped at — and required to
// equal — the number of animals on the line. Two animals means two identifier
// records before the row counts as complete.
const ANIMAL_COUNT = '1'

const EAR_TAG = 'UK123456789012'
const SECOND_EAR_TAG = 'UK210987654321'

// The other two commodities the identification states need, named by species
// for the same reason the Cow line is: the commodity page lists species, not
// commodities, grouped under a fieldset per commodity.
//
// Horse is the only commodity on the horse-name allow-list and Fish is on none
// of the four typed-identifier lists at all, so between them and the Cow line
// above every shape the identification card can take is photographed once.
const HORSE_SPECIES = 'Equus caballus'
const FISH_SPECIES = 'Salmo salar'

// Aberdeen Harbour. Port option values are the raw codes and the visible text
// is "<name> (<code>)". Most codes carry an embedded space — "GB ABD" — but the
// catalogue breaks that exactly once, at "GBSHS", so the value can never be
// derived from the name by rule. Both halves are spelt out because the widget
// needs the text and the assertion needs the value.
const PORT_OPTION = 'Aberdeen Harbour (GB ABD)'
const PORT_CODE = 'GB ABD'

const MEANS_OF_TRANSPORT = 'ROAD_VEHICLE'
const TRANSIT_COUNTRIES = ['France', 'Belgium']

const TRANSPORT_IDENTIFICATION = 'FR-892-LK'
const TRANSPORT_DOCUMENT_REFERENCE = 'CMR-2026-884721'

// Nine digits. The page strips slashes before validating, so "123/456/789"
// would be accepted too and stored the same way — but it must be exactly nine
// digits once stripped, and a blank or short value is rejected on the page.
const CPH_NUMBER = '123456789'

// The arrival date the frontend accepts is a rolling window: seven days behind
// today to six months ahead, inclusive, in Europe/London. A hardcoded date
// silently falls out of it — and the page does not reject it as a page error
// you would notice, it just leaves arrivalDateAtPort unanswered, so the review
// gate never opens and the failure surfaces as a missing link on the hub with
// nothing pointing back here.
//
// So it is derived from today. It is not, though, the only thing that moves
// between runs: the notification reference is minted per run and printed in the
// Draft tag on every journey page, so screenshot bytes and the manifest's `url`
// change on every capture whether or not anything else did. What IS stable at
// one commit is the page model and the captured HTML — both are masked, and the
// reference and the journey id are what the mask replaces. Read a changed
// screenshot hash as "recaptured", never as "changed"; read a changed model as
// a change. This date is one of the few things the mask does not cover, and it
// shows on the check-your-answers screen alone.
//
// The format is d/M/yyyy with no leading zeros — that is what the field's own
// formatter writes back, so writing "03/01/2026" would disagree with the value
// the page renders.
const ARRIVAL_DATE = (() => {
  const when = new Date()
  when.setUTCMonth(when.getUTCMonth() + 1)
  return `${when.getUTCDate()}/${when.getUTCMonth() + 1}/${when.getUTCFullYear()}`
})()

// The five consignment parties, in the order the addresses hub lists them.
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

const openDashboard = async (page) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1 }),
    'the dashboard should render, which means stub sign-in completed'
  ).toHaveText('Import notification service')
}

// Auth is enforced even in stub mode; only the Defra ID round-trip is replaced.
// An unauthenticated request is bounced through /auth/sign-in, which mints a
// locally signed session and sends the browser back.
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
// it. Answering it also satisfies the first of the two "enforced at continue"
// obligations that unblock the rest of the hub.
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

// The commodity leg: pick a species, then say how many animals. Together with
// the origin country this is what every later task row is blocked on.
const answerCommodities = async (page) => {
  await page.getByRole('checkbox', { name: SPECIES }).check()
  await saveAndContinue(page)
  await expect(page).toHaveURL(/\/consignment-details$/)

  // The count inputs are named per LINE, not per page — `-0` is the first
  // commodity line. A page-wide "fill the number field" would break the moment
  // a consignment carried two species, and silently: the second line's count
  // stays blank and the commodities row never completes.
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

const answerImportReason = async (page) => {
  await openHub(page)
  await page.getByRole('link', { name: 'Main reason for importing' }).click()
  await expect(page).toHaveURL(/\/import-reason$/)
  await page
    .locator('input[name="reasonForImport"][value="internalMarket"]')
    .check()
  await saveAndContinue(page)

  // Internal market is the one reason that opens the purpose page, and the
  // purpose is mandatory once it is in scope. It is also the reason that leaves
  // the whole exit-details row out of scope, which is what keeps this walk from
  // having to answer a destination country and a port of exit as well.
  await expect(page).toHaveURL(/\/import-purpose$/)
  await page
    .locator('input[name="purposeInInternalMarket"][value="breeding"]')
    .check()
  await saveAndContinue(page)
}

const answerAnimalIdentification = async (page) => {
  await openHub(page)
  await page
    .getByRole('link', { name: 'Animal identification details' })
    .click()
  await expect(page).toHaveURL(/\/commodities\/identification$/)

  await page.locator('#animalIdentifierEarTag-0').fill(EAR_TAG)

  // The page renders a second, visually-hidden "Save and finish" button first,
  // purely so that pressing Enter in a text field submits the intended action.
  // It carries aria-hidden, so a role-based locator matches only the real one —
  // a CSS locator on the name and value would match both and click the decoy.
  await page.getByRole('button', { name: 'Save and finish' }).click()

  // Back to the hub, and that is knowable rather than incidental: the
  // animalIdentification section holds this page and no other, so there is no
  // next page in the section and the hub is where saving goes.
  await expect(
    page,
    'saving the identifier should return to the hub'
  ).toHaveURL(/\/notifications\/[^/]+$/)
}

const answerAdditionalDetails = async (page) => {
  await openHub(page)
  await page.getByRole('link', { name: 'Additional commodity details' }).click()
  await expect(page).toHaveURL(/\/additional-details$/)

  await page
    .locator('input[name="animalsCertifiedFor"][value="slaughter"]')
    .check()

  // The unweaned question is a server-side conditional, not a JS reveal: it is
  // rendered only for a Cow or a Horse line. It is mandatory when it is there,
  // so it has to be answered — and with any other species this locator would
  // find nothing and the walk would stop here rather than at the review gate.
  await page
    .locator('input[name="containsUnweanedAnimals"][value="no"]')
    .check()
  await saveAndContinue(page)
}

// Port of entry is an accessible-autocomplete over a native select, and that
// is the trap on this page. The enhancement hides the original select, RENAMES
// it to `portOfEntry-select`, and gives the visible combobox an empty name —
// so the box the user types in submits nothing at all. Typing a port and
// moving on leaves portOfEntry unanswered, the page saves happily, and the
// review gate stays shut with nothing on the arrival page to show for it.
// Choose from the listbox, then assert the hidden select actually carries the
// code.
//
// `exact: true` on the option is load-bearing rather than tidiness. Two names
// in the catalogue appear twice — "Pembroke Port" and "Port of Sheerness", each
// against two different codes — so a substring match is ambiguous by
// construction, and Playwright fails a click on a locator that resolves to more
// than one node.
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

const answerTransport = async (page) => {
  await openHub(page)
  await page.getByRole('link', { name: 'Arrival details' }).click()
  await expect(page).toHaveURL(/\/port-of-entry$/)

  // Filled rather than picked from the calendar. The MOJ date picker's dialog
  // overlays whatever comes next and cancels the first click anywhere outside
  // itself, so opening it costs a click and buys nothing here.
  await page
    .getByLabel('Arrival date at port of entry')
    .fill(ARRIVAL_DATE)
  await choosePortOfEntry(page)
  await page
    .locator(`input[name="meansOfTransport"][value="${MEANS_OF_TRANSPORT}"]`)
    .check()
  await page
    .getByLabel('Transport identification')
    .fill(TRANSPORT_IDENTIFICATION)
  await page
    .getByLabel('Transport document reference')
    .fill(TRANSPORT_DOCUMENT_REFERENCE)
  await saveAndContinue(page)

  // Land transport puts the transit-countries page in scope, and that page is
  // the one place in this journey that refuses an empty submit.
  await expect(page).toHaveURL(/\/transit-countries$/)
  for (const country of TRANSIT_COUNTRIES) {
    await page.getByRole('checkbox', { name: country, exact: true }).check()
  }
  await saveAndContinue(page)

  await expect(page).toHaveURL(/\/transporters$/)
  await page
    .locator('input[name="transporterType"][value="Commercial"]')
    .check()
  await saveAndContinue(page)

  await expect(page).toHaveURL(/\/transporters\/select$/)
  await page.locator('input[name="commercialTransporter"]').first().check()
  await saveAndContinue(page)
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
}

const answerContact = async (page) => {
  await openHub(page)
  await page.getByRole('link', { name: 'Contact address' }).click()
  await expect(page).toHaveURL(/\/consignment\/contact\/select$/)
  await page.locator('input[name="contactAddress"]').first().check()
  await saveAndContinue(page)
}

// Every task row the review gate is blocked on, answered in order. Documents is
// not among them: that row is optional, which is why the gate opens without it.
const answerEveryTaskRow = async (page) => {
  await startNotification(page)
  await answerOrigin(page)
  await answerCommodities(page)
  await answerImportReason(page)
  await answerAnimalIdentification(page)
  await answerAdditionalDetails(page)
  await answerTransport(page)
  await answerAddresses(page)
  await answerContact(page)
}

// Start a notification carrying one commodity line and stop on the
// identification page, without photographing anything on the way.
//
// Parameterised on the species and the count because those are the only two
// things the identification states below differ by, and each decides a
// different half of the screen: which identifier fields a card renders is an
// allow-list keyed on the line's COMMODITY (Cow has an ear tag, Horse a horse
// name, Fish neither), and how many records the card will take before it closes
// is the line's own animal count.
const openIdentificationFor = async (page, { species, animals }) => {
  await startNotification(page)
  await answerOrigin(page)

  await page.getByRole('checkbox', { name: species, exact: true }).check()
  await saveAndContinue(page)
  await expect(page).toHaveURL(/\/consignment-details$/)

  await page.locator('#numberOfAnimalsQuantity-0').fill(animals)
  await saveAndContinue(page)

  await openHub(page)
  await page
    .getByRole('link', { name: 'Animal identification details' })
    .click()
  await expect(page).toHaveURL(/\/commodities\/identification$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Animal identification details'
  )
}

// The identifier inputs are named `<obligation>-<line index>`, so every locator
// below carries the line it belongs to. A page-wide locator on the obligation
// name alone would match the first line of a two-line consignment and read as
// the answer for both.
const identifierField = (page, obligation, line = 0) =>
  page.locator(`#${obligation}-${line}`)

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(() => {
  record.write()
})

test('records the commodity pages and the contact address', async ({ page }) => {
  await startNotification(page)
  await answerOrigin(page)

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'What are you importing?'
  )

  await record.record(page, 'commodity-search')

  await page.getByRole('checkbox', { name: SPECIES }).check()
  await saveAndContinue(page)
  await expect(page).toHaveURL(/\/consignment-details$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Consignment details'
  )

  await record.record(page, 'consignment-details')

  await page.locator('#numberOfAnimalsQuantity-0').fill(ANIMAL_COUNT)
  await saveAndContinue(page)

  await openHub(page)
  await page
    .getByRole('link', { name: 'Animal identification details' })
    .click()
  await expect(page).toHaveURL(/\/commodities\/identification$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Animal identification details'
  )

  await record.record(page, 'animal-identification')

  await openHub(page)
  await page.getByRole('link', { name: 'Contact address' }).click()
  await expect(page).toHaveURL(/\/consignment\/contact\/select$/)

  // No <h1> element — the radio group's legend is the page heading, which
  // govuk-frontend renders as an <h1> inside the <legend>.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Contact address for consignment'
  )

  await record.record(page, 'contact')
})

test('records check your answers, the declaration, the confirmation and cancelling an amendment', async ({
  page
}) => {
  await answerEveryTaskRow(page)

  await openHub(page)

  // The review row renders as plain text with no link while any task row is
  // outstanding, so this is the assertion that the whole walk above took. Say
  // so here: a bare click failure three lines down reads as a missing page.
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

  await record.record(page, 'declaration')

  // The declaration is confirmed with a CHECKBOX, not a radio, and there is no
  // fieldset around it. Leaving it unticked re-renders the same URL with an
  // error, so the walk would stall on the declaration with nothing submitted.
  await page.locator('input[name="declaration"]').check()
  await continueOn(page)

  await expect(page, 'a confirmed declaration should submit').toHaveURL(
    /\/confirmation$/
  )

  // The confirmation's heading is a GOV.UK panel title, so it is an <h1> with
  // the panel's class rather than a heading element of the page's own.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Import notification submitted'
  )

  await record.record(page, 'confirmation')

  // Amending is offered only on a submitted notification, and it is a POST
  // button rather than a link. Every dashboard action carries a visually-hidden
  // "notification <reference>" suffix, so the accessible name is never the bare
  // word.
  await openDashboard(page)
  await page.getByRole('button', { name: /^Amend notification / }).click()
  await expect(
    page,
    'amending should open the notification at its hub'
  ).toHaveURL(/\/notifications\/[^/]+$/)

  // And cancelling an amendment is offered only while one is in progress, which
  // is why this screen needs a submitted notification put back into amendment
  // rather than any draft.
  await openDashboard(page)
  await page.getByRole('link', { name: /^Cancel amendment/ }).click()
  await expect(page).toHaveURL(/\/cancel-amend$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Cancel this amendment?'
  )

  await record.record(page, 'cancel-amend')
})

test('records the identification page with one animal saved and one outstanding, and at its maximum', async ({
  page
}) => {
  // Two animals on the line, because the collection is capped at — and required
  // to equal — the number of animals. One animal would put the card straight
  // into its at-maximum state on the first save and there would be no "one
  // saved, one outstanding" to photograph.
  await openIdentificationFor(page, { species: SPECIES, animals: '2' })

  // The page is one card per commodity line, and every assertion below is
  // scoped to this consignment's only card. A page-wide locator would match the
  // wrong line's records on a two-line consignment; the card carries an id
  // built from the line index for exactly that reason.
  const card = page.locator('#identification-card-0')
  await expect(card, 'the line should have a card of its own').toBeVisible()

  await identifierField(page, 'animalIdentifierEarTag').fill(EAR_TAG)

  // "Save and add another" is the per-card button, named `action` and valued
  // `add:<line index>`. It appends the record and comes back to this page,
  // which is what makes a saved record and an empty form appear together.
  await page.getByRole('button', { name: 'Save and add another' }).click()
  await expect(
    page,
    'saving a record should return to the identification page'
  ).toHaveURL(/\/commodities\/identification$/)

  // Three things make this the state the findings are about, and each is
  // asserted rather than assumed: the saved record listed in the card's own
  // summary list, the counter saying which animal the form is now for, and the
  // form still being open. A card that had silently rejected the save would
  // show the same page with the same button and no row.
  await expect(
    card.locator('.govuk-summary-list__row'),
    'one record should have been saved, and only one'
  ).toHaveCount(1)
  await expect(
    card.locator('.govuk-summary-list__key'),
    'the saved record should be listed as the first animal'
  ).toHaveText('Animal 1')
  await expect(
    card.locator('h3'),
    'the counter should name the animal the open form is for'
  ).toHaveText(`Enter details for ${SPECIES} 2 of 2`)
  await expect(
    identifierField(page, 'animalIdentifierEarTag'),
    'the form should be open again, and empty'
  ).toHaveValue('')

  await record.record(page, 'animal-identification-saved')

  // And one more save closes the card. The counter and every field are replaced
  // by a single line of text, and the only thing left to do is remove a record
  // — which is the behaviour a finding reads today from source alone, because
  // both captures hold zero saved records.
  await identifierField(page, 'animalIdentifierEarTag').fill(SECOND_EAR_TAG)
  await page.getByRole('button', { name: 'Save and add another' }).click()
  await expect(page).toHaveURL(/\/commodities\/identification$/)

  await expect(
    card.locator('.govuk-summary-list__key'),
    'both animals should now be listed'
  ).toHaveText(['Animal 1', 'Animal 2'])
  await expect(
    card.getByText(`You have entered details for all 2 ${SPECIES} animals.`, {
      exact: false
    }),
    'a full card should say so in place of the counter'
  ).toBeVisible()
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

test('records the identification page for a Horse line', async ({ page }) => {
  await openIdentificationFor(page, { species: HORSE_SPECIES, animals: '1' })

  // Which identifier fields a card renders is decided by the commodity and by
  // nothing else — each field is an obligation gated on an allow-list of
  // commodities. Horse is on the passport and horse-name lists and on no other,
  // so this card is the only place either the horse-name field or a passport
  // beside it can be seen. Both halves are asserted: what is there, and what a
  // Cow card has that this one does not.
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
    identifierField(page, 'animalIdentifierIdentificationDetails'),
    'and a commodity with typed identifiers should not fall back to free text'
  ).toHaveCount(0)

  await record.record(page, 'animal-identification-horse')
})

test('records the identification page for a Fish line', async ({ page }) => {
  await openIdentificationFor(page, { species: FISH_SPECIES, animals: '1' })

  // Fish is on none of the four typed-identifier allow-lists, and the two
  // free-text fields are gated on exactly that: their obligations apply when
  // the commodity is NOT in the union of those lists. So this card is the
  // fallback in its only form — the state a finding about identification
  // details or an animal description has nowhere else to resolve against.
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

  await record.record(page, 'animal-identification-fish')
})

test('records check your answers on a notification that has been submitted', async ({
  page
}) => {
  await answerEveryTaskRow(page)
  await openHub(page)

  const review = page.getByRole('link', { name: 'Check and submit' })
  await expect(
    review,
    'every task row should be answered, which is what turns the review row into a link'
  ).toBeVisible()
  await review.click()
  await expect(page).toHaveURL(/\/notification-view$/)

  await continueOn(page)
  await expect(
    page,
    'a complete review should reach the declaration'
  ).toHaveURL(/\/declaration$/)
  await page.locator('input[name="declaration"]').check()
  await continueOn(page)
  await expect(page, 'a confirmed declaration should submit').toHaveURL(
    /\/confirmation$/
  )

  // The dashboard is how a user comes back to a notification they have already
  // sent: a submitted card swaps Resume for View, and View is this same page.
  // Reached that way rather than by typing the URL, because the question the
  // capture settles is what a user sees on the route the service offers them.
  await openDashboard(page)
  await page.getByRole('link', { name: /^View notification / }).click()
  await expect(page).toHaveURL(/\/notification-view$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Check your answers'
  )

  // What makes this a second screen rather than a second photograph of the
  // first: the status tag, and the actions a draft has no counterpart to. The
  // page is rendered read-only on a submitted notification, and read-only is
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
})
