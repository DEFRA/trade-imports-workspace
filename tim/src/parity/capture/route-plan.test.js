import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  interpolate,
  loadRoutePlan,
  parseRoutePlan,
  plannedScreens,
  rememberFrom
} from './route-plan.js'

let dir

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tim-capture-plan-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

const plan = {
  side: 'frontend',
  app: { baseURL: 'http://localhost:3060', server: null },
  routes: [
    {
      screen: 'fe-hub',
      landmark: { heading: 'Your notification' },
      steps: [{ action: 'goto', path: '/' }]
    }
  ]
}

describe('parseRoutePlan', () => {
  test('accepts a plan with one route', () => {
    expect(parseRoutePlan(plan, 'plan.json').routes).toHaveLength(1)
  })

  test('defaults the prelude and a route with no steps', () => {
    const parsed = parseRoutePlan(
      { ...plan, routes: [{ screen: 'fe-hub' }] },
      'plan.json'
    )
    expect(parsed.prelude).toEqual([])
    expect(parsed.routes[0].steps).toEqual([])
  })

  test('refuses a plan with no routes, naming the file', () => {
    expect(() => parseRoutePlan({ ...plan, routes: [] }, 'plan.json')).toThrow(
      /plan\.json is not a usable route plan: routes/
    )
  })

  test('refuses a step vocabulary the walk cannot run', () => {
    const bad = {
      ...plan,
      routes: [{ screen: 'fe-hub', steps: [{ action: 'teleport' }] }]
    }
    expect(() => parseRoutePlan(bad, 'plan.json')).toThrow(
      /routes\.0\.steps\.0\.action/
    )
  })

  test('refuses a plan that never says where the application is', () => {
    expect(() => parseRoutePlan({ side: 'frontend', routes: [] }, 'p')).toThrow(
      /is not a usable route plan/
    )
  })

  test('keeps anything the discovery stage recorded that the walk does not read', () => {
    const parsed = parseRoutePlan(
      { ...plan, discoveredBy: 'tim parity map', coverage: { orphans: 3 } },
      'plan.json'
    )
    expect(parsed.coverage).toEqual({ orphans: 3 })
  })
})

describe('loadRoutePlan', () => {
  test('names the file when the discovery stage has not run', () => {
    expect(() => loadRoutePlan(join(dir, 'frontend.routes.json'))).toThrow(
      /frontend\.routes\.json/
    )
  })

  test('reads a plan from disk', () => {
    const path = join(dir, 'frontend.routes.json')
    writeFileSync(path, JSON.stringify(plan))
    expect(loadRoutePlan(path).side).toBe('frontend')
  })
})

describe('interpolate', () => {
  test('puts a value the walk remembered into a path', () => {
    expect(
      interpolate('/notifications/{notification}/tasks', {
        notification: 'abc'
      })
    ).toBe('/notifications/abc/tasks')
  })

  test('leaves a path with nothing to substitute alone', () => {
    expect(interpolate('/origin', {})).toBe('/origin')
  })

  test('says which step is missing when nothing remembered the value', () => {
    expect(() => interpolate('/n/{notification}/tasks', {})).toThrow(
      /remembered a notification\. Add a "remember" step/
    )
  })
})

describe('rememberFrom', () => {
  test('returns the captured group', () => {
    expect(
      rememberFrom(
        'http://localhost:3060/notifications/abc-123/tasks',
        '/notifications/([^/]+)/'
      )
    ).toBe('abc-123')
  })

  test('returns the whole match when the pattern captures nothing', () => {
    expect(rememberFrom('/notifications/abc-123/', 'abc-\\d+')).toBe('abc-123')
  })

  test('returns null when nothing matched, so the walk can say so', () => {
    expect(rememberFrom('/dashboard', '/notifications/([^/]+)/')).toBeNull()
  })
})

describe('plannedScreens', () => {
  test('lists the screens in the order the plan walks them', () => {
    expect(plannedScreens(parseRoutePlan(plan, 'p'))).toEqual(['fe-hub'])
  })
})
