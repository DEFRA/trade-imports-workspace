import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { readJsonFile } from '../io.js'
import { resolveCitation, runEvidence } from './evidence.js'
import { citationHealth } from '../check-evidence.js'

let dir
let repoPath
let profile
let meta

const git = (args) =>
  execFileSync('git', ['-C', repoPath, ...args], { encoding: 'utf8' })

const sections = [
  'export const sections = [',
  ...Array.from({ length: 60 }, (_, i) => `  { id: 'row-${i + 1}' },`),
  ']',
  'export const canUseSameAsConsignee = true'
]

const backlog = (increments) => ({
  run_id: 'EUDPA-TEST',
  target: 'the-frontend',
  corpus: 'test',
  increments
})

const increment = (citations) => ({
  id: 'inc-001',
  type: 'finding',
  milestone: null,
  domain: 'addresses',
  title: 'a finding',
  detail: 'x',
  screens: [],
  evidence: {},
  confidence: 'high',
  band: 'frontend-work',
  gate: null,
  dependsOn: [],
  status: 'todo',
  commit: null,
  failure_reason: null,
  citations
})

const write = (increments) =>
  writeFileSync(
    profile.paths.backlog,
    JSON.stringify(backlog(increments), null, 2)
  )

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tim-parity-evidence-'))
  repoPath = join(dir, 'repo')
  mkdirSync(repoPath)
  execFileSync('git', ['init', '-q', '-b', 'main', repoPath])
  git(['config', 'user.email', 'test@example.com'])
  git(['config', 'user.name', 'Test'])
  writeFileSync(join(repoPath, 'sections.js'), `${sections.join('\n')}\n`)
  writeFileSync(
    join(repoPath, 'copy.js'),
    `export const copy = {\n  maxDocuments: (max) => \`You can add a maximum of \${max} documents\`\n}\n`
  )
  git(['add', '.'])
  git(['commit', '-q', '-m', 'the only commit'])

  mkdirSync(join(dir, 'html'))
  writeFileSync(
    join(dir, 'html', 'fe-addresses.html'),
    '<html><p>Green Valley Farm</p></html>'
  )

  profile = {
    id: 'test',
    runId: 'EUDPA-TEST',
    sides: [
      { id: 'frontend', screenPrefix: 'fe-', htmlDir: join(dir, 'html') }
    ],
    repos: {
      frontend: { owner: 'DEFRA', repo: 'the-frontend', absolutePath: repoPath }
    },
    paths: {
      backlog: join(dir, 'backlog.json'),
      meta: join(dir, 'meta.json'),
      evidence: join(dir, 'evidence.json')
    }
  }
  meta = {
    pins: {
      frontend: {
        sha: git(['rev-parse', 'HEAD']).trim(),
        short: 'abcdefgh',
        pushed: true
      }
    }
  }
  writeFileSync(profile.paths.meta, JSON.stringify(meta))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

const citation = (overrides) => ({
  ref: 'c1',
  kind: 'code',
  side: 'frontend',
  repo: 'frontend',
  path: 'sections.js',
  asWritten: 'sections.js:1',
  resolution: 'explicit',
  anchors: [],
  ...overrides
})

describe('resolveCitation', () => {
  test('keeps a long range resolved instead of dropping its snippet', () => {
    const result = resolveCitation({
      citation: citation({ lines: { start: 1, end: 40 } }),
      profile,
      meta
    })

    expect(result.state).toBe('resolved')
    expect(result.snippet.lines.length).toBeGreaterThan(0)
  })

  test('finds an identifier inside a long cited range', () => {
    const result = resolveCitation({
      citation: citation({
        lines: { start: 1, end: 63 },
        anchors: ['canUseSameAsConsignee']
      }),
      profile,
      meta
    })

    expect(result.anchorCheck).toMatchObject({
      ok: true,
      inRange: ['canUseSameAsConsignee']
    })
  })

  test('finds an identifier in the second range of a multi-range citation', () => {
    const result = resolveCitation({
      citation: citation({
        lines: null,
        ranges: [
          { start: 1, end: 2 },
          { start: 63, end: 63 }
        ],
        anchors: ['canUseSameAsConsignee']
      }),
      profile,
      meta
    })

    expect(result.anchorCheck.inRange).toEqual(['canUseSameAsConsignee'])
  })

  test('offers a permalink for every range, not only the first', () => {
    const result = resolveCitation({
      citation: citation({
        lines: null,
        ranges: [
          { start: 1, end: 2 },
          { start: 63, end: 63 }
        ]
      }),
      profile,
      meta
    })

    expect(result.urls.map((entry) => entry.url)).toEqual([
      expect.stringContaining('#L1-L2'),
      expect.stringContaining('#L63')
    ])
  })
})

describe('runEvidence', () => {
  test('reports a string the source interpolates as expected, not as a miss', () => {
    write([
      increment([
        citation({
          path: 'copy.js',
          lines: { start: 1, end: 3 },
          anchors: ['You can add a maximum of 10 documents']
        })
      ])
    ])

    const result = runEvidence({ profile })

    expect(result.anchorMisses).toEqual([])
    expect(result.explained[0].interpolated[0].anchor).toBe(
      'You can add a maximum of 10 documents'
    )
  })

  test('reports a string quoted off the captured page as rendered', () => {
    write([
      {
        ...increment([
          citation({
            path: 'copy.js',
            lines: { start: 1, end: 3 },
            anchors: ['Green Valley Farm']
          })
        ]),
        screens: ['fe-addresses']
      }
    ])

    const result = runEvidence({ profile })

    expect(result.explained[0].rendered).toEqual(['Green Valley Farm'])
  })

  test('reports both faults on a citation that has an absent anchor and a drifted one', () => {
    write([
      increment([
        citation({
          lines: { start: 1, end: 2 },
          anchors: ['canUseSameAsConsignee', 'nowhereAtAll']
        })
      ])
    ])

    const result = runEvidence({ profile })

    expect(result.outOfRange).toHaveLength(1)
    expect(result.anchorMisses).toHaveLength(1)
  })

  test('counts drifted ranges the same way check-evidence does', () => {
    write([
      increment([
        citation({
          lines: { start: 1, end: 2 },
          anchors: ['canUseSameAsConsignee', 'nowhereAtAll']
        })
      ])
    ])

    const result = runEvidence({ profile, write: true })
    const health = citationHealth(readJsonFile(profile.paths.evidence))

    expect(health.outOfRange).toHaveLength(result.outOfRange.length)
    expect(health.missingFromFile).toHaveLength(result.anchorMisses.length)
  })
})
