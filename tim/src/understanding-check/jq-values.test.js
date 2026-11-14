import { describe, expect, test } from 'vitest'
import {
  alternative,
  compareJq,
  elements,
  field,
  interpolated,
  jqLength,
  joined,
  optionalElements,
  rawOutput,
  uniqueSorted
} from './jq-values.js'

describe('#interpolated', () => {
  test.each([
    ['text', 'text'],
    [null, 'null'],
    [undefined, 'null'],
    [7, '7'],
    [{ a: [1, 'b'] }, '{"a":[1,"b"]}']
  ])('Should print %j as %j', (value, printed) => {
    expect(interpolated(value)).toBe(printed)
  })
})

describe('#rawOutput', () => {
  test('Should print text as it is, without its trailing newlines', () => {
    expect(rawOutput('two\nlines\n\n')).toBe('two\nlines')
  })

  test('Should print an object as indented JSON', () => {
    expect(rawOutput({ a: 1 })).toBe('{\n  "a": 1\n}')
  })
})

describe('#alternative', () => {
  test.each([
    [null, 'fallback'],
    [undefined, 'fallback'],
    [false, 'fallback'],
    [0, 0],
    ['', '']
  ])('Should give %j as %j', (value, given) => {
    expect(alternative(value, 'fallback')).toBe(given)
  })
})

describe('#field', () => {
  test('Should give null for a missing key and for null', () => {
    expect([field({}, 'a'), field(null, 'a')]).toEqual([null, null])
  })

  test('Should refuse to read a key from a list', () => {
    expect(() => field([1], 'a')).toThrow('Error: cannot read a from [1]')
  })
})

describe('#jqLength', () => {
  test.each([
    [null, 0],
    [[1, 2], 2],
    [{ a: 1, b: 2, c: 3 }, 3],
    [-4, 4],
    ['café😀', 5]
  ])('Should measure %j as %j', (value, length) => {
    expect(jqLength(value)).toBe(length)
  })

  test('Should refuse true, which has no length', () => {
    expect(() => jqLength(true)).toThrow('Error: true has no length')
  })
})

describe('#elements and #optionalElements', () => {
  test('Should refuse anything but a list where a list is needed', () => {
    expect(() => elements(null, 'prs')).toThrow('Error: prs is not a list')
  })

  test('Should give an object its values and anything else nothing', () => {
    expect([
      optionalElements({ a: 1, b: 2 }),
      optionalElements('text'),
      optionalElements(null)
    ]).toEqual([[1, 2], [], []])
  })
})

describe('#joined', () => {
  test('Should join null as empty and numbers and booleans as text', () => {
    expect(joined([null, 'x', 1, true], ', ', 'list')).toBe(', x, 1, true')
  })

  test('Should refuse an object in the list', () => {
    expect(() => joined([{}], ', ', 'list')).toThrow(
      'Error: cannot join {} into text'
    )
  })
})

describe('#uniqueSorted', () => {
  test('Should sort null, numbers then text by code point, dropping duplicates', () => {
    expect(
      uniqueSorted(['b', 'a', 1, null, 'B', 'é', 'z', 'a', '😀', '￿'])
    ).toEqual([null, 1, 'B', 'a', 'b', 'z', 'é', '￿', '😀'])
  })
})

describe('#compareJq', () => {
  test('Should sort values as jq sort does: null, then numbers, then strings by code point', () => {
    const sorted = ['b', 2, null, 'B', 'é', 1].sort(compareJq)

    expect(sorted).toEqual([null, 1, 2, 'B', 'b', 'é'])
  })
})
