import { describe, test, expect } from 'vitest'
import { carryHumanResolutions, keyed } from './carry-forward.js'

const derivedCitation = (overrides = {}) => ({
  ref: 'c1',
  kind: 'code',
  side: null,
  repo: null,
  path: null,
  lines: { start: 62, end: 62 },
  ranges: [{ start: 62, end: 62 }],
  asWritten: ':62',
  anchors: ['Select an address'],
  resolution: 'unresolved',
  needsHuman: true,
  candidates: ['app/views/a.html', 'app/views/b.html'],
  field: 'detail',
  fields: ['detail'],
  ...overrides
})

const humanCitation = (overrides = {}) => ({
  ...derivedCitation(),
  repo: 'prototype',
  path: 'app/views/contact-address-for-consignment.html',
  resolution: 'human',
  needsHuman: false,
  why: 'Continuation of the preceding sentence. Line 62 is the h2.',
  candidates: undefined,
  ...overrides
})

describe('keyed', () => {
  test('tells apart two citations written the same way in the same field', () => {
    const keys = keyed([
      { field: 'detail', asWritten: ':14' },
      { field: 'detail', asWritten: ':14' }
    ]).map((entry) => entry.key)
    expect(new Set(keys).size).toBe(2)
  })

  test('tells apart the same token cited from two different fields', () => {
    const [first, second] = keyed([
      { field: 'detail', asWritten: 'app/routes.js:5' },
      { field: 'evidence.prototype', asWritten: 'app/routes.js:5' }
    ])
    expect(first.key).not.toBe(second.key)
  })
})

describe('carryHumanResolutions', () => {
  test('puts a hand resolution back on the citation the parser re-derived', () => {
    const { citations } = carryHumanResolutions({
      stored: [humanCitation()],
      derived: [derivedCitation()]
    })
    expect(citations).toHaveLength(1)
    expect(citations[0]).toMatchObject({
      ref: 'c1',
      repo: 'prototype',
      path: 'app/views/contact-address-for-consignment.html',
      resolution: 'human',
      needsHuman: false,
      why: 'Continuation of the preceding sentence. Line 62 is the h2.'
    })
  })

  test('drops the parser shortlist once a person has chosen from it', () => {
    const { citations } = carryHumanResolutions({
      stored: [humanCitation()],
      derived: [derivedCitation()]
    })
    expect(citations[0].candidates).toBeUndefined()
  })

  test('keeps the line range a person corrected rather than the one the token wrote', () => {
    const { citations } = carryHumanResolutions({
      stored: [
        humanCitation({
          lines: { start: 101, end: 118 },
          ranges: [{ start: 101, end: 118 }]
        })
      ],
      derived: [derivedCitation()]
    })
    expect(citations[0].lines).toEqual({ start: 101, end: 118 })
    expect(citations[0].ranges).toEqual([{ start: 101, end: 118 }])
  })

  test('re-derives everything the parser owns, so a fixed anchor reaches a carried citation', () => {
    const { citations } = carryHumanResolutions({
      stored: [humanCitation({ anchors: ['stale anchor'] })],
      derived: [derivedCitation({ anchors: ['Select an address'] })]
    })
    expect(citations[0].anchors).toEqual(['Select an address'])
  })

  test('leaves an explicit citation exactly as the parser derived it', () => {
    const explicit = derivedCitation({
      ref: 'c2',
      asWritten: 'app/routes.js:41-53',
      repo: 'prototype',
      path: 'app/routes.js',
      resolution: 'explicit',
      needsHuman: false,
      candidates: undefined
    })
    const { citations } = carryHumanResolutions({
      stored: [humanCitation(), { ...explicit, path: 'app/old-routes.js' }],
      derived: [derivedCitation(), explicit]
    })
    expect(citations[1].path).toBe('app/routes.js')
  })

  test('names what it carried, and what the citation used to be called', () => {
    const { carried } = carryHumanResolutions({
      stored: [humanCitation({ ref: 'c4' })],
      derived: [derivedCitation({ ref: 'c1' })]
    })
    expect(carried).toEqual([
      {
        ref: 'c1',
        wasRef: 'c4',
        asWritten: ':62',
        field: 'detail',
        repo: 'prototype',
        path: 'app/views/contact-address-for-consignment.html'
      }
    ])
  })

  test('matches the second of two identically written citations to the second token', () => {
    const { citations } = carryHumanResolutions({
      stored: [
        derivedCitation({ ref: 'c1', asWritten: ':14' }),
        humanCitation({ ref: 'c2', asWritten: ':14', path: 'app/second.html' })
      ],
      derived: [
        derivedCitation({ ref: 'c1', asWritten: ':14' }),
        derivedCitation({ ref: 'c2', asWritten: ':14' })
      ]
    })
    expect(citations[0].resolution).toBe('unresolved')
    expect(citations[1]).toMatchObject({
      resolution: 'human',
      path: 'app/second.html'
    })
  })

  test('keeps a hand resolution whose prose has gone, flagged and explained', () => {
    const { citations, orphaned } = carryHumanResolutions({
      stored: [humanCitation({ ref: 'c1' })],
      derived: []
    })
    expect(citations).toHaveLength(1)
    expect(citations[0]).toMatchObject({
      ref: 'c1',
      resolution: 'human',
      path: 'app/views/contact-address-for-consignment.html',
      orphaned: true
    })
    expect(citations[0].orphanedBecause).toMatch(/":62" in detail any more/)
    // The report draws a source from `why` and nothing else, so an orphan that
    // did not say so there would read as a live citation on the page.
    expect(citations[0].why).toBe(
      'Orphaned: the prose no longer cites this. Continuation of the preceding sentence. Line 62 is the h2.'
    )
    expect(orphaned).toEqual([
      {
        ref: 'c1',
        asWritten: ':62',
        field: 'detail',
        repo: 'prototype',
        path: 'app/views/contact-address-for-consignment.html'
      }
    ])
  })

  test('renumbers an orphan rather than shadowing a live citation on its ref', () => {
    const { citations } = carryHumanResolutions({
      stored: [humanCitation({ ref: 'c1', asWritten: ':62' })],
      derived: [derivedCitation({ ref: 'c1', asWritten: ':70' })]
    })
    expect(citations.map((citation) => citation.ref)).toEqual(['c1', 'c2'])
    expect(citations[1]).toMatchObject({
      asWritten: ':62',
      orphaned: true,
      wasRef: 'c1'
    })
  })

  test('reattaches an orphan whose prose has come back', () => {
    const orphan = humanCitation({
      ref: 'c9',
      orphaned: true,
      orphanedBecause: 'gone',
      wasRef: 'c4',
      why: 'Orphaned: the prose no longer cites this. Read the file myself.'
    })
    const { citations, orphaned } = carryHumanResolutions({
      stored: [orphan],
      derived: [derivedCitation({ ref: 'c1' })]
    })
    expect(orphaned).toEqual([])
    expect(citations).toHaveLength(1)
    expect(citations[0]).toMatchObject({
      ref: 'c1',
      resolution: 'human',
      why: 'Read the file myself.'
    })
    expect(citations[0].orphaned).toBeUndefined()
    expect(citations[0].orphanedBecause).toBeUndefined()
    expect(citations[0].wasRef).toBeUndefined()
  })

  test('is a no-op when the backlog holds no hand resolution', () => {
    const derived = [derivedCitation()]
    const { citations, carried, orphaned } = carryHumanResolutions({
      stored: [derivedCitation()],
      derived
    })
    expect(citations).toBe(derived)
    expect(carried).toEqual([])
    expect(orphaned).toEqual([])
  })

  test('gives the same answer run after run, orphan included', () => {
    const derived = () => [derivedCitation({ ref: 'c1', asWritten: ':70' })]
    const first = carryHumanResolutions({
      stored: [humanCitation({ ref: 'c1', asWritten: ':62' })],
      derived: derived()
    })
    const second = carryHumanResolutions({
      stored: first.citations,
      derived: derived()
    })
    expect(second.citations).toEqual(first.citations)
    expect(second.orphaned).toEqual(first.orphaned)
  })
})
