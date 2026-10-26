const { test } = require('@playwright/test')
const L = require('./lib')
const S_ = require('./steps')
const { Shooter, SIDE, ANIMALS, INS, PLANTS, BACKEND, settle, dateText, dateParts } = L
const {
  go, press, button, saveContinue, softSave, h1, slugOf, idOf, animalsUrl, plantsUrl, errorSummaryText, errorsShown,
  ROAD, AIR, H, P, createAnimals, walkRun, completeByRoute, openOverview, openReview, submitFromReview, openFromList,
  ensureAddress, PLANTS_ADDRESS, PA, POTATOES, createPlants, walkPlantsRun, completePlantsByRoute, openPlantsReview, tickSpecies, selectByText
} = S_

const ARRIVAL_DATE_OBLIGATION = '12b3c4d5-e6f7-4a08-8b9a-1c2d3e4f5a6b'
const shared = {}

// One test per journey. A journey that throws marks every shot it had not yet taken as failed.
function journey(title, keys, run) {
  test(title, async ({ page }) => {
    const S = new Shooter(page)
    try {
      await run(S, page)
    } catch (error) {
      const message = `journey "${title}" stopped: ${String(error.message).split('\n').slice(0, 2).join(' | ')}`
      for (const key of keys) {
        if (!S.done.has(key)) {
          await S.fail(key, new Error(message))
        }
      }
    }
    for (const key of keys) {
      if (!S.done.has(key)) S.absent(key, `journey "${title}" finished without taking this shot`)
    }
  })
}

const landedOn = (page) => ({ landedOn: slugOf(page) === '' ? 'overview' : slugOf(page) })

async function backHref(page) {
  const link = page.locator('a.govuk-back-link').first()
  return (await link.count()) ? link.getAttribute('href') : null
}

async function openTask(page, id, names, slug) {
  await openOverview(page, id)
  for (const name of names) {
    const link = page.getByRole('link', { name, exact: true })
    if (await link.count()) {
      await press(page, link.first())
      return
    }
  }
  await go(page, animalsUrl(id, slug))
}

async function openViewFromList(S, page, id) {
  await openFromList(page, id, (card) => card.getByRole('link', { name: new RegExp(`View notification ${id}`) }))
}

test('A00 seed the address book fixtures the tests repo uses', async ({ page }) => {
  const created = await S_.ensureFixtureAddresses(page)
  console.log(`address book fixtures created: ${created.join(', ') || 'none needed'}`)
})

// ---------------------------------------------------------------- animals

journey('A01 origin page, country search and region code', ['a-origin-empty', 'a-origin-country-search', 'a-origin-region-yes'], async (S, page) => {
  await createAnimals(page)
  await S.shot('a-origin-empty')
  await S.shot('a-origin-country-search', async () => {
    const field = page.locator('#countryOfOrigin')
    await field.click()
    await field.pressSequentially('Can', { delay: 60 })
    await page.getByRole('option').first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {})
  })
  await S.shot('a-origin-region-yes', async () => {
    await page.reload()
    await S_.pickFromCombo(page, page.locator('#countryOfOrigin'), 'France', /^France$/)
    await page.getByRole('radio', { name: 'Yes', exact: true }).check()
  })
})

journey('A02 origin soft save on a blank origin', ['a-origin-soft-save'], async (S, page) => {
  await createAnimals(page)
  await S.shot('a-origin-soft-save', async () => {
    await press(page, softSave(page))
    return { ...landedOn(page), errorSummary: await errorSummaryText(page) }
  })
})

journey('A03 overview with the region question unanswered (combined only)', ['a-overview-origin-region-unanswered'], async (S, page) => {
  if (SIDE === 'before') {
    S.absent('a-overview-origin-region-unanswered', 'after-only shot: main cannot save this state through the page (cards.json compare: after-only)')
    return
  }
  const id = await createAnimals(page)
  await S.shot('a-overview-origin-region-unanswered', async () => {
    await S_.pickFromCombo(page, page.locator('#countryOfOrigin'), 'France', /^France$/)
    await press(page, softSave(page))
    if (slugOf(page) !== '') await openOverview(page, id)
    return landedOn(page)
  })
})

journey('A04 region code answered Yes then changed to No', ['a-review-region-cleared'], async (S, page) => {
  const id = await createAnimals(page)
  await H.origin(page, { country: 'France', regionCode: '75' })
  await go(page, animalsUrl(id, 'origin'))
  await page.getByRole('radio', { name: 'No', exact: true }).check()
  await press(page, saveContinue(page))
  await S.shot('a-review-region-cleared', async () => {
    await openReview(page, id)
    const card = page.locator('.govuk-summary-card').filter({ hasText: /origin/i }).first()
    return { originCard: (await card.count()) ? (await card.innerText()).replace(/\s+/g, ' ').trim() : null }
  })
})

journey(
  'A05 first run, cattle by air with a health certificate',
  [
    'a-commodities-opening-run', 'a-import-reason-opening-run', 'a-consignment-details-opening-run', 'a-additional-details-opening-run',
    'a-run-after-what-importing', 'a-run-after-reason', 'a-run-after-addresses', 'a-review-cattle-air', 'a-confirmation-with-certificate', 'a-view-submitted'
  ],
  async (S, page) => {
    const id = await createAnimals(page)
    const A = AIR()
    const afterFlags = new Set()
    const afterShot = async (prevSlug, key, slug) => {
      if (afterFlags.has(key)) return
      afterFlags.add(key)
      await S.shot(key, null, { landedOn: slug === '' ? 'overview' : slug })
    }
    const openings = {
      commodities: 'a-commodities-opening-run',
      'import-reason': 'a-import-reason-opening-run',
      'consignment-details': 'a-consignment-details-opening-run',
      'additional-details': 'a-additional-details-opening-run'
    }
    const { slug } = await walkRun(page, A, {
      onLand: async (slug, prev, first) => {
        if (first && openings[slug]) await S.shot(openings[slug])
        if (prev === 'commodities') await afterShot(prev, 'a-run-after-what-importing', slug)
        if (prev === 'import-reason') await afterShot(prev, 'a-run-after-reason', slug)
        if (prev === 'addresses') await afterShot(prev, 'a-run-after-addresses', slug)
      },
      stop: (slug, prev) => slug === 'notification-view' || (slug === '' && prev === 'consignment/contact/select')
    })
    await S.shot('a-review-cattle-air', async () => {
      if (slugOf(page) !== 'notification-view') await openReview(page, id)
      return { runEndedOn: slug === '' ? 'overview' : slug, healthCertificateUploaded: A.documentUploaded === true, documentError: A.documentError || null }
    })
    // The first run asks for the CPH number only from its row on roles and addresses, so add it now to make the draft submittable.
    await go(page, animalsUrl(id, 'cph-number'))
    if (slugOf(page) === 'cph-number') await H['cph-number'](page, A)
    await openReview(page, id)
    await submitFromReview(page)
    shared.airId = id
    if (A.documentUploaded === true) {
      await S.shot('a-confirmation-with-certificate')
    } else {
      await S.fail('a-confirmation-with-certificate', new Error(`health certificate upload did not complete: ${A.documentError || 'not attempted'}`))
    }
    await S.shot('a-view-submitted', async () => {
      await openViewFromList(S, page, id)
      return { healthCertificateUploaded: A.documentUploaded === true }
    })
  }
)

journey(
  'A06 first run with the fewest answers, ending incomplete',
  ['a-run-after-contact-incomplete'],
  async (S, page) => {
    await createAnimals(page)
    const A = ROAD()
    A.arrival = { ...A.arrival, means: 'Air', meansOnly: true }
    A.blankTransporter = true
    A.transit = []
    A.cph = false
    const { slug, prev } = await walkRun(page, A, {
      stop: (slug, prev) => slug === 'notification-view' || (slug === '' && prev === 'consignment/contact/select')
    })
    await S.shot('a-run-after-contact-incomplete', null, { runEndedOn: slug === '' ? 'overview' : slug, errorSummary: await errorSummaryText(page) })
  }
)

journey(
  'A07 cattle by road, complete: overview, review, declaration, submit, view, amend',
  [
    'a-overview-complete', 'a-review-road-transit', 'a-declaration', 'a-confirmation-no-documents', 'a-view-action-required',
    'a-overview-amend', 'a-origin-amend', 'a-cph-amend', 'a-review-amend-opened', 'a-review-amend-changed', 'a-declaration-amend',
    'a-review-amend-continue-incomplete'
  ],
  async (S, page) => {
    const id = await createAnimals(page)
    const skipped = await completeByRoute(page, id, ROAD())
    shared.roadId = id
    await S.shot('a-overview-complete', async () => {
      await openOverview(page, id)
      return { stepsSkipped: skipped }
    })
    await S.shot('a-review-road-transit', async () => {
      await press(page, page.getByRole('button', { name: 'Review and submit' }))
    })
    await S.shot('a-declaration', async () => {
      await press(page, button(page, 'Continue'))
    })
    await page.getByRole('checkbox', { name: /I confirm that I have reviewed/ }).check()
    await press(page, button(page, 'Continue'))
    await page.getByRole('heading', { name: 'Import notification submitted' }).waitFor(settle)
    await S.shot('a-confirmation-no-documents')
    await S.shot('a-view-action-required', async () => {
      await openViewFromList(S, page, id)
    })
    // INS shows the row while the notification is submitted and not yet amended.
    const insPage = await page.context().newPage()
    try {
      const insShooter = new Shooter(insPage)
      await go(insPage, `${INS}/`)
      await insShooter.shot('i-home-action-required', async () => {
        await insPage.getByLabel('Search by notification reference').fill(id)
        await press(insPage, insPage.getByRole('button', { name: 'Search', exact: true }))
        const row = insPage.getByRole('row', { name: new RegExp(id) })
        await row.first().waitFor(settle)
        const link = row.first().getByRole('link').first()
        return {
          rowText: (await row.first().innerText()).replace(/\s+/g, ' ').trim(),
          rowLinkHref: await link.getAttribute('href').catch(() => null)
        }
      })
    } catch (error) {
      new Shooter(insPage).fail('i-home-action-required', error)
    }
    await insPage.close()
    await S.shot('a-overview-amend', async () => {
      await openFromList(page, id, (card) => card.getByRole('button', { name: new RegExp(`Amend notification ${id}`) }))
    })
    await S.shot('a-origin-amend', async () => {
      await openTask(page, id, ['Where is this consignment coming from?'], 'origin')
    })
    await S.shot('a-cph-amend', async () => {
      await openTask(page, id, ['Roles and addresses'], 'addresses')
      const cph = page.locator('.govuk-summary-list__row', { hasText: /holding|CPH/i }).getByRole('link').first()
      if (await cph.count()) await press(page, cph)
      else await go(page, animalsUrl(id, 'cph-number'))
    })
    await S.shot('a-review-amend-opened', async () => {
      await openOverview(page, id)
      await press(page, page.getByRole('button', { name: 'Review and submit' }))
    })
    await S.shot('a-review-amend-changed', async () => {
      await go(page, animalsUrl(id, 'origin'))
      await page.getByLabel('Your internal reference for this consignment (optional)').fill('Imports456GB-AMENDED')
      const save = page.getByRole('button', { name: 'Save and return', exact: true }).or(saveContinue(page))
      await press(page, save.first())
    })
    await S.shot('a-declaration-amend', async () => {
      await openReview(page, id)
      await press(page, button(page, 'Continue'))
    })
    await S.shot('a-review-amend-continue-incomplete', async () => {
      await go(page, animalsUrl(id, 'port-of-entry'))
      await page.locator('input[name="arrivalDateAtPort"]').fill('')
      await press(page, softSave(page))
      await openReview(page, id)
      await press(page, button(page, 'Continue'))
      return { errorSummary: await errorSummaryText(page) }
    })
  }
)

journey('A08 road consignment with no transit countries', ['a-overview-road-no-transit', 'a-review-road-no-transit'], async (S, page) => {
  const id = await createAnimals(page)
  const A = ROAD()
  A.transit = []
  await completeByRoute(page, id, A)
  await S.shot('a-overview-road-no-transit', async () => {
    await openOverview(page, id)
  })
  await S.shot('a-review-road-no-transit', async () => {
    await press(page, page.getByRole('button', { name: 'Review and submit' }))
    await press(page, button(page, 'Continue'))
    return landedOn(page)
  })
})

journey('A09 arrival saved with no commodity, then the arrival date goes stale', ['a-overview-no-commodity-arrival-saved', 'a-overview-stale-arrival'], async (S, page) => {
  const id = await createAnimals(page)
  await H.origin(page, { country: 'France' })
  await go(page, animalsUrl(id, 'port-of-entry'))
  await H['port-of-entry'](page, ROAD())
  await S.shot('a-overview-no-commodity-arrival-saved', async () => {
    await openOverview(page, id)
  })
  await S.shot('a-overview-stale-arrival', async () => {
    const got = await page.request.get(`${BACKEND}/notifications/${id}/fulfilments`)
    if (!got.ok()) throw new Error(`backend fulfilments read failed: ${got.status()}`)
    const { concurrencyToken, fulfilments } = await got.json()
    if (!fulfilments.some((f) => f.obligationId === ARRIVAL_DATE_OBLIGATION)) {
      throw new Error('no stored arrival date answer to overwrite')
    }
    const overwritten = fulfilments.map((f) =>
      f.obligationId === ARRIVAL_DATE_OBLIGATION ? { obligationId: f.obligationId, value: dateParts({ dayOffset: -8 }) } : f
    )
    const put = await page.request.put(`${BACKEND}/notifications/${id}`, {
      data: { notification: { referenceNumber: id, concurrencyToken, fulfilments: overwritten } }
    })
    if (!put.ok()) throw new Error(`backend overwrite failed: ${put.status()}`)
    await openOverview(page, id)
    const status = page.getByRole('link', { name: 'Arrival details', exact: true }).locator('xpath=ancestor::li[1]')
    return { arrivalTask: (await status.count()) ? (await status.innerText()).replace(/\s+/g, ' ').trim() : null }
  })
})

journey('A10 brand-new draft review, then the confirmation address opened early', ['a-review-draft-empty', 'a-confirmation-early'], async (S, page) => {
  const id = await createAnimals(page)
  await S.shot('a-review-draft-empty', async () => {
    await openReview(page, id)
    await press(page, button(page, 'Continue'))
    return { errorSummary: await errorSummaryText(page) }
  })
  await S.shot('a-confirmation-early', async () => {
    await go(page, animalsUrl(id, 'confirmation'))
    return landedOn(page)
  })
})

journey(
  'A11 commodity and import reason pages',
  [
    'a-commodities-help-open', 'a-commodities-error-after-search', 'a-consignment-details-soft-save', 'a-import-reason-transit-reveal',
    'a-import-reason-transhipment-reveal', 'a-import-reason-after-switch', 'a-overview-reason-only', 'a-review-after-switch-to-cats'
  ],
  async (S, page) => {
    const id = await createAnimals(page)
    await H.origin(page, { country: 'France' })
    await go(page, animalsUrl(id, 'commodities'))
    await S.shot('a-commodities-help-open', async () => {
      await page.getByText('Help with commodity codes', { exact: true }).click()
    })
    await S.shot('a-commodities-error-after-search', async () => {
      await go(page, animalsUrl(id, 'commodities'))
      await page.getByLabel('Search for a commodity').fill('cow')
      await press(page, button(page, 'Search'))
      await press(page, saveContinue(page))
      return { errorSummary: await errorSummaryText(page) }
    })
    await go(page, animalsUrl(id, 'commodities'))
    await H.commodities(page, { species: ['Bos taurus'] })
    await S.shot('a-consignment-details-soft-save', async () => {
      await go(page, animalsUrl(id, 'consignment-details'))
      await press(page, softSave(page))
      return { ...landedOn(page), errorSummary: await errorSummaryText(page) }
    })
    await go(page, animalsUrl(id, 'import-reason'))
    await S.shot('a-import-reason-transit-reveal', async () => {
      await page.getByRole('radio', { name: 'Transit', exact: true }).check()
    })
    await S.shot('a-import-reason-transhipment-reveal', async () => {
      await page.getByRole('radio', { name: 'Transhipment or onward travel', exact: true }).check()
    })
    await S.shot('a-import-reason-after-switch', async () => {
      await go(page, animalsUrl(id, 'import-reason'))
      await page.getByRole('radio', { name: 'Internal market', exact: true }).check()
      await page.getByRole('radio', { name: 'Breeding', exact: true }).check()
      await press(page, saveContinue(page))
      await go(page, animalsUrl(id, 'import-reason'))
      await page.getByRole('radio', { name: 'Transit', exact: true }).check()
      await press(page, softSave(page))
      await go(page, animalsUrl(id, 'import-reason'))
      await page.getByRole('radio', { name: 'Internal market', exact: true }).check()
      const checked = await page.getByRole('radio', { checked: true }).evaluateAll((els) =>
        els.map((e) => (document.querySelector(`label[for="${e.id}"]`) || {}).textContent?.trim())
      )
      return { checkedRadios: checked }
    })
    await S.shot('a-overview-reason-only', async () => {
      await page.getByRole('radio', { name: 'Breeding', exact: true }).check()
      await press(page, saveContinue(page))
      await openOverview(page, id)
    })
    await S.shot('a-review-after-switch-to-cats', async () => {
      const A = ROAD()
      await go(page, animalsUrl(id, 'consignment-details'))
      if (slugOf(page) === 'consignment-details') await H['consignment-details'](page, A)
      await go(page, animalsUrl(id, 'commodities/identification'))
      if (slugOf(page) === 'commodities/identification') await H['commodities/identification'](page, A)
      await go(page, animalsUrl(id, 'additional-details'))
      if (slugOf(page) === 'additional-details') await H['additional-details'](page, A)
      await go(page, animalsUrl(id, 'commodities'))
      const clear = page.getByRole('button', { name: 'Clear all' })
      if (await clear.isVisible().catch(() => false)) await clear.click()
      else {
        await page.getByLabel('Search for a commodity').fill('Bos taurus')
        await press(page, button(page, 'Search'))
        await page.getByRole('checkbox', { name: 'Bos taurus' }).first().uncheck()
      }
      await tickSpecies(page, ['Felis catus'])
      await press(page, saveContinue(page))
      await openReview(page, id)
      const text = await page.locator('main').innerText()
      return { mentionsUnweaned: /unweaned/i.test(text) }
    })
  }
)

journey(
  'A12 two species: horse reason reveals and commodity details errors',
  ['a-import-reason-tempadmission-reveal', 'a-reason-soft-save-bad-exit-date', 'a-consignment-details-two-species-errors', 'a-review-two-species-incomplete'],
  async (S, page) => {
    const id = await createAnimals(page)
    await H.origin(page, { country: 'France' })
    await go(page, animalsUrl(id, 'commodities'))
    await H.commodities(page, { species: ['Bos taurus', 'Equus caballus'] })
    await go(page, animalsUrl(id, 'import-reason'))
    await S.shot('a-import-reason-tempadmission-reveal', async () => {
      await page.getByRole('radio', { name: 'Temporary admission horses', exact: true }).check()
    })
    await S.shot('a-reason-soft-save-bad-exit-date', async () => {
      await page.locator('#temporaryAdmissionExitDate').fill('31/2/2026')
      await press(page, softSave(page))
      return { errorSummary: await errorSummaryText(page) }
    })
    await go(page, animalsUrl(id, 'import-reason'))
    await H['import-reason'](page, { reason: { reason: 'Internal market', purpose: 'Breeding' } })
    await S.shot('a-consignment-details-two-species-errors', async () => {
      await go(page, animalsUrl(id, 'consignment-details'))
      await press(page, saveContinue(page))
      return { errorSummary: await errorSummaryText(page) }
    })
    await S.shot('a-review-two-species-incomplete', async () => {
      await go(page, animalsUrl(id, 'consignment-details'))
      await H['consignment-details'](page, { animals: '1', packages: '1' })
      await openReview(page, id)
      await press(page, button(page, 'Continue'))
      return {
        errorSummary: await errorSummaryText(page),
        deviation:
          'cards.json says Equus caballus given no number; Commodity details refuses blank numbers, so both species were given 1 animal and 1 package and neither was given an identifier'
      }
    })
  }
)

journey(
  'A13 arrival details page states',
  ['a-arrival-empty', 'a-arrival-port-search', 'a-arrival-port-search--chosen', 'a-arrival-blank-submit', 'a-arrival-soft-save', 'a-arrival-soft-save--reopened', 'a-arrival-soft-save-impossible-date'],
  async (S, page) => {
    const id = await createAnimals(page)
    await H.origin(page, { country: 'France' })
    await go(page, animalsUrl(id, 'commodities'))
    await H.commodities(page, { species: ['Bos taurus'] })
    await go(page, animalsUrl(id, 'port-of-entry'))
    await S.shot('a-arrival-empty')
    await S.shot('a-arrival-port-search', async () => {
      const field = page.getByLabel('Port of entry', { exact: true })
      await field.click()
      await field.pressSequentially('Dover', { delay: 60 })
      await page.getByRole('option').first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {})
    })
    await S.shot('a-arrival-port-search--chosen', async () => {
      await page.getByRole('option').filter({ hasText: /Dover/ }).first().click()
      return { portBoxValue: await page.getByLabel('Port of entry', { exact: true }).inputValue() }
    })
    await S.shot('a-arrival-blank-submit', async () => {
      await go(page, animalsUrl(id, 'port-of-entry'))
      await press(page, saveContinue(page))
      return { errorSummary: await errorSummaryText(page) }
    })
    await S.shot('a-arrival-soft-save', async () => {
      await go(page, animalsUrl(id, 'port-of-entry'))
      await page.locator('input[name="arrivalDateAtPort"]').fill(dateText({ monthOffset: 1 }))
      await S_.pickFromCombo(page, page.getByLabel('Port of entry', { exact: true }), 'Aberdeen', /^Aberdeen Harbour/)
      await press(page, softSave(page))
      return { ...landedOn(page), errorSummary: await errorSummaryText(page) }
    })
    await S.shot('a-arrival-soft-save--reopened', async () => {
      await go(page, animalsUrl(id, 'port-of-entry'))
      return {
        savedDate: await page.locator('input[name="arrivalDateAtPort"]').inputValue(),
        savedPort: await page.getByLabel('Port of entry', { exact: true }).inputValue().catch(() => null)
      }
    })
    await S.shot('a-arrival-soft-save-impossible-date', async () => {
      await go(page, animalsUrl(id, 'port-of-entry'))
      await page.locator('input[name="arrivalDateAtPort"]').fill('31/2/2027')
      await press(page, softSave(page))
      return { errorSummary: await errorSummaryText(page) }
    })
  }
)

journey(
  'A14 arrival with only a means of transport, then transit countries',
  ['a-arrival-means-only', 'a-transit-empty', 'a-transit-search-subdivision', 'a-transit-air-redirect'],
  async (S, page) => {
    const id = await createAnimals(page)
    const A = ROAD()
    A.transit = []
    A.document = null
    await walkRun(page, A, { stop: (slug) => slug === 'port-of-entry' })
    if (slugOf(page) !== 'port-of-entry') await go(page, animalsUrl(id, 'port-of-entry'))
    await S.shot('a-arrival-means-only', async () => {
      await S_.selectByText(page.getByLabel('Means of transport to the port of entry', { exact: true }), /^Air/)
      await press(page, saveContinue(page))
      return { ...landedOn(page), errorSummary: await errorSummaryText(page) }
    })
    await S.shot('a-transit-empty', async () => {
      await go(page, animalsUrl(id, 'port-of-entry'))
      await S_.selectByText(page.getByLabel('Means of transport to the port of entry', { exact: true }), /^Road/)
      await press(page, saveContinue(page))
      if (slugOf(page) !== 'transit-countries') {
        const reached = landedOn(page).landedOn
        await go(page, animalsUrl(id, 'transit-countries'))
        return { reachedBy: `route (Save and continue landed on ${reached})` }
      }
      return { reachedBy: 'Save and continue from arrival details' }
    })
    await S.shot('a-transit-search-subdivision', async () => {
      const field = page.locator('#transitedCountry')
      await field.click()
      await field.pressSequentially('Can', { delay: 60 })
      await page.getByRole('option').first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {})
    })
    await S.shot('a-transit-air-redirect', async () => {
      await go(page, animalsUrl(id, 'port-of-entry'))
      await S_.selectByText(page.getByLabel('Means of transport to the port of entry', { exact: true }), /^Air/)
      await press(page, saveContinue(page))
      await go(page, animalsUrl(id, 'transit-countries'))
      return landedOn(page)
    })
  }
)

journey('A15 cattle by road with Transit as the reason', ['a-review-transit-reason'], async (S, page) => {
  const id = await createAnimals(page)
  const A = ROAD()
  A.reason = { reason: 'Transit', selects: { '#transitPortOfExit': /Dover/, '#transitDestinationCountry': /^Ireland/ } }
  await completeByRoute(page, id, A)
  await S.shot('a-review-transit-reason', async () => {
    await openReview(page, id)
  })
})

journey(
  'A16 pages saved after being opened from the overview',
  ['a-reason-from-overview-saved', 'a-arrival-from-overview-saved', 'a-addresses-from-overview-saved'],
  async (S, page) => {
    const id = await createAnimals(page)
    const A = ROAD()
    await completeByRoute(page, id, A, { only: ['origin', 'commodities', 'import-reason', 'consignment-details'] })
    await go(page, animalsUrl(id, 'import-reason'))
    await S.shot('a-reason-from-overview-saved', async () => {
      await openTask(page, id, ['Main import reason', 'Main reason for import'], 'import-reason')
      await H['import-reason'](page, A)
      return landedOn(page)
    })
    await S.shot('a-arrival-from-overview-saved', async () => {
      await openTask(page, id, ['Arrival details'], 'port-of-entry')
      await H['port-of-entry'](page, A)
      return landedOn(page)
    })
    await S.shot('a-addresses-from-overview-saved', async () => {
      await openTask(page, id, ['Roles and addresses'], 'addresses')
      await H.addresses(page, { ...A, cph: false })
      return landedOn(page)
    })
  }
)

test('A17 hyphenated document reference', async ({ page }) => {
  const fs = require('fs')
  const path = require('path')
  const result = { side: SIDE, reference: 'VHC-2026-0001' }
  try {
    const id = await createAnimals(page)
    await go(page, animalsUrl(id, 'accompanying-documents'))
    await page.getByLabel('Document reference').fill(result.reference)
    await page.getByLabel('Document type').selectOption('ITAHC')
    await page.locator('input[name="accompanyingDocumentDateOfIssue"]').fill('03/01/2026')
    await page.locator('input[type="file"]').setInputFiles(L.PDF)
    await page.getByText('safe-file-1kb.pdf').first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {})
    await page.waitForTimeout(1500)
    const response = page.waitForResponse((r) => r.request().method() === 'POST' && /accompanying-documents/.test(r.url()))
    await button(page, 'Save and add another').click()
    const r = await response
    result.postStatus = r.status()
    result.postBodyStart = (await r.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)
    await page.waitForLoadState('load').catch(() => {})
    await page.waitForTimeout(1500)
    result.pageText = (await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 400)
    result.notificationId = id
  } catch (error) {
    result.error = String(error.message).split('\n')[0]
  }
  fs.writeFileSync(path.join(L.OUT_DIR, 'hyphen-check.json'), JSON.stringify(result, null, 2) + '\n')
})

// ---------------------------------------------------------------- plants

journey(
  'P01 plants first run left as blank as allowed',
  ['p-origin-empty', 'p-arrival-details-empty', 'p-run-after-contact-incomplete', 'p-cya-continue-incomplete'],
  async (S, page) => {
    await ensureAddress(page, PLANTS_ADDRESS)
    const id = await createPlants(page)
    const A = PA()
    A.minimal = true
    const { slug } = await walkPlantsRun(page, A, {
      onLand: async (slug, prev, first) => {
        if (first && slug === 'origin') await S.shot('p-origin-empty')
        if (first && slug === 'arrival-details') await S.shot('p-arrival-details-empty')
      }
    })
    await S.shot('p-run-after-contact-incomplete', null, { runEndedOn: slug === '' ? 'overview' : slug })
    await S.shot('p-cya-continue-incomplete', async () => {
      if (slugOf(page) !== 'notification-view') await openPlantsReview(page, id)
      await press(page, button(page, 'Continue'))
      return { ...landedOn(page), errorSummary: await errorSummaryText(page) }
    })
  }
)

journey('P02 potatoes: place of landing search', ['p-arrival-port-search'], async (S, page) => {
  const id = await createPlants(page)
  await completePlantsByRoute(page, id, POTATOES(), ['commodity-type', 'commodities/details', 'commodities', 'origin'])
  if (slugOf(page) !== 'arrival-details') await go(page, plantsUrl(id, 'arrival-details'))
  await S.shot(
    'p-arrival-port-search',
    async () => {
      const field = page.locator('#proposedPlaceOfLanding')
      await field.click()
      await field.pressSequentially('Dover', { delay: 60 })
      await page.getByRole('option').first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {})
    },
    { deviation: 'Place of landing is only asked for potatoes, so this shot is on a ware potatoes draft, not plants for planting' }
  )
})

journey(
  'P03 plants draft: overview, early confirmation, arrival states',
  [
    'p-overview-new', 'p-confirmation-early', 'p-arrival-soft-save', 'p-arrival-soft-save-bad-date', 'p-arrival-from-overview-saved'
  ],
  async (S, page) => {
    const id = await createPlants(page)
    await S.shot('p-overview-new', async () => {
      await go(page, plantsUrl(id))
    })
    await S.shot('p-confirmation-early', async () => {
      await go(page, plantsUrl(id, 'confirmation'))
      return landedOn(page)
    })
    const A = PA()
    await completePlantsByRoute(page, id, A, ['commodity-type', 'commodities/details', 'commodities', 'origin', 'arrival-status'])
    await S.shot('p-arrival-soft-save', async () => {
      await go(page, plantsUrl(id, 'arrival-details'))
      await press(page, softSave(page))
      return { ...landedOn(page), errorSummary: await errorSummaryText(page) }
    })
    await S.shot('p-arrival-soft-save-bad-date', async () => {
      await go(page, plantsUrl(id, 'arrival-details'))
      await page.locator('#arrivalDate').fill('31/2/2027')
      await press(page, softSave(page))
      return { errorSummary: await errorSummaryText(page) }
    })
    await S.shot('p-arrival-from-overview-saved', async () => {
      await go(page, plantsUrl(id))
      const link = page.getByRole('link', { name: /arrival/i }).first()
      await press(page, link)
      for (let i = 0; i < 3; i += 1) {
        const slug = slugOf(page)
        if (slug === 'arrival-status') await P['arrival-status'](page, A)
        else if (slug === 'arrival-details') {
          await P['arrival-details'](page, A)
          break
        } else break
      }
      return landedOn(page)
    })
  }
)

journey(
  'P04 plants for planting, complete: review, declaration, submit, view, amend',
  ['p-cya-draft-complete', 'p-declaration', 'p-view-submitted', 'p-overview-amend', 'p-arrival-amend', 'p-consignor-amend', 'p-cya-amend', 'p-cya-amend--after-continue'],
  async (S, page) => {
    await ensureAddress(page, PLANTS_ADDRESS)
    const id = await createPlants(page)
    const A = PA()
    await completePlantsByRoute(page, id, A)
    shared.plantsId = id
    await S.shot('p-cya-draft-complete', async () => {
      await openPlantsReview(page, id)
    })
    await S.shot('p-declaration', async () => {
      await press(page, button(page, 'Continue'))
    })
    await page.getByRole('checkbox').first().check()
    await press(page, button(page, 'Continue'))
    await page.getByRole('heading', { level: 1 }).first().waitFor(settle)
    await S.shot('p-view-submitted', async () => {
      await go(page, plantsUrl(id, 'notification-view'))
    })
    await S.shot('p-overview-amend', async () => {
      const viewButton = button(page, 'Amend this notification')
      if (await viewButton.count()) {
        await press(page, viewButton)
        return { startedFrom: 'the view page' }
      }
      await go(page, `${PLANTS}/high-risk-plants?referenceNumber=${id}`)
      const card = page.locator('.govuk-summary-card').filter({ hasText: id })
      await press(page, card.getByRole('button', { name: /Amend/ }).or(card.getByRole('link', { name: /Amend/ })).first())
      return { startedFrom: 'the dashboard row (no Amend button on the view page on this branch)' }
    })
    await S.shot('p-arrival-amend', async () => {
      await go(page, plantsUrl(id))
      const link = page.getByRole('link', { name: /arrival/i }).first()
      await press(page, link)
      if (slugOf(page) === 'arrival-status') await press(page, saveContinue(page).or(page.getByRole('link', { name: /Cancel/ })).first())
    })
    await S.shot('p-consignor-amend', async () => {
      await go(page, plantsUrl(id))
      const link = page.getByRole('link', { name: /consignor/i }).first()
      if (await link.count()) await press(page, link)
      else await go(page, plantsUrl(id, 'consignors/select'))
    })
    await S.shot('p-cya-amend', async () => {
      await go(page, plantsUrl(id, 'notification-view'))
    })
    await S.shot('p-cya-amend--after-continue', async () => {
      await go(page, plantsUrl(id, 'arrival-details'))
      await page.locator('#arrivalDate').fill('')
      await press(page, softSave(page))
      await go(page, plantsUrl(id, 'notification-view'))
      await press(page, button(page, 'Continue'))
      return { ...landedOn(page), errorSummary: await errorSummaryText(page) }
    })
  }
)

// ---------------------------------------------------------------- INS

journey(
  'I01 INS home and address book',
  ['i-home', 'i-address-book', 'i-address-book-add-error', 'i-address-book-add-country'],
  async (S, page) => {
    await go(page, `${INS}/`)
    await S.shot('i-home', async () => {
      await page.getByRole('heading', { level: 1 }).first().waitFor(settle)
    })
    await S.shot('i-address-book', async () => {
      await go(page, `${INS}/address-book`)
      await h1(page, 'Address book').waitFor(settle)
    })
    await S.shot('i-address-book-add-error', async () => {
      await press(page, page.getByRole('link', { name: 'Add a new address' }).or(page.getByRole('button', { name: 'Add a new address' })).first())
      await h1(page, 'Add address details').waitFor(settle)
      await press(page, saveContinue(page))
      await page.getByRole('heading', { level: 2, name: 'There is a problem' }).waitFor(settle)
    })
    await S.shot('i-address-book-add-country', async () => {
      await go(page, `${INS}/address-book/add`)
      await h1(page, 'Add address details').waitFor(settle)
    })
  }
)
