import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  resolveCorpusId,
  loadCorpusProfile,
  stripPathRoot
} from './corpus-profile.js'

const corporaFixture = {
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
        {
          id: 'frontend',
          label: 'Frontend',
          column: 'left',
          repo: 'frontend',
          screenPrefix: 'fe-',
          captureDir: 'workareas/shared/alpha/fe/capture',
          modelDir: 'workareas/shared/alpha/fe/capture/model',
          htmlDir: 'workareas/shared/alpha/fe/capture/html',
          screensDir: null,
          traceDirs: []
        },
        {
          id: 'prototype',
          label: 'Prototype',
          column: 'right',
          repo: 'prototype',
          screenPrefix: 'dr21-',
          captureDir: 'workareas/shared/alpha/proto/capture',
          modelDir: 'workareas/shared/alpha/proto/capture/model',
          htmlDir: 'workareas/shared/alpha/proto/capture/html',
          screensDir: 'workareas/shared/alpha/proto/capture/screens',
          traceDirs: ['workareas/shared/alpha/proto/test-results'],
          app: {
            baseURL: 'http://localhost:3010',
            startPath: '/',
            startCommand: 'npm run dev',
            cwd: '~/git/defra/the-prototype'
          }
        }
      ],
      repos: {
        frontend: {
          owner: 'DEFRA',
          repo: 'the-frontend',
          localPath: 'repos/the-frontend',
          pathRoots: [
            { prefix: 'repos/the-frontend/' },
            { prefix: 'src/', impliedPrefix: 'src/' },
            { prefix: '/abs/old/repos/the-frontend/' }
          ]
        },
        prototype: {
          owner: 'defra-design',
          repo: 'the-prototype',
          localPath: null,
          localPathAbsolute: '~/git/defra/the-prototype',
          pathRoots: [
            { prefix: 'the-prototype/' },
            { prefix: 'app/', impliedPrefix: 'app/' }
          ]
        }
      }
    },
    beta: {
      runId: 'RUN-2',
      backlog: 'b.json',
      deferred: 'b.json',
      meta: 'b.json',
      evidence: 'b.json',
      reportDir: 'b',
      workarea: 'b',
      pairingModule: 'b.js',
      deltasDir: 'b',
      upstreamFindings: 'b.json',
      sides: [],
      repos: {}
    }
  }
}

let workspace

const writeRunFile = (runId, name, body) => {
  const dir = join(workspace, 'workareas', 'journey-builder', runId)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, name), JSON.stringify(body))
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-corpus-'))
  mkdirSync(join(workspace, 'tools', 'parity'), { recursive: true })
  writeFileSync(
    join(workspace, 'tools', 'parity', 'corpora.json'),
    JSON.stringify(corporaFixture)
  )
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

describe('resolveCorpusId precedence', () => {
  test('falls back to the file default when nothing else says', () => {
    expect(resolveCorpusId({ workspaceRoot: workspace })).toEqual({
      id: 'alpha',
      source: 'corpora.json default'
    })
  })

  test('reads the corpus field off the backlog', () => {
    writeRunFile('RUN-1', 'backlog.json', { corpus: 'beta' })
    expect(
      resolveCorpusId({ workspaceRoot: workspace, runId: 'RUN-1' }).id
    ).toBe('beta')
  })

  test('falls through to .corpus-meta.json when the backlog is silent', () => {
    writeRunFile('RUN-1', 'backlog.json', { run_id: 'RUN-1' })
    writeRunFile('RUN-1', '.corpus-meta.json', { corpus: 'beta' })
    expect(
      resolveCorpusId({ workspaceRoot: workspace, runId: 'RUN-1' })
    ).toEqual({ id: 'beta', source: '.corpus-meta.json' })
  })

  test('an explicit --corpus beats the backlog field', () => {
    writeRunFile('RUN-1', 'backlog.json', { corpus: 'beta' })
    expect(
      resolveCorpusId({
        workspaceRoot: workspace,
        runId: 'RUN-1',
        explicit: 'alpha'
      })
    ).toEqual({ id: 'alpha', source: '--corpus' })
  })

  test('falls back to the corpus that declares the run id, before any file exists', () => {
    expect(
      resolveCorpusId({ workspaceRoot: workspace, runId: 'RUN-1' })
    ).toEqual({ id: 'alpha', source: 'runId in corpora.json' })
  })

  test('refuses a run id no corpus claims, rather than reporting on another comparison', () => {
    expect(() =>
      resolveCorpusId({ workspaceRoot: workspace, runId: 'RUN-NOBODY' })
    ).toThrow(/No corpus claims the run "RUN-NOBODY"/)
  })
})

describe('loadCorpusProfile', () => {
  test('lists the known ids when the corpus is unknown', () => {
    expect(() =>
      loadCorpusProfile({ workspaceRoot: workspace, explicit: 'gamma' })
    ).toThrow(/Unknown corpus "gamma".*alpha, beta/s)
  })

  test('makes workspace-relative paths absolute', () => {
    const profile = loadCorpusProfile({ workspaceRoot: workspace })
    expect(profile.paths.backlog).toBe(
      join(workspace, 'workareas/journey-builder/RUN-1/backlog.json')
    )
    expect(profile.sideById.prototype.screensDir).toBe(
      join(workspace, 'workareas/shared/alpha/proto/capture/screens')
    )
  })

  test('expands a home-relative repo path rather than nesting it under the workspace', () => {
    const profile = loadCorpusProfile({ workspaceRoot: workspace })
    expect(profile.repos.prototype.absolutePath).toMatch(
      /\/git\/defra\/the-prototype$/
    )
    expect(profile.repos.prototype.absolutePath).not.toContain(workspace)
  })

  test('resolves where an application is started from, like any other path', () => {
    const profile = loadCorpusProfile({ workspaceRoot: workspace })
    expect(profile.sideById.prototype.app.cwd).toMatch(
      /\/git\/defra\/the-prototype$/
    )
    expect(profile.sideById.frontend.app ?? null).toBeNull()
  })

  test('orders every repo path root longest first', () => {
    const profile = loadCorpusProfile({ workspaceRoot: workspace })
    const lengths = profile.repos.frontend.pathRoots.map((r) => r.prefix.length)
    expect(lengths).toEqual([...lengths].sort((a, b) => b - a))
  })
})

describe('stripPathRoot', () => {
  test('strips an explicit repo prefix', () => {
    const profile = loadCorpusProfile({ workspaceRoot: workspace })
    expect(
      stripPathRoot(profile, 'repos/the-frontend/src/server/app/x.njk')
    ).toEqual({ repo: 'frontend', path: 'src/server/app/x.njk' })
  })

  test('strips a stale absolute prefix from an older clone', () => {
    const profile = loadCorpusProfile({ workspaceRoot: workspace })
    expect(
      stripPathRoot(profile, '/abs/old/repos/the-frontend/src/a.js')
    ).toEqual({ repo: 'frontend', path: 'src/a.js' })
  })

  test('leaves an already repo-relative path alone via impliedPrefix', () => {
    const profile = loadCorpusProfile({ workspaceRoot: workspace })
    expect(stripPathRoot(profile, 'app/views/dashboard.html')).toEqual({
      repo: 'prototype',
      path: 'app/views/dashboard.html'
    })
  })

  test('prefers an explicit root over an implied one when both match', () => {
    const profile = loadCorpusProfile({ workspaceRoot: workspace })
    expect(
      stripPathRoot(profile, 'the-prototype/app/views/dashboard.html')
    ).toEqual({ repo: 'prototype', path: 'app/views/dashboard.html' })
  })

  test('returns null rather than guessing when no root matches', () => {
    const profile = loadCorpusProfile({ workspaceRoot: workspace })
    expect(stripPathRoot(profile, 'somewhere/else/x.js')).toBeNull()
  })

  test('a preferred repo only breaks a tie, it does not override a longer match', () => {
    const profile = loadCorpusProfile({ workspaceRoot: workspace })
    expect(
      stripPathRoot(profile, 'repos/the-frontend/src/a.js', 'prototype')
    ).toEqual({ repo: 'frontend', path: 'src/a.js' })
  })
})
