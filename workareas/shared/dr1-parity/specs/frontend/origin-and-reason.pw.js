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

// A Cow line. Cow is what puts the unweaned-animals question on the additional
// details page and the CPH page in scope, so it keeps this slice's screens in
// the shape the rest of the comparison photographs.
const SPECIES = 'Bos taurus'

// Aberdeen Harbour, chosen by option value rather than by visible text. Most
// port codes carry an embedded space — "GB ABD" — but not all of them, so the
// value is spelt out here rather than derived from the code in the text.
const PORT_CODE = 'GB ABD'

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
// The exit trio is NOT part of the opening run. That only means the run never
// sequences it: every test here opens the hub first, the hub handler closes the
// opening run, and from then on `nextInSection` picks the next page. All three
// exit pages sit in the same section as import reason, so saving the reason
// walks straight into whichever of them the answer put in scope.
//
// The hub's "Exit details" row is `conditional` and disappears entirely for a
// reason that opens none of the three, so the row's presence is the proof the
// gate fired. Whether the row also offers a way in depends on the reason — see
// the exit-date test.

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

// Answer the reason and leave. Where it lands is decided by the reason and by
// nothing else — `nextInSection` walks the consignment section in order and
// stops at the first page the answer put in scope — so the caller names the
// landing and it is asserted positively. "No longer on import reason" would
// also be true of a redirect back to the hub, which is what a rejected answer
// looks like.
const answerReason = async (page, reason, landing) => {
  await openHub(page)
  await page.getByRole('link', { name: 'Main reason for importing' }).click()
  await expect(page).toHaveURL(/\/import-reason$/)
  await page.locator(`input[name="reasonForImport"][value="${reason}"]`).check()
  await saveAndContinue(page)
  await expect(
    page,
    `the ${reason} reason should open the next page in the section`
  ).toHaveURL(landing)
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
    'the manifest row should carry the page title the report files it under'
  ).toBe('Origin of the import | Import notification service')
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
  await answerReason(page, 'transit', /\/destination-country$/)
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

  // The narrowest of the four gates: exit date is in scope for this reason and
  // no other. Saving the reason walks into the first exit page the answer put
  // in scope, which for temporary admission is port of exit, and saving that
  // walks on into exit date. Both are ordinary Save-and-continue steps.
  await answerReason(page, 'temporaryAdmissionHorses', /\/port-of-exit$/)
  await page.locator('#portOfExit').selectOption(PORT_CODE)
  await saveAndContinue(page)

  await expect(
    page,
    'port of exit should carry on to exit date under this reason'
  ).toHaveURL(/\/exit-date$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Exit date')

  // Nothing is typed in. Worth saying why, because the sibling arrival date on
  // the transport slice is the opposite case: that one has a rolling window
  // (seven days back, six months ahead) and a hardcoded value silently expires.
  // This field has no window at all — `dateText` is built with neither a min
  // nor a max — so an empty capture here is the whole screen, not a shortcut.
  await record.record(page, 'exit-date')

  // Worth recording, because it is asymmetric and a user would meet it. The
  // "Exit details" row is still on the hub — port of exit and exit date are
  // both in scope and mandatory under this reason, so the row is neither empty
  // nor hidden — but the row is gated on its FIRST page alone, destination
  // country, and that page is out of scope here. So it renders with no link:
  // both pages behind it are reachable going forwards, and unreachable on the
  // way back.
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
