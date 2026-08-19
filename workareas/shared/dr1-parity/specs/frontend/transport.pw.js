//
// Frontend slice: arrival details, transit countries, and the transporter
// branch in both of its shapes.
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// frontend is correct. Every step does assert that the journey landed where it
// should, because a mislabelled capture is worse than a missing one.
//
// It borrows nothing from the frontend repo. Every selector is re-derived from
// the templates, the copy files and the stub catalogues, in the open.
//
// Each page is photographed EMPTY, before anything is typed into it: that is
// the screen the design defines. Answers are given only to open the next one.
//
import { readFileSync } from 'node:fs'

const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

const COUNTRY_CODE = 'FR'
const SPECIES = 'Bos taurus'

// Land transport. This is the whole of what opens the transit-countries page:
// its obligation is in scope only while the means of transport is RAILWAY or
// ROAD_VEHICLE, and the hub row for it is `conditional`, so with an aeroplane
// the row vanishes from the hub and the page is never offered.
const MEANS_OF_TRANSPORT = 'ROAD_VEHICLE'

// Two of the thirty-one stub countries. Checkbox labels are the bare names —
// but note the catalogue also holds "Netherlands (the)", so a name is not
// always the plain word it looks like.
const TRANSIT_COUNTRIES = ['France', 'Belgium']

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

// Auth is enforced even in stub mode; only the Defra ID round-trip is replaced.
// An unauthenticated request is bounced through /auth/sign-in, which mints a
// locally signed session and returns — this assertion proves it did.
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

// Origin and a species: both are "enforced at continue", so until they are
// answered every later task row is blocked, shows "Cannot start yet" and
// renders no link at all — there would be nothing on the hub to click.
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

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(() => {
  record.write()
})

test('records arrival details, transit countries, and the commercial transporter', async ({
  page
}) => {
  await unlockTheHub(page)
  await openHub(page)

  await page.getByRole('link', { name: 'Arrival details' }).click()
  await expect(page).toHaveURL(/\/port-of-entry$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Arrival details'
  )

  await record.record(page, 'arrival-details')

  // Only the means of transport is answered, and only because it is what opens
  // the next page. The arrival date is deliberately left alone: nothing on this
  // page is required to continue, and the date it accepts is a rolling window —
  // seven days behind today to six months ahead — so any value written here
  // would be a pixel that changes from day to day, and any value hardcoded by a
  // later author would silently fall out of the window and leave the
  // notification quietly incomplete. (The one place a date IS needed is the
  // spine slice, which has to reach the review page; it derives one.)
  await page
    .locator(`input[name="meansOfTransport"][value="${MEANS_OF_TRANSPORT}"]`)
    .check()
  await saveAndContinue(page)

  await expect(
    page,
    'a land means of transport should open the transit-countries page'
  ).toHaveURL(/\/transit-countries$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Which countries will the consignment travel through?'
  )

  await record.record(page, 'transit-countries')

  // This is the one page in the transport section that refuses an empty
  // submit — every other field in the section is validated but allowed to be
  // blank. Leaving it empty here would re-render at the same URL with an error
  // summary, and the walk would stall with no page after it ever photographed.
  for (const country of TRANSIT_COUNTRIES) {
    await page.getByRole('checkbox', { name: country, exact: true }).check()
  }
  await saveAndContinue(page)

  await expect(page, 'transit countries should lead to the transporter').toHaveURL(
    /\/transporters$/
  )

  // No <h1> element on this page — the radio group's legend is the page
  // heading, which govuk-frontend renders as an <h1> inside the <legend>. The
  // page's own title, and the hub row that reaches it, are both "Transporter";
  // this longer string is what a reader actually sees.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'What type of transporter will move the animals?'
  )

  await record.record(page, 'transporter-type')

  await page
    .locator('input[name="transporterType"][value="Commercial"]')
    .check()
  await saveAndContinue(page)

  // Commercial and Private are mutually exclusive by scope, not by an `if` in
  // any controller: answering one puts the other's page out of scope and purges
  // whatever it held. So the two pages cannot be photographed in one pass, and
  // the private one gets its own notification below.
  await expect(
    page,
    'a commercial transporter should open the approved-transporter list'
  ).toHaveURL(/\/transporters\/select$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Search for an approved commercial transporter'
  )

  await record.record(page, 'transporter-commercial')
})

test('records the private transporter details', async ({ page }) => {
  await unlockTheHub(page)
  await openHub(page)

  // Straight to the transporter row. Arrival details are not a prerequisite —
  // the row's entry is whichever of its three pages passes its gate first, and
  // that is always the type question.
  await page.getByRole('link', { name: 'Transporter' }).click()
  await expect(page).toHaveURL(/\/transporters$/)

  await page.locator('input[name="transporterType"][value="Private"]').check()
  await saveAndContinue(page)

  await expect(
    page,
    'a private transporter should open the address form rather than the list'
  ).toHaveURL(/\/transporters\/private$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Private transporter details'
  )

  await record.record(page, 'transporter-private')
})
