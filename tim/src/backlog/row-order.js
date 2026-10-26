import { TimError } from '../errors.js'

/**
 * @param {object[]} rows
 * @param {string} id
 * @returns {number}
 * @throws {TimError} NOT_FOUND when no row has the id
 */
export const indexOfRow = (rows, id) => {
  const index = rows.findIndex((row) => row.id === id)
  if (index === -1) {
    throw new TimError('NOT_FOUND', `Can't find ${id} in the backlog.`)
  }
  return index
}

const anchorOf = ({ before, after }) => {
  if (before !== undefined && after !== undefined) {
    throw new TimError('USAGE', 'Give --before or --after, not both.')
  }
  return before === undefined
    ? { anchor: after, offset: 1 }
    : { anchor: before, offset: 0 }
}

/**
 * The rows with `row` placed straight before or after the row with another
 * id, or at the end when neither is given.
 *
 * @param {object[]} rows
 * @param {object} row
 * @param {{before?: string, after?: string}} place
 * @returns {object[]}
 * @throws {TimError} NOT_FOUND when the id it goes beside is not in the rows; USAGE when both are given
 */
export const insertRow = (rows, row, place) => {
  const { anchor, offset } = anchorOf(place)
  if (anchor === undefined) return [...rows, row]
  const at = indexOfRow(rows, anchor) + offset
  return [...rows.slice(0, at), row, ...rows.slice(at)]
}

/**
 * Move one row straight before or after another, keeping every other row in
 * its order.
 *
 * @param {object} args
 * @param {{increments: object[]}} args.backlog
 * @param {string} args.id
 * @param {string} [args.before]
 * @param {string} [args.after]
 * @returns {{backlog: object, from: number, to: number}} Row numbers count from 1
 * @throws {TimError} NOT_FOUND when either id is not in the backlog; USAGE when it is given neither or both places, or the row would move beside itself
 */
export const moveRow = ({ backlog, id, before, after }) => {
  if (before === undefined && after === undefined) {
    throw new TimError('USAGE', 'Give --before or --after.')
  }
  if ((before ?? after) === id) {
    throw new TimError('USAGE', `${id} can't move beside itself.`)
  }
  const rows = backlog.increments
  const from = indexOfRow(rows, id)
  const others = rows.filter((_, index) => index !== from)
  const increments = insertRow(others, rows[from], { before, after })
  return {
    backlog: { ...backlog, increments },
    from: from + 1,
    to: increments.indexOf(rows[from]) + 1
  }
}
