import { describe, test, expect } from 'vitest'
import { readBackUntilLanded } from './read-back.js'

const readsAnswering = (...answers) => {
  const remaining = [...answers]
  return async () => remaining.shift() ?? false
}

describe('readBackUntilLanded', () => {
  test('answers true once a read shows the write', async () => {
    const landed = await readBackUntilLanded(
      readsAnswering(false, false, true),
      { attempts: 3, delayMs: 0 }
    )

    expect(landed).toBe(true)
  })

  test('answers false when no read within the attempts shows the write', async () => {
    const landed = await readBackUntilLanded(
      readsAnswering(false, false, true),
      { attempts: 2, delayMs: 0 }
    )

    expect(landed).toBe(false)
  })
})
