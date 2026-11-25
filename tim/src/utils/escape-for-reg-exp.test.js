import { describe, expect, test } from 'vitest'
import { escapeForRegExp } from './escape-for-reg-exp.js'

describe('#escapeForRegExp', () => {
  test('Should escape every character a pattern treats as special', () => {
    expect(escapeForRegExp('a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o')).toBe(
      'a\\.b\\*c\\+d\\?e\\^f\\$g\\{h\\}i\\(j\\)k\\|l\\[m\\]n\\\\o'
    )
  })

  test('Should make a pattern that matches the text literally', () => {
    expect(new RegExp(escapeForRegExp('1.5 (beta)')).test('v1.5 (beta)')).toBe(
      true
    )
    expect(new RegExp(escapeForRegExp('1.5')).test('125')).toBe(false)
  })

  test('Should leave plain text as it is', () => {
    expect(escapeForRegExp('inc-001')).toBe('inc-001')
  })
})
