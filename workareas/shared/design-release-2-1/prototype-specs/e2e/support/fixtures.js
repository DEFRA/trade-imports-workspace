const fs = require('fs')
const path = require('path')
const base = require('@playwright/test')

const META_DIR = path.join(__dirname, '..', '..', 'test-results', 'meta')

function slugify (value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

/**
 * Every test records the pages it visits (main-frame navigations, in order) so
 * the collected trace index can say which prototype URLs each trace covers.
 */
const test = base.test.extend({
  visitedPages: [async ({ page }, use, testInfo) => {
    // Every main-frame document request, so redirect hops (POST → 302 → GET,
    // /create-notification → /notification-type) are listed as well as the
    // page that finally rendered.
    const pages = []
    page.on('request', (request) => {
      if (!request.isNavigationRequest() || request.frame() !== page.mainFrame()) return
      const url = new URL(request.url())
      const entry = `${request.method() === 'POST' ? 'POST ' : ''}${url.pathname}${url.search}`
      if (pages[pages.length - 1] !== entry) pages.push(entry)
    })

    await use(pages)

    fs.mkdirSync(META_DIR, { recursive: true })
    const spec = path.basename(testInfo.file).replace(/\.fit\.spec\.js$/, '')
    const testTitle = testInfo.titlePath.slice(1).join(' › ')
    const file = `${spec}--${slugify(testTitle)}.json`
    fs.writeFileSync(path.join(META_DIR, file), JSON.stringify({
      spec,
      test: testTitle,
      testId: testInfo.testId,
      status: testInfo.status,
      pages
    }, null, 2))
  }, { auto: true }]
})

module.exports = { test, expect: base.expect, slugify, META_DIR }
