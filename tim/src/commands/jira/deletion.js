import { z } from 'zod'
import { TimError, isTimError } from '../../errors.js'
import { ERROR, USAGE } from '../../constants/exitCodes.js'

export class AmbiguousFilenameError extends TimError {
  constructor(message) {
    super('USAGE', message)
    this.name = 'AmbiguousFilenameError'
  }
}

/**
 * @param {Error} error
 * @returns {number} USAGE for an ambiguous filename, ERROR for anything else
 */
export const exitCodeForDeletionError = (error) =>
  error instanceof AmbiguousFilenameError ? USAGE : ERROR

const asSentence = (text) => (text.endsWith('.') ? text : `${text}.`)

/**
 * Rethrow a failed read of a ticket's attachments or links as the error the
 * user reads: what could not be read, then Jira's own reasons when it gave
 * any, else the client's message.
 *
 * @param {object} args
 * @param {string} args.what - What was read, such as `attachments`
 * @param {string} args.key
 * @param {Error} args.error
 * @returns {TimError}
 */
export const couldNotReadError = ({ what, key, error }) => {
  const reasons = error.jiraMessages?.length
    ? error.jiraMessages
    : [error.message]
  return new TimError(
    isTimError(error) ? error.code : 'UNKNOWN',
    asSentence([`Could not read ${what} for ${key}`, ...reasons].join('\n')),
    error
  )
}

export const DRY_RUN_NOTICE =
  'This is a dry run. Nothing has been deleted. Add --confirm to delete for real.'

/**
 * @param {string} thing - What the id names, for the error message
 * @returns {import('zod').ZodString}
 */
export const numericIdSchema = (thing) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, `Give the ${thing}'s numeric id, for example 479899.`)

/**
 * Delete items one at a time, stopping at the first that fails. A failure
 * before anything is deleted is thrown as it is; a later one is returned
 * beside what was deleted, so the caller can report both.
 *
 * @template T
 * @param {T[]} items
 * @param {(item: T) => Promise<void>} deleteItem
 * @returns {Promise<{deleted: T[], failure: {item: T, code: string, message: string}|null}>}
 */
export const deleteEach = async (items, deleteItem) => {
  const deleted = []
  for (const item of items) {
    try {
      await deleteItem(item)
    } catch (error) {
      if (deleted.length === 0) throw error
      return {
        deleted,
        failure: { item, code: error.code ?? 'UNKNOWN', message: error.message }
      }
    }
    deleted.push(item)
  }
  return { deleted, failure: null }
}
