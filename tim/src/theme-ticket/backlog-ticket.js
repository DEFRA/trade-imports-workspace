import { existsSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { readJsonFile } from '../backlog/io.js'
import { branchAndTicketOf } from '../build/envelope-repos.js'

/**
 * The Jira ticket a workarea's backlog envelope names.
 *
 * @param {string} workareaDir
 * @returns {string | null} Null when the workarea has no backlog, or its backlog names no ticket
 * @throws {TimError} PARSE when the backlog is not JSON
 */
export const backlogTicketOf = (workareaDir) => {
  const backlogFile = join(workareaDir, 'backlog.json')
  if (!existsSync(backlogFile)) return null
  return branchAndTicketOf(readJsonFile(backlogFile)).ticket
}

/**
 * The Jira ticket named by the backlog beside the `tickets/` folder that
 * holds `ticketFolder`.
 *
 * @param {string} ticketFolder - A folder at `<workarea>/tickets/<slug>`
 * @returns {string | null} Null when the folder is not under a `tickets/` folder, or that workarea's backlog names no ticket
 * @throws {TimError} PARSE when the backlog is not JSON
 */
export const backlogTicketBesideFolder = (ticketFolder) => {
  const ticketsDir = dirname(resolve(ticketFolder))
  return basename(ticketsDir) === 'tickets'
    ? backlogTicketOf(dirname(ticketsDir))
    : null
}
