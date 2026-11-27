const fs = require('fs')
const os = require('os')
const path = require('path')
const { test, expect } = require('@playwright/test')
const { url, urlFor, startNotification, answerOrigin, saveAndContinue } = require('../support/journey')

const REVIEW_DIR = path.join(os.homedir(), 'git/defra/trade-imports-workspace/workareas/shared/design-release-2-1/waiting-on-design-review')
const SHOTS_DIR = path.join(REVIEW_DIR, 'screens/inc-014/prototype')
const VIDEOS_DIR = path.join(REVIEW_DIR, 'videos')
const VIEWPORT = { width: 1280, height: 800 }
const TYPING_DELAY_MS = 150

test.use({ video: 'on', viewport: VIEWPORT })

const pause = (page) => page.waitForTimeout(1000)

async function shot (page, state, { locator, fullPage = true } = {}) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true })
  const file = path.join(SHOTS_DIR, `${state}.png`)
  if (locator) {
    await locator.screenshot({ path: file })
  } else {
    await page.screenshot({ path: file, fullPage })
  }
}

async function liveRegionText (page) {
  return (await page.locator('#commodity-search-status').textContent()).trim()
}

async function shotLiveRegion (page, state) {
  const text = await liveRegionText(page)
  await page.evaluate((announced) => {
    const note = document.createElement('div')
    note.id = 'capture-live-region-note'
    note.textContent = `Polite live region (visually hidden) now holds: "${announced}"`
    note.style.cssText = 'position:fixed;top:8px;right:8px;z-index:9999;max-width:420px;padding:12px;background:#0b0c0c;color:#fff;font:bold 16px/1.4 arial,sans-serif;border:4px solid #ffdd00'
    document.body.appendChild(note)
  }, text)
  await shot(page, state, { fullPage: false })
  await page.evaluate(() => document.getElementById('capture-live-region-note').remove())
  return text
}

function writeNotes (name, notes) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true })
  fs.writeFileSync(path.join(SHOTS_DIR, `${name}.json`), JSON.stringify(notes, null, 2))
}

async function openLiveAnimalsCommodityPage (page) {
  await startNotification(page, 'live-animals')
  await answerOrigin(page)
  await expect(page).toHaveURL(urlFor('/what-are-you-importing'))
  await pause(page)
}

async function typeSlowly (page, text) {
  await page.locator('#commodity-search').pressSequentially(text, { delay: TYPING_DELAY_MS })
  await pause(page)
}

test.afterEach(async ({ page }, testInfo) => {
  const videoAnnotation = testInfo.annotations.find((annotation) => annotation.type === 'video-name')
  await page.close()
  if (!videoAnnotation) return
  const videoName = videoAnnotation.description
  fs.mkdirSync(VIDEOS_DIR, { recursive: true })
  fs.copyFileSync(await page.video().path(), path.join(VIDEOS_DIR, `inc-014--prototype--${videoName}.webm`))
})

test.describe('commodity search as you type', () => {
  test('lists results as the trader types, from the third character', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'video-name', description: 'results-as-you-type' })
    const input = page.locator('#commodity-search')
    const results = page.locator('#commodity-search-results')

    await openLiveAnimalsCommodityPage(page)
    await shot(page, 'empty')
    await shot(page, 'search-control', { locator: page.locator('.app-commodity-search-panel') })

    await input.click()
    await pause(page)
    await typeSlowly(page, 'ca')
    await expect(results).toBeHidden()
    await shot(page, 'typed-2-characters-no-results')

    await typeSlowly(page, 't')
    await expect(results).toBeVisible()
    await shot(page, 'typed-cat-results')
    await shot(page, 'typed-cat-results-list', { locator: results })

    await typeSlowly(page, 'tle')
    await expect(results).toContainText('Bos taurus')
    await shot(page, 'typed-cattle-results')
    const cattleAnnouncement = await shotLiveRegion(page, 'live-region-results-count')

    await input.fill('')
    await pause(page)
    await typeSlowly(page, 'zzz')
    await expect(results).toContainText('No results found')
    await shot(page, 'no-results')
    const noResultsAnnouncement = await shotLiveRegion(page, 'live-region-no-results')

    writeNotes('results-as-you-type', {
      cattleAnnouncement,
      noResultsAnnouncement,
      resultsAriaLabel: await results.getAttribute('aria-label'),
      buttonAccessibleName: await page.locator('.app-commodity-search__button').innerText()
    })
  })

  test('ticking keeps the text and results open, Escape closes them, Clear all empties the panel', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'video-name', description: 'tick-escape-clear' })
    const input = page.locator('#commodity-search')
    const results = page.locator('#commodity-search-results')
    const selectedPanel = page.locator('#commodity-search-selected')

    await openLiveAnimalsCommodityPage(page)
    await input.click()
    await typeSlowly(page, 'cattle')

    await page.locator('#commodity-species-cattle-bos-taurus').check()
    await pause(page)
    await expect(results).toBeVisible()
    await expect(input).toHaveValue('cattle')
    await shot(page, 'ticked-one-results-stay-open')
    const oneSelected = await shotLiveRegion(page, 'live-region-1-option-selected')

    await page.locator('#commodity-species-cattle-bison-bison').check()
    await pause(page)
    await shot(page, 'ticked-two')
    const twoSelected = await shotLiveRegion(page, 'live-region-2-options-selected')
    await shot(page, 'selected-panel', { locator: selectedPanel })

    await input.press('Escape')
    await pause(page)
    await expect(results).toBeHidden()
    await expect(selectedPanel).toBeVisible()
    await shot(page, 'after-escape')
    const inputValueAfterEscape = await input.inputValue()

    await selectedPanel.getByRole('button', { name: 'Remove Bison bison' }).click()
    await pause(page)
    await shot(page, 'after-remove-chip')
    const afterRemove = await shotLiveRegion(page, 'live-region-after-remove-chip')

    await selectedPanel.getByRole('button', { name: 'Clear all' }).click()
    await pause(page)
    await expect(selectedPanel).toBeHidden()
    await shot(page, 'after-clear-all')
    const afterClearAll = await shotLiveRegion(page, 'live-region-after-clear-all')

    writeNotes('tick-escape-clear', { oneSelected, twoSelected, inputValueAfterEscape, afterRemove, afterClearAll })
  })

  test('a species chosen as you type is saved by Save and continue', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'video-name', description: 'save-and-continue' })
    const input = page.locator('#commodity-search')

    await openLiveAnimalsCommodityPage(page)
    await input.click()
    await typeSlowly(page, 'cattle')
    await page.locator('#commodity-species-cattle-bos-taurus').check()
    await pause(page)
    await input.press('Escape')
    await pause(page)
    await shot(page, 'before-save')

    await saveAndContinue(page)
    await expect(page).toHaveURL(urlFor('/reason-for-import'))
    await pause(page)
    await shot(page, 'saved-next-page')

    await page.goto(url('/what-are-you-importing'))
    await pause(page)
    await expect(page.locator('#commodity-search-selected')).toBeVisible()
    await shot(page, 'saved-selection-reopened')
  })

  test('germinal search for semen lists the semen commodities and announces the count', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'video-name', description: 'germinal-semen' })
    const results = page.locator('#commodity-search-results')

    await page.goto(url('/create-notification?category=germinal-products'))
    await expect(page).toHaveURL(urlFor('/origin-of-the-import'))
    await answerOrigin(page, { search: 'Neth', country: 'Netherlands' })
    await expect(page).toHaveURL(urlFor('/what-are-you-importing'))
    await pause(page)
    await shot(page, 'germinal-empty')

    await page.locator('#commodity-search').click()
    await typeSlowly(page, 'semen')
    await expect(results).toContainText('Cattle, Semen (05111000)')
    await shot(page, 'germinal-semen-results')
    await shot(page, 'germinal-semen-results-list', { locator: results })
    const announcement = await shotLiveRegion(page, 'germinal-live-region-results-count')

    writeNotes('germinal-semen', {
      announcement,
      commodityHeadings: await results.locator('.app-commodity-search__row--commodity-header').allInnerTexts(),
      speciesRows: await results.locator('.app-commodity-search__row--species').count()
    })
  })

  test('without JavaScript the search lists nothing and Enter submits the empty form', async ({ page, browser }, testInfo) => {
    await openLiveAnimalsCommodityPage(page)

    const noJsContext = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: testInfo.project.use.baseURL,
      storageState: await page.context().storageState(),
      viewport: VIEWPORT,
      recordVideo: { dir: testInfo.outputPath('no-js-video'), size: VIEWPORT }
    })
    const noJsPage = await noJsContext.newPage()
    const input = noJsPage.locator('#commodity-search')

    await noJsPage.goto(url('/what-are-you-importing'))
    await pause(noJsPage)
    await shot(noJsPage, 'nojs-empty')

    await input.click()
    await input.pressSequentially('cattle', { delay: TYPING_DELAY_MS })
    await pause(noJsPage)
    await shot(noJsPage, 'nojs-typed-no-results')

    await noJsPage.locator('.app-commodity-search__button').click()
    await pause(noJsPage)
    await shot(noJsPage, 'nojs-icon-button-pressed')
    const urlAfterButton = noJsPage.url()

    await input.press('Enter')
    await noJsPage.waitForLoadState('load')
    await pause(noJsPage)
    await shot(noJsPage, 'nojs-enter-submits-form')

    writeNotes('without-javascript', {
      urlAfterButton,
      urlAfterEnter: noJsPage.url(),
      errorSummary: await noJsPage.locator('.govuk-error-summary').allInnerTexts(),
      checkboxesOnPage: await noJsPage.locator('input[type="checkbox"]').count()
    })

    await noJsPage.close()
    fs.mkdirSync(VIDEOS_DIR, { recursive: true })
    fs.copyFileSync(await noJsPage.video().path(), path.join(VIDEOS_DIR, 'inc-014--prototype--without-javascript.webm'))
    await noJsContext.close()
  })
})
