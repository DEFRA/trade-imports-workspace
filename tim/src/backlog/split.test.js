import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defaultBranchPrefix, planSplit, themeWorkareaOf } from './split.js'

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
