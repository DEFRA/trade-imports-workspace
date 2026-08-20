//
// Frontend slice: the consignment-addresses hub, the five party pickers that
// hang off it, the CPH number page that follows it, and the contact-address
// page that the notification hub lists beside it.
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// frontend is correct. Every step DOES assert that the journey landed where it
// should, because a mislabelled picture is worse than a missing one.
//
// It imports nothing from the frontend repo. Every selector below is
// re-derived, in the open, from the templates and copy files under
// src/server/app/sets/live-animals/journeys/linear/features/.
//
// Eight screens, all photographed EMPTY: nothing is ever selected on a picker,
// nothing is typed into CPH, and no party is ever saved. The hub therefore
// stays in its unanswered state for the whole run, which is also what the
// design defines.
//
import { readFileSync } from 'node:fs'

const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

const COUNTRY_CODE = 'FR'

// The commodity checkboxes post `<commodity>|<speciesCode>`, so the value
// carries the commodity and the label carries only the Latin species name.
// Select by VALUE: it is the half that says "Cow", and Cow is the only entry on
// services/commodities/stub.js CPH_COMMODITIES — the single commodity that puts
// the CPH obligation in scope (obligations/sections/commodities/aggregates.js).
// With a cat, dog, horse or fish the addresses hub has no CPH row, its Continue
// lands on the notification hub instead, and fe-cph-number is unreachable.
// `Cow|1148346` is Bos taurus.
const CPH_SPECIES_VALUE = 'Cow|1148346'

// The five parties in the order the addresses hub lists them, each with the
// corpus screen name for its picker. Four ids are the party in kebab case;
// consignor is filed as consignor-or-exporter because that is what the page
// calls itself.
//
// THE TRAP THIS TABLE EXISTS TO AVOID: an answered row on this hub does not
// stop offering a link. The same anchor, in the same actions cell, with the
// same classes, simply swaps "Add" for "Change" (features/addresses/
// controller.js `hubRow`). A loop driven off "the next link on the hub"
// re-opens the first party for ever and never visits the other four, and
// nothing downstream complains, because the hub's POST reads no payload and
// validates nothing. So every role below is driven by ITS OWN ROW, matched on
// its own title, and the row's href is asserted against that role's own slug
// before the click.
const PARTIES = [
  {
    title: 'Place of origin',
    slug: 'place-of-origin/select',
    screen: 'address-picker-place-of-origin'
  },
  {
    title: 'Consignor or exporter',
    slug: 'consignors/select',
    screen: 'address-picker-consignor-or-exporter'
  },
  {
    title: 'Consignee',
    slug: 'consignees/select',
    screen: 'address-picker-consignee'
  },
  {
    title: 'Importer',
    slug: 'importers/select',
    screen: 'address-picker-importer'
  },
  {
    title: 'Place of destination',
    slug: 'destinations/select',
    screen: 'address-picker-place-of-destination'
  }
]

// The hub's sixth row. It is only rendered when CPH is in scope, so its
// presence is the proof that the Cow line above did its job.
const CPH_ROW_TITLE = 'County Parish Holding number (CPH)'

const NOT_ADDED_YET = 'Not added yet'

// A row's <dt> holds the title AND a hint span, and Playwright's `hasText` is a
// case-insensitive SUBSTRING match — which would make "Consignee" match the
// importer row too, whose hint reads "This is usually the same as the
// consignee." Exact text matching is case-sensitive and scoped to one element,
// so it lands on the title span and nothing else. The visually-hidden text
// inside the action link is the title lower-cased, which exact matching also
// rules out.
const hubRow = (page, title) =>
  page
    .locator('.govuk-summary-list__row')
    .filter({ has: page.getByText(title, { exact: true }) })

const saveAndContinue = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

const notificationPath = (page) => {
  const found = new URL(page.url()).pathname.match(/^\/notifications\/[^/]+/)
  if (!found) {
    throw new Error(`Not inside a notification: ${page.url()}`)
  }
  return found[0]
}

const openNotificationHub = async (page) => {
  await page.goto(notificationPath(page))
  await expect(
    page.getByRole('heading', { level: 1 }),
    'the notification hub should render its task list'
  ).toHaveText('Overview')
}

// Auth is enforced even in stub mode; only the Defra ID round-trip is replaced.
// An unauthenticated request is bounced through the sign-in route, which mints
// a locally signed session and returns — this assertion is what proves it did.
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

// Country of origin and a commodity selection are the only two obligations in
// ENFORCED_AT_CONTINUE (bridge/obligation-source.js), and every later page's
// gate lists them as prerequisites. Until both are answered every hub row below
// them reads "Cannot start yet" with no link at all — so this is what makes the
// addresses and contact rows reachable, and the Cow line is what makes CPH
// reachable after them.
const answerTheTwoGatingQuestions = async (page) => {
  await startNotification(page)

  await page.locator('#countryOfOrigin').selectOption(COUNTRY_CODE)
  await page
    .locator('input[name="regionOfOriginCodeRequirement"][value="no"]')
    .check()
  await saveAndContinue(page)

  await expect(
    page,
    'origin should hand over to the commodity page'
  ).toHaveURL(/\/commodities$/)
  await page
    .locator(`input[name="species"][value="${CPH_SPECIES_VALUE}"]`)
    .check()
  await saveAndContinue(page)

  // The opening run's third step (journeys/linear/flow/run.js RUN_STEPS).
  // Asserted positively so a run that silently bounced back to the commodity
  // page cannot be mistaken for progress.
  await expect(
    page,
    'the commodity page should hand over to consignment details'
  ).toHaveURL(/\/consignment-details$/)
}

const openAddressesHub = async (page) => {
  await openNotificationHub(page)
  await page.getByRole('link', { name: 'Roles and addresses' }).click()
  await expect(
    page,
    'the Roles and addresses row should open the consignment addresses hub'
  ).toHaveURL(/\/addresses$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Consignment addresses'
  )
}

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(() => {
  record.write()
})

test('records the addresses hub, all five party pickers, CPH and contact', async ({
  page
}) => {
  await answerTheTwoGatingQuestions(page)
  await openAddressesHub(page)

  // Six rows, every one of them unanswered. This is both the assertion that the
  // hub is being photographed in its empty state and the assertion that the Cow
  // line put CPH in scope — five parties plus CPH is six.
  await expect(
    page.locator('.govuk-summary-list__row'),
    'a fresh consignment should list five parties plus the CPH row'
  ).toHaveCount(PARTIES.length + 1)
  await expect(
    page.locator('.govuk-summary-list__value'),
    'nothing should be answered before the hub is photographed'
  ).toHaveText(Array(PARTIES.length + 1).fill(NOT_ADDED_YET))
  await expect(
    hubRow(page, CPH_ROW_TITLE),
    'the Cow line should have put the CPH row on the hub'
  ).toHaveCount(1)

  await record.record(page, 'addresses-hub')

  for (const party of PARTIES) {
    const row = hubRow(page, party.title)
    await expect(
      row,
      `the addresses hub should hold exactly one ${party.title} row`
    ).toHaveCount(1)

    // The one link inside THIS row. Its href is checked against this role's own
    // slug before the click, so a locator that drifted onto a neighbouring row
    // fails here rather than filing the next screenshot under the wrong name.
    const action = row.getByRole('link')
    await expect(
      action,
      `the ${party.title} row should offer one action link`
    ).toHaveCount(1)
    await expect(
      action,
      `the ${party.title} row should link to its own picker`
    ).toHaveAttribute('href', new RegExp(`/${party.slug}$`))
    await expect(
      action,
      `an unanswered ${party.title} row should offer Add, not Change`
    ).toHaveText(/^Add/)

    await action.click()

    await expect(
      page,
      `the ${party.title} row should open its own picker`
    ).toHaveURL(new RegExp(`/${party.slug}$`))
    await expect(
      page.getByRole('heading', { level: 1 }),
      `the picker should name itself ${party.title}`
    ).toHaveText(party.title)

    // The picker is a table of address-book records, one radio per row, whose
    // only label is a visually-hidden "Select <name>". Nothing is checked here:
    // the screen the design defines is the unanswered one. This asserts the
    // page arrived with its list rendered and with no selection on it, so the
    // picture is of an empty picker rather than of an empty page.
    const choices = page.locator('input[name="party"]')
    await expect(
      choices.first(),
      'the picker should offer at least one address to choose'
    ).toBeVisible()
    await expect(
      page.locator('input[name="party"]:checked'),
      'the picker should be photographed with nothing selected'
    ).toHaveCount(0)

    await record.record(page, party.screen)

    // Back to the hub WITHOUT saving, so every row stays unanswered and every
    // later row keeps offering Add. Navigating rather than clicking Save keeps
    // the hub identical for all five passes.
    await page.goto(`${notificationPath(page)}/addresses`)
    await expect(
      page,
      `leaving the ${party.title} picker should return to the addresses hub`
    ).toHaveURL(/\/addresses$/)
  }

  // Still six unanswered rows: nothing above saved anything, and the loop
  // visited five distinct pickers rather than the first one five times.
  await expect(
    page.locator('.govuk-summary-list__value'),
    'the pickers should have been photographed without answering the hub'
  ).toHaveText(Array(PARTIES.length + 1).fill(NOT_ADDED_YET))

  // "Continue", not "Save and continue": this hub overrides the shared button
  // group's primary label. Matched exactly, because an inexact accessible-name
  // match on "Continue" would also catch "Save and continue" elsewhere.
  //
  // The hub's POST reads no payload and validates nothing, so it advances with
  // every party still blank — which is exactly what is wanted here, because it
  // reaches CPH with nothing typed anywhere.
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  // CPH is the second page of the addresses section and is reachable only
  // because a Cow line is in the consignment. With any other commodity this
  // Continue lands on the notification hub instead, with no error and nothing
  // to say a screen was skipped — so assert the landing, or the next picture
  // is of the hub filed as fe-cph-number.
  await expect(
    page,
    'a Cow line should carry the addresses section on to the CPH page'
  ).toHaveURL(/\/cph-number$/)

  // The heading is the input's own label promoted to a page heading, so the
  // <h1> is a wrapper around the <label>. Note the hub calls the same thing
  // "County Parish Holding number (CPH)"; the page drops the word "number".
  await expect(
    page.getByRole('heading', { level: 1 }),
    'the CPH page should render its label as the page heading'
  ).toHaveText('County Parish Holding (CPH)')
  await expect(
    page.locator('#countyParishHoldingCph'),
    'CPH should be photographed before anything is typed into it'
  ).toHaveValue('')

  await record.record(page, 'cph-number')

  // Contact address is NOT a spoke of the addresses hub — it is its own flow
  // section and its own task row, listed under the same "4. Addresses" group on
  // the notification hub (features/hub/controller.js GROUPS). It is reached
  // from there, not from the consignment-addresses hub, which never links to
  // it. Exact matching keeps this off the neighbouring "Roles and addresses".
  await openNotificationHub(page)
  await page
    .getByRole('link', { name: 'Contact address', exact: true })
    .click()
  await expect(
    page,
    'the Contact address row should open the consignment contact picker'
  ).toHaveURL(/\/consignment\/contact\/select$/)

  // The page heading is an <h1> inside the radio group's legend, so the level-1
  // heading and the group share their text.
  await expect(
    page.getByRole('heading', { level: 1 }),
    'the contact page should name itself'
  ).toHaveText('Contact address for consignment')
  await expect(
    page.locator('input[name="contactAddress"]').first(),
    'the contact page should offer at least one address to choose'
  ).toBeVisible()
  await expect(
    page.locator('input[name="contactAddress"]:checked'),
    'the contact page should be photographed with nothing selected'
  ).toHaveCount(0)

  await record.record(page, 'contact')
})
