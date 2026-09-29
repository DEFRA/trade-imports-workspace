import { join, normalize, sep } from 'node:path'
import { TimError } from '../errors.js'

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
export const workareaDirFor = (workspaceRoot, workarea) => {
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
  return join(workspaceRoot, 'workareas', normalised)
}
