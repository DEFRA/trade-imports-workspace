import { createJiraClient } from '../../clients/jira-client.js'
import { TimError } from '../../errors.js'
import { parseIssueKey } from './shared.js'
import { makeRunAction } from '../_run-action.js'
import { resolveBoardId } from './board-id.js'
import { readBackUntilLanded } from './read-back.js'

/**
 * Validate `move-to-board`'s options before any side-effect runs.
 *
 * @param {object} opts
 * @returns {{board: string, confirm: boolean}}
 * @throws {TimError} USAGE when `--board` is not a number, or is left out and `repos.json` sets no `jiraBoard`
 */
export const parseMoveToBoardOptions = (opts) => ({
  board: resolveBoardId(opts),
  confirm: Boolean(opts.confirm)
})

const confirmLeftBacklog = async (
  client,
  { board, key, attempts, delayMs }
) => {
  const leftBacklog = await readBackUntilLanded(
    async () => !(await client.isInBoardBacklog(board, key)),
    { attempts, delayMs }
  )
  if (leftBacklog) return
  throw new TimError(
    'UNKNOWN',
    `Jira accepted the move, but ${key} is still in board ${board}'s backlog. Check the board in Jira.`
  )
}

/**
 * `tim jira move-to-board`'s full behaviour: read whether the ticket is in
 * the board's backlog, and either report the dry run or, with `confirm`,
 * move it onto the board and read the backlog again to check it left. The
 * read-back waits `readBackDelayMs` before each of up to `readBackAttempts`
 * reads. A ticket already on the board is left alone.
 *
 * @param {{key: string, board: string, confirm: boolean, readBackAttempts?: number, readBackDelayMs?: number}} args
 * @returns {Promise<{mode: 'dry-run'|'moved'|'unchanged', key: string, board: string}>}
 * @throws {TimError} USAGE for a malformed key; UNKNOWN when the ticket is still in the backlog after every read-back
 */
export const runMoveToBoard = async ({
  key,
  board,
  confirm,
  readBackAttempts = 5,
  readBackDelayMs = 1000
}) => {
  const issueKey = parseIssueKey(key)
  const client = createJiraClient()
  const summary = { key: issueKey, board }

  if (!(await client.isInBoardBacklog(board, issueKey))) {
    return { mode: 'unchanged', ...summary }
  }
  if (!confirm) return { mode: 'dry-run', ...summary }

  await client.moveToBoard(board, [issueKey])
  await confirmLeftBacklog(client, {
    board,
    key: issueKey,
    attempts: readBackAttempts,
    delayMs: readBackDelayMs
  })
  return { mode: 'moved', ...summary }
}

export const renderMoveToBoardResult = ({ mode, key, board }) => {
  if (mode === 'unchanged') {
    return `${key} is not in board ${board}'s backlog. Nothing changed.`
  }
  if (mode === 'dry-run') {
    return [
      `Would move ${key} from board ${board}'s backlog onto the board.`,
      'This is a dry run. No request has been sent. Add --confirm to move it for real.'
    ].join('\n')
  }
  return `Moved ${key} from board ${board}'s backlog onto the board. Checked on Jira.`
}

export const register = (jira, { timVersion }) => {
  jira
    .command('move-to-board <key>')
    .description(
      "Move a Jira ticket out of a board's backlog onto the board, so the team sees it. No status does this. Dry run by default; --confirm moves it and checks it left the backlog."
    )
    .option(
      '--board <id>',
      "Agile board id, e.g. 13780 (defaults to repos.json's jiraBoard)"
    )
    .option(
      '--confirm',
      'Move it for real and check it (the default is a dry run)'
    )
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim jira move-to-board EUDPA-200',
        '  tim jira move-to-board EUDPA-200 --board 13780 --confirm --json'
      ].join('\n')
    )
    .action(
      makeRunAction({
        parseOptions: parseMoveToBoardOptions,
        run: ({ args }, opts) =>
          runMoveToBoard({
            key: args[0],
            board: opts.board,
            confirm: opts.confirm
          }),
        renderText: renderMoveToBoardResult,
        timVersion
      })
    )
}
