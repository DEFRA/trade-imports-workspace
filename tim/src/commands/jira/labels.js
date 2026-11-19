import { createJiraClient } from '../../clients/jira-client.js'
import { makeRunAction } from '../_run-action.js'
import { resolveBoardId } from './board-id.js'
import { exitCodeForBoardError, readBoard } from './board-read.js'

/**
 * @param {object} opts
 * @returns {{board: string}}
 * @throws {TimError} USAGE when `--board` is not a number, or is left out and `repos.json` sets no `jiraBoard`
 */
export const parseLabelsOptions = (opts) => ({ board: resolveBoardId(opts) })

/**
 * How often each label appears in a board's backlog, most used first.
 *
 * @param {{board: string}} parsed
 * @returns {Promise<{board: string, labels: Array<{label: string, count: number}>}>}
 */
export const runLabels = async ({ board }) => {
  const client = createJiraClient()
  const labels = await readBoard(() => client.listBoardLabels(board))
  return { board, labels }
}

const countColumnWidth = 4
const labelCollator = new Intl.Collator()

const mostUsedThenReverseCollated = (a, b) =>
  b.count - a.count || labelCollator.compare(b.label, a.label)

export const renderLabels = ({ labels }) =>
  labels.length
    ? labels
        .toSorted(mostUsedThenReverseCollated)
        .map(
          ({ label, count }) =>
            `${String(count).padStart(countColumnWidth)} ${label}`
        )
        .join('\n')
    : null

export const register = (jira, { timVersion }) => {
  jira
    .command('labels')
    .description(
      "Count the labels on the issues in a board's backlog, most used first, one '<count> <label>' line each"
    )
    .option(
      '--board <id>',
      "Agile board id, e.g. 13780 (defaults to repos.json's jiraBoard)"
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim jira labels\n  tim jira labels --board 13780 --json'
    )
    .action(
      makeRunAction({
        parseOptions: parseLabelsOptions,
        run: (_context, parsed) => runLabels(parsed),
        renderText: renderLabels,
        exitCodeForError: exitCodeForBoardError,
        timVersion
      })
    )
}
