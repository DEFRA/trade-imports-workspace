import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  rmSync
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadAnchors, resolveAnchor } from './capture/screens.js'
import { runAnchors, anchorKey, toAnchor } from './anchors.js'

let root
let profile

const buildProfile = (dir) => {
  const sides = ['frontend', 'prototype'].map((id) => ({
    id,
    repo: id,
    screenPrefix: id === 'frontend' ? 'fe-' : 'dr1-',
    evidenceRoot: 'evidence',
    modelDir: join(dir, 'model', id)
  }))
  mkdirSync(join(dir, 'evidence'), { recursive: true })
  mkdirSync(join(dir, 'run'), { recursive: true })
  return {
    id: 'dr1',
    runId: 'EUDPA-328-DR1',
    workspaceRoot: dir,
    sides,
    sideIds: sides.map((side) => side.id),
    sideById: Object.fromEntries(sides.map((side) => [side.id, side])),
    repos: { frontend: {}, prototype: {} },
    captures: {},
    bands: [],
    paths: {
      workarea: join(dir, 'workarea'),
      backlog: join(dir, 'run', 'backlog.json')
    }
  }
}

const increment = (overrides = {}) => ({
  id: 'inc-001',
  type: 'add-field',
  milestone: null,
  domain: 'documents',
  title: 'A finding.',
  detail: 'Frozen.',
  screens: ['fe-documents', 'dr1-upload-documents'],
  controls: ['accompanyingDocumentType'],
  evidence: {},
  confidence: 'high',
  band: 'frontend-work',
  gate: null,
  dependsOn: [],
  status: 'todo',
  commit: null,
  failure_reason: null,
  ...overrides
})

const writeBacklog = (increments) =>
  writeFileSync(
    profile.paths.backlog,
    JSON.stringify({
      run_id: 'EUDPA-328-DR1',
      target: 'live-animals-frontend',
      increments
    })
  )

const sideNamed = (result, id) => result.sides.find((side) => side.side === id)

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-parity-anchors-'))
  profile = buildProfile(root)
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('anchorKey', () => {
  test('strips a field name down to its letters and digits', () => {
    expect(anchorKey({ kind: 'field', name: 'arrivalDateAtPort' })).toBe(
      'field-arrivaldateatport'
    )
  })

  test('hyphenates a label', () => {
    expect(anchorKey({ kind: 'label', text: 'Port of entry' })).toBe(
      'label-port-of-entry'
    )
  })
})

describe('toAnchor', () => {
  test('reads a single word as a field name', () => {
    expect(toAnchor('countryOfOrigin', 'inc-001')).toEqual({
      kind: 'field',
      name: 'countryOfOrigin',
      key: 'field-countryoforigin'
    })
  })

  test('reads a phrase as a visible label', () => {
    expect(toAnchor('Port of entry', 'inc-001')).toEqual({
      kind: 'label',
      text: 'Port of entry',
      key: 'label-port-of-entry'
    })
  })

  test('takes the kind as written when the author states it', () => {
    expect(toAnchor({ kind: 'field', name: 'q' }, 'inc-001')).toEqual({
      kind: 'field',
      name: 'q',
      key: 'field-q'
    })
  })

  test('names the increment when a control names nothing', () => {
    expect(() => toAnchor({ kind: 'button' }, 'inc-007')).toThrow(/inc-007/)
  })
})

describe('runAnchors', () => {
  test('writes anchors the capture stage can read back, keyed by screen', () => {
    writeBacklog([increment()])

    const result = runAnchors({ profile, write: true })

    const anchors = loadAnchors(sideNamed(result, 'frontend').path)
    expect(Object.keys(anchors)).toEqual(['fe-documents'])
    expect(anchors['fe-documents']).toEqual([
      {
        kind: 'field',
        name: 'accompanyingDocumentType',
        key: 'field-accompanyingdocumenttype',
        why: 'named by inc-001'
      }
    ])
  })

  test('writes an anchor the capture stage resolves to a locator', () => {
    writeBacklog([increment()])
    runAnchors({ profile, write: true })
    const page = {
      locator: (selector) => `locator(${selector})`,
      getByLabel: (text) => `label(${text})`
    }

    const [anchor] = loadAnchors(
      join(root, 'evidence', 'anchors.frontend.json')
    )['fe-documents']

    expect(resolveAnchor(page, anchor)).toContain(
      '[name="accompanyingDocumentType"]'
    )
  })

  test('files each side’s screens under that side', () => {
    writeBacklog([increment()])

    const result = runAnchors({ profile, write: true })

    expect(
      Object.keys(loadAnchors(sideNamed(result, 'prototype').path))
    ).toEqual(['dr1-upload-documents'])
  })

  test('counts and names the findings that named no control', () => {
    writeBacklog([
      increment(),
      increment({ id: 'inc-002', controls: [] }),
      increment({ id: 'inc-003', controls: [], screens: ['fe-origin'] })
    ])

    const result = runAnchors({ profile })

    expect(sideNamed(result, 'frontend').withoutControls).toEqual([
      'inc-002',
      'inc-003'
    ])
    expect(sideNamed(result, 'prototype').withoutControls).toEqual(['inc-002'])
  })

  test('names one control once when two findings share it', () => {
    writeBacklog([increment(), increment({ id: 'inc-002' })])

    const result = runAnchors({ profile, write: true })

    const anchors = loadAnchors(sideNamed(result, 'frontend').path)
    expect(anchors['fe-documents']).toHaveLength(1)
    expect(anchors['fe-documents'][0].why).toBe('named by inc-001, inc-002')
  })

  test('keeps the same order and the same file on a second run', () => {
    writeBacklog([
      increment({ controls: ['second', 'first'] }),
      increment({ id: 'inc-002', controls: ['third'] })
    ])

    const first = runAnchors({ profile, write: true })
    const second = runAnchors({ profile, write: true })

    expect(second.sides[0].file).toEqual(first.sides[0].file)
    expect(
      loadAnchors(sideNamed(second, 'frontend').path)['fe-documents'].map(
        (anchor) => anchor.key
      )
    ).toEqual(['field-second', 'field-first', 'field-third'])
  })

  test('reports the totals per side', () => {
    writeBacklog([
      increment({ controls: ['one', 'two'] }),
      increment({ id: 'inc-002', screens: ['fe-origin'], controls: ['three'] })
    ])

    const result = runAnchors({ profile })

    expect({
      screens: sideNamed(result, 'frontend').screens,
      anchors: sideNamed(result, 'frontend').anchors
    }).toEqual({ screens: 2, anchors: 3 })
  })

  test('writes nothing without --write', () => {
    writeBacklog([increment()])

    const result = runAnchors({ profile })

    expect(existsSync(join(root, 'evidence', 'anchors.frontend.json'))).toBe(
      false
    )
    expect(result.written).toBe(false)
  })

  test('builds just the side asked for', () => {
    writeBacklog([increment()])

    const result = runAnchors({ profile, side: 'prototype', write: true })

    expect(result.sides.map((side) => side.side)).toEqual(['prototype'])
    expect(existsSync(join(root, 'evidence', 'anchors.frontend.json'))).toBe(
      false
    )
  })

  test('names the sides it has when asked for one it does not', () => {
    writeBacklog([increment()])

    expect(() => runAnchors({ profile, side: 'backend' })).toThrow(
      /frontend, prototype/
    )
  })
})

const field = (name, label, kind = 'input:text') => ({ kind, name, label })

const writeModel = (side, screen, allFields) => {
  const dir = join(root, 'model', side)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `${screen}.json`), JSON.stringify({ allFields }))
}

const anchorsOn = (result, side, screen) =>
  sideNamed(result, side).file.screens[screen]

describe('runAnchors against the page models', () => {
  test('a control both sides have is cropped from the control itself', () => {
    writeBacklog([increment({ controls: ['species'] })])
    writeModel('frontend', 'fe-documents', [field('species', 'Species')])
    writeModel('prototype', 'dr1-upload-documents', [
      field('species', 'Species')
    ])

    const result = runAnchors({ profile })

    expect(anchorsOn(result, 'frontend', 'fe-documents')).toEqual([
      {
        kind: 'field',
        name: 'species',
        key: 'field-species',
        why: 'named by inc-001'
      }
    ])
    expect(anchorsOn(result, 'prototype', 'dr1-upload-documents')).toEqual([
      {
        kind: 'field',
        name: 'species',
        key: 'field-species',
        why: 'named by inc-001'
      }
    ])
    expect([
      sideNamed(result, 'frontend').insertions,
      sideNamed(result, 'prototype').insertions
    ]).toEqual([0, 0])
  })

  test('a control only the other side has becomes an insertion on this one', () => {
    writeBacklog([increment()])
    writeModel('frontend', 'fe-documents', [
      field('species', 'Species'),
      field('quantity', 'Quantity')
    ])
    writeModel('prototype', 'dr1-upload-documents', [
      field('species', 'Species'),
      field('accompanyingDocumentType', 'Document type'),
      field('quantity', 'Quantity')
    ])

    const result = runAnchors({ profile })

    // The crop is of a control that is there, captioned with the one that is
    // not — a reader cannot see an absence.
    expect(anchorsOn(result, 'frontend', 'fe-documents')).toEqual([
      {
        kind: 'field',
        name: 'species',
        key: 'field-species',
        why: 'insertion point named by inc-001',
        insertions: [
          {
            missing: ['accompanyingDocumentType'],
            relation: 'after',
            named: 'Species',
            caption:
              'This side has no Document type. It would sit after Species.'
          }
        ]
      }
    ])
    expect(anchorsOn(result, 'prototype', 'dr1-upload-documents')).toEqual([
      {
        kind: 'field',
        name: 'accompanyingDocumentType',
        key: 'field-accompanyingdocumenttype',
        why: 'named by inc-001'
      }
    ])
    expect({
      anchors: sideNamed(result, 'frontend').anchors,
      insertions: sideNamed(result, 'frontend').insertions
    }).toEqual({ anchors: 0, insertions: 1 })
  })

  test('the caption stays honest where the two pages share no field', () => {
    writeBacklog([increment({ controls: ['cphNumber-county'] })])
    writeModel('frontend', 'fe-documents', [
      field('countyParishHoldingCph', 'CPH')
    ])
    writeModel('prototype', 'dr1-upload-documents', [
      field('cphNumber-county', 'County'),
      field('cphNumber-parish', 'Parish')
    ])

    const result = runAnchors({ profile })

    const [anchor] = anchorsOn(result, 'frontend', 'fe-documents')
    expect(anchor.key).toBe('field-countyparishholdingcph')
    expect(anchor.insertions[0].caption).toContain(
      'rather than where the missing one would go'
    )
    expect(anchor.insertions[0].caption).not.toContain('would sit')
  })

  test('a control on no side is counted and named rather than dropped', () => {
    writeBacklog([increment({ controls: ['unweanedAnimals'] })])
    writeModel('frontend', 'fe-documents', [field('species', 'Species')])
    writeModel('prototype', 'dr1-upload-documents', [
      field('species', 'Species')
    ])

    const result = runAnchors({ profile })

    expect(sideNamed(result, 'frontend').unresolved).toEqual([
      {
        increment: 'inc-001',
        anchor: 'field-unweanedanimals',
        named: 'unweanedAnimals',
        screen: 'fe-documents'
      }
    ])
    expect(anchorsOn(result, 'frontend', 'fe-documents')).toBeUndefined()
  })

  test('a control named by its label resolves against that label', () => {
    writeBacklog([increment({ controls: ['Port of entry'] })])
    writeModel('frontend', 'fe-documents', [
      field('portOfEntry', 'Port of entry')
    ])
    writeModel('prototype', 'dr1-upload-documents', [
      field('portOfEntry', 'Port of entry')
    ])

    const result = runAnchors({ profile })

    expect(anchorsOn(result, 'frontend', 'fe-documents')[0]).toEqual({
      kind: 'label',
      text: 'Port of entry',
      key: 'label-port-of-entry',
      why: 'named by inc-001'
    })
  })

  test('a landmark that is itself a finding keeps its own reason', () => {
    writeBacklog([
      increment(),
      increment({ id: 'inc-002', controls: ['species'] })
    ])
    writeModel('frontend', 'fe-documents', [field('species', 'Species')])
    writeModel('prototype', 'dr1-upload-documents', [
      field('species', 'Species'),
      field('accompanyingDocumentType', 'Document type')
    ])

    const result = runAnchors({ profile })

    const [anchor] = anchorsOn(result, 'frontend', 'fe-documents')
    expect(anchor.why).toBe('named by inc-002')
    expect(anchor.insertions[0].caption).toContain('no Document type')
  })

  test('an uncaptured screen keeps its anchors and says it went unchecked', () => {
    writeBacklog([increment()])
    writeModel('prototype', 'dr1-upload-documents', [
      field('accompanyingDocumentType', 'Document type')
    ])

    const result = runAnchors({ profile })

    expect(sideNamed(result, 'frontend').uncaptured).toEqual(['fe-documents'])
    expect(anchorsOn(result, 'frontend', 'fe-documents')).toHaveLength(1)
    expect(sideNamed(result, 'frontend').unresolved).toEqual([])
  })
})
