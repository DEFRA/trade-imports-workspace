import { describe, test, expect } from 'vitest'
import {
  parseIncrement,
  parseBacklog,
  parseDeferred,
  parseCorpusMeta
} from './schema.js'

const goodIncrement = () => ({
  id: 'inc-001',
  type: 'add-section',
  milestone: 'M0',
  domain: 'dashboard',
  title: 'No page in the frontend renders a phase banner.',
  detail: 'The frontend beforeContent block renders breadcrumbs and nothing else.',
  screens: ['fe-dashboard-empty', 'dr21-dashboard'],
  evidence: {
    frontend: 'src/server/app/shared/layout.njk:41-53',
    prototype: 'app/views/design-release-2.1/dashboard.html:16-28'
  },
  confidence: 'medium',
  band: 'needs-design-decision',
  gate: 'sam',
  dependsOn: [],
  status: 'blocked',
  commit: null,
  failure_reason: null
})

const goodBacklog = (increments) => ({
  run_id: 'EUDPA-328',
  target: 'live-animals-frontend',
  increments
})

describe('parseIncrement', () => {
  test('accepts an increment carrying only the fifteen required keys', () => {
    expect(parseIncrement(goodIncrement(), 0).id).toBe('inc-001')
  })

  test('keeps an unknown key untouched so journey-builder can add fields', () => {
    const withExtra = { ...goodIncrement(), somethingNew: { a: 1 } }
    expect(parseIncrement(withExtra, 0).somethingNew).toEqual({ a: 1 })
  })

  test('names the increment and the field when a required key is missing', () => {
    const missingBand = goodIncrement()
    delete missingBand.band
    expect(() => parseIncrement(missingBand, 3)).toThrow(/inc-001.*\.band/)
  })

  test('names the increment and the field when a required key is retyped', () => {
    const retyped = { ...goodIncrement(), dependsOn: 'inc-002' }
    expect(() => parseIncrement(retyped, 0)).toThrow(/inc-001.*\.dependsOn/)
  })

  test('falls back to the array position when the id itself is missing', () => {
    const noId = goodIncrement()
    delete noId.id
    expect(() => parseIncrement(noId, 7)).toThrow(/increments\[7\]/)
  })

  test('accepts the optional finding, citations and visual blocks', () => {
    const rich = {
      ...goodIncrement(),
      citations: [
        {
          ref: 'c1',
          kind: 'code',
          side: 'frontend',
          repo: 'frontend',
          path: 'src/server/app/shared/layout.njk',
          lines: { start: 41, end: 53 },
          asWritten: 'layout.njk:41-53',
          anchors: ['govukPhaseBanner'],
          resolution: 'explicit'
        }
      ],
      finding: {
        frontend: 'The layout renders no phase banner [[c1]].',
        cites: { frontend: ['c1'] },
        decisionRequired: {
          question: 'Should every page carry a phase banner?',
          audience: 'sam',
          source: 'authored'
        }
      },
      visual: [{ kind: 'pair', screens: { frontend: 'fe-dashboard-empty' } }]
    }
    const parsed = parseIncrement(rich, 0)
    expect(parsed.citations[0].ref).toBe('c1')
    expect(parsed.finding.decisionRequired.source).toBe('authored')
    expect(parsed.visual[0].kind).toBe('pair')
  })

  test('rejects a citation resolution that is not one of the five known kinds', () => {
    const badResolution = {
      ...goodIncrement(),
      citations: [
        {
          ref: 'c1',
          kind: 'code',
          side: 'frontend',
          repo: 'frontend',
          path: 'a.js',
          asWritten: 'a.js:1',
          resolution: 'guessed'
        }
      ]
    }
    expect(() => parseIncrement(badResolution, 0)).toThrow(/inc-001/)
  })
})

describe('parseBacklog', () => {
  test('parses every increment and preserves the run id', () => {
    const parsed = parseBacklog(goodBacklog([goodIncrement()]))
    expect(parsed.run_id).toBe('EUDPA-328')
    expect(parsed.increments).toHaveLength(1)
  })

  test('names the offending increment rather than the whole array', () => {
    const second = { ...goodIncrement(), id: 'inc-002' }
    delete second.status
    expect(() => parseBacklog(goodBacklog([goodIncrement(), second]))).toThrow(
      /inc-002.*\.status/
    )
  })

  test('rejects a backlog with no increments array', () => {
    expect(() => parseBacklog({ run_id: 'X', target: 'y' })).toThrow(
      /backlog.*increments/
    )
  })
})

describe('parseDeferred', () => {
  test('parses candidates in their thinner shape', () => {
    const parsed = parseDeferred({
      run_id: 'EUDPA-328',
      state: 'deferred',
      candidates: [
        {
          id: 'cand-001',
          domain: 'addresses',
          title: 'The prototype can add an address from inside the journey',
          detail: 'New consignment-add-address.html.',
          evidence: { prototype: 'app/views/consignment-add-address.html' },
          verified: false
        }
      ]
    })
    expect(parsed.candidates[0].id).toBe('cand-001')
  })

  test('refuses a candidate that has acquired a band', () => {
    // Unknown keys pass through, so a band would parse. What must not parse is
    // a candidate missing the fields that mark it as unverified.
    const parsed = parseDeferred({
      run_id: 'EUDPA-328',
      state: 'deferred',
      candidates: [
        {
          id: 'cand-002',
          domain: 'addresses',
          title: 't',
          detail: 'd',
          evidence: {},
          verified: false,
          band: 'frontend-only'
        }
      ]
    })
    expect(parsed.candidates[0].verified).toBe(false)
  })

  test('names the field when verified is missing', () => {
    expect(() =>
      parseDeferred({
        run_id: 'EUDPA-328',
        state: 'deferred',
        candidates: [
          { id: 'cand-003', domain: 'a', title: 't', detail: 'd', evidence: {} }
        ]
      })
    ).toThrow(/deferred.*verified/)
  })
})

describe('parseCorpusMeta', () => {
  test('parses pins keyed by repo', () => {
    const parsed = parseCorpusMeta({
      corpus: 'dr21',
      run_id: 'EUDPA-328',
      schemaVersion: 1,
      capturedOn: '2026-08-19',
      pins: { frontend: { sha: 'a'.repeat(40), ref: 'main' } },
      counts: { increments: 97 }
    })
    expect(parsed.pins.frontend.sha).toHaveLength(40)
  })

  test('names the field when pins is missing', () => {
    expect(() =>
      parseCorpusMeta({
        corpus: 'dr21',
        run_id: 'EUDPA-328',
        schemaVersion: 1,
        capturedOn: '2026-08-19',
        counts: {}
      })
    ).toThrow(/corpus-meta.*pins/)
  })
})
