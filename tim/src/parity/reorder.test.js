import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { runReorder, formatOf, serialiseLike } from './reorder.js'
import { loadCorpusProfile } from './corpus-profile.js'

const flowSource = `export const sections = [
  { id: 'start', pages: [{ id: 'dashboard' }] },
  { id: 'origin', pages: [{ id: 'origin' }] },
  { id: 'consignment', pages: [{ id: 'import-reason' }, { id: 'import-reason-transit' }] },
  { id: 'documents', pages: [{ id: 'accompanying-documents' }] }
]
`

const declaration = {
  side: 'frontend',
  flowPath: 'src/flow.js',
  screenOfPage: {
    dashboard: 'fe-dashboard',
    origin: 'fe-origin',
    'import-reason': 'fe-import-reason',
    'import-reason-transit': 'fe-import-reason-transit',
    'accompanying-documents': 'fe-documents'
  },
  sectionLabels: {},
  screenLabels: {}
}

const enumerated = [
  'fe-dashboard',
  'fe-origin',
  'fe-import-reason',
  'fe-import-reason-transit',
  'fe-documents',
  'fe-hub',
  'fe-address-picker-consignee'
]

const increment = ({ id, screens = [], ...over }) => ({
  id,
  type: 'add-field',
  milestone: null,
  domain: 'consignment',
  title: `The finding called ${id}`,
  detail: `What ${id} says about the two sides.`,
  screens,
  evidence: {},
  confidence: 'high',
  band: 'frontend-only',
  gate: null,
  dependsOn: [],
  status: 'todo',
  commit: null,
  failure_reason: null,
  ...over
})

// Authoring order, which is the order the corpus was written in and the order
// the report does not use.
const scrambled = [
  increment({ id: 'inc-001', screens: ['fe-hub'] }),
  increment({ id: 'inc-002', screens: ['fe-documents'] }),
  increment({ id: 'inc-003', screens: ['fe-origin'], status: 'dropped' }),
  increment({ id: 'inc-004', screens: ['fe-dashboard'] }),
  increment({ id: 'inc-005', screens: ['fe-origin'], gate: 'design-decision' }),
  increment({ id: 'inc-006', screens: ['fe-address-picker-consignee'] }),
  increment({
    id: 'inc-007',
    screens: ['fe-origin'],
    decision: { ruling: 'accepted', note: 'Agreed at the walk.' }
  }),
  increment({ id: 'inc-008' }),
  increment({ id: 'inc-009', screens: ['fe-import-reason'] })
]

const REPORT_ORDER = [
  'inc-004',
  'inc-005',
  'inc-007',
  'inc-009',
  'inc-002',
  'inc-006',
  'inc-001',
  'inc-008',
  'inc-003'
]

const backlogOf = (increments) => ({
  run_id: 'FIXTURE-1',
  target: 'live-animals-frontend',
  corpus: 'fixture',
  increments
})

const asWritten = (backlog) => `${JSON.stringify(backlog, null, 2)}\n`

let root

const writeCorpus = async ({
  increments = scrambled,
  journey = declaration,
  screens = enumerated,
  withJourney = true,
  withFlow = true
} = {}) => {
  const repo = join(root, 'repo')
  await mkdir(join(repo, 'src'), { recursive: true })
  await writeFile(
    join(repo, 'package.json'),
    JSON.stringify({ name: 'flow-fixture', type: 'module' })
  )
  if (withFlow) await writeFile(join(repo, 'src', 'flow.js'), flowSource)
  await writeFile(
    join(root, 'journey.cjs'),
    `module.exports = ${JSON.stringify(journey, null, 2)}\n`
  )

  const modulePath = join(root, 'enumerate.cjs')
  await writeFile(
    modulePath,
    `module.exports = {
  enumerators: {
    frontend: () => (${JSON.stringify(screens)}).map((screen) => ({ screen, why: 'fixture' }))
  }${withJourney ? ",\n  journey: require('./journey.cjs')" : ''}
}
`
  )

  const backlog = join(root, 'backlog.json')
  await writeFile(backlog, asWritten(backlogOf(increments)))

  const side = { id: 'frontend', repo: 'frontend', screenPrefix: 'fe-' }
  return {
    id: 'fixture',
    runId: 'FIXTURE-1',
    sides: [side],
    sideById: { frontend: side },
    repos: { frontend: { absolutePath: repo } },
    paths: {
      backlog,
      enumeratorModule: modulePath,
      upstreamFindings: join(root, 'no-upstream.json'),
      evidence: join(root, 'no-evidence.json'),
      meta: join(root, 'no-meta.json'),
      deferred: join(root, 'no-deferred.json')
    }
  }
}

const idsOnDisk = (path) =>
  JSON.parse(readFileSync(path, 'utf8')).increments.map((entry) => entry.id)

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'tim-parity-reorder-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('putting the backlog in the order the report presents it', () => {
  test('files each increment where its finding sits when you read the report top to bottom', async () => {
    const profile = await writeCorpus()

    await runReorder({ profile })

    expect(idsOnDisk(profile.paths.backlog)).toEqual(REPORT_ORDER)
  })

  test('a ruled finding sinks to the foot of its own page, as it does on the page', async () => {
    const profile = await writeCorpus()

    const result = await runReorder({ profile })

    const origin = result.order.indexOf('inc-005')
    expect(result.order[origin + 1]).toBe('inc-007')
  })

  test('the pages beside the journey come last, in A to Z order', async () => {
    const profile = await writeCorpus()

    const result = await runReorder({ profile })

    expect(result.order.slice(5, 8)).toEqual(['inc-006', 'inc-001', 'inc-008'])
  })

  test('a withdrawn increment sinks below everything the report shows', async () => {
    const profile = await writeCorpus()

    const result = await runReorder({ profile })

    expect(result.order.at(-1)).toBe('inc-003')
    expect(result.notShown).toEqual(['inc-003'])
  })

  test('keeps the same increments, each one unchanged', async () => {
    const profile = await writeCorpus()
    const before = JSON.parse(await readFile(profile.paths.backlog, 'utf8'))

    await runReorder({ profile })

    const after = JSON.parse(await readFile(profile.paths.backlog, 'utf8'))
    const byId = new Map(after.increments.map((entry) => [entry.id, entry]))
    expect([...byId.keys()].sort()).toEqual(
      before.increments.map((entry) => entry.id).sort()
    )
    for (const original of before.increments) {
      expect(byId.get(original.id)).toEqual(original)
    }
  })

  test('leaves every other top-level key exactly as it found it', async () => {
    const profile = await writeCorpus()

    await runReorder({ profile })

    const after = JSON.parse(await readFile(profile.paths.backlog, 'utf8'))
    expect(Object.keys(after)).toEqual([
      'run_id',
      'target',
      'corpus',
      'increments'
    ])
    expect(after.run_id).toBe('FIXTURE-1')
    expect(after.target).toBe('live-animals-frontend')
    expect(after.corpus).toBe('fixture')
  })

  test('a backlog already in order comes back byte for byte identical', async () => {
    const inOrder = REPORT_ORDER.map((id) =>
      scrambled.find((entry) => entry.id === id)
    )
    const profile = await writeCorpus({ increments: inOrder })
    const before = await readFile(profile.paths.backlog, 'utf8')

    await runReorder({ profile })

    expect(await readFile(profile.paths.backlog, 'utf8')).toBe(before)
  })

  test('running it a second time writes the same bytes as the first', async () => {
    const profile = await writeCorpus()

    await runReorder({ profile })
    const once = await readFile(profile.paths.backlog, 'utf8')
    await runReorder({ profile })

    expect(await readFile(profile.paths.backlog, 'utf8')).toBe(once)
  })

  test('says how many increments moved and how many stayed', async () => {
    const profile = await writeCorpus()

    const result = await runReorder({ profile })

    expect(result.total).toBe(9)
    expect(result.moved + result.stayed).toBe(9)
    expect(result.moved).toBe(7)
    expect(result.stayed).toBe(2)
    expect(result.written).toBe(true)
  })

  test('carries through the warnings the grouping produced', async () => {
    const profile = await writeCorpus({
      journey: {
        ...declaration,
        screenOfPage: {
          ...declaration.screenOfPage,
          'import-reason': undefined
        }
      }
    })

    const result = await runReorder({ profile })

    expect(result.warnings).toEqual([
      expect.stringContaining('"import-reason"')
    ])
  })
})

describe('checking the backlog without writing to it', () => {
  test('asks for a non-zero exit while the backlog is out of order', async () => {
    const profile = await writeCorpus()
    const before = await readFile(profile.paths.backlog, 'utf8')

    const result = await runReorder({ profile, check: true })

    expect(result.exitNonZero).toBe(true)
    expect(result.inOrder).toBe(false)
    expect(result.written).toBe(false)
    expect(await readFile(profile.paths.backlog, 'utf8')).toBe(before)
  })

  test('is content when the backlog is already in order', async () => {
    const inOrder = REPORT_ORDER.map((id) =>
      scrambled.find((entry) => entry.id === id)
    )
    const profile = await writeCorpus({ increments: inOrder })

    const result = await runReorder({ profile, check: true })

    expect(result.exitNonZero).toBe(false)
    expect(result.inOrder).toBe(true)
    expect(result.moved).toBe(0)
  })
})

describe('a corpus with no journey to follow', () => {
  test('refuses a corpus that declares no journey', async () => {
    const profile = await writeCorpus({ withJourney: false })

    await expect(runReorder({ profile })).rejects.toMatchObject({
      code: 'USAGE',
      message: expect.stringContaining('declares no journey')
    })
  })

  test('refuses a corpus whose journey it cannot read', async () => {
    const profile = await writeCorpus({ withFlow: false })

    await expect(runReorder({ profile })).rejects.toMatchObject({
      code: 'USAGE',
      message: expect.stringContaining('cannot read it')
    })
  })

  test('writes nothing when it refuses', async () => {
    const profile = await writeCorpus({ withJourney: false })
    const before = await readFile(profile.paths.backlog, 'utf8')

    await expect(runReorder({ profile })).rejects.toThrow()

    expect(await readFile(profile.paths.backlog, 'utf8')).toBe(before)
  })
})

describe('reading the formatting off the file rather than assuming it', () => {
  test('reads a two-space indent and a trailing newline', () => {
    const text = '{\n  "a": 1\n}\n'

    expect(formatOf(text)).toEqual({ indent: '  ', trailingNewline: true })
  })

  test('reads a tab indent', () => {
    const text = '{\n\t"a": 1\n}'

    expect(formatOf(text)).toEqual({ indent: '\t', trailingNewline: false })
  })

  test('reads a file written on one line', () => {
    const text = '{"a":1}'

    expect(formatOf(text)).toEqual({ indent: '', trailingNewline: false })
  })

  test('writes a value back in the formatting it was read in', () => {
    const text = '{\n  "a": 1\n}\n'

    expect(serialiseLike(JSON.parse(text), formatOf(text))).toBe(text)
  })

  test('refuses to rewrite a file it cannot reproduce byte for byte', async () => {
    const profile = await writeCorpus()
    const text = await readFile(profile.paths.backlog, 'utf8')
    const overIndented = text.replace('{\n  "run_id"', '{\n      "run_id"')
    await writeFile(profile.paths.backlog, overIndented)

    await expect(runReorder({ profile })).rejects.toMatchObject({
      code: 'PARSE',
      message: expect.stringContaining('without reformatting')
    })
  })
})

// The real corpus, if this machine has run the pipeline. The workarea is
// gitignored, so a fresh clone skips this and stays green; Sam's machine
// proves the writer reproduces the canonical file exactly.
const workspaceRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
)
const realBacklog = join(
  workspaceRoot,
  'workareas/journey-builder/EUDPA-328-DR1C/backlog.json'
)

describe.skipIf(!existsSync(realBacklog))('the real DR1C backlog', () => {
  test('round-trips byte for byte through the writer', () => {
    const text = readFileSync(realBacklog, 'utf8')

    const written = serialiseLike(JSON.parse(text), formatOf(text))

    expect(written).toBe(text)
  })

  test('the corpus profile points at the file this test read', () => {
    const profile = loadCorpusProfile({ workspaceRoot, explicit: 'dr1c' })

    expect(profile.paths.backlog).toBe(realBacklog)
  })
})
