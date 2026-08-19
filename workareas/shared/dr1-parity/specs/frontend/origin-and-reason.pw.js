//
// Frontend slice: origin of the import, the reason for importing, and the four
// pages the chosen reason opens or closes.
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// frontend is correct. Every step does assert that the journey landed where it
// should, because a mislabelled capture is worse than a missing one.
//
// It borrows nothing from the frontend repo — not its `fit/` journey driver,
// not its fixtures. Those are another suite's test code, and a capture built on
// them breaks the first time somebody refactors a suite nobody runs.
//
// Every page here is photographed EMPTY, before anything is typed into it. That
// is the screen the design defines; a half-filled form is a screen nobody
// specified. Answers are given only to move on to the next page.
//
import { readFileSync } from 'node:fs'

const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

// Chosen by ISO code rather than by name: in stub mode the country list is a
// fixture, and in a real run it is refetched from reference data, so the code
// is the half that survives. (The list already carries "Netherlands (the)",
// which is what a name-matched locator trips over.)
const COUNTRY_CODE = 'FR'
const DESTINATION_COUNTRY_CODE = 'DE'

// Aberdeen Harbour. Port option values are the raw codes and they contain a
// space — "GB ABD", not "GBABD" — with one entry in the catalogue that breaks
// even that rule ("GBSHS"). Selecting by value avoids the option text, which
// repeats: "Pembroke Port" and "Port of Sheerness" each appear twice.
const PORT_CODE = 'GB ABD'

// A Cow line. Cow is what puts the unweaned-animals question on the additional
// details page and the CPH page in scope, so it keeps this slice's screens in
// the shape the rest of the comparison photographs.
const SPECIES = 'Bos taurus'

// Which reason opens which page. Read straight off the obligations: the four
// gates are `equalsGate`/`includesGate` over reasonForImport, so this table is
// the whole of the branching and nothing else decides it.
//
//   internalMarket           -> import-purpose
//   transhipmentOrOnwardTravel -> destination-country
//   transit                  -> destination-country, port-of-exit
//   temporaryAdmissionHorses -> port-of-exit, exit-date
//   reEntry                  -> none of them
//
// The exit trio is NOT part of the opening run, so saving import-reason never
// lands on it however the reason is answered. It is reached from the hub's
// "Exit details" row, which is `conditional` and disappears entirely for a
// reason that opens none of the three — which is also the proof the gate fired.
const REASON = {
  internalMarket: 'Internal market',
  transit: 'Transit',
  temporaryAdmissionHorses: 'Temporary admission horses'
}

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
// Both are "enforced at continue": every task row after the commodity page is
// blocked until countryOfOrigin and commoditySelection are answered, so without
// them the hub is a wall of "Cannot start yet" and no link exists to follow.
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
  await expect(page).toHaveURL(/\/consignment-details$/)
}

// Answer the reason and leave. Where it lands depends on the reason — the
// opening run picks the next step it can reach — so this asserts only that the
// page accepted the answer and moved, not where to.
const answerReason = async (page, reason) => {
  await openHub(page)
  await page.getByRole('link', { name: 'Main reason for importing' }).click()
  await expect(page).toHaveURL(/\/import-reason$/)
  await page.locator(`input[name="reasonForImport"][value="${reason}"]`).check()
  await saveAndContinue(page)
  await expect(page, 'the reason should be accepted').not.toHaveURL(
    /\/import-reason$/
  )
}

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(() => {
  record.write()
})

test('records origin', async ({ page }) => {
  await startNotification(page)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Origin of the import'
  )

  const row = await record.record(page, 'origin')

  expect(
    row.title,
    'the screen should have a title to file it under'
  ).toBeTruthy()
})

test('records the reason for import, and the purpose it opens', async ({
  page
}) => {
  await unlockTheHub(page)
  await openHub(page)

  await page.getByRole('link', { name: 'Main reason for importing' }).click()
  await expect(page).toHaveURL(/\/import-reason$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'What is the main reason for importing the animals?'
  )

  await record.record(page, 'import-reason')

  await page
    .locator(`input[name="reasonForImport"][value="internalMarket"]`)
    .check()
  await saveAndContinue(page)

  // The one branch the opening run takes itself: purposeInInternalMarket comes
  // into scope on this answer, so the run's next step resolves to it. Any other
  // reason and the run skips straight past to animal identification.
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
  await answerReason(page, 'transit')
  await openHub(page)

  // "Exit details" is a conditional row: it is removed from the hub entirely
  // when none of its three pages is in scope. Its presence here is the proof
  // that the transit answer took, and its link goes to the first of the three
  // that passes its gate — which for transit is destination country.
  await page.getByRole('link', { name: 'Exit details' }).click()
  await expect(
    page,
    'transit should put destination country first in the exit-details row'
  ).toHaveURL(/\/destination-country$/)
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

test('records exit date, which only temporary admission of horses opens', async ({
  page
}) => {
  await unlockTheHub(page)
  await answerReason(page, 'temporaryAdmissionHorses')
  await openHub(page)

  // The narrowest of the four gates: exit date is in scope for this reason and
  // no other. Destination country is out of scope here, so the same row link
  // that opened destination country under transit opens port of exit instead.
  await page.getByRole('link', { name: 'Exit details' }).click()
  await expect(
    page,
    'temporary admission should skip destination country and start at port of exit'
  ).toHaveURL(/\/port-of-exit$/)

  await page.locator('#portOfExit').selectOption(PORT_CODE)
  await saveAndContinue(page)

  await expect(page, 'port of exit should carry on to exit date').toHaveURL(
    /\/exit-date$/
  )
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Exit date')

  // Nothing is typed in. Worth saying why, because the sibling arrival date on
  // the transport slice is the opposite case: that one has a rolling window
  // (seven days back, six months ahead) and a hardcoded value silently expires.
  // This field has no window at all — `dateText` is built with neither a min
  // nor a max — so an empty capture here is the whole screen, not a shortcut.
  await record.record(page, 'exit-date')
})

test('records additional animal details', async ({ page }) => {
  await unlockTheHub(page)
  await openHub(page)

  // The hub calls this row "Additional commodity details" and the page calls
  // itself "Additional animal details". Both strings are asserted, because a
  // locator built from the wrong one of the pair fails in a way that reads as a
  // missing page rather than as a wrong name.
  await page.getByRole('link', { name: 'Additional commodity details' }).click()
  await expect(page).toHaveURL(/\/additional-details$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Additional animal details'
  )

  // The unweaned-animals question is a server-side conditional, not a reveal:
  // it is rendered only when a commodity line is a Cow or a Horse. With a cat
  // or a fish the page is one radio group shorter and the capture is of a
  // different screen under the same name.
  await expect(
    page.getByRole('group', {
      name: 'Does the consignment contain any unweaned animals?'
    }),
    'a Cow line should put the unweaned-animals question on the page'
  ).toBeVisible()

  await record.record(page, 'additional-details')
})
