import { describe, test, expect } from 'vitest'
import { isMavenRange, mavenRangeIncludes } from './maven-range.js'

describe('#isMavenRange', () => {
  test.each(['[3.0.0,4.0.0)', '[3.0.0,)', '(,4.0.0)', '[3.0.0]', '(2.6,3]'])(
    'Should accept %s',
    (range) => {
      expect(isMavenRange(range)).toBe(true)
    }
  )

  test.each([
    ['an npm range', '3.x'],
    ['a bare version', '3.0.0'],
    ['a union of intervals', '[1.0,2.0),[3.0,)'],
    ['an interval with no bounds', '[,]'],
    ['an empty lower bound shut by [', '[,4.0.0)'],
    ['an empty upper bound shut by ]', '[3.0.0,]'],
    ['bounds out of order', '[4.0.0,3.0.0)'],
    ['a bound that names no version', '[three,)']
  ])('Should refuse %s', (_case, range) => {
    expect(isMavenRange(range)).toBe(false)
  })
})

describe('#mavenRangeIncludes', () => {
  test.each([
    ['[3.0.0,4.0.0)', '3.0.0', true],
    ['[3.0.0,4.0.0)', '3.2.1', true],
    ['[3.0.0,4.0.0)', '4.0.0', false],
    ['[3.0.0,4.0.0)', '2.8.9', false],
    ['(3.0.0,4.0.0]', '3.0.0', false],
    ['(3.0.0,4.0.0]', '4.0.0', true],
    ['[3.0.0,)', '9.1.0', true],
    ['(,3.0.0)', '2.8.9', true],
    ['[3.0.0]', '3.0.0', true],
    ['[3.0.0]', '3.0.1', false],
    ['[3.0.0,4.0.0)', '3.0.0-M1', true]
  ])('Should say whether %s includes %s', (range, version, included) => {
    expect(mavenRangeIncludes(range, version)).toBe(included)
  })

  test('Should say a range it cannot read includes nothing', () => {
    expect(mavenRangeIncludes('3.x', '3.0.0')).toBe(false)
  })
})
