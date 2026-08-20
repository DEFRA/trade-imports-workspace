//
// Frontend slice: arrival details, transit countries, and the transporter
// branch in both of its shapes.
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// frontend is correct. Every step does assert that the journey landed where it
// should, because a picture filed under the wrong name is worse than a missing
// one: every ruling downstream rests on the picture being of what it claims.
//
// It borrows nothing from the frontend repo — no journey driver, no fixture, no
// page object. Every selector below is re-derived from the templates, the copy
// file, the obligation gates and the reference catalogues, in the open, so this
// file stays readable without the application beside it.
//
// Each page is photographed EMPTY, before anything is typed into it: that is
// the screen the design defines. Answers are given only to open the next one.
//
// Screens recorded here:
//   arrival-details, transit-countries, transporter-type,
//   transporter-commercial, transporter-private
//
import { readFileSync } from 'node:fs'

const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

const COUNTRY_CODE = 'FR'
const SPECIES = 'Bos taurus'

// Land transport, and that is the whole of what opens the transit-countries
// page. Its obligation is in scope only while the means of transport is RAILWAY
// or ROAD_VEHICLE; with an aeroplane the page is out of scope, the hub row for
// it never appears, and walking forward from arrival details skips straight to
// the transporter.
const MEANS_OF_TRANSPORT = 'ROAD_VEHICLE'

// Two of the thirty-one countries the transit list offers, chosen by CODE.
//
// The labels come from a reference catalogue that is a live service in one mode
// and a fixture in another, and the catalogue carries entries such as
// "Netherlands (the)" — a name-matched locator is the half that breaks when the
// catalogue is refreshed. The code is the half that survives.
const TRANSIT_COUNTRY_CODES = ['FR', 'BE']

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

// Origin and a species: both are enforced at continue, so until they are
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
  await page.getByRole('checkbox', { name: SPECIES, exact: true }).check()
  await saveAndContinue(page)
  await expect(
    page,
    'a chosen species should open the consignment-details page'
  ).toHaveURL(/\/consignment-details$/)
}

// The port of entry is the one search widget in this slice, and it is not the
// plain field it looks like. A native <select name="portOfEntry"> is enhanced
// by a client component into a type-ahead: the select is renamed to
// `#portOfEntry-select`, hidden with display:none and left carrying the form
// name, while the visible `#portOfEntry` combobox is given `name=""` and posts
// nothing. The hidden control is the field.
//
// Two consequences, and both are asserted rather than assumed.
//
// The picture. Until the client bundle has run the page still shows a plain
// government select, which is a different screen from the one a user meets.
// Photographing before enhancement files the wrong render under the screen id.
//
// The trap. The results panel `#portOfEntry__listbox` is positioned over the
// buttons beneath it and swallows the mousedown, so a click on "Save and
// continue" while the panel is open reaches nothing at all — no error, no
// navigation, no POST — and the walk stalls on a page that looks perfectly
// fine. Nothing in this spec types into the widget, so the panel is never
// opened; `aria-expanded` is checked so that a future author who does type into
// it finds out here rather than in a dead click.
const expectPortOfEntryReady = async (page) => {
  await expect(
    page.locator('#portOfEntry-select'),
    'the port select should have been enhanced into a type-ahead'
  ).toHaveCount(1)
  await expect(
    page.locator('#portOfEntry'),
    'the enhanced combobox should be the control on show'
  ).toBeVisible()
  await expect(
    page.locator('#portOfEntry'),
    'the results panel must be shut, or it covers the buttons below it'
  ).toHaveAttribute('aria-expanded', 'false')
  await expect(
    page.locator('#portOfEntry-select'),
    'this screen is photographed empty, so no port should be selected'
  ).toHaveValue('')
}

// The arrival date is a single dd/mm/yyyy text input with a calendar dialog
// attached. The dialog starts hidden and is opened only by its own toggle, so
// nothing here has to dismiss it — but the enhancement must have run before the
// shot, for the same reason as the port widget: the unenhanced field has no
// calendar button and is a different picture.
const expectArrivalDatePickerReady = async (page) => {
  await expect(
    page.getByRole('button', { name: 'Choose date' }),
    'the date picker should have been enhanced before the page is photographed'
  ).toBeVisible()
  await expect(
    page.locator('#arrivalDateAtPort'),
    'this screen is photographed empty, so no arrival date should be filled in'
  ).toHaveValue('')
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
  await expect(
    page,
    'the Arrival details row should open the port-of-entry page'
  ).toHaveURL(/\/port-of-entry$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Arrival details'
  )

  await expectPortOfEntryReady(page)
  await expectArrivalDatePickerReady(page)

  await record.record(page, 'arrival-details')

  // Only the means of transport is answered, because it is the only answer that
  // opens anything. Nothing on this page is required to continue: the arrival
  // date validator allows a blank, the port list includes an empty placeholder,
  // and the two free-text fields are length-checked only.
  //
  // The arrival date is left blank on purpose, and that is not laziness. Its
  // accepted window is computed from `new Date()` on every request — seven days
  // behind today to six months ahead — so a date written here as a literal
  // falls out of the window on its own, silently, some weeks after it was
  // written, and the run that follows re-renders this page with a range error
  // instead of moving on. Anything that later does need a date here must derive
  // one from the clock, for example today plus a few days formatted d/m/yyyy,
  // and never type a fixed string.
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
  await expect(
    page.locator('input[name="transitedCountries"]:checked'),
    'this screen is photographed empty, so no country should be ticked'
  ).toHaveCount(0)

  await record.record(page, 'transit-countries')

  // This is the one page in the section that refuses an empty submit — every
  // other field in transport is validated but allowed to be blank. Leaving it
  // empty here re-renders at the same URL with an error summary, and the walk
  // would stall with no page after it ever photographed.
  for (const code of TRANSIT_COUNTRY_CODES) {
    await page
      .locator(`input[name="transitedCountries"][value="${code}"]`)
      .check()
  }
  await saveAndContinue(page)

  await expect(
    page,
    'transit countries should lead on to the transporter'
  ).toHaveURL(/\/transporters$/)

  // No <h1> element of its own on this page: the radio group's legend is the
  // page heading, which govuk-frontend renders as an <h1> inside the <legend>.
  // The page's own title, and the hub row that reaches it, are both
  // "Transporter"; this longer string is what a reader actually sees.
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
  // whatever it held. So the two cannot be photographed in one pass, and the
  // private page gets its own notification in the test below.
  await expect(
    page,
    'a commercial transporter should open the approved-transporter list'
  ).toHaveURL(/\/transporters\/select$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Search for an approved commercial transporter'
  )

  // The heading says "search", but the control is a radio list of approved
  // transporters read from the transport reference catalogue — there is no
  // search box and no results panel here. Asserting the list rendered keeps a
  // catalogue that came back empty from being photographed as the screen.
  await expect(
    page.locator('input[name="commercialTransporter"]'),
    'the approved-transporter list should have rendered its options'
  ).not.toHaveCount(0)
  await expect(
    page.locator('input[name="commercialTransporter"]:checked'),
    'this screen is photographed empty, so no transporter should be chosen'
  ).toHaveCount(0)

  await record.record(page, 'transporter-commercial')
})

test('records the private transporter details', async ({ page }) => {
  await unlockTheHub(page)
  await openHub(page)

  // Straight to the transporter row. Arrival details are not a prerequisite —
  // the row's entry is whichever of its three pages passes its gate first, and
  // that is always the type question.
  await page.getByRole('link', { name: 'Transporter' }).click()
  await expect(
    page,
    'the Transporter row should open the transporter-type page'
  ).toHaveURL(/\/transporters$/)

  await page.locator('input[name="transporterType"][value="Private"]').check()
  await saveAndContinue(page)

  await expect(
    page,
    'a private transporter should open the address form rather than the list'
  ).toHaveURL(/\/transporters\/private$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Private transporter details'
  )
  await expect(
    page.locator('#nameOrOrganisationName'),
    'this screen is photographed empty, so the address form should be blank'
  ).toHaveValue('')

  await record.record(page, 'transporter-private')
})
