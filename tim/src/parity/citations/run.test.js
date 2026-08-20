import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  citeIncrement,
  captureRoot,
  isCheckableAnchor,
  repoByParagraph,
  runCitations
} from './run.js'
import { indexByBasename } from './resolve.js'
import { readJsonFile } from '../io.js'
import { setCitation } from '../set.js'

const profile = {
  id: 'dr21',
  sides: [
    { id: 'frontend', screenPrefix: 'fe-' },
    { id: 'prototype', screenPrefix: 'dr21-' }
  ],
  repoBySideDefault: { frontend: 'frontend', prototype: 'prototype' },
  repos: {
    frontend: {
      pathRoots: [
        { prefix: 'repos/the-frontend/' },
        { prefix: 'src/', impliedPrefix: 'src/' }
      ]
    },
    prototype: {
      pathRoots: [
        { prefix: 'the-prototype/' },
        { prefix: 'app/', impliedPrefix: 'app/' }
      ]
    }
  },
  captureCitationRoots: [
    { prefix: 'harness/capture/', kind: 'capture', side: 'prototype' }
  ]
}

const indexes = new Map([
  [
    'frontend',
    indexByBasename([
      'src/server/app/shared/layout.njk',
      'src/server/app/x/copy.en.js'
    ])
  ],
  ['prototype', indexByBasename(['app/routes.js', 'app/views/dashboard.html'])]
])

const base = (overrides = {}) => ({
  id: 'inc-001',
  domain: 'dashboard',
  screens: [],
  detail: 'x',
  evidence: {},
  ...overrides
})

describe('captureRoot', () => {
  test('recognises a path under a capture directory', () => {
    expect(
      captureRoot(profile, 'harness/capture/model/dr21-dashboard.json')
    ).toMatchObject({ side: 'prototype' })
  })

  test('leaves an ordinary source path alone', () => {
    expect(captureRoot(profile, 'src/server/app/shared/layout.njk')).toBeNull()
  })
})

describe('repoByParagraph', () => {
  const pair = (paragraph, repo) => ({
    token: { paragraph, field: 'detail' },
    resolved: { repo }
  })

  test('claims a paragraph whose citations all landed in one repo', () => {
    expect(
      repoByParagraph([pair(0, 'prototype'), pair(0, 'prototype')])
    ).toEqual(new Map([[0, 'prototype']]))
  })

  test('claims nothing for a paragraph that disagrees with itself', () => {
    expect(
      repoByParagraph([pair(0, 'frontend'), pair(0, 'prototype')])
    ).toEqual(new Map())
  })

  test('ignores citations from the evidence fields, which are not paragraphs', () => {
    expect(
      repoByParagraph([
        {
          token: { paragraph: 0, field: 'evidence.frontend' },
          resolved: { repo: 'frontend' }
        }
      ])
    ).toEqual(new Map())
  })

  test('ignores an unresolved citation rather than treating it as evidence', () => {
    expect(
      repoByParagraph([
        { token: { paragraph: 0, field: 'detail' }, resolved: null }
      ])
    ).toEqual(new Map())
  })
})

describe('citeIncrement', () => {
  test('numbers citations in reading order across fields', () => {
    const { citations } = citeIncrement({
      increment: base({
        detail: 'layout.njk:41-53 renders it.',
        evidence: { prototype: 'app/views/dashboard.html:16-28' }
      }),
      profile,
      indexes
    })
    expect(citations.map((c) => c.ref)).toEqual(['c1', 'c2'])
    expect(citations[1].path).toBe('app/views/dashboard.html')
  })

  test('gives one marker to a target cited twice with the same lines', () => {
    const { citations } = citeIncrement({
      increment: base({
        detail: 'layout.njk:41-53 renders it, and layout.njk:41-53 again.'
      }),
      profile,
      indexes
    })
    expect(citations).toHaveLength(1)
  })

  test('classifies an archived DOM file as a capture citation, not a missing source file', () => {
    const { citations } = citeIncrement({
      increment: base({
        detail:
          'dr21-roles-and-addresses-complete.html:287-300 shows the block.'
      }),
      profile,
      indexes
    })
    expect(citations[0]).toMatchObject({ kind: 'capture', side: 'prototype' })
    expect(citations[0].needsHuman).toBeUndefined()
  })

  test('classifies a page-model reference as a capture citation', () => {
    const { citations } = citeIncrement({
      increment: base({ detail: 'dr21-dashboard.json:7-11 shows serviceNav.' }),
      profile,
      indexes
    })
    expect(citations[0]).toMatchObject({
      kind: 'capture',
      side: 'prototype',
      screen: 'dr21-dashboard'
    })
  })

  test('marks the prose with [[cN]] in place of every token', () => {
    const { marked } = citeIncrement({
      increment: base({ detail: 'layout.njk:41-53 renders it.' }),
      profile,
      indexes
    })
    expect(marked.detail).toBe('[[c1]] renders it.')
  })

  test('leaves the prose around a marker exactly as it was', () => {
    const detail =
      'The hint says "Start typing to search" but layout.njk:41-53 renders a plain select.'
    const { marked } = citeIncrement({
      increment: base({ detail }),
      profile,
      indexes
    })
    expect(marked.detail).toBe(
      'The hint says "Start typing to search" but [[c1]] renders a plain select.'
    )
  })

  test('collects an unresolved citation with its reason rather than guessing a path', () => {
    const { citations, unresolved } = citeIncrement({
      increment: base({ detail: 'nowhere.js:3 does something.' }),
      profile,
      indexes
    })
    expect(citations[0].needsHuman).toBe(true)
    expect(unresolved[0].why).toMatch(/not a tracked file/)
  })

  test('records the identifiers and quoted strings sitting beside a citation as anchors', () => {
    const { citations } = citeIncrement({
      increment: base({
        detail:
          'layout.njk:41-53 calls `govukPhaseBanner` with the text "This is a new service".'
      }),
      profile,
      indexes
    })
    expect(citations[0].anchors).toEqual([
      'govukPhaseBanner',
      'This is a new service'
    ])
  })

  test('pairs each quote with its own closing quote', () => {
    const { citations } = citeIncrement({
      increment: base({
        detail:
          'copy.en.js:52-57 shows "Checking" while the scan is pending, "Virus found" when it fails.'
      }),
      profile,
      indexes
    })

    expect(citations[0].anchors).toEqual(['Checking', 'Virus found'])
  })

  test('takes no anchor from a sentence that prescribes a change', () => {
    const { citations } = citeIncrement({
      increment: base({
        detail:
          'Change the caption string to "Consignment parties" in copy.en.js:42 and translate the Welsh pair.'
      }),
      profile,
      indexes
    })

    expect(citations[0].anchors).toEqual([])
  })

  test('takes no anchor from a sentence that denies a presence', () => {
    const { citations } = citeIncrement({
      increment: base({
        detail:
          'Nothing in layout.njk:17 identifies the page as a "GOV.UK service" in the tab.'
      }),
      profile,
      indexes
    })

    expect(citations[0].anchors).toEqual([])
  })

  test('still takes an anchor from a description opening with a word that can also be an instruction', () => {
    const { citations } = citeIncrement({
      increment: base({
        detail:
          'Move is the first action at copy.en.js:12, beside "Save and continue".'
      }),
      profile,
      indexes
    })

    expect(citations[0].anchors).toEqual(['Save and continue'])
  })

  test('refuses an anchor that has swallowed a path and a line number', () => {
    expect(
      isCheckableAnchor(
        ' to the answer and redirects to the select page (app/routes.js:10789-10801), and the view that asks '
      )
    ).toBe(false)
  })

  test('refuses an anchor that has swallowed a citation marker', () => {
    expect(isCheckableAnchor('the copy at [[c2]] says the same')).toBe(false)
  })

  test('keeps every range of a comma-joined citation', () => {
    const { citations } = citeIncrement({
      increment: base({ detail: 'routes.js:72, 85, 98 list the same six.' }),
      profile,
      indexes
    })
    expect(citations[0].ranges).toHaveLength(3)
    expect(citations[0].lines).toBeNull()
  })
})

describe('runCitations', () => {
  let dir
  let corpus

  // "vs" between a named citation and a bare ":62" is the corpus's own
  // shorthand for the other side, so the parser refuses to resolve it and
  // queues it — which is exactly the class of citation all 25 hand resolutions
  // in the DR1 backlog belong to.
  const QUEUED = 'app/views/dashboard.html:16-28 vs :62 on the other side.'

  const increment = (overrides = {}) => ({
    id: 'inc-001',
    type: 'add-field',
    milestone: 'M0',
    domain: 'dashboard',
    title: 't',
    detail: QUEUED,
    screens: [],
    evidence: {},
    confidence: 'medium',
    band: 'needs-design-decision',
    gate: 'sam',
    dependsOn: [],
    status: 'blocked',
    commit: null,
    failure_reason: null,
    ...overrides
  })

  const writeBacklog = (increments) =>
    writeFileSync(
      corpus.paths.backlog,
      JSON.stringify({ run_id: 'R', target: 't', increments })
    )

  const citationsOf = () =>
    readJsonFile(corpus.paths.backlog).increments[0].citations

  const resolveByHand = (ref) =>
    setCitation({
      profile: corpus,
      id: 'inc-001',
      ref,
      repo: 'prototype',
      path: 'app/views/other.html',
      lines: '62',
      why: 'Read the file: line 62 is the heading the sentence describes.'
    })

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tim-parity-citations-'))
    corpus = {
      ...profile,
      paths: {
        backlog: join(dir, 'backlog.json'),
        meta: join(dir, 'meta.json')
      }
    }
    writeFileSync(corpus.paths.meta, JSON.stringify({ pins: {} }))
    writeBacklog([increment()])
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  test('queues the ambiguous citation on the first run', () => {
    const result = runCitations({ profile: corpus, write: true })
    expect(result.byResolution).toEqual({ explicit: 1, unresolved: 1 })
    expect(result.unresolved).toHaveLength(1)
    expect(citationsOf()[1].resolution).toBe('unresolved')
  })

  test('a hand resolution survives the next regeneration', () => {
    runCitations({ profile: corpus, write: true })
    resolveByHand('c2')

    runCitations({ profile: corpus, write: true })

    expect(citationsOf()[1]).toMatchObject({
      ref: 'c2',
      repo: 'prototype',
      path: 'app/views/other.html',
      lines: { start: 62, end: 62 },
      resolution: 'human',
      needsHuman: false
    })
  })

  test('reports what it carried, and stops calling it queued', () => {
    runCitations({ profile: corpus, write: true })
    resolveByHand('c2')

    const result = runCitations({ profile: corpus, write: true })

    expect(result.carried).toEqual([
      {
        increment: 'inc-001',
        ref: 'c2',
        wasRef: 'c2',
        asWritten: ':62',
        field: 'detail',
        repo: 'prototype',
        path: 'app/views/other.html'
      }
    ])
    expect(result.byResolution).toEqual({ explicit: 1, human: 1 })
    expect(result.unresolved).toEqual([])
  })

  test('still says what the parser derives on its own, which is not what the backlog holds', () => {
    runCitations({ profile: corpus, write: true })
    resolveByHand('c2')

    const result = runCitations({ profile: corpus })

    expect(result.derived.byResolution).toEqual({ explicit: 1, unresolved: 1 })
    expect(result.byResolution).toEqual({ explicit: 1, human: 1 })
  })

  test('a dry run says what it would preserve and writes nothing', () => {
    runCitations({ profile: corpus, write: true })
    resolveByHand('c2')
    const before = citationsOf()

    const result = runCitations({ profile: corpus })

    expect(result.written).toBe(false)
    expect(result.carried).toHaveLength(1)
    expect(citationsOf()).toEqual(before)
  })

  test('re-derives an explicit citation from the prose every run', () => {
    runCitations({ profile: corpus, write: true })
    const moved = readJsonFile(corpus.paths.backlog)
    moved.increments[0].detail = QUEUED.replace(
      'app/views/dashboard.html',
      'app/views/moved-dashboard.html'
    )
    writeFileSync(corpus.paths.backlog, JSON.stringify(moved))

    runCitations({ profile: corpus, write: true })

    expect(citationsOf()[0].path).toBe('app/views/moved-dashboard.html')
  })

  test('a re-run over unchanged prose changes nothing', () => {
    runCitations({ profile: corpus, write: true })
    resolveByHand('c2')
    const first = runCitations({ profile: corpus, write: true })
    const after = citationsOf()

    const second = runCitations({ profile: corpus, write: true })

    expect(second.byResolution).toEqual(first.byResolution)
    expect(second.carried).toEqual(first.carried)
    expect(second.orphaned).toEqual([])
    expect(citationsOf()).toEqual(after)
  })

  test('keeps and names a hand resolution whose prose has gone', () => {
    runCitations({ profile: corpus, write: true })
    resolveByHand('c2')
    const edited = readJsonFile(corpus.paths.backlog)
    edited.increments[0].detail = 'app/views/dashboard.html:16-28 only.'
    writeFileSync(corpus.paths.backlog, JSON.stringify(edited))

    const result = runCitations({ profile: corpus, write: true })

    expect(result.orphaned).toEqual([
      {
        increment: 'inc-001',
        ref: 'c2',
        asWritten: ':62',
        field: 'detail',
        repo: 'prototype',
        path: 'app/views/other.html'
      }
    ])
    const kept = citationsOf()[1]
    expect(kept).toMatchObject({
      ref: 'c2',
      resolution: 'human',
      path: 'app/views/other.html',
      orphaned: true
    })
    expect(kept.orphanedBecause).toMatch(/":62" in detail any more/)
  })
})
