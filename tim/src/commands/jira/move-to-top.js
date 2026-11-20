import { createJiraClient } from '../../clients/jira-client.js'
import { TimError } from '../../errors.js'
import { jqlQuoted, parseIssueKey } from './shared.js'
import { makeRunAction } from '../_run-action.js'
import { readBackUntilLanded } from './read-back.js'

export const parseMoveToTopOptions = (opts) => ({
  confirm: Boolean(opts.confirm)
})

const projectOf = (issueKey) => issueKey.slice(0, issueKey.lastIndexOf('-'))

const firstInStatus = async (client, { project, status }) => {
  const [first] = await client.searchIssues(
    `project = ${project} AND status = ${jqlQuoted(status)} ORDER BY Rank ASC`,
    { limit: 1 }
  )
  return first?.key ?? null
}

const confirmOnTop = async (client, { key, column, attempts, delayMs }) => {
  const onTop = await readBackUntilLanded(
    async () => (await firstInStatus(client, column)) === key,
    { attempts, delayMs }
  )
  if (onTop) return
  throw new TimError(
    'UNKNOWN',
    `Jira accepted the rank, but ${key} is not the first ${column.status} ticket in ${column.project}. Check the board in Jira.`
  )
}

/**
 * `tim jira move-to-top`'s full behaviour: read the ticket's status, find
 * the first ticket in its project with that status by rank, and either
 * report the dry run or, with `confirm`, rank the ticket above it and read
 * the order again to check. Rank is one order across the project, so the
 * ticket heads its status's column on every board. A ticket already first
 * is left alone.
 *
 * @param {{key: string, confirm: boolean, readBackAttempts?: number, readBackDelayMs?: number}} args
 * @returns {Promise<{mode: 'dry-run'|'moved'|'unchanged', key: string, status: string, above: string|null}>}
 * @throws {TimError} USAGE for a malformed key; UNKNOWN when the ticket is not first after every read-back
 */
export const runMoveToTop = async ({
  key,
  confirm,
  readBackAttempts = 5,
  readBackDelayMs = 1000
}) => {
  const issueKey = parseIssueKey(key)
  const client = createJiraClient()
  const { status } = await client.getTicket(issueKey)
  const column = { project: projectOf(issueKey), status }
  const first = await firstInStatus(client, column)

  if (first === null || first === issueKey) {
    return { mode: 'unchanged', key: issueKey, status, above: null }
  }
  const summary = { key: issueKey, status, above: first }
  if (!confirm) return { mode: 'dry-run', ...summary }

  await client.rankBefore(issueKey, first)
  await confirmOnTop(client, {
    key: issueKey,
    column,
    attempts: readBackAttempts,
    delayMs: readBackDelayMs
  })
  return { mode: 'moved', ...summary }
}

export const renderMoveToTopResult = ({ mode, key, status, above }) => {
  if (mode === 'unchanged') {
    return `${key} is already the first ${status} ticket. Nothing changed.`
  }
  if (mode === 'dry-run') {
    return [
      `Would rank ${key} above ${above}, the first ${status} ticket now.`,
      'This is a dry run. No request has been sent. Add --confirm to move it for real.'
    ].join('\n')
  }
  return `Ranked ${key} above ${above}, so it is the first ${status} ticket. Checked on Jira.`
}

export const register = (jira, { timVersion }) => {
  jira
    .command('move-to-top <key>')
    .description(
      "Rank a Jira ticket above every other ticket in its project with the same status, so it is first in that status's column on the board. Dry run by default; --confirm ranks it and checks it is first."
    )
    .option(
      '--confirm',
      'Rank it for real and check it (the default is a dry run)'
    )
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim jira move-to-top EUDPA-200',
        '  tim jira move-to-top EUDPA-200 --confirm --json'
      ].join('\n')
    )
    .action(
      makeRunAction({
        parseOptions: parseMoveToTopOptions,
        run: ({ args }, opts) =>
          runMoveToTop({ key: args[0], confirm: opts.confirm }),
        renderText: renderMoveToTopResult,
        timVersion
      })
    )
}
