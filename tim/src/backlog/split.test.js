import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  defaultBranchPrefix,
  planRelink,
  planSplit,
  planSplitOff,
  themeWorkareaOf
} from './split.js'

const here = dirname(fileURLToPath(import.meta.url))

const WORKAREA = 'shared/hrp'
const PREFIX = 'feat/NO_JIRA-hrp-origin-and-commodity'

const themedBacklog = () =>
  JSON.parse(
    readFileSync(join(here, '__fixtures__', 'themed', 'backlog.json'), 'utf8')
  )

const nothingOnDisk = () => null

const plan = ({
  backlog = themedBacklog(),
  onDisk = {},
  previousIndex = null
} = {}) =>
  planSplit({
    backlog,
    workarea: WORKAREA,
    branchPrefix: PREFIX,
    readWorkareaBacklog: (workarea) => onDisk[workarea] ?? nothingOnDisk(),
    previousIndex
  })

const splitFor = (result, theme) =>
  result.splits.find((split) => split.theme === theme)

const rowOf = (backlog, id) => backlog.increments.find((row) => row.id === id)

const editRow = (backlog, id, edit) => ({
  ...backlog,
  increments: backlog.increments.map((row) => (row.id === id ? edit(row) : row))
})

describe('themeWorkareaOf and defaultBranchPrefix', () => {
  test("puts each theme under the parent workarea's themes folder", () => {
    expect(themeWorkareaOf(WORKAREA, 'origin')).toBe('shared/hrp/themes/origin')
  })

  test('names the branch after the programme, or the workarea when there is none', () => {
    expect([
      defaultBranchPrefix(themedBacklog(), WORKAREA),
      defaultBranchPrefix({ increments: [] }, WORKAREA)
    ]).toEqual([PREFIX, 'feat/NO_JIRA-hrp'])
  })
})

describe('planSplit', () => {
  test('writes one backlog per theme with the parent envelope and only its rows', () => {
    const origin = splitFor(plan(), 'origin').backlog
    const parent = themedBacklog()

    expect(origin).toEqual({
      programme: 'hrp-origin-and-commodity-origin',
      generatedFrom: parent.generatedFrom,
      invariants: parent.invariants,
      repos: parent.repos,
      theme: 'origin',
      branch: `${PREFIX}-origin`,
      parent: { workarea: WORKAREA, wave: 1, landsAfter: [] },
      touches: parent.themes[0].touches,
      increments: [parent.increments[0], parent.increments[1]]
    })
  })

  test("keeps only the repos the theme's rows build in", () => {
    const documents = splitFor(plan(), 'documents').backlog

    expect(Object.keys(documents.repos)).toEqual(['tests', 'frontend'])
  })

  test("turns a dependency on another theme's row into an externalDependsOn on that theme's workarea", () => {
    const commodity = splitFor(plan(), 'commodity').backlog

    expect([rowOf(commodity, 'inc-003'), rowOf(commodity, 'inc-004')]).toEqual([
      {
        ...rowOf(themedBacklog(), 'inc-003'),
        dependsOn: [],
        externalDependsOn: [
          { workarea: 'shared/hrp/themes/origin', id: 'inc-002' }
        ]
      },
      rowOf(themedBacklog(), 'inc-004')
    ])
  })

  test('turns a dependency on a row in no theme into an externalDependsOn on the parent', () => {
    const documents = splitFor(plan(), 'documents').backlog

    expect(rowOf(documents, 'inc-005').externalDependsOn).toEqual([
      { workarea: WORKAREA, id: 'inc-006' }
    ])
  })

  test('indexes the themes, their cross-theme dependencies and the landing order', () => {
    expect(plan().index).toEqual({
      programme: 'hrp-origin-and-commodity',
      workarea: WORKAREA,
      landingOrder: [
        { wave: 1, themes: ['origin', 'documents'] },
        { wave: 2, themes: ['commodity'] }
      ],
      themes: [
        {
          id: 'origin',
          title: 'Country of origin',
          workarea: 'shared/hrp/themes/origin',
          branch: `${PREFIX}-origin`,
          wave: 1,
          rows: 2,
          dependsOn: [],
          touches: themedBacklog().themes[0].touches
        },
        {
          id: 'commodity',
          title: 'Commodity details',
          workarea: 'shared/hrp/themes/commodity',
          branch: `${PREFIX}-commodity`,
          wave: 2,
          rows: 2,
          dependsOn: ['origin'],
          touches: themedBacklog().themes[1].touches
        },
        {
          id: 'documents',
          title: 'Accompanying documents',
          workarea: 'shared/hrp/themes/documents',
          branch: `${PREFIX}-documents`,
          wave: 1,
          rows: 1,
          dependsOn: [],
          touches: themedBacklog().themes[2].touches
        }
      ],
      crossThemeDependencies: [
        {
          from: {
            theme: 'commodity',
            id: 'inc-003',
            workarea: 'shared/hrp/themes/commodity'
          },
          to: {
            theme: 'origin',
            id: 'inc-002',
            workarea: 'shared/hrp/themes/origin'
          }
        },
        {
          from: {
            theme: 'documents',
            id: 'inc-005',
            workarea: 'shared/hrp/themes/documents'
          },
          to: { theme: null, id: 'inc-006', workarea: WORKAREA }
        }
      ],
      unthemed: ['inc-006']
    })
  })

  test('finds no problem on a first split', () => {
    expect(plan().problems).toEqual([])
  })

  describe('over a split already on disk', () => {
    const builtOrigin = () => {
      const origin = splitFor(plan(), 'origin').backlog
      return {
        ...origin,
        increments: origin.increments.map((row) =>
          row.id === 'inc-002'
            ? {
                ...row,
                status: 'done',
                commit: 'fed9876',
                notes: ['Built on the second attempt.']
              }
            : row
        )
      }
    }

    test('keeps a row the loop built exactly as the split copy has it', () => {
      const origin = builtOrigin()
      const parent = editRow(themedBacklog(), 'inc-002', (row) => ({
        ...row,
        title: 'Ask for the region, reworded by a re-distil'
      }))

      const result = plan({
        backlog: parent,
        onDisk: { 'shared/hrp/themes/origin': origin }
      })

      expect([
        rowOf(splitFor(result, 'origin').backlog, 'inc-002'),
        splitFor(result, 'origin').kept
      ]).toEqual([rowOf(origin, 'inc-002'), ['inc-001', 'inc-002']])
    })

    test('refreshes a todo row from the parent, keeping what the loop wrote on it', () => {
      const origin = splitFor(plan(), 'origin').backlog
      const started = {
        ...origin,
        increments: origin.increments.map((row) =>
          row.id === 'inc-002'
            ? {
                ...row,
                ticket: 'EUDPA-901',
                branch: 'feat/EUDPA-901',
                notes: ['ATTEMPT FAILED: ladder red']
              }
            : row
        )
      }
      const parent = editRow(themedBacklog(), 'inc-002', (row) => ({
        ...row,
        title: 'Ask for the region, reworded by a re-distil'
      }))

      const result = plan({
        backlog: parent,
        onDisk: { 'shared/hrp/themes/origin': started }
      })

      expect(rowOf(splitFor(result, 'origin').backlog, 'inc-002')).toEqual({
        ...rowOf(parent, 'inc-002'),
        ticket: 'EUDPA-901',
        branch: 'feat/EUDPA-901',
        notes: ['ATTEMPT FAILED: ladder red']
      })
    })

    test('refuses to move a built row to another theme', () => {
      const parent = editRow(themedBacklog(), 'inc-002', (row) => ({
        ...row,
        theme: 'commodity'
      }))

      const result = plan({
        backlog: parent,
        onDisk: { 'shared/hrp/themes/origin': builtOrigin() }
      })

      expect(result.problems).toEqual([
        'inc-002 is done in shared/hrp/themes/origin, but the backlog now puts it in theme "commodity". A row built or set aside keeps its theme: put it back in theme "origin".'
      ])
    })

    test('refuses to drop a theme whose split has built rows', () => {
      const parent = themedBacklog()
      parent.themes = parent.themes.filter((theme) => theme.id !== 'origin')
      parent.themes[0].dependsOn = []
      parent.increments = parent.increments.map(({ theme, ...row }) =>
        theme === 'origin' ? row : { ...row, theme }
      )

      const result = plan({
        backlog: parent,
        onDisk: { 'shared/hrp/themes/origin': builtOrigin() },
        previousIndex: plan().index
      })

      expect(result.problems).toEqual([
        'inc-001 is done in shared/hrp/themes/origin, but the backlog now puts it in no theme. A row built or set aside keeps its theme: put it back in theme "origin".',
        'inc-002 is done in shared/hrp/themes/origin, but the backlog now puts it in no theme. A row built or set aside keeps its theme: put it back in theme "origin".'
      ])
    })

    test('lists a todo row that left the theme as removed', () => {
      const origin = splitFor(plan(), 'origin').backlog
      const parent = editRow(themedBacklog(), 'inc-002', (row) => ({
        ...row,
        theme: 'commodity'
      }))

      const result = plan({
        backlog: parent,
        onDisk: { 'shared/hrp/themes/origin': origin }
      })

      expect([result.problems, splitFor(result, 'origin').removed]).toEqual([
        [],
        ['inc-002']
      ])
    })
  })
})

describe('planSplitOff', () => {
  const AT = '2026-10-09T12:00:00.000Z'

  const splitOff = ({
    backlog = themedBacklog(),
    themeIds = ['origin'],
    onDisk = {},
    previousIndex = null,
    fingerprints = null
  } = {}) =>
    planSplitOff({
      backlog,
      workarea: WORKAREA,
      themeIds,
      branchPrefix: PREFIX,
      readWorkareaBacklog: (workarea) => onDisk[workarea] ?? nothingOnDisk(),
      previousIndex,
      fingerprints,
      at: AT
    })

  const idsOf = (list) => list.map((entry) => entry.id)

  test("writes the theme's backlog exactly as the full split would", () => {
    expect(splitOff().splits[0].backlog).toEqual(
      splitFor(plan(), 'origin').backlog
    )
  })

  test('takes the theme and its rows out of the main backlog', () => {
    const { backlog } = splitOff()

    expect([idsOf(backlog.themes), idsOf(backlog.increments)]).toEqual([
      ['commodity', 'documents'],
      ['inc-003', 'inc-004', 'inc-005', 'inc-006']
    ])
  })

  test('leaves one pointer naming the theme, its branch and backlog, its rows and their requirements', () => {
    const origin = themedBacklog().themes[0]

    expect(
      splitOff({ fingerprints: { 'req-001': 'f1', 'req-009': 'f9' } }).backlog
        .splitOff
    ).toEqual([
      {
        theme: 'origin',
        title: origin.title,
        why: origin.why,
        touches: origin.touches,
        dependsOn: [],
        branch: `${PREFIX}-origin`,
        workarea: 'shared/hrp/themes/origin',
        backlog: 'themes/origin/backlog.json',
        increments: ['inc-001', 'inc-002'],
        requirements: ['req-001', 'req-002', 'req-003'],
        fingerprints: { 'req-001': 'f1' },
        at: AT
      }
    ])
  })

  test('lists a dropped row among the rows that moved, but not its requirements', () => {
    const backlog = editRow(themedBacklog(), 'inc-002', (row) => ({
      ...row,
      status: 'dropped'
    }))

    const [pointer] = splitOff({ backlog }).backlog.splitOff

    expect([pointer.increments, pointer.requirements]).toEqual([
      ['inc-001', 'inc-002'],
      ['req-001']
    ])
  })

  test('turns a dependency on a moved row into an externalDependsOn on its split backlog', () => {
    const result = splitOff()

    expect([rowOf(result.backlog, 'inc-003'), result.rewired.left]).toEqual([
      {
        ...rowOf(themedBacklog(), 'inc-003'),
        dependsOn: [],
        externalDependsOn: [
          { workarea: 'shared/hrp/themes/origin', id: 'inc-002' }
        ]
      },
      [
        {
          id: 'inc-003',
          dependsOn: 'inc-002',
          workarea: 'shared/hrp/themes/origin'
        }
      ]
    ])
  })

  test('points a moved row that waits on a row still in the main backlog at the main backlog', () => {
    const result = splitOff({ themeIds: ['commodity'] })

    expect([
      rowOf(result.splits[0].backlog, 'inc-003').externalDependsOn,
      result.rewired.moved
    ]).toEqual([
      [{ workarea: WORKAREA, id: 'inc-002' }],
      [{ id: 'inc-003', dependsOn: 'inc-002', workarea: WORKAREA }]
    ])
  })

  test('splits two themes off at once, pointing their rows at each other', () => {
    const result = splitOff({ themeIds: ['origin', 'commodity'] })

    expect([
      idsOf(result.backlog.themes),
      rowOf(result.splits[1].backlog, 'inc-003').externalDependsOn,
      result.rewired
    ]).toEqual([
      ['documents'],
      [{ workarea: 'shared/hrp/themes/origin', id: 'inc-002' }],
      {
        left: [],
        moved: [
          {
            id: 'inc-003',
            dependsOn: 'inc-002',
            workarea: 'shared/hrp/themes/origin'
          }
        ],
        relinked: []
      }
    ])
  })

  describe('after another theme was split off early', () => {
    const COMMODITY = 'shared/hrp/themes/commodity'
    const ORIGIN = 'shared/hrp/themes/origin'

    const commodityFirst = () => splitOff({ themeIds: ['commodity'] })

    const originNext = (first) =>
      splitOff({
        backlog: first.backlog,
        themeIds: ['origin'],
        onDisk: { [COMMODITY]: first.splits[0].backlog }
      })

    test('points the earlier theme at the new home of a row it waits on', () => {
      const result = originNext(commodityFirst())

      expect([
        result.relinkedSplits.map((split) => split.workarea),
        rowOf(result.relinkedSplits[0].backlog, 'inc-003').externalDependsOn,
        result.rewired.relinked
      ]).toEqual([
        [COMMODITY],
        [{ workarea: ORIGIN, id: 'inc-002' }],
        [{ id: 'inc-003', dependsOn: 'inc-002', workarea: ORIGIN }]
      ])
    })

    test('leaves the earlier theme alone when nothing it waits on moves', () => {
      const first = commodityFirst()

      const result = splitOff({
        backlog: first.backlog,
        themeIds: ['documents'],
        onDisk: { [COMMODITY]: first.splits[0].backlog }
      })

      expect([result.relinkedSplits, result.rewired.relinked]).toEqual([[], []])
    })
  })

  describe('planRelink', () => {
    const COMMODITY = 'shared/hrp/themes/commodity'
    const ORIGIN = 'shared/hrp/themes/origin'

    const bothSplitOff = () => {
      const first = planSplitOff({
        backlog: themedBacklog(),
        workarea: WORKAREA,
        themeIds: ['commodity'],
        branchPrefix: PREFIX,
        readWorkareaBacklog: nothingOnDisk,
        previousIndex: null,
        fingerprints: null,
        at: '2026-10-09T12:00:00.000Z'
      })
      const second = planSplitOff({
        backlog: first.backlog,
        workarea: WORKAREA,
        themeIds: ['origin'],
        branchPrefix: PREFIX,
        readWorkareaBacklog: nothingOnDisk,
        previousIndex: null,
        fingerprints: null,
        at: '2026-10-09T13:00:00.000Z'
      })
      return { parent: second.backlog, staleCommodity: first.splits[0].backlog }
    }

    test('repairs a wait left pointing at the parent by an earlier split', () => {
      const { parent, staleCommodity } = bothSplitOff()

      const relinks = planRelink({
        backlog: parent,
        workarea: WORKAREA,
        readWorkareaBacklog: (workarea) =>
          workarea === COMMODITY ? staleCommodity : null
      })

      expect(
        relinks.map(({ workarea, backlog, relinked }) => [
          workarea,
          rowOf(backlog, 'inc-003').externalDependsOn,
          relinked
        ])
      ).toEqual([
        [
          COMMODITY,
          [{ workarea: ORIGIN, id: 'inc-002' }],
          [{ id: 'inc-003', dependsOn: 'inc-002', workarea: ORIGIN }]
        ]
      ])
    })

    test('finds nothing to change once every wait points at its row', () => {
      const { parent, staleCommodity } = bothSplitOff()
      const [repaired] = planRelink({
        backlog: parent,
        workarea: WORKAREA,
        readWorkareaBacklog: (workarea) =>
          workarea === COMMODITY ? staleCommodity : null
      })

      expect(
        planRelink({
          backlog: parent,
          workarea: WORKAREA,
          readWorkareaBacklog: (workarea) =>
            workarea === COMMODITY ? repaired.backlog : null
        })
      ).toEqual([])
    })
  })

  test('keeps every other theme in the index, and marks the one split off', () => {
    const result = splitOff({ previousIndex: plan().index })

    expect(
      result.index.themes.map(({ id, splitOff: early }) => [id, early])
    ).toEqual([
      ['commodity', undefined],
      ['documents', undefined],
      ['origin', true]
    ])
  })

  test('refuses a theme already split off, naming its branch', () => {
    const { backlog } = splitOff()

    expect(() => splitOff({ backlog })).toThrow(
      'Theme "origin" is already split off, to feat/NO_JIRA-hrp-origin-and-commodity-origin. Its rows live in shared/hrp/themes/origin: build it there.'
    )
  })

  test('refuses a theme the backlog does not have', () => {
    expect(() => splitOff({ themeIds: ['payments'] })).toThrow(
      'The backlog has no theme "payments". Its themes are origin, commodity, documents.'
    )
  })

  describe('then the full split', () => {
    test('skips the theme already split off', () => {
      const { backlog } = splitOff()

      expect(plan({ backlog }).splits.map((split) => split.theme)).toEqual([
        'commodity',
        'documents'
      ])
    })

    test('keeps the theme split off in the index and the landing order', () => {
      const { backlog } = splitOff()

      const { index } = plan({ backlog })

      expect([
        index.landingOrder,
        index.themes.find((theme) => theme.id === 'origin')
      ]).toEqual([
        [
          { wave: 1, themes: ['documents', 'origin'] },
          { wave: 2, themes: ['commodity'] }
        ],
        {
          id: 'origin',
          title: 'Country of origin',
          workarea: 'shared/hrp/themes/origin',
          branch: `${PREFIX}-origin`,
          wave: 1,
          rows: 2,
          dependsOn: [],
          touches: themedBacklog().themes[0].touches,
          splitOff: true
        }
      ])
    })

    test('finds no problem with built rows in the theme split off', () => {
      const result = splitOff()
      const built = {
        ...result.splits[0].backlog,
        increments: result.splits[0].backlog.increments.map((row) => ({
          ...row,
          status: 'done'
        }))
      }

      expect(
        plan({
          backlog: result.backlog,
          onDisk: { 'shared/hrp/themes/origin': built },
          previousIndex: result.index
        }).problems
      ).toEqual([])
    })
  })
})
