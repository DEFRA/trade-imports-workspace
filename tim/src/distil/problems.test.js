import { describe, test, expect } from 'vitest'
import { problemsError, schemaProblems } from './problems.js'

const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  required: ['source', 'claims'],
  additionalProperties: false,
  properties: {
    source: { type: 'string', pattern: '\\S' },
    tags: { type: 'array', minItems: 1, uniqueItems: true },
    claims: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'kind'],
        properties: {
          id: { type: 'string', pattern: '^[a-z]+-[0-9]+$' },
          kind: { enum: ['data', 'rule'] },
          holds: { type: 'boolean' }
        }
      }
    }
  }
}

const problemsOf = (value) =>
  schemaProblems({
    label: 'distil/extract/demo.json',
    value,
    schema,
    schemaName: 'demo.schema.json'
  })

describe('schemaProblems', () => {
  test('finds nothing wrong with a value in shape', () => {
    expect(
      problemsOf({
        source: 'repo:tests',
        claims: [{ id: 'a-1', kind: 'data' }]
      })
    ).toEqual([])
  })

  test('names a bad enum value by the id of the item it is in', () => {
    expect(
      problemsOf({
        source: 'repo:tests',
        claims: [{ id: 'vol-5', kind: 'gap' }]
      })
    ).toEqual([
      'distil/extract/demo.json claims[vol-5].kind is "gap". Use one of: data, rule.'
    ])
  })

  test('names an item with no id by its position', () => {
    expect(
      problemsOf({ source: 'repo:tests', claims: [{ kind: 'data' }] })
    ).toEqual(['distil/extract/demo.json claims[0] has no "id".'])
  })

  test('names a missing top-level field against the file', () => {
    expect(problemsOf({ source: 'repo:tests' })).toEqual([
      'distil/extract/demo.json has no "claims".'
    ])
  })

  test('says an only-whitespace field is empty', () => {
    expect(problemsOf({ source: '  ', claims: [] })).toEqual([
      'distil/extract/demo.json source is empty.'
    ])
  })

  test('names a field the schema does not allow', () => {
    expect(problemsOf({ source: 'x', claims: [], extra: 1 })).toEqual([
      'distil/extract/demo.json has "extra", which demo.schema.json does not allow.'
    ])
  })

  test('says what type a field must be', () => {
    expect(
      problemsOf({
        source: 'x',
        claims: [{ id: 'a-1', kind: 'data', holds: 'yes' }]
      })
    ).toEqual([
      'distil/extract/demo.json claims[a-1].holds must be true or false.'
    ])
  })

  test('quotes a value that does not match its pattern', () => {
    expect(
      problemsOf({ source: 'x', claims: [{ id: 'A1', kind: 'data' }] })
    ).toEqual([
      'distil/extract/demo.json claims[A1].id is "A1", which does not match ^[a-z]+-[0-9]+$.'
    ])
  })

  test('counts the items a short list needs', () => {
    expect(problemsOf({ source: 'x', claims: [], tags: [] })).toEqual([
      'distil/extract/demo.json tags needs at least 1 item.'
    ])
  })

  test('finds an item a list repeats', () => {
    expect(problemsOf({ source: 'x', claims: [], tags: ['a', 'a'] })).toEqual([
      'distil/extract/demo.json tags lists the same item twice, at 0 and 1.'
    ])
  })
})

describe('problemsError', () => {
  test('counts the problems and lists each on its own line', () => {
    const error = problemsError(['one', 'two'], 'in /work/area')

    expect(error).toMatchObject({
      code: 'LINT',
      message: '2 problems in /work/area:\none\ntwo'
    })
  })

  test('says "1 problem", not "1 problems"', () => {
    expect(problemsError(['one'], 'in x').message).toBe('1 problem in x:\none')
  })

  test('keeps scoped problems as a list beside the message', () => {
    const error = problemsError(
      [
        { scope: 'reconcile', message: 'one' },
        { scope: 'backlog', message: 'two' }
      ],
      'in x'
    )

    expect(error).toMatchObject({
      message: '2 problems in x:\none\ntwo',
      problems: [
        { scope: 'reconcile', message: 'one' },
        { scope: 'backlog', message: 'two' }
      ]
    })
  })

  test('keeps no list when no problem has a scope', () => {
    expect(problemsError(['one'], 'in x').problems).toBeUndefined()
  })
})
