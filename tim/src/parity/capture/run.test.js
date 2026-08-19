import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadCorpusProfile } from '../corpus-profile.js'
import {
  WALK_FILE,
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

  test('expects the route plan in the corpus workarea', () => {
    const paths = resolveCapturePaths({
      profile: profile(),
      side: 'frontend',
      sha: 'abcdefgh'
    })
    expect(paths.routePlanPath).toBe(
      join(
        workspaceRoot,
        'workareas/shared/alpha/cartography/frontend.routes.json'
      )
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

const plan = {
  side: 'frontend',
  app: { baseURL: 'http://localhost:3060', server: null },
  prelude: [],
  routes: [{ screen: 'fe-hub', steps: [] }]
}

const config = (overrides = {}) =>
  playwrightConfigSource({
    plan,
    contextPath: '/tmp/run/context.json',
    outputDir: '/tmp/run/test-results',
    deviceScaleFactor: 2,
    viewport: { width: 1280, height: 1200 },
    ...overrides
  })

describe('playwrightConfigSource', () => {
  test('runs only the walk, which is not named like a test', () => {
    expect(config()).toContain(`testMatch: "${WALK_FILE}"`)
    expect(WALK_FILE).not.toMatch(/\.spec\.js$/)
  })

  test('serves the application at the base URL the plan discovered', () => {
    expect(config()).toContain('baseURL: "http://localhost:3060"')
  })

  test('walks one journey at a time, because journey state lives in the session', () => {
    expect(config()).toContain('workers: 1')
  })

  test('fixes the viewport and the scale, so a re-run at the same commit matches', () => {
    expect(config()).toContain('viewport: {"width":1280,"height":1200}')
    expect(config()).toContain('deviceScaleFactor: 2')
    expect(config()).toContain("reducedMotion: 'reduce'")
  })

  test('starts nothing when the plan says the application is already up', () => {
    expect(config()).not.toContain('webServer')
  })

  test('starts the application the plan named, on the port it named', () => {
    const withServer = config({
      plan: {
        ...plan,
        app: {
          baseURL: 'http://localhost:3060',
          server: { command: 'npm start', cwd: '/repo', port: 3060 }
        }
      }
    })
    expect(withServer).toContain('command: "npm start"')
    expect(withServer).toContain('cwd: "/repo"')
    expect(withServer).toContain('port: 3060')
    expect(withServer).toContain('"PORT":"3060"')
  })

  test('runs headless unless asked to be watched', () => {
    expect(config()).toContain('headless: true')
    expect(config({ headed: true })).toContain('headless: false')
  })
})

describe('playwrightBin', () => {
  test('says how to install Playwright when tim has not got it', () => {
    expect(() => playwrightBin(workspaceRoot)).toThrow(
      /Playwright is not installed in tim/
    )
  })

  test('returns the runner when it is there', () => {
    const bin = join(workspaceRoot, 'node_modules', '.bin')
    mkdirSync(bin, { recursive: true })
    writeFileSync(join(bin, 'playwright'), '')
    expect(playwrightBin(workspaceRoot)).toBe(join(bin, 'playwright'))
  })
})
