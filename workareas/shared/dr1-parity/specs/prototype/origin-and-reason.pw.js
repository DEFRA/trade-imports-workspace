//
// DR1 slice: origin of the import, reason for import, CPH number.
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// prototype is correct. Every step does assert that the journey landed where it
// should, because a silently-rejected page leaves a mislabelled capture behind,
// and a mislabelled capture is worse than a missing one.
//
// DR1 is the ROOT URLs. There is no /design-release-1: app/views/index.html
// calls the root journey "the current design release journey at the root URLs",
// and app/routes.js mounts only testing, design-release-2 and
// design-release-2.1 — so the root router is DR1.
//
// It borrows nothing from the prototype. The retired DR2.1 harness required the
// prototype's own journey-demo/e2e/journey.js for the bespoke widgets; that
// suite is unmaintained, and a capture built on it is hostage to a test nobody
// runs. The widget handling is here, in the open, where a reader can see it.
//
import { readFileSync } from 'node:fs'

// A spec imports exactly one thing. It lives in the corpus workarea, outside
// any package, so a bare specifier resolves to nothing here — and tim's answer
// to that is to hand every spec the absolute path to one module that carries
// what it needs, Playwright's own test and expect included. That path arrives
// in the capture context, along with every other path a spec must not guess.
const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

// Cattle: the commodity whose consignment-address section activates
// /cph-number, which is what makes that page reachable at all.
const COUNTRY = 'France'
const COMMODITY = 'Cattle'

// Each reason radio that opens a conditional reveal, with a control that exists
// only inside that reveal — so the revealed state can be asserted rather than
// assumed. Without that assertion the revealed capture is indistinguishable
// from the collapsed one.
const REASON_REVEALS = [
  {
    reason: 'Internal market',
    screen: 'reason-for-import-internal-market-revealed',
    revealed: 'input[name="internalMarketPurpose"]'
  },
  {
    reason: 'Transhipment or onward travel',
    screen: 'reason-for-import-transhipment-revealed',
    revealed: 'select[name="transhipmentDestinationCountry"]'
  },
  {
    reason: 'Transit',
    screen: 'reason-for-import-transit-revealed',
    revealed: 'select[name="transitDestinationCountry"]'
  },
  {
    reason: 'Temporary admission horses',
    screen: 'reason-for-import-temporary-admission-horses-revealed',
    revealed: 'input[name="temporaryAdmissionExitDate"]'
  }
]

// The kit rewrites its shadow-nunjucks layouts and recompiles its Sass while
// the server is up, bouncing nodemon. A request landing in that window either
// refuses the connection or renders "Unable to call `govukPhaseBanner`" instead
// of the page. Re-request until it settles, rather than photograph the kit's own
// error page under a DR1 name.
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

// The country field a user sees is a search box; the field that posts is a
// hidden input the search box writes to. Driving the search box is the only way
// to fill it the way the design intends, and it is the only way the region-code
// prefix gets derived.
const chooseCountry = async (page, country) => {
  await page.locator('#country-of-origin').fill(country)
  const option = page.locator(
    `.app-country-search__option[data-country="${country}"]`
  )
  await expect(option, `"${country}" should appear in the country results`)
    .toBeVisible()
  await option.click()
  await expect(page.locator('input[name="countryOfOrigin"]')).toHaveValue(
    country
  )
}

// Like the country field, the commodity a user picks is written into hidden
// inputs by the search widget. Two things have to happen after checking a
// species and before continuing, and both are easy to miss:
//
// The results panel has to be dismissed. It overlays the buttons and swallows
// the mousedown, so a click on "Save and continue" while it is open reaches
// nothing and the form never posts — no error, no navigation, just a page that
// sits there. Escape is what the widget listens for and what a user presses.
//
// And the hidden field has to be non-empty. The widget writes it on change; if
// it has not, the post is rejected for an empty selection and the capture is of
// an error state nobody asked for. Assert it here, where the reason is
// obvious, rather than three screens later.
const chooseCommodity = async (page, commodity) => {
  const search = page.locator('.app-commodity-search__input').first()
  await search.fill(commodity)

  const species = page
    .locator('input[name="commodity-selection"]:not([disabled])')
    .first()
  await expect(species, `"${commodity}" should return a selectable species`)
    .toBeVisible()
  await species.check()

  await search.press('Escape')
  await expect(
    page.locator('.app-commodity-search__results'),
    'the results panel should close, or it swallows the click on Continue'
  ).toBeHidden()

  await expect(
    page.locator('input[name="selectedSpecies"]'),
    'the search widget should have written the selection into the field that posts'
  ).not.toHaveValue('')
}

// Not every page carries the action=continue button group; some use a plain
// submit. Fall back to the accessible name rather than to a class.
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

const toReasonForImport = async (page) => {
  await start(page)
  await chooseCountry(page, COUNTRY)
  await page.locator('input[name="regionOfOriginRequired"][value="No"]').check()
  await continueOn(page)
  await expect(page, 'origin should advance to what-are-you-importing')
    .toHaveURL(/\/what-are-you-importing$/)

  await chooseCommodity(page, COMMODITY)
  await continueOn(page)
  await expect(page, 'commodity should advance to reason-for-import')
    .toHaveURL(/\/reason-for-import$/)
}

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(() => {
  record.write()
})

test('records origin-of-the-import', async ({ page }) => {
  await start(page)

  const row = await record.record(page, 'origin-of-the-import')

  expect(row.title, 'the screen should have a title to file it under').toBeTruthy()
})

test('records what-are-you-importing, empty and with a result showing', async ({
  page
}) => {
  await start(page)
  await chooseCountry(page, COUNTRY)
  await page.locator('input[name="regionOfOriginRequired"][value="No"]').check()
  await continueOn(page)
  await expect(page).toHaveURL(/\/what-are-you-importing$/)

  await record.record(page, 'what-are-you-importing')

  await page.locator('.app-commodity-search__input').first().fill(COMMODITY)
  await expect(
    page.locator('input[name="commodity-selection"]').first(),
    'the commodity search should return something to select'
  ).toBeVisible()

  await record.record(page, 'what-are-you-importing-results')
})

test('records reason-for-import, collapsed and with each reveal open', async ({
  page
}) => {
  await toReasonForImport(page)
  await expect(page.locator('main h1')).toHaveText(/reason for import/i)

  await record.record(page, 'reason-for-import')

  for (const { reason, screen, revealed } of REASON_REVEALS) {
    await page.locator(`input[name="importReason"][value="${reason}"]`).check()
    await expect(
      page.locator(revealed).first(),
      `"${reason}" should open its conditional reveal`
    ).toBeVisible()

    await record.record(page, screen)
  }
})

test('records reason-for-import in its error state', async ({ page }) => {
  await toReasonForImport(page)

  // Choose the reason but leave its revealed purpose blank.
  await page
    .locator('input[name="importReason"][value="Internal market"]')
    .check()
  await continueOn(page)

  await expect(
    page.locator('.govuk-error-summary'),
    'a blank revealed purpose should be rejected'
  ).toBeVisible()

  await record.record(page, 'reason-for-import-error')
})

test('records cph-number', async ({ page }) => {
  await toReasonForImport(page)

  // /cph-number is gated on the CPH consignment-address section being active
  // for the chosen commodity; when it is not, the route redirects to
  // /roles-and-addresses. Assert we stayed, so the capture cannot be
  // mislabelled.
  await page.goto('/cph-number')
  await expect(
    page,
    'cph-number should be active for cattle, not redirect to roles-and-addresses'
  ).toHaveURL(/\/cph-number$/)

  await record.record(page, 'cph-number')
})
