import { describe, test, expect } from 'vitest'
import { followRef, resolveRef } from './schema-ref.js'

describe('resolveRef', () => {
  test('refuses a ref outside the schema', () => {
    expect(() => resolveRef({}, 'other.json#/a')).toThrow(
      'The schema\'s "$ref" "other.json#/a" is not inside the schema.'
    )
  })

  test('refuses a ref that points at nothing', () => {
    expect(() => resolveRef({ $defs: {} }, '#/$defs/missing')).toThrow(
      'The schema\'s "$ref" "#/$defs/missing" points at nothing.'
    )
  })

  test('decodes escaped pointer segments', () => {
    expect(resolveRef({ 'a/b': { type: 'string' } }, '#/a~1b')).toEqual({
      type: 'string'
    })
  })
})

describe('followRef', () => {
  test('returns a subschema with no ref as it is', () => {
    expect(followRef({}, { type: 'string' })).toEqual({ type: 'string' })
  })

  test('returns the schema a ref points at', () => {
    const root = { $defs: { text: { type: 'string' } } }

    expect(followRef(root, { $ref: '#/$defs/text' })).toEqual({
      type: 'string'
    })
  })
})
