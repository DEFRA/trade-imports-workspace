import { describe, expect, test } from 'vitest'
import { combineCandidatesIn } from './combine-candidates.js'
import { backlogOf, row } from './__fixtures__/backlog-rows.js'

const candidatesOf = (...rows) =>
  combineCandidatesIn(backlogOf(...rows)).candidates

describe('#combineCandidatesIn', () => {
  test('Should give an empty list for a backlog with nothing to combine', () => {
    expect(
      combineCandidatesIn(
        backlogOf(
          row({ id: 'inc-001', touches: ['frontend:src/a'] }),
          row({ id: 'inc-002', touches: ['frontend:src/b'] })
        )
      )
    ).toEqual({ rowsToBuild: 2, withoutTouches: [], candidates: [] })
  })

  test('Should pair rows whose touches are nested in one repo, with the inner touch', () => {
    expect(
      candidatesOf(
        row({ id: 'inc-001', touches: ['frontend:src/server/origin'] }),
        row({ id: 'inc-002', touches: ['frontend:src/server/origin/page'] })
      )
    ).toEqual([
      {
        rows: ['inc-001', 'inc-002'],
        sharedTouches: ['frontend:src/server/origin/page'],
        waitingRow: null,
        reason: 'share frontend:src/server/origin/page'
      }
    ])
  })

  test('Should pair a row touching the whole repo with a row touching any path in it', () => {
    expect(
      candidatesOf(
        row({ id: 'inc-001', touches: ['tests:.'] }),
        row({ id: 'inc-002', touches: ['tests:tests/plants'] })
      ).map(({ sharedTouches }) => sharedTouches)
    ).toEqual([['tests:tests/plants']])
  })

  test('Should not pair the same path in two different repos, or a path that only starts alike', () => {
    expect(
      candidatesOf(
        row({ id: 'inc-001', touches: ['frontend:src/server/origin'] }),
        row({ id: 'inc-002', touches: ['backend:src/server/origin'] }),
        row({ id: 'inc-003', touches: ['frontend:src/server/origin-two'] })
      )
    ).toEqual([])
  })

  test('Should pair a row whose only pending dependency is the other row', () => {
    expect(
      candidatesOf(
        row({ id: 'inc-001' }),
        row({ id: 'inc-002', dependsOn: ['inc-001'] })
      )
    ).toEqual([
      {
        rows: ['inc-001', 'inc-002'],
        sharedTouches: [],
        waitingRow: 'inc-002',
        reason: 'inc-002 waits only on inc-001'
      }
    ])
  })

  test('Should pair a row listed first that waits only on a row listed after it', () => {
    expect(
      candidatesOf(
        row({ id: 'inc-001', dependsOn: ['inc-002'] }),
        row({ id: 'inc-002' })
      )
    ).toEqual([
      {
        rows: ['inc-001', 'inc-002'],
        sharedTouches: [],
        waitingRow: 'inc-001',
        reason: 'inc-001 waits only on inc-002'
      }
    ])
  })

  test('Should read a row with no dependsOn as waiting on nothing', () => {
    const rowWithNoDependsOn = Object.fromEntries(
      Object.entries(row({ id: 'inc-002' })).filter(
        ([field]) => field !== 'dependsOn'
      )
    )

    const candidates = candidatesOf(row({ id: 'inc-001' }), rowWithNoDependsOn)

    expect(candidates).toEqual([])
  })

  test('Should find no candidates in a backlog with no rows', () => {
    const result = combineCandidatesIn({})

    expect(result).toEqual({
      rowsToBuild: 0,
      withoutTouches: [],
      candidates: []
    })
  })

  test('Should leave out a dependency that is already done when judging what a row waits on', () => {
    expect(
      candidatesOf(
        row({ id: 'inc-001', status: 'done' }),
        row({ id: 'inc-002' }),
        row({ id: 'inc-003', dependsOn: ['inc-001', 'inc-002'] })
      ).map(({ rows }) => rows)
    ).toEqual([['inc-002', 'inc-003']])
  })

  test('Should not pair a row that also waits on a third row still to build', () => {
    expect(
      candidatesOf(
        row({ id: 'inc-001' }),
        row({ id: 'inc-002' }),
        row({ id: 'inc-003', dependsOn: ['inc-001', 'inc-002'] })
      )
    ).toEqual([])
  })

  test('Should not pair a row that waits on a row in another workarea', () => {
    expect(
      candidatesOf(
        row({ id: 'inc-001' }),
        row({
          id: 'inc-002',
          dependsOn: ['inc-001'],
          externalDependsOn: [{ workarea: 'shared/other', id: 'inc-009' }]
        })
      )
    ).toEqual([])
  })

  test('Should list both relations for a pair that shares code and waits', () => {
    expect(
      candidatesOf(
        row({ id: 'inc-001', touches: ['frontend:src/a'] }),
        row({
          id: 'inc-002',
          dependsOn: ['inc-001'],
          touches: ['frontend:src/a']
        })
      )
    ).toEqual([
      {
        rows: ['inc-001', 'inc-002'],
        sharedTouches: ['frontend:src/a'],
        waitingRow: 'inc-002',
        reason: 'share frontend:src/a; inc-002 waits only on inc-001'
      }
    ])
  })

  test.each(['done', 'blocked', 'merged-into'])(
    'Should never pair a %s row',
    (status) => {
      expect(
        candidatesOf(
          row({ id: 'inc-001', touches: ['frontend:src/a'] }),
          row({ id: 'inc-002', status, touches: ['frontend:src/a'] })
        )
      ).toEqual([])
    }
  )

  test('Should count the rows still to build and name those with no touches', () => {
    expect(
      combineCandidatesIn(
        backlogOf(
          row({ id: 'inc-001', touches: ['frontend:src/a'] }),
          row({ id: 'inc-002' }),
          row({ id: 'inc-003', status: 'done' })
        )
      )
    ).toMatchObject({ rowsToBuild: 2, withoutTouches: ['inc-002'] })
  })
})
