import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  normaliseSuites,
  normaliseTags,
  resolveScope,
  scopeNote,
  scopeOutputLines,
  scopeWords
} from './e2e-scope.js'

const committedScope = JSON.parse(
  readFileSync(
    new URL('../../../config/e2e-tests-pr-scope.json', import.meta.url),
    'utf8'
  )
)

const scopeFor = (repository, scopeConfig) =>
  resolveScope({
    repository,
    manual: false,
    readScopeConfig: () => scopeConfig
  })

describe('#scopeWords', () => {
  test('Should join a comma- and space-separated first line with single spaces', () => {
    expect(scopeWords(' a,b\t c ,\nd')).toBe('a b c')
  })
})

describe('#resolveScope', () => {
  test('Should take the workflow inputs on a manual run without reading the scope file', () => {
    const scope = resolveScope({
      repository: 'DEFRA/trade-imports-workspace',
      manual: true,
      suites: 'tests/ins/',
      tags: '@smoke',
      readScopeConfig: () => {
        throw new Error('read the scope file')
      }
    })

    expect(scope).toEqual({
      where: 'the workflow inputs',
      suites: 'tests/ins/',
      tags: '@smoke'
    })
  })

  test('Should refuse an entry whose suites are not a list of strings', () => {
    expect(() => scopeFor('DEFRA/x', { x: { suites: 'tests/ins/' } })).toThrow(
      'The x entry in config/e2e-tests-pr-scope.json has a suites value that is not a list of strings.'
    )
  })

  test('Should refuse a scope file that is not an object', () => {
    expect(() => scopeFor('DEFRA/x', ['default'])).toThrow(
      'config/e2e-tests-pr-scope.json must hold one object, keyed by repo name.'
    )
  })

  test('Should read the default entry for an inherited object key such as toString', () => {
    expect(
      scopeFor('DEFRA/toString', { default: { suites: ['all'] } })
    ).toEqual({
      where: 'the default entry in config/e2e-tests-pr-scope.json',
      suites: 'all',
      tags: ''
    })
  })
})

describe('the committed scope file', () => {
  test.each(Object.keys(committedScope))(
    'Should give %s a scope whose suites and tags normalise',
    (key) => {
      const { suites, tags } = scopeFor(`DEFRA/${key}`, committedScope)

      const suitePaths = suites === 'all' ? [] : normaliseSuites(suites)
      const { pattern } = normaliseTags(tags)

      expect({
        suitesUnderTests: suitePaths.every((path) => path.startsWith('tests/')),
        patternOfTags: /^(@[A-Za-z0-9_-]+(\|@[A-Za-z0-9_-]+)*)?$/.test(pattern)
      }).toEqual({ suitesUnderTests: true, patternOfTags: true })
    }
  )
})

describe('#scopeNote and #scopeOutputLines', () => {
  test('Should say none for an empty list in the note and leave the output line empty', () => {
    const scope = { where: 'the workflow inputs', suites: '', tags: '@a' }

    expect([scopeNote(scope), scopeOutputLines(scope)]).toEqual([
      'Test scope from the workflow inputs: suites=none tags=@a',
      'suites=\ntags=@a'
    ])
  })
})

describe('#normaliseSuites', () => {
  test('Should give a folder a trailing slash and leave a spec file alone', () => {
    expect(normaliseSuites('tests/animals tests/ins/a.spec.js')).toEqual([
      'tests/animals/',
      'tests/ins/a.spec.js'
    ])
  })

  test('Should refuse a path that climbs out of tests', () => {
    expect(() => normaliseSuites('tests/../etc')).toThrow(
      "Invalid suite 'tests/../etc'."
    )
  })
})

describe('#normaliseTags', () => {
  test('Should join the tags into one grep pattern, dropping repeats', () => {
    expect(normaliseTags('@a,@b @a')).toEqual({
      tags: ['@a', '@b'],
      pattern: '@a|@b'
    })
  })

  test('Should refuse a tag that carries regex characters', () => {
    expect(() => normaliseTags('@a.*')).toThrow("Invalid tag '@a.*'.")
  })
})
