//
// Frontend slice: the consignment-addresses hub, one picker per party, and the
// CPH number page that sits behind it.
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// frontend is correct. Every step does assert that the journey landed where it
// should, because a mislabelled capture is worse than a missing one.
//
// It borrows nothing from the frontend repo. Every selector is re-derived from
// the templates, the copy files and the address-book stub, in the open.
//
import { readFileSync } from 'node:fs'

const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

const COUNTRY_CODE = 'FR'

// A Cow line, and Cow is the ONLY commodity on the allow list that puts the CPH
// number in scope. With a cat or a horse the addresses hub's Continue goes
// straight back to the notification hub and the CPH page is never offered — so
// this constant is what makes the last screen in this file reachable at all.
const SPECIES = 'Bos taurus'

// The five parties, in the order the hub lists them, with the corpus name for
// each picker. Four ids are the party in kebab case; consignor is filed as
// consignor-or-exporter because that is what the screen calls itself.
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

// A row nobody has answered yet, and only such a row.
//
// This is the trap the DR1 prototype sprang too, in different markup. An
// answered row does not stop offering a link — it swaps "Add" for "Change" in
// the same actions cell — so a loop driven off "the first action link on the
// hub" re-opens the first party for ever and never visits the other four. And
// nothing stops it: the hub's POST reads no payload and validates nothing, so
// Continue leaves the page with every row still blank. The omission only
// surfaces at the review page, which refuses to reach the declaration and names
// the row rather than the party.
//
// The value cell is the honest discriminator: it reads "Not added yet" until
// the party is answered and the chosen address's name afterwards, set by the
// same ternary that picks Add over Change.
const PENDING_ROW =
  '.govuk-summary-list__row:has(.govuk-summary-list__value:text-is("Not added yet"))'

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
// locally signed session and returns — this assertion is what proves it did.
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

// Origin and a species: both are "enforced at continue", so every later task
// row stays blocked — no link, "Cannot start yet" — until they are answered.
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

const openAddressesHub = async (page) => {
  await openHub(page)
  await page.getByRole('link', { name: 'Roles and addresses' }).click()
  await expect(page).toHaveURL(/\/addresses$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Consignment addresses'
  )
}

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(() => {
  record.write()
})

test('records the addresses hub, every party picker, and the CPH number', async ({
  page
}) => {
  await unlockTheHub(page)
  await openAddressesHub(page)

  await expect(
    page.locator(PENDING_ROW),
    'a fresh consignment should offer all five parties unanswered, plus CPH'
  ).toHaveCount(PARTIES.length + 1)

  await record.record(page, 'addresses-hub')

  for (const party of PARTIES) {
    await page
      .locator(PENDING_ROW, { has: page.getByText(party.title, { exact: true }) })
      .getByRole('link', { name: 'Add' })
      .click()

    await expect(
      page,
      `the ${party.title} row should open its own picker`
    ).toHaveURL(new RegExp(`/${party.slug}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      party.title
    )

    await record.record(page, party.screen)

    // The picker is a table of address-book records with one radio per row, and
    // the radio's only label is a visually-hidden "Select <name>". The name is
    // also printed in the row's own cell, so a text-based locator matches that
    // cell rather than the control — hence the radio is addressed by its input
    // name. The stub book holds thirteen records paginated five to a page, so
    // the first radio always exists on the page the picker opens on.
    const choice = page.locator('input[name="party"]').first()
    await expect(
      choice,
      'the picker should offer at least one address to choose'
    ).toBeVisible()
    await choice.check()

    await saveAndContinue(page)
    await expect(
      page,
      `saving ${party.title} should return to the addresses hub`
    ).toHaveURL(/\/addresses$/)
  }

  // The hub advances with parties still blank — its POST validates nothing —
  // so a row this loop skipped would be invisible until the review page four
  // screens later. Fail here instead, with the row still on the screen. Only
  // the CPH row should be left, and it is answered on its own page below.
  await expect(
    page.locator(PENDING_ROW),
    'every party should have been answered before leaving the addresses hub'
  ).toHaveCount(1)

  // "Continue", not "Save and continue": this hub overrides the shared button
  // group's primary label. Matched exactly, because an inexact accessible-name
  // match on "Continue" would also match "Save and continue" elsewhere.
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  // CPH is the second page of the addresses section, reachable only because a
  // Cow line is in the consignment. With any other commodity its obligation is
  // out of scope, the section has nothing left to visit, and this Continue
  // lands on the notification hub instead — with no error and nothing to say a
  // screen was skipped. Assert the landing so that can never be mislabelled.
  await expect(
    page,
    'a Cow line should carry the addresses section on to the CPH page'
  ).toHaveURL(/\/cph-number$/)

  // The heading is the input's own label promoted to a page heading, so there
  // is no separate <h1> element to read text from — getByRole finds the label
  // inside the heading wrapper. Note the hub calls the same thing "County
  // Parish Holding number (CPH)"; the page drops the word "number".
  await expect(
    page.getByRole('heading', { level: 1 }),
    'the CPH page should render its label as the page heading'
  ).toHaveText('County Parish Holding (CPH)')

  await record.record(page, 'cph-number')
})
