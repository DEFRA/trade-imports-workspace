import { describe, test, expect } from 'vitest'
import { checkLandmark, runStep, walk } from './walk.js'
import { parseRoutePlan } from './route-plan.js'

// The browser is the boundary, so these drive a stand-in Page: it records the
// navigations and answers the two questions the walk asks a real page —
// where am I, and is that heading here.
const fakePage = (pages = {}) => {
  const visited = []
  let at = '/'
  return {
    visited,
    url: () => `http://localhost:3060${at}`,
    content: async () => pages[at]?.html ?? '',
    goto: async (path) => {
      at = path
      visited.push(path)
    },
    getByRole: (role, { name } = {}) => ({
      count: async () =>
        role === 'heading' && (pages[at]?.headings ?? []).includes(name)
          ? 1
          : 0,
      first: () => ({ click: async () => {} })
    })
  }
}

const plan = (routes, prelude = []) =>
  parseRoutePlan(
    {
      side: 'frontend',
      app: { baseURL: 'http://localhost:3060', server: null },
      prelude,
      routes
    },
    'plan.json'
  )

const capture = (page, screen) => ({ screen, url: page.url() })

describe('checkLandmark', () => {
  test('says nothing when the page is the one the route names', async () => {
    const page = fakePage({ '/origin': { headings: ['Origin of the import'] } })
    await page.goto('/origin')
    expect(
      await checkLandmark(page, { heading: 'Origin of the import' })
    ).toBeNull()
  })

  test('says where it landed instead', async () => {
    const page = fakePage({ '/tasks': { headings: ['Your notification'] } })
    await page.goto('/tasks')
    expect(
      await checkLandmark(page, { heading: 'Origin of the import' })
    ).toMatch(
      /Expected the heading "Origin of the import" and landed on \/tasks/
    )
  })

  test('checks the URL when the route names one', async () => {
    const page = fakePage()
    await page.goto('/dashboard')
    expect(await checkLandmark(page, { urlPattern: '/confirmation$' })).toMatch(
      /Expected a URL matching \/confirmation\$/
    )
  })

  test('accepts any page when the route names no landmark', async () => {
    expect(await checkLandmark(fakePage(), undefined)).toBeNull()
  })
})

describe('runStep', () => {
  test('goes where the step says', async () => {
    const page = fakePage()
    await runStep(page, { action: 'goto', path: '/origin' }, {})
    expect(page.visited).toEqual(['/origin'])
  })

  test('puts a remembered value into the path', async () => {
    const page = fakePage()
    await runStep(
      page,
      { action: 'goto', path: '/notifications/{notification}/tasks' },
      { notification: 'abc-123' }
    )
    expect(page.visited).toEqual(['/notifications/abc-123/tasks'])
  })

  test('remembers a value out of the URL', async () => {
    const page = fakePage()
    const memory = {}
    await page.goto('/notifications/abc-123/tasks')
    await runStep(
      page,
      {
        action: 'remember',
        as: 'notification',
        from: 'url',
        pattern: '/notifications/([^/]+)/'
      },
      memory
    )
    expect(memory).toEqual({ notification: 'abc-123' })
  })

  test('says so when there was nothing to remember', async () => {
    const page = fakePage()
    await page.goto('/dashboard')
    await expect(
      runStep(
        page,
        {
          action: 'remember',
          as: 'notification',
          from: 'url',
          pattern: '/notifications/([^/]+)/'
        },
        {}
      )
    ).rejects.toThrow(/cannot remember notification/)
  })

  test('refuses a step that names no element', async () => {
    await expect(runStep(fakePage(), { action: 'click' }, {})).rejects.toThrow(
      /names no element/
    )
  })

  test('refuses an action the walk does not know', async () => {
    await expect(
      runStep(fakePage(), { action: 'teleport' }, {})
    ).rejects.toThrow(/Unknown step action "teleport"/)
  })
})

describe('walk', () => {
  const pages = {
    '/origin': { headings: ['Origin of the import'] },
    '/tasks': { headings: ['Your notification'] }
  }

  test('records every screen it reaches', async () => {
    const page = fakePage(pages)
    const { rows, gaps } = await walk(
      page,
      plan([
        {
          screen: 'fe-origin',
          landmark: { heading: 'Origin of the import' },
          steps: [{ action: 'goto', path: '/origin' }]
        },
        {
          screen: 'fe-hub',
          landmark: { heading: 'Your notification' },
          steps: [{ action: 'goto', path: '/tasks' }]
        }
      ]),
      {},
      { capture }
    )
    expect(rows.map((row) => row.screen)).toEqual(['fe-origin', 'fe-hub'])
    expect(gaps).toEqual([])
  })

  test('records a screen it could not reach as a gap with a reason', async () => {
    const page = fakePage(pages)
    const { rows, gaps } = await walk(
      page,
      plan([
        {
          screen: 'fe-declaration',
          landmark: { heading: 'Declaration' },
          steps: [{ action: 'goto', path: '/tasks' }]
        }
      ]),
      {},
      { capture }
    )
    expect(rows).toEqual([])
    expect(gaps[0].screen).toBe('fe-declaration')
    expect(gaps[0].why).toMatch(/Expected the heading "Declaration"/)
  })

  test('carries on after a route that threw', async () => {
    const page = fakePage(pages)
    const { rows, gaps } = await walk(
      page,
      plan([
        { screen: 'fe-broken', steps: [{ action: 'click' }] },
        {
          screen: 'fe-origin',
          landmark: { heading: 'Origin of the import' },
          steps: [{ action: 'goto', path: '/origin' }]
        }
      ]),
      {},
      { capture }
    )
    expect(gaps.map((gap) => gap.screen)).toEqual(['fe-broken'])
    expect(rows.map((row) => row.screen)).toEqual(['fe-origin'])
  })

  test('runs the prelude once, before any route', async () => {
    const page = fakePage(pages)
    await walk(
      page,
      plan(
        [
          {
            screen: 'fe-origin',
            landmark: { heading: 'Origin of the import' },
            steps: [{ action: 'goto', path: '/origin' }]
          }
        ],
        [{ action: 'goto', path: '/sign-in' }]
      ),
      {},
      { capture }
    )
    expect(page.visited).toEqual(['/sign-in', '/origin'])
  })

  test('a value one route remembered is there for the next', async () => {
    const page = fakePage({
      '/notifications/abc-123/tasks': { headings: ['Your notification'] },
      '/notifications/abc-123/origin': { headings: ['Origin of the import'] }
    })
    const { rows } = await walk(
      page,
      plan(
        [
          {
            screen: 'fe-origin',
            landmark: { heading: 'Origin of the import' },
            steps: [
              { action: 'goto', path: '/notifications/{notification}/origin' }
            ]
          }
        ],
        [
          { action: 'goto', path: '/notifications/abc-123/tasks' },
          {
            action: 'remember',
            as: 'notification',
            from: 'url',
            pattern: '/notifications/([^/]+)/'
          }
        ]
      ),
      {},
      { capture }
    )
    expect(rows).toHaveLength(1)
  })
})
