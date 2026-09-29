// Throwaway: full-page pictures of local-site/index.html at desktop and
// phone width, plus facts a picture cannot show (do the videos and
// pictures resolve, in what order are the headings).
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { expect, test } from '../../../../repos/trade-imports-plants-prototype/node_modules/@playwright/test/index.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PAGE = pathToFileURL(path.join(HERE, 'local-site', 'index.html')).href
const SCREENS = path.join(HERE, 'screens')

const SIZES = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'phone', width: 375, height: 812 }
]

for (const size of SIZES) {
  test(`demo page at ${size.name} width`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height })
    await page.goto(PAGE)
    await page.waitForLoadState('load')
    await page.screenshot({
      path: path.join(SCREENS, `demo-${size.name}.png`),
      fullPage: true
    })
    if (size.name !== 'desktop') {
      return
    }
    // The top of the page, at the size a stakeholder first sees it.
    await page.screenshot({ path: path.join(SCREENS, 'demo-desktop-first-screen.png') })

    const facts = await page.evaluate(async () => {
      const headings = [...document.querySelectorAll('h1, h2, h3')].map(
        (h) => `${h.tagName} ${h.textContent.trim().replace(/\s+/g, ' ')}`
      )
      const videos = await Promise.all(
        [...document.querySelectorAll('video')].map(
          (video) =>
            new Promise((resolve) => {
              const done = (ok) =>
                resolve({
                  src: video.getAttribute('src'),
                  poster: video.getAttribute('poster'),
                  ok,
                  seconds: Math.round(video.duration)
                })
              if (video.readyState >= 1) {
                done(true)
                return
              }
              video.addEventListener('loadedmetadata', () => done(true), { once: true })
              video.addEventListener('error', () => done(false), { once: true })
              video.load()
              setTimeout(() => done(video.readyState >= 1), 10000)
            })
        )
      )
      const images = [...document.querySelectorAll('img')]
      await Promise.all(
        images.map((img) => {
          img.loading = 'eager'
          return img.complete
            ? null
            : new Promise((resolve) => {
                img.addEventListener('load', resolve, { once: true })
                img.addEventListener('error', resolve, { once: true })
              })
        })
      )
      return {
        headings,
        videos,
        images: images.length,
        brokenImages: images
          .filter((img) => img.naturalWidth === 0)
          .map((img) => img.getAttribute('src')),
        detailsLinks: [...document.querySelectorAll('a')]
          .map((a) => a.getAttribute('href'))
          .filter((href) => href && href.startsWith('tests/'))
      }
    })
    writeFileSync(path.join(SCREENS, 'facts.json'), JSON.stringify(facts, null, 2))

    // A fresh load, as an old link arriving from elsewhere would be: a hash
    // change on the same document never re-runs the head script.
    await page.goto('about:blank')
    await page.goto(`${PAGE}#?q=@walkthrough`)
    await page.waitForURL(/tests\//)
    writeFileSync(path.join(SCREENS, 'forward.txt'), page.url())
    expect(page.url()).toContain('/tests/')
  })
}
