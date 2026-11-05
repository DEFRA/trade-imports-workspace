import { describe, test, expect } from 'vitest'
import { prScopeRuns } from './pr-scope.js'

const SCOPE = {
  default: { suites: ['all'] },
  'trade-imports-animals-frontend': {
    suites: ['tests/animals/'],
    tags: ['@animals-frontend']
  },
  'trade-imports-ins-backend': { suites: ['tests/ins/'] },
  'trade-imports-address-book': {
    suites: ['tests/ins/'],
    tags: ['@address-book']
  },
  'trade-imports-dynamics-gateway': { suites: [], tags: ['@gateway'] }
}

describe('prScopeRuns', () => {
  test('runs a repo’s suites whole, then its tagged specs in a second run', () => {
    expect(prScopeRuns(SCOPE, ['trade-imports-animals-frontend'])).toEqual([
      { suffix: '', args: ['tests/animals/'] },
      { suffix: '-tagged', args: ['--grep', '@animals-frontend'] }
    ])
  })

  test('gives one run for a repo the scope gives no tags', () => {
    expect(prScopeRuns(SCOPE, ['trade-imports-ins-backend'])).toEqual([
      { suffix: '', args: ['tests/ins/'] }
    ])
  })

  test('gives one tagged run for a repo the scope gives only tags', () => {
    expect(prScopeRuns(SCOPE, ['trade-imports-dynamics-gateway'])).toEqual([
      { suffix: '', args: ['--grep', '@gateway'] }
    ])
  })

  test('unions the suites and alternates the tags across several repos', () => {
    expect(
      prScopeRuns(SCOPE, [
        'trade-imports-animals-frontend',
        'trade-imports-address-book'
      ])
    ).toEqual([
      { suffix: '', args: ['tests/animals/', 'tests/ins/'] },
      { suffix: '-tagged', args: ['--grep', '@animals-frontend|@address-book'] }
    ])
  })

  test('keeps one copy of a suite two repos share', () => {
    expect(
      prScopeRuns(SCOPE, [
        'trade-imports-ins-backend',
        'trade-imports-address-book'
      ])
    ).toEqual([
      { suffix: '', args: ['tests/ins/'] },
      { suffix: '-tagged', args: ['--grep', '@address-book'] }
    ])
  })

  test('runs every spec for a repo the scope does not name', () => {
    expect(prScopeRuns(SCOPE, ['trade-imports-plants-frontend'])).toEqual([
      { suffix: '', args: [] }
    ])
  })

  test('runs every spec when any repo of a set runs every suite', () => {
    expect(
      prScopeRuns(SCOPE, [
        'trade-imports-animals-frontend',
        'trade-imports-plants-frontend'
      ])
    ).toEqual([{ suffix: '', args: [] }])
  })

  test('runs every spec when there is nothing to scope from', () => {
    expect(prScopeRuns(SCOPE, [])).toEqual([{ suffix: '', args: [] }])
  })
})
