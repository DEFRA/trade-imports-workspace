import { describe, it, expect } from 'vitest'
import {
  errorItems,
  assessAdvance,
  isTerminal,
  stopReason,
  budgetExhausted
} from './stopping.js'

const at = (over = {}) => ({
  routeTemplate: '/name',
  fingerprint: 'aaaaaaaaaa',
  errors: [],
  ...over
})

describe('errorItems', () => {
  it('reads the error summary the application rendered', () => {
    expect(
      errorItems({ errorSummary: { items: ['Enter your name'] } })
    ).toEqual(['Enter your name'])
  })

  it('finds no errors on a page that has no summary', () => {
    expect(errorItems({})).toEqual([])
  })
})

describe('assessAdvance', () => {
  it('counts a new route as having advanced', () => {
    const advance = assessAdvance({
      before: at(),
      after: at({ routeTemplate: '/address' })
    })

    expect(advance.advanced).toBe(true)
  })

  it('counts the same page coming back with errors as not having advanced', () => {
    const advance = assessAdvance({
      before: at(),
      after: at({ errors: ['Enter your name'] })
    })

    expect(advance.advanced).toBe(false)
  })

  it('counts the same route in a different shape as having advanced', () => {
    const advance = assessAdvance({
      before: at(),
      after: at({ fingerprint: 'bbbbbbbbbb' })
    })

    expect(advance.advanced).toBe(true)
  })
})

describe('isTerminal', () => {
  it('calls a confirmation page the end of the journey, not a failure', () => {
    expect(
      isTerminal({
        outgoing: [],
        routeTemplate: '/notification/:id/confirmation'
      })
    ).toBe(true)
  })

  it('calls a page with nothing safe to press the end of a branch', () => {
    expect(
      isTerminal({
        outgoing: [{ class: 'destructive' }],
        routeTemplate: '/check-answers'
      })
    ).toBe(true)
  })

  it('does not call a page with a continue button the end of anything', () => {
    expect(
      isTerminal({ outgoing: [{ class: 'safe' }], routeTemplate: '/name' })
    ).toBe(false)
  })
})

describe('stopReason', () => {
  it('says nothing while the page is still moving', () => {
    expect(
      stopReason({ advance: { advanced: true }, errors: [], attempts: 1 })
    ).toBeNull()
  })

  it('allows one more attempt the first time validation pushes back', () => {
    expect(
      stopReason({
        advance: { advanced: false },
        errors: ['Enter a CPH number'],
        attempts: 1
      })
    ).toBeNull()
  })

  it('gives up on the second identical error set, quoting the errors as evidence', () => {
    expect(
      stopReason({
        advance: { advanced: false },
        errors: ['Enter a CPH number'],
        attempts: 2
      })
    ).toEqual({
      reason: 'validation-exhausted',
      evidence: ['Enter a CPH number']
    })
  })

  it('separates a silently swallowed submit from an exhausted value ladder', () => {
    const stop = stopReason({
      advance: { advanced: false },
      errors: [],
      attempts: 1
    })

    expect(stop.reason).toBe('no-progress')
  })
})

describe('budgetExhausted', () => {
  it('names the step budget when the steps run out', () => {
    expect(budgetExhausted({ steps: 400, replays: 0 }, { steps: 400 })).toBe(
      'steps'
    )
  })

  it('names the clock when the run has taken too long', () => {
    expect(
      budgetExhausted(
        { steps: 1, replays: 1, elapsedMs: 900_001 },
        { steps: 400, wallClockMs: 900_000 }
      )
    ).toBe('wall-clock')
  })

  it('says nothing while every budget still has room', () => {
    expect(
      budgetExhausted({ steps: 1, replays: 1, elapsedMs: 10 }, { steps: 400 })
    ).toBeNull()
  })
})
