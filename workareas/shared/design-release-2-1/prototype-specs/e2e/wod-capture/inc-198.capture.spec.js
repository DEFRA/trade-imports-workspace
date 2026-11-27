const fs = require('fs')
const os = require('os')
const path = require('path')
const { test, expect } = require('@playwright/test')
const { url } = require('../support/journey')

const REVIEW = path.join(os.homedir(), 'git/defra/trade-imports-workspace/workareas/shared/design-release-2-1/waiting-on-design-review')
const SCREENS = path.join(REVIEW, 'screens/inc-198/prototype')
const VIDEOS = path.join(REVIEW, 'videos')
const LOGS = path.join(REVIEW, 'logs')

const ANIMALS_SUBMITTED = 'GBN-AG-26-7K8M2U'
const GERMINAL_SUBMITTED = 'GBN-GP-26-7K8M2Q'
const CLIPBOARD_SENTINEL = 'clipboard-before-click'

const pause = (page) => page.waitForTimeout(1000)
const shot = (name) => path.join(SCREENS, `${name}.png`)
const section = (page) => page.locator('section.app-dr2-import-reference-section')
const copyButtons = (page) => section(page).getByRole('button', { name: 'Copy' })

async function readClipboard (page) {
  return page.evaluate(async () => {
    try {
      return { text: await navigator.clipboard.readText() }
    } catch (error) {
      return { error: String(error) }
    }
  })
}

function recordFinding (name, finding) {
  fs.mkdirSync(LOGS, { recursive: true })
  fs.writeFileSync(path.join(LOGS, `inc-198--prototype--${name}.json`), JSON.stringify(finding, null, 2))
}

test.use({ video: 'on', viewport: { width: 1280, height: 800 } })

test.beforeAll(() => {
  fs.mkdirSync(SCREENS, { recursive: true })
  fs.mkdirSync(VIDEOS, { recursive: true })
})

test.afterEach(async ({ page }, testInfo) => {
  const video = page.video()
  await page.close()
  if (!video) return
  const slug = testInfo.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  fs.copyFileSync(await video.path(), path.join(VIDEOS, `inc-198--prototype--${slug}.webm`))
})

test.describe('import reference numbers on the prototype view', () => {
  test('live animals submitted view shows each value with a Copy button', async ({ page }) => {
    await page.goto(url(`/review-notification?reference=${ANIMALS_SUBMITTED}`))
    await expect(section(page)).toBeVisible()
    await pause(page)
    await page.screenshot({ path: shot('animals-view-js-on'), fullPage: true })
    await section(page).scrollIntoViewIfNeeded()
    await pause(page)
    await section(page).screenshot({ path: shot('animals-section-js-on') })
    await expect(copyButtons(page)).toHaveCount(2)
  })

  test('pressing Copy leaves the clipboard unchanged because the copy script is not loaded', async ({ page, context, baseURL }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseURL })
    await page.goto(url(`/review-notification?reference=${ANIMALS_SUBMITTED}`))
    await section(page).scrollIntoViewIfNeeded()
    await pause(page)
    await page.evaluate((text) => navigator.clipboard.writeText(text), CLIPBOARD_SENTINEL)
    await pause(page)

    await copyButtons(page).first().click()
    await pause(page)
    await section(page).screenshot({ path: shot('animals-section-after-copy-reference') })
    const afterReference = await readClipboard(page)

    await copyButtons(page).nth(1).click()
    await pause(page)
    await section(page).screenshot({ path: shot('animals-section-after-copy-code') })
    const afterCode = await readClipboard(page)

    recordFinding('clipboard', {
      reference: ANIMALS_SUBMITTED,
      sentinel: CLIPBOARD_SENTINEL,
      afterCopyReference: afterReference,
      afterCopyCustomsCode: afterCode,
      copyScriptLoaded: await page.evaluate(() =>
        [...document.scripts].some((script) => /copy-text-button/.test(script.src)))
    })
  })

  test('selecting the reference by hand highlights only the value', async ({ page }) => {
    await page.goto(url(`/review-notification?reference=${ANIMALS_SUBMITTED}`))
    const value = section(page).locator('.app-dr2-import-reference-section__value').first()
    await value.scrollIntoViewIfNeeded()
    await pause(page)
    await value.click({ clickCount: 3 })
    await pause(page)
    await section(page).screenshot({ path: shot('animals-section-reference-selected') })
  })

  test('germinal products submitted view shows the same section and code', async ({ page }) => {
    await page.goto(url(`/review-notification?reference=${GERMINAL_SUBMITTED}`))
    await expect(section(page)).toBeVisible()
    await pause(page)
    await page.screenshot({ path: shot('germinal-view-js-on'), fullPage: true })
    await section(page).scrollIntoViewIfNeeded()
    await pause(page)
    await section(page).screenshot({ path: shot('germinal-section-js-on') })
  })

  test('the testing 3 copy renders the same section', async ({ page }) => {
    await page.goto('/testing3')
    await pause(page)
    const submittedCard = page.getByRole('article', { name: 'Notification GB.2026.7963918' })
    await submittedCard.getByRole('link', { name: 'View' }).click()
    await expect(section(page)).toBeVisible()
    await pause(page)
    await page.screenshot({ path: shot('testing3-view-js-on'), fullPage: true })
    await section(page).scrollIntoViewIfNeeded()
    await pause(page)
    await section(page).screenshot({ path: shot('testing3-section-js-on') })
  })
})

test.describe('import reference numbers on the prototype view without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('the Copy buttons still show with JavaScript off', async ({ page }) => {
    await page.goto(url(`/review-notification?reference=${ANIMALS_SUBMITTED}`))
    await expect(section(page)).toBeVisible()
    await pause(page)
    await page.screenshot({ path: shot('animals-view-js-off'), fullPage: true })
    await section(page).scrollIntoViewIfNeeded()
    await pause(page)
    await section(page).screenshot({ path: shot('animals-section-js-off') })
    recordFinding('js-off', { copyButtonsShown: await copyButtons(page).count() })
  })
})

test.describe('import reference numbers on the prototype view at phone width', () => {
  test.use({ viewport: { width: 375, height: 800 } })

  test('the fixed-width key column at phone width', async ({ page }) => {
    await page.goto(url(`/review-notification?reference=${ANIMALS_SUBMITTED}`))
    await section(page).scrollIntoViewIfNeeded()
    await pause(page)
    await section(page).screenshot({ path: shot('animals-section-phone') })
    await page.screenshot({ path: shot('animals-view-phone'), fullPage: true })
    recordFinding('phone', {
      pageScrollsSideways: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    })
  })
})
