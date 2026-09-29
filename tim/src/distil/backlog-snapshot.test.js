import { describe, test, expect, afterEach } from 'vitest'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { snapshotBacklog } from './backlog-snapshot.js'
import { makeDistilWorkspace } from '../test-support/distil-workspace.js'

let workspace

afterEach(() => {
  workspace?.remove()
  workspace = undefined
})

const snapshot = (options = {}) =>
  snapshotBacklog({ layout: workspace.layout, ...options })

const editIncrement = (id, edit) =>
  workspace.editJson(workspace.layout.backlog, (backlog) => ({
    ...backlog,
    increments: backlog.increments.map((increment) =>
      increment.id === id ? edit(increment) : increment
    )
  }))

/** The demo backlog with inc-001 built, as a re-distil would find it. */
const withDoneRow = () => {
  workspace = makeDistilWorkspace()
  editIncrement('inc-001', (increment) => ({ ...increment, status: 'done' }))
}

describe('snapshotBacklog', () => {
  test('lists every row id and the rows that are not todo', () => {
    withDoneRow()

    expect(snapshot()).toMatchObject({
      path: workspace.layout.backlog,
      rows: 2,
      rowIds: ['inc-001', 'inc-002'],
      frozen: ['inc-001'],
      frozenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      saved: null,
      compared: null
    })
  })

  test('keeps a snapshot under a tag', () => {
    withDoneRow()

    expect(snapshot({ save: 'before' }).saved).toBe(
      join(workspace.workareaDir, 'distil', 'backlog-snapshot.before.json')
    )
  })

  test('finds nothing changed when the consolidator only edits todo rows and adds new ones', () => {
    withDoneRow()
    snapshot({ save: 'before' })
    editIncrement('inc-002', (increment) => ({
      ...increment,
      title: 'A new title'
    }))
    workspace.editJson(workspace.layout.backlog, (backlog) => ({
      ...backlog,
      increments: [
        ...backlog.increments,
        { ...backlog.increments[1], id: 'inc-003', status: 'todo' }
      ]
    }))

    expect(snapshot({ compareTo: 'before' }).compared).toEqual({
      tag: 'before',
      removed: [],
      changed: []
    })
  })

  test('lets a later ruling rewrite a blocked row, which has no code behind it', () => {
    workspace = makeDistilWorkspace()
    editIncrement('inc-002', (increment) => ({
      ...increment,
      status: 'blocked',
      openQuestions: ['c-002']
    }))
    snapshot({ save: 'before' })
    editIncrement('inc-002', (increment) => ({
      ...increment,
      status: 'todo',
      detail: 'Rewritten to the later ruling.'
    }))

    expect(snapshot({ compareTo: 'before' })).toMatchObject({
      frozen: [],
      compared: { removed: [], changed: [] }
    })
  })

  test('names a row that is not todo and changed, and a row removed', () => {
    withDoneRow()
    snapshot({ save: 'before' })
    editIncrement('inc-001', (increment) => ({
      ...increment,
      title: 'Reworded'
    }))
    workspace.editJson(workspace.layout.backlog, (backlog) => ({
      ...backlog,
      increments: backlog.increments.filter(
        (increment) => increment.id !== 'inc-002'
      )
    }))

    expect(snapshot({ compareTo: 'before' }).compared).toEqual({
      tag: 'before',
      removed: ['inc-002'],
      changed: ['inc-001']
    })
  })

  test('sees a key order change as no change', () => {
    withDoneRow()
    snapshot({ save: 'before' })
    editIncrement('inc-001', ({ id, ...rest }) => ({ ...rest, id }))

    expect(snapshot({ compareTo: 'before' }).compared.changed).toEqual([])
  })

  test('asks for a snapshot to be taken before one is compared with', () => {
    withDoneRow()

    expect(() => snapshot({ compareTo: 'before' })).toThrow(
      'No backlog snapshot tagged before. Take one first with --save before.'
    )
  })

  test('names a workarea with no backlog.json', () => {
    workspace = makeDistilWorkspace()
    rmSync(workspace.layout.backlog)

    expect(() => snapshot()).toThrow(`Can't find ${workspace.layout.backlog}.`)
  })
})
