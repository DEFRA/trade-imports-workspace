import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  inlineAssets,
  webpDataUri,
  cwebpPath,
  spriteStyles
} from './artifact.js'
import { shot } from './card.js'

// A one-pixel PNG, so the encoder has something real to chew on without this
// test depending on a capture having been run.
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
)

// Resolved at module scope, because describe.skipIf is evaluated during
// collection — before any beforeAll has run. Computing it in a hook silently
// skips the whole file on a machine that does have the encoder.
const haveCwebp = (() => {
  try {
    return Boolean(cwebpPath())
  } catch {
    return false
  }
})()

let dir
let png

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'artifact-'))
  png = join(dir, 'fe-x__field-y.png')
  writeFileSync(png, PNG_1PX)
})

afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe.skipIf(!haveCwebp)('webpDataUri', () => {
  test('encodes to a WebP data URI', () => {
    const encoded = webpDataUri({ path: png })
    expect(encoded.uri.startsWith('data:image/webp;base64,')).toBe(true)
    expect(encoded.bytes).toBeGreaterThan(0)
  })

  test('leaves no scratch file behind, over hundreds of crops', () => {
    webpDataUri({ path: png })
    const left = readdirSync(tmpdir()).filter((name) =>
      name.startsWith(`parity-${process.pid}-`)
    )
    expect(left).toEqual([])
  })
})

describe.skipIf(!haveCwebp)('inlineAssets', () => {
  const sides = [{ id: 'frontend' }, { id: 'prototype' }]

  const items = () => [
    {
      id: 'inc-001',
      assets: [
        {
          frontend: {
            state: 'crop',
            screen: 'fe-x',
            anchorKey: 'field-y',
            path: png
          },
          prototype: { state: 'page', screen: 'dr21-x', path: png }
        },
        {
          frontend: { state: 'model', screen: 'fe-z', plate: { rows: [] } },
          prototype: { state: 'absent', screen: null }
        }
      ]
    }
  ]

  test('crops travel inside the file, declared once and pointed at', () => {
    const list = items()
    const result = inlineAssets({ items: list, sides })
    expect(result.inlined).toBe(1)
    expect(result.sprites[0].uri).toMatch(/^data:image\/webp;base64,/)
    expect(list[0].assets[0].frontend.spriteId).toBe(result.sprites[0].id)
  })

  test('the same crop on two cards is carried once, not twice', () => {
    const list = items()
    // The landmark a finding's absence is measured from is routinely also a
    // difference in its own right, so this is the common case rather than an
    // edge one — and a second copy is megabytes for no extra evidence.
    list[0].assets.push({
      frontend: {
        state: 'crop',
        screen: 'fe-x',
        anchorKey: 'field-y',
        path: png
      },
      prototype: { state: 'absent', screen: null }
    })
    const result = inlineAssets({ items: list, sides })
    expect(result.inlined).toBe(1)
    expect(result.uses).toBe(2)
    expect(
      spriteStyles(result.sprites).match(/data:image\/webp/g)
    ).toHaveLength(1)
  })

  test('a full page is linked, not shrunk to fit', () => {
    const list = items()
    const result = inlineAssets({ items: list, sides })
    const page = list[0].assets[0].prototype
    expect(result.linked).toBe(1)
    expect(page.state).toBe('page-link')
    expect(page.href).toBe(`file://${png}`)
  })

  test('the card says the full page exists and where, rather than going blank', () => {
    const list = items()
    inlineAssets({ items: list, sides })
    const html = shot({
      asset: list[0].assets[0].prototype,
      side: { id: 'prototype', label: 'Prototype' }
    })
    // An empty column would claim there is nothing on this side, which is a
    // different and false statement from "not carried in this copy".
    expect(html).toContain('Full page, not carried here')
    expect(html).toContain(png)
  })

  test('a page-model plate costs nothing and is left alone', () => {
    const list = items()
    inlineAssets({ items: list, sides })
    expect(list[0].assets[1].frontend.state).toBe('model')
  })
})
