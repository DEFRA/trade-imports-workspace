import { describe, it, expect } from 'vitest'
import {
  asPlanSteps,
  continues,
  gotoSteps,
  newMemory,
  routePlanFromMap
} from './route-plan-from-map.js'
import { parseRoutePlan, STEP_ACTIONS } from '../route-plan.js'

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

const UUID = '9f1c2b30-4a5e-11ef-9c2d-0242ac120002'

describe('asPlanSteps', () => {
  it('says a fill as a selector and a value', () => {
    expect(asPlanSteps(fill, newMemory())).toEqual([
      {
        action: 'fill',
        selector: '[name="fullName"]',
        value: 'Cartographer Test'
      }
    ])
  })

  it('says a radio choice as a check on that option', () => {
    expect(
      asPlanSteps(
        { kind: 'choose', name: 'reason', value: 'transit' },
        newMemory()
      )
    ).toEqual([
      { action: 'check', selector: '[name="reason"][value="transit"]' }
    ])
  })

  it('has no word for a type-ahead', () => {
    expect(
      asPlanSteps({ kind: 'typeahead', name: 'country' }, newMemory())
    ).toBeNull()
  })

  it('has a producer for every word in the plan vocabulary', () => {
    const crawled = [
      fill,
      { kind: 'choose', name: 'reason', value: 'transit' },
      { kind: 'select', name: 'country', value: 'FR' },
      submit,
      { kind: 'follow', href: `/notifications/${UUID}/tasks` }
    ]
    // goto also opens the plan's prelude, which every plan carries.
    const produced = new Set(['goto'])
    for (const action of crawled) {
      for (const said of asPlanSteps(action, newMemory())) {
        produced.add(said.action)
      }
    }

    expect([...produced].sort()).toEqual([...STEP_ACTIONS].sort())
  })
})

describe('gotoSteps', () => {
  it('goes straight there when the path holds nothing this run invented', () => {
    expect(gotoSteps('/import-reason', newMemory())).toEqual([
      { action: 'goto', path: '/import-reason' }
    ])
  })

  it('learns a generated id off the page rather than baking it in', () => {
    expect(gotoSteps(`/notifications/${UUID}/tasks`, newMemory())).toEqual([
      {
        action: 'remember',
        as: 'notifications',
        from: 'text',
        pattern: '/notifications/([^/"?#]+)/tasks'
      },
      { action: 'goto', path: '/notifications/{notifications}/tasks' }
    ])
  })

  it('asks for the same id once, however many routes need it', () => {
    const memory = newMemory()
    gotoSteps(`/notifications/${UUID}/tasks`, memory)

    expect(gotoSteps(`/notifications/${UUID}/origin`, memory)).toEqual([
      { action: 'goto', path: '/notifications/{notifications}/origin' }
    ])
  })

  it('names two generated segments apart', () => {
    const steps = gotoSteps(
      `/notifications/${UUID}/consignments/7`,
      newMemory()
    )

    expect(steps.map((s) => s.as ?? s.path)).toEqual([
      'notifications',
      'consignments',
      '/notifications/{notifications}/consignments/{consignments}'
    ])
  })

  it('anchors each pattern on its own segment, not on the other one', () => {
    const [first, second] = gotoSteps(
      `/notifications/${UUID}/consignments/7`,
      newMemory()
    )

    expect([first.pattern, second.pattern]).toEqual([
      '/notifications/([^/"?#]+)/consignments/[^/"?#]+',
      '/notifications/[^/"?#]+/consignments/([^/"?#]+)'
    ])
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

  it('walks to a notification it learns today, not the one it saw yesterday', () => {
    const { plan } = routePlanFromMap(
      mapOf([
        screen(),
        screen({
          id: 'fe-notifications-id-tasks',
          routeTemplate: '/notifications/:id/tasks',
          heading: 'Your notification',
          route: [
            step({ kind: 'follow', href: `/notifications/${UUID}/tasks` })
          ]
        })
      ])
    )

    expect(plan.routes[1].steps).toEqual([
      {
        action: 'remember',
        as: 'notifications',
        from: 'text',
        pattern: '/notifications/([^/"?#]+)/tasks'
      },
      { action: 'goto', path: '/notifications/{notifications}/tasks' }
    ])
  })

  it('leaves no name claimed by a route it then could not say', () => {
    const { plan } = routePlanFromMap(
      mapOf([
        screen({
          id: 'fe-port',
          route: [
            step({ kind: 'follow', href: `/notifications/${UUID}/tasks` }),
            step({ kind: 'typeahead', name: 'port', value: 'Dover' })
          ]
        }),
        screen({
          id: 'fe-tasks',
          routeTemplate: '/notifications/:id/tasks',
          heading: 'Your notification',
          route: [
            step({ kind: 'follow', href: `/notifications/${UUID}/tasks` })
          ]
        })
      ])
    )

    expect(plan.routes[0].steps).toEqual([
      {
        action: 'remember',
        as: 'notifications',
        from: 'text',
        pattern: '/notifications/([^/"?#]+)/tasks'
      },
      { action: 'goto', path: '/notifications/{notifications}/tasks' }
    ])
  })

  it('gives a heading-less screen a landmark a real URL can match', () => {
    const { plan } = routePlanFromMap(
      mapOf([
        screen({
          id: 'fe-notifications-id-tasks',
          routeTemplate: '/notifications/:id/tasks',
          heading: null
        })
      ])
    )
    const { urlPattern } = plan.routes[0].landmark

    expect(
      new RegExp(urlPattern).test(
        `http://localhost:3000/notifications/${UUID}/tasks`
      )
    ).toBe(true)
  })

  it('does not let one route template stand in for another', () => {
    const { plan } = routePlanFromMap(
      mapOf([
        screen({ id: 'fe-tasks', routeTemplate: '/tasks', heading: null })
      ])
    )
    const { urlPattern } = plan.routes[0].landmark

    expect(
      new RegExp(urlPattern).test(
        `http://localhost:3000/notifications/${UUID}/tasks`
      )
    ).toBe(false)
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
