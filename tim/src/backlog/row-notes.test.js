import { describe, test, expect } from 'vitest'
import { editNotes, notesOf } from './row-notes.js'

const backlogWithNotes = (notes) => ({
  programme: 'demo',
  increments: [{ id: 'inc-001', notes }, { id: 'inc-002' }]
})

describe('#notesOf', () => {
  test('Should list a row that keeps one note as text', () => {
    const backlog = backlogWithNotes('Only note')

    expect(notesOf(backlog, 'inc-001')).toEqual(['Only note'])
  })

  test('Should list a row with no notes as empty', () => {
    const backlog = backlogWithNotes(['First'])

    expect(notesOf(backlog, 'inc-002')).toEqual([])
  })
})

describe('#editNotes', () => {
  test('Should replace and remove notes by their number before the edit', () => {
    const backlog = backlogWithNotes(['First', 'Second', 'Third', 'Fourth'])

    const result = editNotes({
      backlog,
      id: 'inc-001',
      remove: [2],
      replace: { 3: 'Third, trimmed' }
    })

    expect(result.backlog.increments[0].notes).toEqual([
      'First',
      'Third, trimmed',
      'Fourth'
    ])
    expect(result.changes).toEqual([
      { position: 2, before: 'Second', after: null },
      { position: 3, before: 'Third', after: 'Third, trimmed' }
    ])
  })

  test('Should leave every other row as it was', () => {
    const backlog = backlogWithNotes(['First', 'Second'])

    const result = editNotes({ backlog, id: 'inc-001', remove: [1] })

    expect(result.backlog.increments[1]).toEqual({ id: 'inc-002' })
  })

  test('Should report no change when a note is replaced with its own text', () => {
    const backlog = backlogWithNotes(['First'])

    const result = editNotes({
      backlog,
      id: 'inc-001',
      replace: { 1: 'First' }
    })

    expect(result.changes).toEqual([])
  })

  test('Should refuse a number the row has no note for', () => {
    const backlog = backlogWithNotes(['First', 'Second'])

    expect(() => editNotes({ backlog, id: 'inc-001', remove: [3] })).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message: 'inc-001 has 2 notes, so it has no note 3. Notes count from 1.'
      })
    )
  })

  test('Should refuse a note both removed and replaced', () => {
    const backlog = backlogWithNotes(['First', 'Second'])

    expect(() =>
      editNotes({
        backlog,
        id: 'inc-001',
        remove: [2],
        replace: { 2: 'Other' }
      })
    ).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message: 'Note 2 is both removed and replaced. Choose one.'
      })
    )
  })

  test('Should name a row that is not in the backlog', () => {
    const backlog = backlogWithNotes(['First'])

    expect(() => editNotes({ backlog, id: 'inc-009', remove: [1] })).toThrow(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: "Can't find inc-009 in the backlog."
      })
    )
  })
})
