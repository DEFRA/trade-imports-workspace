import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { attachAssets, capturedPages, reportWarnings } from './run.js'
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

describe('capturedPages', () => {
  const manifestAt = (side, rows) => {
    writeFileSync(
      side.manifest,
      JSON.stringify({ side: side.id, rows }, null, 2)
    )
  }

  test('reads the page hash and the fingerprint the capture recorded', () => {
    const side = { ...sides[0], manifest: join(root, 'manifest.json') }
    manifestAt(side, [
      {
        screen: 'fe-documents',
        sha256: 'picture',
        html: { sha256: 'page-1' },
        volatile: { substitutions: 3, sha256: 'ref-1' }
      }
    ])

    expect(capturedPages([side])).toEqual({
      frontend: { 'fe-documents': { content: 'page-1', volatile: 'ref-1' } }
    })
  })

  test('a capture that recorded neither yields nulls, not a guess', () => {
    const side = { ...sides[0], manifest: join(root, 'manifest.json') }
    manifestAt(side, [{ screen: 'fe-documents', sha256: 'picture' }])

    expect(capturedPages([side]).frontend['fe-documents']).toEqual({
      content: null,
      volatile: null
    })
  })

  test('a side with no manifest on disk contributes nothing', () => {
    const side = { ...sides[0], manifest: join(root, 'absent.json') }
    expect(capturedPages([side])).toEqual({ frontend: {} })
  })
})

describe('attachAssets and the seal', () => {
  test('the picture carries what its own capture recorded about the page', () => {
    writeCrop(sides[0], 'fe-documents__field-quantity.png')
    const items = [item()]

    attachAssets({
      items,
      sides,
      pairIndex: new Map(),
      assetDir,
      anchors: { frontend: { 'fe-documents': [insertionAnchor()] } },
      captured: {
        frontend: { 'fe-documents': { content: 'page-1', volatile: 'ref-1' } }
      },
      inline: false
    })

    expect(items[0].assets[0].frontend).toMatchObject({
      contentSha: 'page-1',
      volatileSha: 'ref-1'
    })
  })
})

describe('reportWarnings', () => {
  const joinReport = { unmatchedIncrements: ['inc-001', 'inc-002'] }

  test('a corpus with no upstream file is not asked to match one', () => {
    expect(
      reportWarnings({
        upstream: false,
        joinReport,
        gap: [],
        drift: []
      })
    ).toEqual([])
  })

  test('a corpus that declares an upstream still says when the join failed', () => {
    expect(
      reportWarnings({
        upstream: true,
        joinReport,
        gap: [],
        drift: []
      })
    ).toEqual([
      '2 increments matched no upstream finding, so their audit record is missing.'
    ])
  })

  test('moved pictures are counted by picture and by finding', () => {
    const [warning] = reportWarnings({
      upstream: false,
      joinReport,
      gap: [],
      drift: [
        { id: 'inc-001', kind: 'content-changed' },
        { id: 'inc-001', kind: 'pixels-changed' }
      ]
    })
    expect(warning).toContain('2 pictures moved')
    expect(warning).toContain('across 1 findings')
  })
})
