import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  readSlices,
  manifestScreensBySide,
  ownership,
  splitPairs,
  oneSided,
  runSlices,
  renderSlices
} from './slices.js'

let root

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-slices-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const writeJson = (path, value) => {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, JSON.stringify(value))
  return path
}

const writeManifest = (name, screens) =>
  writeJson(join(root, name, 'manifest.json'), {
    rows: screens.map((screen) => ({ screen }))
  })

const writeSlices = (slices) =>
  writeJson(join(root, 'workarea', 'slices.json'), { slices })

const writePairs = (module) => {
  const path = join(root, 'pairs.cjs')
  writeFileSync(path, `module.exports = ${JSON.stringify(module)}`)
  return path
}

const profileWith = ({ slicesFile = true, pairs, sides } = {}) => {
  if (slicesFile) {
    writeSlices([
      { id: 'chrome-owner', chrome: true, screens: ['fe-one', 'p-one'] },
      { id: 'rest', screens: ['fe-two', 'p-two'] }
    ])
  }
  return {
    sides: sides ?? [
      { id: 'frontend', manifest: writeManifest('fe', ['fe-one', 'fe-two']) },
      { id: 'prototype', manifest: writeManifest('p', ['p-one', 'p-two']) }
    ],
    paths: {
      workarea: join(root, 'workarea'),
      pairingModule: writePairs(
        pairs ?? {
          pairs: [{ frontend: 'fe-one', prototype: 'p-one' }],
          onlyFrontend: [],
          onlyPrototype: []
        }
      )
    }
  }
}

describe('readSlices', () => {
  test('says where to write a slicing rather than reporting an empty one', () => {
    expect(() => readSlices(join(root, 'absent.json'))).toThrow(
      /before spawning any authoring agent/
    )
  })

  test('refuses a slice with no screens list, naming the slice', () => {
    const path = writeJson(join(root, 'bad.json'), {
      slices: [{ id: 'documents' }]
    })

    expect(() => readSlices(path)).toThrow(/slice "documents" has no "screens"/)
  })

  test('refuses a slice with no id, naming its position', () => {
    const path = writeJson(join(root, 'bad.json'), {
      slices: [{ screens: [] }]
    })

    expect(() => readSlices(path)).toThrow(/slice 1 has no "id"/)
  })

  test('reads id, screens, chrome and note', () => {
    const path = writeJson(join(root, 'ok.json'), {
      slices: [
        {
          id: ' service-wide ',
          screens: ['fe-one'],
          chrome: true,
          note: 'owns the banner'
        },
        { id: 'documents', screens: [] }
      ]
    })

    expect(readSlices(path)).toEqual([
      {
        id: 'service-wide',
        screens: ['fe-one'],
        chrome: true,
        note: 'owns the banner'
      },
      { id: 'documents', screens: [], chrome: false, note: undefined }
    ])
  })
})

describe('manifestScreensBySide', () => {
  test('reads every side from its manifest', () => {
    const profile = profileWith()

    const result = manifestScreensBySide(profile)

    expect(result.checkable).toBe(true)
    expect(result.screens).toEqual(['fe-one', 'fe-two', 'p-one', 'p-two'])
  })

  test('says a side has no manifest rather than reporting it as empty', () => {
    const profile = profileWith({
      sides: [{ id: 'frontend', manifest: join(root, 'never-run.json') }]
    })

    const result = manifestScreensBySide(profile)

    expect(result.checkable).toBe(false)
    expect(result.sides[0]).toEqual({
      side: 'frontend',
      found: false,
      screens: []
    })
  })
})

describe('ownership', () => {
  const captured = ['fe-one', 'fe-two', 'fe-three']

  test('names a screen two slices claim, and both claimants', () => {
    const result = ownership({
      slices: [
        { id: 'hub', screens: ['fe-one', 'fe-two'] },
        { id: 'review', screens: ['fe-two', 'fe-three'] }
      ],
      captured
    })

    expect(result.duplicated).toEqual([
      { screen: 'fe-two', slices: ['hub', 'review'] }
    ])
  })

  test('names a captured screen no slice owns', () => {
    const result = ownership({
      slices: [{ id: 'hub', screens: ['fe-one', 'fe-two'] }],
      captured
    })

    expect(result.uncovered).toEqual(['fe-three'])
  })

  test('names a slice screen that is in no manifest, and who named it', () => {
    const result = ownership({
      slices: [{ id: 'hub', screens: ['fe-one', 'fe-typo'] }],
      captured
    })

    expect(result.unknown).toEqual([{ screen: 'fe-typo', slices: ['hub'] }])
  })

  test('a sound slicing reports nothing in any of the three lists', () => {
    const result = ownership({
      slices: [
        { id: 'hub', screens: ['fe-one'] },
        { id: 'review', screens: ['fe-two', 'fe-three'] }
      ],
      captured
    })

    expect([result.duplicated, result.uncovered, result.unknown]).toEqual([
      [],
      [],
      []
    ])
  })
})

describe('splitPairs', () => {
  test('names a pair whose two screens sit in different slices', () => {
    const owner = new Map([
      ['fe-one', ['hub']],
      ['p-one', ['review']]
    ])

    const result = splitPairs({
      pairing: { pairs: [{ frontend: 'fe-one', prototype: 'p-one' }] },
      owner
    })

    expect(result).toEqual([
      { frontend: 'fe-one', prototype: 'p-one', slices: ['hub', 'review'] }
    ])
  })

  test('says nothing about a pair both of whose screens one slice owns', () => {
    const owner = new Map([
      ['fe-one', ['hub']],
      ['p-one', ['hub']]
    ])

    expect(
      splitPairs({
        pairing: { pairs: [{ frontend: 'fe-one', prototype: 'p-one' }] },
        owner
      })
    ).toEqual([])
  })
})

describe('oneSided', () => {
  test('prints the owner of each one-sided screen, or that it has none', () => {
    const owner = new Map([['fe-delete', ['dashboard']]])

    const result = oneSided({
      pairing: {
        onlyFrontend: [{ screen: 'fe-delete' }],
        onlyPrototype: [{ screen: 'p-permanent-address' }]
      },
      owner
    })

    expect(result).toEqual([
      { screen: 'fe-delete', side: 'frontend', slice: 'dashboard' },
      { screen: 'p-permanent-address', side: 'prototype', slice: null }
    ])
  })
})

describe('runSlices', () => {
  test('calls a slicing sound when every captured screen is owned once', () => {
    const result = runSlices({ profile: profileWith() })

    expect(result.sound).toBe(true)
    expect([result.captured, result.assigned, result.chrome]).toEqual([
      4,
      4,
      ['chrome-owner']
    ])
  })

  test('is not sound when no slice owns the chrome', () => {
    writeSlices([
      { id: 'a', screens: ['fe-one', 'p-one'] },
      { id: 'b', screens: ['fe-two', 'p-two'] }
    ])

    const result = runSlices({ profile: profileWith({ slicesFile: false }) })

    expect([result.sound, result.chrome]).toEqual([false, []])
  })

  test('is not sound when two slices claim the chrome', () => {
    writeSlices([
      { id: 'a', chrome: true, screens: ['fe-one', 'p-one'] },
      { id: 'b', chrome: true, screens: ['fe-two', 'p-two'] }
    ])

    const result = runSlices({ profile: profileWith({ slicesFile: false }) })

    expect([result.sound, result.chrome]).toEqual([false, ['a', 'b']])
  })

  test('refuses to check a slicing against a corpus nobody has photographed', () => {
    const profile = profileWith({
      sides: [
        {
          id: 'frontend',
          manifest: join(root, 'never-run.json'),
          captureCommand: 'tim parity capture X --side frontend'
        }
      ]
    })

    expect(() => runSlices({ profile })).toThrow(
      /tim parity capture X --side frontend/
    )
  })

  test('reads a slicing from --file rather than the workarea', () => {
    const elsewhere = writeJson(join(root, 'proposed.json'), {
      slices: [
        { id: 'everything', chrome: true, screens: ['fe-one', 'fe-two'] }
      ]
    })

    const result = runSlices({
      profile: profileWith(),
      file: elsewhere
    })

    expect([result.path, result.uncovered]).toEqual([
      elsewhere,
      ['p-one', 'p-two']
    ])
  })
})

describe('renderSlices', () => {
  test('tells the reader to brief every other slice off the chrome', () => {
    const text = renderSlices(runSlices({ profile: profileWith() }))

    expect(text).toContain('Chrome is owned by "chrome-owner"')
    expect(text).toContain('Safe to spawn')
  })

  test('says what a missing chrome owner costs, not just that it is missing', () => {
    writeSlices([{ id: 'a', screens: ['fe-one', 'fe-two', 'p-one', 'p-two'] }])

    const text = renderSlices(
      runSlices({ profile: profileWith({ slicesFile: false }) })
    )

    expect(text).toContain('every slice writes the same finding')
  })

  test('counts the claimants rather than assuming there are two', () => {
    writeSlices([
      { id: 'a', chrome: true, screens: ['fe-one', 'fe-two', 'p-one'] },
      { id: 'b', screens: ['fe-two', 'p-two'] },
      { id: 'c', screens: ['fe-two'] }
    ])

    const text = renderSlices(
      runSlices({ profile: profileWith({ slicesFile: false }) })
    )

    expect(text).toContain('in 3 slices')
    expect(text).toContain('a, b, c')
  })

  test('prints a duplicated screen with both claimants', () => {
    writeSlices([
      { id: 'a', chrome: true, screens: ['fe-one', 'fe-two', 'p-one'] },
      { id: 'b', screens: ['fe-two', 'p-two'] }
    ])

    const text = renderSlices(
      runSlices({ profile: profileWith({ slicesFile: false }) })
    )

    expect(text).toContain('in 2 slices')
    expect(text).toContain('a, b')
    expect(text).toContain('The slicing is not sound')
  })
})
