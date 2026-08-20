import { readFileSync } from 'node:fs'

const { test, expect, recorder } = await import(
  JSON.parse(readFileSync(process.env.TIM_CAPTURE_CONTEXT, 'utf8')).support
)

test.describe.configure({ mode: 'serial' })

const record = recorder()

test.afterAll(async () => {
  record.write()
})

// A journey's reference is minted per run. In stub mode the record id IS the
// reference (services/persistence/records/stub/lifecycle/create.js:11 calls
// mintReferenceNumber), so it is the journey id in every URL, it is printed as
// the summary-card title on the dashboard, it is repeated in each row action's
// visually-hidden suffix, and it is printed in the journey strip on every
// journey page (shared/layout.njk:68 renders journeyStrip.reference, which
// shared/kit.js:55 sets to journey.journeyId).
//
// Six random Crockford characters on four screens is exactly the value that
// makes every re-capture look like it moved, so it is replaced in the live DOM
// with a fixed placeholder immediately before each shot. Only text nodes are
// touched — hrefs and form actions keep the real id, so a click after a mask
// still goes where it should.
//
// The "Date created" column is deliberately NOT masked. It is real rendered
// content that the comparison should see, and it only changes if two captures
// straddle midnight rather than on every run.
const MASKED_REFERENCE = 'GBN-AG-00-AAAAAA'
const MINTED_REFERENCE = String.raw`GBN-[A-Z]{2}-\d{2}-[0-9A-Z]{6}`

const maskMintedReference = async (page, journeyIds = []) => {
  await page.evaluate(
    ({ patterns, replacement }) => {
      const expression = new RegExp(patterns.join('|'), 'g')
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
      )
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const masked = node.nodeValue.replace(expression, replacement)
        if (masked !== node.nodeValue) {
          node.nodeValue = masked
        }
      }
    },
    {
      patterns: [
        MINTED_REFERENCE,
        ...journeyIds.map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      ],
      replacement: MASKED_REFERENCE
    }
  )
}

const journeyIdFrom = (url) => /\/notifications\/([^/?#]+)/.exec(url)?.[1]

// The whole slice runs as one test on purpose: the page fixture is
// test-scoped, and this service keeps the journey and the list of known
// journeys in session cookies, so a second test() would start from an empty
// dashboard with no journey to hang the hub or the delete page off.
test('the dashboard, the hub and the delete confirmation', async ({ page }) => {
  // In stub mode auth is still enforced; the cookie strategy bounces an
  // unauthenticated request to /auth/sign-in, which mints a local session and
  // redirects straight back (src/server/auth/stub-sign-in.js:69). So the
  // service root resolves to the dashboard in one navigation.
  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Start a new notification' })
  ).toBeVisible()

  // The page under its own name, and the same render named as the empty state.
  // Coverage attributes states to their page by prefix, so without the bare
  // name the screen reads as one nobody captured.
  await record.record(page, 'dashboard')
  await record.record(page, 'dashboard-empty')

  await page.getByRole('button', { name: 'Start a new notification' }).click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/origin$/)
  const journeyId = journeyIdFrom(page.url())
  expect(journeyId).toBeTruthy()

  // The origin page belongs to another slice and is not recorded here. It is
  // only passed through: creating the journey is what puts a row on the
  // dashboard and gives the hub and the delete page something to render.

  await page.goto(`/notifications/${journeyId}`)
  await expect(page).toHaveURL(new RegExp(`/notifications/${journeyId}$`))
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await maskMintedReference(page, [journeyId])
  await record.record(page, 'hub')

  // A brand new draft on the list: every column the row can carry is still
  // empty, which is the state the list has to cope with the moment somebody
  // starts a notification and walks away.
  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await maskMintedReference(page, [journeyId])
  await record.record(page, 'dashboard-new-draft')

  // Answering the origin page does two things worth a picture: it turns the
  // hub's first task row green and unlocks the rows behind it, and it puts a
  // value in the dashboard row's Origin column.
  await page.goto(`/notifications/${journeyId}/origin`)
  await expect(page).toHaveURL(/\/origin$/)
  // Selected by value, not by visible text: the country list comes from a
  // fixture in stub mode and from the reference service otherwise, and only
  // the code is common to both.
  await page.getByLabel('Country of origin').selectOption('FR')
  await page.getByRole('radio', { name: 'No', exact: true }).check()
  await page
    .getByRole('button', { name: 'Save and return to hub' })
    .click()

  await expect(page).toHaveURL(new RegExp(`/notifications/${journeyId}$`))
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await maskMintedReference(page, [journeyId])
  await record.record(page, 'hub-part-answered')

  // The populated list: the row's columns, the status tag and the row actions
  // a draft offers (Resume, Copy, Delete — dashboard/view-model/row/actions.js).
  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await maskMintedReference(page, [journeyId])
  await record.record(page, 'dashboard-populated')

  // The filter, driven through its own form. The value typed is a fixed
  // literal that cannot match a minted reference, so the picture is the same
  // every run. Nothing here asserts what the service does with the filter —
  // only that the filter was applied and that this is still the dashboard.
  await page.getByLabel('Keyword or reference').fill('NO-SUCH-REFERENCE')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page).toHaveURL(/referenceNumber=NO-SUCH-REFERENCE/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await maskMintedReference(page, [journeyId])
  await record.record(page, 'dashboard-search-no-results')

  // The sort control away from its default. Back to the unfiltered list first,
  // because the sort form carries the current filter forward in a hidden field.
  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
  await page.getByLabel('Sort by').selectOption('createdAt,asc')
  await page.getByRole('button', { name: 'Update sort' }).click()
  await expect(page).toHaveURL(/sort=createdAt%2Casc/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await maskMintedReference(page, [journeyId])
  await record.record(page, 'dashboard-sorted')

  // The delete confirmation. Its slug is 'delete'; the screen id is
  // 'delete-notification'. The GET only renders while the journey is DRAFT,
  // SUBMITTED or AMEND (delete-notification/controller.js:37-39) and this one
  // is still a draft.
  await page.goto(`/notifications/${journeyId}/delete`)
  await expect(page).toHaveURL(new RegExp(`/notifications/${journeyId}/delete$`))
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Yes, delete notification' })
  ).toBeVisible()
  await maskMintedReference(page, [journeyId])
  await record.record(page, 'delete-notification')

  // Confirming sends the user back to the dashboard with ?deleted=1, which is
  // the only route that raises the success banner at the top of the list. It
  // is shot last because it empties the list again.
  await page.getByRole('button', { name: 'Yes, delete notification' }).click()
  await expect(page).toHaveURL(/\/\?deleted=1$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await maskMintedReference(page, [journeyId])
  await record.record(page, 'dashboard-deleted')
})

// fe-cancel-amend IS NOT CAPTURED. Stated absence, not an oversight.
//
// GET /notifications/{id}/cancel-amend redirects away unless the journey is in
// AMEND (cancel-amend/controller.js:41-45). AMEND is only ever set by
// records.amend, which engine/journey.js:125-133 calls only for a journey
// whose status is already SUBMITTED. SUBMITTED is only ever set by
// records.finalise, which engine/write/submit.js:9-15 refuses unless
// scope.readyForCheckYourAnswers is true, and that requires every task row on
// the journey to be fulfilled, not applicable or optional
// (flow/section-status.js:11-15).
//
// So this screen exists only after a complete notification has been submitted
// and then reopened for amendment. Reaching it means driving all twelve task
// rows — commodity search, animal identification, the five party pickers, the
// CPH page, arrival details, transporter, contact and documents — which is the
// whole of the rest of the frontend side and belongs to other slices. Doing it
// here would duplicate five other authors' work and would be written blind.
//
// The cheap fix is to hand this screen to whichever slice owns fe-declaration
// and fe-confirmation. That spec already holds a SUBMITTED journey at the end
// of its run, and from there the screen is three steps away:
//
//   POST /notifications/{id}/amend   (the dashboard's Amend row action —
//                                     dashboard/controller.js:129-133, POST
//                                     only, so submit the row's form)
//   GET  /notifications/{id}/cancel-amend
//   record.record(page, 'cancel-amend')
//
// Nothing else in this slice depends on it, and no picture of another page has
// been recorded under its name.
//
// Two further dashboard states were considered and deliberately left out:
//
//   - the copy success banner. template.njk:18-25 renders it when the query
//     carries copied=1, but no handler anywhere sets that flag — the copy POST
//     redirects to the new copy's hub (notification-actions/controller.js:39-41)
//     and delete is the only handler that redirects with a flag at all. It can
//     be forced by typing /?copied=1, but a picture of a banner no user can
//     reach would be evidence of something that does not happen.
//
//   - pagination. The list pages at twenty rows
//     (records/stub/list-query.js:1), so the pagination component only appears
//     after twenty-one notifications exist. Not worth twenty-one journeys.
