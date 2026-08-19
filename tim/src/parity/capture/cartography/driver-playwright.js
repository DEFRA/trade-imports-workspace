import { EXTRACTOR } from '../page-model.js'
import { CONTROL_EXTRACTOR } from './control-extractor.js'
import { TimError } from '../../../errors.js'

/**
 * The smallest bytes each format's sniffer accepts.
 *
 * An upload journey checks the header, not the extension, so a buffer of
 * zeroes is rejected for a reason the map would otherwise pin on the field.
 */
const FILE_HEADERS = {
  'application/pdf': Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'binary'),
  'image/png': Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6300010000050001',
    'hex'
  ),
  'image/jpeg': Buffer.from(
    'ffd8ffe000104a46494600010100000100010000ffd9',
    'hex'
  )
}

const ACTION_TIMEOUT = 15_000

const byName = (page, name) => page.locator(`[name="${name}"]`).first()

/**
 * Load Playwright, or say what to install.
 *
 * Imported at call time rather than at module load, so every pure module in
 * this folder — and every test of them — runs on a machine that has never had
 * a browser installed.
 *
 * @returns {Promise<object>}
 * @throws {TimError} MISSING_DEP
 */
export const loadPlaywright = async () => {
  try {
    return await import('playwright')
  } catch (error) {
    throw new TimError(
      'MISSING_DEP',
      'Playwright is not installed in tim. Run "npm install" in tim, then "npx playwright install chromium".',
      error
    )
  }
}

const fillStep = async (page, step) => {
  const field = byName(page, step.name)
  await field.fill(step.value, { timeout: ACTION_TIMEOUT })
  // The MOJ picker's calendar overlays whatever control comes next, and the
  // branch then dies for a reason nobody watching can see.
  if (step.dismissOverlay) await field.press('Escape')
}

const typeaheadStep = async (page, step) => {
  if (step.widget?.shape === 'accessible-autocomplete') {
    const input = page.locator(`#${step.name}`).first()
    await input.fill(step.label ?? step.value)
    await page
      .getByRole('option', { name: step.label ?? step.value, exact: false })
      .first()
      .click({ timeout: ACTION_TIMEOUT })
  } else {
    const input = byName(page, step.name)
    await input.click()
    await input.fill('')
    await input.pressSequentially(step.value, { delay: 30 })
    const option = page.locator(
      step.widget?.optionSelector ?? '[role="option"]'
    )
    try {
      await option.first().waitFor({ state: 'visible', timeout: 4_000 })
    } catch {
      // The widget renders its list on each input event and closes it on a blur
      // timer, so retype the last character when the list has already gone.
      await input.press('Backspace')
      await input.pressSequentially(step.value.slice(-1), { delay: 30 })
      await option.first().waitFor({ state: 'visible', timeout: 8_000 })
    }
    await option.first().click()
  }

  // Clicking the visible option and leaving the hidden input empty is the
  // classic silent failure: the page looks filled, the submit sends nothing,
  // and the error lands on the wrong field.
  const hiddenName = step.widget?.hiddenName
  if (hiddenName) {
    const hidden = await page
      .locator(`input[name="${hiddenName}"]`)
      .first()
      .inputValue()
      .catch(() => '')
    if (!hidden) {
      return { done: false, why: 'typeahead-visible-only' }
    }
  }
  return { done: true }
}

const submitStep = async (page, step) => {
  if (step.name && step.value) {
    const named = page.locator(
      `button[name="${step.name}"][value="${step.value}"]`
    )
    if (await named.count()) {
      await named.first().click({ timeout: ACTION_TIMEOUT })
      return
    }
  }
  await page
    .getByRole('button', { name: step.label ?? 'Continue', exact: false })
    .first()
    .click({ timeout: ACTION_TIMEOUT })
}

/**
 * The one file in the cartographer that drives a browser.
 *
 * Everything above it is pure and tested against scripted pages; everything
 * below it is Playwright. Keeping the seam here is what lets the state machine
 * — where every judgement about identity, coverage and honesty lives — be
 * exercised without Chromium.
 *
 * @param {object} args
 * @param {string} args.baseUrl
 * @param {string} [args.startPath]
 * @param {boolean} [args.headed]
 * @param {{width: number, height: number}} [args.viewport]
 * @returns {Promise<object>} A driver, plus close()
 */
export const openDriver = async ({
  baseUrl,
  startPath = '/',
  headed = false,
  viewport = { width: 1280, height: 1200 }
}) => {
  const { chromium } = await loadPlaywright()
  const browser = await chromium.launch({ headless: !headed })
  let context = null
  let page = null

  const reset = async () => {
    if (context) await context.close()
    context = await browser.newContext({
      baseURL: baseUrl,
      viewport,
      reducedMotion: 'reduce'
    })
    page = await context.newPage()
    await page.goto(startPath, { waitUntil: 'domcontentloaded' })
  }

  const perform = async (step) => {
    try {
      switch (step.kind) {
        case 'goto':
          await page.goto(step.path, { waitUntil: 'domcontentloaded' })
          return { done: true }
        case 'fill':
          await fillStep(page, step)
          return { done: true }
        case 'choose':
          await page
            .locator(`[name="${step.name}"][value="${step.value}"]`)
            .first()
            .check({ timeout: ACTION_TIMEOUT })
          return { done: true }
        case 'select':
          await byName(page, step.name).selectOption(step.value, {
            timeout: ACTION_TIMEOUT
          })
          return { done: true }
        case 'typeahead':
          return await typeaheadStep(page, step)
        case 'upload':
          await byName(page, step.name).setInputFiles({
            name: step.fileName,
            mimeType: step.mimeType,
            buffer: FILE_HEADERS[step.mimeType] ?? Buffer.from('cartographer')
          })
          return { done: true }
        case 'submit':
          await submitStep(page, step)
          await page.waitForLoadState('domcontentloaded')
          return { done: true }
        case 'follow':
          await page.goto(step.href, { waitUntil: 'domcontentloaded' })
          return { done: true }
        default:
          return { done: false, why: `Unknown step "${step.kind}".` }
      }
    } catch (error) {
      return { done: false, why: error.message }
    }
  }

  return {
    reset,
    url: () => page.url(),
    model: () => page.evaluate(EXTRACTOR),
    controls: () => page.evaluate(CONTROL_EXTRACTOR),
    perform,
    close: () => browser.close()
  }
}
