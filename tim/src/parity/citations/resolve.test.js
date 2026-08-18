import { describe, test, expect } from 'vitest'
import {
  indexByBasename,
  narrowBySuffix,
  rankCandidates,
  resolveToken
} from './resolve.js'

const profile = {
  sides: [
    { id: 'frontend', screenPrefix: 'fe-' },
    { id: 'prototype', screenPrefix: 'dr21-' }
  ],
  repoBySideDefault: { frontend: 'frontend', prototype: 'prototype' },
  repos: {
    frontend: {
      pathRoots: [
        { prefix: 'repos/the-frontend/' },
        { prefix: 'src/', impliedPrefix: 'src/' }
      ]
    },
    prototype: {
      pathRoots: [
        { prefix: 'the-prototype/' },
        { prefix: 'app/', impliedPrefix: 'app/' }
      ]
    }
  }
}

const indexes = new Map([
  [
    'frontend',
    indexByBasename([
      'src/server/app/sets/live-animals/journeys/linear/features/import-purpose/copy/copy.en.js',
      'src/server/app/sets/live-animals/journeys/linear/features/transport/copy/copy.en.js',
      'src/server/app/shared/layout.njk',
      'src/server/app/sets/live-animals/journeys/linear/features/dashboard/controller.js'
    ])
  ],
  [
    'prototype',
    indexByBasename([
      'app/routes.js',
      'app/data/internal-market-purposes.js',
      'app/views/design-release-2.1/dashboard.html'
    ])
  ]
])

const increment = (overrides = {}) => ({
  id: 'inc-001',
  domain: 'import-purpose',
  screens: ['fe-import-purpose', 'dr21-reason-for-import'],
  evidence: {
    frontend:
      'src/server/app/sets/live-animals/journeys/linear/features/import-purpose/copy/copy.en.js:6',
    prototype: 'app/data/internal-market-purposes.js:7'
  },
  ...overrides
})

const token = (overrides = {}) => ({
  form: 'named',
  asWritten: 'copy.en.js:6',
  pathAsWritten: 'copy.en.js',
  lines: [{ start: 6, end: 6 }],
  sideHint: null,
  sentence: 'the frontend copy.en.js:6 has the typo',
  ...overrides
})

describe('indexByBasename', () => {
  test('groups every path sharing a basename', () => {
    expect(indexByBasename(['a/x.js', 'b/x.js', 'c/y.js']).get('x.js')).toEqual(
      ['a/x.js', 'b/x.js']
    )
  })
})

describe('narrowBySuffix', () => {
  const candidates = [
    'src/features/consignment-details/fields.js',
    'src/features/commodities/identifier/fields.js',
    'src/features/origin/fields.js'
  ]

  test('uses the directory the prose wrote to pick one of several files', () => {
    expect(narrowBySuffix(candidates, 'consignment-details/fields.js')).toEqual(
      ['src/features/consignment-details/fields.js']
    )
  })

  test('matches a multi-segment suffix', () => {
    expect(
      narrowBySuffix(candidates, 'commodities/identifier/fields.js')
    ).toEqual(['src/features/commodities/identifier/fields.js'])
  })

  test('leaves a bare basename alone', () => {
    expect(narrowBySuffix(candidates, 'fields.js')).toEqual(candidates)
  })

  test('falls back to the full set when the written path matches nothing', () => {
    expect(narrowBySuffix(candidates, 'moved-away/fields.js')).toEqual(
      candidates
    )
  })
})

describe('rankCandidates', () => {
  test('prefers the candidate closest to the evidence path', () => {
    const ranked = rankCandidates({
      candidates: ['a/b/c/x.js', 'z/x.js'],
      evidencePath: 'a/b/c/y.js',
      domain: null
    })
    expect(ranked[0].path).toBe('a/b/c/x.js')
  })

  test('falls back to the domain appearing in the path', () => {
    const ranked = rankCandidates({
      candidates: ['features/transport/x.js', 'features/dashboard/x.js'],
      evidencePath: null,
      domain: 'transport'
    })
    expect(ranked[0].path).toBe('features/transport/x.js')
  })

  test('breaks a remaining tie towards the shallower file', () => {
    const ranked = rankCandidates({
      candidates: ['a/b/c/d/x.js', 'a/x.js'],
      evidencePath: null,
      domain: null
    })
    expect(ranked[0].path).toBe('a/x.js')
  })
})

describe('resolveToken', () => {
  test('an explicit path root settles the repo outright', () => {
    const result = resolveToken({
      token: token({
        pathAsWritten: 'repos/the-frontend/src/server/app/shared/layout.njk'
      }),
      profile,
      increment: increment(),
      indexes
    })
    expect(result).toEqual({
      repo: 'frontend',
      path: 'src/server/app/shared/layout.njk',
      resolution: 'explicit'
    })
  })

  test('a bare basename resolves against the side evidence path', () => {
    const result = resolveToken({
      token: token({ sideHint: 'frontend' }),
      profile,
      increment: increment(),
      indexes
    })
    expect(result).toMatchObject({
      repo: 'frontend',
      path: 'src/server/app/sets/live-animals/journeys/linear/features/import-purpose/copy/copy.en.js',
      resolution: 'basename-resolved'
    })
  })

  test('an ambiguous basename is queued rather than guessed', () => {
    const result = resolveToken({
      token: token({ sideHint: 'frontend' }),
      profile,
      increment: increment({ domain: 'general', evidence: {} }),
      indexes
    })
    expect(result.resolution).toBe('unresolved')
    expect(result.why).toMatch(/matches 2 files/)
    expect(result.candidates).toHaveLength(2)
  })

  test('a unique basename resolves without any hint at all', () => {
    const result = resolveToken({
      token: token({ pathAsWritten: 'layout.njk', asWritten: 'layout.njk:41' }),
      profile,
      increment: increment({ evidence: {} }),
      indexes
    })
    expect(result).toMatchObject({
      repo: 'frontend',
      resolution: 'basename-resolved'
    })
  })

  test('a continuation the tokeniser flagged is left unresolved with the reason', () => {
    const result = resolveToken({
      token: token({
        form: 'continuation',
        needsHuman: true,
        asWritten: ':17',
        lines: [{ start: 17, end: 17 }]
      }),
      profile,
      increment: increment(),
      indexes
    })
    expect(result.resolution).toBe('unresolved')
    expect(result.why).toMatch(/both sides/)
  })

  test('a resolved continuation is labelled as one', () => {
    const result = resolveToken({
      token: token({
        form: 'continuation',
        needsHuman: false,
        asWritten: ':5444',
        pathAsWritten: 'routes.js',
        sideHint: 'prototype'
      }),
      profile,
      increment: increment(),
      indexes
    })
    expect(result).toMatchObject({
      repo: 'prototype',
      path: 'app/routes.js',
      resolution: 'continuation'
    })
  })

  test('ranks a prototype basename against the prototype evidence path, with no side hint', () => {
    const twoViews = new Map([
      [
        'prototype',
        indexByBasename([
          'app/views/design-release-2.1/dashboard-templates.html',
          'app/views/partials/design-release-2.1/dashboard-templates.html'
        ])
      ]
    ])
    const result = resolveToken({
      token: token({
        pathAsWritten: 'dashboard-templates.html',
        asWritten: 'dashboard-templates.html:48-59',
        sideHint: null,
        sentence: 'The templates list renders dashboard-templates.html:48-59.'
      }),
      profile,
      increment: increment({
        evidence: {
          prototype:
            'app/views/design-release-2.1/dashboard-templates.html:48-59'
        }
      }),
      indexes: twoViews
    })
    expect(result.path).toBe(
      'app/views/design-release-2.1/dashboard-templates.html'
    )
  })

  test('names the file when it is tracked in no repo the corpus cites', () => {
    const result = resolveToken({
      token: token({ pathAsWritten: 'nowhere.js', asWritten: 'nowhere.js:1' }),
      profile,
      increment: increment(),
      indexes
    })
    expect(result.why).toMatch(/not a tracked file/)
  })
})
