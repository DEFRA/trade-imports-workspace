import { describe, test, expect } from 'vitest'
import { prScopeArgs } from './pr-scope.js'

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
  }
}

describe('prScopeArgs', () => {
  test('gives one repo its suites and its tag as a grep', () => {
    expect(prScopeArgs(SCOPE, ['trade-imports-animals-frontend'])).toEqual([
      'tests/animals/',
      '--grep',
      '@animals-frontend'
    ])
  })

  test('leaves out the grep for a repo the scope gives no tags', () => {
    expect(prScopeArgs(SCOPE, ['trade-imports-ins-backend'])).toEqual([
      'tests/ins/'
    ])
  })

  test('unions the suites and alternates the tags across several repos', () => {
    expect(
      prScopeArgs(SCOPE, [
        'trade-imports-animals-frontend',
        'trade-imports-address-book'
      ])
    ).toEqual([
      'tests/animals/',
      'tests/ins/',
      '--grep',
      '@animals-frontend|@address-book'
    ])
  })

  test('keeps one copy of a suite two repos share', () => {
    expect(
      prScopeArgs(SCOPE, [
        'trade-imports-ins-backend',
        'trade-imports-address-book'
      ])
    ).toEqual(['tests/ins/', '--grep', '@address-book'])
  })

  test('runs every spec for a repo the scope does not name', () => {
    expect(prScopeArgs(SCOPE, ['trade-imports-plants-frontend'])).toEqual([])
  })

  test('runs every spec when any repo of a set runs every suite', () => {
    expect(
      prScopeArgs(SCOPE, [
        'trade-imports-animals-frontend',
        'trade-imports-plants-frontend'
      ])
    ).toEqual([])
  })

  test('runs every spec when there is nothing to scope from', () => {
    expect(prScopeArgs(SCOPE, [])).toEqual([])
  })
})
