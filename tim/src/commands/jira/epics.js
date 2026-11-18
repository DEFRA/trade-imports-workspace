import { z } from 'zod'
import { createJiraClient } from '../../clients/jira-client.js'
import { TimError } from '../../errors.js'
import { makeRunAction } from '../_run-action.js'
import { exitCodeForBoardError, readBoard } from './board-read.js'

const optionsSchema = z.object({
  project: z.string().trim().min(1).optional(),
  board: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Give --board as a number, such as 13780.')
    .optional(),
  includeDone: z.boolean().optional()
})

const parseBoardOptions = ({ project, board, includeDone }) => {
  if (project) {
    throw new TimError('USAGE', 'Give --project or --board, not both.')
  }
  return { board, includeDone: Boolean(includeDone) }
}

const parseProjectOptions = ({ project, includeDone }) => {
  if (includeDone) {
    throw new TimError('USAGE', 'Give --board with --include-done.')
  }
  const resolvedProject = project ?? process.env.JIRA_PROJECT_KEY
  if (!resolvedProject) {
    throw new TimError(
      'USAGE',
      'Give --project <key>, or set JIRA_PROJECT_KEY.'
    )
  }
  return { project: resolvedProject }
}

/**
 * Validate `epics`' options before any side-effect runs. `--board` lists
 * the board's epics; otherwise `--project`, falling back to
 * `JIRA_PROJECT_KEY`, lists the project's open epics.
 *
 * @param {object} opts
 * @returns {{board: string, includeDone: boolean} | {project: string}}
 * @throws {TimError} USAGE when no project or board is named, when both are, or when `--include-done` comes without `--board`
 */
export const parseEpicsOptions = (opts) => {
  const result = optionsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data.board
    ? parseBoardOptions(result.data)
    : parseProjectOptions(result.data)
}

/**
 * The epics on a board, open only unless `includeDone`, or the open epics
 * in a project.
 *
 * @param {{board: string, includeDone: boolean} | {project: string}} parsed
 * @returns {Promise<{board: string, epics: Array<{key: string, summary: string, done: boolean}>} | {project: string, epics: Array<{key: string, summary: string}>}>}
 */
export const runEpics = async (parsed) => {
  const client = createJiraClient()
  if (parsed.board) {
    const epics = await readBoard(() =>
      client.listBoardEpics(parsed.board, {
        includeDone: parsed.includeDone
      })
    )
    return { board: parsed.board, epics }
  }
  const epics = await client.listOpenEpics(parsed.project)
  return { project: parsed.project, epics }
}

const renderBoardEpics = ({ epics }) =>
  epics.length
    ? epics.map((epic) => `${epic.key} — ${epic.summary}`).join('\n')
    : null

const renderProjectEpics = ({ project, epics }) =>
  epics.length
    ? epics.map((epic) => `${epic.key}  ${epic.summary}`).join('\n')
    : `No open epics in ${project}.`

export const renderEpics = (result) =>
  result.board ? renderBoardEpics(result) : renderProjectEpics(result)

export const register = (jira, { timVersion }) => {
  jira
    .command('epics')
    .description(
      "List the open epics in a project, or the epics on a board (as the board marks them, open only unless you add --include-done). A board's epics print as 'KEY — summary'."
    )
    .option(
      '--project <key>',
      'Project key, e.g. EUDPA (defaults to JIRA_PROJECT_KEY)'
    )
    .option('--board <id>', 'Agile board id, e.g. 13780')
    .option('--include-done', "With --board: include the board's done epics")
    .addHelpText(
      'after',
      '\nExamples:\n  tim jira epics --project EUDPA --json\n  tim jira epics --board 13780\n  tim jira epics --board 13780 --include-done --json'
    )
    .action(
      makeRunAction({
        parseOptions: parseEpicsOptions,
        run: (_context, parsed) => runEpics(parsed),
        renderText: renderEpics,
        exitCodeForError: exitCodeForBoardError,
        timVersion
      })
    )
}
