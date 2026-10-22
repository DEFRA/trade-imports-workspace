import { TimError } from '../errors.js'
import { indexOfRow } from './row-order.js'

const notesListOf = (notes) => {
  if (notes === undefined || notes === null) return []
  return Array.isArray(notes) ? notes : [notes]
}

const checkPositions = (id, positions, count) => {
  const outside = positions.filter(
    (position) =>
      !Number.isInteger(position) || position < 1 || position > count
  )
  if (outside.length) {
    throw new TimError(
      'USAGE',
      `${id} has ${count} notes, so it has no note ${outside.join(', ')}. Notes count from 1.`
    )
  }
}

const checkNoOverlap = (remove, replacedPositions) => {
  const both = remove.filter((position) => replacedPositions.includes(position))
  if (both.length) {
    throw new TimError(
      'USAGE',
      `Note ${both.join(', ')} is both removed and replaced. Choose one.`
    )
  }
}

/**
 * One row's notes as a list, however the row stores them.
 *
 * @param {{increments: object[]}} backlog
 * @param {string} id
 * @returns {string[]}
 * @throws {TimError} NOT_FOUND when the id is not in the backlog
 */
export const notesOf = (backlog, id) =>
  notesListOf(backlog.increments[indexOfRow(backlog.increments, id)].notes)

/**
 * Remove or replace notes on one row, by their position in the row's notes,
 * counting from 1. Positions refer to the notes as they are before the edit.
 *
 * @param {object} args
 * @param {{increments: object[]}} args.backlog
 * @param {string} args.id
 * @param {number[]} [args.remove]
 * @param {Record<number, string>} [args.replace] - New text, by position
 * @returns {{backlog: object, notes: string[], changes: {position: number, before: string, after: string|null}[]}}
 * @throws {TimError} NOT_FOUND when the id is not in the backlog; USAGE when a position is not one of the row's notes, or is both removed and replaced
 */
export const editNotes = ({ backlog, id, remove = [], replace = {} }) => {
  const index = indexOfRow(backlog.increments, id)
  const current = notesOf(backlog, id)
  const replacedPositions = Object.keys(replace).map(Number)
  checkPositions(id, [...remove, ...replacedPositions], current.length)
  checkNoOverlap(remove, replacedPositions)

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
    at === index ? { ...row, notes } : row
  )
  return { backlog: { ...backlog, increments }, notes, changes }
}
