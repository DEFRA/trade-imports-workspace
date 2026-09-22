import { describe, test, expect } from 'vitest'
import { parityV1, composeDetail, validateFinding } from './profile-v1.js'

describe('parityV1.idPrefix', () => {
  // The id format itself (padding to inc-003, reading 12 back out of
  // inc-012) is generic core behaviour parameterised by this prefix — see
  // backlog/ingest.js's assignIds, exercised end to end by
  // ingest.parity-v1.test.js's "numbers findings by slice then file name"
  // and by ingest.requirements-v2.test.js's req- equivalent.
  test('is "inc-", so a newborn row numbers inc-001 upward', () => {
    expect(parityV1.idPrefix).toBe('inc-')
  })
})

describe('parityV1.bornStatus', () => {
  test('gives a newborn finding the status todo', () => {
    expect(parityV1.bornStatus({})).toBe('todo')
  })
})

const bands = ['frontend-work', 'needs-backend', 'disputed']
const screens = { known: new Set(['fe-a']), checkable: true }

const rawFinding = (overrides = {}) => ({
  slice: 'documents',
  title: 'A finding',
  domain: 'documents',
  type: 'add-field',
  band: 'frontend-work',
  confidence: 'high',
  screens: ['fe-a'],
  finding: {
    frontend: 'f',
    prototype: 'p',
    difference: 'd',
    falsifiedBy: 'fb'
  },
  ...overrides
})

describe('validateFinding — verification', () => {
  test('reads a verification record from finding.verification, and from a top-level verification on an older file', () => {
    const fromNested = validateFinding({
      raw: rawFinding({
        finding: { ...rawFinding().finding, verification: 'checked' }
      }),
      file: 'a.json',
      bands,
      screens
    })

    expect(fromNested.verification).toBe('checked')

    const fromTopLevel = validateFinding({
      raw: { ...rawFinding(), verification: 'checked-old-style' },
      file: 'a.json',
      bands,
      screens
    })

    expect(fromTopLevel.verification).toBe('checked-old-style')
  })

  test('refuses a finding whose band is not one the corpus declares, naming the file, the field and the allowed list', () => {
    expect(() =>
      validateFinding({
        raw: rawFinding({ band: 'not-a-band' }),
        file: 'a.json',
        bands,
        screens
      })
    ).toThrow(/a\.json.*"band".*frontend-work, needs-backend, disputed/s)
  })
})

describe('composeDetail', () => {
  test('composes detail from the four slots in order, with the FALSIFIED BY: sentinel last', () => {
    expect(
      composeDetail({
        frontend: 'f',
        prototype: 'p',
        difference: 'd',
        falsifiedBy: 'fb'
      })
    ).toBe(['f', 'p', 'd', 'FALSIFIED BY: fb'].join('\n\n'))
  })
})
