import { describe, test, expect } from 'vitest'
import { chooseWorkers } from './choose.js'

const trial = (workers, wallSeconds, extra = {}) => ({
  workers,
  exitCode: 0,
  wallSeconds,
  swapoutPages: 0,
  shellStartMs: { max: 20 },
  ...extra
})

describe('#chooseWorkers', () => {
  test('Should choose the fewest workers within 5% of the fastest run', () => {
    const chosen = chooseWorkers([trial(2, 333), trial(3, 240), trial(4, 234)])

    expect(chosen.workers).toBe(3)
  })

  test('Should take one fewer worker when the chosen count swapped', () => {
    const chosen = chooseWorkers([
      trial(2, 333),
      trial(3, 285),
      trial(4, 234, { swapoutPages: 23620 })
    ])

    expect(chosen).toEqual({
      workers: 3,
      reason:
        '4 workers was fastest but swapped out 23620 pages, so one fewer: 3 took 285s.'
    })
  })

  test('Should take one fewer worker when the chosen count kept a shell waiting over 100 ms', () => {
    const chosen = chooseWorkers([
      trial(2, 120),
      trial(3, 90, { shellStartMs: { max: 186 } })
    ])

    expect(chosen.workers).toBe(2)
  })

  test('Should keep the fewest count when it strained and nothing fewer passed', () => {
    const chosen = chooseWorkers([
      trial(2, 100, { swapoutPages: 10 }),
      trial(3, 140)
    ])

    expect(chosen).toEqual({
      workers: 2,
      reason:
        '2 workers swapped out 10 pages, and no fewer passed, so it stays at 2.'
    })
  })

  test('Should leave out a count whose run failed', () => {
    const chosen = chooseWorkers([
      trial(2, 400),
      trial(3, 200, { exitCode: 1 })
    ])

    expect(chosen.workers).toBe(2)
  })

  test("Should keep the script's own count when no run passed", () => {
    const chosen = chooseWorkers([trial(2, 100, { exitCode: 1 })])

    expect(chosen.workers).toBeNull()
  })
})
