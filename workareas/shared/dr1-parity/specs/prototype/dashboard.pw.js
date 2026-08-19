//
// DR1 slice: the dashboard's states beyond the one it opens in.
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// prototype is correct. Every step does assert that the page is in the state it
// is about to be photographed in, because a mislabelled capture is worse than a
// missing one.
//
// notification-spine.pw.js owns the dashboard as it first renders, under
// 'dashboard'. That capture is NOT of an empty dashboard: app/routes.js merges
// app/data/dashboard-notifications.js into every session's list, so DR1 always
// arrives already holding eight seeded notifications — four of which the
// default view shows. So there is no "empty" and no "populated" pair to record;
// the seeded list IS the default. What this spec adds is the three states the
// page can be put into that the default capture cannot show:
//
//   - the three filter sections expanded, which is the only way the filter
//     fields exist on screen at all;
//   - the start-date calendar open over them;
//   - the dashboard once the session has submitted a notification of its own,
//     which is the only state in which a row the user made is in the list.
//
// It borrows nothing from the prototype. The journey walk below duplicates
// notification-spine.pw.js almost line for line, and that duplication is
// deliberate and unavoidable: a spec lives outside any package and can import
// exactly one module, so there is nowhere shared to put it. Two independent
// copies that each break loudly beat one import that cannot exist.
//
// The cost of that is drift, and it is not theoretical: this file once carried
// an older `fillAddressSections` than the spine's, walked the addresses hub in
// a circle, and failed at the declaration with nothing naming the hub. Any
// change to the walk belongs in both files in the same edit.
//
import { readFileSync } from 'node:fs'

const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

const COUNTRY = 'France'
const COMMODITY = 'Cattle'
const ANIMAL_COUNT = '2'

const path = (page) => new URL(page.url()).pathname

// The arrival date the prototype accepts is a moving window — seven days behind
// today to six months ahead — so no fixed date stays valid. An expired date is
// not rejected on the page: it saves, and the notification stays quietly
// incomplete until review says "Complete arrival details". Derive it from today.
const ARRIVAL_DATE = (() => {
  const when = new Date()
  when.setDate(when.getDate() + 14)
  return `${when.getDate()}/${when.getMonth() + 1}/${when.getFullYear()}`
})()

// The MOJ date picker's calendar overlays whatever control comes next, so it
// has to be dismissed after filling rather than left open.
const fillDate = async (field, value = ARRIVAL_DATE) => {
  await field.fill(value)
  await field.press('Escape')
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
    .getByRole('button', {
      name: /save and continue|continue|accept and submit|confirm|submit/i
    })
    .first()
    .click()
}

// Fill whatever the page asks for that nothing has answered yet. Driving off
// what is rendered rather than a fixed field list matters: the per-species
// questions are named after the commodity, so a fixed list goes stale the
// moment the catalogue changes.
const fillPending = async (page, value = '10') => {
  const inputs = page.locator(
    'form input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([type="submit"]):not([type="button"]):not([type="file"])'
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

// Both search widgets write the value that posts into a hidden input and
// overlay the buttons while their results are open. Dismiss, then check the
// hidden field, so a swallowed click fails here rather than three screens on.
const chooseFromSearch = async (
  page,
  { input, option, hidden, optionAttribute = 'data-country' }
) => {
  const box = page.locator(input).first()
  await box.fill(option)
  const match = page
    .locator(`.app-country-search__option[${optionAttribute}*="${option}"]`)
    .first()
  await expect(match, `"${option}" should appear in the results`).toBeVisible()
  await match.click()
  await expect(
    page.locator(hidden),
    'choosing from the results should write the field that posts'
  ).not.toHaveValue('')
}

const fillOrigin = async (page) => {
  await chooseFromSearch(page, {
    input: '#country-of-origin',
    option: COUNTRY,
    hidden: 'input[name="countryOfOrigin"]'
  })
  await page.locator('input[name="regionOfOriginRequired"][value="No"]').check()
  await continueOn(page)
}

const fillCommodity = async (page) => {
  const search = page.locator('.app-commodity-search__input').first()
  await search.fill(COMMODITY)

  const species = page
    .locator('input[name="commodity-selection"]:not([disabled])')
    .first()
  await expect(species, 'the commodity search should offer a species').toBeVisible()
  await species.check()

  // The results panel overlays the buttons and swallows the mousedown, so
  // continuing while it is open reaches nothing and the form never posts.
  await search.press('Escape')
  await expect(page.locator('.app-commodity-search__results')).toBeHidden()
  await expect(
    page.locator('input[name="selectedSpecies"]'),
    'the widget should have written the selection into the field that posts'
  ).not.toHaveValue('')

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

// One identifier record per animal. Some species offer "Save and add another"
// and some complete in a single pass, so drive off whichever control the page
// renders rather than assuming a loop count.
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

// Two container classes, not one. A role with nothing chosen renders
// `__section-action`; a role that also offers a "Same as consignee" shortcut
// renders `__section-actions`, with the plain link beside the shortcut button.
// Matching only the singular silently skips every role with a shortcut.
//
// The `:not()` is what makes the loop below terminate on completeness. An
// answered role does not stop rendering a link — it renders a "Change" link, in
// a `__section-action` box like the pending ones, distinguishable only by the
// extra `__selected-address-action` class. Without the exclusion the hub never
// runs out of links: the walk re-opens the first role over and over until the
// guard stops it, and the other five are never visited. The hub advances all
// the same, because it saves whatever it has, so the whole omission surfaces
// four screens later as "Complete roles and addresses" — and this spec then
// fails at the declaration, which is the wrong place to learn about it.
const PENDING_ADDRESS_LINK =
  '.app-roles-and-addresses-page__section-action:not(.app-roles-and-addresses-page__selected-address-action) a.govuk-link, .app-roles-and-addresses-page__section-actions a.govuk-link'

// The addresses hub is a hub, not a step: every role has to be answered on its
// own page before the hub will advance. Follow whichever section still offers a
// link rather than a fixed list of roles — DR1 decides which roles apply from
// the commodity, so the list is not knowable up front.
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

  // The hub advances with roles still unanswered, so anything the loop left
  // behind is invisible until the review page refuses to reach the declaration
  // — four screens on, naming the hub but not the role. Fail here instead,
  // while the section that is still asking is on the screen in front of us.
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
      // The port of entry posts a hidden field rather than the box the user
      // types in. Typing alone leaves it empty, the page saves, and the gap
      // only surfaces at review as "Complete arrival details". The catalogue is
      // UK airports and an option reads "Manchester - MAN", so the search term
      // is a prefix of the option rather than the option itself.
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

// The kit rewrites its layouts and recompiles its Sass while the server is up,
// bouncing nodemon. A request landing in that window renders the kit's own error
// page instead of the service. Re-request until it settles rather than
// photograph that under a DR1 name.
const openDashboard = async (page) => {
  await expect(async () => {
    await page.goto('/dashboard')
    await expect(page, '/dashboard should land on the root dashboard').toHaveURL(
      /\/$/,
      { timeout: 5_000 }
    )
    await expect(
      page.locator('.app-dashboard-intro__heading'),
      'the dashboard should render, not error'
    ).toBeVisible({ timeout: 5_000 })
  }).toPass({ timeout: 240_000 })
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
    await expect(page, `${here} should advance`).not.toHaveURL(
      new RegExp(`${here}$`)
    )
  }

  throw new Error(
    `The journey never reached ${until}. It visited ${visited.join(' → ')}.`
  )
}

// The three collapsed filter sections, each named by a control that exists only
// once that section is expanded — so "expanded" can be asserted rather than
// assumed. Without that, an expanded capture is indistinguishable from a
// collapsed one, and a summary click that landed on the chevron image instead
// of the summary would go unnoticed.
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

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(() => {
  record.write()
})

test('records the dashboard with every filter section expanded', async ({
  page
}) => {
  await openDashboard(page)

  // Guard the premise of the whole slice: if the seeded notifications ever stop
  // arriving, the filters are being photographed over a list that no longer
  // exists, and the capture means something different.
  await expect(
    page.locator('.app-dashboard-notification-card'),
    'DR1 seeds notifications into every session, so the list is never empty'
  ).not.toHaveCount(0)

  await expandFilters(page)

  await record.record(page, 'dashboard-filters-open')
})

test('records the dashboard date filter with its calendar open', async ({
  page
}) => {
  await openDashboard(page)
  await expandFilters(page)

  // The date fields are MOJ date pickers, so the calendar is added by
  // JavaScript rather than rendered by the template — the toggle button does
  // not exist until MOJ Frontend has enhanced the input. Clicking it is the
  // only way to see the widget the design is actually asking for.
  const startDate = page.locator('.app-dashboard-filters__date-picker').first()
  const toggle = startDate.locator('.moj-js-datepicker-toggle')
  await expect(
    toggle,
    'the start-date input should have been enhanced into a date picker'
  ).toBeVisible()
  await toggle.click()

  await expect(
    startDate.locator('.moj-datepicker__dialog--open'),
    'the toggle should open the calendar'
  ).toBeVisible()

  await record.record(page, 'dashboard-filters-date-picker-open')
})

test('records the dashboard once the session has submitted a notification', async ({
  page
}) => {
  await startJourney(page)
  await walkTo(page, /\/review-notification$/)

  await continueOn(page)
  await expect(page, 'a complete review should reach the declaration').toHaveURL(
    /\/declaration$/
  )

  // The declaration is confirmed by a checkbox, not a radio — ticking radios
  // leaves it untouched, the post is rejected for a missing confirmation, and
  // the page re-renders at the same URL with nothing submitted.
  await page.locator('#declaration-confirmed').check()
  await continueOn(page)
  await expect(page, 'a confirmed declaration should submit').toHaveURL(
    /\/notification-submitted$/
  )

  // The confirmation panel is where the reference the user will quote first
  // appears. Carry it to the dashboard, because "my notification is listed" is
  // the only claim this capture is worth making, and counting cards would not
  // make it — the seeded rows are there either way.
  const reference = (
    await page.locator('.govuk-panel__body strong').first().innerText()
  ).trim()
  expect(reference, 'the confirmation should quote a reference').toBeTruthy()

  await openDashboard(page)

  // The reference alone does not identify the card. DR1 hands every fresh
  // journey the one canonical reference (routes.js
  // `ensurePrototypeNotificationReference`), and the first seeded row carries
  // that same string — so a card bearing this reference is on the dashboard
  // whether or not anything was submitted, and matching on it alone would pass
  // over a journey that silently never posted. What separates them is the
  // origin: the session's own row carries the country this walk chose, and the
  // seeded twin carries Republic of Ireland. Match on both.
  //
  // (The seeded twin is not also listed: `getDashboardNotificationList` drops
  // any seeded row whose reference a submitted one has taken, so the pair
  // collapses to one card rather than two.)
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
