//
// DR1 slice: the notification spine, from consignment details to submitted.
//
// A requirements-gathering spec, not a test. Nothing here asserts that the
// prototype is correct. Every step does assert the journey landed where it
// should, because a mislabelled capture is worse than a missing one.
//
// It walks off the CURRENT URL rather than a hardcoded order. That way the walk
// survives DR1 reordering a step, and what it records is the order the journey
// actually took rather than the order somebody assumed. A page the spine does
// not recognise stops the run and names itself, which is how a screen nobody
// knew about gets found.
//
// origin-of-the-import, what-are-you-importing, reason-for-import and
// cph-number belong to origin-and-reason.pw.js. This spec walks through them
// and records what comes after.
//
import { readFileSync } from 'node:fs'

const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

const COUNTRY = 'France'
const COMMODITY = 'Cattle'
const ANIMAL_COUNT = '2'

// Screens another spec owns. Walked through, not photographed here — two specs
// shooting one screen is two chances for them to disagree about what state it
// was in.
const OWNED_ELSEWHERE = new Set([
  '/origin-of-the-import',
  '/what-are-you-importing',
  '/reason-for-import',
  '/cph-number',
  '/upload-documents'
])

const path = (page) => new URL(page.url()).pathname

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

// The arrival date the prototype will accept is a moving window — seven days
// behind today to six months ahead — so no fixed date stays valid. A date that
// has fallen out of the window is not rejected on the page; it saves, and the
// notification is quietly incomplete until "Complete arrival details" appears
// at review, five screens later with nothing pointing back.
//
// So the date is derived from today, and this is the one field in the whole
// corpus whose pixels change from day to day. That is a real cost against the
// guarantee that two runs at one commit produce the same bytes, and it is
// unavoidable: the window moves whatever we do. Page models mask it; full-page
// screenshots of arrival-details will differ in that field alone.
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

// Fill whatever the page asks for that nothing has answered yet. Driving off
// what is rendered rather than a fixed field list matters here: the
// per-species questions on consignment details are named after the commodity,
// so a fixed list goes stale the moment the catalogue changes.
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
  await page
    .locator('input[name="internalMarketPurpose"]')
    .first()
    .check()
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
// four screens later as "Complete roles and addresses".
const PENDING_ADDRESS_LINK =
  '.app-roles-and-addresses-page__section-action:not(.app-roles-and-addresses-page__selected-address-action) a.govuk-link, .app-roles-and-addresses-page__section-actions a.govuk-link'

// The addresses hub is a hub, not a step: every role has to be answered on its
// own page before the hub will advance. Follow whichever section still offers
// an "Add" link, rather than a fixed list of roles — DR1 decides which roles
// apply from the commodity, so the list is not knowable up front.
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
      // Address pickers are a radio list; permanent-address pages are radios
      // too. Either way the first visible choice is a valid answer.
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

// The journey, keyed by the page each step lands on rather than by position.
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
      // The port of entry is a search widget over UK ports and airports, and
      // like the country one it posts a hidden field rather than the box the
      // user types in. Typing alone leaves that field empty, the page saves,
      // and the omission only surfaces at review as "Complete arrival
      // details" — five screens later, with nothing pointing back here.
      // The catalogue behind "port of entry" is UK airports, and an option
      // reads "Manchester - MAN" — so the search term is a prefix of the
      // option, not the option itself.
      await chooseFromSearch(page, {
        input: '#port-of-entry',
        option: 'Manchester',
        hidden: 'input[name="portOfEntry"]',
        // The airport widget marks its options with data-option; the country
        // one uses data-country. Same class, different attribute.
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

// Walk from wherever the journey stands until it reaches `until`, recording
// every page on the way that this spec owns.
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

    if (!OWNED_ELSEWHERE.has(here)) {
      await record.record(page, here.replace(/^\//, '').replace(/\//g, '-'))
    }
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

// The kit rewrites its layouts and recompiles its Sass while the server is up,
// bouncing nodemon. A request landing in that window renders the kit's own
// error page. Re-request until it settles rather than photograph that.
const start = async (page) => {
  await expect(async () => {
    await page.goto('/create-notification')
    await expect(page).toHaveURL(/\/origin-of-the-import$/, { timeout: 5_000 })
    await expect(page.locator('main h1')).toHaveText(/origin of the import/i, {
      timeout: 5_000
    })
  }).toPass({ timeout: 240_000 })
}

test.describe.configure({ mode: 'serial' })

test.afterAll(() => {
  record.write()
})

test('records the dashboard and the notification hub', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.locator('main')).toBeVisible()
  await record.record(page, 'dashboard')

  await start(page)
  await page.goto('/notification-hub')
  await expect(page, 'the hub should be reachable from a started notification')
    .toHaveURL(/\/notification-hub$/)
  await record.record(page, 'notification-hub')
})

test('records every page of the spine, then review, declaration and submitted', async ({
  page
}) => {
  await start(page)

  const visited = await walkTo(page, /\/review-notification$/)
  expect(
    visited.length,
    'the walk should have crossed the whole spine, not stopped early'
  ).toBeGreaterThan(5)

  await record.record(page, 'review-notification')
  await continueOn(page)

  await expect(page, 'a complete review should reach the declaration').toHaveURL(
    /\/declaration$/
  )
  await record.record(page, 'declaration')

  // The declaration is confirmed with a checkbox, not a radio. Ticking radios
  // leaves it untouched, and the post is then rejected for a missing
  // confirmation — the page re-renders at the same URL, so the walk stalls on
  // the declaration with no notification submitted.
  await page.locator('#declaration-confirmed').check()
  await continueOn(page)

  await expect(page, 'a confirmed declaration should submit').toHaveURL(
    /\/notification-submitted$/
  )
  await record.record(page, 'notification-submitted')
})

test('records the review page for a notification that is not yet complete', async ({
  page
}) => {
  await start(page)

  // DR1 lets a user open the review page whenever they like: GET
  // /review-notification (routes.js) has no completeness guard, and
  // renderReviewNotificationPage builds its view model through
  // getReviewNotificationViewModelWithErrors — so what an unfinished
  // notification gets is the same page, carrying an error summary and a
  // per-card error message naming each section that is still missing. That
  // state is what this records; the capture above is the same page complete,
  // where there is nothing to name.
  //
  // Reached by answering the first four pages and then going straight to the
  // review, rather than by walking the spine: everything from animal
  // identification onwards is left unanswered, which is what puts the later
  // cards in their error state. Nothing on the way is photographed — the walk
  // above owns those screens, and two captures of one screen are two chances to
  // disagree about what state it was in.
  await expect(page).toHaveURL(/\/origin-of-the-import$/)
  await fillOrigin(page)

  await expect(page, 'origin should advance to what-are-you-importing').toHaveURL(
    /\/what-are-you-importing$/
  )
  await fillCommodity(page)

  await expect(page, 'the commodity should advance to reason-for-import').toHaveURL(
    /\/reason-for-import$/
  )
  await fillReason(page)

  await expect(page, 'the reason should advance to consignment-details').toHaveURL(
    /\/consignment-details$/
  )
  await fillConsignmentDetails(page)

  // A rejected consignment-details post re-renders at the same URL rather than
  // erroring elsewhere, so leaving the page is the proof it was accepted.
  await expect(
    page,
    'consignment details should have been accepted and advanced'
  ).not.toHaveURL(/\/consignment-details$/)

  await page.goto('/review-notification')
  await expect(page, 'the review page should open on an unfinished notification')
    .toHaveURL(/\/review-notification$/)

  // Three separate assertions because they are three separate pieces of the
  // state, and a capture missing any one of them is of a different screen: the
  // summary at the top, the red edge on each incomplete card
  // (`--error` on the wrapper), and the message inside it that names what is
  // missing. A complete notification renders none of the three.
  await expect(
    page.locator('.govuk-error-summary__list li'),
    'the summary should name what is still missing'
  ).not.toHaveCount(0)
  await expect(
    page.locator('.app-review-card-wrapper--error'),
    'the sections still unanswered should render in their error state'
  ).not.toHaveCount(0)
  await expect(
    page.locator('.app-review-card__error-message'),
    'each card in error should say what it is waiting for'
  ).not.toHaveCount(0)

  await record.record(page, 'review-notification-incomplete')
})
