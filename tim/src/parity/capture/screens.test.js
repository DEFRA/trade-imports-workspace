import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  CROP_PADDING,
  buildManifest,
  clampCropBox,
  cropFileName,
  isUsableBox,
  loadAnchors,
  mergeManifestRows,
  writeManifest
} from './screens.js'

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
