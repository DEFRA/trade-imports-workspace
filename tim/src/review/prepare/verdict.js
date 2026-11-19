import { existsSync } from 'node:fs'
import { readJsonFile } from '../../backlog/io.js'

/**
 * Whether a file review already holds a verdict. A missing file, one that
 * is not JSON, and a verdict of null, false or `"null"` hold none.
 *
 * @param {string} path
 * @returns {boolean}
 */
export const hasVerdict = (path) => {
  if (!existsSync(path)) return false
  try {
    const verdict = readJsonFile(path).verdict ?? null
    return verdict !== null && verdict !== false && verdict !== 'null'
  } catch {
    return false
  }
}
