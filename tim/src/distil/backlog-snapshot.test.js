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
      changed: [],
      splitOffChanged: []
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
      changed: ['inc-001'],
      splitOffChanged: []
    })
  })

  describe('with a theme split off early', () => {
    const POINTER = {
      theme: 'smoke-gate',
      title: 'The smoke run gates pull requests',
      touches: ['tests:k6/smoke'],
      dependsOn: [],
      branch: 'feat/NO_JIRA-ins-performance-testing-smoke-gate',
      workarea: 'shared/demo/themes/smoke-gate',
      backlog: 'themes/smoke-gate/backlog.json',
      increments: ['inc-002'],
      requirements: ['req-002'],
      at: '2026-10-09T12:00:00.000Z'
    }

    const editPointer = (edit) =>
      workspace.editJson(workspace.layout.backlog, (backlog) => ({
        ...backlog,
        splitOff: backlog.splitOff.map(edit)
      }))

    const withSplitOff = () => {
      workspace = makeDistilWorkspace()
      workspace.editJson(workspace.layout.backlog, (backlog) => ({
        ...backlog,
        splitOff: [POINTER],
        increments: backlog.increments.slice(0, 1)
      }))
    }

    test('lists each theme split off, with the requirements it holds', () => {
      withSplitOff()

      expect(snapshot().splitOff).toEqual([
        {
          theme: 'smoke-gate',
          branch: POINTER.branch,
          workarea: POINTER.workarea,
          touches: POINTER.touches,
          requirements: ['req-002'],
          pickUp: []
        }
      ])
    })

    test('lets the consolidator add a requirement for the split branch to pick up', () => {
      withSplitOff()
      snapshot({ save: 'before' })
      editPointer((pointer) => ({ ...pointer, pickUp: ['req-006'] }))

      expect(
        snapshot({ compareTo: 'before' }).compared.splitOffChanged
      ).toEqual([])
    })

    test('names a pointer the consolidator changed or dropped', () => {
      withSplitOff()
      snapshot({ save: 'before' })
      editPointer((pointer) => ({ ...pointer, requirements: [] }))
      const changed = snapshot({ compareTo: 'before' }).compared
      workspace.editJson(
        workspace.layout.backlog,
        ({ splitOff, ...rest }) => rest
      )
      const dropped = snapshot({ compareTo: 'before' }).compared

      expect([changed.splitOffChanged, dropped.splitOffChanged]).toEqual([
        ['smoke-gate'],
        ['smoke-gate']
      ])
    })

    test('does not count a row that moved with a theme split off since as removed', () => {
      workspace = makeDistilWorkspace()
      snapshot({ save: 'before' })
      workspace.editJson(workspace.layout.backlog, (backlog) => ({
        ...backlog,
        splitOff: [POINTER],
        increments: backlog.increments.slice(0, 1)
      }))

      expect(snapshot({ compareTo: 'before' }).compared.removed).toEqual([])
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
