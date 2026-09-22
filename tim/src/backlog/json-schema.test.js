import { describe, test, expect } from 'vitest'
import { followRef, resolveRef, validateJson } from './json-schema.js'

const schemaOf = (body) => ({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  ...body
})

describe('validateJson', () => {
  test('passes a value that fits', () => {
    const schema = schemaOf({
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string', minLength: 1 } }
    })

    expect(validateJson(schema, { name: 'Ada' })).toEqual([])
  })

  test('names a missing required property at the object that lacks it', () => {
    const schema = schemaOf({ type: 'object', required: ['name'] })

    expect(validateJson(schema, {})).toEqual([
      { path: [], keyword: 'required', params: { missingProperty: 'name' } }
    ])
  })

  test('names the wrong type', () => {
    expect(validateJson(schemaOf({ type: 'array' }), 'x')).toEqual([
      { path: [], keyword: 'type', params: { type: 'array' } }
    ])
  })

  test('accepts any of a list of types', () => {
    expect(validateJson(schemaOf({ type: ['string', 'null'] }), null)).toEqual(
      []
    )
  })

  test('tells an array from an object and null from both', () => {
    const objectSchema = schemaOf({ type: 'object' })

    expect(
      [[], null].map((value) => validateJson(objectSchema, value).length)
    ).toEqual([1, 1])
  })

  test('names a value outside an enum with the allowed values', () => {
    expect(validateJson(schemaOf({ enum: ['a', 'b'] }), 'c')).toEqual([
      { path: [], keyword: 'enum', params: { allowedValues: ['a', 'b'] } }
    ])
  })

  test('names a value that is not the const', () => {
    expect(validateJson(schemaOf({ const: 'a' }), 'b')).toEqual([
      { path: [], keyword: 'const', params: { allowedValue: 'a' } }
    ])
  })

  test('checks pattern and minLength on strings only', () => {
    const schema = schemaOf({ pattern: '\\S', minLength: 2 })

    expect({
      blank: validateJson(schema, ' ').map((error) => error.keyword),
      number: validateJson(schema, 5)
    }).toEqual({ blank: ['minLength', 'pattern'], number: [] })
  })

  test('checks minItems and every item, naming the item by index', () => {
    const schema = schemaOf({
      type: 'array',
      minItems: 1,
      items: { type: 'string' }
    })

    expect({
      empty: validateJson(schema, []),
      wrongItem: validateJson(schema, ['a', 2])
    }).toEqual({
      empty: [{ path: [], keyword: 'minItems', params: { limit: 1 } }],
      wrongItem: [{ path: [1], keyword: 'type', params: { type: 'string' } }]
    })
  })

  test('follows a local $ref', () => {
    const schema = schemaOf({
      $defs: { text: { type: 'string' } },
      properties: { name: { $ref: '#/$defs/text' } }
    })

    expect(validateJson(schema, { name: 1 })).toEqual([
      { path: ['name'], keyword: 'type', params: { type: 'string' } }
    ])
  })

  test('reports a failed anyOf once, without each branch', () => {
    const schema = schemaOf({ anyOf: [{ type: 'string' }, { type: 'array' }] })

    expect({
      text: validateJson(schema, 'a'),
      number: validateJson(schema, 1)
    }).toEqual({
      text: [],
      number: [{ path: [], keyword: 'anyOf', params: {} }]
    })
  })

  test('collects every allOf branch', () => {
    const schema = schemaOf({
      allOf: [{ required: ['a'] }, { required: ['b'] }]
    })

    expect(validateJson(schema, {}).map((error) => error.params)).toEqual([
      { missingProperty: 'a' },
      { missingProperty: 'b' }
    ])
  })

  test('refuses a value the not matches', () => {
    const schema = schemaOf({ not: { required: ['recipe'] } })

    expect({
      without: validateJson(schema, {}),
      with: validateJson(schema, { recipe: [] })
    }).toEqual({
      without: [],
      with: [{ path: [], keyword: 'not', params: {} }]
    })
  })

  test('applies then only when if matches, and else otherwise', () => {
    const schema = schemaOf({
      if: { properties: { status: { const: 'blocked' } } },
      then: { required: ['openQuestions'] },
      else: { required: ['title'] }
    })

    expect({
      blocked: validateJson(schema, { status: 'blocked' }),
      todo: validateJson(schema, { status: 'todo' }),
      todoWithTitle: validateJson(schema, { status: 'todo', title: 'x' })
    }).toEqual({
      blocked: [
        { path: [], keyword: 'if', params: { failingKeyword: 'then' } }
      ],
      todo: [{ path: [], keyword: 'if', params: { failingKeyword: 'else' } }],
      todoWithTitle: []
    })
  })

  test('treats true as anything and false as nothing', () => {
    expect({
      anything: validateJson(schemaOf({ properties: { a: true } }), { a: 1 }),
      nothing: validateJson(schemaOf({ properties: { a: false } }), { a: 1 })
    }).toEqual({
      anything: [],
      nothing: [{ path: ['a'], keyword: 'false', params: {} }]
    })
  })

  test('refuses a schema that uses a keyword it does not check', () => {
    const schema = schemaOf({
      properties: { name: { type: 'string', maxLength: 3 } }
    })

    expect(() => validateJson(schema, {})).toThrow(
      `The schema at #/properties/name uses "maxLength", which tim's schema checker does not support.`
    )
  })
})

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
