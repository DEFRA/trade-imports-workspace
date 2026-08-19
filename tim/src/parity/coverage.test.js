import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  loadEnumerators,
  capturedScreens,
  compareCoverage,
  coverageForSide,
  runCoverage
} from './coverage.js'

let root

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-coverage-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const writeManifest = (dir, screens) => {
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'manifest.json'),
    JSON.stringify({ rows: screens.map((screen) => ({ screen })) })
  )
  return dir
}

describe('loadEnumerators', () => {
  test('reads the hand-authored module the corpus points at', () => {
    const path = join(root, 'enumerate.cjs')
    writeFileSync(
      path,
      'module.exports = { enumerators: { prototype: () => [{ screen: "p-one" }] } }'
    )

    const enumerators = loadEnumerators(path)

    expect(Object.keys(enumerators)).toEqual(['prototype'])
    expect(enumerators.prototype()).toEqual([{ screen: 'p-one' }])
  })

  test('gives back nothing rather than throwing when a corpus has no enumerator', () => {
    expect(loadEnumerators(join(root, 'absent.cjs'))).toEqual({})
    expect(loadEnumerators(null)).toEqual({})
  })
})

describe('capturedScreens', () => {
  test('reads the manifest, which is the index, rather than globbing the directory', () => {
    const dir = writeManifest(join(root, 'shot'), ['b-screen', 'a-screen'])

    const result = capturedScreens(dir)

    expect(result.found).toBe(true)
    expect(result.screens).toEqual(['b-screen', 'a-screen'])
  })

  test('says a side has no manifest rather than reporting zero screens as a fact', () => {
    const result = capturedScreens(join(root, 'never-run'))

    expect([result.found, result.screens]).toEqual([false, []])
  })
})

describe('compareCoverage', () => {
  const expected = [
    { screen: 'p-origin', why: 'views/origin.html' },
    { screen: 'p-reason', why: 'views/reason.html' },
    { screen: 'p-cph', why: 'views/cph.html' }
  ]

  test('names the screens the source says exist that nothing captured', () => {
    const { missing } = compareCoverage({
      expected,
      captured: ['p-origin']
    })

    expect(missing.map((entry) => entry.screen)).toEqual(['p-reason', 'p-cph'])
    expect(missing[0].why).toBe('views/reason.html')
  })

  test('attributes a captured state to the page it is a state of', () => {
    const { states, unexplained, missing } = compareCoverage({
      expected,
      captured: ['p-origin', 'p-reason', 'p-cph', 'p-reason-error']
    })

    expect(states).toEqual([{ screen: 'p-reason-error', of: 'p-reason' }])
    expect([unexplained, missing]).toEqual([[], []])
  })

  test('attributes a state to the longest page name it could belong to', () => {
    const { states } = compareCoverage({
      expected: [{ screen: 'p-reason' }, { screen: 'p-reason-for-transit' }],
      captured: ['p-reason-for-transit-error']
    })

    expect(states).toEqual([
      { screen: 'p-reason-for-transit-error', of: 'p-reason-for-transit' }
    ])
  })

  test('leaves a captured screen nothing in the source accounts for as unexplained', () => {
    const { states, unexplained } = compareCoverage({
      expected,
      captured: ['p-origin', 'p-reason', 'p-cph', 'p-somewhere-else']
    })

    expect(states).toEqual([])
    expect(unexplained).toEqual(['p-somewhere-else'])
  })

  test('a state does not stand in for the page it is a state of', () => {
    const { missing } = compareCoverage({
      expected: [{ screen: 'p-reason' }],
      captured: ['p-reason-error']
    })

    expect(missing.map((entry) => entry.screen)).toEqual(['p-reason'])
  })

  test('counts a screen as covered only when both sides of the diff agree', () => {
    const { both } = compareCoverage({
      expected,
      captured: ['p-origin', 'p-cph', 'p-unrelated']
    })

    expect(both).toEqual(['p-origin', 'p-cph'])
  })
})

const profileFor = ({ enumeratorModule = null, sha = 'abc12345' } = {}) => ({
  workspaceRoot: root,
  sideIds: ['prototype'],
  sides: [
    {
      id: 'prototype',
      repo: 'prototype',
      evidenceRoot: 'evidence',
      captureDir: join(root, 'evidence', `prototype@${sha}`)
    }
  ],
  sideById: {
    prototype: { id: 'prototype' }
  },
  repos: { prototype: { absolutePath: join(root, 'app') } },
  captures: { prototype: { sha } },
  paths: { enumeratorModule }
})

describe('coverageForSide', () => {
  test('reports the two set differences against what the capture recorded', () => {
    writeManifest(join(root, 'evidence', 'prototype@abc12345'), [
      'p-origin',
      'p-reason-error'
    ])

    const result = coverageForSide({
      profile: profileFor(),
      side: profileFor().sides[0],
      enumerators: {
        prototype: () => [{ screen: 'p-origin' }, { screen: 'p-reason' }]
      }
    })

    expect([result.expected, result.captured, result.covered]).toEqual([
      2, 2, 1
    ])
    expect(result.missing.map((entry) => entry.screen)).toEqual(['p-reason'])
    expect(result.states).toEqual([
      { screen: 'p-reason-error', of: 'p-reason' }
    ])
    expect(result.complete).toBe(false)
  })

  test('is complete only when every enumerated screen was captured', () => {
    writeManifest(join(root, 'evidence', 'prototype@abc12345'), ['p-origin'])

    const result = coverageForSide({
      profile: profileFor(),
      side: profileFor().sides[0],
      enumerators: { prototype: () => [{ screen: 'p-origin' }] }
    })

    expect(result.complete).toBe(true)
  })

  test('is never complete on a side nothing has captured, however short its list', () => {
    const result = coverageForSide({
      profile: profileFor(),
      side: profileFor().sides[0],
      enumerators: { prototype: () => [] }
    })

    expect([result.manifestFound, result.complete]).toEqual([false, false])
  })

  test('says the corpus declares no capture, rather than that the pictures are missing', () => {
    const profile = profileFor()
    profile.captures = {}

    const result = coverageForSide({
      profile,
      side: profile.sides[0],
      enumerators: { prototype: () => [{ screen: 'p-origin' }] }
    })

    expect(result.declared).toBeNull()
    expect(result.why).toMatch(/declares no capture for this side/)
  })

  test('says a declared capture has no manifest, which is a different fault', () => {
    const result = coverageForSide({
      profile: profileFor(),
      side: profileFor().sides[0],
      enumerators: { prototype: () => [{ screen: 'p-origin' }] }
    })

    expect(result.declared).toBe('abc12345')
    expect(result.why).toMatch(
      /declares a capture at abc12345 but there is no manifest/
    )
  })

  test('says which side has no enumerator rather than reporting it as covered', () => {
    const result = coverageForSide({
      profile: profileFor(),
      side: profileFor().sides[0],
      enumerators: {}
    })

    expect(result.enumerated).toBe(false)
    expect(result.why).toMatch(/names no "prototype"/)
    expect(result.complete).toBeUndefined()
  })
})

describe('runCoverage', () => {
  test('lists the sides it does have when asked for one it does not', () => {
    expect(() => runCoverage({ profile: profileFor(), side: 'nope' })).toThrow(
      /Unknown side "nope"\. This corpus has: prototype/
    )
  })

  test('covers every side when asked for none in particular', () => {
    const result = runCoverage({ profile: profileFor() })

    expect(result.sides.map((entry) => entry.side)).toEqual(['prototype'])
    expect(result.complete).toBe(false)
  })
})
