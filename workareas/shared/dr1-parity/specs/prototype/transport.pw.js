//
// DR1 slice: transit countries, the transporter picker, and the three pages
// behind "Add a transporter".
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// prototype is correct. Every navigation does assert it landed where it should,
// because a mislabelled capture is worse than a missing one — and on this slice
// that matters more than most, since two of the five screens redirect away
// silently when the session is not in the right shape.
//
// DR1 is the ROOT URLs; app/routes.js re-mounts the same router under
// /design-release-2 and /design-release-2.1, and only the root mount is DR1.
//
// It borrows nothing from the prototype's own journey-demo/e2e helpers. Those
// are unmaintained, and a capture built on a test nobody runs is hostage to it.
// The widget handling is here, in the open.
//
import { readFileSync } from 'node:fs'

// A spec imports exactly one thing. It lives in the corpus workarea, outside
// any package, so a bare specifier resolves to nothing — tim hands every spec
// the absolute path to one support module carrying what it needs, Playwright's
// own test and expect included.
const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

const COUNTRY = 'France'
const COMMODITY = 'Cattle'
const PORT = 'Manchester'

// /transit-countries exists only for some means of transport. routes.js gates it
// on TRANSIT_MEANS_OF_TRANSPORT = ['Railway', 'Road Vehicle'] — both in
// getJourneySteps, which decides what comes after arrival details, and in
// redirectIfTransitCountriesNotRequired, which bounces a direct GET to
// /notification-hub. Airplane and Vessel are the other two options in
// app/data/means-of-transport.js, and either of those makes the page vanish.
// So the whole slice is driven with Railway, and the landing is asserted rather
// than assumed — with Airplane the run would sail past the screen into
// /transporter and quietly record nothing.
const MEANS_OF_TRANSPORT = 'Railway'

// A second country, distinct from the country of origin, so the transit capture
// cannot be misread as an echo of the origin screen.
const TRANSIT_COUNTRY = 'Germany'

const continueOn = async (page) => {
  const action = page.locator('button[name="action"][value="continue"]')
  if (await action.count()) {
    await action.first().click()
    return
  }
  // /transporter and /transporter/add submit with a plain govukButton that
  // carries no name, so there is nothing to match on but the accessible name.
  await page
    .getByRole('button', { name: /save and continue|continue/i })
    .first()
    .click()
}

// The window the prototype accepts is today-7days to today+6months, so no fixed
// date stays valid. An expired date is not rejected on the page — it saves, and
// the notification is quietly incomplete until review says "Complete arrival
// details", with nothing pointing back.
const ARRIVAL_DATE = (() => {
  const when = new Date()
  when.setDate(when.getDate() + 14)
  return `${when.getDate()}/${when.getMonth() + 1}/${when.getFullYear()}`
})()

// The kit rewrites its shadow-nunjucks layouts and recompiles its Sass while the
// server is up, bouncing nodemon. A request landing in that window either
// refuses the connection or renders the kit's own error page. Re-request until
// it settles rather than photograph that under a DR1 name.
const start = async (page) => {
  await expect(async () => {
    await page.goto('/create-notification')
    await expect(page, 'create-notification should open origin-of-the-import')
      .toHaveURL(/\/origin-of-the-import$/, { timeout: 5_000 })
    await expect(
      page.locator('main h1'),
      'origin-of-the-import should render, not error'
    ).toHaveText(/origin of the import/i, { timeout: 5_000 })
  }).toPass({ timeout: 240_000 })
}

// Country of origin, port of entry and transit country are three instances of
// one pattern: a search box the user types in, and a separate hidden input that
// carries the value the form actually posts. Typing alone leaves the hidden
// input untouched. The results panel also overlays the buttons below and calls
// preventDefault on its own mousedown, so a click on Continue while it is open
// reaches nothing at all — no error, no navigation.
const chooseFromSearch = async (
  page,
  { input, option, hidden, optionAttribute = 'data-country', exact = true }
) => {
  await page.locator(input).first().fill(option)

  const match = page
    .locator(
      exact
        ? `.app-country-search__option[${optionAttribute}="${option}"]`
        : `.app-country-search__option[${optionAttribute}*="${option}"]`
    )
    .first()
  await expect(match, `"${option}" should appear in the results`).toBeVisible()
  await match.click()

  await expect(
    page.locator(hidden),
    'choosing from the results should write the field that posts'
  ).not.toHaveValue('')
}

const fillCommodity = async (page) => {
  const search = page.locator('.app-commodity-search__input').first()
  await search.fill(COMMODITY)

  const species = page
    .locator('input[name="commodity-selection"]:not([disabled])')
    .first()
  await expect(species, 'the commodity search should offer a species').toBeVisible()
  await species.check()

  await search.press('Escape')
  await expect(
    page.locator('.app-commodity-search__results'),
    'the results panel should close, or it swallows the click on Continue'
  ).toBeHidden()
  // This widget posts a JSON array too, and updateHiddenFields() runs at init —
  // so the field already reads "[]" before anything is ticked, and "not empty"
  // would be true of a page nobody had touched. Reject the empty array as well.
  await expect(
    page.locator('input[name="selectedSpecies"]'),
    'the widget should have written the selection into the field that posts'
  ).not.toHaveValue(/^(\[\])?$/)
}

// /arrival-details is guarded only on origin and import reason — not on the
// consignment or animal pages that sit between them in the journey. So the walk
// can jump straight there once the reason is answered, which keeps this slice
// off screens that other specs own.
const toArrivalDetails = async (page) => {
  await start(page)

  await chooseFromSearch(page, {
    input: '#country-of-origin',
    option: COUNTRY,
    hidden: 'input[name="countryOfOrigin"]'
  })
  await page.locator('input[name="regionOfOriginRequired"][value="No"]').check()
  await continueOn(page)
  await expect(page, 'origin should advance to what-are-you-importing')
    .toHaveURL(/\/what-are-you-importing$/)

  await fillCommodity(page)
  await continueOn(page)
  await expect(page, 'commodity should advance to reason-for-import')
    .toHaveURL(/\/reason-for-import$/)

  await page
    .locator('input[name="importReason"][value="Internal market"]')
    .check()
  await page.locator('input[name="internalMarketPurpose"]').first().check()
  await continueOn(page)
  // Wait for the reason to have been accepted before jumping. Going straight to
  // /arrival-details while that post is still in flight races it, and the
  // arrival page would be fetched against a session with no import reason —
  // which redirects, silently, back to the reason screen. A rejected reason
  // re-renders in place, so name the page it should reach rather than settling
  // for "somewhere else": /consignment-details is the next journey step.
  await expect(page, 'the reason should advance to consignment-details')
    .toHaveURL(/\/consignment-details$/)

  await page.goto('/arrival-details')
  await expect(
    page,
    'arrival-details should be reachable once origin and reason are answered'
  ).toHaveURL(/\/arrival-details$/)
}

// validateArrivalDetails only insists on means of transport, but a
// half-answered page is not what a real notification looks like, and the
// screens after it read back what was entered. Fill the lot.
const fillArrivalDetails = async (page) => {
  const date = page.locator('#arrival-date-at-port')
  await date.fill(ARRIVAL_DATE)
  // The MOJ date picker's calendar overlays whatever control comes next, so it
  // has to be dismissed rather than left open.
  await date.press('Escape')

  // The port catalogue is UK airports rendered as "Manchester - MAN", so the
  // search term is a prefix of the option rather than the whole of it — and the
  // airport widget marks its options with data-option where the country one
  // uses data-country. Same class, different attribute.
  await chooseFromSearch(page, {
    input: '#port-of-entry',
    option: PORT,
    hidden: 'input[name="portOfEntry"]',
    optionAttribute: 'data-option',
    exact: false
  })

  await page
    .locator('select[name="meansOfTransport"]')
    .selectOption(MEANS_OF_TRANSPORT)
  await page.locator('input[name="transportIdentification"]').fill('GB-RAIL-001')
  await page
    .locator('input[name="transportDocumentReference"]')
    .fill('CMR-000123')

  await continueOn(page)
}

const toTransitCountries = async (page) => {
  await toArrivalDetails(page)
  await fillArrivalDetails(page)

  await expect(
    page,
    `${MEANS_OF_TRANSPORT} should put transit-countries next, not skip to transporter`
  ).toHaveURL(/\/transit-countries$/)
  await expect(page.locator('main h1')).toHaveText(
    /which countries will the consignment travel through/i
  )
}

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(() => {
  record.write()
})

test('records transit-countries, empty and with a country chosen', async ({
  page
}) => {
  await toTransitCountries(page)

  const row = await record.record(page, 'transit-countries')
  expect(row.title, 'the screen should have a title to file it under').toBeTruthy()

  await page.locator('#transit-country-search').fill(TRANSIT_COUNTRY)
  const option = page.locator(
    `.app-country-search__option[data-country="${TRANSIT_COUNTRY}"]`
  )
  await expect(option, `"${TRANSIT_COUNTRY}" should appear in the results`)
    .toBeVisible()
  await option.click()

  // This widget posts a JSON array, and it writes "[]" into the hidden input on
  // load — so "not empty" is true before anything is chosen and proves nothing.
  // Assert the country itself is in there.
  await expect(
    page.locator('input[name="transitCountries"]'),
    'choosing a country should add it to the field that posts'
  ).toHaveValue(new RegExp(TRANSIT_COUNTRY))

  // Chosen countries are listed below the search rather than left in the box,
  // and the widget clears the box and closes its results on selection. Wait for
  // both, so the capture shows the settled state rather than a panel mid-close.
  await expect(
    page.locator(`[data-transit-country="${TRANSIT_COUNTRY}"]`),
    'the chosen country should be listed under the search'
  ).toBeVisible()
  await expect(page.locator('#transit-country-search-results')).toBeHidden()

  await record.record(page, 'transit-countries-selected')
})

test('records transporter and the three add-a-transporter pages', async ({
  page
}) => {
  await toTransitCountries(page)

  // Transit countries are optional — an empty list saves and moves on.
  await continueOn(page)
  await expect(page, 'transit-countries should advance to transporter')
    .toHaveURL(/\/transporter$/)
  await expect(page.locator('main h1')).toHaveText(/transporter details/i)

  await record.record(page, 'transporter')

  // "Add a transporter" is a govukButton rendered with an href, so it is an
  // anchor with role="button" — neither a link by role nor a button element.
  // Match the href, which the view hardcodes.
  await page.locator('a[href="/transporter/add"]').first().click()
  await expect(page, 'the add button should open the transporter type question')
    .toHaveURL(/\/transporter\/add$/)
  await expect(page.locator('main h1')).toHaveText(/choose a transporter type/i)

  await record.record(page, 'transporter-add')

  // Both add forms redirect to /transporter/add unless session
  // transporterAddType already matches the page, and that is set only by
  // posting this radio. There is no way in through the URL.
  await page.locator('input[name="transporterType"][value="private"]').check()
  await continueOn(page)
  await expect(page, 'the private type should open the private form').toHaveURL(
    /\/transporter\/add\/private$/
  )
  await expect(page.locator('main h1')).toHaveText(/add private transporter/i)

  await record.record(page, 'transporter-add-private')

  // Back to the type question for the other branch. GET /transporter/add is
  // unguarded, but assert the landing anyway — the radio below exists on no
  // other page, so a redirect here would fail as a missing selector fifteen
  // seconds later instead of as a wrong URL now.
  await page.goto('/transporter/add')
  await expect(page, 'the type question should reopen').toHaveURL(
    /\/transporter\/add$/
  )
  await page.locator('input[name="transporterType"][value="commercial"]').check()
  await continueOn(page)
  await expect(
    page,
    'the commercial type should open the commercial form'
  ).toHaveURL(/\/transporter\/add\/commercial$/)
  await expect(page.locator('main h1')).toHaveText(/add commercial transporter/i)

  // In DR1 this page shows the manual address fields outright. The address
  // lookup on the same view is switched on by isDesignRelease2Version, so what
  // is captured here is the DR1 form, not the DR2 one with the search hidden.
  await expect(
    page.locator('input[name="transporterCommercialAddressLine1"]'),
    'DR1 should show the manual address fields, not an address lookup'
  ).toBeVisible()

  await record.record(page, 'transporter-add-commercial')
})
