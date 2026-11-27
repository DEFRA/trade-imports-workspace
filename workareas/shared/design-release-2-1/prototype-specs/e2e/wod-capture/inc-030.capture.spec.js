const fs = require('fs')
const os = require('os')
const path = require('path')
const { test, expect } = require('@playwright/test')
const {
  url, urlFor, SPECIES, startNotification, answerOrigin, answerCommodity, answerReason,
  answerConsignmentDetails, answerArrival, pickFromAutocomplete, saveAndContinue, saveAndReturnToOverview
} = require('../support/journey')

// Capture only: photographs how the prototype adds, removes and announces transit countries.

const REVIEW = path.join(os.homedir(), 'git/defra/trade-imports-workspace/workareas/shared/design-release-2-1/waiting-on-design-review')
const SCREENS = path.join(REVIEW, 'screens/inc-030/prototype')
const VIDEOS = path.join(REVIEW, 'videos')
const PAUSE_MS = 1000

const TWELVE_COUNTRIES = [
  ['Aust', 'Austria'], ['Belg', 'Belgium'], ['Croa', 'Croatia'], ['Denm', 'Denmark'],
  ['Esto', 'Estonia'], ['Finl', 'Finland'], ['Germ', 'Germany'], ['Gree', 'Greece'],
  ['Hung', 'Hungary'], ['Ital', 'Italy'], ['Pola', 'Poland'], ['Port', 'Portugal']
]

test.use({ video: 'on', viewport: { width: 1280, height: 800 } })

const pause = (page) => page.waitForTimeout(PAUSE_MS)

const searchBox = (page) => page.locator('#transit-country-search')
const statusRegion = (page) => page.locator('.app-transit-country-search__status')
const hiddenValue = (page) => page.locator('input[name="transitCountries"]')
const addedRows = (page) => page.locator('#transit-countries-selected-rows [data-transit-country]')
const addedNames = (page) => page.locator('#transit-countries-selected-rows .app-transit-countries-page__summary-value')
const removeLinkFor = (page, country) => page.locator(`[data-transit-country="${country}"] .app-transit-country-search__remove-country`)
const searchWidget = (page) => page.locator('.app-transit-countries-page__search')

async function shoot (target, state, { fullPage = true } = {}) {
  fs.mkdirSync(SCREENS, { recursive: true })
  const file = path.join(SCREENS, `${state}.png`)
  if (typeof target.goto === 'function') {
    await target.screenshot({ path: file, fullPage })
  } else {
    await target.screenshot({ path: file })
  }
}

function record (state, value) {
  fs.mkdirSync(SCREENS, { recursive: true })
  fs.writeFileSync(path.join(SCREENS, `${state}.json`), `${JSON.stringify(value, null, 2)}\n`)
}

/** Shows the visually hidden live region's text in a labelled box, records it, and photographs the page. */
async function shootAnnouncement (page, state) {
  await page.waitForTimeout(400)
  const text = ((await statusRegion(page).textContent()) || '').trim()
  fs.mkdirSync(SCREENS, { recursive: true })
  fs.writeFileSync(path.join(SCREENS, `${state}.announcement.txt`), `${text}\n`)
  await page.evaluate((spoken) => {
    const old = document.getElementById('capture-announcement')
    if (old) old.remove()
    const box = document.createElement('div')
    box.id = 'capture-announcement'
    box.setAttribute('aria-hidden', 'true')
    box.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:9999;max-width:420px;padding:12px 16px;background:#fff;border:3px dashed #d4351c;font:16px/1.4 Arial,sans-serif;color:#0b0c0c'
    box.textContent = `Screen reader hears: "${spoken}"`
    document.body.appendChild(box)
  }, text)
  await shoot(page, state, { fullPage: false })
  await pause(page)
  await page.evaluate(() => {
    const box = document.getElementById('capture-announcement')
    if (box) box.remove()
  })
}

async function recordPageState (page, state) {
  record(state, {
    hiddenTransitCountriesValue: await hiddenValue(page).inputValue(),
    listed: await addedNames(page).allInnerTexts(),
    removeControlNames: await page.locator('.app-transit-country-search__remove-country').evaluateAll((links) =>
      links.map((link) => ({ tag: link.tagName.toLowerCase(), href: link.getAttribute('href'), name: link.textContent.trim() }))),
    focused: await page.evaluate(() => {
      const el = document.activeElement
      return el ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.className ? `.${String(el.className).split(' ')[0]}` : ''}` : null
    })
  })
}

async function toTransitCountries (page) {
  await startNotification(page, 'live-animals')
  await answerOrigin(page)
  await answerCommodity(page, SPECIES.chicken)
  await answerReason(page)
  await answerConsignmentDetails(page, { [SPECIES.chicken.id]: 100 })
  await page.goto(url('/arrival-details'))
  await answerArrival(page, { means: 'Road', port: { search: 'Dover', option: 'Dover' }, transportId: 'AB12 CDE' })
  await expect(page).toHaveURL(urlFor('/transit-countries'))
}

async function pickCountry (page, search, country) {
  await pickFromAutocomplete(page, 'transit-country-search', search, country)
  await expect(addedRows(page).filter({ hasText: country })).toHaveCount(1)
}

test.afterEach(async ({ page }, testInfo) => {
  const video = page.video()
  await page.close()
  if (video) {
    fs.mkdirSync(VIDEOS, { recursive: true })
    const name = testInfo.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    await video.saveAs(path.join(VIDEOS, `inc-030--prototype--${name}.webm`))
  }
})

test.describe('Transit countries with JavaScript', () => {
  test.beforeEach(async ({ page }) => {
    await toTransitCountries(page)
  })

  test('add on pick', async ({ page }) => {
    await pause(page)
    await shoot(page, 'js--01-empty')

    await searchBox(page).click()
    await searchBox(page).pressSequentially('Germ', { delay: 120 })
    await page.locator('button.app-country-search__option', { hasText: 'Germany' }).first().waitFor()
    await pause(page)
    await shoot(page, 'js--02-search-open', { fullPage: false })
    await shoot(searchWidget(page), 'js--02-search-open--widget')
    await shootAnnouncement(page, 'js--02-search-open--announcement')

    await page.locator('button.app-country-search__option', { hasText: 'Germany' }).first().click()
    await expect(addedRows(page)).toHaveCount(1)
    await pause(page)
    await shoot(page, 'js--03-germany-added-on-pick')
    await shootAnnouncement(page, 'js--03-germany-added-on-pick--announcement')

    await searchBox(page).pressSequentially('Belg', { delay: 120 })
    await pause(page)
    await page.locator('button.app-country-search__option', { hasText: 'Belgium' }).first().click()
    await expect(addedRows(page)).toHaveCount(2)
    await pause(page)
    await shoot(page, 'js--04-two-added-sorted')
    await shoot(searchWidget(page), 'js--04-two-added--widget')
    await recordPageState(page, 'js--04-two-added--state')
  })

  test('remove in place', async ({ page }) => {
    await pickCountry(page, 'Germ', 'Germany')
    await pause(page)
    await pickCountry(page, 'Belg', 'Belgium')
    await pause(page)
    await shoot(removeLinkFor(page, 'Germany'), 'js--05-remove-link--widget')

    await removeLinkFor(page, 'Germany').focus()
    await pause(page)
    await shoot(page, 'js--05-remove-focused', { fullPage: false })

    await removeLinkFor(page, 'Germany').click()
    await expect(addedRows(page)).toHaveCount(1)
    await pause(page)
    await shoot(page, 'js--06-germany-removed')
    await shootAnnouncement(page, 'js--06-germany-removed--announcement')
    await recordPageState(page, 'js--06-germany-removed--state')
  })

  test('twelve country limit', async ({ page }) => {
    for (const [search, country] of TWELVE_COUNTRIES) {
      await pickCountry(page, search, country)
      await pause(page)
    }
    await expect(addedRows(page)).toHaveCount(12)
    await shoot(page, 'js--07-twelve-added-limit')
    await shoot(searchWidget(page).locator('.app-commodity-search-panel'), 'js--07-twelve-added-limit--search-disabled')
    await shootAnnouncement(page, 'js--07-twelve-added-limit--announcement')
    record('js--07-twelve-added-limit--search-state', { searchDisabled: await searchBox(page).isDisabled() })
  })
})

test.describe('Transit countries without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('no way to add or remove without JavaScript, and saving clears the list', async ({ page, browser }, testInfo) => {
    const helper = await browser.newContext({ baseURL: testInfo.project.use.baseURL, javaScriptEnabled: true })
    const helperPage = await helper.newPage()
    await toTransitCountries(helperPage)
    await page.context().addCookies(await helper.cookies())

    await page.goto(url('/transit-countries'))
    await pause(page)
    await shoot(page, 'nojs--01-empty')

    await searchBox(page).click()
    await searchBox(page).pressSequentially('Germ', { delay: 120 })
    await pause(page)
    await page.locator('.app-commodity-search__button').click()
    await pause(page)
    await shoot(page, 'nojs--02-typed-nothing-happens', { fullPage: false })
    await shoot(searchWidget(page), 'nojs--02-typed-nothing-happens--widget')

    await pickCountry(helperPage, 'Belg', 'Belgium')
    await pickCountry(helperPage, 'Germ', 'Germany')
    await saveAndReturnToOverview(helperPage)
    await helper.close()

    await page.goto(url('/transit-countries'))
    await pause(page)
    await shoot(page, 'nojs--03-saved-countries-listed')
    await recordPageState(page, 'nojs--03-saved-countries-listed--state')

    await removeLinkFor(page, 'Germany').click()
    await pause(page)
    await shoot(page, 'nojs--04-remove-does-nothing')
    record('nojs--04-remove-does-nothing--url', { url: page.url() })

    await saveAndContinue(page)
    await pause(page)
    await page.goto(url('/transit-countries'))
    await pause(page)
    await shoot(page, 'nojs--05-after-save-list-cleared')
    record('nojs--05-after-save-list-cleared--state', { listed: await addedNames(page).allInnerTexts() })
  })
})
