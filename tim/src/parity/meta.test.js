import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { resolvePin, isPushed, buildCorpusMeta } from './meta.js'

let dir
let repoPath

const git = (args) =>
  execFileSync('git', ['-C', repoPath, ...args], { encoding: 'utf8' })

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tim-parity-meta-'))
  repoPath = join(dir, 'repo')
  mkdirSync(repoPath)
  execFileSync('git', ['init', '-q', '-b', 'main', repoPath])
  git(['config', 'user.email', 'test@example.com'])
  git(['config', 'user.name', 'Test'])
  writeFileSync(join(repoPath, 'a.txt'), 'hello\n')
  git(['add', 'a.txt'])
  git(['commit', '-q', '-m', 'the only commit'])
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('resolvePin', () => {
  test('returns the full forty-character sha, never the short form', () => {
    const pin = resolvePin(
      { owner: 'DEFRA', repo: 'x', absolutePath: repoPath },
      'HEAD',
      'because'
    )
    expect(pin.sha).toHaveLength(40)
    expect(pin.short).toHaveLength(8)
  })

  test('carries the subject and the reason so the masthead can say why', () => {
    const pin = resolvePin(
      { owner: 'DEFRA', repo: 'x', absolutePath: repoPath },
      'HEAD',
      'Sam ruled latest of both'
    )
    expect(pin.subject).toBe('the only commit')
    expect(pin.why).toBe('Sam ruled latest of both')
  })

  test('reports a local-only commit as not pushed', () => {
    const pin = resolvePin(
      { owner: 'DEFRA', repo: 'x', absolutePath: repoPath },
      'HEAD',
      'why'
    )
    expect(pin.pushed).toBe(false)
  })

  test('returns null rather than throwing when the clone is absent', () => {
    expect(
      resolvePin(
        { owner: 'D', repo: 'x', absolutePath: join(dir, 'nope') },
        'HEAD',
        'w'
      )
    ).toBeNull()
  })
})

describe('isPushed', () => {
  test('is false with no remote branches', () => {
    expect(isPushed(repoPath, 'HEAD')).toBe(false)
  })
})

describe('buildCorpusMeta', () => {
  const makeProfile = () => {
    const runDir = join(dir, 'workareas', 'journey-builder', 'RUN-1')
    mkdirSync(runDir, { recursive: true })
    writeFileSync(
      join(runDir, 'backlog.json'),
      JSON.stringify({
        run_id: 'RUN-1',
        target: 't',
        increments: [
          {
            id: 'inc-001',
            type: 'add-field',
            milestone: 'M0',
            domain: 'd',
            title: 't',
            detail: 'x',
            screens: [],
            evidence: {},
            confidence: 'high',
            band: 'frontend-only',
            gate: 'sam',
            dependsOn: [],
            status: 'blocked',
            commit: null,
            failure_reason: null
          }
        ]
      })
    )
    const modelDir = join(dir, 'models')
    mkdirSync(modelDir)
    writeFileSync(join(modelDir, 'x.json'), '{}')
    return {
      id: 'alpha',
      runId: 'RUN-1',
      sides: [
        {
          id: 'prototype',
          repo: 'proto',
          modelDir,
          screensDir: null
        }
      ],
      repos: {
        proto: { owner: 'defra-design', repo: 'p', absolutePath: repoPath }
      },
      paths: {
        backlog: join(runDir, 'backlog.json'),
        deferred: join(runDir, 'deferred.json'),
        deltasDir: join(dir, 'deltas')
      }
    }
  }

  test('marks a capture as matching the pin when the shas agree', () => {
    const profile = makeProfile()
    const head = execFileSync('git', ['-C', repoPath, 'rev-parse', 'HEAD'], {
      encoding: 'utf8'
    }).trim()
    const meta = buildCorpusMeta({
      profile,
      pinSpec: { proto: { ref: 'HEAD', why: 'w' } },
      captureSpec: { prototype: { sha: head.slice(0, 7), on: '2026-08-14' } },
      capturedOn: '2026-08-19'
    })
    expect(meta.captures.prototype.matchesPin).toBe(true)
  })

  test('marks a capture as not matching when the repo has moved past it', () => {
    const profile = makeProfile()
    const meta = buildCorpusMeta({
      profile,
      pinSpec: { proto: { ref: 'HEAD', why: 'w' } },
      captureSpec: { prototype: { sha: 'deadbee', on: '2026-08-14' } },
      capturedOn: '2026-08-19'
    })
    expect(meta.captures.prototype.matchesPin).toBe(false)
  })

  test('counts the page models on disk rather than being told', () => {
    const meta = buildCorpusMeta({
      profile: makeProfile(),
      pinSpec: {},
      captureSpec: {},
      capturedOn: '2026-08-19'
    })
    expect(meta.captures.prototype.models).toBe(1)
  })

  test('carries the derived counts so no masthead number is retyped', () => {
    const meta = buildCorpusMeta({
      profile: makeProfile(),
      pinSpec: {},
      captureSpec: {},
      capturedOn: '2026-08-19'
    })
    expect(meta.counts.findings).toBe(1)
    expect(meta.counts.gated).toBe(1)
  })
})
