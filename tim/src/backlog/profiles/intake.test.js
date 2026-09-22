import { describe, test, expect } from 'vitest'
import { refuseUnknownKeys, refuseRefusedKeys } from './intake.js'
import { REFUSED_FIELDS, ATOM_FIELDS } from './requirements-v2.classes.js'

describe('refuseUnknownKeys', () => {
  const args = (overrides = {}) => ({
    raw: { key: 'a', title: 'A' },
    file: 'a.json',
    known: ATOM_FIELDS,
    refused: REFUSED_FIELDS,
    what: 'requirement atom',
    ...overrides
  })

  test('passes an object whose keys are all known', () => {
    expect(() => refuseUnknownKeys(args())).not.toThrow()
  })

  test('refuses a key in REFUSED_FIELDS with its home sentence', () => {
    expect(() =>
      refuseUnknownKeys(args({ raw: { key: 'a', executor: 'codex' } }))
    ).toThrow(/build\/run\.json/)
  })

  test('refuses a key on neither list, naming the field and listing the known fields', () => {
    expect(() =>
      refuseUnknownKeys(args({ raw: { key: 'a', bandwidth: 'high' } }))
    ).toThrow(/"bandwidth".*Known fields:.*key/s)
  })

  test('names the file in every message', () => {
    expect(() =>
      refuseUnknownKeys(args({ raw: { key: 'a', executor: 'codex' } }))
    ).toThrow(/^a\.json:/)
    expect(() =>
      refuseUnknownKeys(args({ raw: { key: 'a', bandwidth: 'high' } }))
    ).toThrow(/^a\.json:/)
  })
})

describe('refuseRefusedKeys', () => {
  const args = (overrides = {}) => ({
    row: { id: 'req-001' },
    where: 'req-001',
    refused: REFUSED_FIELDS,
    ...overrides
  })

  test('passes a row whose keys are all v2 fields', () => {
    expect(() =>
      refuseRefusedKeys(args({ row: { id: 'req-001', key: 'alpha--first' } }))
    ).not.toThrow()
  })

  test('passes a row carrying needs (a classed field)', () => {
    expect(() =>
      refuseRefusedKeys(args({ row: { id: 'req-001', needs: ['q-1'] } }))
    ).not.toThrow()
  })

  test('passes a row carrying tranche (an unclassed neutral key)', () => {
    expect(() =>
      refuseRefusedKeys(args({ row: { id: 'req-001', tranche: 2 } }))
    ).not.toThrow()
  })

  test('refuses a row carrying executor, the message naming build/run.json', () => {
    expect(() =>
      refuseRefusedKeys(args({ row: { id: 'req-001', executor: 'codex' } }))
    ).toThrow(/build\/run\.json/)
  })

  test('refuses a row carrying filesToTouch, the message naming the plan', () => {
    expect(() =>
      refuseRefusedKeys(
        args({ row: { id: 'req-001', filesToTouch: ['a.js'] } })
      )
    ).toThrow(/build\/plans/)
  })

  test('names the row id in the message when it has one', () => {
    expect(() =>
      refuseRefusedKeys(args({ row: { id: 'req-001', executor: 'codex' } }))
    ).toThrow(/^req-001:/)
  })

  test('names requirements[<index>] in the message when the row has no id', () => {
    expect(() =>
      refuseRefusedKeys(
        args({ row: { executor: 'codex' }, where: 'requirements[3]' })
      )
    ).toThrow(/^requirements\[3\]:/)
  })
})
