import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  modelPlate,
  resolveSideAsset,
  resolveRow,
  imageCoverage
} from './resolve.js'
import { indexPairs, screenPairsFor } from './pairs.js'

let dir
let side

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tim-parity-assets-'))
  mkdirSync(join(dir, 'capture', 'model'), { recursive: true })
  mkdirSync(join(dir, 'capture', 'screens'), { recursive: true })
  mkdirSync(join(dir, 'capture', 'crop'), { recursive: true })
  side = {
    id: 'prototype',
    screenPrefix: 'dr21-',
    captureDir: join(dir, 'capture'),
    modelDir: join(dir, 'capture', 'model'),
    screensDir: join(dir, 'capture', 'screens'),
    captureCommand: 'tools/parity/capture-screens.sh --side prototype'
  }
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

const writeModel = (screen, model) =>
  writeFileSync(join(side.modelDir, `${screen}.json`), JSON.stringify(model))

describe('modelPlate', () => {
  test('lists the page in document order', () => {
    const plate = modelPlate({
      h1: 'Arrival details',
      headings: [
        { level: 'h1', text: 'Arrival details' },
        { level: 'h2', text: 'Transport' }
      ],
      allFields: [
        { kind: 'hidden', name: 'crumb' },
        { kind: 'input:text', name: 'a', label: 'Arrival date' }
      ]
    })
    expect(plate.rows.map((r) => r.kind)).toEqual(['h1', 'heading', 'field'])
  })

  test('drops hidden machinery fields', () => {
    const plate = modelPlate({ allFields: [{ kind: 'hidden', name: 'crumb' }] })
    expect(plate.rows).toHaveLength(0)
  })

  test('does not repeat the h1 as a heading', () => {
    const plate = modelPlate({
      h1: 'A',
      headings: [{ level: 'h1', text: 'A' }]
    })
    expect(plate.rows.filter((r) => r.kind === 'heading')).toHaveLength(0)
  })

  test('reports an eighty-option select as a count plus a sample, not eighty rows', () => {
    const options = Array.from({ length: 80 }, (_, i) => ({
      value: `v${i}`,
      label: `Port ${i}`
    }))
    const plate = modelPlate({
      allFields: [
        { kind: 'select', name: 'portOfEntry', label: 'Port of entry', options }
      ]
    })
    expect(plate.rows[0].optionCount).toBe(80)
    expect(plate.rows[0].options).toHaveLength(4)
  })

  test('uses the legend when a radio group has no label', () => {
    const plate = modelPlate({
      allFields: [
        { kind: 'radios', name: 'm', legend: 'Means of transport', options: [] }
      ]
    })
    expect(plate.rows[0].text).toBe('Means of transport')
  })

  test('carries task items with their status', () => {
    const plate = modelPlate({
      taskItems: [{ title: 'What are you importing?', status: 'To do' }]
    })
    expect(plate.rows[0]).toMatchObject({ kind: 'task', status: 'To do' })
  })
})

describe('resolveSideAsset', () => {
  test('prefers an element crop when one exists', () => {
    writeFileSync(join(side.captureDir, 'crop', 'dr21-a__field-x.png'), 'png')
    const asset = resolveSideAsset({
      side,
      screen: 'dr21-a',
      frame: { anchors: { prototype: { key: 'field-x' } } }
    })
    expect(asset.state).toBe('crop')
  })

  test('falls back to the full-page shot', () => {
    writeFileSync(join(side.screensDir, 'dr21-a.png'), 'png')
    expect(resolveSideAsset({ side, screen: 'dr21-a' }).state).toBe('page')
  })

  test('falls back to a page-model plate built from the captured JSON', () => {
    writeModel('dr21-a', { h1: 'Arrival details', allFields: [] })
    const asset = resolveSideAsset({ side, screen: 'dr21-a' })
    expect(asset.state).toBe('model')
    expect(asset.plate.title).toBe('Arrival details')
  })

  test('falls back to naming the capture command rather than emitting a broken image', () => {
    const asset = resolveSideAsset({ side, screen: 'dr21-missing' })
    expect(asset).toMatchObject({
      state: 'absent',
      command: side.captureCommand
    })
    expect(asset.path).toBeUndefined()
  })

  test('keeps the slot and says why when the side has no screen at all', () => {
    const asset = resolveSideAsset({
      side,
      screen: null,
      why: 'pairs.js records no counterpart on this side'
    })
    expect(asset).toMatchObject({ state: 'absent', screen: null })
    expect(asset.why).toMatch(/no counterpart/)
  })
})

describe('resolveRow', () => {
  test('always returns one slot per side, even when one side has nothing', () => {
    const sides = [
      {
        ...side,
        id: 'frontend',
        screensDir: null,
        modelDir: join(dir, 'nowhere')
      },
      side
    ]
    writeFileSync(join(side.screensDir, 'dr21-a.png'), 'png')
    const row = resolveRow({
      sides,
      row: {
        frontend: { screen: null, why: 'none' },
        prototype: { screen: 'dr21-a' }
      }
    })
    expect(Object.keys(row)).toEqual(['frontend', 'prototype'])
    expect(row.frontend.state).toBe('absent')
    expect(row.prototype.state).toBe('page')
  })
})

describe('screenPairsFor', () => {
  const pairIndex = indexPairs({
    pairs: [{ frontend: 'fe-hub', prototype: 'dr21-notification-hub' }],
    onlyFrontend: [{ screen: 'fe-exit-date' }],
    onlyPrototype: [{ screen: 'dr21-create-template' }]
  })
  const sides = [
    { id: 'frontend', screenPrefix: 'fe-' },
    { id: 'prototype', screenPrefix: 'dr21-' }
  ]

  test('completes a pair from pairs.js when the finding names only one side', () => {
    const [row] = screenPairsFor({ screens: ['fe-hub'], pairIndex, sides })
    expect(row.prototype).toEqual({
      screen: 'dr21-notification-hub',
      why: 'paired in pairs.js'
    })
  })

  test('prefers a screen the finding named over the pairing', () => {
    const [row] = screenPairsFor({
      screens: ['fe-hub', 'dr21-create-template'],
      pairIndex,
      sides
    })
    expect(row.prototype.screen).toBe('dr21-create-template')
    expect(row.prototype.why).toBe('named by the finding')
  })

  test('says the counterpart is deliberately absent for a one-sided screen', () => {
    const [row] = screenPairsFor({
      screens: ['dr21-create-template'],
      pairIndex,
      sides
    })
    expect(row.frontend).toEqual({
      screen: null,
      why: 'pairs.js records no counterpart on this side'
    })
  })

  test('distinguishes an unpaired screen from one pairs.js has never heard of', () => {
    const [row] = screenPairsFor({
      screens: ['dr21-unknown'],
      pairIndex,
      sides
    })
    expect(row.frontend.why).toBe('this screen is not in pairs.js')
  })

  test('ignores a screen matching no side prefix', () => {
    expect(
      screenPairsFor({ screens: ['something-else'], pairIndex, sides })
    ).toEqual([])
  })
})

describe('imageCoverage', () => {
  test('counts cited screens that have a real picture, per side', () => {
    const items = [
      {
        assets: [
          {
            frontend: { screen: 'fe-a', state: 'model' },
            prototype: { screen: 'dr21-a', state: 'page' }
          },
          {
            frontend: { screen: 'fe-b', state: 'model' },
            prototype: { screen: 'dr21-a', state: 'page' }
          }
        ]
      }
    ]
    const coverage = imageCoverage(items, [
      { id: 'frontend' },
      { id: 'prototype' }
    ])
    expect(coverage).toEqual([
      { side: 'frontend', want: 2, have: 0, byState: { model: 2 } },
      { side: 'prototype', want: 1, have: 1, byState: { page: 1 } }
    ])
  })
})
