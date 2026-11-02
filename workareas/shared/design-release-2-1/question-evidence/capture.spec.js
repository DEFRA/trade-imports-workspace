const fs = require('fs')
const path = require('path')
const { test, expect } = require('@playwright/test')

// Hosts and canned user mirror trade-imports-ins-tests:
// playwright.docker-compose.config.ts and config/users.ts.
const ANIMALS = 'http://localhost:3000'
const INS = 'http://localhost:3002'
const USER_ID = '2100010101'
const PASSWORD = process.env.AUTH_PASSWORD || 'Password123'

const OUT_DIR = path.resolve(__dirname, '..', 'evidence', 'real', 'questions')
const INDEX = path.join(OUT_DIR, 'index.json')
const REFERENCE_PLACEHOLDER = 'REFERENCE'
const settle = { timeout: 30_000 }

const addNewAddress = (page) => page.getByRole('button', { name: 'Add a new address' }).or(page.getByRole('link', { name: 'Add a new address' }))

function readIndex() {
  if (!fs.existsSync(INDEX)) return []
  return JSON.parse(fs.readFileSync(INDEX, 'utf8'))
}

function record(entry) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const entries = readIndex().filter((e) => e.slug !== entry.slug)
  entries.push(entry)
  fs.writeFileSync(INDEX, JSON.stringify(entries, null, 2) + '\n')
}

function journeyIdFrom(page) {
  const match = new URL(page.url()).pathname.match(/^\/live-animals\/notifications\/([^/]+)/)
  return match ? match[1] : null
}

async function maskText(page, values) {
  const targets = values.filter(Boolean)
  if (targets.length === 0) return
  await page.evaluate(
    ({ targets, placeholder }) => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      let node
      while ((node = walker.nextNode())) {
        let text = node.nodeValue
        for (const t of targets) text = text.split(t).join(placeholder)
        if (text !== node.nodeValue) node.nodeValue = text
      }
    },
    { targets, placeholder: REFERENCE_PLACEHOLDER }
  )
}

async function shoot(page, { slug, service, state, note, mask = [] }) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(600)
  await maskText(page, mask)
  const heading = ((await page.locator('h1').first().textContent().catch(() => '')) || '').trim()
  const file = `${slug}.png`
  await page.screenshot({ path: path.join(OUT_DIR, file), fullPage: true, animations: 'disabled' })
  let url = page.url()
  for (const m of mask.filter(Boolean)) url = url.split(m).join(REFERENCE_PLACEHOLDER)
  url = url.replace(/(handshake-token|fulfilment-id)=[^&]+/g, '$1=GENERATED')
  record({ slug, url, heading, service, state, file, note: note || '' })
}

function recordAbsent({ slug, url, service, state, note }) {
  record({ slug, url, heading: null, service, state, file: null, note })
}

// Mirrors BasePage.signInWhenRequested: the OIDC chain is server 302s, so the
// stub's form is either showing now or this context is already signed in.
async function signInIfAsked(page) {
  const form = page.getByRole('heading', { level: 1, name: 'Sign in using Government Gateway' })
  if (!(await form.isVisible().catch(() => false))) return
  await page.getByRole('textbox', { name: 'Government Gateway user ID' }).fill(USER_ID)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('heading', { level: 1 }).filter({ hasNotText: 'Sign in using Government Gateway' }).first().waitFor(settle)
}

const task = (page, name) => page.getByRole('link', { name, exact: true })
const saveAndContinue = (page) => page.getByRole('button', { name: 'Save and continue' })
const h1 = (page, name) => page.getByRole('heading', { level: 1, name })
const overviewHeading = (page) => h1(page, 'Overview')

function arrivalDate() {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

async function typeAhead(page, field, name) {
  await page.waitForLoadState('domcontentloaded')
  if ((await field.evaluate((el) => el.tagName)) === 'SELECT') {
    await field.selectOption({ label: name })
    return
  }
  await field.click()
  await field.fill(name)
  await page.getByRole('option', { name, exact: true }).click()
}

// flows/animals/journey.ts startNotification + unlockSections
async function startNotification(page) {
  await page.goto(`${ANIMALS}/live-animals`)
  await signInIfAsked(page)
  await h1(page, 'Import notification service').waitFor(settle)
  await page.getByRole('button', { name: 'Start a new notification' }).click()
  await h1(page, 'Origin of the import').waitFor(settle)
  const journeyId = journeyIdFrom(page)
  await typeAhead(page, page.locator('#countryOfOrigin'), 'France')
  await page.getByRole('radio', { name: 'No', exact: true }).check()
  await saveAndContinue(page).click()
  await h1(page, 'Origin of the import').waitFor({ ...settle, state: 'hidden' })
  await page.goto(`${ANIMALS}/live-animals/notifications/${journeyId}`)
  await overviewHeading(page).waitFor(settle)
  return journeyId
}

async function answerCommodity(page) {
  await task(page, 'What are you importing?').click()
  await page.getByLabel('Search for a commodity').fill('Bos taurus')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Bos taurus' }).check()
  await saveAndContinue(page).click()
  await h1(page, 'Commodity details').waitFor(settle)
  await page.getByLabel('Number of animals').fill('1')
  await page.getByLabel('Number of packages (when required)').fill('5')
  await saveAndContinue(page).click()
  await overviewHeading(page).waitFor(settle)
}

async function toTransporter(page) {
  await task(page, 'Arrival details').click()
  await h1(page, 'Arrival details').waitFor(settle)
  await page.locator('input[name="arrivalDateAtPort"]').fill(arrivalDate())
  const port = page.getByLabel('Port of entry', { exact: true })
  await port.click()
  await port.fill('Aberdeen Harbour (GB ABD)')
  await page.getByRole('option', { name: 'Aberdeen Harbour (GB ABD)', exact: true }).click()
  await page.getByLabel('Means of transport to the port of entry', { exact: true }).selectOption({ label: 'Road Vehicle' })
  await page.getByLabel('Transport identification').fill('FR-892-LK')
  await page.getByLabel('Transport document reference').fill('CMR-2026-884721')
  await saveAndContinue(page).click()
  await h1(page, 'Which countries will the consignment travel through?').waitFor(settle)
}

async function addTransitedCountry(page, name) {
  await typeAhead(page, page.locator('#transitedCountry'), name)
  await page.getByRole('button', { name: 'Add country', exact: true }).click()
  await expect(page.getByRole('cell', { name, exact: true })).toBeVisible()
}

async function answerReasonAndAdditionalDetails(page) {
  await task(page, 'Main reason for import').click()
  await page.getByRole('radio', { name: 'Internal market', exact: true }).check()
  await page.getByRole('radio', { name: 'Breeding', exact: true }).check()
  await saveAndContinue(page).click()
  await h1(page, 'Additional details').waitFor(settle)
  await page.getByRole('radio', { name: 'Slaughter', exact: true }).check()
  await page
    .getByRole('group', { name: 'Does the consignment contain any unweaned animals?' })
    .getByRole('radio', { name: 'No', exact: true })
    .check()
  await saveAndContinue(page).click()
  await overviewHeading(page).waitFor(settle)
}

async function answerAddresses(page) {
  await task(page, 'Roles and addresses').click()
  const parties = [
    ['Consignor or exporter', 'Astra Rosales'],
    ['Place of destination', 'Tech Imports Ltd'],
    ['Place of origin', 'Origin Farm'],
    ['Consignee', 'British Livestock Ltd'],
    ['Importer', 'Import Co UK']
  ]
  for (const [role, name] of parties) {
    await partyRow(page, role).getByRole('link', { name: 'Add' }).click()
    await page.getByLabel('Search').fill(name)
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await page.getByRole('radio', { name: `Select ${name}`, exact: true }).check()
    await saveAndContinue(page).click()
    await h1(page, 'Consignment addresses').waitFor(settle)
  }
  await page.getByRole('button', { name: 'Continue' }).click()
  await h1(page, 'Add the county parish holding number (CPH)').waitFor(settle)
  await page.getByLabel('County', { exact: true }).fill('12')
  await page.getByLabel('Parish', { exact: true }).fill('345')
  await page.getByLabel('Holding number', { exact: true }).fill('6789')
  await saveAndContinue(page).click()
  await overviewHeading(page).waitFor(settle)
}

function partyRow(page, role) {
  return page.locator('.govuk-summary-list__row', { has: page.getByText(role, { exact: true }) })
}

async function answerTransport(page) {
  await toTransporter(page)
  await addTransitedCountry(page, 'France')
  await addTransitedCountry(page, 'Belgium')
  await saveAndContinue(page).click()
  await h1(page, 'Transporter details').waitFor(settle)
  await page.getByRole('radio', { name: 'Select García Livestock Transport SL', exact: true }).check()
  await saveAndContinue(page).click()
  await overviewHeading(page).waitFor(settle)
}

async function answerContact(page) {
  await task(page, 'Contact address for this consignment').click()
  await page.getByRole('radio', { name: 'Animal and Plant Health Agency' }).check()
  await saveAndContinue(page).click()
  await overviewHeading(page).waitFor(settle)
}

test('Q1 INS address book add page and its empty-submit error', async ({ page }) => {
  await page.goto(`${INS}/address-book`)
  await signInIfAsked(page)
  await h1(page, 'Address book').waitFor(settle)
  await shoot(page, {
    slug: 'ins-address-book-list',
    service: 'ins-frontend',
    state: 'address book list, signed in as the canned user',
    note: 'Context: the page the "Add a new address" link starts from.'
  })
  await addNewAddress(page).click()
  await h1(page, 'Add address details').waitFor(settle)
  await shoot(page, {
    slug: 'ins-address-book-add',
    service: 'ins-frontend',
    state: 'add address, empty, reached from the address book list'
  })
  await saveAndContinue(page).click()
  await page.getByRole('heading', { level: 2, name: 'There is a problem' }).waitFor(settle)
  await shoot(page, {
    slug: 'ins-address-book-add-error',
    service: 'ins-frontend',
    state: 'add address, submitted empty'
  })
})

test('Q1 animals journey hands a new consignor address over to INS', async ({ page }) => {
  const journeyId = await startNotification(page)
  await answerCommodity(page)
  await task(page, 'Roles and addresses').click()
  await h1(page, 'Consignment addresses').waitFor(settle)
  await partyRow(page, 'Consignor or exporter').getByRole('link', { name: 'Add' }).click()
  await h1(page, 'Consignor or exporter').waitFor(settle)
  await shoot(page, {
    slug: 'animals-journey-consignor-picker',
    service: 'animals-frontend',
    state: 'consignor picker in a draft notification, before "Add a new address"',
    note: 'Context: the picker the trader is on when they choose to add a new address.',
    mask: [journeyId]
  })
  await addNewAddress(page).click()
  await page.waitForLoadState('domcontentloaded')
  await signInIfAsked(page)
  await h1(page, 'Add address details').waitFor(settle)
  await shoot(page, {
    slug: 'animals-journey-add-address',
    service: 'ins-frontend (via the animals journey handshake)',
    state: 'INS add address reached from the animals consignor picker',
    note: 'The animals journey has no add-address form of its own: "Add a new address" hands over to the INS add page.',
    mask: [journeyId]
  })
})

test('Q2 animals transporter type, add commercial and its empty-submit error', async ({ page }) => {
  const journeyId = await startNotification(page)
  await answerCommodity(page)
  await toTransporter(page)
  await addTransitedCountry(page, 'France')
  await saveAndContinue(page).click()
  await h1(page, 'Transporter details').waitFor(settle)
  await shoot(page, {
    slug: 'animals-transporter-list',
    service: 'animals-frontend',
    state: 'transporter list, before "Add a transporter"',
    note: 'Context: the list the add route starts from.',
    mask: [journeyId]
  })
  await page.getByRole('button', { name: 'Add a transporter' }).click()
  await h1(page, 'Choose a transporter type').waitFor(settle)
  await shoot(page, {
    slug: 'animals-transporter-type',
    service: 'animals-frontend',
    state: 'transporter type choice, nothing chosen',
    mask: [journeyId]
  })
  await page.getByRole('radio', { name: 'Commercial', exact: true }).check()
  await saveAndContinue(page).click()
  await h1(page, 'Add commercial transporter').waitFor(settle)
  await shoot(page, {
    slug: 'animals-transporter-add-commercial',
    service: 'animals-frontend',
    state: 'add commercial transporter, empty',
    mask: [journeyId]
  })
  const formUrl = page.url().split(journeyId).join(REFERENCE_PLACEHOLDER)
  await saveAndContinue(page).click()
  const problem = page.getByRole('heading', { name: 'There is a problem' })
  await problem.or(overviewHeading(page)).first().waitFor(settle)
  if (await problem.isVisible()) {
    await shoot(page, {
      slug: 'animals-transporter-add-commercial-error',
      service: 'animals-frontend',
      state: 'add commercial transporter, submitted empty',
      mask: [journeyId]
    })
    return
  }
  recordAbsent({
    slug: 'animals-transporter-add-commercial-error',
    url: formUrl,
    service: 'animals-frontend',
    state: 'add commercial transporter, submitted empty',
    note: 'No error state: submitting the form empty saves through and returns to the Overview. See animals-transporter-add-commercial-empty-submit-result.'
  })
  await shoot(page, {
    slug: 'animals-transporter-add-commercial-empty-submit-result',
    service: 'animals-frontend',
    state: 'overview reached by submitting the add commercial transporter form empty',
    note: 'Where an empty "Save and continue" on the add commercial transporter form actually lands.',
    mask: [journeyId]
  })
})

test('Q3 one identifier of several, the hub after it, and the confirmation', async ({ page }) => {
  const journeyId = await startNotification(page)
  await answerCommodity(page)
  await shoot(page, {
    slug: 'animals-hub-before-identification',
    service: 'animals-frontend',
    state: 'overview with origin and commodity (Bos taurus, 1 animal) answered, identification not started',
    note: 'Context: the identification task status before anything is entered.',
    mask: [journeyId]
  })
  await task(page, 'Identification details').click()
  await h1(page, 'Identification details').waitFor(settle)
  await page.getByLabel('Ear tag', { exact: true }).fill('UK123456789012')
  await shoot(page, {
    slug: 'animals-identification-one-identifier',
    service: 'animals-frontend',
    state: 'Bos taurus, 1 animal: ear tag filled, every other identifier blank, not yet saved',
    mask: [journeyId]
  })
  await saveAndContinue(page).click()
  await page.waitForLoadState('domcontentloaded')
  const problem = page.getByRole('heading', { name: 'There is a problem' })
  if (await problem.isVisible().catch(() => false)) {
    await shoot(page, {
      slug: 'animals-hub-after-one-identifier',
      service: 'animals-frontend',
      state: 'save with one identifier was refused',
      note: 'Saving with only the ear tag showed an error instead of returning to the overview.',
      mask: [journeyId]
    })
    return
  }
  await overviewHeading(page).waitFor(settle)
  await shoot(page, {
    slug: 'animals-hub-after-one-identifier',
    service: 'animals-frontend',
    state: 'overview after saving identification with only the ear tag',
    mask: [journeyId]
  })

  await answerReasonAndAdditionalDetails(page)
  await answerAddresses(page)
  await answerTransport(page)
  await answerContact(page)
  await shoot(page, {
    slug: 'animals-hub-ready-to-submit',
    service: 'animals-frontend',
    state: 'overview with every section answered, identification carrying only the ear tag',
    note: 'Context: the hub just before "Review and submit".',
    mask: [journeyId]
  })
  await page.getByRole('button', { name: 'Review and submit' }).click()
  await h1(page, 'Review your notification').waitFor(settle)
  await shoot(page, {
    slug: 'animals-check-answers',
    service: 'animals-frontend',
    state: 'review your notification, identification carrying only the ear tag',
    note: 'Context: the check-answers page on the way to submit.',
    mask: [journeyId]
  })
  await page.getByRole('button', { name: 'Continue' }).click()
  await h1(page, 'Declaration').waitFor(settle)
  await page.getByRole('checkbox', { name: /I confirm that I have reviewed/ }).check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('heading', { name: 'Import notification submitted' }).waitFor(settle)
  const submittedRef = ((await page.locator('.govuk-panel__body strong, .govuk-panel__body').first().textContent().catch(() => '')) || '')
    .replace(/^.*?:\s*/s, '')
    .trim()
  await shoot(page, {
    slug: 'animals-confirmation',
    service: 'animals-frontend',
    state: 'submitted with only the ear tag as identification',
    mask: [journeyId, submittedRef.length >= 6 ? submittedRef : null]
  })
})
