import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadCorpusProfile } from '../corpus-profile.js'
import {
  SPEC_GLOB,
  specsIn,
  playwrightBin,
  playwrightConfigSource,
  resolveCapturePaths
} from './run.js'

let workspaceRoot

const side = (id, overrides = {}) => ({
  id,
  label: id,
  column: 'left',
  repo: 'frontend',
  screenPrefix: `${id}-`,
  captureDir: `workareas/shared/alpha/${id}/capture`,
  modelDir: `workareas/shared/alpha/${id}/capture/model`,
  htmlDir: null,
  screensDir: null,
  evidenceRoot: 'workareas/shared/alpha/evidence',
  traceDirs: [],
  ...overrides
})

const corpora = {
  default: 'alpha',
  corpora: {
    alpha: {
      runId: 'RUN-1',
      backlog: 'workareas/journey-builder/RUN-1/backlog.json',
      deferred: 'workareas/journey-builder/RUN-1/deferred.json',
      meta: 'workareas/journey-builder/RUN-1/.corpus-meta.json',
      evidence: 'workareas/journey-builder/RUN-1/evidence.json',
      reportDir: 'workareas/journey-builder/RUN-1/report',
      workarea: 'workareas/shared/alpha',
      pairingModule: 'workareas/shared/alpha/pairs.js',
      deltasDir: 'workareas/shared/alpha/deltas',
      upstreamFindings: 'workareas/shared/alpha/backlog.json',
      sides: [
        side('frontend'),
        side('prototype', { repo: 'frontend', evidenceRoot: null }),
        side('nomodels', { repo: 'frontend', modelDir: null })
      ],
      repos: {
        frontend: {
          owner: 'DEFRA',
          repo: 'the-frontend',
          localPath: 'repos/the-frontend',
          pathRoots: [{ prefix: 'repos/the-frontend/' }]
        }
      },
      captures: { frontend: { sha: 'deadbeef', deviceScaleFactor: 2 } }
    }
  }
}

const profile = () =>
  loadCorpusProfile({ workspaceRoot, runId: 'RUN-1', explicit: 'alpha' })

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), 'tim-capture-run-'))
  mkdirSync(join(workspaceRoot, 'tools', 'parity'), { recursive: true })
  writeFileSync(
    join(workspaceRoot, 'tools', 'parity', 'corpora.json'),
    JSON.stringify(corpora)
  )
})

afterEach(() => {
  rmSync(workspaceRoot, { recursive: true, force: true })
})

describe('resolveCapturePaths', () => {
  test('names the capture directory after the side and the commit', () => {
    const paths = resolveCapturePaths({
      profile: profile(),
      side: 'frontend',
      sha: '005b1e8cabcdef'
    })
    expect(paths.captureDir).toBe(
      join(workspaceRoot, 'workareas/shared/alpha/evidence/frontend@005b1e8c')
    )
  })

  test('puts the models where the corpus says the differ reads them', () => {
    const paths = resolveCapturePaths({
      profile: profile(),
      side: 'frontend',
      sha: 'abcdefgh'
    })
    expect(paths.modelDir).toBe(
      join(workspaceRoot, 'workareas/shared/alpha/frontend/capture/model')
    )
  })

  test('looks for the anchors beside the evidence, where seed-anchors writes them', () => {
    const paths = resolveCapturePaths({
      profile: profile(),
      side: 'frontend',
      sha: 'abcdefgh'
    })
    expect(paths.anchorsPath).toBe(
      join(
        workspaceRoot,
        'workareas/shared/alpha/evidence/anchors.frontend.json'
      )
    )
  })

  test("expects a side's capture specs in the corpus workarea", () => {
    const paths = resolveCapturePaths({
      profile: profile(),
      side: 'frontend',
      sha: 'abcdefgh'
    })
    expect(paths.specDir).toBe(
      join(workspaceRoot, 'workareas/shared/alpha/specs/frontend')
    )
  })

  test('finds the application to photograph through the side repo', () => {
    const paths = resolveCapturePaths({
      profile: profile(),
      side: 'frontend',
      sha: 'abcdefgh'
    })
    expect(paths.appRoot).toBe(join(workspaceRoot, 'repos/the-frontend'))
  })

  test('lists the sides it does have when asked for one it does not', () => {
    expect(() =>
      resolveCapturePaths({ profile: profile(), side: 'nope', sha: 'a' })
    ).toThrow(/Unknown side "nope"\. This corpus has: frontend, prototype/)
  })

  test('refuses a side with nowhere to put the pictures', () => {
    expect(() =>
      resolveCapturePaths({ profile: profile(), side: 'prototype', sha: 'a' })
    ).toThrow(/names no evidenceRoot/)
  })

  test('refuses a side with nowhere to put the page models', () => {
    expect(() =>
      resolveCapturePaths({ profile: profile(), side: 'nomodels', sha: 'a' })
    ).toThrow(/names no modelDir/)
  })
})

describe('specsIn', () => {
  test('lists the specs a side has, in the order they will run', () => {
    const dir = join(workspaceRoot, 'specs')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'origin-and-reason.pw.js'), '')
    writeFileSync(join(dir, 'addresses.pw.js'), '')

    expect(specsIn(dir)).toEqual(['addresses.pw.js', 'origin-and-reason.pw.js'])
  })

  test('ignores anything that is not a spec, so a note beside them is harmless', () => {
    const dir = join(workspaceRoot, 'mixed')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'addresses.pw.js'), '')
    writeFileSync(join(dir, 'README.md'), '')
    writeFileSync(join(dir, 'helpers.js'), '')

    expect(specsIn(dir)).toEqual(['addresses.pw.js'])
  })

  test('says a side has none rather than throwing, when nobody has written any', () => {
    expect(specsIn(join(workspaceRoot, 'nothing-here'))).toEqual([])
  })
})

const config = (overrides = {}) =>
  playwrightConfigSource({
    specDir: '/corpus/specs/frontend',
    side: 'frontend',
    baseURL: 'http://localhost:3060',
    contextPath: '/tmp/run/context.json',
    outputDir: '/tmp/run/test-results',
    deviceScaleFactor: 2,
    viewport: { width: 1280, height: 1200 },
    ...overrides
  })

describe('playwrightConfigSource', () => {
  test("runs the side's specs, which are not named like tests", () => {
    expect(config()).toContain('testDir: "/corpus/specs/frontend"')
    expect(config()).toContain(`testMatch: "${SPEC_GLOB}"`)
    expect(SPEC_GLOB).not.toMatch(/\.spec\.js$/)
  })

  test('points the browser at the base URL the corpus names', () => {
    expect(config()).toContain('baseURL: "http://localhost:3060"')
  })

  test('runs one spec at a time, because journey state lives in the session', () => {
    expect(config()).toContain('workers: 1')
  })

  test('fixes the viewport and the scale, so a re-run at the same commit matches', () => {
    expect(config()).toContain('viewport: {"width":1280,"height":1200}')
    expect(config()).toContain('deviceScaleFactor: 2')
    expect(config()).toContain("reducedMotion: 'reduce'")
  })

  test('leaves serving the application to tim, which can say what it started', () => {
    expect(config()).not.toContain('webServer')
  })

  test('runs headless unless asked to be watched', () => {
    expect(config()).toContain('headless: true')
    expect(config({ headed: true })).toContain('headless: false')
  })
})

describe('playwrightBin', () => {
  const installBin = () => {
    const bin = join(workspaceRoot, 'node_modules', '.bin')
    mkdirSync(bin, { recursive: true })
    writeFileSync(join(bin, 'playwright'), '')
    return join(bin, 'playwright')
  }

  const installRunner = () => {
    const runner = join(workspaceRoot, 'node_modules', '@playwright', 'test')
    mkdirSync(runner, { recursive: true })
    writeFileSync(join(runner, 'package.json'), '{}')
  }

  test('says how to install Playwright when tim has not got it', () => {
    expect(() => playwrightBin(workspaceRoot)).toThrow(
      /Playwright is not installed in tim/
    )
  })

  test('is not satisfied by the binary alone, which cannot run "playwright test"', () => {
    installBin()
    expect(() => playwrightBin(workspaceRoot)).toThrow(
      /Playwright is not installed in tim/
    )
  })

  test('returns the runner when both halves are there', () => {
    const bin = installBin()
    installRunner()
    expect(playwrightBin(workspaceRoot)).toBe(bin)
  })
})
