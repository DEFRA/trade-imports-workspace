import { describe, test, expect } from 'vitest'
import { SIGNED_OFF_CHANGED } from './specExitCodes.js'

describe('spec exit codes', () => {
  test('Should give 3 for a change to a signed-off scenario', () => {
    expect(SIGNED_OFF_CHANGED).toBe(3)
  })
})
