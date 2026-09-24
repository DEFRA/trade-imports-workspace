import { describe, test, expect } from 'vitest'
import { nonBlankLines } from './lines.js'

describe('nonBlankLines', () => {
  test('drops blank lines but keeps each survivor tied to its physical line number', () => {
    const lines = nonBlankLines('{"a":1}\n\nnot json\n')

    expect(lines).toEqual([
      { lineNumber: 1, text: '{"a":1}' },
      { lineNumber: 3, text: 'not json' }
    ])
  })

  test('an empty string gives no lines', () => {
    expect(nonBlankLines('')).toEqual([])
  })
})
