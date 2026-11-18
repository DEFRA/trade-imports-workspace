import { existsSync } from 'node:fs'
import { TimError } from '../errors.js'

/**
 * Refuses the first value that is missing or empty, naming its label.
 *
 * @param {Record<string, string | undefined>} given - Label to value, in the order to check
 * @throws {TimError} USAGE naming the first label with no value
 */
export const requireGiven = (given) => {
  for (const [label, value] of Object.entries(given)) {
    if (!value) {
      throw new TimError('USAGE', `Error: missing required arg ${label}`)
    }
  }
}

/**
 * Refuses a path that does not exist.
 *
 * @param {string} path
 * @param {string} [hint] - Text to add after "not found"
 * @throws {TimError} NOT_FOUND when nothing is at the path
 */
export const requireExisting = (path, hint = '') => {
  if (!existsSync(path)) {
    throw new TimError('NOT_FOUND', `Error: ${path} not found${hint}`)
  }
}
