import { TimError } from '../errors.js'
import { indexOfRow } from './row-order.js'

/**
 * The row fields `tim backlog notes` lists and edits, each with the words
 * its messages use.
 */
export const NOTE_FIELDS = {
  notes: { one: 'note', many: 'notes' },
  openQuestions: { one: 'open question', many: 'open questions' }
}

const capitalised = (text) => `${text[0].toUpperCase()}${text.slice(1)}`

const notesListOf = (notes) => {
  if (notes === undefined || notes === null) return []
  return Array.isArray(notes) ? notes : [notes]
}

const checkPositions = ({ id, positions, count, words }) => {
  const outside = positions.filter(
    (position) =>
      !Number.isInteger(position) || position < 1 || position > count
  )
  if (outside.length) {
    throw new TimError(
      'USAGE',
      `${id} has ${count} ${words.many}, so it has no ${words.one} ${outside.join(', ')}. ${capitalised(words.many)} count from 1.`
    )
  }
}

const checkNoOverlap = ({ remove, replacedPositions, words }) => {
  const both = remove.filter((position) => replacedPositions.includes(position))
  if (both.length) {
    throw new TimError(
      'USAGE',
      `${capitalised(words.one)} ${both.join(', ')} is both removed and replaced. Choose one.`
    )
  }
}

/**
 * One row's notes, or another field in {@link NOTE_FIELDS}, as a list,
 * however the row stores them.
 *
 * @param {{increments: object[]}} backlog
 * @param {string} id
 * @param {keyof NOTE_FIELDS} [field='notes']
 * @returns {string[]}
 * @throws {TimError} NOT_FOUND when the id is not in the backlog
 */
export const notesOf = (backlog, id, field = 'notes') =>
  notesListOf(backlog.increments[indexOfRow(backlog.increments, id)][field])

/**
 * Remove or replace notes on one row, or entries in another field in
 * {@link NOTE_FIELDS}, by their position in that list, counting from 1.
 * Positions refer to the list as it is before the edit.
 *
 * @param {object} args
 * @param {{increments: object[]}} args.backlog
 * @param {string} args.id
 * @param {number[]} [args.remove]
 * @param {Record<number, string>} [args.replace] - New text, by position
 * @param {keyof NOTE_FIELDS} [args.field='notes']
 * @returns {{backlog: object, notes: string[], changes: {position: number, before: string, after: string|null}[]}}
 * @throws {TimError} NOT_FOUND when the id is not in the backlog; USAGE when a position is not in the list, or is both removed and replaced
 */
export const editNotes = ({
  backlog,
  id,
  remove = [],
  replace = {},
  field = 'notes'
}) => {
  const words = NOTE_FIELDS[field]
  const index = indexOfRow(backlog.increments, id)
  const current = notesOf(backlog, id, field)
  const replacedPositions = Object.keys(replace).map(Number)
  checkPositions({
    id,
    positions: [...remove, ...replacedPositions],
    count: current.length,
    words
  })
  checkNoOverlap({ remove, replacedPositions, words })

  const isRemoved = (position) => remove.includes(position)
  const changes = current
    .map((note, at) => ({ position: at + 1, before: note }))
    .filter(({ position }) => isRemoved(position) || position in replace)
    .map((change) => ({
      ...change,
      after: isRemoved(change.position) ? null : replace[change.position]
    }))
    .filter((change) => change.before !== change.after)
  const notes = current
    .map((note, at) => replace[at + 1] ?? note)
    .filter((_, at) => !isRemoved(at + 1))
  const increments = backlog.increments.map((row, at) =>
    at === index ? { ...row, [field]: notes } : row
  )
  return { backlog: { ...backlog, increments }, notes, changes }
}
