import { describe, test, expect } from 'vitest'
import {
  parseTicketRef,
  matchesTicket,
  resolveBranch
} from './branch-resolver.js'

describe('parseTicketRef', () => {
  test('normalises a full ticket reference', () => {
    expect(parseTicketRef('EUDPA-249')).toBe('EUDPA-249')
  })

  test('normalises a lowercase ticket reference', () => {
    expect(parseTicketRef('eudpa-249')).toBe('EUDPA-249')
  })

  test('normalises a bare ticket number', () => {
    expect(parseTicketRef('249')).toBe('EUDPA-249')
  })

  test('ignores surrounding whitespace', () => {
    expect(parseTicketRef('  EUDPA-58  ')).toBe('EUDPA-58')
  })

  test('returns null for a branch name', () => {
    expect(parseTicketRef('feat/EUDPA-249-third-way')).toBeNull()
  })

  test('returns null for a ticket from another project', () => {
    expect(parseTicketRef('ABC-249')).toBeNull()
  })
})

describe('matchesTicket', () => {
  test('matches a prefixed branch', () => {
    expect(matchesTicket('feat/EUDPA-249-third-way', 'EUDPA-249')).toBe(true)
  })

  test('matches a branch with no prefix', () => {
    expect(
      matchesTicket('EUDPA-164-wire-trade-imports-stub', 'EUDPA-164')
    ).toBe(true)
  })

  test('matches a branch nesting the slug under the ticket', () => {
    expect(matchesTicket('feat/EUDPA-175/edge-case', 'EUDPA-175')).toBe(true)
  })

  test('matches case-insensitively', () => {
    expect(matchesTicket('spike/eudpa-288-blend', 'EUDPA-288')).toBe(true)
  })

  test('does not match a longer ticket number sharing the prefix', () => {
    expect(matchesTicket('feat/EUDPA-351-something', 'EUDPA-35')).toBe(false)
  })

  test('does not match when the reference runs on from a word', () => {
    expect(matchesTicket('feat/xEUDPA-249', 'EUDPA-249')).toBe(false)
  })

  test('does not match an unrelated branch', () => {
    expect(matchesTicket('spike/trace-to-requirements', 'EUDPA-249')).toBe(
      false
    )
  })
})

const threeRepos = [
  {
    repo: 'trade-imports-animals-frontend',
    names: [
      'main',
      'spike/trace-to-requirements',
      'feat/EUDPA-249-third-way',
      'chore/EUDPA-249-model-comparison',
      'feat/EUDPA-58-address-book'
    ]
  },
  {
    repo: 'trade-imports-animals-backend',
    names: ['main', 'spike/trace-to-requirements', 'feat/EUDPA-58-address-book']
  },
  {
    repo: 'trade-imports-ins-tests',
    names: ['main', 'feat/EUDPA-58-address-book']
  }
]

describe('resolveBranch', () => {
  test('resolves a literal branch name present in one repo', () => {
    expect(resolveBranch('spike/trace-to-requirements', threeRepos)).toEqual({
      kind: 'resolved',
      branch: 'spike/trace-to-requirements',
      ticket: null
    })
  })

  test('resolves a ticket reference matching exactly one branch', () => {
    expect(resolveBranch('EUDPA-58', threeRepos)).toEqual({
      kind: 'resolved',
      branch: 'feat/EUDPA-58-address-book',
      ticket: 'EUDPA-58'
    })
  })

  test('resolves a bare ticket number the same way', () => {
    expect(resolveBranch('58', threeRepos)).toEqual({
      kind: 'resolved',
      branch: 'feat/EUDPA-58-address-book',
      ticket: 'EUDPA-58'
    })
  })

  test('reports every candidate when a ticket matches several branches', () => {
    expect(resolveBranch('EUDPA-249', threeRepos)).toEqual({
      kind: 'ambiguous',
      input: 'EUDPA-249',
      ticket: 'EUDPA-249',
      candidates: [
        {
          branch: 'chore/EUDPA-249-model-comparison',
          repos: ['trade-imports-animals-frontend']
        },
        {
          branch: 'feat/EUDPA-249-third-way',
          repos: ['trade-imports-animals-frontend']
        }
      ]
    })
  })

  test('ranks candidates by how many repos share the name', () => {
    const repos = [
      { repo: 'frontend', names: ['zzz/EUDPA-1-rare'] },
      { repo: 'backend', names: ['aaa/EUDPA-1-common'] },
      { repo: 'tests', names: ['aaa/EUDPA-1-common'] }
    ]

    const { candidates } = resolveBranch('EUDPA-1', repos)

    expect(candidates.map(({ branch }) => branch)).toEqual([
      'aaa/EUDPA-1-common',
      'zzz/EUDPA-1-rare'
    ])
  })

  test('prefers a literal name over a fuzzy match on the same input', () => {
    const repos = [
      { repo: 'frontend', names: ['EUDPA-249', 'feat/EUDPA-249-third-way'] }
    ]

    expect(resolveBranch('EUDPA-249', repos)).toEqual({
      kind: 'resolved',
      branch: 'EUDPA-249',
      ticket: null
    })
  })

  test('reports not found for a ticket with no matching branch', () => {
    expect(resolveBranch('EUDPA-9999', threeRepos)).toEqual({
      kind: 'not-found',
      input: 'EUDPA-9999',
      ticket: 'EUDPA-9999'
    })
  })

  test('reports not found for an unknown name that is not a ticket', () => {
    expect(resolveBranch('feat/nope', threeRepos)).toEqual({
      kind: 'not-found',
      input: 'feat/nope',
      ticket: null
    })
  })
})
