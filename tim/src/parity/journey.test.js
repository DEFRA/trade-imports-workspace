import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { loadJourney, groupByJourney, declaresJourney } from './journey.js'
import { loadCorpusProfile } from './corpus-profile.js'
import { loadCorpus } from './load.js'

const journey = {
  side: 'frontend',
  screenPrefix: 'fe-',
  flowPath: 'src/flow.js',
  screenOfPage: {
    dashboard: 'fe-dashboard',
    origin: 'fe-origin',
    'import-reason': 'fe-import-reason',
    'import-reason-transit': 'fe-import-reason-transit',
    'accompanying-documents': 'fe-documents'
  },
  sectionLabels: { start: 'Start', consignment: 'Consignment' },
  screenLabels: { 'fe-cph-number': 'CPH number' }
}

const flow = {
  sections: [
    { id: 'start', pages: [{ id: 'dashboard' }] },
    { id: 'origin', pages: [{ id: 'origin' }] },
    {
      id: 'consignment',
      pages: [{ id: 'import-reason' }, { id: 'import-reason-transit' }]
    },
    { id: 'documents', pages: [{ id: 'accompanying-documents' }] }
  ]
}

const screens = [
  'fe-dashboard',
  'fe-origin',
  'fe-import-reason',
  'fe-import-reason-transit',
  'fe-documents',
  'fe-hub',
  'fe-address-picker-consignee'
]

let next = 0
const finding = (over = {}) => ({
  id: `inc-${String((next += 1)).padStart(3, '0')}`,
  type: 'add-field',
  title: 'A finding',
  gate: null,
  decision: null,
  screens: [],
  ...over
})

const group = (groups, id) => groups.find((entry) => entry.id === id)
const page = (groups, groupId, pageId) =>
  group(groups, groupId)?.pages.find((entry) => entry.id === pageId)
const everyItemId = (groups) =>
  groups.flatMap((entry) =>
    entry.pages.flatMap((p) => p.items.map((i) => i.id))
  )

describe('grouping findings by the journey the frontend defines', () => {
  test('orders the sections the way the flow does, not the way the backlog does', () => {
    const findings = [
      finding({ screens: ['fe-documents'] }),
      finding({ screens: ['fe-origin'] }),
      finding({ screens: ['fe-dashboard'] })
    ]

    const { groups } = groupByJourney({ findings, journey, flow, screens })

    expect(groups.map((entry) => entry.id)).toEqual([
      'journey-start',
      'journey-origin',
      'journey-documents'
    ])
  })

  test('takes each section heading from the corpus and derives the rest', () => {
    const findings = [
      finding({ screens: ['fe-dashboard'] }),
      finding({ screens: ['fe-origin'] })
    ]

    const { groups } = groupByJourney({ findings, journey, flow, screens })

    expect(groups.map((entry) => entry.title)).toEqual(['Start', 'Origin'])
  })

  test('takes each page heading from the corpus and derives the rest', () => {
    const labelled = {
      ...journey,
      screenLabels: { 'fe-documents': 'Accompanying documents' }
    }
    const findings = [
      finding({ screens: ['fe-import-reason'] }),
      finding({ screens: ['fe-documents'] })
    ]

    const { groups } = groupByJourney({
      findings,
      journey: labelled,
      flow,
      screens
    })

    expect(groups.flatMap((entry) => entry.pages.map((p) => p.title))).toEqual([
      'Import reason',
      'Accompanying documents'
    ])
  })

  test('a finding naming several screens appears once, under its earliest', () => {
    const findings = [
      finding({ id: 'inc-many', screens: ['fe-documents', 'fe-dashboard'] })
    ]

    const { groups } = groupByJourney({ findings, journey, flow, screens })

    expect(everyItemId(groups)).toEqual(['inc-many'])
    expect(
      page(groups, 'journey-start', 'page-fe-dashboard').items
    ).toHaveLength(1)
  })

  test('a journey page beats an off-journey one when a finding names both', () => {
    const findings = [
      finding({ id: 'inc-both', screens: ['fe-hub', 'fe-documents'] })
    ]

    const { groups } = groupByJourney({ findings, journey, flow, screens })

    expect(groups.map((entry) => entry.id)).toEqual(['journey-documents'])
  })

  test('a state screen is filed under the page it is a state of', () => {
    const findings = [
      finding({ id: 'inc-state', screens: ['fe-documents-error'] })
    ]

    const { groups } = groupByJourney({ findings, journey, flow, screens })

    expect(
      page(groups, 'journey-documents', 'page-fe-documents').items
    ).toEqual([findings[0]])
  })

  test('the longest matching page wins, so a state is not stolen by a shorter name', () => {
    const findings = [
      finding({ id: 'inc-long', screens: ['fe-import-reason-transit-error'] })
    ]

    const { groups } = groupByJourney({ findings, journey, flow, screens })

    expect(
      page(groups, 'journey-consignment', 'page-fe-import-reason-transit').items
    ).toEqual([findings[0]])
  })

  test('a screen id is matched whole, never split on every dash', () => {
    const findings = [
      finding({
        id: 'inc-picker',
        screens: ['fe-address-picker-consignee-no-matches']
      })
    ]

    const { groups } = groupByJourney({ findings, journey, flow, screens })

    expect(
      page(groups, 'beside-the-journey', 'page-fe-address-picker-consignee')
        .items
    ).toEqual([findings[0]])
  })

  test('a screen the flow never reaches sits beside the journey', () => {
    const findings = [finding({ id: 'inc-hub', screens: ['fe-hub'] })]

    const { groups } = groupByJourney({ findings, journey, flow, screens })

    expect(groups.map((entry) => entry.id)).toEqual(['beside-the-journey'])
    expect(group(groups, 'beside-the-journey').title).toBe('Beside the journey')
  })

  test('the pages beside the journey run in screen id order', () => {
    const findings = [
      finding({ screens: ['fe-hub'] }),
      finding({ screens: ['fe-address-picker-consignee'] })
    ]

    const { groups } = groupByJourney({ findings, journey, flow, screens })

    expect(group(groups, 'beside-the-journey').pages.map((p) => p.id)).toEqual([
      'page-fe-address-picker-consignee',
      'page-fe-hub'
    ])
  })

  test('the journey comes before what sits beside it', () => {
    const findings = [
      finding({ screens: ['fe-hub'] }),
      finding({ screens: ['fe-dashboard'] })
    ]

    const { groups } = groupByJourney({ findings, journey, flow, screens })

    expect(groups.map((entry) => entry.id)).toEqual([
      'journey-start',
      'beside-the-journey'
    ])
  })

  test('a finding naming only the other side has no screen to look at', () => {
    const findings = [finding({ id: 'inc-other', screens: ['dr1-dashboard'] })]

    const { groups } = groupByJourney({ findings, journey, flow, screens })

    expect(page(groups, 'beside-the-journey', 'page-no-screen')).toEqual({
      id: 'page-no-screen',
      screen: null,
      title: 'No screen to look at',
      items: [findings[0]]
    })
  })

  test('a finding naming no screen at all has no screen to look at', () => {
    const findings = [finding({ id: 'inc-none', screens: [] })]

    const { groups } = groupByJourney({ findings, journey, flow, screens })

    expect(everyItemId(groups)).toEqual(['inc-none'])
    expect(group(groups, 'beside-the-journey').pages.map((p) => p.id)).toEqual([
      'page-no-screen'
    ])
  })

  test('the page with no screen to look at comes last beside the journey', () => {
    const findings = [
      finding({ screens: [] }),
      finding({ screens: ['fe-hub'] })
    ]

    const { groups } = groupByJourney({ findings, journey, flow, screens })

    expect(group(groups, 'beside-the-journey').pages.map((p) => p.id)).toEqual([
      'page-fe-hub',
      'page-no-screen'
    ])
  })

  test('a page nothing was found about is left out', () => {
    const findings = [finding({ screens: ['fe-import-reason'] })]

    const { groups } = groupByJourney({ findings, journey, flow, screens })

    expect(group(groups, 'journey-consignment').pages.map((p) => p.id)).toEqual(
      ['page-fe-import-reason']
    )
  })

  test('a section whose pages are all empty is left out', () => {
    const findings = [finding({ screens: ['fe-dashboard'] })]

    const { groups } = groupByJourney({ findings, journey, flow, screens })

    expect(groups.map((entry) => entry.id)).toEqual(['journey-start'])
  })

  test('nothing found at all leaves no groups behind', () => {
    const { groups, warnings } = groupByJourney({
      findings: [],
      journey,
      flow,
      screens
    })

    expect(groups).toEqual([])
    expect(warnings).toEqual([])
  })

  test('a ruled finding keeps its page but sits below the live work', () => {
    const ruled = finding({
      id: 'inc-ruled',
      type: 'add-page',
      screens: ['fe-dashboard'],
      decision: { ruling: 'accepted' }
    })
    const live = finding({
      id: 'inc-live',
      type: 'copy-change',
      screens: ['fe-dashboard']
    })

    const { groups } = groupByJourney({
      findings: [ruled, live],
      journey,
      flow,
      screens
    })

    expect(
      page(groups, 'journey-start', 'page-fe-dashboard').items.map((i) => i.id)
    ).toEqual(['inc-live', 'inc-ruled'])
  })

  test('a gated finding still leads its page', () => {
    const gated = finding({
      id: 'inc-gated',
      type: 'copy-change',
      screens: ['fe-dashboard'],
      gate: 'needs a ruling'
    })
    const plain = finding({
      id: 'inc-plain',
      type: 'add-page',
      screens: ['fe-dashboard']
    })

    const { groups } = groupByJourney({
      findings: [plain, gated],
      journey,
      flow,
      screens
    })

    expect(
      page(groups, 'journey-start', 'page-fe-dashboard').items.map((i) => i.id)
    ).toEqual(['inc-gated', 'inc-plain'])
  })
})

describe('an enumerator that names states where another names pages', () => {
  // DR1 and DR1B share an enumerator that emits `fe-dashboard-empty` and
  // `fe-dashboard-populated` and never the bare `fe-dashboard` DR1C emits.
  // Both must group the same way.
  const stateful = [
    'fe-dashboard-empty',
    'fe-dashboard-populated',
    'fe-documents-empty',
    'fe-documents-populated',
    'fe-origin',
    'fe-import-reason',
    'fe-import-reason-transit',
    'fe-hub'
  ]

  test('a finding about a state lands on the page the flow names', () => {
    const findings = [
      finding({ id: 'inc-empty', screens: ['fe-dashboard-empty'] })
    ]

    const { groups } = groupByJourney({
      findings,
      journey,
      flow,
      screens: stateful
    })

    expect(page(groups, 'journey-start', 'page-fe-dashboard').items).toEqual([
      findings[0]
    ])
  })

  test('a finding about the page itself lands there too', () => {
    const findings = [finding({ id: 'inc-bare', screens: ['fe-dashboard'] })]

    const { groups } = groupByJourney({
      findings,
      journey,
      flow,
      screens: stateful
    })

    expect(page(groups, 'journey-start', 'page-fe-dashboard').items).toEqual([
      findings[0]
    ])
  })

  test('the states do not become pages of their own beside the journey', () => {
    const findings = [
      finding({ screens: ['fe-dashboard-empty'] }),
      finding({ screens: ['fe-documents-populated'] }),
      finding({ screens: ['fe-hub'] })
    ]

    const { groups } = groupByJourney({
      findings,
      journey,
      flow,
      screens: stateful
    })

    expect(group(groups, 'beside-the-journey').pages.map((p) => p.id)).toEqual([
      'page-fe-hub'
    ])
  })

  test('an enumerator that names only states raises no complaint', () => {
    const { warnings } = groupByJourney({
      findings: [finding({ screens: ['fe-dashboard-empty'] })],
      journey,
      flow,
      screens: stateful
    })

    expect(warnings).toEqual([])
  })
})

describe('warning when the journey and the corpus have drifted apart', () => {
  test('a flow page the corpus maps to no screen is named', () => {
    const gappy = {
      ...flow,
      sections: [
        ...flow.sections,
        { id: 'addresses', pages: [{ id: 'cphNumber' }] }
      ]
    }

    const { warnings } = groupByJourney({
      findings: [],
      journey,
      flow: gappy,
      screens
    })

    expect(warnings).toEqual([
      'The journey flow has a page called "cphNumber" that the corpus maps to no screen, so anything found about it will not appear under its section.'
    ])
  })

  test('a mapped screen no enumerated screen belongs to is named', () => {
    const ghost = {
      ...journey,
      screenOfPage: { ...journey.screenOfPage, origin: 'fe-place-of-origin' }
    }

    const { warnings } = groupByJourney({
      findings: [],
      journey: ghost,
      flow,
      screens
    })

    expect(warnings).toEqual([
      'The corpus files the journey page "origin" under the screen "fe-place-of-origin", but the enumerator names no screen that belongs to it, so the page stays empty.'
    ])
  })

  test('a finding naming a screen that matches no page is named', () => {
    const findings = [finding({ id: 'inc-ghost', screens: ['fe-ghost'] })]

    const { warnings } = groupByJourney({ findings, journey, flow, screens })

    expect(warnings).toEqual([
      'Finding inc-ghost names the screen "fe-ghost", which belongs to no page of this journey, so the finding sits beside the journey.'
    ])
  })

  test('each finding that hits the same drift says so for itself', () => {
    const findings = [
      finding({ id: 'inc-a', screens: ['fe-ghost'] }),
      finding({ id: 'inc-b', screens: ['fe-ghost'] })
    ]

    const { warnings } = groupByJourney({ findings, journey, flow, screens })

    expect(warnings).toHaveLength(2)
  })
})

describe('loading the journey a corpus declares', () => {
  let root

  const flowSource = `export const sections = [
  { id: 'start', pages: [{ id: 'dashboard', slug: 'dashboard' }] },
  { id: 'origin', pages: [{ id: 'origin', slug: 'origin' }] }
]
export const allFlowPages = sections.flatMap((s) => s.pages)
`

  const declaration = `module.exports = {
  side: 'frontend',
  flowPath: 'src/flow.js',
  screenOfPage: { dashboard: 'fe-dashboard', origin: 'fe-origin' },
  sectionLabels: { start: 'Start', origin: 'Origin' },
  screenLabels: {}
}`

  const writeCorpus = async ({ enumerator, withFlow = true }) => {
    const repo = join(root, 'repo')
    await mkdir(join(repo, 'src'), { recursive: true })
    await writeFile(
      join(repo, 'package.json'),
      JSON.stringify({ name: 'flow-fixture', type: 'module' })
    )
    if (withFlow) await writeFile(join(repo, 'src', 'flow.js'), flowSource)
    await writeFile(join(root, 'journey.cjs'), declaration)
    const modulePath = join(root, 'enumerate.cjs')
    await writeFile(modulePath, enumerator)
    const side = { id: 'frontend', repo: 'frontend', screenPrefix: 'fe-' }
    return {
      id: 'fixture',
      sides: [side],
      sideById: { frontend: side },
      repos: { frontend: { absolutePath: repo } },
      paths: { enumeratorModule: modulePath }
    }
  }

  const enumeratorNaming = (list) => `module.exports = {
  enumerators: {
    frontend: () => (${JSON.stringify(list)}).map((screen) => ({ screen, why: 'fixture' }))
  },
  journey: require('./journey.cjs')
}`

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'tim-parity-journey-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  test('reads the flow, the labels and the enumerated screens', async () => {
    const profile = await writeCorpus({
      enumerator: enumeratorNaming(['fe-dashboard', 'fe-origin', 'fe-hub'])
    })

    const loaded = await loadJourney({ profile })

    expect(loaded.journey.side).toBe('frontend')
    expect(loaded.journey.screenPrefix).toBe('fe-')
    expect(loaded.flow.sections.map((s) => s.id)).toEqual(['start', 'origin'])
    expect(loaded.screens).toEqual(['fe-dashboard', 'fe-origin', 'fe-hub'])
  })

  test('a corpus that declares no journey gets none', async () => {
    const profile = await writeCorpus({
      enumerator: 'module.exports = { enumerators: { frontend: () => [] } }'
    })

    expect(declaresJourney({ profile })).toBe(false)
    expect(await loadJourney({ profile })).toBeNull()
  })

  test('a corpus with no enumerator module at all gets none', async () => {
    const profile = { paths: { enumeratorModule: null } }

    expect(declaresJourney({ profile })).toBe(false)
    expect(await loadJourney({ profile })).toBeNull()
  })

  test('a missing flow file falls back rather than throwing', async () => {
    const profile = await writeCorpus({
      enumerator: enumeratorNaming(['fe-dashboard']),
      withFlow: false
    })

    expect(declaresJourney({ profile })).toBe(true)
    expect(await loadJourney({ profile })).toBeNull()
  })

  test('an enumerator that throws about a drifted checkout does not stop the report', async () => {
    const profile = await writeCorpus({
      enumerator: `module.exports = {
  enumerators: { frontend: () => { throw new Error('the checkout has drifted') } },
  journey: require('./journey.cjs')
}`
    })

    expect(await loadJourney({ profile })).toBeNull()
  })

  test('a journey naming a side this corpus does not have gets none', async () => {
    const profile = await writeCorpus({
      enumerator: enumeratorNaming(['fe-dashboard'])
    })
    profile.sideById = {}
    profile.sides = []

    expect(await loadJourney({ profile })).toBeNull()
  })
})

// The real corpus, if this machine has run the pipeline and has the frontend
// checked out. Both are gitignored, so a fresh clone skips this and stays
// green; Sam's machine catches a flow change the moment it happens.
const workspaceRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
)
const flowFile = join(
  workspaceRoot,
  'repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/flow/flow.js'
)
const present =
  existsSync(
    join(workspaceRoot, 'workareas/journey-builder/EUDPA-328-DR1C/backlog.json')
  ) && existsSync(flowFile)

describe.skipIf(!present)('the real DR1C corpus', () => {
  const profileFor = () =>
    loadCorpusProfile({ workspaceRoot, explicit: 'dr1c' })

  test('the live-animals journey loads with all ten of its sections', async () => {
    const loaded = await loadJourney({ profile: profileFor() })

    expect(loaded.flow.sections).toHaveLength(10)
    expect(Object.keys(loaded.journey.screenOfPage)).toHaveLength(23)
  })

  test('every finding is filed exactly once', async () => {
    const profile = profileFor()
    const loaded = await loadJourney({ profile })
    const { findings } = loadCorpus({ profile })

    const { groups } = groupByJourney({ findings, ...loaded })

    const filed = everyItemId(groups)
    expect(filed).toHaveLength(findings.length)
    expect(new Set(filed).size).toBe(findings.length)
  })

  test('every page of the flow is mapped to a screen the enumerator knows', async () => {
    const profile = profileFor()
    const loaded = await loadJourney({ profile })

    const { warnings } = groupByJourney({ findings: [], ...loaded })

    expect(warnings).toEqual([])
  })
})
