import { readFileSync } from 'node:fs'

const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(async () => {
  record.write()
})

// ---------------------------------------------------------------------------
// The review slice: check answers, declaration, confirmation, cancel amendment
// ---------------------------------------------------------------------------
//
// Every screen here sits behind the review gate. `flow/flow.js:81-86` puts
// notificationView, declaration and confirmation in one section gated on
// `scope.readyForCheckYourAnswers`, and `flow/section-status.js:11-15` defines
// that as: every one of the twelve task rows in `flow/task-rows.js` is
// FULFILLED, NA or OPTIONAL. `engine/write/submit.js:9-15` re-checks the same
// flag and refuses to finalise without it, so confirmation is only reachable
// from a genuinely complete notification. So this spec builds one, end to end.
//
// THE SHORTEST COMPLETE NOTIFICATION, AND WHY THESE ANSWERS
//
// Two answers decide how much of the journey is in scope. Both are chosen to
// put the conditional sections OUT of scope — other slices photograph those
// pages, and a longer journey here is only more to go wrong.
//
//   commodity = Fish (0301), species Salmo salar
//     Fish is the one commodity in services/commodities/stub.js that appears
//     on NONE of the gating allow-lists:
//       - CPH_COMMODITIES is ['Cow'], so `cph` (aggregates.js:18-26) stays out
//         of scope and the CPH row never appears on the addresses hub;
//       - UNWEANED_ANIMAL_COMMODITIES is ['Cow','Horse'], so
//         `containsUnweanedAnimals` (aggregates.js:46-54) stays out of scope
//         and the additional-details page asks one question instead of two;
//       - PERMANENT_ADDRESS_COMMODITIES is ['Cat','Dog'], and
//         `permanentAddress` (identifiers.js:200-208) is the only MANDATORY
//         per-animal identifier field — Cat or Dog would mean a nine-field
//         address per animal;
//       - PACKAGE_COUNT_COMMODITIES omits Fish, so the consignment-details
//         page renders one input rather than two (fields.js:12-14).
//     Fish is also on none of the four typed-identifier lists, so
//     `notInUnionOf` (identifiers.js:174-199) puts the two free-text
//     identifiers in scope and one line of text satisfies the unit record.
//
//   reason for import = Re-entry (`reEntry`)
//     obligations/sections/import-reason.js gates four obligations on this one
//     answer: purposeInInternalMarket on 'internalMarket' (lines 43-56),
//     destinationCountry on transit/transhipment (66-84), portOfExit on
//     transit/temporaryAdmissionHorses (86-102), exitDate on
//     temporaryAdmissionHorses (103-117). 'reEntry' is in none of them, so the
//     whole exitDetails task row (`flow/task-rows.js:35-39`, conditional) goes
//     NA and the import-purpose page is skipped by the opening run.
//
// A third answer does the same for the movement section:
//   means of transport = Airplane
//     `transitedCountries` applies only for RAILWAY or ROAD_VEHICLE
//     (transport.js:92-104), so the conditional transitCountries row goes NA.
//
// Everything else below is answered because the obligation model marks it
// mandatory with no gate at all:
//   countryOfOrigin, regionOfOriginCodeRequirement  origin.js:16-25
//   reasonForImport                                 import-reason.js:34-38
//   animalsCertifiedFor                             misc.js:26-30
//   commodityLines (>= 1) + commoditySelection,
//     commodityType, speciesSelection,
//     numberOfAnimalsQuantity                       lines.js:18-68
//   animalIdentifiers: one unit record per animal,
//     each carrying at least one identifier         identifiers.js:61-105
//   portOfEntry, arrivalDateAtPort                  arrival.js:5-15
//   meansOfTransport, transportIdentification,
//     transportDocumentReference, transporterType   transport.js:27-85
//   commercialTransporter (because Commercial)      transport.js:35-48
//   placeOfOrigin, consignor, consignee, importer,
//     placeOfDestination                            parties.js:6-35
//   contactAddress                                  misc.js:5-9
//
// Answered deliberately NOT at all:
//   internalReferenceNumber   misc.js:15-19, status 'optional'
//   regionOfOriginCode        origin.js:30-38, optional when the requirement
//                             question is answered 'no' (the retain-value gate)
//   documents                 documents.js:19-28 is a group with neither
//                             `minEntries` nor `anyOfIds`, so
//                             bridge/status/classification/index.js:8-9 reads
//                             it as not required and an untouched collection
//                             rolls up OPTIONAL, which the readiness rule
//                             accepts.
//
// TRANSPORTER: Commercial, not Private. `transporters-select` is a radio list
// of fixed records (services/commercial-transporters/records.js) — one click.
// Private is a nine-field address form (private-transporter-details).
//
// WHAT THIS SPEC DOES NOT PHOTOGRAPH
// Only the four screens below. Every other page it drives through belongs to
// another slice, and is answered here purely to open the review gate.

const SCREENS = {
  checkAnswers: 'check-answers',
  declaration: 'declaration',
  confirmation: 'confirmation',
  cancelAmend: 'cancel-amend'
}

// Commodity checkbox value: search/view-model/commodity-groups.js builds
// `${commodity}|${speciesValue}`, and Salmo salar is '801204' in
// services/commodities/stub.js. Chosen by VALUE, not by the visible label,
// because the species list comes from the reference service in one run mode
// and from that fixture in another.
const FISH_SALMON = 'Fish|801204'

// Port of entry, by code. The visible option is "Aberdeen Harbour (GB ABD)";
// the code is the half that survives a reference-data refresh.
const PORT_CODE = 'GB ABD'
const PORT_OPTION = 'Aberdeen Harbour (GB ABD)'

const PARTY_SLUGS = [
  'place-of-origin/select',
  'consignors/select',
  'consignees/select',
  'importers/select',
  'destinations/select'
]

const SAVE_AND_CONTINUE = 'Save and continue'

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** A retrying positive assertion that the journey landed on exactly this path. */
const atPath = (path) => new RegExp(`${escapeRegExp(path)}$`)

const journeyIdFrom = (url) => {
  const found = /\/notifications\/([^/?#]+)/.exec(url)?.[1]
  if (!found) {
    throw new Error(`No journey id in URL: ${url}`)
  }
  return found
}

// ---------------------------------------------------------------------------
// The arrival date moves with the wall clock, so it is derived, never typed
// ---------------------------------------------------------------------------
//
// port-of-entry/arrival-window.js:20-30 builds the valid window from
// `new Date()`: seven days before today in Europe/London to six months after
// it, inclusive. A literal would pass today and fail silently in a week. Today
// plus seven days sits well inside both ends. The format is `d/m/yyyy` with no
// zero padding — `lib/validate/calendar.js:102-103` formats it that way and
// `shared/kit.js:150-153` only parses that shape.
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

const londonToday = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())
  const part = (type) => Number(parts.find((each) => each.type === type).value)
  return Date.UTC(part('year'), part('month') - 1, part('day'))
}

const arrivalDateText = () => {
  const date = new Date(londonToday() + 7 * MILLISECONDS_PER_DAY)
  return `${date.getUTCDate()}/${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`
}

// ---------------------------------------------------------------------------
// Values minted per run, masked in the live DOM immediately before every shot
// ---------------------------------------------------------------------------
//
// THREE of them land on the four screens in this slice, and this is the corpus's
// worst place for it: without masking, every re-capture of these pages would
// read as moved when nothing had changed.
//
// 1. THE NOTIFICATION REFERENCE. In stub mode the journey id IS the reference:
//    services/persistence/records/stub/lifecycle/create.js:12 mints it with
//    reference-number.js:12 as `GBN-AG-YY-` plus six random Crockford base-32
//    characters. It is printed in the journey strip on check answers, on the
//    declaration and on cancel amendment (shared/layout.njk:68 renders
//    journeyStrip.reference, which shared/kit.js:53-58 sets to the journey id),
//    and in the confirmation panel (confirmation/controller.js:33 passes it as
//    referenceNumber, confirmation/template.njk:6 prints it in a <strong>).
//    Replaced in TEXT NODES ONLY — hrefs and form actions keep the real id, so
//    a click after a mask still goes where it should.
//
// 2. THE DATE OF DECLARATION. declaration/controller.js:29-34 and
//    confirmation/controller.js:19-24 both format one, and both templates
//    print it after the same label. Today's date is as volatile as a reference
//    across a re-capture on another day, so the whole paragraph is replaced.
//
// 3. THE COPY IDEMPOTENCY KEY. check-answers/controller.js:76-79 mints a
//    randomUUID for the "Copy" form, which only renders once the notification
//    is SUBMITTED — that is, on `check-answers-submitted`. It is a hidden
//    input, invisible in the screenshot but present in the rendered HTML the
//    comparison reads.
//
// NOT masked, deliberately: the `crumb` CSRF token. It is a hidden input on
// every one of this application's 31 screens, not just these four, so masking
// it here alone would make this slice differ from its neighbours for no gain —
// it is invisible in every screenshot.
const MASKED_REFERENCE = 'GBN-AG-00-AAAAAA'
const MINTED_REFERENCE = String.raw`GBN-[A-Z]{2}-\d{2}-[0-9A-Z]{6}`
const DECLARATION_DATE_PREFIX = 'Date of declaration:'
const MASKED_DECLARATION_DATE = '1 January 2000'
const MASKED_IDEMPOTENCY_KEY = '00000000-0000-4000-8000-000000000000'

const maskGeneratedValues = async (page, journeyId) => {
  await page.evaluate(
    ({
      patterns,
      maskedReference,
      datePrefix,
      maskedDate,
      maskedIdempotencyKey
    }) => {
      const expression = new RegExp(patterns.join('|'), 'g')
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
      )
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const masked = node.nodeValue.replace(expression, maskedReference)
        if (masked !== node.nodeValue) {
          node.nodeValue = masked
        }
      }
      for (const paragraph of document.querySelectorAll('p.govuk-body')) {
        if (paragraph.textContent.trim().startsWith(datePrefix)) {
          paragraph.textContent = `${datePrefix} ${maskedDate}`
        }
      }
      for (const field of document.querySelectorAll(
        'input[name="idempotencyKey"]'
      )) {
        field.setAttribute('value', maskedIdempotencyKey)
      }
    },
    {
      patterns: [MINTED_REFERENCE, escapeRegExp(journeyId)],
      maskedReference: MASKED_REFERENCE,
      datePrefix: DECLARATION_DATE_PREFIX,
      maskedDate: MASKED_DECLARATION_DATE,
      maskedIdempotencyKey: MASKED_IDEMPOTENCY_KEY
    }
  )
}

// ---------------------------------------------------------------------------
// One test, from the dashboard to the amendment
// ---------------------------------------------------------------------------
//
// Playwright's `page` fixture is test-scoped and this application keeps the
// journey in the session, so a second test() would start from an empty session
// and an unstarted notification. Serial mode does not change that. Everything
// below therefore runs as one walk.
test('the review slice, from a complete notification to its amendment', async ({
  page
}) => {
  // Stub mode signs the session in transparently on the first request
  // (auth/stub-sign-in.js registers /auth/sign-in as well as its own path), so
  // there is no sign-in dance — landing on the dashboard is the proof.
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Import notification service' })
  ).toBeVisible()

  await page.getByRole('button', { name: 'Start a new notification' }).click()
  await expect(page).toHaveURL(/\/notifications\/[^\/]+\/origin$/)
  const journeyId = journeyIdFrom(page.url())

  // --- origin ------------------------------------------------------------
  // Selected by ISO code rather than by the visible name: the origin list is
  // reference-service data in one run mode and a fixture in another.
  await page.getByLabel('Country of origin').selectOption('FR')
  // 'No' leaves regionOfOriginCode in scope but OPTIONAL (origin.js:30-38).
  await page.getByRole('radio', { name: 'No', exact: true }).check()
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await expect(page).toHaveURL(atPath(`/notifications/${journeyId}/commodities`))

  // --- check answers BEFORE the gate passes ------------------------------
  // The review SECTION gate blocks the hub's row and blocks submit, but the
  // GET on /notification-view is a plain route (check-answers/controller.js:94)
  // with no gate of its own, so the page renders with its rows reading "Not
  // provided". That is a state of this screen worth having: it is what a
  // trader sees who followed a Change link back out of a half-answered
  // journey, and the comparison cannot see it from the complete shot.
  await page.goto(`/notifications/${journeyId}/notification-view`)
  await expect(page).toHaveURL(
    atPath(`/notifications/${journeyId}/notification-view`)
  )
  await expect(
    page.getByRole('heading', { level: 1, name: 'Check your answers' })
  ).toBeVisible()
  await maskGeneratedValues(page, journeyId)
  await record.record(page, `${SCREENS.checkAnswers}-incomplete`)

  // Back into the opening run. Only the hub completes the run
  // (flow/run-state.js:12-18), and this walk does not reach the hub until the
  // run's last step, so the run resumes from here unchanged.
  await page.goto(`/notifications/${journeyId}/commodities`)
  await expect(
    page.getByRole('heading', { level: 1, name: 'What are you importing?' })
  ).toBeVisible()

  // --- commodities -------------------------------------------------------
  await page.locator(`input[name="species"][value="${FISH_SALMON}"]`).check()
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await expect(page).toHaveURL(
    atPath(`/notifications/${journeyId}/consignment-details`)
  )

  // --- consignment details -----------------------------------------------
  // One animal. `unitRecord.requires.recordCountEquals` (identifiers.js:98-101)
  // makes the identification row demand exactly one unit record per animal, so
  // a larger number here is a larger form later.
  await page.locator('#numberOfAnimalsQuantity-0').fill('1')
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await expect(page).toHaveURL(
    atPath(`/notifications/${journeyId}/import-reason`)
  )

  // --- reason for import --------------------------------------------------
  await page.locator('input[name="reasonForImport"][value="reEntry"]').check()
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  // The opening run's next step is import purpose, whose gate fails because
  // purposeInInternalMarket is out of scope for 'reEntry', so the run skips it
  // (flow/run.js:41-53) and lands on identification. Landing here is the
  // evidence that the reason answer did what it was chosen to do.
  await expect(page).toHaveURL(
    atPath(`/notifications/${journeyId}/commodities/identification`)
  )

  // --- animal identification ----------------------------------------------
  // Fish has no typed identifier, so the card offers the two free-text fields.
  // `unitRecord.requires.anyOfIds` needs one of the six, and one is enough.
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Animal identification details'
    })
  ).toBeVisible()
  await page
    .locator('#animalIdentifierIdentificationDetails-0')
    .fill('Farm batch tag SAL-0001')
  // "Save and finish" appends the filled card and leaves, in one post
  // (animal-identification.controller.js:96-118 appends whatever the forms
  // hold before it looks at the action). The page also carries a
  // visually-hidden, aria-hidden duplicate of this button as the first submit
  // in the form; a role locator does not see aria-hidden elements, and .last()
  // keeps the visible one either way.
  await page.getByRole('button', { name: 'Save and finish' }).last().click()
  await expect(page).toHaveURL(
    atPath(`/notifications/${journeyId}/additional-details`)
  )

  // --- additional animal details ------------------------------------------
  // One radio group, because containsUnweanedAnimals is out of scope for Fish.
  // The first option is picked by position: the list is reference data
  // (services/certification-purposes) and no particular value is required.
  await expect(
    page.getByRole('heading', { level: 1, name: 'Additional animal details' })
  ).toBeVisible()
  await page.locator('input[name="animalsCertifiedFor"]').first().check()
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  // Last step of the opening run, so this lands on the hub and completes it.
  await expect(page).toHaveURL(atPath(`/notifications/${journeyId}`))
  await expect(
    page.getByRole('heading', { level: 1, name: 'Overview' })
  ).toBeVisible()

  // --- arrival details ----------------------------------------------------
  await page.goto(`/notifications/${journeyId}/port-of-entry`)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Arrival details' })
  ).toBeVisible()
  await page.locator('#arrivalDateAtPort').fill(arrivalDateText())
  // The MoJ date picker opens only from its "Choose date" button, but Escape
  // costs nothing and closes it if anything did.
  await page.keyboard.press('Escape')

  // Port of entry is an accessible-autocomplete enhancing a native <select>
  // (common/components/accessible-autocomplete). With JavaScript the visible
  // combobox keeps the select's id and the select is hidden and renamed with a
  // "-select" suffix; the SELECT is what posts the value, and its results panel
  // overlays the buttons below it and swallows a click while it is open. So:
  // pick from the panel, dismiss it, then assert the underlying select holds a
  // value before touching anything else on the page.
  const portField = page.getByLabel('Port of entry', { exact: true })
  if ((await portField.evaluate((element) => element.tagName)) === 'SELECT') {
    await portField.selectOption(PORT_CODE)
  } else {
    await portField.click()
    await portField.fill(PORT_OPTION)
    await page.getByRole('option', { name: PORT_OPTION, exact: true }).click()
    await page.keyboard.press('Escape')
  }
  await expect(
    page.locator('select#portOfEntry, select#portOfEntry-select')
  ).toHaveValue(PORT_CODE)

  await page
    .locator('input[name="meansOfTransport"][value="AIRPLANE"]')
    .check()
  await page.locator('#transportIdentification').fill('BA1234')
  await page.locator('#transportDocumentReference').fill('AWB-000-00000001')
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  // Transit countries is the next page of the transport section and its gate
  // fails for AIRPLANE, so the section skips it (flow/navigation.js:28-36).
  await expect(page).toHaveURL(
    atPath(`/notifications/${journeyId}/transporters`)
  )

  // --- transporter ---------------------------------------------------------
  await page
    .locator('input[name="transporterType"][value="Commercial"]')
    .check()
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await expect(page).toHaveURL(
    atPath(`/notifications/${journeyId}/transporters/select`)
  )
  await page.locator('input[name="commercialTransporter"]').first().check()
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await expect(page).toHaveURL(atPath(`/notifications/${journeyId}`))

  // --- the five consignment parties ---------------------------------------
  // Each picker is reached by its own URL rather than through the addresses
  // hub. An answered hub row still renders a link — "Change" sits in the same
  // actions cell as "Add" with the same classes (addresses/controller.js:32-46)
  // — so a loop driving off the hub's links has to name each row exactly, and
  // naming the page instead removes the question. Every picker posts back to
  // the hub (party-picker.controller.js:96), which is the landing assertion.
  for (const slug of PARTY_SLUGS) {
    await page.goto(`/notifications/${journeyId}/${slug}`)
    await expect(page).toHaveURL(atPath(`/notifications/${journeyId}/${slug}`))
    // The picker is server-rendered with no client JavaScript: the first page
    // of the address book is already on screen, so nothing is typed into the
    // search box — a live filter would hide the row it was told to pick.
    await page.locator('input[name="party"]').first().check()
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await expect(page).toHaveURL(
      atPath(`/notifications/${journeyId}/addresses`)
    )
  }

  // --- contact address -----------------------------------------------------
  // Contact picks from the same book but is deliberately not one of the five
  // (addresses/parties.js:59-66), so it has its own page and its own row.
  await page.goto(`/notifications/${journeyId}/consignment/contact/select`)
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Contact address for consignment'
    })
  ).toBeVisible()
  await page.locator('input[name="contactAddress"]').first().check()
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await expect(page).toHaveURL(atPath(`/notifications/${journeyId}`))

  // --- the gate ------------------------------------------------------------
  // The hub renders "Check and submit" as a link only when the review section's
  // gate passes, and as a "Cannot start yet" status otherwise
  // (hub/controller.js:76-92). The link being here is how this spec knows the
  // notification is complete; clicking it is how it reaches the screen.
  const checkAndSubmit = page.getByRole('link', { name: 'Check and submit' })
  await expect(checkAndSubmit).toBeVisible()
  await checkAndSubmit.click()
  await expect(page).toHaveURL(
    atPath(`/notifications/${journeyId}/notification-view`)
  )
  await expect(
    page.getByRole('heading', { level: 1, name: 'Check your answers' })
  ).toBeVisible()
  await maskGeneratedValues(page, journeyId)
  await record.record(page, SCREENS.checkAnswers)

  // --- declaration, empty --------------------------------------------------
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(
    atPath(`/notifications/${journeyId}/declaration`)
  )
  await expect(
    page.getByRole('heading', { level: 1, name: 'Declaration' })
  ).toBeVisible()
  await maskGeneratedValues(page, journeyId)
  await record.record(page, SCREENS.declaration)

  // --- declaration, submitted without confirming ---------------------------
  // The one validation this page has (declaration/controller.js:25-27), and the
  // only error state in this slice.
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(
    atPath(`/notifications/${journeyId}/declaration`)
  )
  await expect(
    page
      .locator('.govuk-error-summary')
      .getByRole('link', {
        name: 'Confirm that the information is true and correct before submitting'
      })
  ).toBeVisible()
  await maskGeneratedValues(page, journeyId)
  await record.record(page, `${SCREENS.declaration}-error`)

  // --- confirmation --------------------------------------------------------
  // The declaration is a CHECKBOX, not a radio (declaration/template.njk:28-40).
  await page
    .getByRole('checkbox', { name: /^I confirm that I have reviewed/ })
    .check()
  await page.getByRole('button', { name: 'Continue' }).click()
  // Reaching this URL is the proof the notification was accepted: a submit that
  // fails the readiness check redirects back to check answers instead
  // (declaration/controller.js:86-89).
  await expect(page).toHaveURL(
    atPath(`/notifications/${journeyId}/confirmation`)
  )
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Import notification submitted'
    })
  ).toBeVisible()
  await maskGeneratedValues(page, journeyId)
  await record.record(page, SCREENS.confirmation)

  // --- check answers, submitted -------------------------------------------
  // The same page rendered read-only once the journey is SUBMITTED
  // (check-answers/controller.js:74-92): the Change links go, and Copy and
  // Delete appear. The enumeration calls the submitted view a state of this
  // screen, and it is where the copy idempotency key is minted.
  await page.goto(`/notifications/${journeyId}/notification-view`)
  await expect(page).toHaveURL(
    atPath(`/notifications/${journeyId}/notification-view`)
  )
  await expect(
    page.getByRole('heading', { level: 1, name: 'Check your answers' })
  ).toBeVisible()
  await expect(
    page.locator('.app-journey-strip').getByText('Submitted', { exact: true })
  ).toBeVisible()
  await maskGeneratedValues(page, journeyId)
  await record.record(page, `${SCREENS.checkAnswers}-submitted`)

  // --- cancel amendment ----------------------------------------------------
  // The GET redirects away unless the journey is in AMEND
  // (cancel-amend/controller.js:41-45), AMEND comes only from records.amend on
  // a SUBMITTED journey (engine/journey.js:123-133), and SUBMITTED comes only
  // from a submit that passed the readiness check. So this screen is reachable
  // from nowhere except the state this spec is now holding, which is why it
  // lives in this slice rather than with the dashboard.
  //
  // Amend is a POST-only action on the dashboard row
  // (dashboard/view-model/row/actions.js:35-38), addressed by its form's action
  // rather than by the button's accessible name — that name carries the minted
  // reference, and this walk masks references in text nodes.
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Import notification service' })
  ).toBeVisible()
  const amendForm = page.locator(
    `form[action="/notifications/${journeyId}/amend"]`
  )
  await expect(amendForm).toHaveCount(1)
  await amendForm.getByRole('button').click()
  await expect(page).toHaveURL(atPath(`/notifications/${journeyId}`))

  await page.goto(`/notifications/${journeyId}/cancel-amend`)
  await expect(page).toHaveURL(
    atPath(`/notifications/${journeyId}/cancel-amend`)
  )
  await expect(
    page.getByRole('heading', { level: 1, name: 'Cancel this amendment?' })
  ).toBeVisible()
  await maskGeneratedValues(page, journeyId)
  await record.record(page, SCREENS.cancelAmend)
})
