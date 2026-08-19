import { describe, it, expect } from 'vitest'
import {
  asPlanStep,
  continues,
  routePlanFromMap
} from './route-plan-from-map.js'
import { parseRoutePlan } from '../route-plan.js'

const step = (action) => ({ screen: 'fe-start', action })

const fill = { kind: 'fill', name: 'fullName', value: 'Cartographer Test' }
const submit = { kind: 'submit', label: 'Continue', name: null, value: null }

const screen = (over = {}) => ({
  id: 'fe-start',
  routeTemplate: '/start',
  heading: 'What is your full name?',
  route: [],
  ...over
})

const mapOf = (screens) => ({
  side: 'frontend',
  baseUrl: 'http://localhost:3000',
  startPath: '/',
  mappedOn: '2026-08-19T00:00:00.000Z',
  screens
})

describe('asPlanStep', () => {
  it('says a fill as a selector and a value', () => {
    expect(asPlanStep(fill)).toEqual({
      action: 'fill',
      selector: '[name="fullName"]',
      value: 'Cartographer Test'
    })
  })

  it('says a radio choice as a check on that option', () => {
    expect(
      asPlanStep({ kind: 'choose', name: 'reason', value: 'transit' })
    ).toEqual({ action: 'check', selector: '[name="reason"][value="transit"]' })
  })

  it('has no word for a type-ahead', () => {
    expect(asPlanStep({ kind: 'typeahead', name: 'country' })).toBeNull()
  })
})

describe('continues', () => {
  it('recognises a walk that carries on from where the last one stopped', () => {
    expect(continues([step(fill)], [step(fill), step(submit)])).toBe(true)
  })

  it('rejects a walk that answered an earlier question differently', () => {
    expect(
      continues(
        [step({ kind: 'choose', name: 'reason', value: 'market' })],
        [step({ kind: 'choose', name: 'reason', value: 'transit' })]
      )
    ).toBe(false)
  })
})

describe('routePlanFromMap', () => {
  it('writes each route as the steps since the last one, not as a replay', () => {
    const { plan } = routePlanFromMap(
      mapOf([
        screen(),
        screen({
          id: 'fe-confirmation',
          routeTemplate: '/confirmation',
          heading: 'Notification submitted',
          route: [step(fill), step(submit)]
        })
      ])
    )

    expect(plan.routes.map((route) => route.steps)).toEqual([
      [],
      [
        {
          action: 'fill',
          selector: '[name="fullName"]',
          value: 'Cartographer Test'
        },
        { action: 'continue' }
      ]
    ])
  })

  it('produces a plan the capture stage accepts', () => {
    const { plan } = routePlanFromMap(mapOf([screen()]))

    expect(() => parseRoutePlan(plan, 'derived')).not.toThrow()
  })

  it('names a branch that would need a fresh session rather than walking it wrongly', () => {
    const { plan, unexpressible } = routePlanFromMap(
      mapOf([
        screen({
          id: 'fe-market',
          route: [step({ kind: 'choose', name: 'reason', value: 'market' })]
        }),
        screen({
          id: 'fe-transit',
          route: [step({ kind: 'choose', name: 'reason', value: 'transit' })]
        })
      ])
    )

    expect(plan.routes.map((route) => route.screen)).toEqual(['fe-market'])
    expect(unexpressible).toEqual([
      {
        screen: 'fe-transit',
        why: 'reaching it means starting a fresh session, which one walk cannot do'
      }
    ])
  })

  it('names a screen only a widget can reach', () => {
    const { unexpressible } = routePlanFromMap(
      mapOf([
        screen({
          id: 'fe-port',
          route: [step({ kind: 'typeahead', name: 'port', value: 'Dover' })]
        })
      ])
    )

    expect(unexpressible[0].why).toContain('needs a typeahead')
  })
})
