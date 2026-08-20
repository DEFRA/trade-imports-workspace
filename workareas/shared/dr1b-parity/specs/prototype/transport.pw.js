//
// DR1 slice: how the consignment moves — arrival details, the countries it
// travels through, and the transporter picker with the three pages behind
// "Add a transporter".
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// prototype is correct. Every navigation does assert it landed where it should,
// because a mislabelled picture is worse than a missing one — and on this slice
// that matters more than most. Two of these screens redirect away silently when
// the session is not in the right shape, and a redirect renders a real page
// under a wrong name rather than failing.
//
// DR1 is the ROOT mount. app/routes.js builds one router and re-mounts it under
// /design-release-2 and /design-release-2.1; only the root URLs are DR1, and
// app/views/x.html is the view DR1 renders. Nothing here touches a release
// subfolder.
//
// It borrows nothing from the prototype's own journey-demo or e2e helpers.
// Those are unmaintained, and a capture built on a suite nobody runs breaks the
// first time somebody refactors it. The widget handling is here, in the open,
// where a reader can check it against the module it re-derives.
//
import { readFileSync } from 'node:fs'

// A spec imports exactly one thing. It lives in the corpus workarea, outside
// any package, so a bare specifier resolves to nothing — tim hands every spec
// the absolute path to one support module carrying what it needs, Playwright's
// own test and expect included.
const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

const COUNTRY_OF_ORIGIN = 'France'
const COMMODITY_SEARCH = 'Cattle'

// The species is chosen by id rather than by "the first row offered". The
// results list is built by app/assets/javascripts/commodity-search.js from
// app/data/commodities-0102-species.js, and the row order is the data's, not
// alphabetical by anything a reader of this file can see. Naming the id means a
// change to that catalogue fails this spec loudly instead of quietly
// photographing a different animal under the same screen name.
const SPECIES_ID = 'cattle-11-syncerus-spp'

// /transit-countries exists only for some means of transport. routes.js gates it
// on TRANSIT_MEANS_OF_TRANSPORT = ['Railway', 'Road Vehicle'] — in
// getJourneySteps, which decides what follows arrival details, and again in
// redirectIfTransitCountriesNotRequired, which bounces a direct GET to
// /notification-hub. Airplane and Vessel are the other two entries in
// app/data/means-of-transport.js, and either makes the page vanish. So the walk
// uses Railway, and the landing is asserted rather than assumed: with Airplane
// the run would sail past into /transporter and record nothing.
const MEANS_OF_TRANSPORT = 'Railway'

// The port catalogue is app/data/uk-airports.js rendered as "<name> - <code>",
// and it holds Manchester twice — the airport (MAN) and the seaport (GBMNC).
// The widget filters on a plain substring and sorts the matches, so searching
// "Manchester" alone makes which one gets clicked a function of sort order.
// Name the whole option.
const PORT_OF_ENTRY = 'Manchester - MAN'

// A second country, distinct from the country of origin, so the transit capture
// cannot be misread as an echo of the origin screen.
const TRANSIT_COUNTRY = 'Germany'

// The window the prototype accepts runs from seven days behind today to six
// months ahead, so no fixed date stays valid. An expired date is not rejected on
// the page — it saves, and the notification is quietly incomplete until the
// review page says "Complete arrival details", with nothing pointing back here.
// This is the one field in the slice whose pixels move from day to day, and that
// is unavoidable: the window moves whatever we do.
const ARRIVAL_DATE = (() => {
  const when = new Date()
  when.setDate(when.getDate() + 14)
  return `${when.getDate()}/${when.getMonth() + 1}/${when.getFullYear()}`
})()

// /transporter and /transporter/add submit with a plain govukButton that carries
// no name attribute, so on those two pages there is nothing to match on but the
// accessible name. Everywhere else the button posts name="action" value=
// "continue", and that locator can only mean one control — which matters on a
// page whose other submit reads "Save and return to overview" and would file the
// notification hub under a transport name.
const continueOn = async (page) => {
  const action = page.locator('button[name="action"][value="continue"]')
  if (await action.count()) {
    await action.first().click()
    return
  }
  await page
    .getByRole('button', { name: /save and continue|continue/i })
    .first()
    .click()
}

// The kit rewrites its shadow-nunjucks layouts and recompiles its Sass while the
// server is up, bouncing nodemon. A request landing in that window either
// refuses the connection or renders the kit's own "Unable to call
// `govukPhaseBanner`" page. Re-request until it settles rather than photograph
// that under a DR1 name.
//
// /create-notification is also what makes the walk repeatable: it wipes the
// notification, stamps a fresh reference and sets the status to Draft, so the
// status strip at the top of every capture below reads the same on every run.
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

// Country of origin and port of entry are two instances of one pattern: a search
// box the user types in, and a separate hidden input carrying the value the form
// actually posts. Typing alone leaves the hidden input untouched. The results
// panel also overlays the buttons below and calls preventDefault on its own
// mousedown, so a click on Continue while it is open reaches nothing at all — no
// error, no navigation, no POST. Choosing from the list is what closes it.
const chooseFromSearch = async (
  page,
  { input, option, hidden, optionAttribute = 'data-country' }
) => {
  await page.locator(input).first().fill(option)

  const match = page
    .locator(`.app-country-search__option[${optionAttribute}="${option}"]`)
    .first()
  await expect(match, `"${option}" should appear in the results`).toBeVisible()
  await match.click()

  await expect(
    page.locator(hidden),
    'choosing from the results should write the field that posts'
  ).toHaveValue(option)
}

// The commodity widget posts a JSON array, and updateHiddenFields() runs at init
// — so the field already reads "[]" before anything is ticked and "not empty"
// would be true of a page nobody had touched. Assert the species itself is in
// there.
const chooseSpecies = async (page) => {
  const search = page.locator('.app-commodity-search__input').first()
  await search.fill(COMMODITY_SEARCH)

  const species = page.locator(
    `input[name="commodity-selection"][value="species:${SPECIES_ID}"]`
  )
  await expect(species, `the search should offer ${SPECIES_ID}`).toBeVisible()
  await species.check()

  // Ticking a row re-renders the whole results list, so the panel is still open
  // and still overlaying the buttons. Escape is what the module listens for.
  await search.press('Escape')
  await expect(
    page.locator('.app-commodity-search__results'),
    'the results panel should close, or it swallows the click on Continue'
  ).toBeHidden()
  await expect(
    page.locator('input[name="selectedSpecies"]'),
    'the widget should have written the selection into the field that posts'
  ).toHaveValue(new RegExp(SPECIES_ID))
}

// /arrival-details is guarded on origin and import reason only — not on the
// consignment or animal pages that sit between them in the journey. So the walk
// can jump straight there once the reason is answered, which keeps this slice
// off the screens the commodities and identification slices own.
const toArrivalDetails = async (page) => {
  await start(page)

  await chooseFromSearch(page, {
    input: '#country-of-origin',
    option: COUNTRY_OF_ORIGIN,
    hidden: 'input[name="countryOfOrigin"]'
  })
  await page.locator('input[name="regionOfOriginRequired"][value="No"]').check()
  await continueOn(page)
  await expect(page, 'origin should advance to what-are-you-importing').toHaveURL(
    /\/what-are-you-importing$/
  )

  await chooseSpecies(page)
  await continueOn(page)
  await expect(page, 'the commodity should advance to reason-for-import').toHaveURL(
    /\/reason-for-import$/
  )

  await page.locator('input[name="importReason"][value="Internal market"]').check()
  await page.locator('input[name="internalMarketPurpose"]').first().check()
  await continueOn(page)
  // Wait for the reason to have been accepted before jumping. Going straight to
  // /arrival-details while that post is still in flight races it, and the
  // arrival page would then be fetched against a session with no import reason —
  // which redirects, silently, back to the reason screen. A rejected reason
  // re-renders in place, so name the page it should reach rather than settling
  // for "somewhere else": /consignment-details is the next journey step.
  await expect(page, 'the reason should advance to consignment-details').toHaveURL(
    /\/consignment-details$/
  )

  await page.goto('/arrival-details')
  await expect(
    page,
    'arrival-details should be reachable once origin and reason are answered'
  ).toHaveURL(/\/arrival-details$/)
  await expect(page.locator('main h1')).toHaveText(/arrival details/i)
}

// validateArrivalDetails only insists on means of transport, but a
// half-answered page is not what a real notification looks like and the screens
// after it read back what was entered. Fill the lot.
const fillArrivalDetails = async (page) => {
  const date = page.locator('#arrival-date-at-port')
  await date.fill(ARRIVAL_DATE)
  // The MOJ picker builds its dialog hidden and opens it only from its own
  // calendar button, so typing is the whole interaction — but Escape is pressed
  // anyway, because a dialog left open overlays whatever control comes next.
  await date.press('Escape')

  // The airport widget marks its options with data-option where the country one
  // uses data-country. Same class, different attribute.
  await chooseFromSearch(page, {
    input: '#port-of-entry',
    option: PORT_OF_ENTRY,
    hidden: 'input[name="portOfEntry"]',
    optionAttribute: 'data-option'
  })

  await page
    .locator('select[name="meansOfTransport"]')
    .selectOption(MEANS_OF_TRANSPORT)
  await page.locator('input[name="transportIdentification"]').fill('GB-RAIL-001')
  await page.locator('input[name="transportDocumentReference"]').fill('CMR-000123')

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

test('records arrival-details empty, then transit-countries empty and with a country chosen', async ({
  page
}) => {
  await toArrivalDetails(page)

  // Empty, before anything is typed into it. A half-filled form is a screen
  // nobody specified; the answers below exist to move the journey on, not to
  // dress the picture.
  const arrival = await record.record(page, 'arrival-details')
  expect(arrival.title, 'the screen should have a title to file it under').toBeTruthy()

  await fillArrivalDetails(page)
  await expect(
    page,
    `${MEANS_OF_TRANSPORT} should put transit-countries next, not skip to transporter`
  ).toHaveURL(/\/transit-countries$/)
  await expect(page.locator('main h1')).toHaveText(
    /which countries will the consignment travel through/i
  )

  const empty = await record.record(page, 'transit-countries')
  expect(empty.title, 'the screen should have a title to file it under').toBeTruthy()

  // The transit control is a type-ahead that adds one country at a time: the box
  // is cleared on selection and the chosen country is listed below it, rather
  // than left in the box. Three characters is the module's minimum before it
  // renders anything at all.
  await page.locator('#transit-country-search').fill(TRANSIT_COUNTRY)
  const option = page.locator(
    `.app-country-search__option[data-country="${TRANSIT_COUNTRY}"]`
  )
  await expect(option, `"${TRANSIT_COUNTRY}" should appear in the results`).toBeVisible()
  await option.click()

  // This widget posts a JSON array too, and syncValueInput() runs at init — so
  // the hidden field already reads "[]" before anything is chosen and "not
  // empty" proves nothing. Assert the country itself is in there.
  await expect(
    page.locator('input[name="transitCountries"]'),
    'choosing a country should add it to the field that posts'
  ).toHaveValue(new RegExp(TRANSIT_COUNTRY))

  // Wait for both halves of the settled state — the country listed below the
  // search, and the results panel closed — so the capture shows the state the
  // page rests in rather than a panel caught mid-close.
  await expect(
    page.locator(`[data-transit-country="${TRANSIT_COUNTRY}"]`),
    'the chosen country should be listed under the search'
  ).toBeVisible()
  await expect(page.locator('#transit-country-search-results')).toBeHidden()

  await record.record(page, 'transit-countries-selected')
})

test('records transporter and the three add-a-transporter pages', async ({ page }) => {
  await toTransitCountries(page)

  // Transit countries are optional — an empty list saves and moves on.
  await continueOn(page)
  await expect(page, 'transit-countries should advance to transporter').toHaveURL(
    /\/transporter$/
  )
  await expect(page.locator('main h1')).toHaveText(/transporter details/i)

  const transporter = await record.record(page, 'transporter')
  expect(transporter.title, 'the screen should have a title').toBeTruthy()

  // "Add a transporter" is a govukButton rendered with an href, so it is an
  // anchor with role="button" — neither a link by role nor a button element.
  // Match the href, which the view hardcodes.
  await page.locator('a[href="/transporter/add"]').first().click()
  await expect(page, 'the add button should open the transporter type question')
    .toHaveURL(/\/transporter\/add$/)
  await expect(page.locator('main h1')).toHaveText(/choose a transporter type/i)

  await record.record(page, 'transporter-add')

  // Both add forms redirect back to /transporter/add unless the session's
  // transporterAddType already matches the page, and that is set only by posting
  // this radio. There is no way in through the URL.
  await page.locator('input[name="transporterType"][value="private"]').check()
  await continueOn(page)
  await expect(page, 'the private type should open the private form').toHaveURL(
    /\/transporter\/add\/private$/
  )
  await expect(page.locator('main h1')).toHaveText(/add private transporter/i)
  await expect(
    page.locator('input[name="transporterPrivateAddressLine1"]'),
    'the private form should carry the manual address fields'
  ).toBeVisible()

  await record.record(page, 'transporter-add-private')

  // Back to the type question for the other branch. GET /transporter/add is
  // unguarded, but assert the landing anyway — the radio below exists on no
  // other page, so a redirect here would surface as a missing selector fifteen
  // seconds later instead of as a wrong URL now.
  await page.goto('/transporter/add')
  await expect(page, 'the type question should reopen').toHaveURL(
    /\/transporter\/add$/
  )
  await page.locator('input[name="transporterType"][value="commercial"]').check()
  await continueOn(page)
  await expect(page, 'the commercial type should open the commercial form').toHaveURL(
    /\/transporter\/add\/commercial$/
  )
  await expect(page.locator('main h1')).toHaveText(/add commercial transporter/i)

  // renderTransporterAddCommercialPage switches the address lookup on from
  // res.locals.isDesignRelease2Version, which is false at the root mount — so
  // what is captured here is the DR1 form with its manual address fields
  // showing, not the later-release one with them behind a search.
  await expect(
    page.locator('input[name="transporterCommercialAddressLine1"]'),
    'DR1 should show the manual address fields, not an address lookup'
  ).toBeVisible()

  await record.record(page, 'transporter-add-commercial')
})
