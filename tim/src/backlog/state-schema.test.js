import { describe, test, expect } from 'vitest'
import {
  INCREMENT_ID,
  SETTABLE_FIELDS,
  stateSchema,
  journalEntrySchema,
  validateState,
  validateJournalEntry
} from './state-schema.js'

const PATH = 'build/state.json'

describe('stateSchema', () => {
  test('{increments: {}} and {schemaVersion: 1, increments: {}} are both valid', () => {
    expect(stateSchema.safeParse({ increments: {} }).success).toBe(true)
    expect(
      stateSchema.safeParse({ schemaVersion: 1, increments: {} }).success
    ).toBe(true)
  })

  test('both attempts forms startedIncrementIds reads are valid: an array, and a bare number, including zero and empty', () => {
    for (const attempts of [[{ n: 1 }], 2, 0, []]) {
      expect(
        stateSchema.safeParse({ increments: { 'inc-001': { attempts } } })
          .success
      ).toBe(true)
    }
  })

  test('an unknown top-level key is refused, naming it', () => {
    expect(() =>
      validateState({ increments: {}, bogus: true }, PATH)
    ).toThrowError(
      expect.objectContaining({
        code: 'PARSE',
        message: expect.stringContaining('bogus')
      })
    )
  })

  test('an unknown increment field is refused, naming increments.inc-001.phse', () => {
    expect(() =>
      validateState({ increments: { 'inc-001': { phse: 'plan' } } }, PATH)
    ).toThrowError(
      expect.objectContaining({
        message: expect.stringContaining('increments.inc-001.phse')
      })
    )
  })

  test('a bad increment id key is refused', () => {
    expect(
      stateSchema.safeParse({ increments: { 'increment-1': {} } }).success
    ).toBe(false)
  })

  test('heads.workspace.sha "nope" is refused, naming the dotted path', () => {
    expect(() =>
      validateState(
        {
          increments: {
            'inc-001': {
              heads: { workspace: { sha: 'nope', branch: 'b', dirty: false } }
            }
          }
        },
        PATH
      )
    ).toThrowError(
      expect.objectContaining({
        message: expect.stringContaining(
          'increments.inc-001.heads.workspace.sha'
        )
      })
    )
  })

  test('SETTABLE_FIELDS is exactly phase, attempts, ticket, branch, plan, heads', () => {
    expect(SETTABLE_FIELDS).toEqual([
      'phase',
      'attempts',
      'ticket',
      'branch',
      'plan',
      'heads'
    ])
  })

  const valueForField = (field) => {
    if (field === 'attempts') return 1
    if (field === 'heads') {
      return { workspace: { sha: 'a'.repeat(40), branch: 'b', dirty: false } }
    }
    return 'x'
  }

  test('every settable field is accepted on its own', () => {
    for (const field of SETTABLE_FIELDS) {
      const value = valueForField(field)
      expect(
        stateSchema.safeParse({
          increments: { 'inc-001': { [field]: value } }
        }).success
      ).toBe(true)
    }
  })
})

describe('journalEntrySchema', () => {
  test('an entry without note is refused', () => {
    expect(
      journalEntrySchema.safeParse({
        at: '2026-09-21T00:00:00.000Z',
        id: 'inc-001'
      }).success
    ).toBe(false)
  })

  test('an entry with an unknown key is refused', () => {
    expect(
      journalEntrySchema.safeParse({
        at: '2026-09-21T00:00:00.000Z',
        id: 'inc-001',
        note: 'x',
        bogus: true
      }).success
    ).toBe(false)
  })

  test('a full entry is accepted', () => {
    expect(
      journalEntrySchema.safeParse({
        at: '2026-09-21T00:00:00.000Z',
        id: 'inc-001',
        note: 'A note.',
        stage: 'plan',
        by: 'agent'
      }).success
    ).toBe(true)
  })
})

describe('INCREMENT_ID', () => {
  test('matches inc-001 and longer, not a short or malformed id', () => {
    expect(INCREMENT_ID.test('inc-001')).toBe(true)
    expect(INCREMENT_ID.test('inc-0001')).toBe(true)
    expect(INCREMENT_ID.test('inc-1')).toBe(false)
    expect(INCREMENT_ID.test('increment-001')).toBe(false)
  })
})

describe('validateJournalEntry', () => {
  test('throws PARSE naming the path on a bad entry', () => {
    expect(() => validateJournalEntry({}, 'build/journal.jsonl')).toThrowError(
      expect.objectContaining({
        code: 'PARSE',
        message: expect.stringContaining('build/journal.jsonl')
      })
    )
  })
})
