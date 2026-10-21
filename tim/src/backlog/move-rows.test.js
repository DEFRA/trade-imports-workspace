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

  test('refuses a theme whose workarea already has a backlog', () => {
    expect(() =>
      plan({
        backlog: splitBacklog([row('inc-001')]),
        rowIds: ['inc-001'],
        others: { [TARGET]: splitBacklog([]) }
      })
    ).toThrow(
      `${TARGET} already has a backlog. Give --to a theme id no backlog uses yet.`
    )
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
      title: 'Origin, second machine'
    })

    expect(result.crossThemeDependencies[0].to).toEqual({
      theme: 'origin-b',
      id: 'inc-002',
      workarea: TARGET
    })
  })
})
