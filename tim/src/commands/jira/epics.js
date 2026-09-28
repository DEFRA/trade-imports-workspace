import { z } from 'zod'
import { createJiraClient } from '../../clients/jira-client.js'
import { TimError } from '../../errors.js'
import { makeJiraAction } from './shared.js'

const optionsSchema = z.object({
  project: z.string().trim().min(1).optional()
})

/**
 * Validate `epics`' options before any side-effect runs, resolving
 * `--project` from `JIRA_PROJECT_KEY` when it isn't given — the same
 * fallback `tools/jira/create-ticket.sh` uses.
 *
 * @param {object} opts
 * @returns {{project: string}}
 * @throws {TimError} USAGE when no project is named either way
 */
export const parseEpicsOptions = (opts) => {
  const result = optionsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  const project = result.data.project ?? process.env.JIRA_PROJECT_KEY
  if (!project) {
    throw new TimError(
      'USAGE',
      'Give --project <key>, or set JIRA_PROJECT_KEY.'
    )
  }
  return { project }
}

/**
 * The open epics in a project, for a hand-off to offer as the default
 * parent.
 *
 * @param {object} args
 * @param {string} args.project
 * @returns {Promise<{project: string, epics: Array<{key: string, summary: string}>}>}
 */
export const runEpics = async ({ project }) => {
  const client = createJiraClient()
  const epics = await client.listOpenEpics(project)
  return { project, epics }
}

export const renderEpics = (result) =>
  result.epics.length
    ? result.epics.map((epic) => `${epic.key}  ${epic.summary}`).join('\n')
    : `No open epics in ${result.project}.`

export const register = (jira, { timVersion }) => {
  jira
    .command('epics')
    .description('List open epics in a project')
    .option(
      '--project <key>',
      'Project key, e.g. EUDPA (defaults to JIRA_PROJECT_KEY)'
    )
    .addHelpText('after', '\nExample: tim jira epics --project EUDPA --json')
    .action(
      makeJiraAction({
        parseOptions: parseEpicsOptions,
        run: (_context, parsed) => runEpics(parsed),
        renderText: renderEpics,
        timVersion
      })
    )
}
