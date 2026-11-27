import { describe, expect, test } from 'vitest'
import { countOf } from './count-of.js'

describe('#countOf', () => {
  test('Should give the singular word for one', () => {
    expect(countOf(1, 'row')).toBe('1 row')
  })

  test('Should give the plural word for any other count', () => {
    expect([countOf(0, 'row'), countOf(2, 'row')]).toEqual(['0 rows', '2 rows'])
  })

  test('Should use the plural it is given', () => {
    expect(countOf(2, 'file or folder', 'files or folders')).toBe(
      '2 files or folders'
    )
  })
})
