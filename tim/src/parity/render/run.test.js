import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { attachAssets } from './run.js'
import { shot } from './card.js'

let root
let sides
let assetDir

const sideAt = (dir, id, prefix) => ({
  id,
  label: id === 'frontend' ? 'Frontend' : 'Design release 1',
  repo: id,
  screenPrefix: prefix,
  captureDir: join(dir, id),
  screensDir: join(dir, id, 'screens'),
  modelDir: join(dir, id, 'model')
})

const writeCrop = (side, name) =>
  writeFileSync(join(side.captureDir, 'crop', name), `png:${name}`)

const item = (overrides = {}) => ({
  id: 'inc-001',
  screens: ['fe-documents', 'dr1-documents'],
  visual: [],
  detail: 'The prototype asks which kind of paperwork this is.',
  sections: {},
  ...overrides
})

const insertionAnchor = () => ({
  kind: 'field',
  name: 'quantity',
  key: 'field-quantity',
  why: 'insertion point named by inc-001',
  insertions: [
    {
      missing: ['accompanyingDocumentType'],
      relation: 'after',
      named: 'Quantity',
      caption: 'This side has no Document type. It would sit after Quantity.'
    }
  ]
})

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-parity-render-'))
  sides = [sideAt(root, 'frontend', 'fe-'), sideAt(root, 'prototype', 'dr1-')]
  for (const side of sides) {
    mkdirSync(join(side.captureDir, 'crop'), { recursive: true })
    mkdirSync(side.screensDir, { recursive: true })
  }
  assetDir = join(root, 'report', 'assets')
  mkdirSync(assetDir, { recursive: true })
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const attach = ({ items, anchors }) =>
  attachAssets({
    items,
    sides,
    pairIndex: new Map(),
    assetDir,
    anchors,
    inline: false
  })

describe('attachAssets', () => {
  test('the side with nothing to show gets the insertion crop and its caption', () => {
    writeCrop(sides[0], 'fe-documents__field-quantity.png')
    const items = [item()]

    attach({
      items,
      anchors: { frontend: { 'fe-documents': [insertionAnchor()] } }
    })

    const asset = items[0].assets[0].frontend
    expect(asset.state).toBe('crop')
    expect(asset.anchorKey).toBe('field-quantity')
    expect(asset.insertions[0].caption).toBe(
      'This side has no Document type. It would sit after Quantity.'
    )
  })

  test('a control the prose names is shown instead of an insertion', () => {
    writeCrop(sides[0], 'fe-documents__field-quantity.png')
    writeCrop(sides[0], 'fe-documents__field-species.png')
    const items = [
      item({ detail: 'The frontend asks for species before anything else.' })
    ]

    attach({
      items,
      anchors: {
        frontend: {
          'fe-documents': [
            {
              kind: 'field',
              name: 'species',
              key: 'field-species',
              why: 'named by inc-001'
            },
            insertionAnchor()
          ]
        }
      }
    })

    // Insertion points answer the weaker question, so they rank below anything
    // the finding's own prose named.
    const asset = items[0].assets[0].frontend
    expect(asset.anchorKey).toBe('field-species')
    expect(asset.insertions).toBeUndefined()
  })

  test('the caption reaches the rendered card', () => {
    writeCrop(sides[0], 'fe-documents__field-quantity.png')
    const items = [item()]

    attach({
      items,
      anchors: { frontend: { 'fe-documents': [insertionAnchor()] } }
    })
    const html = shot({ asset: items[0].assets[0].frontend, side: sides[0] })

    expect(html).toContain(
      'This side has no Document type. It would sit after Quantity.'
    )
    expect(html).toContain('shot__figure--insertion')
    expect(html).toContain('Where it would go')
  })
})
