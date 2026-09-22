import { describe, test, expect } from 'vitest'
import { TimError, isTimError } from './errors.js'

describe('TimError', () => {
  test('constructs with a known code and message', () => {
    const error = new TimError('AUTH', 'Set GITHUB_TOKEN.')
    expect(error.name).toBe('TimError')
    expect(error.code).toBe('AUTH')
    expect(error.message).toBe('Set GITHUB_TOKEN.')
  })

  test('preserves an optional cause', () => {
    const upstream = new Error('upstream')
    const error = new TimError('NETWORK', 'Connection refused.', upstream)
    expect(error.cause).toBe(upstream)
  })

  test('constructs with LINT', () => {
    const error = new TimError('LINT', 'x')
    expect(error.code).toBe('LINT')
  })

  test('ER1: constructs with LOST_UPDATE and LOCKED', () => {
    expect(new TimError('LOST_UPDATE', 'x').code).toBe('LOST_UPDATE')
    expect(new TimError('LOCKED', 'x').code).toBe('LOCKED')
  })

  test('constructs with DIRTY_TREE for a repo with uncommitted work', () => {
    expect(new TimError('DIRTY_TREE', 'x').code).toBe('DIRTY_TREE')
  })

  test('rejects unknown codes — protects the closed enum', () => {
    expect(() => new TimError('MADE_UP', 'x')).toThrow(/not in the allowed set/)
  })

  test('is catchable as Error', () => {
    try {
      throw new TimError('USAGE', 'bad')
    } catch (error) {
      expect(error instanceof Error).toBe(true)
      expect(error instanceof TimError).toBe(true)
    }
  })

  test('isTimError true for TimError, false for plain Error', () => {
    expect(isTimError(new TimError('USAGE', 'x'))).toBe(true)
    expect(isTimError(new Error('x'))).toBe(false)
    expect(isTimError(null)).toBe(false)
    expect(isTimError('AUTH')).toBe(false)
  })
})
