import { z } from 'zod'
import { TimError } from '../../errors.js'

const ISSUE_KEY = /^[A-Z][A-Z0-9_]*-\d+$/
const ISSUE_KEY_MESSAGE = 'Give a Jira ticket key, for example EUDPA-200.'

export const issueKeySchema = z
  .string({ error: ISSUE_KEY_MESSAGE })
  .trim()
  .regex(ISSUE_KEY, ISSUE_KEY_MESSAGE)

/**
 * @param {unknown} value
 * @returns {string} The trimmed key
 * @throws {TimError} USAGE when `value` is not a Jira ticket key
 */
export const parseIssueKey = (value) => {
  const result = issueKeySchema.safeParse(value)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}
