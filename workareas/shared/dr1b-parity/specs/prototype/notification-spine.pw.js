//
// DR1 slice: the notification spine — the pages a user walks in order to make
// one notification, from the origin of the import to the confirmation panel.
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// prototype is correct. Every step DOES assert the journey landed where it
// should, because a mislabelled picture is worse than a missing one: a
// Prototype Kit page that rejects a POST re-renders at the same URL, so "we did
// not see an error" is true of a rejected answer and of an accepted one alike.
//
// DR1 is the ROOT mount of the kit — app/views/x.html and the routes in
// app/routes.js that carry no version prefix. The design-release-2 and
// design-release-2.1 folders are later releases and are not captured here.
//
// Recorded by this spec, ten screens:
//
//   origin-of-the-import              empty, as the journey opens it
//   what-are-you-importing            empty, before anything is typed
//   what-are-you-importing-results    the commodity search with results open
//   consignment-details               empty
//   additional-animal-details         empty
//   notification-hub                  a brand-new notification, every row To do
//   review-notification               a notification with nothing left to do
//   review-notification-incomplete    the same page opened part-way through
//   declaration                       empty, before the box is ticked
//   notification-submitted            the confirmation panel
//
// Walked through but NOT photographed: reason-for-import,
// animal-identification-details, arrival-details, transit-countries,
// transporter, upload-documents, roles-and-addresses and every address page
// behind it, contact-address-for-consignment. Other slices own those, and two
// specs shooting one screen is two chances for them to disagree about the state
// it was in.
//
// The walk is keyed off the CURRENT URL rather than a hardcoded order, so it
// survives DR1 reordering a step and records the order the journey actually
// took. A page the spine does not recognise stops the run and names itself,
// which is how a screen nobody knew about gets found.
//
// Nothing is imported from the prototype repo. Its own journey driver under
// journey-demo/e2e is unmaintained, and a capture built on it breaks the first
// time somebody refactors a suite nobody runs. Every widget below was
// re-derived from app/assets/javascripts/ and the rendered DOM.
//
import { readFileSync } from 'node:fs'

const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

const COUNTRY = 'France'
const COMMODITY = 'Cattle'
const ANIMAL_COUNT = '2'
// Whatever a page still wants and has no better answer for. Ten packages, ten
// kilos, ten of anything: a single value keeps the pictures of the pages this
// spec does NOT own predictable for the slices that do own them.
const SPARE_VALUE = '10'

const path = (page) => new URL(page.url()).pathname

// The pages this spec photographs on the way through. Everything else on the
// spine is another slice's screen: walked, filled, and left alone.
const PHOTOGRAPHED = new Set([
  '/origin-of-the-import',
  '/what-are-you-importing',
  '/consignment-details',
  '/additional-animal-details'
])

// The arrival date DR1 accepts is a moving window — a week behind today to six
// months ahead — so no fixed date stays valid. A date that has fallen out of
// the window is not rejected on the page: it saves, and the notification is
// quietly incomplete until "Complete arrival details" appears at review, five
// screens later with nothing pointing back at the field.
//
// So it is derived from today, and it is the one value in this walk whose
// pixels move from day to day. The harness masks references and UUIDs
// (VOLATILE_RULES) and does not mask dates, so review-notification and
// notification-submitted will differ between two runs a day apart in the
// arrival date alone. That is unavoidable here — the window moves whatever we
// do — and it is worth writing down so nobody reads it as a change in DR1.
const ARRIVAL_DATE = (() => {
  const when = new Date()
  when.setDate(when.getDate() + 14)
  return `${when.getDate()}/${when.getMonth() + 1}/${when.getFullYear()}`
})()

// The MoJ date picker's calendar opens over whatever control comes next and
// swallows the click on it. Type into the input and dismiss with Escape rather
// than driving the calendar.
const fillDate = async (field, value = ARRIVAL_DATE) => {
  await field.fill(value)
  await field.press('Escape')
}

// Most pages carry the kit's own button group, a submit named `action` with
// value `continue`; a few render a plain submit instead. Fall back to the
// accessible name, never to a class.
//
// The fallback must not match "Save and return to overview", which sits beside
// the real continue on several pages and posts action=hub — that saves and
// bounces the walk to the hub, where the next assertion fails somewhere with
// nothing to say about why.
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

// Fill whatever a page still asks for and nothing has answered. Driving off
// what is rendered rather than a fixed field list matters on this journey: the
// per-species questions on consignment details are named after the commodity,
// so a fixed list goes stale the moment the catalogue changes.
//
// `type="search"` is excluded on purpose. Every search box on this journey is a
// filter over a list, not an answer: the address and transporter pages hide the
// rows that do not match what is typed, so typing a spare value here hides the
// radio the walk has just chosen. The three boxes that DO post something —
// country, commodity, port of entry — write a hidden field and are each driven
// explicitly below.
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

// Answer every radio group nothing has answered, first visible option. Grouping
// by name first is what keeps a conditional reveal from being answered twice
// and what keeps an already-answered group from being changed.
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

// The country and port widgets both render their matches as buttons carrying
// the value in a data attribute, and both write what actually posts into a
// hidden input rather than into the box the user types in. The results list
// also calls preventDefault on mousedown and sits over the buttons below it, so
// clicking Continue while it is open reaches nothing at all: no error, no
// navigation, no POST.
//
// Choose from the list, then assert the hidden field, so a swallowed click
// fails here rather than at review five screens later.
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

// The commodity search is the one widget on this journey whose open state is a
// screen in its own right, so this is also where what-are-you-importing-results
// is photographed — between the search returning and anything being ticked.
const fillCommodity = async (page, { photograph = false } = {}) => {
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

  if (photograph) {
    // The state the screen id names is the search having returned, not a
    // selection having been made. Prove nothing is ticked before shooting it,
    // or the picture is of a different screen than the one it is filed under.
    await expect(
      page.locator('input[name="commodity-selection"]:checked'),
      'the results should be photographed before anything is chosen'
    ).toHaveCount(0)
    await record.record(page, 'what-are-you-importing-results')
  }

  await species.first().check()

  // Ticking a species re-renders the results in place, so the panel is still
  // open and still over the buttons. Escape is what closes it (commodity-
  // search.js keydown handler); without that, Continue reaches nothing.
  await search.press('Escape')
  await expect(results, 'Escape should close the results panel').toBeHidden()

  // The field that posts is seeded with the string "[]" on page load, so
  // "not empty" is already true before a single species is chosen. Assert
  // against the seed as well as against blank.
  await expect(
    page.locator('input[name="selectedSpecies"]'),
    'the widget should have written the selection into the field that posts'
  ).not.toHaveValue(/^(\[\])?$/)

  await continueOn(page)
}

// "Internal market" reveals a second radio group. `check()` waits for the
// reveal, so the two calls in order are enough — but the second group is inside
// the conditional, and answering it before the first does nothing at all.
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
// and some complete in one pass, so drive off whichever control the page
// actually renders rather than assuming a loop count.
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
// `__section-action`; a role that also offers a "Same as consignee" or "Same as
// place of origin" shortcut renders `__section-actions`, with the plain link
// beside the shortcut button. Matching only the singular silently skips every
// role that has a shortcut.
//
// The `:not()` is what makes the loop terminate on completeness. An answered
// role does not stop rendering a link — it renders a "Change" link, in a
// `__section-action` box like the pending ones, told apart only by the extra
// `__selected-address-action` class. Without the exclusion the hub never runs
// out of links: the walk re-opens the first role forever and the other five are
// never visited. The hub advances anyway, because it saves whatever it has, so
// the whole omission surfaces four screens later as "Complete roles and
// addresses".
//
// Both halves are scoped to those two containers on purpose. "Cancel and return
// to overview" and the footer's feedback link are `a.govuk-link` too, and an
// unscoped match would follow the cancel link out of the hub on the first pass.
const PENDING_ADDRESS_LINK =
  '.app-roles-and-addresses-page__section-action:not(.app-roles-and-addresses-page__selected-address-action) a.govuk-link, .app-roles-and-addresses-page__section-actions a.govuk-link'

// The addresses page is a hub, not a step: every role is answered on its own
// page and returns here. Follow whichever section still offers a link rather
// than a fixed list of roles — DR1 decides which roles apply from the commodity,
// so the list is not knowable up front.
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
      // Address pages are a radio list over saved addresses, with a search box
      // above that only hides rows. Choose a row; leave the box alone.
      await pickPendingRadios(page)
      await fillPending(page)
    }

    await continueOn(page)
    await expect(page, `${on} should return to the addresses hub`).toHaveURL(
      /\/roles-and-addresses$/
    )
  }

  // The hub advances with roles still unanswered, so anything the loop left
  // behind stays invisible until the review page refuses to reach the
  // declaration — four screens on, naming the hub but not the role. Fail here
  // instead, while the section that is still asking is on the screen.
  await expect(
    page.locator(PENDING_ADDRESS_LINK),
    'every role on the addresses hub should have been answered'
  ).toHaveCount(0)

  await continueOn(page)
}

// The journey, keyed by the page each step lands on rather than by position.
// Every fill takes the same options object so the walk can tell a step it is
// being photographed; only the commodity search does anything with it.
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
      // The port of entry is a search over UK ports and airports, and like the
      // country box it posts a hidden field rather than what is typed. Typing
      // alone leaves that field empty, the page saves, and the gap only
      // surfaces at review as "Complete arrival details".
      //
      // Its options read "Manchester - GBMNC", so the search term is a prefix
      // of the option rather than the option itself, and the value written is
      // the whole label — hence a substring match and no `expected`. The
      // airport widget also marks its options with data-option where the
      // country one uses data-country: same class, different attribute.
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

const record = recorder()

// Walk from wherever the journey stands until it reaches `until`, photographing
// every page on the way that this spec owns — empty, before the fill touches
// it, because a half-answered form is a screen nobody specified.
const walkTo = async (page, until) => {
  const visited = []

  for (let step = 0; step < SPINE.length * 3; step += 1) {
    const here = path(page)
    if (until.test(here)) return visited

    const spineStep = SPINE.find((candidate) => candidate.at.test(here))
    expect(
      spineStep,
      `${here} is a page the DR1 spine does not know about — either the journey has changed or this spec is incomplete`
    ).toBeTruthy()

    const photograph = PHOTOGRAPHED.has(here)
    if (photograph) {
      await record.record(page, here.replace(/^\//, '').replace(/\//g, '-'))
    }
    visited.push(here)

    await spineStep.fill(page, { photograph })

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
// error page. Re-request until it settles rather than photograph that under a
// DR1 name.
const startJourney = async (page) => {
  await expect(async () => {
    await page.goto('/create-notification')
    await expect(page).toHaveURL(/\/origin-of-the-import$/, { timeout: 5_000 })
    await expect(page.locator('main h1')).toHaveText(/origin of the import/i, {
      timeout: 5_000
    })
  }).toPass({ timeout: 240_000 })
}

// A serial block turns one failure into several: the tests below are
// independent — each opens its own session and starts its own notification —
// so a red run reports the first real failure and SKIPS the rest. Before
// writing a screen up as unreachable, check whether the test above it failed.
test.describe.configure({ mode: 'serial' })

test.afterAll(() => {
  record.write()
})

test('records the notification hub as a brand-new notification finds it', async ({
  page
}) => {
  // /create-notification resets the session before redirecting to the first
  // page, so the hub reached straight afterwards is the empty one — which is
  // the screen the design defines. A hub captured mid-journey would be a state,
  // and this screen id does not name one.
  await startJourney(page)

  await page.goto('/notification-hub')
  await expect(
    page,
    'the hub should be reachable from a started notification'
  ).toHaveURL(/\/notification-hub$/)
  await expect(page.locator('main h1')).toHaveText(/overview/i)

  const tags = page.locator('.app-notification-hub-tasklist__tag')
  await expect(tags, 'the hub should list the tasks').not.toHaveCount(0)
  await expect(
    tags.filter({ hasNotText: 'To do' }),
    'every task should still be To do on a notification nothing has been answered on'
  ).toHaveCount(0)

  await record.record(page, 'notification-hub')
})

test('records the spine, then the review, declaration and confirmation', async ({
  page
}) => {
  await startJourney(page)

  const visited = await walkTo(page, /\/review-notification$/)
  expect(
    visited.length,
    'the walk should have crossed the whole spine, not stopped early'
  ).toBeGreaterThan(5)

  await expect(page.locator('main h1')).toHaveText(/review your notification/i)
  await expect(
    page.locator('.govuk-error-summary'),
    'a notification with nothing left to do should reach review with no summary'
  ).toHaveCount(0)
  await record.record(page, 'review-notification')

  await continueOn(page)
  await expect(
    page,
    'a complete review should reach the declaration'
  ).toHaveURL(/\/declaration$/)
  await expect(page.locator('main h1')).toHaveText(/declaration/i)
  await expect(
    page.locator('#declaration-confirmed'),
    'the declaration should be photographed before it is agreed to'
  ).not.toBeChecked()
  await record.record(page, 'declaration')

  // The declaration is confirmed with a checkbox, not a radio. Ticking radios
  // leaves it untouched, the POST is rejected for a missing confirmation, and
  // the page re-renders at the same URL with nothing submitted.
  await page.locator('#declaration-confirmed').check()
  await continueOn(page)

  await expect(page, 'a confirmed declaration should submit').toHaveURL(
    /\/notification-submitted$/
  )
  await expect(page.locator('.govuk-panel__title')).toHaveText(
    /import notification submitted/i
  )
  await record.record(page, 'notification-submitted')
})

test('records the review page for a notification that is not yet finished', async ({
  page
}) => {
  await startJourney(page)

  // DR1 lets a user open the review page whenever they like: GET
  // /review-notification carries no completeness guard, and the view model is
  // built through the with-errors path — so what an unfinished notification
  // gets is the same page carrying an error summary and a per-card message
  // naming each section still missing. That state is what this records; the
  // capture above is the same page complete, where there is nothing to name.
  //
  // Reached by answering the first four pages and then going straight to the
  // review, rather than by walking the spine: everything from animal
  // identification onwards is left unanswered, which is what puts the five
  // later cards into their error state. Nothing on the way is photographed —
  // the walk above owns those screens.
  await expect(page).toHaveURL(/\/origin-of-the-import$/)
  await fillOrigin(page)

  await expect(
    page,
    'origin should advance to what-are-you-importing'
  ).toHaveURL(/\/what-are-you-importing$/)
  await fillCommodity(page)

  await expect(
    page,
    'the commodity should advance to reason-for-import'
  ).toHaveURL(/\/reason-for-import$/)
  await fillReason(page)

  await expect(
    page,
    'the reason should advance to consignment-details'
  ).toHaveURL(/\/consignment-details$/)
  await fillConsignmentDetails(page)

  await expect(
    page,
    'consignment details should have been accepted and advanced'
  ).not.toHaveURL(/\/consignment-details$/)

  await page.goto('/review-notification')
  await expect(
    page,
    'the review page should open on an unfinished notification'
  ).toHaveURL(/\/review-notification$/)
  await expect(page.locator('main h1')).toHaveText(/review your notification/i)

  // Three separate assertions because they are three separate parts of the
  // state, and a picture missing any one of them is of a different screen: the
  // summary at the top, the red edge on each incomplete card (`--error` on the
  // wrapper), and the message inside it naming what is missing. A complete
  // notification renders none of the three.
  //
  // Five is exact on purpose. Stopping after consignment details leaves
  // additional details, arrival, transport, roles and addresses, and the
  // contact address outstanding, and nothing else. If DR1 changes what a
  // half-finished notification is missing, this should fail loudly rather than
  // file a picture of a different incompleteness under the same name.
  await expect(
    page.locator('.govuk-error-summary__list li'),
    'the summary should name the five sections still missing'
  ).toHaveCount(5)
  await expect(
    page.locator('.app-review-card-wrapper--error'),
    'those five sections should render in their error state'
  ).toHaveCount(5)
  await expect(
    page.locator('.app-review-card__error-message'),
    'each card in error should say what it is waiting for'
  ).toHaveCount(5)

  await record.record(page, 'review-notification-incomplete')
})
