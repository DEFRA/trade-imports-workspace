import { describe, test, expect } from 'vitest'
import { validateJson } from './validate-json.js'

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
    expect(
      validateJson(schemaOf({ type: 'array' }), 'x').map(
        (error) => error.keyword
      )
    ).toEqual(['type'])
  })

  test('names a value outside an enum with the allowed values', () => {
    expect(validateJson(schemaOf({ enum: ['a', 'b'] }), 'c')).toEqual([
      { path: [], keyword: 'enum', params: { allowedValues: ['a', 'b'] } }
    ])
  })

  test('checks pattern and minLength on strings only', () => {
    const schema = schemaOf({ pattern: '\\S', minLength: 2 })

    expect({
      blank: validateJson(schema, ' ')
        .map((error) => error.keyword)
        .sort(),
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

  test('refuses a value the not matches, without the matched branch errors', () => {
    const schema = schemaOf({ not: { required: ['recipe'] } })

    expect({
      without: validateJson(schema, {}),
      with: validateJson(schema, { recipe: [] })
    }).toEqual({
      without: [],
      with: [{ path: [], keyword: 'not', params: {} }]
    })
  })

  test('applies then only when if matches, and else otherwise, without the branch errors', () => {
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

  test('collects every allOf branch', () => {
    const schema = schemaOf({
      allOf: [{ required: ['a'] }, { required: ['b'] }]
    })

    expect(validateJson(schema, {}).map((error) => error.params)).toEqual([
      { missingProperty: 'a' },
      { missingProperty: 'b' }
    ])
  })

  test('compiles a schema object once and reuses it across calls', () => {
    const schema = schemaOf({ type: 'object', required: ['name'] })

    expect(validateJson(schema, {})).toEqual(validateJson(schema, {}))
    expect(validateJson(schema, { name: 'Ada' })).toEqual([])
  })
})
