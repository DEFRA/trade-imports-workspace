import { existsSync } from 'node:fs'
import { join, normalize, sep } from 'node:path'
import { TimError } from '../errors.js'
import { readJsonFile } from './io.js'

/**
 * A workarea in its one written form, such as `shared/my-programme` for
 * `shared/my-programme/`: the form a backlog's `externalDependsOn` and
 * `parent` name it by. Refuses an absolute path, or one that climbs out of
 * workareas/.
 *
 * @param {unknown} workarea
 * @returns {string}
 * @throws {TimError} USAGE
 */
export const normaliseWorkarea = (workarea) => {
  if (typeof workarea !== 'string' || !workarea.trim()) {
    throw new TimError('USAGE', 'Name a workarea, such as shared/my-programme.')
  }
  const trimmed = workarea.trim().replace(/\/+$/, '')
  const normalised = normalize(trimmed).split(sep).join('/')
  if (
    trimmed.startsWith('/') ||
    normalised === '..' ||
    normalised.startsWith('../')
  ) {
    throw new TimError(
      'USAGE',
      `Workarea "${workarea}" must be a path inside workareas/, such as shared/my-programme.`
    )
  }
  return normalised
}

/**
 * The folder `workareas/<workarea>/` a command takes its workarea from, such
 * as `shared/my-programme`. Refuses an absolute path, or one that climbs out
 * of workareas/, before anything is read.
 *
 * @param {string} workspaceRoot
 * @param {unknown} workarea
 * @returns {string}
 * @throws {TimError} USAGE
 */
export const workareaDirFor = (workspaceRoot, workarea) =>
  join(workspaceRoot, 'workareas', normaliseWorkarea(workarea))

/**
 * A reader for other workareas' backlogs, such as the one an
 * `externalDependsOn` names. Each workarea is read once. A workarea with no
 * backlog.json, or one outside workareas/, reads as null; a backlog.json that
 * will not parse is refused.
 *
 * @param {string} workspaceRoot
 * @returns {(workarea: string) => object|null}
 * @throws {TimError} PARSE, from the reader, when a backlog.json is not JSON
 */
export const workareaBacklogReader = (workspaceRoot) => {
  const read = new Map()
  return (workarea) => {
    if (!read.has(workarea)) {
      read.set(workarea, readBacklogIn(workspaceRoot, workarea))
    }
    return read.get(workarea)
  }
}

const readBacklogIn = (workspaceRoot, workarea) => {
  let dir
  try {
    dir = workareaDirFor(workspaceRoot, workarea)
  } catch {
    return null
  }
  const path = join(dir, 'backlog.json')
  return existsSync(path) ? readJsonFile(path) : null
}
