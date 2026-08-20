//
// DR1 slice: the reason for import, and the four conditional reveals that open
// underneath it.
//
// This is the structurally interesting page on the prototype side. DR1 asks the
// whole reason branch on ONE page: five radios, four of which open a conditional
// reveal carrying the follow-up questions for that reason. There is no view file
// per branch and no second page — app/views/reason-for-import.html renders one
// govukRadios, and app/routes.js pre-renders four partials
// (partials/internal-market-purpose-select, transhipment-destination-country-select,
// transit-options-select, temporary-admission-horses-select) into the `conditional.html`
// of the matching item in buildImportReasonItems(). So each `-revealed` screen is
// the same URL and the same DOM, with one reveal open.
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// prototype is correct. Every step does assert that the journey landed where it
// should, because a mislabelled capture is worse than a missing one — and on this
// page a wrong landing is invisible in the picture: all six screens are
// /reason-for-import, and the only thing separating them is which radio is
// checked and which reveal is open. Those are asserted, not assumed.
//
// DR1 is the ROOT URLs. app/routes.js is one router mounted at root and
// re-mounted under /design-release-2 and /design-release-2.1; the root mount is
// DR1, and app/views/*.html — not the release subfolders — are its views.
//
// It borrows nothing from the prototype's own journey-demo/e2e/journey.js. That
// suite is unmaintained, and a capture built on it is hostage to a test nobody
// runs. The widget handling is re-derived here, in the open, where a reader can
// check it against the views.
//
import { readFileSync } from 'node:fs'

// A spec imports exactly one thing. It lives in the corpus workarea, outside any
// package, so a bare specifier resolves to nothing here — and tim's answer to
// that is to hand every spec the absolute path to one module that carries what it
// needs, Playwright's own test and expect included. That path arrives in the
// capture context, along with every other path a spec must not guess.
const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

// The two answers the journey needs before /reason-for-import will render.
// GET /reason-for-import runs redirectIfNoOrigin, so a country of origin has to
// be on the session; the commodity is not guarded here, but it is what the rest
// of this corpus is captured under, and taking the reason page under a different
// commodity would make its notification-status banner disagree with every other
// prototype screen.
const COUNTRY = 'France'
const COMMODITY = { term: 'Cattle', commodityId: 'cattle', code: '0102' }

// The four reasons that open a reveal, in the order app/data/import-reasons.js
// lists them. Re-entry is the fifth reason and the one with no reveal, which is
// why there are five radios and four conditionals on the page.
//
// `revealed` names a control that exists ONLY inside that reason's reveal, taken
// from the partial that builds it. Asserting it visible is what separates a
// revealed capture from the collapsed one: without it, four screenshots of the
// same URL would be indistinguishable to the spec even when the reveal failed
// to open.
const REASON_REVEALS = [
  {
    reason: 'Internal market',
    screen: 'reason-for-import-internal-market-revealed',
    revealed: 'input[type="radio"][name="internalMarketPurpose"]',
    describes: 'the purpose-in-the-internal-market radios'
  },
  {
    reason: 'Transhipment or onward travel',
    screen: 'reason-for-import-transhipment-revealed',
    revealed: 'select[name="transhipmentDestinationCountry"]',
    describes: 'the destination-country select'
  },
  {
    reason: 'Transit',
    screen: 'reason-for-import-transit-revealed',
    revealed: 'select[name="transitDestinationCountry"]',
    describes: 'the port-of-exit and destination-country selects'
  },
  {
    reason: 'Temporary admission horses',
    screen: 'reason-for-import-temporary-admission-horses-revealed',
    revealed: 'input[name="temporaryAdmissionExitDate"]',
    describes: 'the exit-date picker and the port-of-exit select'
  }
]

// govuk-frontend renders every conditional in the DOM and hides the closed ones
// with a modifier class rather than removing them, so "the reveal is open" is a
// class question, not a presence question. Counting the OPEN ones is what pins a
// capture to exactly one reason: a check that only looked at the reason's own
// reveal would pass just as happily with a second one still hanging open below
// it, and the picture would then be of a page no user can produce.
const OPEN_REVEAL =
  '.govuk-radios__conditional:not(.govuk-radios__conditional--hidden)'

// The GOV.UK Prototype Kit rewrites its shadow-nunjucks layouts and recompiles
// its Sass while the server is up, bouncing nodemon. A request landing in that
// window either refuses the connection or renders "Unable to call
// `govukPhaseBanner`" instead of the page. Re-request until it settles, rather
// than photograph the kit's own error page under a DR1 name.
const start = async (page) => {
  await expect(async () => {
    await page.goto('/create-notification')
    await expect(
      page,
      'create-notification should open origin-of-the-import'
    ).toHaveURL(/\/origin-of-the-import$/, { timeout: 5_000 })
    await expect(
      page.locator('main h1'),
      'origin-of-the-import should render, not error'
    ).toHaveText(/origin of the import/i, { timeout: 5_000 })
  }).toPass({ timeout: 240_000 })
}

// Not every page carries the action=continue button group; some use a plain
// submit with no name at all. Fall back to the accessible name rather than to a
// class, and never to "the first button on the page" — the reason page's second
// button is "Save and return to overview", which is a soft save that redirects
// to the hub and would leave this walk somewhere else entirely.
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

// The country a user sees is a search box; the field that actually posts is a
// hidden input the search box writes to (app/views/origin-of-the-import.html:
// `.app-country-search__value`, name="countryOfOrigin"). Driving the search box
// is the only way to fill it the way the design intends, and the only way the
// region-code prefix gets derived. The result panel stamps each option with
// data-country (app/assets/javascripts/country-search.js), so the option is
// picked by value rather than by rendered text.
const chooseCountry = async (page, country) => {
  await page.locator('#country-of-origin').fill(country)

  const option = page.locator(
    `.app-country-search__option[data-country="${country}"]`
  )
  await expect(
    option,
    `"${country}" should appear in the country results`
  ).toBeVisible()
  await option.click()

  await expect(
    page.locator('input[name="countryOfOrigin"]'),
    'the search widget should have written the country into the field that posts'
  ).toHaveValue(country)
}

// The commodity search writes hidden inputs too, and two things have to happen
// after ticking a species and before continuing. Both have cost a failed run.
//
// The results panel has to be dismissed. It overlays the buttons and swallows
// the mousedown, so a click on "Save and continue" while it is open reaches
// nothing and the form never posts — no error, no navigation, just a page that
// sits there until the step times out. Escape is what the widget listens for and
// what a user presses.
//
// And the hidden fields have to be checked by CODE, not for being non-empty. The
// widget writes JSON into `selectedSpecies`, so an empty selection leaves it
// holding "[]" and a "not empty" check passes with nothing ticked at all.
// commodityCode is the field that decides what the rest of the journey offers,
// so that is the one worth pinning.
const chooseCommodity = async (page, { term, commodityId, code }) => {
  const search = page.locator('.app-commodity-search__input').first()
  await search.fill(term)

  const species = page.locator(
    `input[name="commodity-selection"][data-commodity-id="${commodityId}"]:not([disabled])`
  )
  await expect(
    species.first(),
    `"${term}" should return a selectable species under the ${commodityId} commodity`
  ).toBeVisible()
  await species.first().check()

  await search.press('Escape')
  await expect(
    page.locator('.app-commodity-search__results'),
    'the results panel should close, or it swallows the click on Continue'
  ).toBeHidden()

  await expect(
    page.locator('input[name="commodityCode"]'),
    'the search widget should have written the commodity code into the field that posts'
  ).toHaveValue(code)
  await expect(page.locator('input[name="commodityId"]')).toHaveValue(commodityId)
}

// Walk the two screens ahead of this slice — they belong to another spec and are
// not photographed here — and stop on the reason page.
const toReasonForImport = async (page) => {
  await start(page)

  await chooseCountry(page, COUNTRY)
  await page.locator('input[name="regionOfOriginRequired"][value="No"]').check()
  await continueOn(page)
  await expect(
    page,
    'origin-of-the-import should advance to what-are-you-importing'
  ).toHaveURL(/\/what-are-you-importing$/)

  await chooseCommodity(page, COMMODITY)
  await continueOn(page)
  await expect(
    page,
    'what-are-you-importing should advance to reason-for-import'
  ).toHaveURL(/\/reason-for-import$/)

  await expect(
    page.locator('main h1'),
    'reason-for-import should render its own heading, not the kit error page'
  ).toHaveText(/main reason for import/i)
}

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(() => {
  record.write()
})

test('records reason-for-import collapsed, and each of its four reveals open', async ({
  page
}) => {
  await toReasonForImport(page)

  // The collapsed page is the screen the design defines, so it is photographed
  // before anything is chosen. Both counts matter: no radio checked is what
  // makes it the empty page, and no reveal open is what makes it the collapsed
  // one. A page arrived at with a reason already on the session would satisfy
  // neither and still look plausible in the screenshot.
  await expect(
    page.locator('input[name="importReason"]'),
    'the page should offer every reason as a radio'
  ).toHaveCount(5)
  await expect(
    page.locator('input[name="importReason"]:checked'),
    'nothing has been chosen yet, so no reason should be selected'
  ).toHaveCount(0)
  await expect(
    page.locator(OPEN_REVEAL),
    'with no reason chosen, every conditional reveal should be closed'
  ).toHaveCount(0)

  const collapsed = await record.record(page, 'reason-for-import')
  expect(
    collapsed.title,
    'the screen should have a title to file it under'
  ).toBeTruthy()

  for (const { reason, screen, revealed, describes } of REASON_REVEALS) {
    await page.locator(`input[name="importReason"][value="${reason}"]`).check()

    await expect(
      page.locator(revealed).first(),
      `"${reason}" should open its conditional reveal, showing ${describes}`
    ).toBeVisible()

    // Radios are exclusive, so checking the next reason closes the previous
    // reveal. Asserting that exactly one is open is what proves the capture is
    // of this reason alone rather than of an accumulating stack — the failure
    // mode a screenshot would show and a spec that only looked at its own
    // control would not.
    await expect(
      page.locator(OPEN_REVEAL),
      `only "${reason}" should be revealed, with every other reveal closed`
    ).toHaveCount(1)

    await record.record(page, screen)
  }
})

test('records reason-for-import in its error state', async ({ page }) => {
  await toReasonForImport(page)

  // The state photographed here is "a reason chosen, its revealed follow-up left
  // blank" — NOT "nothing chosen". Choosing nothing produces no error on this
  // page at all: validateImportReasonProceed in app/routes.js returns early with
  // an empty error list when importReason is not one of the known values, and
  // the comment above that early return calls it out as deliberate soft
  // validation — "a main reason is optional to proceed". The step below proves
  // that rather than asserting it from the source, because the whole error
  // capture rests on it.
  await continueOn(page)
  await expect(
    page,
    'submitting no reason at all should be accepted and advance, not error — the reason is soft-validated'
  ).toHaveURL(/\/consignment-details$/)

  // GET /reason-for-import is guarded only on the origin, so the page can simply
  // be reopened. The soft post above left importReason null, which is the state
  // the error walk needs to start from.
  await page.goto('/reason-for-import')
  await expect(page, 'reason-for-import should reopen').toHaveURL(
    /\/reason-for-import$/
  )
  await expect(
    page.locator('input[name="importReason"]:checked'),
    'the accepted empty submission should have saved no reason'
  ).toHaveCount(0)

  // Internal market is the first reason with a reveal, and its reveal asks one
  // question — so leaving that question blank produces the smallest error the
  // page can produce: a single-entry error summary against a single reveal.
  await page.locator('input[name="importReason"][value="Internal market"]').check()
  await expect(
    page.locator('input[type="radio"][name="internalMarketPurpose"]').first(),
    'the internal-market reveal should be open before its question is left blank'
  ).toBeVisible()
  await expect(
    page.locator('input[name="internalMarketPurpose"]:checked'),
    'the purpose is what is being left blank, so nothing should be chosen in it'
  ).toHaveCount(0)

  await continueOn(page)

  // A rejected post is re-rendered at the same URL rather than redirected, so
  // staying put proves nothing on its own — it is equally true of a page that
  // never posted because a widget swallowed the click. The error summary and its
  // message are what say the post landed and was rejected for the reason
  // intended.
  await expect(
    page,
    'a rejected reason should re-render the reason page, not move on'
  ).toHaveURL(/\/reason-for-import$/)
  await expect(
    page.locator('.govuk-error-summary'),
    'a blank internal-market purpose should be rejected with an error summary'
  ).toBeVisible()
  await expect(
    page.locator('.govuk-error-summary__list a'),
    'the summary should carry exactly the one error this state produces'
  ).toHaveText([/select a purpose in the internal market/i])
  await expect(
    page.locator('input[name="importReason"][value="Internal market"]'),
    'the rejected page should come back with the chosen reason still selected'
  ).toBeChecked()

  await record.record(page, 'reason-for-import-error')
})
