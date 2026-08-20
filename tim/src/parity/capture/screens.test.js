import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach
} from 'vitest'
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { chromium } from 'playwright'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import {
  CROP_PADDING,
  MASK_VOLATILE_IN_PAGE,
  buildManifest,
  captureRenderedHtml,
  captureScreen,
  clampCropBox,
  cropFileName,
  isUsableBox,
  loadAnchors,
  mergeManifestRows,
  resolveAnchor,
  rungsFor,
  writeManifest
} from './screens.js'
import { excludingHidden, selectorFor, textPattern } from '../resolution.js'

let dir

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tim-capture-screens-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

const page = { width: 1280, height: 4000 }

describe('clampCropBox', () => {
  test('adds the scroll offset, because the clip is applied to the full page', () => {
    const box = clampCropBox({
      rect: { left: 100, top: 50, width: 200, height: 80 },
      scroll: { x: 0, y: 900 },
      page
    })
    expect(box.y).toBe(950 - CROP_PADDING)
  })

  test('pads the box on every side', () => {
    const box = clampCropBox({
      rect: { left: 100, top: 100, width: 200, height: 80 },
      scroll: { x: 0, y: 0 },
      page
    })
    expect(box).toEqual({
      x: 100 - CROP_PADDING,
      y: 100 - CROP_PADDING,
      width: 200 + CROP_PADDING * 2,
      height: 80 + CROP_PADDING * 2
    })
  })

  test('never starts before the top left corner', () => {
    const box = clampCropBox({
      rect: { left: 4, top: 2, width: 100, height: 40 },
      scroll: { x: 0, y: 0 },
      page
    })
    expect(box.x).toBe(0)
    expect(box.y).toBe(0)
  })

  test('never runs off the bottom of the document', () => {
    const box = clampCropBox({
      rect: { left: 0, top: 3900, width: 200, height: 200 },
      scroll: { x: 0, y: 0 },
      page
    })
    expect(box.y + box.height).toBeLessThanOrEqual(page.height)
  })

  test('never runs off the right of the document', () => {
    const box = clampCropBox({
      rect: { left: 1200, top: 10, width: 200, height: 40 },
      scroll: { x: 0, y: 0 },
      page
    })
    expect(box.x + box.width).toBeLessThanOrEqual(page.width)
  })

  test('gives a hidden element a box of nothing rather than a negative one', () => {
    const box = clampCropBox({
      rect: { left: 0, top: 0, width: 0, height: 0 },
      scroll: { x: 0, y: 0 },
      page: { width: 0, height: 0 }
    })
    expect(box.width).toBe(0)
    expect(box.height).toBe(0)
  })
})

describe('isUsableBox', () => {
  test('refuses a box too small to show anything', () => {
    expect(isUsableBox({ width: 4, height: 400 })).toBe(false)
    expect(isUsableBox({ width: 400, height: 4 })).toBe(false)
  })

  test('accepts a box big enough to read', () => {
    expect(isUsableBox({ width: 200, height: 80 })).toBe(true)
  })
})

describe('cropFileName', () => {
  test('carries the screen and the anchor, which is how the manifest reads it back', () => {
    expect(cropFileName('fe-hub', 'reference')).toBe('fe-hub__reference.png')
  })
})

const HTML = '<html lang="en"><body><h1>Origin of the import</h1></body></html>'

/**
 * A stand-in for the Playwright page, which is the boundary these functions
 * talk to. Its screenshot writes a file, because the manifest row's hash is of
 * whatever landed on disk.
 */
const browserPage = (html = HTML) => ({
  evaluate: async (fn) => {
    if (fn === MASK_VOLATILE_IN_PAGE) return { substitutions: 0, values: [] }
    return {
      allFields: [],
      headings: [{ level: 'h1', text: 'Origin of the import' }]
    }
  },
  screenshot: async ({ path }) => writeFileSync(path, 'not really a png'),
  content: async () => html,
  url: () => 'http://localhost:3005/origin',
  title: async () => 'Origin of the import'
})

describe('captureRenderedHtml', () => {
  test('writes the rendered page under the screen id', async () => {
    const html = await captureRenderedHtml(browserPage(), 'fe-origin', dir)
    expect(html.file).toBe(join(dir, 'fe-origin.html'))
    expect(readFileSync(html.file, 'utf8')).toContain(
      '<h1>Origin of the import</h1>'
    )
  })

  test('hashes what landed on disk', async () => {
    const html = await captureRenderedHtml(browserPage(), 'fe-origin', dir)
    const bytes = readFileSync(html.file)
    expect(html.bytes).toBe(bytes.length)
    expect(html.sha256).toBe(createHash('sha256').update(bytes).digest('hex'))
  })

  test('a generated reference number does not change the hash run to run', async () => {
    const withRef = (reference) =>
      `<html lang="en"><body><p>${reference}</p></body></html>`
    const first = await captureRenderedHtml(
      browserPage(withRef('GBN-GB-25-ABC123')),
      'first',
      dir
    )
    const second = await captureRenderedHtml(
      browserPage(withRef('GBN-GB-25-ZZZ999')),
      'second',
      dir
    )
    expect(second.sha256).toBe(first.sha256)
  })

  test('a side that names no directory for rendered pages gets none', async () => {
    expect(await captureRenderedHtml(browserPage(), 'fe-origin', null)).toBe(
      null
    )
  })
})

describe('captureScreen', () => {
  const screenContext = (overrides) => ({
    captureDir: join(dir, 'evidence'),
    modelDir: join(dir, 'model'),
    htmlDir: join(dir, 'html'),
    deviceScaleFactor: 2,
    ...overrides
  })

  test('leaves the rendered page beside the picture, hashed in the manifest row', async () => {
    const row = await captureScreen(browserPage(), 'fe-origin', screenContext())
    expect(row.html.file).toBe(join(dir, 'html', 'fe-origin.html'))
    expect(readFileSync(row.html.file, 'utf8')).toContain(
      'Origin of the import'
    )
    expect(row.html.sha256).toBe(
      createHash('sha256').update(readFileSync(row.html.file)).digest('hex')
    )
  })

  test('a side that declares no rendered pages still gets a picture and a model', async () => {
    const row = await captureScreen(
      browserPage(),
      'fe-origin',
      screenContext({ htmlDir: null })
    )
    expect(row.html).toBe(null)
    expect(row.file).toBe('page/fe-origin.png')
    expect(readFileSync(row.model.file, 'utf8')).toContain(
      'Origin of the import'
    )
  })
})

describe('mergeManifestRows', () => {
  test('keeps what an earlier run captured', () => {
    const merged = mergeManifestRows(
      [{ screen: 'fe-hub' }, { screen: 'fe-origin' }],
      [{ screen: 'fe-declaration' }]
    )
    expect(merged.map((row) => row.screen)).toEqual([
      'fe-declaration',
      'fe-hub',
      'fe-origin'
    ])
  })

  test('replaces a screen this run re-captured', () => {
    const merged = mergeManifestRows(
      [{ screen: 'fe-hub', bytes: 1 }],
      [{ screen: 'fe-hub', bytes: 2 }]
    )
    expect(merged).toEqual([{ screen: 'fe-hub', bytes: 2 }])
  })

  test('leaves a row from before rendered pages existed alone', () => {
    const merged = mergeManifestRows(
      [{ screen: 'fe-hub', file: 'page/fe-hub.png' }],
      [{ screen: 'fe-origin', html: { file: 'fe-origin.html' } }]
    )
    expect(merged[0]).toEqual({ screen: 'fe-hub', file: 'page/fe-hub.png' })
  })

  test('folds a re-captured row in whole, rather than key by key', () => {
    const merged = mergeManifestRows(
      [{ screen: 'fe-hub', html: { file: 'stale.html' } }],
      [{ screen: 'fe-hub', file: 'page/fe-hub.png' }]
    )
    expect(merged).toEqual([{ screen: 'fe-hub', file: 'page/fe-hub.png' }])
  })

  test('copes with no earlier run at all', () => {
    expect(mergeManifestRows(undefined, [{ screen: 'a' }])).toEqual([
      { screen: 'a' }
    ])
  })
})

const context = {
  side: 'frontend',
  captureDir: null,
  modelDir: null,
  appSha: 'a'.repeat(40),
  harnessSha: 'b'.repeat(40),
  deviceScaleFactor: 2,
  viewport: { width: 1280, height: 1200 }
}

describe('buildManifest', () => {
  test('records what the pictures are of and how they were taken', () => {
    const manifest = buildManifest({
      context,
      rows: [{ screen: 'fe-hub' }],
      capturedOn: '2026-08-19T00:00:00.000Z'
    })
    expect(manifest).toMatchObject({
      side: 'frontend',
      appSha: 'a'.repeat(40),
      harnessSha: 'b'.repeat(40),
      capturedOn: '2026-08-19T00:00:00.000Z',
      deviceScaleFactor: 2,
      viewport: { width: 1280, height: 1200 }
    })
  })
})

describe('writeManifest', () => {
  test('writes an index the report can read', () => {
    const path = writeManifest([{ screen: 'fe-hub' }], {
      ...context,
      captureDir: dir
    })
    expect(JSON.parse(readFileSync(path, 'utf8')).rows).toEqual([
      { screen: 'fe-hub' }
    ])
  })

  test('a partial re-run does not erase what is already indexed', () => {
    writeManifest([{ screen: 'fe-hub' }, { screen: 'fe-origin' }], {
      ...context,
      captureDir: dir
    })
    const path = writeManifest([{ screen: 'fe-origin', bytes: 9 }], {
      ...context,
      captureDir: dir
    })
    expect(JSON.parse(readFileSync(path, 'utf8')).rows).toEqual([
      { screen: 'fe-hub' },
      { screen: 'fe-origin', bytes: 9 }
    ])
  })

  test('creates the capture directory', () => {
    const nested = join(dir, 'evidence', 'frontend@abc12345')
    const path = writeManifest([{ screen: 'fe-hub' }], {
      ...context,
      captureDir: nested
    })
    expect(path).toBe(join(nested, 'manifest.json'))
  })
})

describe('loadAnchors', () => {
  test('a side with no anchors simply gets no crops', () => {
    expect(loadAnchors(join(dir, 'anchors.frontend.json'))).toEqual({})
    expect(loadAnchors(null)).toEqual({})
  })

  test('reads the screens the anchor file declares', () => {
    const path = join(dir, 'anchors.frontend.json')
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      path,
      JSON.stringify({
        screens: { 'fe-hub': [{ key: 'reference', kind: 'field' }] }
      })
    )
    expect(loadAnchors(path)['fe-hub']).toEqual([
      { key: 'reference', kind: 'field' }
    ])
  })
})

/**
 * A page that answers a fixed set of asks.
 *
 * Keyed by what the locator was built from, so a test states which rung of the
 * ladder the page can answer and the ladder decides which one it reaches.
 */
const stubPage = (matches, hiddenKeys = []) => {
  const locator = (selector, hasText, visibleOnly = false) => {
    const key = hasText ? `${selector} :: ${hasText}` : selector
    return {
      selector,
      hasText,
      count: async () =>
        visibleOnly && hiddenKeys.includes(key) ? 0 : (matches[key] ?? 0),
      filter: ({ hasText: pattern, visible }) =>
        locator(
          selector,
          pattern === undefined ? hasText : String(pattern),
          visible === true || visibleOnly
        )
    }
  }
  return {
    locator: (selector) => locator(selector),
    getByLabel: (text) => locator(`label=${text}`),
    getByText: (pattern) => locator(`text=${String(pattern)}`)
  }
}

describe('rungsFor', () => {
  test('a label anchor never asks about a name attribute', () => {
    expect(rungsFor({ kind: 'label', text: 'Continue' })).toEqual([
      'label',
      'action',
      'heading',
      'row',
      'status',
      'text'
    ])
  })

  test('the rung the anchors stage settled on is tried first', () => {
    expect(rungsFor({ kind: 'label', text: 'Draft', role: 'status' })[0]).toBe(
      'status'
    )
  })

  test('the rest of the ladder still follows, so markup that moved is found', () => {
    expect(rungsFor({ kind: 'label', text: 'Draft', role: 'status' })).toEqual([
      'status',
      'label',
      'action',
      'heading',
      'row',
      'text'
    ])
  })
})

describe('resolveAnchor', () => {
  test('resolves a field by its name attribute', async () => {
    const page = stubPage({
      [excludingHidden(
        '[name="portOfExit"], [name^="portOfExit-"], [name^="portOfExit["]'
      )]: 1
    })

    const resolved = await resolveAnchor(page, {
      kind: 'field',
      name: 'portOfExit'
    })

    expect(resolved).toMatchObject({ role: 'field', matched: 1 })
  })

  test('falls to the button when no field and no label answers', async () => {
    const actions = excludingHidden(selectorFor('action'))
    const page = stubPage({
      [`${actions} :: ${textPattern('Continue', { exact: true })}`]: 2
    })

    const resolved = await resolveAnchor(page, {
      kind: 'label',
      text: 'Continue'
    })

    expect(resolved).toMatchObject({ role: 'action', matched: 2 })
  })

  test('an exact match is preferred to a prefix on the same rung', async () => {
    const actions = excludingHidden(selectorFor('action'))
    const page = stubPage({
      [`${actions} :: ${textPattern('Change', { exact: true })}`]: 1,
      [`${actions} :: ${textPattern('Change')}`]: 9
    })

    const resolved = await resolveAnchor(page, {
      kind: 'label',
      text: 'Change'
    })

    expect(resolved.matched).toBe(1)
  })

  test('the recorded rung is honoured over an earlier one', async () => {
    const page = stubPage({
      'label=Draft': 3,
      [`${excludingHidden(selectorFor('status'))} :: ${textPattern('Draft', { exact: true })}`]: 1
    })

    const resolved = await resolveAnchor(page, {
      kind: 'label',
      text: 'Draft',
      role: 'status'
    })

    expect(resolved).toMatchObject({ role: 'status', matched: 1 })
  })

  test('says nothing rather than guessing when the page has none of it', async () => {
    expect(
      await resolveAnchor(stubPage({}), { kind: 'label', text: 'Nowhere' })
    ).toBeNull()
  })

  test('says a control is hidden rather than cropping blank page', async () => {
    const selector = excludingHidden(
      '[name="consignee"], [name^="consignee-"], [name^="consignee["]'
    )
    const page = stubPage({ [selector]: 1 }, [selector])

    const resolved = await resolveAnchor(page, {
      kind: 'field',
      name: 'consignee'
    })

    expect(resolved).toMatchObject({ role: 'field', matched: 1, hidden: true })
  })

  test('prefers the instance the page actually shows', async () => {
    const actions = excludingHidden(selectorFor('action'))
    const exact = `${actions} :: ${textPattern('Remove', { exact: true })}`
    const page = stubPage({ [exact]: 4 })

    const resolved = await resolveAnchor(page, {
      kind: 'label',
      text: 'Remove'
    })

    expect(resolved.hidden).toBeUndefined()
  })

  test('refuses a kind it was never taught', async () => {
    expect(
      await resolveAnchor(stubPage({}), { kind: 'xpath', text: '//div' })
    ).toBeNull()
  })
})

// The stand-in page above cannot answer the question these functions exist to
// settle, which is what lands in the PNG. A real browser can, and Playwright is
// already a dependency: a machine with no chromium installed skips the block
// rather than failing on an install it was never asked to do.
const chromiumInstalled = (() => {
  try {
    return existsSync(chromium.executablePath())
  } catch {
    return false
  }
})()

const draftPage = (reference) =>
  `<html lang="en"><body style="font: 16px sans-serif">
    <strong>Draft ${reference}</strong>
    <h1>Arrival details</h1>
    <input name="portOfEntry" value="${reference}">
  </body></html>`

const BROWSER_TIMEOUT_MS = 60000

describe.skipIf(!chromiumInstalled)(
  'a real page, masked before the shot',
  () => {
    let browser

    beforeAll(async () => {
      browser = await chromium.launch()
    }, BROWSER_TIMEOUT_MS)

    afterAll(async () => {
      await browser?.close()
    })

    const shoot = async (html, screen) => {
      const tab = await browser.newPage()
      await tab.setContent(html)
      const row = await captureScreen(tab, screen, {
        captureDir: join(dir, 'evidence'),
        modelDir: join(dir, 'model'),
        htmlDir: join(dir, 'html'),
        deviceScaleFactor: 1
      })
      await tab.close()
      return row
    }

    test(
      'two runs differing only in the generated reference photograph the same',
      async () => {
        const first = await shoot(draftPage('GBN-AG-26-R8KR77'), 'first')
        const second = await shoot(draftPage('GBN-AG-26-9BPDPX'), 'second')

        // This is the whole point. Before the page was masked, these two bytes
        // differed and every capture reported every page as moved.
        expect(second.sha256).toBe(first.sha256)
        expect(second.html.sha256).toBe(first.html.sha256)
      },
      BROWSER_TIMEOUT_MS
    )

    test(
      'the row fingerprints the values it stood in for, so the difference is still visible',
      async () => {
        const first = await shoot(draftPage('GBN-AG-26-R8KR77'), 'first')
        const second = await shoot(draftPage('GBN-AG-26-9BPDPX'), 'second')

        expect(first.volatile.substitutions).toBeGreaterThan(0)
        expect(second.volatile.sha256).not.toBe(first.volatile.sha256)
      },
      BROWSER_TIMEOUT_MS
    )

    test(
      'a page that genuinely reads differently still photographs differently',
      async () => {
        const first = await shoot(draftPage('GBN-AG-26-R8KR77'), 'first')
        const changed = await shoot(
          draftPage('GBN-AG-26-R8KR77').replace(
            'Arrival details',
            'Arrival and exit details'
          ),
          'changed'
        )

        expect(changed.sha256).not.toBe(first.sha256)
        expect(changed.html.sha256).not.toBe(first.html.sha256)
      },
      BROWSER_TIMEOUT_MS
    )

    test(
      'a page carrying no generated value fingerprints the same every run',
      async () => {
        const html = '<html lang="en"><body><h1>Sign in</h1></body></html>'
        const first = await shoot(html, 'first')
        const second = await shoot(html, 'second')

        // Nothing to explain a pixel difference away with, which is what keeps a
        // styling regression on such a page reportable.
        expect(second.volatile.sha256).toBe(first.volatile.sha256)
        expect(second.volatile.substitutions).toBe(0)
      },
      BROWSER_TIMEOUT_MS
    )
  }
)
