import { describe, test, expect } from 'vitest'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadBacklogSchema } from './backlog-schema.js'
import { addRow } from './add-row.js'

const here = dirname(fileURLToPath(import.meta.url))

const schema = loadBacklogSchema(join(here, '..', '..', '..'))

const row = (overrides = {}) => ({
  id: 'inc-001',
  title: 'Show the notification list',
  detail:
    'An importer sees their own notifications, so they can pick one up again.',
  acceptanceCriteria: [
    'The list shows only notifications the signed-in user created.'
  ],
  dependsOn: [],
  status: 'todo',
  ...overrides
})

const backlogOf = (...rows) => ({ programme: 'demo', increments: rows })

const idsOf = (backlog) => backlog.increments.map((candidate) => candidate.id)

describe('#addRow', () => {
  test('Should add a row in shape straight after the named row', () => {
    const backlog = backlogOf(row(), row({ id: 'inc-002' }))

    const result = addRow({
      backlog,
      row: row({ id: 'inc-003' }),
      after: 'inc-001',
      schema
    })

    expect(idsOf(result.backlog)).toEqual(['inc-001', 'inc-003', 'inc-002'])
    expect(result.position).toBe(2)
  })

  test('Should add a row at the end when given no place', () => {
    const backlog = backlogOf(row())

    const result = addRow({ backlog, row: row({ id: 'inc-002' }), schema })

    expect(idsOf(result.backlog)).toEqual(['inc-001', 'inc-002'])
  })

  test('Should refuse a row with an id the backlog already has', () => {
    const backlog = backlogOf(row())

    expect(() => addRow({ backlog, row: row(), schema })).toThrow(
      expect.objectContaining({
        code: 'LINT',
        message:
          'Adding inc-001 would put the backlog out of shape:\ninc-001 appears more than once.'
      })
    )
  })

  test('Should refuse a row that depends on a row not in the backlog', () => {
    const backlog = backlogOf(row())

    expect(() =>
      addRow({
        backlog,
        row: row({ id: 'inc-002', dependsOn: ['inc-009'] }),
        schema
      })
    ).toThrow(
      expect.objectContaining({
        code: 'LINT',
        message:
          'Adding inc-002 would put the backlog out of shape:\ninc-002 depends on "inc-009", which is not in the backlog.'
      })
    )
  })

  test('Should add a row in shape to a backlog that already had a problem', () => {
    const backlog = backlogOf(row({ dependsOn: ['inc-009'] }))

    const result = addRow({ backlog, row: row({ id: 'inc-002' }), schema })

    expect(idsOf(result.backlog)).toEqual(['inc-001', 'inc-002'])
  })

  test('Should refuse a row file that does not hold an object', () => {
    const backlog = backlogOf(row())

    expect(() => addRow({ backlog, row: [row()], schema })).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message: 'The row file must hold one JSON object: the row to add.'
      })
    )
  })
})
