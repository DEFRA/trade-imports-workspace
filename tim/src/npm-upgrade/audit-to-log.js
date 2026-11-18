import { appendFileSync, writeFileSync } from 'node:fs'
import { runAuditBaseline } from './audit.js'
import { baselineExitCodeOf, jqText } from './audit-rules.js'

const AUDIT_COULD_NOT_RUN = 2

/**
 * Runs `tim npm audit baseline` for a checkout and writes to the log what
 * the command prints: its warnings, then the summary or the error.
 *
 * @param {object} request - As `runAuditBaseline` takes it
 * @param {object} log
 * @param {string} log.logPath
 * @param {boolean} [log.append=false]
 * @returns {Promise<{exitCode: number, summary: object | null}>} exitCode 0 green, 1 red, 2 when the audit could not run
 */
export const auditBaselineToLog = async (
  request,
  { logPath, append = false }
) => {
  const lines = []
  const warn = (line) => lines.push(`${line}\n`)
  const outcome = await runAuditBaseline({ ...request, warn }).then(
    (summary) => {
      lines.push(jqText(summary))
      return { exitCode: baselineExitCodeOf(summary), summary }
    },
    (error) => {
      warn(error.message)
      return { exitCode: AUDIT_COULD_NOT_RUN, summary: null }
    }
  )
  const write = append ? appendFileSync : writeFileSync
  write(logPath, lines.join(''))
  return outcome
}
