import { afterEach, describe, expect, test } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  rawText,
  semverKey,
  sortBySemver,
  stateFilesOfRun,
  versionCounts,
  versionFilter
} from './state.js'

const entry = (classification, implementationStatus) => ({
  version: `${classification}-${implementationStatus}`,
  classification,
  implementation_status: implementationStatus
})

const everyState = [
  entry(null, null),
  entry('todo', null),
  entry('todo', 'done'),
  entry('todo', 'failed'),
  entry('noop', null),
  entry('noop', 'done')
]

const matchedBy = (filter) =>
  everyState.filter(versionFilter(filter)).map(({ version }) => version)

describe('#versionFilter', () => {
  test.each([
    ['unplanned', ['null-null']],
    ['todo', ['todo-null']],
    ['noop', ['noop-null', 'noop-done']],
    ['done', ['todo-done', 'noop-done']],
    ['failed', ['todo-failed']],
    ['pending', ['null-null', 'todo-null', 'noop-null']]
  ])('Should match %s versions as %j', (filter, expected) => {
    expect(matchedBy(filter)).toEqual(expected)
  })

  test('Should treat a missing classification as unplanned', () => {
    expect(versionFilter('unplanned')({ version: '5.0.0' })).toBe(true)
  })
})

describe('#versionCounts', () => {
  test('Should count every filter except pending', () => {
    expect(versionCounts(everyState)).toEqual({
      unplanned: 1,
      todo: 1,
      noop: 2,
      done: 2,
      failed: 1
    })
  })
})

describe('#semverKey', () => {
  test('Should take three numeric parts, padding with 0 and reading words as 0', () => {
    expect(semverKey('6.0.0-beta.1')).toEqual([6, 0, 0])
    expect(semverKey('5')).toEqual([5, 0, 0])
    expect(semverKey('x.2.3.4')).toEqual([0, 2, 3])
  })
})

describe('#sortBySemver', () => {
  test('Should sort 5.10.0 after 5.9.1 and keep ties in place', () => {
    const versions = ['5.10.0', '5.9.1', '6.0.0-beta.1', '6.0.0-beta.0'].map(
      (version) => ({ version })
    )

    expect(sortBySemver(versions).map(({ version }) => version)).toEqual([
      '5.9.1',
      '5.10.0',
      '6.0.0-beta.1',
      '6.0.0-beta.0'
    ])
  })
})

describe('#rawText', () => {
  test('Should print strings bare, null as null and numbers as numbers', () => {
    expect([rawText('5.0.0'), rawText(null), rawText(3)]).toEqual([
      '5.0.0',
      'null',
      '3'
    ])
  })
})

describe('#stateFilesOfRun', () => {
  let folder

  afterEach(() => rmSync(folder, { recursive: true, force: true }))

  const writeAt = (relPath) => {
    const path = join(folder, relPath)
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, '{}\n')
    return path
  }

  test('Should find versions files up to three folders down, in path order', () => {
    folder = mkdtempSync(join(tmpdir(), 'tim-govuk-state-'))
    const beta = writeAt('beta/versions.beta.json')
    const alpha = writeAt('alpha/versions.alpha.json')
    const deep = writeAt('a/b/versions.deep.json')
    writeAt('a/b/c/versions.too-deep.json')
    writeAt('alpha/version__5.0.0.changelog.md')

    expect(stateFilesOfRun({ folder })).toEqual([deep, alpha, beta])
  })

  test('Should find only the named repo, and nothing when it has no file', () => {
    folder = mkdtempSync(join(tmpdir(), 'tim-govuk-state-'))
    const alpha = writeAt('alpha/versions.alpha.json')
    writeAt('beta/versions.beta.json')

    expect(stateFilesOfRun({ folder, repo: 'alpha' })).toEqual([alpha])
    expect(stateFilesOfRun({ folder, repo: 'gamma' })).toEqual([])
  })
})
