import { describe, test, expect } from 'vitest'
import { resolveRepoKey } from './repo-keys.js'

const folderRepos = {
  workspace: { abs: '/w', rel: '' },
  'trade-imports-plants-frontend': {
    abs: '/w/repos/trade-imports-plants-frontend',
    rel: 'repos/trade-imports-plants-frontend'
  },
  'trade-imports-plants-backend': {
    abs: '/w/repos/trade-imports-plants-backend',
    rel: 'repos/trade-imports-plants-backend'
  }
}

const programmeRepos = {
  workspace: { abs: '/w', rel: '' },
  plantsFrontend: {
    abs: '/w/repos/trade-imports-plants-frontend',
    rel: 'repos/trade-imports-plants-frontend'
  }
}

describe('#resolveRepoKey', () => {
  test('Should return an exact key unchanged', () => {
    expect(resolveRepoKey(folderRepos, 'trade-imports-plants-frontend')).toBe(
      'trade-imports-plants-frontend'
    )
  })

  test('Should resolve plants-frontend and plantsFrontend to the repo folder key', () => {
    expect(
      ['plants-frontend', 'plantsFrontend'].map((key) =>
        resolveRepoKey(folderRepos, key)
      )
    ).toEqual([
      'trade-imports-plants-frontend',
      'trade-imports-plants-frontend'
    ])
  })

  test('Should resolve a folder name or short form to a programme key', () => {
    expect(
      ['trade-imports-plants-frontend', 'plants-frontend'].map((key) =>
        resolveRepoKey(programmeRepos, key)
      )
    ).toEqual(['plantsFrontend', 'plantsFrontend'])
  })

  test('Should refuse an unknown key with USAGE, naming every valid key', () => {
    expect(() => resolveRepoKey(folderRepos, 'nope')).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message:
          "Can't find repo key `nope`. Use one of `workspace`, `trade-imports-plants-frontend`, `trade-imports-plants-backend`, or name a programme with --programme."
      })
    )
  })

  test('Should refuse a key two repos match with USAGE, naming both', () => {
    const repos = {
      'plants-frontend': { abs: '/w/a', rel: 'a' },
      'trade-imports-plants-frontend': {
        abs: '/w/repos/trade-imports-plants-frontend',
        rel: 'repos/trade-imports-plants-frontend'
      }
    }

    expect(() => resolveRepoKey(repos, 'plantsfrontend')).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message:
          'Repo key `plantsfrontend` could mean `plants-frontend` or `trade-imports-plants-frontend`. Use one of those.'
      })
    )
  })
})
