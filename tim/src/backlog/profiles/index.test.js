import { describe, test, expect } from 'vitest'
import {
  profileFor,
  collectionKeysFor,
  PROFILE_KEYS,
  DEFAULT_PROFILE_KEY
} from './index.js'

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

describe('collections (D1)', () => {
  test("profileFor('requirements-v2', 'increments').idPrefix is inc-", () => {
    expect(profileFor('requirements-v2', 'increments').idPrefix).toBe('inc-')
  })

  test("profileFor('requirements-v2') with no collection resolves the atoms collection", () => {
    expect(profileFor('requirements-v2').idPrefix).toBe('req-')
  })

  test("profileFor('parity-v1', 'atoms') is refused, naming findings", () => {
    expect(() => profileFor('parity-v1', 'atoms')).toThrow(/findings/)
  })

  test("profileFor('requirements-v2', 'made-up') is refused, naming atoms and increments", () => {
    expect(() => profileFor('requirements-v2', 'made-up')).toThrow(
      /atoms, increments/
    )
  })

  test('collectionKeysFor returns the collections per profile', () => {
    expect(collectionKeysFor('parity-v1')).toEqual(['findings'])
    expect(collectionKeysFor('requirements-v2')).toEqual([
      'atoms',
      'increments'
    ])
  })
})

const requiredHooks = {
  key: 'string',
  collection: 'string',
  itemsKey: 'string',
  idPrefix: 'string',
  identityField: 'string',
  identityOf: 'function',
  slugOf: 'function',
  itemsDir: 'function',
  context: 'function',
  validateItem: 'function',
  sortKey: 'function',
  expandItems: 'function',
  referenceTables: 'function',
  references: 'object',
  bornStatus: 'function',
  isRuled: 'function',
  requireVerification: 'function',
  rowFrom: 'function',
  bornExtras: 'function',
  foldOnto: 'function',
  cycleEdges: 'function',
  checkRows: 'function',
  header: 'function',
  parseBacklog: 'function',
  parseItem: 'function',
  summary: 'function',
  messages: 'object'
}

const everyDefinition = () =>
  PROFILE_KEYS.flatMap((key) =>
    collectionKeysFor(key).map((collection) => ({
      key,
      collection,
      definition: profileFor(key, collection)
    }))
  )

describe('every registered profile definition', () => {
  for (const { key, collection, definition } of everyDefinition()) {
    test(`${key}/${collection} carries every hook the writer core calls`, () => {
      for (const [hook, type] of Object.entries(requiredHooks)) {
        expect(typeof definition[hook]).toBe(type)
      }
    })
  }

  test('frozen is null, or an object with field and compose (D19)', () => {
    for (const { definition } of everyDefinition()) {
      if (definition.frozen === null) continue
      expect(typeof definition.frozen).toBe('object')
      expect(typeof definition.frozen.field).toBe('string')
      expect(typeof definition.frozen.compose).toBe('function')
    }
  })

  test('regroupField is null, or a string; "members" for increments (D29)', () => {
    for (const { key, collection, definition } of everyDefinition()) {
      if (key === 'requirements-v2' && collection === 'increments') {
        expect(definition.regroupField).toBe('members')
      } else {
        expect(definition.regroupField).toBeNull()
      }
    }
  })

  test('every references entry declares a string scope and a boolean verifyIds (D5.1)', () => {
    for (const { key, definition } of everyDefinition()) {
      for (const entry of definition.references) {
        expect(typeof entry.scope).toBe('string')
        expect(typeof entry.verifyIds).toBe('boolean')
        if (key === 'parity-v1' && entry.field === 'relatedTo') {
          expect(entry.verifyIds).toBe(false)
        }
        if (key === 'requirements-v2') {
          expect(entry.verifyIds).toBe(true)
        }
      }
    }
  })
})
