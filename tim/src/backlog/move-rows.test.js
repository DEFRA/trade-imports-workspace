import { describe, test, expect } from 'vitest'
import {
  defaultMovedBranch,
  indexWithMovedRows,
  planMoveRows
} from './move-rows.js'

const SOURCE = 'shared/hrp/themes/origin'
const TARGET = 'shared/hrp/themes/origin-b'

const row = (id, fields = {}) => ({
  id,
  title: `Row ${id}`,
  detail: 'What and why.',
  acceptanceCriteria: ['Something a user sees.'],
  dependsOn: [],
  status: 'todo',
  theme: 'origin',
  repos: ['frontend'],
  ...fields
})

const splitBacklog = (increments) => ({
  programme: 'hrp-origin',
  repos: {
    frontend: { path: 'repos/frontend', github: 'DEFRA/frontend' },
    backend: { path: 'repos/backend', github: 'DEFRA/backend' }
  },
  theme: 'origin',
  branch: 'feat/EUDPA-1-hrp-origin',
  parent: { workarea: 'shared/hrp', wave: 1, landsAfter: [] },
  touches: ['frontend:src/origin'],
  increments
})

const plan = ({ backlog, rowIds, toTheme = 'origin-b', others = {} }) =>
  planMoveRows({
    backlog,
    workarea: SOURCE,
    rowIds,
    toTheme,
    branch: 'feat/EUDPA-1-hrp-origin-b',
    readWorkareaBacklog: (workarea) => others[workarea] ?? null,
    otherWorkareas: Object.keys(others),
    at: '2026-10-21T10:00:00.000Z'
  })

describe('#defaultMovedBranch', () => {
  test('swaps the theme id at the end of the branch for the new one', () => {
    expect(
      defaultMovedBranch(
        { theme: 'origin', branch: 'feat/EUDPA-1-hrp-origin' },
        'origin-b'
      )
    ).toBe('feat/EUDPA-1-hrp-origin-b')
  })

  test('adds the new theme id to a branch that does not end in the old one', () => {
    expect(
      defaultMovedBranch(
        { theme: 'origin', branch: 'feat/EUDPA-1-pages' },
        'origin-b'
      )
    ).toBe('feat/EUDPA-1-pages-origin-b')
  })
})

describe('#planMoveRows', () => {
  test('keeps a dependency between two moved rows', () => {
    const result = plan({
      backlog: splitBacklog([
        row('inc-001'),
        row('inc-002', { dependsOn: ['inc-001'] })
      ]),
      rowIds: ['inc-001', 'inc-002']
    })

    expect(
      result.newBacklog.increments.map(({ id, dependsOn }) => [id, dependsOn])
    ).toEqual([
      ['inc-001', []],
      ['inc-002', ['inc-001']]
    ])
  })

  test('takes only the repos the moved rows use into the new envelope', () => {
    const result = plan({
      backlog: splitBacklog([
        row('inc-001'),
        row('inc-002', { repos: ['backend'] })
      ]),
      rowIds: ['inc-001']
    })

    expect(Object.keys(result.newBacklog.repos)).toEqual(['frontend'])
  })

  test('refuses a row the backlog does not have', () => {
    expect(() =>
      plan({ backlog: splitBacklog([row('inc-001')]), rowIds: ['inc-009'] })
    ).toThrow('The backlog has no inc-009, so nothing was moved.')
  })

  test("refuses the backlog's own theme", () => {
    expect(() =>
      plan({
        backlog: splitBacklog([row('inc-001')]),
        rowIds: ['inc-001'],
        toTheme: 'origin'
      })
    ).toThrow(
      `--to names this backlog's own theme, "origin". Give the new theme's id.`
    )
  })

  test('refuses a theme whose backlog moved no rows back here', () => {
    expect(() =>
      plan({
        backlog: splitBacklog([row('inc-001')]),
        rowIds: ['inc-001'],
        others: { [TARGET]: splitBacklog([]) }
      })
    ).toThrow(
      `${TARGET} already has a backlog, and moved no rows back to theme "origin". Give --to a theme id no backlog uses yet, or one that moved rows back here.`
    )
  })

  describe('into a theme that moved rows back here', () => {
    const emptiedBacklog = (movedBack) => ({
      ...splitBacklog([]),
      programme: 'hrp-origin-b',
      theme: 'origin-b',
      branch: 'feat/EUDPA-1-hrp-origin-b',
      movedBack,
      increments: []
    })

    const pointerBack = (increments) => ({
      theme: 'origin',
      workarea: SOURCE,
      backlog: '../origin/backlog.json',
      increments,
      at: '2026-10-20T10:00:00.000Z'
    })

    test('adds the rows and drops the movedBack pointer once it names none', () => {
      const result = plan({
        backlog: splitBacklog([row('inc-001'), row('inc-002')]),
        rowIds: ['inc-001', 'inc-002'],
        others: {
          [TARGET]: emptiedBacklog([pointerBack(['inc-001', 'inc-002'])])
        }
      })

      expect([
        result.reopened,
        result.newBacklog.programme,
        result.newBacklog.movedBack,
        result.newBacklog.increments.map(({ id, theme }) => [id, theme])
      ]).toEqual([
        true,
        'hrp-origin-b',
        undefined,
        [
          ['inc-001', 'origin-b'],
          ['inc-002', 'origin-b']
        ]
      ])
    })

    test('keeps the ids in the movedBack pointer that did not move again', () => {
      const result = plan({
        backlog: splitBacklog([row('inc-001'), row('inc-002')]),
        rowIds: ['inc-001'],
        others: {
          [TARGET]: emptiedBacklog([pointerBack(['inc-001', 'inc-003'])])
        }
      })

      expect(result.newBacklog.movedBack).toEqual([pointerBack(['inc-003'])])
    })

    test('refuses a branch other than the one that backlog builds on', () => {
      expect(() =>
        planMoveRows({
          backlog: splitBacklog([row('inc-001')]),
          workarea: SOURCE,
          rowIds: ['inc-001'],
          toTheme: 'origin-b',
          branch: 'feat/EUDPA-2-elsewhere',
          readWorkareaBacklog: () => emptiedBacklog([pointerBack(['inc-001'])]),
          otherWorkareas: [],
          at: '2026-10-21T10:00:00.000Z'
        })
      ).toThrow(
        `--branch names feat/EUDPA-2-elsewhere, but ${TARGET} builds on feat/EUDPA-1-hrp-origin-b. Leave --branch out to build there.`
      )
    })
  })
})

describe('#indexWithMovedRows', () => {
  test('points a cross-theme dependency on a moved row at its new theme and workarea', () => {
    const index = {
      landingOrder: [{ wave: 1, themes: ['origin'] }],
      themes: [{ id: 'origin', rows: 2 }],
      crossThemeDependencies: [
        {
          from: {
            theme: 'commodity',
            id: 'inc-005',
            workarea: 'shared/hrp/themes/commodity'
          },
          to: { theme: 'origin', id: 'inc-002', workarea: SOURCE }
        }
      ]
    }
    const newBacklog = {
      theme: 'origin-b',
      branch: 'feat/EUDPA-1-hrp-origin-b',
      parent: { workarea: 'shared/hrp', wave: 1, landsAfter: [] },
      increments: [row('inc-002', { theme: 'origin-b' })]
    }

    const result = indexWithMovedRows({
      index,
      fromTheme: 'origin',
      fromWorkarea: SOURCE,
      rowsLeft: 1,
      newBacklog,
      movedIds: ['inc-002'],
      title: 'Origin, second machine'
    })

    expect(result.crossThemeDependencies[0].to).toEqual({
      theme: 'origin-b',
      id: 'inc-002',
      workarea: TARGET
    })
  })

  test('reopens an emptied theme in place, back in the old one wave, keeping its title', () => {
    const index = {
      landingOrder: [{ wave: 1, themes: ['origin'] }],
      themes: [
        { id: 'origin', rows: 3 },
        {
          id: 'origin-b',
          title: 'Origin, laptop B',
          rows: 0,
          movedFrom: 'origin',
          movedBackTo: 'origin'
        }
      ],
      crossThemeDependencies: []
    }
    const newBacklog = {
      theme: 'origin-b',
      branch: 'feat/EUDPA-1-hrp-origin-b',
      parent: { workarea: 'shared/hrp', wave: 1, landsAfter: [] },
      increments: [row('inc-002', { theme: 'origin-b' })]
    }

    const result = indexWithMovedRows({
      index,
      fromTheme: 'origin',
      fromWorkarea: SOURCE,
      rowsLeft: 2,
      newBacklog,
      movedIds: ['inc-002']
    })

    expect([result.landingOrder, result.themes]).toEqual([
      [{ wave: 1, themes: ['origin', 'origin-b'] }],
      [
        { id: 'origin', rows: 2 },
        {
          id: 'origin-b',
          title: 'Origin, laptop B',
          workarea: TARGET,
          branch: 'feat/EUDPA-1-hrp-origin-b',
          wave: 1,
          rows: 1,
          dependsOn: [],
          movedFrom: 'origin'
        }
      ]
    ])
  })
})
