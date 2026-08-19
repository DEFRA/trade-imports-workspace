import { describe, test, expect } from 'vitest'
import { anchorsFromDelta } from './anchors.js'
import { anchorsNamedIn } from './assets/resolve.js'

const pair = {
  frontend: 'fe-arrival-details',
  prototype: 'dr21-arrival-details'
}

const delta = (deltas) => ({ deltas })

describe('anchorsFromDelta', () => {
  test('a changed field becomes an anchor on both sides', () => {
    const out = anchorsFromDelta(
      delta([
        {
          kind: 'field-changed',
          name: 'portOfEntry',
          changes: [{ attr: 'kind' }, { attr: 'label' }]
        }
      ]),
      pair
    )
    expect(out['fe-arrival-details']).toEqual([
      {
        kind: 'field',
        name: 'portOfEntry',
        why: 'kind, label',
        key: 'field-portofentry'
      }
    ])
    expect(out['dr21-arrival-details'][0].name).toBe('portOfEntry')
  })

  test('a one-sided field becomes an anchor on that side only', () => {
    const out = anchorsFromDelta(
      delta([
        { kind: 'field-only-frontend', name: 'regionOfOriginCode' },
        { kind: 'field-only-prototype', name: 'commoditySearch' }
      ]),
      pair
    )
    expect(out['fe-arrival-details'].map((a) => a.name)).toEqual([
      'regionOfOriginCode'
    ])
    expect(out['dr21-arrival-details'].map((a) => a.name)).toEqual([
      'commoditySearch'
    ])
  })

  test('a hidden control is machinery, not something on the page', () => {
    const out = anchorsFromDelta(
      delta([
        { kind: 'field-only-frontend', name: 'crumb', controlKind: 'hidden' }
      ]),
      pair
    )
    expect(out['fe-arrival-details']).toEqual([])
  })

  test('an unnamed control is anchored by its label instead', () => {
    const out = anchorsFromDelta(
      delta([
        {
          kind: 'field-only-prototype',
          name: 'unnamed:Port of entry',
          label: 'Port of entry',
          controlKind: 'input:search'
        }
      ]),
      pair
    )
    expect(out['dr21-arrival-details'][0]).toMatchObject({
      kind: 'label',
      text: 'Port of entry',
      key: 'label-port-of-entry'
    })
  })

  test('ignores everything that is not a field delta', () => {
    const out = anchorsFromDelta(
      delta([
        { kind: 'scalar', field: 'h1' },
        { kind: 'only-prototype', field: 'headings', values: ['h2 Something'] }
      ]),
      pair
    )
    expect(out['fe-arrival-details']).toEqual([])
    expect(out['dr21-arrival-details']).toEqual([])
  })

  test('does not repeat an anchor a screen already has', () => {
    const out = anchorsFromDelta(
      delta([
        { kind: 'field-changed', name: 'portOfEntry', changes: [] },
        { kind: 'field-changed', name: 'portOfEntry', changes: [] }
      ]),
      pair
    )
    expect(out['fe-arrival-details']).toHaveLength(1)
  })
})

describe('anchorsNamedIn', () => {
  const anchors = [
    { key: 'field-portofentry', name: 'portOfEntry' },
    { key: 'field-meansoftransport', name: 'meansOfTransport' },
    { key: 'field-file', name: 'file' }
  ]

  test('picks the anchor the finding names', () => {
    expect(
      anchorsNamedIn({
        anchors,
        prose: 'The hint on `portOfEntry` promises type-to-search.'
      })
    ).toEqual(['field-portofentry'])
  })

  test('matches case-insensitively, as the prose does not always match the code', () => {
    expect(
      anchorsNamedIn({ anchors, prose: 'the portofentry control' })
    ).toEqual(['field-portofentry'])
  })

  test('prefers the more specific name when two match', () => {
    expect(
      anchorsNamedIn({
        anchors,
        prose: 'both portOfEntry and meansOfTransport differ'
      })
    ).toEqual(['field-meansoftransport', 'field-portofentry'])
  })

  test('caps how many crops one card gets', () => {
    expect(
      anchorsNamedIn({
        anchors,
        prose: 'portOfEntry meansOfTransport file',
        limit: 1
      })
    ).toHaveLength(1)
  })

  test('ignores a name too short to be a reliable match', () => {
    // "file" appears in "filename", "profile" and a dozen other words.
    expect(
      anchorsNamedIn({ anchors, prose: 'the filename carries it' })
    ).toEqual([])
  })

  test('returns nothing when the finding names no control, so the card keeps the page', () => {
    expect(
      anchorsNamedIn({ anchors, prose: 'No page renders a phase banner.' })
    ).toEqual([])
  })
})
