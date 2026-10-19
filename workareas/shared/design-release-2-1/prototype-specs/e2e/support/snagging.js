const fs = require('fs')
const path = require('path')

const SNAG_SCREENS_DIR = path.join(__dirname, '..', '..', '..', 'snagging', 'screens', 'prototype')

const DESKTOP = { width: 1280, height: 1200 }
const MOBILE = { width: 390, height: 844 }

async function settle (page) {
  await page.waitForLoadState('load')
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {})
  await page.waitForTimeout(300)
}

function fileName (snagId, state, { nojs = false, mobile = false } = {}) {
  return `${snagId}--${state}${nojs ? '--nojs' : ''}${mobile ? '--mobile' : ''}.png`
}

/**
 * Full-page screenshot of the current page state, saved once per snag id so
 * each snag's evidence stands alone: <snagId>--<state>[--nojs][--mobile].png.
 */
async function shoot (page, snagIds, state, flags = {}) {
  await settle(page)
  fs.mkdirSync(SNAG_SCREENS_DIR, { recursive: true })
  const ids = [].concat(snagIds)
  const first = path.join(SNAG_SCREENS_DIR, fileName(ids[0], state, flags))
  await page.screenshot({ path: first, fullPage: true })
  for (const id of ids.slice(1)) {
    fs.copyFileSync(first, path.join(SNAG_SCREENS_DIR, fileName(id, state, flags)))
  }
}

/**
 * Re-opens the current page in a second browser context that shares the
 * prototype session cookie, with JavaScript off and/or at phone width, and
 * shoots it. Pass `prepare` to act on the page (type, tick) before the shot.
 */
async function shootVariant (browser, page, snagIds, state, { nojs = false, mobile = false, prepare } = {}) {
  const storageState = await page.context().storageState()
  const context = await browser.newContext({
    storageState,
    javaScriptEnabled: !nojs,
    viewport: mobile ? MOBILE : DESKTOP
  })
  try {
    const variant = await context.newPage()
    await variant.goto(page.url())
    if (prepare) await prepare(variant)
    await shoot(variant, snagIds, state, { nojs, mobile })
  } finally {
    await context.close()
  }
}

const shootNoJs = (browser, page, snagIds, state, prepare) =>
  shootVariant(browser, page, snagIds, state, { nojs: true, prepare })

const shootMobile = (browser, page, snagIds, state, prepare) =>
  shootVariant(browser, page, snagIds, state, { mobile: true, prepare })

module.exports = { SNAG_SCREENS_DIR, shoot, shootVariant, shootNoJs, shootMobile }
