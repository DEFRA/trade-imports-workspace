import { describe, test, expect } from 'vitest'
import { profileFor, PROFILE_KEYS, DEFAULT_PROFILE_KEY } from './index.js'

describe('profileFor', () => {
  test('returns the definition for each known key', () => {
    for (const key of PROFILE_KEYS) {
      expect(profileFor(key).key).toBe(key)
    }
  })

  test('refuses an unknown profile key, listing the known ones', () => {
    expect(() => profileFor('made-up-profile')).toThrow(
      /parity-v1, requirements-v2/
    )
  })

  test('defaults to parity-v1', () => {
    expect(profileFor().key).toBe(DEFAULT_PROFILE_KEY)
    expect(profileFor(undefined).key).toBe('parity-v1')
  })

  test('refuses a key that only resolves because it shadows Object.prototype', () => {
    expect(() => profileFor('constructor')).toThrow(/Unknown profile/)
    expect(() => profileFor('toString')).toThrow(/Unknown profile/)
    expect(() => profileFor('hasOwnProperty')).toThrow(/Unknown profile/)
  })
})

const requiredHooks = {
  key: 'string',
  itemsKey: 'string',
  idPrefix: 'string',
  identityField: 'string',
  identityOf: 'function',
  slugOf: 'function',
  itemsDir: 'function',
  context: 'function',
  validateItem: 'function',
  sortKey: 'function',
  references: 'object',
  frozen: 'object',
  bornStatus: 'function',
  isRuled: 'function',
  requireVerification: 'function',
  rowFrom: 'function',
  bornExtras: 'function',
  foldOnto: 'function',
  header: 'function',
  parseBacklog: 'function',
  parseItem: 'function',
  summary: 'function',
  messages: 'object'
}

describe('every registered profile definition', () => {
  for (const key of PROFILE_KEYS) {
    test(`${key} carries every hook the writer core calls`, () => {
      const definition = profileFor(key)
      for (const [hook, type] of Object.entries(requiredHooks)) {
        expect(typeof definition[hook]).toBe(type)
      }
    })
  }
})
