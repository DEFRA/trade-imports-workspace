import { describe, test, expect } from 'vitest'
import { renderPage } from './page.js'
import { DEFAULT_BANDS } from '../corpus-profile.js'

const sides = [{ id: 'frontend', label: 'Frontend', column: 'left' }]

const finding = (id, band) => ({
  kind: 'increment',
  id,
  anchor: id,
  title: `Finding ${id}`,
  domain: 'dashboard',
  type: 'add-field',
  band,
  confidence: 'high',
  milestone: 'M0',
  status: 'todo',
  gate: null,
  screens: [],
  detail: 'Something differs.',
  sections: { frontend: null, prototype: null, difference: null, body: null },
  decision: null,
  decisionRequired: null,
  relatedTo: [],
  notes: [],
  citations: [],
  resolvedCitations: [],
  assets: [],
  dependsOn: [],
  dependents: [],
  visual: []
})

const args = (overrides = {}) => ({
  corpus: 'dr1',
  meta: { pins: {}, captures: {}, schemaVersion: 1 },
  counts: {
    findings: 0,
    awaitingRuling: 0,
    ruled: 0,
    corrected: 0,
    notes: 0,
    withdrawn: 0,
    candidates: 0,
    pageModels: { total: 0 },
    citations: 0,
    citationsQueued: 0,
    screens: 0
  },
  findings: [],
  withdrawn: [],
  candidates: [],
  joinReport: { matched: 0, increments: 0, ordinalAgreement: 0 },
  sides,
  runId: 'EUDPA-328-DR1',
  drift: [],
  target: 'local',
  inlining: null,
  stamp: {
    timVersion: 'test',
    backlogSha: 'abc',
    backlogMtime: '2026-08-19T00:00:00.000Z',
    generatedAt: '2026-08-19T00:00:00.000Z',
    coverage: []
  },
  ...overrides
})

const sectionIdsIn = (html) =>
  [...html.matchAll(/<section class="section" id="([^"]+)"/g)].map(
    (match) => match[1]
  )

const dr1Bands = [
  { id: 'frontend-work', label: 'Frontend work', blurb: 'Just build it.' },
  { id: 'needs-backend', label: 'Needs backend', blurb: 'An API has to land.' },
  { id: 'disputed', label: 'Disputed', blurb: 'The finding may be wrong.' }
]

describe('a corpus renders the bands it declares', () => {
  const html = renderPage(
    args({
      bands: dr1Bands,
      findings: [
        finding('inc-001', 'disputed'),
        finding('inc-002', 'frontend-work'),
        finding('inc-003', 'needs-backend')
      ]
    })
  )

  test('one section per band, in the order the corpus declared them', () => {
    expect(sectionIdsIn(html)).toEqual([
      'frontend-work',
      'needs-backend',
      'disputed'
    ])
  })

  test('each section carries its own label and blurb', () => {
    expect(html).toContain('Disputed')
    expect(html).toContain('The finding may be wrong.')
    expect(html).not.toContain('Buildable now')
  })

  test('the band filter offers exactly this corpus’s bands', () => {
    const options = [
      ...html.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)
    ]
      .filter(([, value]) => dr1Bands.some((band) => band.id === value))
      .map(([, value]) => value)
    expect(options).toEqual(['frontend-work', 'needs-backend', 'disputed'])
    expect(html).not.toContain('value="needs-design-decision"')
  })
})

describe('a corpus that declares no bands', () => {
  const html = renderPage(
    args({
      corpus: 'dr21',
      findings: [
        finding('inc-001', 'frontend-only'),
        finding('inc-002', 'needs-design-decision')
      ]
    })
  )

  test('falls back to the historic three', () => {
    expect(sectionIdsIn(html)).toEqual(
      DEFAULT_BANDS.filter((band) => band.id !== 'needs-backend').map(
        (band) => band.id
      )
    )
    expect(html).toContain('Buildable now')
    expect(html).toContain('Needs a decision')
  })
})

describe('a finding whose band is not in its corpus’s taxonomy', () => {
  const html = renderPage(
    args({
      bands: dr1Bands,
      findings: [
        finding('inc-001', 'frontend-work'),
        finding('inc-002', 'needs-design-decision')
      ]
    })
  )

  test('lands in the not-in-a-band section rather than disappearing', () => {
    expect(sectionIdsIn(html)).toContain('unbanded')
    expect(html).toContain('Not in a band')
  })

  test('keeps its raw band id as its chip label, so it stays findable', () => {
    expect(html).toContain('>needs-design-decision</span>')
  })
})
