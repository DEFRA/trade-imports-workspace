import { describe, test, expect, afterEach } from 'vitest'
import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { checkDistil, distilStatus, sourcesProblems } from './checks.js'
import { scopeHashOf } from './files.js'
import { mergeExtractParts } from './merge-extract.js'
import {
  DEMO_WORKAREA,
  makeDistilWorkspace,
  splitExtractIntoParts
} from '../test-support/distil-workspace.js'

let workspace

afterEach(() => {
  workspace?.remove()
  workspace = undefined
})

const setUp = () => {
  workspace = makeDistilWorkspace()
  return workspace
}

const extractPath = (slug) => join(workspace.layout.extractDir, `${slug}.json`)
const verifyPath = (slug) => join(workspace.layout.verifyDir, `${slug}.json`)

const status = () =>
  distilStatus({
    layout: workspace.layout,
    schemas: workspace.schemas,
    workarea: DEMO_WORKAREA
  })

const sourceStatus = (id) => status().sources.find((source) => source.id === id)

const check = (options) =>
  checkDistil({
    layout: workspace.layout,
    schemas: workspace.schemas,
    workarea: DEMO_WORKAREA,
    stage: 'all',
    ...options
  })

const problemsOf = (run) => {
  try {
    run()
  } catch (error) {
    return error.message.split('\n').slice(1)
  }
  throw new Error('Expected the check to refuse, and it passed.')
}

const editClaim = (slug, id, edit) =>
  workspace.editJson(extractPath(slug), (extract) => ({
    ...extract,
    claims: extract.claims.map((claim) =>
      claim.id === id ? edit(claim) : claim
    )
  }))

describe('sourcesProblems', () => {
  const demoSources = () => setUp().readJson(workspace.layout.sources)

  test('finds nothing wrong with the demo sources', () => {
    const sources = demoSources()

    expect(sourcesProblems(sources, workspace.schemas.sources)).toEqual([])
  })

  test('refuses a kind the extract briefs do not cover', () => {
    const sources = demoSources()
    sources.sources[0].kind = 'podcast'

    expect(sourcesProblems(sources, workspace.schemas.sources)).toEqual([
      'sources.json sources[ruling:sam-2026-09-29c].kind is "podcast". Use one of: repo, confluence, web, document, trace, ruling, image.'
    ])
  })

  test('holds precedence to exactly the sources', () => {
    const sources = demoSources()
    sources.precedence = ['repo:tests', 'confluence:6608160092', 'web:gone']

    expect(sourcesProblems(sources, workspace.schemas.sources)).toEqual([
      'sources.json precedence names web:gone, which is not a source.',
      'sources.json precedence does not rank ruling:sam-2026-09-29c.'
    ])
  })

  test('needs a repo source for every repo it builds in', () => {
    const sources = demoSources()
    sources.repos.frontend = 'repos/trade-imports-plants-frontend'

    expect(sourcesProblems(sources, workspace.schemas.sources)).toEqual([
      'sources.json repos names frontend, but no source is repo:frontend. The target repo is always a source.'
    ])
  })

  test('refuses two sources whose files would share a slug', () => {
    const sources = demoSources()
    const clash = (id) => ({ ...sources.sources[2], id })
    sources.sources.push(clash('web:k6_docs'), clash('web:k6-docs'))
    sources.precedence.push('web:k6_docs', 'web:k6-docs')

    expect(sourcesProblems(sources, workspace.schemas.sources)).toEqual([
      'sources.json: web:k6_docs and web:k6-docs share the file slug web-k6-docs. Rename one.'
    ])
  })

  test('accepts a rule for grouping the backlog into themes', () => {
    const sources = demoSources()
    sources.themes =
      'Group increments by the code each touches, so themes build in parallel without conflicting pull requests.'

    expect(sourcesProblems(sources, workspace.schemas.sources)).toEqual([])
  })

  test('refuses a themes rule that is blank', () => {
    const sources = demoSources()
    sources.themes = '  '

    expect(sourcesProblems(sources, workspace.schemas.sources)).toEqual([
      'sources.json themes is empty.'
    ])
  })

  test('refuses a source named twice', () => {
    const sources = demoSources()
    sources.sources.push(sources.sources[1])

    expect(sourcesProblems(sources, workspace.schemas.sources)).toEqual([
      'sources.json names repo:tests more than once.'
    ])
  })
})

describe('distilStatus', () => {
  test('finds every demo source verified, with no work left', () => {
    setUp()

    const result = status()

    expect(result).toMatchObject({
      workarea: DEMO_WORKAREA,
      path: workspace.workareaDir,
      counts: { pending: 0, extracted: 0, verified: 3, stale: 0, invalid: 0 },
      work: [],
      orphans: []
    })
  })

  test('reports a verified source in full', () => {
    setUp()

    expect(sourceStatus('repo:tests')).toEqual({
      id: 'repo:tests',
      kind: 'repo',
      slug: 'repo-tests',
      scopeHash: workspace.readJson(extractPath('repo-tests')).scopeHash,
      state: 'verified',
      next: null,
      reason: 'Extracted and verified.',
      extract: {
        path: extractPath('repo-tests'),
        exists: true,
        valid: true,
        problems: [],
        claims: 4,
        scopeHash: workspace.readJson(extractPath('repo-tests')).scopeHash
      },
      verify: {
        path: verifyPath('repo-tests'),
        exists: true,
        valid: true,
        parity: true,
        problems: [],
        extractHash: 'current',
        verdicts: 4,
        held: 3,
        refuted: 1,
        missed: 1,
        parts: []
      }
    })
  })

  test('marks a source with no extract pending, to extract', () => {
    setUp()
    rmSync(extractPath('repo-tests'))
    rmSync(verifyPath('repo-tests'))

    expect(status().work).toEqual([
      {
        id: 'repo:tests',
        slug: 'repo-tests',
        kind: 'repo',
        state: 'pending',
        next: 'extract'
      }
    ])
  })

  test('marks a source with an extract and no verification extracted, to verify', () => {
    setUp()
    rmSync(verifyPath('repo-tests'))

    expect(sourceStatus('repo:tests')).toMatchObject({
      state: 'extracted',
      next: 'verify',
      reason: 'No verification yet.'
    })
  })

  test('says when verify parts wait to be merged', () => {
    setUp()
    rmSync(verifyPath('repo-tests'))
    writeFileSync(
      join(workspace.layout.verifyDir, 'repo-tests.part1.json'),
      '{}'
    )

    expect(sourceStatus('repo:tests').reason).toBe(
      'No verification yet, and 1 verify part to merge.'
    )
  })

  test('marks a source stale when its scope changed after extraction', () => {
    setUp()
    workspace.editJson(workspace.layout.sources, (sources) => ({
      ...sources,
      sources: sources.sources.map((source) =>
        source.id === 'repo:tests'
          ? { ...source, scope: 'the k6 specs' }
          : source
      )
    }))

    expect(sourceStatus('repo:tests')).toMatchObject({
      state: 'stale',
      next: 'extract',
      reason:
        "The source's kind, locator or scope changed after it was extracted."
    })
  })

  test('marks an extract that records no scope hash stale', () => {
    setUp()
    workspace.editJson(
      extractPath('repo-tests'),
      ({ scopeHash, ...extract }) => extract
    )

    expect(sourceStatus('repo:tests')).toMatchObject({
      state: 'stale',
      reason: 'The extract records no scope hash.'
    })
  })

  test('marks an extract that puts gap in kind invalid, to extract again', () => {
    setUp()
    editClaim('confluence-6608160092', 'dr5-004', (claim) => ({
      ...claim,
      kind: 'gap'
    }))

    expect(sourceStatus('confluence:6608160092')).toMatchObject({
      state: 'invalid',
      next: 'extract',
      reason: 'The extract has 1 problem.',
      extract: {
        valid: false,
        problems: [
          'distil/extract/confluence-6608160092.json claims[dr5-004].kind is "gap". Use one of: data, behaviour, rule, copy, integration, constraint, non-functional.'
        ]
      }
    })
  })

  test('marks a verification that misses a claim invalid, to verify again', () => {
    setUp()
    workspace.editJson(verifyPath('repo-tests'), (verify) => ({
      ...verify,
      verdicts: verify.verdicts.filter((verdict) => verdict.id !== 'tests-005')
    }))

    expect(sourceStatus('repo:tests')).toMatchObject({
      state: 'invalid',
      next: 'verify',
      verify: {
        valid: false,
        parity: false,
        problems: [
          'distil/verify/repo-tests.json has no verdict for 1 claim: tests-005.'
        ]
      }
    })
  })

  test('marks a source stale, to verify again, when a claim changed under the same id after verification', () => {
    setUp()
    editClaim('ruling-sam-2026-09-29c', 'sam3-001', (claim) => ({
      ...claim,
      statement: 'The performance-testing tool is JMeter.'
    }))

    expect(sourceStatus('ruling:sam-2026-09-29c')).toMatchObject({
      state: 'stale',
      next: 'verify',
      reason: 'The extract changed after it was verified.',
      verify: { valid: true, parity: true, extractHash: 'changed' }
    })
  })

  test('marks a verification that records no extract hash stale, to verify again', () => {
    setUp()
    workspace.editJson(
      verifyPath('repo-tests'),
      ({ extractHash, ...verify }) => verify
    )

    expect(sourceStatus('repo:tests')).toMatchObject({
      state: 'stale',
      next: 'verify',
      reason:
        'The verification records no extract hash, so nothing shows it judged this extract.'
    })
  })

  test('names files that belong to no source', () => {
    setUp()
    writeFileSync(join(workspace.layout.extractDir, 'web-gone.json'), '{}')

    expect(status().orphans).toEqual([
      join(workspace.layout.extractDir, 'web-gone.json')
    ])
  })

  test('refuses a sources.json out of shape, naming every problem', () => {
    setUp()
    workspace.editJson(
      workspace.layout.sources,
      ({ goal, ...sources }) => sources
    )

    expect(status).toThrow(
      `1 problem in ${workspace.layout.sources}:\nsources.json has no "goal".`
    )
  })
})

describe('checkDistil', () => {
  test('passes the demo workarea, with one verify range per source', () => {
    setUp()

    const result = check({ sourceId: 'repo:tests' })

    expect(result).toEqual({
      stage: 'all',
      sources: [
        {
          id: 'repo:tests',
          slug: 'repo-tests',
          state: 'verified',
          claims: 4,
          chunks: [
            {
              part: 1,
              from: 'tests-001',
              to: 'tests-010',
              count: 4,
              path: join(workspace.layout.verifyDir, 'repo-tests.part1.json')
            }
          ],
          verify: { verdicts: 4, held: 3, refuted: 1, missed: 1 }
        }
      ]
    })
  })

  test('splits an extract into verify ranges of at most --chunk claims', () => {
    setUp()

    const [source] = check({
      sourceId: 'repo:tests',
      stage: 'extract',
      chunk: 3
    }).sources

    expect(
      source.chunks.map(({ part, from, to, count }) => ({
        part,
        from,
        to,
        count
      }))
    ).toEqual([
      { part: 1, from: 'tests-001', to: 'tests-005', count: 3 },
      { part: 2, from: 'tests-010', to: 'tests-010', count: 1 }
    ])
  })

  test('gives an extract with no claims one range, for what was missed', () => {
    setUp()
    workspace.editJson(extractPath('ruling-sam-2026-09-29c'), (extract) => ({
      ...extract,
      claims: []
    }))

    const [source] = check({
      sourceId: 'ruling:sam-2026-09-29c',
      stage: 'extract'
    }).sources

    expect(source.chunks).toEqual([
      {
        part: 1,
        from: null,
        to: null,
        count: 0,
        path: join(
          workspace.layout.verifyDir,
          'ruling-sam-2026-09-29c.part1.json'
        )
      }
    ])
  })

  test('tells the extractor to stamp an extract with no scope hash', () => {
    setUp()
    workspace.editJson(
      extractPath('repo-tests'),
      ({ scopeHash, ...extract }) => extract
    )

    expect(
      problemsOf(() => check({ sourceId: 'repo:tests', stage: 'extract' }))
    ).toEqual([
      `distil/extract/repo-tests.json records no scope hash. Once the extract is done, run: tim distil stamp ${DEMO_WORKAREA} --source repo:tests`
    ])
  })

  test('says an extract is out of date when its scope changed', () => {
    setUp()
    const recorded = workspace.readJson(extractPath('repo-tests')).scopeHash
    workspace.editJson(workspace.layout.sources, (sources) => ({
      ...sources,
      sources: sources.sources.map((source) =>
        source.id === 'repo:tests'
          ? { ...source, locator: 'repos/elsewhere' }
          : source
      )
    }))
    const now = scopeHashOf({
      ...workspace.readJson(workspace.layout.sources).sources[1]
    })

    expect(
      problemsOf(() => check({ sourceId: 'repo:tests', stage: 'extract' }))
    ).toEqual([
      `distil/extract/repo-tests.json was extracted for scope hash ${recorded.slice(0, 12)}, but repo:tests's kind, locator or scope has changed since (now ${now.slice(0, 12)}). Extract it again.`
    ])
  })

  test('refuses a claim id another source already uses', () => {
    setUp()
    editClaim('repo-tests', 'tests-002', (claim) => ({
      ...claim,
      id: 'dr5-018'
    }))

    expect(
      problemsOf(() => check({ sourceId: 'repo:tests', stage: 'extract' }))
    ).toEqual([
      "distil/extract/repo-tests.json claim dr5-018 is also in confluence:6608160092's extract. Claim ids must be unique across the workarea, so give this source a prefix of its own."
    ])
  })

  test('refuses an extract claim id kept for missed claims', () => {
    setUp()
    editClaim('repo-tests', 'tests-002', (claim) => ({
      ...claim,
      id: 'tests-002-m1'
    }))

    expect(
      problemsOf(() => check({ sourceId: 'repo:tests', stage: 'extract' }))
    ).toEqual([
      'distil/extract/repo-tests.json claim tests-002-m1 ends in -m<N>, which is kept for claims a verifier finds missing. Renumber it.'
    ])
  })

  test('refuses an empty quote on a claim that is not a gap', () => {
    setUp()
    editClaim('repo-tests', 'tests-002', (claim) => ({ ...claim, quote: ' ' }))

    expect(
      problemsOf(() => check({ sourceId: 'repo:tests', stage: 'extract' }))
    ).toEqual([
      'distil/extract/repo-tests.json claim tests-002 is verbatim but its quote is empty. Only a gap may leave the quote empty.'
    ])
  })

  test('refuses an extract that names another source', () => {
    setUp()
    workspace.editJson(extractPath('repo-tests'), (extract) => ({
      ...extract,
      source: 'repo:stub'
    }))

    expect(
      problemsOf(() => check({ sourceId: 'repo:tests', stage: 'extract' }))
    ).toEqual([
      'distil/extract/repo-tests.json says it is from "repo:stub", not repo:tests.'
    ])
  })

  test('points at merge-verify when only verify parts exist', () => {
    setUp()
    rmSync(verifyPath('repo-tests'))
    writeFileSync(
      join(workspace.layout.verifyDir, 'repo-tests.part1.json'),
      '{}'
    )

    expect(
      problemsOf(() => check({ sourceId: 'repo:tests', stage: 'verify' }))
    ).toEqual([
      `distil/verify/repo-tests.json does not exist yet. Merge its 1 part file first: tim distil merge-verify ${DEMO_WORKAREA} --source repo:tests`
    ])
  })

  test('refuses a verdict twice, a verdict on no claim, and a missed id after no claim', () => {
    setUp()
    workspace.editJson(verifyPath('repo-tests'), (verify) => ({
      ...verify,
      verdicts: [
        ...verify.verdicts,
        verify.verdicts[0],
        { id: 'tests-099', holds: true, reason: 'Made up.' }
      ],
      missed: [{ ...verify.missed[0], id: 'tests-099-m1' }]
    }))

    expect(
      problemsOf(() => check({ sourceId: 'repo:tests', stage: 'verify' }))
    ).toEqual([
      'distil/verify/repo-tests.json gives tests-001 more than one verdict.',
      'distil/verify/repo-tests.json gives a verdict on tests-099, which is not a claim in the extract.',
      'distil/verify/repo-tests.json missed claim tests-099-m1 must be named <claim id>-m<N> after a claim in the extract, such as tests-001-m1.'
    ])
  })

  test('refuses a verification of an earlier extract, whose claims changed under the same ids', () => {
    setUp()
    editClaim('ruling-sam-2026-09-29c', 'sam3-001', (claim) => ({
      ...claim,
      statement: 'The performance-testing tool is JMeter.'
    }))

    expect(
      problemsOf(() =>
        check({ sourceId: 'ruling:sam-2026-09-29c', stage: 'verify' })
      )
    ).toEqual([
      'distil/verify/ruling-sam-2026-09-29c.json judged an earlier extract: the claims changed after it was verified. Verify it again.'
    ])
  })

  test('clears the verify part files once the extract checks out, and lists them', () => {
    setUp()
    const stale = join(workspace.layout.verifyDir, 'repo-tests.part3.json')
    writeFileSync(stale, '{}')

    const result = check({
      sourceId: 'repo:tests',
      stage: 'extract',
      clearParts: true
    })

    expect(result.removedParts).toEqual([stale])
    expect(existsSync(stale)).toBe(false)
  })

  test('keeps the verify part files when the extract does not check out', () => {
    setUp()
    const part = join(workspace.layout.verifyDir, 'repo-tests.part1.json')
    writeFileSync(part, '{}')
    editClaim('repo-tests', 'tests-002', (claim) => ({ ...claim, kind: 'gap' }))

    problemsOf(() =>
      check({ sourceId: 'repo:tests', stage: 'extract', clearParts: true })
    )

    expect(existsSync(part)).toBe(true)
  })

  test('checks the verification only once the extract is in shape', () => {
    setUp()
    editClaim('repo-tests', 'tests-002', (claim) => ({ ...claim, kind: 'gap' }))

    expect(
      problemsOf(() => check({ sourceId: 'repo:tests', stage: 'verify' }))
    ).toEqual([
      `distil/extract/repo-tests.json is missing or out of shape, so distil/verify/repo-tests.json cannot be checked against it. Run: tim distil check ${DEMO_WORKAREA} --source repo:tests --stage extract`
    ])
  })

  test('names a source that is not in sources.json', () => {
    setUp()

    expect(() => check({ sourceId: 'repo:gone' })).toThrow(
      `Can't find source repo:gone in ${workspace.layout.sources}.`
    )
  })

  test('refuses an unknown stage', () => {
    setUp()

    expect(() => check({ stage: 'reconcile' })).toThrow(
      '--stage must be one of: partition, extract, verify, all.'
    )
  })
})

describe('checkDistil over a source extracted in parts', () => {
  const setUpParts = () => {
    setUp()
    return splitExtractIntoParts(workspace)
  }

  const mergeParts = () =>
    mergeExtractParts({
      layout: workspace.layout,
      schemas: workspace.schemas,
      workarea: DEMO_WORKAREA,
      sourceId: 'repo:tests'
    })

  test('passes the partition stage and lists each part with its prefix and file', () => {
    const { partPath, whole } = setUpParts()

    expect(
      check({ sourceId: 'repo:tests', stage: 'partition' }).sources
    ).toEqual([
      {
        id: 'repo:tests',
        slug: 'repo-tests',
        structure: whole.structure,
        parts: [
          {
            part: 1,
            title: 'Suite layout and config',
            prefix: 'repo-tests-p1',
            path: partPath(1)
          },
          {
            part: 2,
            title: 'Fixtures',
            prefix: 'repo-tests-p2',
            path: partPath(2)
          }
        ]
      }
    ])
  })

  test('says the partition does not exist yet, at the partition stage', () => {
    setUp()

    expect(
      problemsOf(() => check({ sourceId: 'repo:tests', stage: 'partition' }))
    ).toEqual([
      'distil/extract/repo-tests.partition.json does not exist yet. The characterise step writes it, before any part is extracted.'
    ])
  })

  test('clears old extract part files once the partition checks out', () => {
    const { partPath } = setUpParts()

    const result = check({
      sourceId: 'repo:tests',
      stage: 'partition',
      clearParts: true
    })

    expect(result.removedParts).toEqual([partPath(1), partPath(2)])
    expect(existsSync(partPath(1))).toBe(false)
  })

  test('checks one part on its own, before the others are written', () => {
    const { partPath } = setUpParts()
    rmSync(partPath(2))

    expect(
      check({ sourceId: 'repo:tests', stage: 'extract', part: 1 })
    ).toEqual({
      stage: 'extract',
      part: 1,
      sources: [
        {
          id: 'repo:tests',
          slug: 'repo-tests',
          parts: [
            {
              part: 1,
              title: 'Suite layout and config',
              claims: 3,
              from: 'tests-001',
              to: 'tests-005'
            }
          ]
        }
      ]
    })
  })

  test('names a part the partition does not have', () => {
    setUpParts()

    expect(
      problemsOf(() =>
        check({ sourceId: 'repo:tests', stage: 'extract', part: 3 })
      )
    ).toEqual([
      'distil/extract/repo-tests.partition.json has no part 3. Its parts are 1 to 2.'
    ])
  })

  test('refuses --part at any stage but extract', () => {
    setUpParts()

    expect(() =>
      check({ sourceId: 'repo:tests', stage: 'verify', part: 1 })
    ).toThrow(
      '--part goes with --stage extract: it checks one extract part file.'
    )
  })

  test('points at merge-extract when the parts are written and the extract is not', () => {
    setUpParts()

    expect(
      problemsOf(() => check({ sourceId: 'repo:tests', stage: 'extract' }))
    ).toEqual([
      `distil/extract/repo-tests.json does not exist yet. Merge its parts: tim distil merge-extract ${DEMO_WORKAREA} --source repo:tests`
    ])
  })

  test('names every part with no file, at the extract stage', () => {
    const { partPath } = setUpParts()
    rmSync(partPath(1))

    expect(
      problemsOf(() => check({ sourceId: 'repo:tests', stage: 'extract' }))
    ).toEqual([
      'distil/extract/repo-tests.json does not exist yet.',
      'distil/extract/repo-tests.part1.json does not exist yet: part 1 (Suite layout and config) has no extract.'
    ])
  })

  test('gives the merged extract its verify ranges and each part its range', () => {
    setUpParts()
    mergeParts()

    const [source] = check({
      sourceId: 'repo:tests',
      stage: 'extract',
      chunk: 2
    }).sources

    expect({
      parts: source.parts.map(({ part, claims }) => ({ part, claims })),
      chunks: source.chunks.map(({ from, to }) => [from, to])
    }).toEqual({
      parts: [
        { part: 1, claims: 3 },
        { part: 2, claims: 1 }
      ],
      chunks: [
        ['tests-001', 'tests-002'],
        ['tests-005', 'tests-010']
      ]
    })
  })

  test('says the extract is no longer its parts merged when a part changed after the merge', () => {
    const { partPath } = setUpParts()
    mergeParts()
    workspace.editJson(partPath(2), (part) => ({
      ...part,
      claims: [{ ...part.claims[0], statement: 'Used everywhere.' }]
    }))

    expect(
      problemsOf(() => check({ sourceId: 'repo:tests', stage: 'extract' }))
    ).toEqual([
      `distil/extract/repo-tests.json is not its parts merged: a part changed after the merge, or the extract was written by hand. Run: tim distil merge-extract ${DEMO_WORKAREA} --source repo:tests`
    ])
  })

  test('says how many parts are written while a source waits to be merged', () => {
    const { partPath } = setUpParts()
    rmSync(partPath(2))

    expect(sourceStatus('repo:tests').reason).toBe(
      'No extract yet. Its partition has 2 parts, and 1 part file is written.'
    )
  })

  test('counts the partition as the source it belongs to, never an orphan', () => {
    setUpParts()

    expect(status().orphans).toEqual([])
  })
})
