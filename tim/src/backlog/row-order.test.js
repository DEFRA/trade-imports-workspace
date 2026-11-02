import { describe, test, expect } from 'vitest'
import { insertRow, moveRow } from './row-order.js'

const backlogOf = (...ids) => ({
  programme: 'demo',
  increments: ids.map((id) => ({ id }))
})

const idsOf = (backlog) => backlog.increments.map((row) => row.id)

describe('#insertRow', () => {
  test('Should put the row at the end when given no place', () => {
    const rows = backlogOf('inc-001', 'inc-002').increments

    const result = insertRow(rows, { id: 'inc-003' }, {})

    expect(result.map((row) => row.id)).toEqual([
      'inc-001',
      'inc-002',
      'inc-003'
    ])
  })

  test('Should put the row straight after the named row', () => {
    const rows = backlogOf('inc-001', 'inc-002').increments

    const result = insertRow(rows, { id: 'inc-003' }, { after: 'inc-001' })

    expect(result.map((row) => row.id)).toEqual([
      'inc-001',
      'inc-003',
      'inc-002'
    ])
  })

  test('Should refuse both places', () => {
    const rows = backlogOf('inc-001', 'inc-002').increments

    expect(() =>
      insertRow(
        rows,
        { id: 'inc-003' },
        { before: 'inc-001', after: 'inc-002' }
      )
    ).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message: 'Give --before or --after, not both.'
      })
    )
  })
})

describe('#moveRow', () => {
  test('Should move a row straight before another, keeping the rest in order', () => {
    const backlog = backlogOf('inc-001', 'inc-002', 'inc-003', 'inc-004')

    const result = moveRow({ backlog, id: 'inc-004', before: 'inc-002' })

    expect(idsOf(result.backlog)).toEqual([
      'inc-001',
      'inc-004',
      'inc-002',
      'inc-003'
    ])
    expect([result.from, result.to]).toEqual([4, 2])
  })

  test('Should move a row straight after another further down', () => {
    const backlog = backlogOf('inc-001', 'inc-002', 'inc-003')

    const result = moveRow({ backlog, id: 'inc-001', after: 'inc-003' })

    expect(idsOf(result.backlog)).toEqual(['inc-002', 'inc-003', 'inc-001'])
    expect([result.from, result.to]).toEqual([1, 3])
  })

  test('Should report the same row number when the row is already there', () => {
    const backlog = backlogOf('inc-001', 'inc-002')

    const result = moveRow({ backlog, id: 'inc-001', before: 'inc-002' })

    expect(idsOf(result.backlog)).toEqual(['inc-001', 'inc-002'])
    expect([result.from, result.to]).toEqual([1, 1])
  })

  test('Should name a row that is not in the backlog', () => {
    const backlog = backlogOf('inc-001', 'inc-002')

    expect(() =>
      moveRow({ backlog, id: 'inc-001', before: 'inc-009' })
    ).toThrow(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: "Can't find inc-009 in the backlog."
      })
    )
  })

  test('Should refuse to move a row beside itself', () => {
    const backlog = backlogOf('inc-001', 'inc-002')

    expect(() => moveRow({ backlog, id: 'inc-001', after: 'inc-001' })).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message: "inc-001 can't move beside itself."
      })
    )
  })

  test('Should refuse a move with no place', () => {
    const backlog = backlogOf('inc-001', 'inc-002')

    expect(() => moveRow({ backlog, id: 'inc-001' })).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message: 'Give --before or --after.'
      })
    )
  })
})
