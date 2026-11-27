// Checks which Design Release 2.1 pages open straight from a link, in a fresh
// browser with no answers in the session, so the evidence page can link to them.
const fs = require('fs')
const path = require('path')
const { test } = require('@playwright/test')

const OUT = path.join(__dirname, '..', '..', '..', 'waiting-on-design-review', 'play-links-prototype.json')

const PATHS = (process.env.PLAY_PATHS || [
  '/what-are-you-importing',
  '/transit-countries',
  '/origin-of-the-import',
  '/consignor-or-exporter',
  '/place-of-origin',
  '/address-book',
  '/address-book/add',
  '/address-book/add/lookup',
  '/consignee/add-address',
  '/transporter/add/commercial',
  '/review-notification?reference=GBN-AG-26-7K8M2U',
  '/review-notification?reference=GBN-GP-26-7K8M2Q'
].join(',')).split(',')

test('each page opens from a link with no answers', async ({ browser }) => {
  const results = []
  for (const p of PATHS) {
    const context = await browser.newContext()
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    const response = await page.goto(`/design-release-2.1${p}`)
    results.push({
      path: p,
      status: response?.status(),
      finalUrl: new URL(page.url()).pathname + new URL(page.url()).search,
      h1: (await page.locator('h1').first().innerText().catch(() => '')).trim(),
      errorSummary: await page.locator('.govuk-error-summary').count(),
      inputs: await page.locator('main input:not([type=hidden]), main select').count(),
      errors
    })
    await context.close()
  }
  fs.writeFileSync(OUT, `${JSON.stringify(results, null, 2)}\n`)
})
