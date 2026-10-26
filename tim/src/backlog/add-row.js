import { TimError } from '../errors.js'
import { insertRow } from './row-order.js'
import { checkBacklog } from './shape.js'

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

/**
 * Add one row to a backlog, straight before or after another row or at the
 * end, refusing it when the backlog would gain a problem `checkBacklog`
 * finds. Problems the backlog already had do not block the add.
 *
 * @param {object} args
 * @param {{increments: object[]}} args.backlog
 * @param {unknown} args.row
 * @param {string} [args.before]
 * @param {string} [args.after]
 * @param {object} args.schema - The parsed backlog.schema.json
 * @param {(workarea: string) => object|null} [args.readWorkareaBacklog]
 * @returns {{backlog: object, position: number}} The position counts from 1
 * @throws {TimError} USAGE when the row is not an object, or both places are given; NOT_FOUND when the row it goes beside is not in the backlog; LINT when the row would put the backlog out of shape
 */
export const addRow = ({
  backlog,
  row,
  before,
  after,
  schema,
  readWorkareaBacklog
}) => {
  if (!isPlainObject(row)) {
    throw new TimError(
      'USAGE',
      'The row file must hold one JSON object: the row to add.'
    )
  }
  const increments = insertRow(backlog.increments, row, { before, after })
  const updated = { ...backlog, increments }
  const problemsOf = (candidate) =>
    checkBacklog(candidate, schema, { readWorkareaBacklog }).problems
  const existing = new Set(problemsOf(backlog))
  const introduced = problemsOf(updated).filter(
    (problem) => !existing.has(problem)
  )
  if (introduced.length) {
    throw new TimError(
      'LINT',
      `Adding ${row.id ?? 'the row'} would put the backlog out of shape:\n${introduced.join('\n')}`
    )
  }
  return { backlog: updated, position: increments.indexOf(row) + 1 }
}
