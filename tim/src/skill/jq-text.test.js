import { describe, expect, test } from 'vitest'
import {
  isPlainObject,
  jqField,
  jqPath,
  jqRaw,
  jqToString,
  jsonTypeName,
  stringItems,
  withoutTrailingNewlines
} from './jq-text.js'

describe('#jsonTypeName', () => {
  test('Should name every JSON type the way jq does', () => {
    const names = [null, undefined, [], {}, 'a', 1, true].map(jsonTypeName)

    expect(names).toEqual([
      'null',
      'null',
      'array',
      'object',
      'string',
      'number',
      'boolean'
    ])
  })
})

describe('#isPlainObject', () => {
  test('Should hold for an object and not for an array or null', () => {
    expect([{}, [], null].map(isPlainObject)).toEqual([true, false, false])
  })
})

describe('#jqField', () => {
  test('Should read a key, and null for a missing key or a null value', () => {
    expect([
      jqField({ a: 1 }, 'a'),
      jqField({ a: 1 }, 'b'),
      jqField(null, 'a')
    ]).toEqual([1, null, null])
  })

  test('Should refuse to index a value that is not an object', () => {
    expect(() => jqField(true, 'deep')).toThrow(
      'Cannot index boolean with "deep"'
    )
  })
})

describe('#jqPath', () => {
  test('Should read along the keys, stopping at null', () => {
    expect([
      jqPath({ a: { b: 2 } }, ['a', 'b']),
      jqPath({ a: null }, ['a', 'b'])
    ]).toEqual([2, null])
  })
})

describe('#jqToString', () => {
  test('Should keep a string and write anything else as compact JSON', () => {
    const shown = ['x', false, 42, ['yes'], { a: 1 }].map(jqToString)

    expect(shown).toEqual(['x', 'false', '42', '["yes"]', '{"a":1}'])
  })
})

describe('#jqRaw', () => {
  test('Should keep a string and indent anything else by two spaces', () => {
    expect([jqRaw('x'), jqRaw({ a: 1 }), jqRaw(null)]).toEqual([
      'x',
      '{\n  "a": 1\n}',
      'null'
    ])
  })
})

describe('#withoutTrailingNewlines', () => {
  test('Should drop every trailing newline and keep inner ones', () => {
    expect(withoutTrailingNewlines('a\n\nb\n\n')).toBe('a\n\nb')
  })
})

describe('#stringItems', () => {
  test('Should give back a list of strings', () => {
    expect(stringItems(['a', 'b'], 'helpers')).toEqual(['a', 'b'])
  })

  test('Should refuse a list holding something other than strings', () => {
    expect(() => stringItems(['a', 1], 'helpers')).toThrow(
      'The helpers answer must be a list of words in quotes, like ["one", "two"].'
    )
  })
})
