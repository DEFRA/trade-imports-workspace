import { join } from 'node:path'
import { TimError } from '../errors.js'

const TICKET_PREFIX = 'EUDPA-'

/**
 * The folder an understanding check keeps its state in.
 *
 * @param {string} workspaceRoot - From `resolveWorkspaceRoot`
 * @param {string} ticket
 * @returns {string}
 */
export const checkFolder = (workspaceRoot, ticket) =>
  join(workspaceRoot, 'workareas', 'understanding-checks', ticket)

/**
 * @param {string} folder - From {@link checkFolder}
 * @returns {{questions: string, transcript: string, meta: string}}
 */
export const checkFilePaths = (folder) => ({
  questions: join(folder, 'questions.json'),
  transcript: join(folder, 'transcript.json'),
  meta: join(folder, '.interview-meta.json')
})

/**
 * @param {string} folder - From {@link checkFolder}
 * @param {string} repo
 * @returns {string}
 */
export const analysisFilePath = (folder, repo) =>
  join(folder, `analysis.${repo}.json`)

/**
 * The ticket a command was given.
 *
 * @param {string | undefined} ticket
 * @param {string} usage - The line to show when no ticket was given
 * @returns {string}
 * @throws {TimError} USAGE when there is no ticket or it does not start EUDPA-
 */
export const requireTicket = (ticket, usage) => {
  if (!ticket) throw new TimError('USAGE', usage)
  if (!ticket.startsWith(TICKET_PREFIX)) {
    throw new TimError('USAGE', `Unknown arg: ${ticket}`)
  }
  return ticket
}
