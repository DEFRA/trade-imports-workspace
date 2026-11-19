import { z } from 'zod'
import { createJiraClient } from '../../clients/jira-client.js'
import { TimError } from '../../errors.js'
import { makeRunAction } from '../_run-action.js'
import { exitCodeForBoardError, readBoard } from './board-read.js'

const optionsSchema = z.object({
  board: z
    .string({ error: 'Give --board <id>, such as 13780.' })
    .trim()
    .regex(/^\d+$/, 'Give --board as a number, such as 13780.')
})

/**
 * @param {object} opts
 * @returns {{board: string}}
 * @throws {TimError} USAGE when `--board` is missing or not a number
 */
export const parseLabelsOptions = (opts) => {
  const result = optionsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return { board: result.data.board }
}

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
    .option('--board <id>', 'Agile board id, e.g. 13780')
    .addHelpText(
      'after',
      '\nExamples:\n  tim jira labels --board 13780\n  tim jira labels --board 13780 --json'
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
