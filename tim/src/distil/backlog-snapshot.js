import { createHash } from 'node:crypto'
import { TimError } from '../errors.js'
import { readJsonFile, writeJsonAtomic } from '../backlog/io.js'
import { splitOffOf } from '../backlog/split-off.js'
import {
  backlogSnapshotPathOf,
  canonicalJsonOf,
  isEditableRow,
  isMergedAway,
  isToBuild
} from './files.js'
import { namesId } from './ids-in-text.js'

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const rowsOf = (backlog, path) => {
  if (!isObject(backlog) || !Array.isArray(backlog.increments)) {
    throw new TimError('LINT', `${path} has no "increments" list.`)
  }
  return backlog.increments.filter(isObject)
}

const frozenRowsOf = (rows) => rows.filter((row) => !isEditableRow(row))

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

const notesTextOf = (row) =>
  [row.notes]
    .flat()
    .filter((note) => typeof note === 'string')
    .join('\n')

const rowMergedInto = (row, byId) => {
  const notes = notesTextOf(row)
  const named = [...byId.values()].filter(
    (other) =>
      other.id !== row.id && isToBuild(other) && namesId(notes, other.id)
  )
  return named.length === 1 ? named[0].id : null
}

const mergedAwayFrom = (saved, byId) =>
  asList(saved.rowsToBuild)
    .filter((id) => byId.has(id) && isMergedAway(byId.get(id)))
    .map((id) => ({ id, into: rowMergedInto(byId.get(id), byId) }))

const differencesFrom = (saved, rows, pointers) => {
  const byId = new Map(rows.map((row) => [row.id, row]))
  const moved = movedRowIdsOf(pointers)
  const savedIds = new Set(saved.rowIds)
  return {
    removed: saved.rowIds.filter((id) => !byId.has(id) && !moved.has(id)),
    changed: saved.frozen
      .filter(
        (row) =>
          byId.has(row.id) &&
          canonicalJsonOf(byId.get(row.id)) !== canonicalJsonOf(row)
      )
      .map((row) => row.id),
    splitOffChanged: splitOffChangesFrom(saved, pointers),
    added: rows.map((row) => row.id).filter((id) => !savedIds.has(id)),
    mergedAway: mergedAwayFrom(saved, byId)
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
 * `save` keeps, under a tag, the backlog's row ids, the ids of the rows still
 * to build (status `todo`), its rows built or set aside (any status but todo
 * or blocked) and the pointers to the themes split off it early.
 * `compareTo` reports, since the snapshot with that tag: every row removed,
 * every built or set-aside row changed, every pointer gone or changed in any
 * field but `pickUp`, every row added, and every row that was still to build
 * and is now `merged-into`. A merged-away row's `into` is the one other row
 * still to build that its notes name, and null when its notes name none or
 * more than one. A snapshot saved without the rows-to-build
 * ids reports no merged-away rows.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {string} [args.save] - A tag to keep this snapshot under
 * @param {string} [args.compareTo] - The tag of an earlier snapshot to compare with
 * @returns {{path: string, rows: number, rowIds: string[], frozen: string[], frozenHash: string, splitOff: object[], saved: string|null, compared: {tag: string, removed: string[], changed: string[], splitOffChanged: string[], added: string[], mergedAway: Array<{id: string, into: string|null}>}|null}}
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
      rowsToBuild: rows.filter(isToBuild).map((row) => row.id),
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
