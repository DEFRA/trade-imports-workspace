import { describe, test, expect } from 'vitest'
import {
  insertionPoint,
  insertionCaption,
  listOf,
  mergeAnchors,
  summarise
} from './insertion.js'

const field = (name, label, kind = 'input:text') => ({ name, label, kind })

describe('insertionPoint', () => {
  test('pins the position against a landmark both sides have', () => {
    const point = insertionPoint({
      missing: field('unweanedAnimals', 'Unweaned animals'),
      sourceModel: {
        allFields: [
          field('species', 'Species'),
          field('unweanedAnimals', 'Unweaned animals'),
          field('quantity', 'Quantity')
        ]
      },
      targetModel: {
        allFields: [field('species', 'Species'), field('quantity', 'Quantity')]
      }
    })
    expect(point).toMatchObject({ relation: 'after', named: 'Species' })
    expect(point.anchor.key).toBe('field-species')
  })

  test('falls forward when nothing precedes it', () => {
    const point = insertionPoint({
      missing: field('a', 'A'),
      sourceModel: { allFields: [field('a', 'A'), field('b', 'B')] },
      targetModel: { allFields: [field('b', 'B')] }
    })
    expect(point).toMatchObject({ relation: 'before', named: 'B' })
  })

  test('a hidden control is never a landmark', () => {
    const point = insertionPoint({
      missing: field('a', 'A'),
      sourceModel: {
        allFields: [
          field('crumb', null, 'hidden'),
          field('a', 'A'),
          field('b', 'B')
        ]
      },
      targetModel: {
        allFields: [field('crumb', null, 'hidden'), field('b', 'B')]
      }
    })
    expect(point.relation).toBe('before')
    expect(point.named).toBe('B')
  })

  test('says so when the two pages share no field at all', () => {
    const point = insertionPoint({
      missing: field('cphNumber-county', 'County'),
      sourceModel: {
        allFields: [
          field('cphNumber-county', 'County'),
          field('cphNumber-parish', 'Parish')
        ]
      },
      targetModel: { allFields: [field('countyParishHoldingCph', 'CPH')] }
    })
    // The weaker answer stays weak. Claiming a derived position where none
    // could be derived is the one thing this must not do.
    expect(point.relation).toBe('at')
    expect(point.named).toBe('CPH')
    expect(point.why).toContain('rather than where the missing one would go')
  })

  test('a page with no fields has nowhere to point', () => {
    const point = insertionPoint({
      missing: field('a', 'A'),
      sourceModel: { allFields: [field('a', 'A')] },
      targetModel: { allFields: [] }
    })
    expect(point).toMatchObject({ relation: 'page', anchor: null })
  })

  test('the anchor key is the one the crop file on disk carries', () => {
    const point = insertionPoint({
      missing: field('accompanyingDocumentType', 'Document type'),
      sourceModel: {
        allFields: [
          field('cphNumber-county', 'County'),
          field('accompanyingDocumentType', 'Document type')
        ]
      },
      targetModel: { allFields: [field('cphNumber-county', 'County')] }
    })
    // The same key anchors.js computes — a field name keeps only its letters
    // and digits. Two conventions and the report looks for a crop nobody wrote.
    expect(point.anchor.key).toBe('field-cphnumbercounty')
  })

  test('an unnamed control is anchored by its label', () => {
    const point = insertionPoint({
      missing: field('x', 'X'),
      sourceModel: {
        allFields: [
          field('unnamed:Port of entry', 'Port of entry'),
          field('x', 'X')
        ]
      },
      targetModel: {
        allFields: [field('unnamed:Port of entry', 'Port of entry')]
      }
    })
    expect(point.anchor).toMatchObject({
      kind: 'label',
      text: 'Port of entry',
      key: 'label-port-of-entry'
    })
  })
})

describe('listOf', () => {
  test('reads as a sentence', () => {
    expect(listOf(['County', 'Parish', 'Holding number'])).toBe(
      'County, Parish or Holding number'
    )
  })

  test('two controls with the same visible label are one thing to a reader', () => {
    expect(listOf(['Keyword or reference', 'Keyword or reference'])).toBe(
      'Keyword or reference'
    )
  })
})

describe('insertionCaption', () => {
  test('names the absence and where it would go', () => {
    expect(
      insertionCaption({
        point: { relation: 'after', named: 'Species' },
        missingLabel: 'Unweaned animals'
      })
    ).toBe('This side has no Unweaned animals. It would sit after Species.')
  })

  test('does not claim a position it could not derive', () => {
    const caption = insertionCaption({
      point: { relation: 'at', named: 'CPH', why: 'No shared field.' },
      missingLabel: ['County', 'Parish']
    })
    expect(caption).toBe('This side has no County or Parish. No shared field.')
    expect(caption).not.toContain('would sit')
  })

  test('a page with nothing to point at says that, rather than going quiet', () => {
    expect(
      insertionCaption({ point: { relation: 'page' }, missingLabel: 'A' })
    ).toContain('no field on this page to place it against')
  })
})

describe('summarise', () => {
  test('absences that land in the same place become one sentence', () => {
    const anchor = {
      key: 'field-cph',
      insertions: [
        {
          missing: 'cphNumber-county',
          missingLabel: 'County',
          point: { relation: 'at', named: 'CPH', why: 'No shared field.' }
        },
        {
          missing: 'cphNumber-parish',
          missingLabel: 'Parish',
          point: { relation: 'at', named: 'CPH', why: 'No shared field.' }
        }
      ]
    }
    summarise(anchor)
    expect(anchor.insertions).toHaveLength(1)
    expect(anchor.insertions[0].missing).toEqual([
      'cphNumber-county',
      'cphNumber-parish'
    ])
    expect(anchor.insertions[0].caption).toContain('no County or Parish')
  })

  test('absences that land in different places stay separate', () => {
    const anchor = {
      key: 'field-x',
      insertions: [
        {
          missing: 'a',
          missingLabel: 'A',
          point: { relation: 'after', named: 'X' }
        },
        {
          missing: 'b',
          missingLabel: 'B',
          point: { relation: 'before', named: 'X' }
        }
      ]
    }
    summarise(anchor)
    expect(anchor.insertions).toHaveLength(2)
  })
})

describe('mergeAnchors', () => {
  test('an anchor that is already declared keeps its own reason', () => {
    const merged = mergeAnchors(
      { 'fe-x': [{ key: 'field-a', kind: 'field', why: 'only on this side' }] },
      {
        'fe-x': [
          { key: 'field-a', kind: 'field', insertions: [{ caption: 'c' }] }
        ]
      }
    )
    // A control can be both a difference in its own right and the landmark
    // another finding's absence is measured from.
    expect(merged['fe-x'][0].why).toBe('only on this side')
    expect(merged['fe-x'][0].insertions).toHaveLength(1)
  })

  test('a new anchor is added rather than replacing the screen', () => {
    const merged = mergeAnchors(
      { 'fe-x': [{ key: 'field-a' }] },
      { 'fe-x': [{ key: 'field-b', insertions: [] }] }
    )
    expect(merged['fe-x'].map((a) => a.key)).toEqual(['field-a', 'field-b'])
  })

  test('a screen with no existing anchors is created', () => {
    expect(mergeAnchors({}, { 'fe-y': [{ key: 'field-c' }] })['fe-y']).toEqual([
      { key: 'field-c' }
    ])
  })
})
