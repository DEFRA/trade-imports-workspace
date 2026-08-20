//
// Frontend slice: the reason for importing, and the four pages the chosen
// reason opens or closes.
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// frontend is correct. Every step does assert that the journey landed where it
// should, because a mislabelled capture is worse than a missing one.
//
// It borrows nothing from the frontend repo — not its `fit/` journey driver,
// not its fixtures. Those are another suite's test code, and a capture built on
// them breaks the first time somebody refactors a suite nobody runs. Every
// widget is re-derived here from the rendered markup.
//
// Every page is photographed EMPTY, before anything is typed into it. That is
// the screen the design defines; a half-filled form is a screen nobody
// specified. Answers are given only to move on to the next page.
//
import { readFileSync } from 'node:fs'

const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

// Chosen by ISO code rather than by name: in stub mode the country list is a
// fixture, and in a real run it is refetched from reference data, so the code
// is the half that survives. The list already carries "Netherlands (the)",
// which is what a name-matched locator trips over.
const COUNTRY_CODE = 'FR'
const DESTINATION_COUNTRY_CODE = 'DE'

// A Cow line, chosen by the label the checkbox carries. The species checkboxes
// post `Cow|1148346` — a taxon id minted by reference data — so the value is
// the volatile half of that pair and the visible binomial is the stable one.
const SPECIES = 'Bos taurus'

// Aberdeen Harbour, chosen by option value rather than by visible text. Most
// port codes carry an embedded space — "GB ABD" — but not all of them, so the
// value is spelt out here rather than derived from the code inside the text.
const PORT_CODE = 'GB ABD'

// Which reason opens which page. Read straight off
// sets/live-animals/obligations/sections/import-reason.js, where the four gates
// are `equalsGate`/`includesGate` over reasonForImport and nothing else decides
// the branching:
//
//   internalMarket             -> import-purpose
//   transhipmentOrOnwardTravel -> destination-country
//   transit                    -> destination-country, port-of-exit
//   temporaryAdmissionHorses   -> port-of-exit, exit-date
//   reEntry                    -> none of them
//
// The exit trio is not part of the opening run: `flow/run.js` RUN_STEPS lists
// origin, commodities, consignment details, import reason, import purpose,
// animal identification and additional details, and nothing else. That only
// means the opening run never sequences the exit pages. Every test here reaches
// the hub first — the hub handler calls `completeOpeningRun` — and from then on
// saving a page resolves through `flow/navigation.js` `nextInSection`. Import
// reason and all three exit pages sit in the `consignment` section in that
// order, so saving the reason walks past whichever of them the answer left out
// of scope and lands on the first one it put in.
const REASONS = {
  internalMarket: 'internalMarket',
  transit: 'transit',
  temporaryAdmissionHorses: 'temporaryAdmissionHorses'
}

// The primary submit carries no name. Its sibling posts `exit=hub`, which
// `hubExitTarget` turns into a redirect to the hub whatever the flow would
// otherwise have chosen — so a locator that caught the wrong one of the pair
// would silently return to the task list and photograph it under the next
// page's name.
const saveAndContinue = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

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
// ID round-trip. An unauthenticated request is redirected to /auth/sign-in,
// which mints a locally signed session and sends the browser back — so nothing
// signs in explicitly, and this assertion is what proves it happened.
const startNotification = async (page) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1 }),
    'the dashboard should render, which means stub sign-in completed'
  ).toHaveText('Import notification service')
  await page.getByRole('button', { name: 'Start a new notification' }).click()
  await expect(
    page,
    'starting a notification should open the origin page'
  ).toHaveURL(/\/notifications\/[^/]+\/origin$/)
}

// Origin and a species, which is the least that unlocks the rest of the hub.
// Both are "enforced at continue" — `ENFORCED_AT_CONTINUE` in
// bridge/obligation-source.js holds exactly countryOfOrigin and
// commoditySelection — so every page after the commodity page is gated until
// they are answered, and without them the hub is a wall of "Cannot start yet"
// with no link to follow.
//
// Neither page is recorded here: origin belongs to another slice, and the
// commodity pages to another again.
const unlockTheHub = async (page) => {
  await startNotification(page)
  await page.locator('#countryOfOrigin').selectOption(COUNTRY_CODE)
  await page
    .locator('input[name="regionOfOriginCodeRequirement"][value="no"]')
    .check()
  await saveAndContinue(page)

  await expect(page, 'origin should hand over to the commodity page').toHaveURL(
    /\/commodities$/
  )
  await page.getByRole('checkbox', { name: SPECIES }).check()
  await saveAndContinue(page)
  await expect(
    page,
    'saving a species should open the consolidated commodity details page'
  ).toHaveURL(/\/consignment-details$/)
}

// Open the reason page from the hub, photograph nothing, answer it and leave.
// Where it lands is decided by the reason and by nothing else, so the caller
// names the landing and it is asserted positively. "No longer on import reason"
// would also be true of a redirect back to the hub, which is what a rejected
// answer looks like.
const answerReason = async (page, reason, landing) => {
  await openHub(page)
  await page.getByRole('link', { name: 'Main reason for importing' }).click()
  await expect(page).toHaveURL(/\/import-reason$/)
  await page.locator(`input[name="reasonForImport"][value="${reason}"]`).check()
  await saveAndContinue(page)
  await expect(
    page,
    `the ${reason} reason should open the next in-scope page in the section`
  ).toHaveURL(landing)
}

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(() => {
  record.write()
})

test('records the reason for import, and the purpose it opens', async ({
  page
}) => {
  await unlockTheHub(page)
  await openHub(page)

  await page.getByRole('link', { name: 'Main reason for importing' }).click()
  await expect(page).toHaveURL(/\/import-reason$/)

  // The page's own h1 is the legend of the radio fieldset and reads as a
  // question; the document title is the shorter "Reason for import". Both
  // strings are in the corpus, and a locator built from the wrong one of the
  // pair fails in a way that reads as a missing page rather than a wrong name.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'What is the main reason for importing the animals?'
  )

  const row = await record.record(page, 'import-reason')

  expect(
    row.title,
    'the manifest row should carry the page title the report files it under'
  ).toBe('Reason for import | Import notification service')

  await page
    .locator(`input[name="reasonForImport"][value="${REASONS.internalMarket}"]`)
    .check()
  await saveAndContinue(page)

  await expect(
    page,
    'the internal-market reason should open the purpose page'
  ).toHaveURL(/\/import-purpose$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Purpose in the internal market'
  )

  await record.record(page, 'import-purpose')
})

test('records destination country and port of exit, which transit opens', async ({
  page
}) => {
  await unlockTheHub(page)

  // Transit is the only reason that puts destination country and port of exit
  // in scope together, so it is the one answer that reaches both pages in a
  // single forward walk.
  await answerReason(page, REASONS.transit, /\/destination-country$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Destination country'
  )

  await record.record(page, 'destination-country')

  await page
    .locator('#destinationCountry')
    .selectOption(DESTINATION_COUNTRY_CODE)
  await saveAndContinue(page)

  await expect(
    page,
    'transit should carry on from destination country to port of exit'
  ).toHaveURL(/\/port-of-exit$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Port of exit'
  )

  await record.record(page, 'port-of-exit')
})

test('records exit date and the blocked exit-details row, which only temporary admission of horses reaches', async ({
  page
}) => {
  await unlockTheHub(page)

  // The narrowest of the four gates: exit date is in scope for this reason and
  // no other, and this reason leaves destination country out.
  //
  // The hub's "Exit details" row cannot be used to get here. `rowGatePasses` in
  // flow/navigation.js reads the row's FIRST page alone — destination country —
  // and that page is out of scope under this reason, so the hub renders the row
  // with no link and a "Cannot start yet" status. The way in is forwards: the
  // reason page's primary "Save and continue" carries no `exit` name, so it is
  // not diverted to the hub, and `nextInSection` walks past import purpose and
  // destination country to the first in-scope page after the reason, which is
  // port of exit. Saving that walks on to exit date.
  await answerReason(page, REASONS.temporaryAdmissionHorses, /\/port-of-exit$/)

  // Port of exit is photographed on the transit branch above, where it is
  // reached empty from the hub. Here it is only a step on the way through.
  await page.locator('#portOfExit').selectOption(PORT_CODE)
  await saveAndContinue(page)

  await expect(
    page,
    'port of exit should carry on to exit date under this reason'
  ).toHaveURL(/\/exit-date$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Exit date')

  // Nothing is typed in. Worth saying why, because the sibling arrival date on
  // the transport slice is the opposite case: that one has a rolling window and
  // a hardcoded value silently expires. This field is an MoJ date picker over a
  // plain text input with neither a min nor a max, so an empty capture here is
  // the whole screen rather than a shortcut. The picker is never opened, so
  // there is no calendar overlay to dismiss before the shot.
  await record.record(page, 'exit-date')

  // The hub in the state this reason leaves it in. Both pages behind the row
  // are in scope and mandatory, so the row is neither empty nor hidden — a
  // `conditional` row is dropped from the hub only when its status is NA — but
  // it renders as inert text with no link. The two assertions below are the
  // whole of it, and they are made before the picture so that a hub in any
  // other state cannot be filed under this name.
  await openHub(page)
  const exitDetailsRow = page
    .locator('.govuk-task-list__item')
    .filter({ hasText: 'Exit details' })
  await expect(
    exitDetailsRow,
    'temporary admission should keep the exit-details row on the hub'
  ).toBeVisible()
  await expect(
    exitDetailsRow.getByRole('link'),
    'the exit-details row offers no way back in under this reason'
  ).toHaveCount(0)
  await expect(
    exitDetailsRow.locator('.govuk-task-list__status'),
    'the row should read "Cannot start yet" even though port of exit is answered'
  ).toHaveText('Cannot start yet')

  await record.record(page, 'hub-exit-details-blocked')
})
