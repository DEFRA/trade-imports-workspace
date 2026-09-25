import { describe, test, expect } from 'vitest'
import { makeFinding } from './finding.js'

describe('makeFinding', () => {
  test('binds the check name and carries capability and message through', () => {
    const finding = makeFinding('shape')

    expect(finding('widgets', 'coverage.json is not valid JSON.')).toEqual({
      check: 'shape',
      capability: 'widgets',
      message: 'coverage.json is not valid JSON.'
    })
  })

  test('two factories bound to different check names stay independent', () => {
    const shapeFinding = makeFinding('shape')
    const idsFinding = makeFinding('ids')

    expect(shapeFinding('a', 'x').check).toBe('shape')
    expect(idsFinding('a', 'x').check).toBe('ids')
  })
})
