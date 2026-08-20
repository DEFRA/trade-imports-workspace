//
// DR1 slice: the dashboard — the page the service opens on, and the three
// states it can be put into.
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// prototype is correct. Every step DOES assert the page is in the state it is
// about to be photographed in, because a mislabelled picture is worse than a
// missing one — and three of these four screens share one URL, so the state IS
// the screen.
//
// DR1 is the ROOT mount of the kit: `/` renders app/views/dashboard.html.
// (`/dashboard` is a redirect to it, kept because older links point there.) The
// design-release-2 and design-release-2.1 folders are later releases and are
// not captured here.
//
// Recorded by this spec, four screens:
//
//   dashboard                            as the service opens
//   dashboard-filters-open               all three filter sections expanded
//   dashboard-filters-date-picker-open   the By date calendar open over them
//   dashboard-after-submission           the list once this session has
//                                        submitted a notification of its own
//
// `dashboard` is NOT an empty dashboard, and there is no empty one to record:
// app/routes.js merges app/data/dashboard-notifications.js into every session,
// so DR1 always arrives already holding seeded notifications, four of which the
// default view shows. The seeded list IS the default state, so it carries no
// state suffix.
//
// The filter fields do not exist on screen until their section is expanded —
// the three sections are `<details>` elements, collapsed on load — so
// dashboard-filters-open is the only capture in which the design's filter
// fields can be seen at all.
//
// The journey walk at the foot of this file duplicates notification-spine.pw.js
// almost line for line, and the duplication is deliberate and unavoidable: a
// spec lives outside any package and can import exactly one module, the
// recorder, so there is nowhere shared to put it. Two independent copies that
// each break loudly beat one import that cannot exist. The cost is drift, and
// it is not theoretical — the equivalent file in an earlier corpus carried an
// older addresses walk than the spine's and failed at the declaration with
// nothing naming the hub. Any change to the walk belongs in both files in the
// same edit.
//
// Nothing is imported from the prototype repo.
//
import { readFileSync } from 'node:fs'

const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

const COUNTRY = 'France'
const COMMODITY = 'Cattle'
const ANIMAL_COUNT = '2'
const SPARE_VALUE = '10'

const path = (page) => new URL(page.url()).pathname

// The arrival date DR1 accepts is a moving window — a week behind today to six
// months ahead — so no fixed date stays valid. An expired date is not rejected
// on the page: it saves, and the notification stays quietly incomplete until
// review says "Complete arrival details". Derive it from today.
//
// It is also printed on the dashboard card this session submits, so
// dashboard-after-submission moves by a day between two runs a day apart. The
// harness masks references and UUIDs and does not mask dates; nothing can be
// done about it here, and it is written down so nobody reads it as a change.
const ARRIVAL_DATE = (() => {
  const when = new Date()
  when.setDate(when.getDate() + 14)
  return `${when.getDate()}/${when.getMonth() + 1}/${when.getFullYear()}`
})()

// The MoJ date picker's calendar opens over whatever control comes next and
// swallows the click on it. Type into the input and dismiss with Escape rather
// than driving the calendar — except on the one screen below whose whole
// subject is the calendar being open.
const fillDate = async (field, value = ARRIVAL_DATE) => {
  await field.fill(value)
  await field.press('Escape')
}

// Most pages carry the kit's button group, a submit named `action` with value
// `continue`; a few render a plain submit. Fall back to the accessible name,
// never to a class — and never to a name that would match "Save and return to
// overview", which posts action=hub and bounces the walk out of the journey.
const continueOn = async (page) => {
  const action = page.locator('button[name="action"][value="continue"]')
  if (await action.count()) {
    await action.first().click()
    return
  }
  await page
    .getByRole('button', {
      name: /save and continue|continue|accept and submit|confirm|submit/i
    })
    .first()
    .click()
}

// Fill whatever a page still asks for and nothing has answered. `type="search"`
// is excluded: every search box on this journey is a filter that hides
// non-matching rows, so typing a spare value into one hides the radio the walk
// has just chosen. The three boxes that post something are driven explicitly.
const fillPending = async (page, value = SPARE_VALUE) => {
  const inputs = page.locator(
    'form input:not([type="hidden"]):not([type="search"]):not([type="radio"]):not([type="checkbox"]):not([type="submit"]):not([type="button"]):not([type="file"])'
  )
  for (let i = 0; i < (await inputs.count()); i += 1) {
    const input = inputs.nth(i)
    if (!(await input.isVisible())) continue
    if (await input.inputValue()) continue

    const id = (await input.getAttribute('id')) ?? ''
    if (/date/i.test(id)) await fillDate(input)
    else await input.fill(value)
  }

  const selects = page.locator('form select')
  for (let i = 0; i < (await selects.count()); i += 1) {
    const select = selects.nth(i)
    if (!(await select.isVisible())) continue
    if (await select.inputValue()) continue

    const firstReal = await select.evaluate((element) => {
      const option = [...element.options].find((entry) => entry.value)
      return option ? option.value : null
    })
    if (firstReal) await select.selectOption(firstReal)
  }
}

const pickPendingRadios = async (page) => {
  const unanswered = await page
    .locator('form input[type="radio"]')
    .evaluateAll((radios) => {
      const groups = new Map()
      for (const radio of radios) {
        groups.set(radio.name, [...(groups.get(radio.name) ?? []), radio])
      }
      return [...groups.entries()]
        .filter(([, group]) => !group.some((radio) => radio.checked))
        .map(([name]) => name)
    })

  for (const name of unanswered) {
    const visible = page
      .locator(`form input[type="radio"][name="${name}"]`)
      .locator('visible=true')
    if (await visible.count()) await visible.first().check()
  }
}

// The country and port widgets render matches as buttons carrying the value in
// a data attribute and write what actually posts into a hidden input. Their
// results list calls preventDefault on mousedown and sits over the buttons
// below, so continuing while it is open reaches nothing: no error, no
// navigation, no POST. Choose, then assert the hidden field.
const chooseFromSearch = async (
  page,
  { input, option, hidden, expected, optionAttribute = 'data-country' }
) => {
  const box = page.locator(input).first()
  await box.fill(option)

  const match = page
    .locator(`.app-country-search__option[${optionAttribute}*="${option}"]`)
    .first()
  await expect(match, `"${option}" should appear in the results`).toBeVisible()
  await match.click()

  const field = page.locator(hidden)
  if (expected) {
    await expect(
      field,
      `choosing "${option}" should write it into the field that posts`
    ).toHaveValue(expected)
    return
  }
  await expect(
    field,
    `choosing "${option}" should write the field that posts`
  ).not.toHaveValue('')
}

const fillOrigin = async (page) => {
  await chooseFromSearch(page, {
    input: '#country-of-origin',
    option: COUNTRY,
    hidden: 'input[name="countryOfOrigin"]',
    expected: COUNTRY
  })
  await page.locator('input[name="regionOfOriginRequired"][value="No"]').check()
  await continueOn(page)
}

const fillCommodity = async (page) => {
  const search = page.locator('.app-commodity-search__input').first()
  const results = page.locator('#commodity-search-results')
  const species = page.locator('input[name="commodity-selection"]:not([disabled])')

  await search.fill(COMMODITY)
  await expect(
    results,
    `searching for "${COMMODITY}" should open the results panel`
  ).toBeVisible()
  await expect(
    species.first(),
    'the results should offer a species to choose'
  ).toBeVisible()
  await species.first().check()

  // Ticking a species re-renders the results in place, so the panel is still
  // open and still over the buttons. Escape closes it; without that, Continue
  // reaches nothing.
  await search.press('Escape')
  await expect(results, 'Escape should close the results panel').toBeHidden()

  // The field that posts is seeded with "[]" on page load, so "not empty" is
  // already true before anything is chosen. Assert against the seed too.
  await expect(
    page.locator('input[name="selectedSpecies"]'),
    'the widget should have written the selection into the field that posts'
  ).not.toHaveValue(/^(\[\])?$/)

  await continueOn(page)
}

const fillReason = async (page) => {
  await page
    .locator('input[name="importReason"][value="Internal market"]')
    .check()
  await page.locator('input[name="internalMarketPurpose"]').first().check()
  await continueOn(page)
}

const fillConsignmentDetails = async (page) => {
  const counts = page.locator('input[name^="numberOfAnimals["]')
  for (let i = 0; i < (await counts.count()); i += 1) {
    await counts.nth(i).fill(ANIMAL_COUNT)
  }
  await fillPending(page)
  await pickPendingRadios(page)
  await continueOn(page)
}

const fillAnimalIdentification = async (page) => {
  for (let pass = 0; pass < Number(ANIMAL_COUNT); pass += 1) {
    const fields = page.locator('input[name^="identifiers["]')
    if ((await fields.count()) === 0) break

    for (let i = 0; i < (await fields.count()); i += 1) {
      const field = fields.nth(i)
      const id = (await field.getAttribute('id')) ?? ''
      if (/date/i.test(id)) await fillDate(field)
      else await field.fill(`UK-${pass + 1}-${i + 1}`)
    }
    await pickPendingRadios(page)

    const another = page.locator('button[name="action"][value^="save:"]')
    if (pass < Number(ANIMAL_COUNT) - 1 && (await another.count())) {
      await another.first().click()
      continue
    }
    break
  }
  await continueOn(page)
}

// Two container classes, not one — see notification-spine.pw.js for the full
// account. A role with nothing chosen renders `__section-action`; one with a
// "Same as consignee" shortcut renders `__section-actions`. The `:not()` keeps
// an answered role's "Change" link out of the loop, which is what makes it
// terminate; without it the walk re-opens the first role forever and the
// omission surfaces four screens later at review.
const PENDING_ADDRESS_LINK =
  '.app-roles-and-addresses-page__section-action:not(.app-roles-and-addresses-page__selected-address-action) a.govuk-link, .app-roles-and-addresses-page__section-actions a.govuk-link'

const fillAddressSections = async (page) => {
  for (let guard = 0; guard < 12; guard += 1) {
    const link = page.locator(PENDING_ADDRESS_LINK).first()
    if ((await link.count()) === 0) break

    await link.click()
    const on = path(page)

    if (/cph-number$/.test(on)) {
      await page.locator('input[name="cphNumber-county"]').fill('12')
      await page.locator('input[name="cphNumber-parish"]').fill('345')
      await page.locator('input[name="cphNumber-holding"]').fill('6789')
    } else {
      await pickPendingRadios(page)
      await fillPending(page)
    }

    await continueOn(page)
    await expect(page, `${on} should return to the addresses hub`).toHaveURL(
      /\/roles-and-addresses$/
    )
  }

  await expect(
    page.locator(PENDING_ADDRESS_LINK),
    'every role on the addresses hub should have been answered'
  ).toHaveCount(0)

  await continueOn(page)
}

// The journey, keyed by the page each step lands on rather than by position, so
// a reordered DR1 still walks and an unrecognised page stops the run by name.
const SPINE = [
  { at: /\/origin-of-the-import$/, fill: fillOrigin },
  { at: /\/what-are-you-importing$/, fill: fillCommodity },
  { at: /\/reason-for-import$/, fill: fillReason },
  { at: /\/consignment-details$/, fill: fillConsignmentDetails },
  { at: /\/animal-identification-details$/, fill: fillAnimalIdentification },
  {
    at: /\/additional-animal-details$/,
    fill: async (page) => {
      await pickPendingRadios(page)
      await fillPending(page)
      await continueOn(page)
    }
  },
  {
    at: /\/arrival-details$/,
    fill: async (page) => {
      // The port of entry posts a hidden field rather than what is typed.
      // Typing alone leaves it empty, the page saves, and the gap only surfaces
      // at review as "Complete arrival details". Its options read
      // "Manchester - GBMNC", so the term is a prefix of the option; and the
      // airport widget marks options with data-option where the country one
      // uses data-country.
      await chooseFromSearch(page, {
        input: '#port-of-entry',
        option: 'Manchester',
        hidden: 'input[name="portOfEntry"]',
        optionAttribute: 'data-option'
      })
      await fillPending(page)
      await pickPendingRadios(page)
      await continueOn(page)
    }
  },
  { at: /\/transit-countries$/, fill: continueOn },
  {
    at: /\/transporter$/,
    fill: async (page) => {
      await pickPendingRadios(page)
      await continueOn(page)
    }
  },
  {
    at: /\/transporter\/add/,
    fill: async (page) => {
      await pickPendingRadios(page)
      await fillPending(page)
      await continueOn(page)
    }
  },
  { at: /\/upload-documents$/, fill: continueOn },
  { at: /\/roles-and-addresses$/, fill: fillAddressSections },
  {
    at: /\/contact-address-for-consignment$/,
    fill: async (page) => {
      await pickPendingRadios(page)
      await continueOn(page)
    }
  }
]

// This spec photographs no page of the journey — notification-spine.pw.js owns
// every one of them. The walk exists only to put a notification of this
// session's own onto the dashboard.
const walkTo = async (page, until) => {
  const visited = []

  for (let step = 0; step < SPINE.length * 3; step += 1) {
    const here = path(page)
    if (until.test(here)) return visited

    const spineStep = SPINE.find((candidate) => candidate.at.test(here))
    expect(
      spineStep,
      `${here} is a page the DR1 spine does not know about — either the journey has changed or this spec is out of date`
    ).toBeTruthy()

    visited.push(here)
    await spineStep.fill(page)

    // A rejected POST re-renders at the same URL rather than erroring
    // elsewhere, so leaving the page is the only proof the answer was taken.
    await expect(page, `${here} should advance`).not.toHaveURL(
      new RegExp(`${here}$`)
    )
  }

  throw new Error(
    `The journey never reached ${until}. It visited ${visited.join(' → ')}.`
  )
}

// The kit rewrites its layouts and recompiles its Sass while the server is up,
// bouncing nodemon. A request that lands in that window gets the kit's own
// error page instead of the service. Re-request until it settles rather than
// photograph that under a DR1 name.
const openDashboard = async (page) => {
  await expect(async () => {
    await page.goto('/')
    await expect(
      page.locator('#dashboard-page-heading'),
      'the dashboard should render, not error'
    ).toBeVisible({ timeout: 5_000 })
  }).toPass({ timeout: 240_000 })

  await expect(page, 'the dashboard is the root of the DR1 mount').toHaveURL(
    /\/$/
  )
  await expect(page.locator('#dashboard-page-heading')).toHaveText(
    /import notification service/i
  )
}

const startJourney = async (page) => {
  await expect(async () => {
    await page.goto('/create-notification')
    await expect(page).toHaveURL(/\/origin-of-the-import$/, { timeout: 5_000 })
    await expect(page.locator('main h1')).toHaveText(/origin of the import/i, {
      timeout: 5_000
    })
  }).toPass({ timeout: 240_000 })
}

// The three collapsed sections, each named by a control that exists only once
// that section is expanded — so "expanded" is asserted rather than assumed.
// Without that, an expanded capture is indistinguishable from a collapsed one,
// and a summary click that landed on the chevron instead of the summary text
// would go unnoticed.
const FILTER_SECTIONS = [
  { summary: /search by/i, reveals: '#dashboard-search-keyword' },
  { summary: /status/i, reveals: '#dashboard-filter-status' },
  { summary: /by date/i, reveals: '#dashboard-start-date' }
]

const expandFilters = async (page) => {
  for (const { summary, reveals } of FILTER_SECTIONS) {
    await page
      .locator('.app-dashboard-filters__summary')
      .filter({ hasText: summary })
      .first()
      .click()
    await expect(
      page.locator(reveals),
      `the "${summary.source}" filter section should expand`
    ).toBeVisible()
  }
}

// Guard the premise the last three captures rest on: if the seeded
// notifications ever stop arriving, the filters are being photographed over a
// list that no longer exists and the pictures mean something else.
const expectSeededList = async (page) => {
  await expect(
    page.locator('.app-dashboard-notification-card'),
    'DR1 seeds notifications into every session, so the list is never empty'
  ).not.toHaveCount(0)
}

// A serial block turns one failure into several: the tests below are
// independent — each opens its own session — so a red run reports the first
// real failure and SKIPS the rest. Before writing a screen up as unreachable,
// check whether the test above it failed.
test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(() => {
  record.write()
})

test('records the dashboard as the service opens it', async ({ page }) => {
  await openDashboard(page)
  await expectSeededList(page)

  // Nothing in this session has started or submitted a notification, and no
  // filter has been touched. This screen id names no state, so this is the one
  // capture that has to be of the page exactly as it arrives.
  await expect(
    page.locator('.app-dashboard-filters__section[open]'),
    'the filter sections should still be collapsed'
  ).toHaveCount(0)

  await record.record(page, 'dashboard')
})

test('records the dashboard with every filter section expanded', async ({
  page
}) => {
  await openDashboard(page)
  await expectSeededList(page)

  await expandFilters(page)
  await expect(
    page.locator('.app-dashboard-filters__section[open]'),
    'all three filter sections should be open at once'
  ).toHaveCount(FILTER_SECTIONS.length)

  await record.record(page, 'dashboard-filters-open')
})

test('records the By date filter with its calendar open', async ({ page }) => {
  await openDashboard(page)
  await expectSeededList(page)
  await expandFilters(page)

  // The date fields are MoJ date pickers, so the calendar is added by
  // JavaScript rather than rendered by the template — the toggle button does
  // not exist until MoJ Frontend has enhanced the input. Clicking it is the
  // only way to see the widget the design is asking for, and it is the one
  // place in this corpus where the calendar is deliberately left open.
  const startDate = page.locator('.app-dashboard-filters__date-picker').first()
  const toggle = startDate.locator('.moj-js-datepicker-toggle')
  await expect(
    toggle,
    'the start-date input should have been enhanced into a date picker'
  ).toBeVisible()
  await toggle.click()

  // Assert the START date's dialog, by id, not "a dialog somewhere": the end
  // date has an identical picker directly below, and a click that opened the
  // wrong one would file a picture of the wrong widget under this name.
  await expect(
    page.locator('#datepicker-dashboard-start-date'),
    'the toggle should open the start-date calendar'
  ).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(
    page.locator('#datepicker-dashboard-end-date'),
    'the end-date calendar should still be closed'
  ).toBeHidden()

  // The calendar opens on the current month with today marked, and the harness
  // masks only references and UUIDs — so this screen's pixels move with the
  // calendar month. It cannot be pinned from inside a spec, and it is written
  // down here so a reader does not take a changed month for a changed design.
  await record.record(page, 'dashboard-filters-date-picker-open')
})

test('records the dashboard once this session has submitted a notification', async ({
  page
}) => {
  await startJourney(page)
  await walkTo(page, /\/review-notification$/)

  await continueOn(page)
  await expect(
    page,
    'a complete review should reach the declaration'
  ).toHaveURL(/\/declaration$/)

  // The declaration is confirmed with a checkbox, not a radio — ticking radios
  // leaves it untouched, the POST is rejected for a missing confirmation, and
  // the page re-renders at the same URL with nothing submitted.
  await page.locator('#declaration-confirmed').check()
  await continueOn(page)
  await expect(page, 'a confirmed declaration should submit').toHaveURL(
    /\/notification-submitted$/
  )

  // Read the reference off the confirmation panel BEFORE any recording: the
  // harness masks references on the live page as part of taking a picture, so
  // a value read afterwards is the stand-in, not the reference.
  const reference = (
    await page.locator('.govuk-panel__body strong').first().innerText()
  ).trim()
  expect(reference, 'the confirmation should quote a reference').toBeTruthy()

  await openDashboard(page)

  // The reference alone does not identify the card. DR1 hands every journey the
  // one canonical reference, and a seeded row carries the same string — so a
  // card bearing it is on the dashboard whether or not anything was submitted,
  // and matching on it alone would pass over a journey that silently never
  // posted. What separates them is the origin: this session's row carries the
  // country this walk chose, and the seeded twin carries Republic of Ireland.
  // Match on both.
  //
  // (The seeded twin is not also listed: the dashboard list drops any seeded
  // row whose reference a submitted one has taken, so the pair collapses to one
  // card rather than two.)
  const ownCard = page
    .locator('.app-dashboard-notification-card')
    .filter({
      has: page.locator('.app-dashboard-notification-card__reference', {
        hasText: reference
      })
    })
    .filter({ hasText: COUNTRY })

  await expect(
    ownCard,
    'the notification this session submitted should be listed on the dashboard'
  ).toHaveCount(1)

  await record.record(page, 'dashboard-after-submission')
})
