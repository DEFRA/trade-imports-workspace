import { describe, test, expect } from 'vitest'
import {
  rewritablePrefixes,
  rewritePathRoots,
  splitScreen,
  normaliseBacklog
} from './normalise.js'

const profile = {
  id: 'dr21',
  repos: {
    frontend: {
      pathRoots: [
        { prefix: '/home/old/repos/the-frontend/' },
        { prefix: 'repos/the-frontend/' },
        { prefix: 'src/', impliedPrefix: 'src/' }
      ]
    },
    prototype: {
      pathRoots: [
        { prefix: '~/git/defra/the-prototype/' },
        { prefix: 'the-prototype/' },
        { prefix: 'app/', impliedPrefix: 'app/' }
      ]
    }
  }
}

const prefixes = rewritablePrefixes(profile)

describe('rewritablePrefixes', () => {
  test('skips a root that is already repo-relative', () => {
    expect(prefixes.map((p) => p.prefix)).not.toContain('src/')
    expect(prefixes.map((p) => p.prefix)).not.toContain('app/')
  })

  test('carries both the tilde and the expanded form of a home path', () => {
    const written = prefixes.map((p) => p.prefix)
    expect(written).toContain('~/git/defra/the-prototype/')
    expect(
      written.some(
        (p) => p.endsWith('/git/defra/the-prototype/') && !p.startsWith('~')
      )
    ).toBe(true)
  })

  test('orders longest first so a short root never wins', () => {
    const lengths = prefixes.map((p) => p.prefix.length)
    expect(lengths).toEqual([...lengths].sort((a, b) => b - a))
  })
})

describe('rewritePathRoots', () => {
  test('strips an absolute root from a stale clone', () => {
    expect(
      rewritePathRoots('/home/old/repos/the-frontend/src/a.js:5', prefixes)
    ).toBe('src/a.js:5')
  })

  test('strips a workspace-relative root', () => {
    expect(rewritePathRoots('repos/the-frontend/src/a.js:5', prefixes)).toBe(
      'src/a.js:5'
    )
  })

  test('leaves an already repo-relative path alone', () => {
    expect(rewritePathRoots('app/views/dashboard.html:16-28', prefixes)).toBe(
      'app/views/dashboard.html:16-28'
    )
  })

  test('rewrites every citation in a semicolon-joined value', () => {
    const written =
      '~/git/defra/the-prototype/app/routes.js:5410 (getItems); ~/git/defra/the-prototype/app/views/x.html:27-37'
    expect(rewritePathRoots(written, prefixes)).toBe(
      'app/routes.js:5410 (getItems); app/views/x.html:27-37'
    )
  })

  test('leaves parenthetical prose untouched', () => {
    const written =
      "the-prototype/app/routes.js:4413 (review row key 'Arrival date at destination')"
    expect(rewritePathRoots(written, prefixes)).toBe(
      "app/routes.js:4413 (review row key 'Arrival date at destination')"
    )
  })

  test('returns a non-string unchanged', () => {
    expect(rewritePathRoots(null, prefixes)).toBeNull()
  })
})

describe('splitScreen', () => {
  test('splits a slash-joined pair into both sides', () => {
    expect(
      splitScreen('fe-commodity-search / dr21-what-are-you-importing')
    ).toEqual(['fe-commodity-search', 'dr21-what-are-you-importing'])
  })

  test('leaves a plain screen id alone', () => {
    expect(splitScreen('fe-dashboard-empty')).toEqual(['fe-dashboard-empty'])
  })
})

describe('normaliseBacklog', () => {
  const backlog = {
    run_id: 'RUN-1',
    target: 't',
    increments: [
      {
        id: 'inc-001',
        screens: [
          'fe-commodity-search / dr21-what-are-you-importing',
          'fe-hub'
        ],
        evidence: {
          frontend: 'repos/the-frontend/src/a.js:5',
          prototype: 'app/views/b.html:1'
        }
      },
      {
        id: 'inc-002',
        screens: ['fe-hub'],
        evidence: { frontend: 'src/c.js:9', prototype: 'app/d.html:2' }
      }
    ]
  }

  test('splits the joined screen and keeps the plain one', () => {
    const { backlog: out } = normaliseBacklog(backlog, profile)
    expect(out.increments[0].screens).toEqual([
      'fe-commodity-search',
      'dr21-what-are-you-importing',
      'fe-hub'
    ])
  })

  test('does not duplicate a screen the split reintroduces', () => {
    const { backlog: out } = normaliseBacklog(
      {
        ...backlog,
        increments: [
          {
            id: 'inc-003',
            screens: ['fe-hub / dr21-notification-hub', 'fe-hub'],
            evidence: {}
          }
        ]
      },
      profile
    )
    expect(out.increments[0].screens).toEqual([
      'fe-hub',
      'dr21-notification-hub'
    ])
  })

  test('stamps the corpus id at the top level', () => {
    expect(normaliseBacklog(backlog, profile).backlog.corpus).toBe('dr21')
  })

  test('records which increments changed and how', () => {
    const { changes } = normaliseBacklog(backlog, profile)
    expect(changes).toEqual([
      {
        id: 'inc-001',
        evidence: ['frontend'],
        screens: ['fe-commodity-search / dr21-what-are-you-importing']
      }
    ])
  })

  test('leaves the keys the build loop reads exactly as they were', () => {
    const withLoopKeys = {
      ...backlog,
      increments: [
        {
          id: 'inc-001',
          status: 'blocked',
          dependsOn: ['inc-000'],
          commit: null,
          failure_reason: null,
          milestone: 'M0',
          screens: [],
          evidence: {}
        }
      ]
    }
    const [out] = normaliseBacklog(withLoopKeys, profile).backlog.increments
    expect(out).toMatchObject({
      status: 'blocked',
      dependsOn: ['inc-000'],
      commit: null,
      failure_reason: null,
      milestone: 'M0'
    })
  })
})
