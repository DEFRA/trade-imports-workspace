const fs = require('fs')
const os = require('os')
const path = require('path')
const { test, expect } = require('@playwright/test')
const { url, urlFor, startNotification, saveAndContinue } = require('../support/journey')

const ROW = 'inc-189'
const SIDE = 'prototype'
const REVIEW_DIR = path.join(os.homedir(), 'git/defra/trade-imports-workspace/workareas/shared/design-release-2-1/waiting-on-design-review')
const SCREENS_DIR = path.join(REVIEW_DIR, 'screens', ROW, SIDE)
const VIDEOS_DIR = path.join(REVIEW_DIR, 'videos')
const PAUSE_MS = 1000
const TYPING_DELAY_MS = 150

test.use({ video: 'on', viewport: { width: 1280, height: 800 } })

const slugOf = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const pause = (page) => page.waitForTimeout(PAUSE_MS)
const countryInput = (page) => page.locator('#country-of-origin')
const countryGroup = (page) => page.locator('.app-origin-country')
const countryOption = (page, name) => page.locator('button.app-country-search__option', { hasText: name }).first()

async function shot (page, state, { fullPage = false, locator } = {}) {
  const file = path.join(SCREENS_DIR, `${state}.png`)
  if (locator) {
    await locator.screenshot({ path: file })
    return
  }
  await page.screenshot({ path: file, fullPage })
}

async function saveAriaSnapshot (page, state) {
  fs.mkdirSync(SCREENS_DIR, { recursive: true })
  const snapshot = await countryGroup(page).ariaSnapshot()
  fs.writeFileSync(path.join(SCREENS_DIR, `${state}.aria.txt`), `${snapshot}\n`)
}

async function readScreenReaderText (page) {
  return page.evaluate(() => {
    const input = document.querySelector('#country-of-origin')
    const results = document.querySelector('#country-search-results')
    const status = document.querySelector('.app-country-search__status')
    const label = document.querySelector('label[for="country-of-origin"]')
    return [
      `Search box: <input type="${input.type}"> placeholder="${input.placeholder}"`,
      `Search box <label>: ${label ? `"${label.textContent.trim()}"` : 'none'}`,
      `Search box aria-label: ${input.getAttribute('aria-label') ?? 'none'}`,
      `Typed value: "${input.value}"`,
      `Results list: role="${results.getAttribute('role')}" aria-label="${results.getAttribute('aria-label')}"${results.hidden ? ' (hidden)' : ''}`,
      `Results shown: ${results.querySelectorAll('.app-country-search__option').length} buttons`,
      `Live region (aria-live="${status.getAttribute('aria-live')}"): "${status.textContent.trim()}"`
    ]
  })
}

async function shotScreenReaderPanel (page, state, title) {
  const lines = await readScreenReaderText(page)
  await page.evaluate(({ title, lines }) => {
    const panel = document.createElement('div')
    panel.setAttribute('data-capture-panel', '')
    panel.setAttribute('aria-hidden', 'true')
    Object.assign(panel.style, {
      position: 'fixed',
      right: '16px',
      bottom: '16px',
      maxWidth: '620px',
      zIndex: '2147483647',
      background: '#fff7bf',
      border: '3px solid #0b0c0c',
      padding: '12px 16px',
      font: '15px/1.45 monospace',
      color: '#0b0c0c',
      whiteSpace: 'pre-wrap'
    })
    panel.textContent = [`What a screen reader is given: ${title}`, '', ...lines].join('\n')
    document.body.append(panel)
  }, { title, lines })
  await pause(page)
  await shot(page, state)
  await page.evaluate(() => document.querySelector('[data-capture-panel]')?.remove())
}

async function typeIntoCountrySearch (page, text) {
  const input = countryInput(page)
  await input.click()
  await pause(page)
  await input.fill('')
  await input.pressSequentially(text, { delay: TYPING_DELAY_MS })
  await pause(page)
}

test.afterEach(async ({ page }, testInfo) => {
  const video = page.video()
  await page.close()
  if (!video) return
  fs.mkdirSync(VIDEOS_DIR, { recursive: true })
  fs.copyFileSync(await video.path(), path.join(VIDEOS_DIR, `${ROW}--${SIDE}--${slugOf(testInfo.title)}.webm`))
})

test.describe('country search with JavaScript', () => {
  test('live animals results label', async ({ page }) => {
    await startNotification(page, 'live-animals')
    await pause(page)
    await shot(page, 'live-animals--origin-empty', { fullPage: true })
    await saveAriaSnapshot(page, 'live-animals--origin-empty')

    await typeIntoCountrySearch(page, 'Fra')
    await expect(countryOption(page, 'France')).toBeVisible()
    await pause(page)
    await shot(page, 'live-animals--results-open', { fullPage: true })
    await shot(page, 'live-animals--results-list', { locator: countryGroup(page) })
    await saveAriaSnapshot(page, 'live-animals--results-open')
    await shotScreenReaderPanel(page, 'live-animals--results-screen-reader', 'after typing "Fra"')
  })

  test('live animals selected announcement', async ({ page }) => {
    await startNotification(page, 'live-animals')
    await pause(page)
    await typeIntoCountrySearch(page, 'Fra')
    await expect(countryOption(page, 'France')).toBeVisible()

    await countryOption(page, 'France').click()
    await pause(page)
    await expect(page.locator('.app-country-search__status')).toHaveText('Selected France')
    await shot(page, 'live-animals--country-chosen', { locator: countryGroup(page) })
    await saveAriaSnapshot(page, 'live-animals--country-chosen')
    await shotScreenReaderPanel(page, 'live-animals--selected-screen-reader', 'after choosing France')
  })

  test('live animals search thresholds and no results', async ({ page }) => {
    await startNotification(page, 'live-animals')
    await pause(page)

    await typeIntoCountrySearch(page, 'Fr')
    await shot(page, 'live-animals--two-letters', { locator: countryGroup(page) })
    await shotScreenReaderPanel(page, 'live-animals--two-letters-screen-reader', 'after typing "Fr"')

    await countryInput(page).pressSequentially('x', { delay: TYPING_DELAY_MS })
    await pause(page)
    await expect(page.locator('.app-commodity-search__no-results')).toHaveText('No results found')
    await shot(page, 'live-animals--no-results', { locator: countryGroup(page) })
    await shotScreenReaderPanel(page, 'live-animals--no-results-screen-reader', 'after typing "Frx"')
  })

  test('germinal products results label and selected announcement', async ({ page }) => {
    await page.goto(url('/create-notification?category=germinal-products'))
    await expect(page).toHaveURL(urlFor('/origin-of-the-import'))
    await pause(page)
    await shot(page, 'germinal--origin-empty', { fullPage: true })

    await typeIntoCountrySearch(page, 'Neth')
    await expect(countryOption(page, 'Netherlands')).toBeVisible()
    await pause(page)
    await shot(page, 'germinal--results-open', { fullPage: true })
    await shotScreenReaderPanel(page, 'germinal--results-screen-reader', 'after typing "Neth"')

    await countryOption(page, 'Netherlands').click()
    await pause(page)
    await expect(page.locator('.app-country-search__status')).toHaveText('Selected Netherlands')
    await shotScreenReaderPanel(page, 'germinal--selected-screen-reader', 'after choosing Netherlands')
  })
})

test.describe('country search without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('no javascript typed country', async ({ page }) => {
    await startNotification(page, 'live-animals')
    await pause(page)
    await shot(page, 'no-js--origin-empty', { fullPage: true })
    await saveAriaSnapshot(page, 'no-js--origin-empty')

    await countryInput(page).click()
    await pause(page)
    await countryInput(page).pressSequentially('France', { delay: TYPING_DELAY_MS })
    await pause(page)
    await page.locator('input[name="regionOfOriginRequired"][value="No"]').check()
    await pause(page)
    await shot(page, 'no-js--typed-country', { fullPage: true })

    await saveAndContinue(page)
    await pause(page)
    await shot(page, 'no-js--after-save', { fullPage: true })

    await page.goto(url('/origin-of-the-import'))
    await pause(page)
    await shot(page, 'no-js--origin-reopened', { locator: countryGroup(page) })
  })
})
