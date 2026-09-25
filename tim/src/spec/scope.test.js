import { describe, test, expect } from 'vitest'
import { inScope } from './scope.js'

describe('inScope', () => {
  test('everything is in scope when no scope is given', () => {
    expect(inScope('live-animals/addresses', undefined)).toBe(true)
  })

  test('the scope capability itself is in scope', () => {
    expect(inScope('live-animals', 'live-animals')).toBe(true)
  })

  test('a descendant of the scope capability is in scope', () => {
    expect(inScope('live-animals/addresses', 'live-animals')).toBe(true)
  })

  test('a sibling that merely shares a prefix is not in scope', () => {
    expect(inScope('live-animals-other', 'live-animals')).toBe(false)
  })

  test('an unrelated capability is out of scope', () => {
    expect(inScope('plants/addresses', 'live-animals')).toBe(false)
  })

  test('a non-string capability path (a delegated finding with none) is out of scope rather than throwing', () => {
    expect(inScope(undefined, 'live-animals')).toBe(false)
  })
})
