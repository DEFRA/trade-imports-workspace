import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { readJsonFile } from './io.js'
import { pngSize, runManifest } from './manifest.js'

// A one-pixel PNG, byte for byte. Enough for the header reader to work on.
const onePixelPng = Buffer.from(
  '89504e470d0a1a0a0000000d494844520000000100000001080600000' +
    '01f15c4890000000a49444154789c6300010000050001' +
    '0d0a2db40000000049454e44ae426082',
  'hex'
)

let dir
let profile

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tim-parity-manifest-'))
  const screens = join(dir, 'evidence', 'prototype@abc123', 'page')
  mkdirSync(screens, { recursive: true })
  writeFileSync(join(screens, 'dr21-dashboard.png'), onePixelPng)
  writeFileSync(join(screens, 'dr21-hub.png'), onePixelPng)
  writeFileSync(join(screens, 'notes.txt'), 'not a screen')
  profile = {
    sideIds: ['prototype'],
    sideById: {
      prototype: {
        id: 'prototype',
        screensDir: screens,
        manifest: join(dir, 'evidence', 'prototype@abc123', 'manifest.json'),
        captureCommand: 'run the harness'
      }
    },
    captures: { prototype: { deviceScaleFactor: 2 } }
  }
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('pngSize', () => {
  test('reads the dimensions out of the IHDR chunk', () => {
    expect(pngSize(onePixelPng)).toEqual({ width: 1, height: 1 })
  })

  test('returns null for anything that is not a PNG', () => {
    expect(pngSize(Buffer.from('not a png'))).toBeNull()
  })
})

describe('runManifest', () => {
  test('indexes every screen and nothing else in the directory', () => {
    const result = runManifest({
      profile,
      side: 'prototype',
      sha: 'abc123',
      write: true
    })
    expect(result.screens).toBe(2)
    const manifest = readJsonFile(profile.sideById.prototype.manifest)
    expect(manifest.rows.map((row) => row.screen)).toEqual([
      'dr21-dashboard',
      'dr21-hub'
    ])
  })

  test('records a hash and a size per screen, which is what drift is measured against', () => {
    runManifest({ profile, side: 'prototype', sha: 'abc123', write: true })
    const [row] = readJsonFile(profile.sideById.prototype.manifest).rows
    expect(row.sha256).toHaveLength(64)
    expect(row.size).toEqual({ width: 1, height: 1 })
  })

  test('takes the device scale factor from the corpus profile when not told', () => {
    runManifest({ profile, side: 'prototype', sha: 'abc123', write: true })
    expect(
      readJsonFile(profile.sideById.prototype.manifest).deviceScaleFactor
    ).toBe(2)
  })

  test('writes nothing on a dry run', () => {
    const result = runManifest({ profile, side: 'prototype', sha: 'abc123' })
    expect(result.written).toBe(false)
    expect(() => readJsonFile(profile.sideById.prototype.manifest)).toThrow()
  })

  test('lists the known sides when asked for one that is not there', () => {
    expect(() =>
      runManifest({ profile, side: 'backend', sha: 'abc123' })
    ).toThrow(/Unknown side "backend".*prototype/s)
  })

  test('names the capture command when there is nothing to index', () => {
    profile.sideById.prototype.screensDir = join(dir, 'nowhere')
    expect(() =>
      runManifest({ profile, side: 'prototype', sha: 'abc123' })
    ).toThrow(/run the harness/)
  })
})
