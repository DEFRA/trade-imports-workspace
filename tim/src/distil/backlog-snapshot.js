import { createHash } from 'node:crypto'
import { TimError } from '../errors.js'
import { readJsonFile, writeJsonAtomic } from '../backlog/io.js'
import { splitOffOf } from '../backlog/split-off.js'
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

/**
 * A split-off pointer as a re-distil must keep it: every field but `pickUp`,
 * which the consolidator may add to.
 */
const fixedPartOf = ({ pickUp, ...pointer }) => pointer

const movedRowIdsOf = (pointers) =>
  new Set(pointers.flatMap((pointer) => asList(pointer.increments)))

const asList = (value) => (Array.isArray(value) ? value : [])

const splitOffChangesFrom = (saved, pointers) => {
  const now = new Map(pointers.map((pointer) => [pointer.theme, pointer]))
  return asList(saved.splitOff)
    .filter(
      (pointer) =>
        !now.has(pointer.theme) ||
        canonicalJsonOf(fixedPartOf(now.get(pointer.theme))) !==
          canonicalJsonOf(pointer)
    )
    .map((pointer) => pointer.theme)
}

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
 * What changed since a saved snapshot: rows removed, rows built or set aside
 * (any status but todo or blocked) that are no longer exactly as they were,
 * by id, and themes split off early whose pointer is gone or changed in any
 * field but `pickUp`. A row that moved with a theme split off since is not
 * removed.
 *
 * @param {{rowIds: string[], frozen: object[], splitOff?: object[]}} saved
 * @param {object[]} rows - The backlog's rows now
 * @param {object[]} pointers - The backlog's split-off pointers now
 * @returns {{removed: string[], changed: string[], splitOffChanged: string[]}}
 */
const differencesFrom = (saved, rows, pointers) => {
  const byId = new Map(rows.map((row) => [row.id, row]))
  const moved = movedRowIdsOf(pointers)
  return {
    removed: saved.rowIds.filter((id) => !byId.has(id) && !moved.has(id)),
    changed: saved.frozen
      .filter(
        (row) =>
          byId.has(row.id) &&
          canonicalJsonOf(byId.get(row.id)) !== canonicalJsonOf(row)
      )
      .map((row) => row.id),
    splitOffChanged: splitOffChangesFrom(saved, pointers)
  }
}

const splitOffSummaryOf = (pointer) => ({
  theme: pointer.theme,
  branch: pointer.branch,
  workarea: pointer.workarea,
  touches: asList(pointer.touches),
  requirements: asList(pointer.requirements),
  pickUp: asList(pointer.pickUp)
})

/**
 * The backlog's row ids and its rows built or set aside (any status but todo
 * or blocked), which a re-distil must keep exactly as they are, and the
 * pointers to the themes split off it early, which it must carry over.
 * `save` keeps them under a tag; `compareTo` reports every row removed, every
 * such row changed and every pointer gone or changed, since the snapshot with
 * that tag. The consolidate step is held to them by this, not by a hash an
 * agent copies by hand.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {string} [args.save] - A tag to keep this snapshot under
 * @param {string} [args.compareTo] - The tag of an earlier snapshot to compare with
 * @returns {{path: string, rows: number, rowIds: string[], frozen: string[], frozenHash: string, splitOff: object[], saved: string|null, compared: {tag: string, removed: string[], changed: string[], splitOffChanged: string[]}|null}}
 * @throws {TimError} NOT_FOUND with no backlog.json or no snapshot under `compareTo`, PARSE when a file is not JSON, LINT when backlog.json has no increments list
 */
export const snapshotBacklog = ({ layout, save, compareTo }) => {
  const backlog = readJsonFile(layout.backlog)
  const rows = rowsOf(backlog, layout.backlog)
  const pointers = splitOffOf(backlog)
  const frozen = frozenRowsOf(rows)
  const rowIds = rows.map((row) => row.id)
  const compared = compareTo
    ? {
        tag: compareTo,
        ...differencesFrom(
          readSaved(backlogSnapshotPathOf(layout, compareTo), compareTo),
          rows,
          pointers
        )
      }
    : null
  const savedPath = save ? backlogSnapshotPathOf(layout, save) : null
  if (savedPath) {
    writeJsonAtomic(savedPath, {
      rowIds,
      frozen,
      splitOff: pointers.map(fixedPartOf)
    })
  }
  return {
    path: layout.backlog,
    rows: rows.length,
    rowIds,
    frozen: frozen.map((row) => row.id),
    frozenHash: hashOf(frozen),
    splitOff: pointers.map(splitOffSummaryOf),
    saved: savedPath,
    compared
  }
}
