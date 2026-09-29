import { createHash } from 'node:crypto'
import { TimError } from '../errors.js'
import { readJsonFile, writeJsonAtomic } from '../backlog/io.js'
import {
  backlogSnapshotPathOf,
  canonicalJsonOf,
  isEditableRow
} from './files.js'

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const rowsOf = (backlog, path) => {
  if (!isObject(backlog) || !Array.isArray(backlog.increments)) {
    throw new TimError('LINT', `${path} has no "increments" list.`)
  }
  return backlog.increments.filter(isObject)
}

const frozenRowsOf = (rows) => rows.filter((row) => !isEditableRow(row))

const hashOf = (rows) =>
  createHash('sha256').update(canonicalJsonOf(rows)).digest('hex')

const readSaved = (path, tag) => {
  try {
    return readJsonFile(path)
  } catch (error) {
    if (error.code !== 'NOT_FOUND') throw error
    throw new TimError(
      'NOT_FOUND',
      `No backlog snapshot tagged ${tag}. Take one first with --save ${tag}.`
    )
  }
}

/**
 * What changed since a saved snapshot: rows removed, and rows built or set
 * aside (any status but todo or blocked) that are no longer exactly as they
 * were, by id.
 *
 * @param {{rowIds: string[], frozen: object[]}} saved
 * @param {object[]} rows - The backlog's rows now
 * @returns {{removed: string[], changed: string[]}}
 */
const differencesFrom = (saved, rows) => {
  const byId = new Map(rows.map((row) => [row.id, row]))
  return {
    removed: saved.rowIds.filter((id) => !byId.has(id)),
    changed: saved.frozen
      .filter(
        (row) =>
          byId.has(row.id) &&
          canonicalJsonOf(byId.get(row.id)) !== canonicalJsonOf(row)
      )
      .map((row) => row.id)
  }
}

/**
 * The backlog's row ids and its rows built or set aside (any status but todo
 * or blocked), which a re-distil must keep exactly as they are. `save` keeps them under a tag;
 * `compareTo` reports every row removed, and every such row changed, since
 * the snapshot with that tag. The consolidate step is held to them by this,
 * not by a hash an agent copies by hand.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {string} [args.save] - A tag to keep this snapshot under
 * @param {string} [args.compareTo] - The tag of an earlier snapshot to compare with
 * @returns {{path: string, rows: number, rowIds: string[], frozen: string[], frozenHash: string, saved: string|null, compared: {tag: string, removed: string[], changed: string[]}|null}}
 * @throws {TimError} NOT_FOUND with no backlog.json or no snapshot under `compareTo`, PARSE when a file is not JSON, LINT when backlog.json has no increments list
 */
export const snapshotBacklog = ({ layout, save, compareTo }) => {
  const rows = rowsOf(readJsonFile(layout.backlog), layout.backlog)
  const frozen = frozenRowsOf(rows)
  const rowIds = rows.map((row) => row.id)
  const compared = compareTo
    ? {
        tag: compareTo,
        ...differencesFrom(
          readSaved(backlogSnapshotPathOf(layout, compareTo), compareTo),
          rows
        )
      }
    : null
  const savedPath = save ? backlogSnapshotPathOf(layout, save) : null
  if (savedPath) writeJsonAtomic(savedPath, { rowIds, frozen })
  return {
    path: layout.backlog,
    rows: rows.length,
    rowIds,
    frozen: frozen.map((row) => row.id),
    frozenHash: hashOf(frozen),
    saved: savedPath,
    compared
  }
}
