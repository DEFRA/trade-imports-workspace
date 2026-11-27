const fs = require('fs')
const os = require('os')
const path = require('path')
const { test, expect } = require('@playwright/test')
const {
  url,
  urlFor,
  SPECIES,
  startNotification,
  answerOrigin,
  answerCommodity,
  answerReason,
  answerConsignmentDetails
} = require('../support/journey')

const REVIEW_DIR = path.join(os.homedir(), 'git/defra/trade-imports-workspace/workareas/shared/design-release-2-1/waiting-on-design-review')
const SCREENS_DIR = path.join(REVIEW_DIR, 'screens/inc-193/prototype')
const VIDEOS_DIR = path.join(REVIEW_DIR, 'videos')
const VIEWPORT = { width: 1280, height: 800 }

test.use({ video: 'on', viewport: VIEWPORT })

const recording = { name: '', page: null }

const pause = (page) => page.waitForTimeout(1000)

async function shoot (page, state, { element } = {}) {
  fs.mkdirSync(SCREENS_DIR, { recursive: true })
  const file = path.join(SCREENS_DIR, `${state}.png`)
  if (element) {
    await element.screenshot({ path: file })
  } else {
    await page.screenshot({ path: file, fullPage: true })
  }
}

async function toRolesAndAddresses (page) {
  await startNotification(page, 'live-animals')
  await pause(page)
  await answerOrigin(page)
  await pause(page)
  await answerCommodity(page, SPECIES.cattle)
  await pause(page)
  await answerReason(page)
  await pause(page)
  await answerConsignmentDetails(page, { [SPECIES.cattle.id]: 1 })
  await pause(page)
  await page.goto(url('/roles-and-addresses'))
  await expect(page).toHaveURL(urlFor('/roles-and-addresses'))
  await pause(page)
}

async function openWithoutJavaScript (browser, page, testInfo, pathname) {
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    viewport: VIEWPORT,
    javaScriptEnabled: false,
    storageState: await page.context().storageState(),
    recordVideo: { dir: testInfo.outputPath('js-off-video'), size: VIEWPORT }
  })
  const jsOffPage = await context.newPage()
  recording.page = jsOffPage
  await jsOffPage.goto(pathname)
  await pause(jsOffPage)
  return jsOffPage
}

function pickerParts (page, searchInputId) {
  return {
    search: page.locator(`#${searchInputId}`),
    searchButton: page.locator('.app-consignment-address-select-page__search-button'),
    searchBlock: page.locator('.app-consignment-address-select-page__search'),
    count: page.locator('[data-results-count]'),
    visibleRows: page.locator('[data-address-row]:visible'),
    resultsAndTable: page.locator('.app-consignment-address-select-form')
  }
}

function addressBookParts (page) {
  return {
    filterSummary: page.locator('.app-address-book-page__filter-summary'),
    filterForm: page.locator('.app-address-book-page__filter'),
    search: page.locator('#address-book-search'),
    searchButton: page.locator('.app-address-book-page__search-button'),
    type: page.locator('#address-book-type'),
    count: page.locator('[data-address-book-results-count]'),
    rows: page.locator('[data-address-book-results] tr'),
    pagination: page.locator('.app-address-book-page__pagination')
  }
}

test.beforeEach(() => {
  recording.name = ''
  recording.page = null
})

test.afterEach(async ({ page }) => {
  const recorded = recording.page ?? page
  await recorded.close()
  if (recorded !== page) {
    await recorded.context().close()
    await page.close()
  }
  const video = recorded.video()
  if (video && recording.name) {
    fs.mkdirSync(VIDEOS_DIR, { recursive: true })
    fs.copyFileSync(await video.path(), path.join(VIDEOS_DIR, `inc-193--prototype--${recording.name}.webm`))
  }
})

test.describe('party picker rows narrow as the trader types', () => {
  test('consignor picker: typing hides the rows that do not match and updates the count; clearing brings them back', async ({ page }) => {
    recording.name = 'consignor-picker-js-on'
    await toRolesAndAddresses(page)
    await page.goto(url('/consignor-or-exporter'))
    const picker = pickerParts(page, 'consignor-search')
    await pause(page)
    await shoot(page, 'consignor-picker-initial')
    await shoot(page, 'consignor-picker-search-box', { element: picker.searchBlock })

    await picker.search.click()
    await pause(page)
    await picker.search.pressSequentially('Nord', { delay: 250 })
    await pause(page)
    await expect.soft(picker.visibleRows).toHaveCount(1)
    await expect.soft(picker.count).toContainText('Showing 1 out of')
    await shoot(page, 'consignor-picker-typed-nord')
    await shoot(page, 'consignor-picker-typed-nord-count', { element: picker.count })

    await picker.search.press('Backspace')
    await pause(page)
    await picker.search.press('Backspace')
    await pause(page)
    await shoot(page, 'consignor-picker-typed-no')

    await picker.search.fill('zzz')
    await pause(page)
    await expect.soft(picker.visibleRows).toHaveCount(0)
    await shoot(page, 'consignor-picker-no-matches')

    await picker.search.fill('')
    await pause(page)
    await shoot(page, 'consignor-picker-cleared')

    await picker.search.fill('Nordic')
    await pause(page)
    await picker.searchButton.click()
    await pause(page)
    await expect.soft(page).toHaveURL(urlFor('/consignor-or-exporter'))
    await shoot(page, 'consignor-picker-search-button-clicked')
  })

  test('place of origin picker: a country typed in the one free-text box narrows the rows', async ({ page }) => {
    recording.name = 'place-of-origin-picker-js-on'
    await toRolesAndAddresses(page)
    await page.goto(url('/place-of-origin'))
    const picker = pickerParts(page, 'place-of-origin-search')
    await pause(page)
    await shoot(page, 'place-of-origin-picker-initial')
    await shoot(page, 'place-of-origin-picker-search-box', { element: picker.searchBlock })

    await picker.search.click()
    await pause(page)
    await picker.search.pressSequentially('Romania', { delay: 250 })
    await pause(page)
    await expect.soft(picker.visibleRows).toHaveCount(3)
    await shoot(page, 'place-of-origin-picker-typed-romania')

    await picker.search.fill('Ireland')
    await pause(page)
    await shoot(page, 'place-of-origin-picker-typed-ireland')
  })

  test('consignor picker without JavaScript: the search button does nothing and Enter saves the page', async ({ browser, page }, testInfo) => {
    recording.name = 'consignor-picker-js-off'
    await toRolesAndAddresses(page)
    const jsOffPage = await openWithoutJavaScript(browser, page, testInfo, url('/consignor-or-exporter'))
    const picker = pickerParts(jsOffPage, 'consignor-search')
    await shoot(jsOffPage, 'consignor-picker-js-off-initial')

    await picker.search.fill('Nordic')
    await pause(jsOffPage)
    await picker.searchButton.click()
    await pause(jsOffPage)
    await expect.soft(picker.visibleRows).toHaveCount(9)
    await shoot(jsOffPage, 'consignor-picker-js-off-search-button-clicked')

    await picker.search.press('Enter')
    await jsOffPage.waitForLoadState('load')
    await pause(jsOffPage)
    await expect.soft(jsOffPage).toHaveURL(urlFor('/roles-and-addresses'))
    await shoot(jsOffPage, 'consignor-picker-js-off-enter-pressed')
  })
})

test.describe('address book list filters as the trader types', () => {
  test('typing or choosing a Type swaps the table and results line in the page; the pagination gets the hidden attribute but stays on screen', async ({ page }) => {
    recording.name = 'address-book-list-js-on'
    await page.goto(url('/address-book'))
    const book = addressBookParts(page)
    await pause(page)
    await shoot(page, 'address-book-initial')

    await book.filterSummary.click()
    await pause(page)
    await shoot(page, 'address-book-filter-open')
    await shoot(page, 'address-book-filter-controls', { element: book.filterForm })

    await book.search.click()
    await pause(page)
    await book.search.pressSequentially('Ballymore', { delay: 250 })
    await pause(page)
    await expect.soft(book.rows).toHaveCount(2)
    await expect.soft(book.count).toHaveText('Showing 1-2 of 2')
    await expect.soft(book.pagination).toHaveAttribute('hidden', '')
    await expect.soft(book.pagination).toBeVisible()
    await shoot(page, 'address-book-typed-ballymore')

    await book.type.selectOption({ label: 'Consignor' })
    await pause(page)
    await shoot(page, 'address-book-typed-ballymore-type-consignor')

    await book.search.fill('')
    await pause(page)
    await shoot(page, 'address-book-type-consignor-only')

    await book.type.selectOption({ index: 0 })
    await pause(page)
    await expect.soft(book.pagination).toBeVisible()
    await shoot(page, 'address-book-filters-cleared')

    await book.search.fill('Ballymore')
    await pause(page)
    await book.search.press('Enter')
    await pause(page)
    expect.soft(new URL(page.url()).search).toBe('')
    await shoot(page, 'address-book-enter-pressed')
  })

  test('without JavaScript the search button does nothing and Enter submits the GET form to the server', async ({ browser, page }, testInfo) => {
    recording.name = 'address-book-list-js-off'
    await page.goto(url('/address-book'))
    const jsOffPage = await openWithoutJavaScript(browser, page, testInfo, url('/address-book'))
    const book = addressBookParts(jsOffPage)
    await shoot(jsOffPage, 'address-book-js-off-initial')

    await book.filterSummary.click()
    await pause(jsOffPage)
    await book.search.fill('Ballymore')
    await pause(jsOffPage)
    await book.searchButton.click()
    await pause(jsOffPage)
    await expect.soft(jsOffPage).toHaveURL(urlFor('/address-book'))
    await shoot(jsOffPage, 'address-book-js-off-search-button-clicked')

    await book.search.press('Enter')
    await jsOffPage.waitForLoadState('load')
    await pause(jsOffPage)
    await expect.soft(jsOffPage).toHaveURL(/search=Ballymore/)
    await expect.soft(book.count).toHaveText('Showing 1-2 of 2')
    await shoot(jsOffPage, 'address-book-js-off-enter-pressed')

    await book.filterSummary.click()
    await pause(jsOffPage)
    await book.type.selectOption({ label: 'Consignor' })
    await pause(jsOffPage)
    await book.search.press('Enter')
    await jsOffPage.waitForLoadState('load')
    await pause(jsOffPage)
    await expect.soft(jsOffPage).toHaveURL(/type=/)
    await shoot(jsOffPage, 'address-book-js-off-type-consignor-submitted')
  })
})
