import { describe, test, expect } from 'vitest'
import * as writerExitCodes from './writerExitCodes.js'
import { TimError } from '../errors.js'
import { exitCodeFor } from '../commands/envelope.js'

describe('writer exit codes', () => {
  test('LOST_UPDATE is 3 and LOCKED is 4', () => {
    expect(writerExitCodes.LOST_UPDATE).toBe(3)
    expect(writerExitCodes.LOCKED).toBe(4)
  })

  test('exitCodeFor maps every code this file exports to that same number', () => {
    for (const [code, value] of Object.entries(writerExitCodes)) {
      expect(exitCodeFor(new TimError(code, 'x'))).toBe(value)
    }
  })
})
