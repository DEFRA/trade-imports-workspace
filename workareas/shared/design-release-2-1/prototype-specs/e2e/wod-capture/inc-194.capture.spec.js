const fs = require('fs')
const os = require('os')
const path = require('path')
const { test, expect } = require('@playwright/test')
const {
  url, urlFor, clickAction, submitForm, SPECIES, startNotification, answerOrigin, answerCommodity,
  answerReason, answerConsignmentDetails, answerArrival
} = require('../support/journey')

// Photographs the address search's search-only layout on the latest prototype:
// the address book's add-details step, the in-journey consignee add page and the
// commercial transporter form, with JavaScript on and off. Captures only: no test
// here asserts the design, each walks one behaviour so its video stays short.

const REVIEW_DIR = path.join(os.homedir(), 'git/defra/trade-imports-workspace/workareas/shared/design-release-2-1/waiting-on-design-review')
const SCREENS = path.join(REVIEW_DIR, 'screens/inc-194/prototype')
const VIDEOS = path.join(REVIEW_DIR, 'videos')
const VIEWPORT = { width: 1280, height: 800 }
const PAUSE = 1000

const SEARCH_INPUT = '#consignment-address-lookup-search'
const TRANSPORTER_SEARCH_INPUT = '#transporter-commercial-address-lookup-search'
const OPTION = '.app-address-book-lookup-search__option'
const LIVE_REGION = '.app-address-book-lookup-search__status'

test.use({ video: 'on', viewport: VIEWPORT })

fs.mkdirSync(SCREENS, { recursive: true })
fs.mkdirSync(VIDEOS, { recursive: true })

const pause = (page) => page.waitForTimeout(PAUSE)

const screenPath = (state) => path.join(SCREENS, `${state}.png`)

async function shoot (page, state, { fullPage = true } = {}) {
  await page.screenshot({ path: screenPath(state), fullPage })
}

async function shootElement (locator, state) {
  await locator.screenshot({ path: screenPath(state) })
}

// The live region is visually hidden; show it for one element screenshot so the
// announcement a screen reader hears is in the evidence, then hide it again.
async function shootAnnouncement (page, root, state) {
  const region = page.locator(`${root} ${LIVE_REGION}`).first()
  await region.evaluate((el) => {
    el.classList.remove('govuk-visually-hidden')
    el.style.outline = '3px dashed #d4351c'
    el.style.padding = '8px'
  })
  if (!(await region.isVisible())) {
    await shootAnnouncementInsideHiddenBlock(page, region, state)
    return
  }
  await shootElement(region, state)
  await region.evaluate((el) => {
    el.classList.add('govuk-visually-hidden')
    el.style.outline = ''
    el.style.padding = ''
  })
}

async function shootAnnouncementInsideHiddenBlock (page, region, state) {
  const announced = (await region.textContent()).trim()
  await region.evaluate((el) => {
    el.classList.add('govuk-visually-hidden')
    el.style.outline = ''
    el.style.padding = ''
  })
  await page.evaluate((text) => {
    const note = document.createElement('div')
    note.id = 'capture-live-region-note'
    note.setAttribute('aria-hidden', 'true')
    note.textContent = `Live region (inside the hidden search block) holds: "${text}"`
    note.style.cssText = 'position:fixed;top:8px;right:8px;z-index:9999;max-width:420px;padding:8px;outline:3px dashed #d4351c;background:#fff;color:#0b0c0c;font:19px/1.4 arial,sans-serif'
    document.body.appendChild(note)
  }, announced)
  await shootElement(page.locator('#capture-live-region-note'), state)
  await page.evaluate(() => document.getElementById('capture-live-region-note').remove())
}

async function typeSlowly (page, selector, text) {
  const input = page.locator(selector)
  await input.click()
  await pause(page)
  await input.pressSequentially(text, { delay: 120 })
  await pause(page)
}

async function chooseAddressBookCategory (page, category) {
  await page.goto(url('/address-book/add'))
  await pause(page)
  await page.locator(`input[name="addressType"][value="${category}"]`).check()
  await pause(page)
  await submitForm(page, 'Continue')
  await expect(page).toHaveURL(urlFor('/address-book/add/lookup'))
  await pause(page)
}

async function toRolesAndAddresses (page) {
  await startNotification(page, 'live-animals')
  await answerOrigin(page)
  await answerCommodity(page, SPECIES.cattle)
  await answerReason(page)
  await answerConsignmentDetails(page, { [SPECIES.cattle.id]: 1 })
  await page.goto(url('/roles-and-addresses'))
  await expect(page).toHaveURL(urlFor('/roles-and-addresses'))
}

async function toCommercialTransporter (page) {
  await startNotification(page, 'live-animals')
  await answerOrigin(page)
  await answerCommodity(page, SPECIES.chicken)
  await answerReason(page)
  await answerConsignmentDetails(page, { [SPECIES.chicken.id]: 100 })
  await page.goto(url('/arrival-details'))
  await answerArrival(page, { means: 'Air' })
  await page.locator('main a', { hasText: 'Add a transporter' }).click()
  await expect(page).toHaveURL(urlFor('/transporter/add'))
  await page.locator('input[name="transporterType"][value="commercial"]').check()
  await submitForm(page, 'Continue')
  await expect(page).toHaveURL(urlFor('/transporter/add/commercial'))
  await pause(page)
}

async function openWithoutJavaScript (browser, page, testInfo) {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: VIEWPORT,
    baseURL: new URL(page.url()).origin,
    storageState: await page.context().storageState(),
    recordVideo: { dir: testInfo.outputPath('js-off-video'), size: VIEWPORT }
  })
  return { context, jsOffPage: await context.newPage() }
}

async function saveJsOffVideo (context, jsOffPage, name) {
  const video = jsOffPage.video()
  await context.close()
  if (video) fs.copyFileSync(await video.path(), path.join(VIDEOS, `inc-194--prototype--${name}-js-off.webm`))
}

const VIDEO_NAME = new Map()

test.afterEach(async ({ page }, testInfo) => {
  const name = VIDEO_NAME.get(testInfo.title)
  const video = page.video()
  await page.close()
  if (name && video) fs.copyFileSync(await video.path(), path.join(VIDEOS, `inc-194--prototype--${name}.webm`))
})

function capture (title, name, body) {
  VIDEO_NAME.set(title, name)
  test(title, body)
}

test.describe('address book, Destination, Consignee or Importer', () => {
  capture('opens on the search alone, lists matches as the trader types, and a pick reveals the fields', 'ab-destination-search-and-pick', async ({ page }) => {
    await chooseAddressBookCategory(page, 'destination-consignee-importer')
    await shoot(page, 'ab-destination-opens-search-only')

    await typeSlowly(page, SEARCH_INPUT, 'Acorn')
    await expect(page.locator(OPTION).first()).toBeVisible()
    await shootElement(page.locator('.app-address-book-lookup-page__search'), 'ab-destination-results-as-you-type')
    await shoot(page, 'ab-destination-results-full')
    await shootAnnouncement(page, '.app-address-book-lookup-page__search', 'ab-destination-results-announcement')

    await page.locator(OPTION).first().click()
    await pause(page)
    await expect(page.getByLabel('Address line 1', { exact: true })).toBeVisible()
    await shoot(page, 'ab-destination-picked-fields-revealed')
    await shootAnnouncement(page, '.app-consignment-add-address-page', 'ab-destination-picked-announcement')
  })

  capture('a search with no match leaves no visible way to enter the address by hand', 'ab-destination-no-match', async ({ page }) => {
    await chooseAddressBookCategory(page, 'destination-consignee-importer')
    await typeSlowly(page, SEARCH_INPUT, 'Zzqx')
    await expect(page.locator('.app-commodity-search__no-results')).toBeVisible()
    await shoot(page, 'ab-destination-no-match')
    await shootAnnouncement(page, '.app-address-book-lookup-page__search', 'ab-destination-no-match-announcement')
  })

  capture('saving with nothing picked shows six errors while the fields they name stay hidden', 'ab-destination-empty-save', async ({ page }) => {
    await chooseAddressBookCategory(page, 'destination-consignee-importer')
    await clickAction(page, 'continue')
    await pause(page)
    await expect(page.locator('.govuk-error-summary')).toBeVisible()
    await shoot(page, 'ab-destination-empty-save-errors')

    await page.locator('.govuk-error-summary__list a').first().click()
    await pause(page)
    await shoot(page, 'ab-destination-empty-save-first-error-link-followed', { fullPage: false })
  })
})

test.describe('address book, Branch', () => {
  capture('opens on the search alone', 'ab-branch-opens', async ({ page }) => {
    await chooseAddressBookCategory(page, 'branch')
    await shoot(page, 'ab-branch-opens-search-only')
  })
})

test.describe('in-journey add page, consignee', () => {
  capture('opens on the search alone and a pick hides the search and reveals the fields and uses', 'consignee-search-and-pick', async ({ page }) => {
    await toRolesAndAddresses(page)
    await page.goto(url('/consignee/add-address'))
    await pause(page)
    await shoot(page, 'consignee-opens-search-only')

    await typeSlowly(page, SEARCH_INPUT, 'Acorn')
    await expect(page.locator(OPTION).first()).toBeVisible()
    await shootElement(page.locator('.app-address-book-lookup-page__search'), 'consignee-results-as-you-type')

    await page.locator(OPTION).first().click()
    await pause(page)
    await expect(page.getByLabel('Address line 1', { exact: true })).toBeVisible()
    await shoot(page, 'consignee-picked-fields-and-uses-revealed')
  })

  capture('without JavaScript the page has a search that cannot search and no visible fields', 'consignee-no-js', async ({ browser, page }, testInfo) => {
    await toRolesAndAddresses(page)
    const { context, jsOffPage } = await openWithoutJavaScript(browser, page, testInfo)
    await jsOffPage.goto(url('/consignee/add-address'))
    await pause(jsOffPage)
    await shoot(jsOffPage, 'nojs-consignee-opens')

    await jsOffPage.locator(SEARCH_INPUT).fill('Acorn')
    await pause(jsOffPage)
    await jsOffPage.locator('.app-commodity-search__button').click()
    await pause(jsOffPage)
    await shoot(jsOffPage, 'nojs-consignee-search-button-pressed')

    await clickAction(jsOffPage, 'select')
    await pause(jsOffPage)
    await shoot(jsOffPage, 'nojs-consignee-empty-save')
    await saveJsOffVideo(context, jsOffPage, 'consignee-no-js')
  })
})

test.describe('address book without JavaScript', () => {
  capture('Destination, Consignee or Importer opens with its fields hidden and a save leaves them hidden', 'ab-destination-no-js', async ({ browser, page }, testInfo) => {
    await page.goto(url('/address-book'))
    const { context, jsOffPage } = await openWithoutJavaScript(browser, page, testInfo)
    await chooseAddressBookCategory(jsOffPage, 'destination-consignee-importer')
    await shoot(jsOffPage, 'nojs-ab-destination-opens')

    await clickAction(jsOffPage, 'continue')
    await pause(jsOffPage)
    await shoot(jsOffPage, 'nojs-ab-destination-empty-save')
    await saveJsOffVideo(context, jsOffPage, 'ab-destination-no-js')
  })
})

test.describe('commercial transporter', () => {
  capture('opens with the search and Enter address manually, and a Northern Ireland pick reveals the address and contact details', 'transporter-search-and-pick', async ({ page }) => {
    await toCommercialTransporter(page)
    await shoot(page, 'transporter-opens-search-only')

    await typeSlowly(page, TRANSPORTER_SEARCH_INPUT, 'Belfast')
    await expect(page.locator(OPTION).first()).toBeVisible()
    await shootElement(page.locator('.app-transporter-add-commercial-fields__lookup'), 'transporter-results-as-you-type')
    await shootAnnouncement(page, '.app-transporter-add-commercial-fields__lookup', 'transporter-results-announcement')

    await page.locator(OPTION).first().click()
    await pause(page)
    await expect(page.locator('#transporter-commercial-contact-details')).toBeVisible()
    await shoot(page, 'transporter-picked-fields-revealed')
  })

  capture('Enter address manually reveals the address and contact details', 'transporter-manual', async ({ page }) => {
    await toCommercialTransporter(page)
    await shootElement(page.locator('.app-transporter-add-commercial-fields__manual-link'), 'transporter-enter-address-manually-button')
    await page.getByRole('button', { name: 'Enter address manually' }).click()
    await pause(page)
    await expect(page.getByLabel('Address line 1', { exact: true })).toBeVisible()
    await shoot(page, 'transporter-manual-revealed')
  })

  capture('without JavaScript the fields start hidden and only a refused save shows them', 'transporter-no-js', async ({ browser, page }, testInfo) => {
    await toCommercialTransporter(page)
    const { context, jsOffPage } = await openWithoutJavaScript(browser, page, testInfo)
    await jsOffPage.goto(url('/transporter/add/commercial'))
    await pause(jsOffPage)
    await shoot(jsOffPage, 'nojs-transporter-opens')

    await jsOffPage.getByRole('button', { name: 'Enter address manually' }).click()
    await pause(jsOffPage)
    await shoot(jsOffPage, 'nojs-transporter-manual-button-pressed')

    await submitForm(jsOffPage, 'Save and continue')
    await pause(jsOffPage)
    await shoot(jsOffPage, 'nojs-transporter-refused-save-reveals-fields')
    await saveJsOffVideo(context, jsOffPage, 'transporter-no-js')
  })
})
