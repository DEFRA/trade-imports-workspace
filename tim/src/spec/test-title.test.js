import { describe, expect, test } from 'vitest'
import { isTitlePattern, titleNames, titlePatternOf } from './test-title.js'

describe('#titleNames', () => {
  test('Should name a title the source spells out', () => {
    expect(titleNames('offers a search box', 'offers a search box')).toBe(true)
  })

  test('Should not name a different title', () => {
    expect(titleNames('offers a search box', 'offers a filter')).toBe(false)
  })

  test('Should name every title a $placeholder stands for, as test.each fills it in', () => {
    const literal = 'Should word the port hint exactly in $language'

    expect(
      titleNames(literal, 'Should word the port hint exactly in English')
    ).toBe(true)
    expect(
      titleNames(literal, 'Should word the port hint exactly in Welsh')
    ).toBe(true)
  })

  test('Should name a title a printf placeholder stands for', () => {
    expect(
      titleNames(
        'declares the roles %s carries',
        'declares the roles BRANCH carries'
      )
    ).toBe(true)
  })

  test('Should name a title a template placeholder stands for', () => {
    // eslint-disable-next-line no-template-curly-in-string -- the placeholder is what this reads
    const literal = 'saves ${count} addresses'

    expect(titleNames(literal, 'saves 3 addresses')).toBe(true)
  })

  test('Should not name a title the fixed words of a pattern rule out', () => {
    expect(
      titleNames(
        'Should word the port hint exactly in $language',
        'Should word the county hint exactly in English'
      )
    ).toBe(false)
  })

  test('Should read an escaped quote as the character it stands for', () => {
    expect(
      titleNames("shows the trader\\'s address", "shows the trader's address")
    ).toBe(true)
  })
})

describe('#isTitlePattern', () => {
  test('Should not read a placeholder with too few fixed words as a pattern, so a bare value matches nothing', () => {
    expect(isTitlePattern('$language')).toBe(false)
    expect(isTitlePattern('%s')).toBe(false)
  })

  test('Should read a placeholder among fixed words as a pattern', () => {
    expect(isTitlePattern('in $language exactly')).toBe(true)
  })
})

describe('#titlePatternOf', () => {
  test('Should match across newlines, so a title broken over lines still matches', () => {
    expect(
      titlePatternOf('asks $what of the trader').test(
        'asks a\nquestion of the trader'
      )
    ).toBe(true)
  })
})
