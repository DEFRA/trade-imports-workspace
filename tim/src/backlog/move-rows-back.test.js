import { describe, test, expect } from 'vitest'
import { indexWithRowsMovedBack, planMoveRowsBack } from './move-rows-back.js'

const HOME = 'shared/hrp/themes/origin'
const AWAY = 'shared/hrp/themes/origin-b'
const OTHER = 'shared/hrp/themes/commodity'

const row = (id, fields = {}) => ({
  id,
  title: `Row ${id}`,
  detail: 'What and why.',
  acceptanceCriteria: ['Something a user sees.'],
  dependsOn: [],
  status: 'todo',
  repos: ['frontend'],
  ...fields
})

const envelope = (theme, increments, extra = {}) => ({
  programme: `hrp-${theme}`,
  theme,
  branch: `feat/EUDPA-1-hrp-${theme}`,
  parent: { workarea: 'shared/hrp', wave: 1, landsAfter: [] },
  ...extra,
  increments
})

const pointer = (increments, requirements = []) => ({
  theme: 'origin-b',
  branch: 'feat/EUDPA-1-hrp-origin-b',
  workarea: AWAY,
  backlog: '../origin-b/backlog.json',
  increments,
  requirements,
  at: '2026-10-21T10:00:00.000Z'
})

const plan = ({ home, away, others = {}, rowIds, fromTheme = 'origin-b' }) =>
  planMoveRowsBack({
    backlog: home,
    workarea: HOME,
    rowIds,
    fromTheme,
    readWorkareaBacklog: (workarea) =>
      ({ [AWAY]: away, ...others })[workarea] ?? null,
    otherWorkareas: [HOME, AWAY, ...Object.keys(others)],
    at: '2026-10-22T09:00:00.000Z'
  })

describe('#planMoveRowsBack', () => {
  test('brings a row back with every field it had, in the home theme', () => {
    const away = envelope('origin-b', [
      row('inc-002', {
        theme: 'origin-b',
        notes: ['ATTEMPT FAILED: ladder red'],
        requirements: ['req-002']
      })
    ])
    const home = envelope('origin', [row('inc-001')], {
      movedOut: [pointer(['inc-002'], ['req-002'])]
    })

    const result = plan({ home, away, rowIds: ['inc-002'] })

    expect(result.backlog.increments.at(-1)).toEqual(
      row('inc-002', {
        theme: 'origin',
        notes: ['ATTEMPT FAILED: ladder red'],
        requirements: ['req-002']
      })
    )
  })

  test('places a returning row before the first home row that waits for it', () => {
    const away = envelope('origin-b', [row('inc-002', { theme: 'origin-b' })])
    const home = envelope(
      'origin',
      [
        row('inc-001'),
        row('inc-003', {
          externalDependsOn: [{ workarea: AWAY, id: 'inc-002' }]
        }),
        row('inc-004')
      ],
      { movedOut: [pointer(['inc-002'])] }
    )

    const result = plan({ home, away, rowIds: ['inc-002'] })

    expect(
      result.backlog.increments.map(({ id, dependsOn }) => [id, dependsOn])
    ).toEqual([
      ['inc-001', []],
      ['inc-002', []],
      ['inc-003', ['inc-002']],
      ['inc-004', []]
    ])
  })

  test("turns a returning row's wait on a home row back into a dependsOn", () => {
    const away = envelope('origin-b', [
      row('inc-002', {
        theme: 'origin-b',
        externalDependsOn: [
          { workarea: HOME, id: 'inc-001' },
          { workarea: OTHER, id: 'inc-009' }
        ]
      })
    ])
    const home = envelope('origin', [row('inc-001')], {
      movedOut: [pointer(['inc-002'])]
    })

    const result = plan({ home, away, rowIds: ['inc-002'] })
    const returned = result.backlog.increments.find(
      (candidate) => candidate.id === 'inc-002'
    )

    expect([returned.dependsOn, returned.externalDependsOn]).toEqual([
      ['inc-001'],
      [{ workarea: OTHER, id: 'inc-009' }]
    ])
  })

  test('drops the movedOut pointer, and movedOut itself, once every row is back', () => {
    const away = envelope('origin-b', [row('inc-002', { theme: 'origin-b' })])
    const home = envelope('origin', [row('inc-001')], {
      movedOut: [pointer(['inc-002'])]
    })

    const result = plan({ home, away, rowIds: ['inc-002'] })

    expect(Object.hasOwn(result.backlog, 'movedOut')).toBe(false)
  })

  test('leaves a pointer in the backlog the rows leave', () => {
    const away = envelope('origin-b', [row('inc-002', { theme: 'origin-b' })])
    const home = envelope('origin', [row('inc-001')], {
      movedOut: [pointer(['inc-002'])]
    })

    const result = plan({ home, away, rowIds: ['inc-002'] })

    expect([
      result.sourceBacklog.increments,
      result.sourceBacklog.movedBack
    ]).toEqual([
      [],
      [
        {
          theme: 'origin',
          workarea: HOME,
          backlog: '../origin/backlog.json',
          increments: ['inc-002'],
          at: '2026-10-22T09:00:00.000Z'
        }
      ]
    ])
  })

  test('points another backlog that waits for a returning row at the home workarea', () => {
    const away = envelope('origin-b', [row('inc-002', { theme: 'origin-b' })])
    const home = envelope('origin', [row('inc-001')], {
      movedOut: [pointer(['inc-002'])]
    })
    const other = envelope('commodity', [
      row('inc-005', { externalDependsOn: [{ workarea: AWAY, id: 'inc-002' }] })
    ])

    const result = plan({
      home,
      away,
      others: { [OTHER]: other },
      rowIds: ['inc-002']
    })

    expect(result.relinks[0].backlog.increments[0].externalDependsOn).toEqual([
      { workarea: HOME, id: 'inc-002' }
    ])
  })

  test('refuses a theme the backlog moved no rows to', () => {
    const home = envelope('origin', [row('inc-001')])

    expect(() =>
      plan({ home, away: envelope('origin-b', []), rowIds: ['inc-002'] })
    ).toThrow(
      'This backlog moved no rows to theme "origin-b", so there are none to move back. Its "movedOut" names no theme.'
    )
  })

  test('refuses a theme whose backlog is not there', () => {
    const home = envelope('origin', [row('inc-001')], {
      movedOut: [pointer(['inc-002'])]
    })

    expect(() => plan({ home, away: null, rowIds: ['inc-002'] })).toThrow(
      `${AWAY} has no backlog.json, so nothing was moved back.`
    )
  })
})

describe('#indexWithRowsMovedBack', () => {
  test('points a cross-theme dependency on a returning row back at its home', () => {
    const index = {
      landingOrder: [{ wave: 1, themes: ['origin', 'origin-b'] }],
      themes: [
        { id: 'origin', rows: 1 },
        { id: 'origin-b', rows: 1, movedFrom: 'origin' }
      ],
      crossThemeDependencies: [
        {
          from: { theme: 'commodity', id: 'inc-005', workarea: OTHER },
          to: { theme: 'origin-b', id: 'inc-002', workarea: AWAY }
        }
      ]
    }

    const result = indexWithRowsMovedBack({
      index,
      home: { theme: 'origin', workarea: HOME, rows: 2 },
      source: { theme: 'origin-b', workarea: AWAY, rows: 0 },
      rowIds: ['inc-002']
    })

    expect(result.crossThemeDependencies[0].to).toEqual({
      theme: 'origin',
      id: 'inc-002',
      workarea: HOME
    })
  })

  test('keeps a theme with rows left in the landing order', () => {
    const index = {
      landingOrder: [{ wave: 1, themes: ['origin', 'origin-b'] }],
      themes: [
        { id: 'origin', rows: 1 },
        { id: 'origin-b', rows: 2, movedFrom: 'origin' }
      ]
    }

    const result = indexWithRowsMovedBack({
      index,
      home: { theme: 'origin', workarea: HOME, rows: 2 },
      source: { theme: 'origin-b', workarea: AWAY, rows: 1 },
      rowIds: ['inc-002']
    })

    expect([result.landingOrder, result.themes]).toEqual([
      [{ wave: 1, themes: ['origin', 'origin-b'] }],
      [
        { id: 'origin', rows: 2 },
        { id: 'origin-b', rows: 1, movedFrom: 'origin' }
      ]
    ])
  })
})
