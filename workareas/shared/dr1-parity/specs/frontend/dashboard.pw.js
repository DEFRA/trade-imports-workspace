//
// Frontend slice: the dashboard in both its states, the notification hub, and
// the delete prompt.
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// frontend is correct. Every step does assert that the journey landed where it
// should, because a silently-rejected page leaves a mislabelled capture behind,
// and a mislabelled capture is worse than a missing one.
//
// It borrows nothing from the frontend repo. The repo's own `fit/` suite has a
// journey driver that would do half of this, but it is another suite's test
// code: a capture built on it breaks the first time somebody refactors a suite
// nobody runs. Every selector below is re-derived from the templates and the
// copy files, in the open, where a reader can check it.
//
import { readFileSync } from 'node:fs'

// A spec imports exactly one thing. It lives in the corpus workarea, outside
// any package, so a bare specifier resolves to nothing here — and tim's answer
// to that is to hand every spec the absolute path to one module that carries
// what it needs, Playwright's own test and expect included.
const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

// The country is chosen by ISO code rather than by name. In stub mode the list
// is a fixture; in a real run `countries.prime()` refetches it, and a name is
// the half that moves. "Netherlands (the)" is already in there to prove it.
const COUNTRY_CODE = 'FR'

// Bos taurus is a Cow line, and Cow is the one commodity that puts the CPH page
// in scope and the unweaned-animals question on the page. Choosing it here
// keeps the hub's task list in the same shape the other slices photograph.
const SPECIES = 'Bos taurus'

// The frontend enforces auth even in stub mode; what stub mode replaces is only
// the Defra ID round-trip. An unauthenticated request is redirected to
// /auth/sign-in, which mints a locally signed session and sends the browser
// back — so nothing here signs in explicitly, and the assertion below is what
// proves that round-trip happened rather than leaving us on a sign-in page.
const openDashboard = async (page) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1 }),
    'the dashboard should render, which means stub sign-in completed'
  ).toHaveText('Import notification service')
}

const saveAndContinue = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

// Every page of a notification hangs off /notifications/<id>, and that bare
// path is the hub itself. Read the id off whatever page we are standing on
// rather than remembering it: the id is minted by the server when the
// notification is created and never appears anywhere else.
const hubPath = (page) => {
  const found = new URL(page.url()).pathname.match(/^\/notifications\/[^/]+/)
  if (!found) {
    throw new Error(`Not inside a notification: ${page.url()}`)
  }
  return found[0]
}

// Origin is the journey's entry page and the only one the deep-link guard
// exempts. Until it is answered the guard bounces every other page in the
// journey back here, so every slice starts by getting past it.
const answerOrigin = async (page) => {
  await page.locator('#countryOfOrigin').selectOption(COUNTRY_CODE)
  await page
    .locator('input[name="regionOfOriginCodeRequirement"][value="no"]')
    .check()
  await saveAndContinue(page)
}

const startNotification = async (page) => {
  await openDashboard(page)
  await page.getByRole('button', { name: 'Start a new notification' }).click()
  await expect(
    page,
    'starting a notification should open the origin page'
  ).toHaveURL(/\/notifications\/[^/]+\/origin$/)
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
  // of the run, and the empty shot cannot be spoiled by a slice that ran first.
  // Assert the empty paragraph all the same: with a cookie present the page
  // still renders, just with rows, and the two shots would be indistinguishable
  // by name alone.
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
    'the notification just started should be listed'
  ).toHaveCount(1)

  await record.record(page, 'dashboard-populated')
})

test('records the notification hub', async ({ page }) => {
  await startNotification(page)
  await answerOrigin(page)

  // Saving origin hands over to the opening run, which sequences the commodity
  // page next. Answering it matters for the hub rather than for this page: a
  // task row is blocked until countryOfOrigin and commoditySelection are both
  // answered, so without a species the hub photographs as a wall of "Cannot
  // start yet" rather than as the task list a user works from.
  await expect(page, 'origin should hand over to the commodity page').toHaveURL(
    /\/commodities$/
  )
  await page.getByRole('checkbox', { name: SPECIES }).check()
  await saveAndContinue(page)
  await expect(page).toHaveURL(/\/consignment-details$/)

  await page.goto(hubPath(page))
  await expect(
    page.getByRole('heading', { level: 1 }),
    'the hub should render its task list'
  ).toHaveText('Overview')

  await record.record(page, 'hub')
})

test('records the delete confirmation', async ({ page }) => {
  await startNotification(page)
  await answerOrigin(page)
  await openDashboard(page)

  // Every dashboard action carries a visually-hidden "notification <reference>"
  // suffix, so the accessible name is never the bare word. Match on the prefix
  // rather than on an exact name nobody can predict.
  await page.getByRole('link', { name: /^Delete notification / }).click()

  await expect(page, 'Delete should open the confirmation page').toHaveURL(
    /\/notifications\/[^/]+\/delete$/
  )
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Delete this notification?'
  )

  await record.record(page, 'delete-notification')
})
