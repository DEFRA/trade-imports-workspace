import { describe, test, expect } from 'vitest'
import { citeIncrement, captureRoot, repoByParagraph } from './run.js'
import { indexByBasename } from './resolve.js'

const profile = {
  id: 'dr21',
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
  },
  captureCitationRoots: [
    { prefix: 'harness/capture/', kind: 'capture', side: 'prototype' }
  ]
}

const indexes = new Map([
  [
    'frontend',
    indexByBasename([
      'src/server/app/shared/layout.njk',
      'src/server/app/x/copy.en.js'
    ])
  ],
  ['prototype', indexByBasename(['app/routes.js', 'app/views/dashboard.html'])]
])

const base = (overrides = {}) => ({
  id: 'inc-001',
  domain: 'dashboard',
  screens: [],
  detail: 'x',
  evidence: {},
  ...overrides
})

describe('captureRoot', () => {
  test('recognises a path under a capture directory', () => {
    expect(
      captureRoot(profile, 'harness/capture/model/dr21-dashboard.json')
    ).toMatchObject({ side: 'prototype' })
  })

  test('leaves an ordinary source path alone', () => {
    expect(captureRoot(profile, 'src/server/app/shared/layout.njk')).toBeNull()
  })
})

describe('repoByParagraph', () => {
  const pair = (paragraph, repo) => ({
    token: { paragraph, field: 'detail' },
    resolved: { repo }
  })

  test('claims a paragraph whose citations all landed in one repo', () => {
    expect(
      repoByParagraph([pair(0, 'prototype'), pair(0, 'prototype')])
    ).toEqual(new Map([[0, 'prototype']]))
  })

  test('claims nothing for a paragraph that disagrees with itself', () => {
    expect(
      repoByParagraph([pair(0, 'frontend'), pair(0, 'prototype')])
    ).toEqual(new Map())
  })

  test('ignores citations from the evidence fields, which are not paragraphs', () => {
    expect(
      repoByParagraph([
        {
          token: { paragraph: 0, field: 'evidence.frontend' },
          resolved: { repo: 'frontend' }
        }
      ])
    ).toEqual(new Map())
  })

  test('ignores an unresolved citation rather than treating it as evidence', () => {
    expect(
      repoByParagraph([
        { token: { paragraph: 0, field: 'detail' }, resolved: null }
      ])
    ).toEqual(new Map())
  })
})

describe('citeIncrement', () => {
  test('numbers citations in reading order across fields', () => {
    const { citations } = citeIncrement({
      increment: base({
        detail: 'layout.njk:41-53 renders it.',
        evidence: { prototype: 'app/views/dashboard.html:16-28' }
      }),
      profile,
      indexes
    })
    expect(citations.map((c) => c.ref)).toEqual(['c1', 'c2'])
    expect(citations[1].path).toBe('app/views/dashboard.html')
  })

  test('gives one marker to a target cited twice with the same lines', () => {
    const { citations } = citeIncrement({
      increment: base({
        detail: 'layout.njk:41-53 renders it, and layout.njk:41-53 again.'
      }),
      profile,
      indexes
    })
    expect(citations).toHaveLength(1)
  })

  test('classifies an archived DOM file as a capture citation, not a missing source file', () => {
    const { citations } = citeIncrement({
      increment: base({
        detail:
          'dr21-roles-and-addresses-complete.html:287-300 shows the block.'
      }),
      profile,
      indexes
    })
    expect(citations[0]).toMatchObject({ kind: 'capture', side: 'prototype' })
    expect(citations[0].needsHuman).toBeUndefined()
  })

  test('classifies a page-model reference as a capture citation', () => {
    const { citations } = citeIncrement({
      increment: base({ detail: 'dr21-dashboard.json:7-11 shows serviceNav.' }),
      profile,
      indexes
    })
    expect(citations[0]).toMatchObject({
      kind: 'capture',
      side: 'prototype',
      screen: 'dr21-dashboard'
    })
  })

  test('marks the prose with [[cN]] in place of every token', () => {
    const { marked } = citeIncrement({
      increment: base({ detail: 'layout.njk:41-53 renders it.' }),
      profile,
      indexes
    })
    expect(marked.detail).toBe('[[c1]] renders it.')
  })

  test('leaves the prose around a marker exactly as it was', () => {
    const detail =
      'The hint says "Start typing to search" but layout.njk:41-53 renders a plain select.'
    const { marked } = citeIncrement({
      increment: base({ detail }),
      profile,
      indexes
    })
    expect(marked.detail).toBe(
      'The hint says "Start typing to search" but [[c1]] renders a plain select.'
    )
  })

  test('collects an unresolved citation with its reason rather than guessing a path', () => {
    const { citations, unresolved } = citeIncrement({
      increment: base({ detail: 'nowhere.js:3 does something.' }),
      profile,
      indexes
    })
    expect(citations[0].needsHuman).toBe(true)
    expect(unresolved[0].why).toMatch(/not a tracked file/)
  })

  test('records the identifiers and quoted strings sitting beside a citation as anchors', () => {
    const { citations } = citeIncrement({
      increment: base({
        detail:
          'layout.njk:41-53 calls `govukPhaseBanner` with the text "This is a new service".'
      }),
      profile,
      indexes
    })
    expect(citations[0].anchors).toEqual([
      'govukPhaseBanner',
      'This is a new service'
    ])
  })

  test('keeps every range of a comma-joined citation', () => {
    const { citations } = citeIncrement({
      increment: base({ detail: 'routes.js:72, 85, 98 list the same six.' }),
      profile,
      indexes
    })
    expect(citations[0].ranges).toHaveLength(3)
    expect(citations[0].lines).toBeNull()
  })
})
