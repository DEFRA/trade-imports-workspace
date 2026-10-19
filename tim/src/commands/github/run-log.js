import { z } from 'zod'
import { createGithubClient } from '../../clients/github-client.js'
import { TimError } from '../../errors.js'
import { resolveGithubToken } from '../auth.js'
import { makeRunAction } from '../_run-action.js'
import { repoNameSchema } from './shared.js'

const DEFAULT_LINES = 100
const ID_MESSAGE = 'Give a workflow run id or check run id, for example 12345.'

const argsSchema = z.object({
  repo: repoNameSchema,
  id: z.coerce
    .number({ error: ID_MESSAGE })
    .int(ID_MESSAGE)
    .positive(ID_MESSAGE),
  failedOnly: z.boolean().optional().default(false),
  lines: z.coerce
    .number({ error: 'Give --lines as a whole number above 0.' })
    .int('Give --lines as a whole number above 0.')
    .positive('Give --lines as a whole number above 0.')
    .default(DEFAULT_LINES)
})

/**
 * Validate `run-log`'s arguments before any request is sent.
 *
 * @param {object} input
 * @returns {{repo: string, id: number, failedOnly: boolean, lines: number}}
 * @throws {TimError} USAGE naming the first malformed argument
 */
export const parseRunLogArgs = (input) => {
  const result = argsSchema.safeParse(input)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

/**
 * `tim github run-log`'s full behaviour: the last lines of each job's log
 * in a workflow run, or of one job when given a check run id.
 *
 * @param {object} input - The raw arguments, validated by `parseRunLogArgs`
 * @returns {Promise<{repo: string, runId: number, jobs: object[]}>}
 * @throws {TimError} USAGE for a bad argument, before any request; NOT_FOUND when no run or job has the id
 */
export const runRunLog = async (input) => {
  const { repo, id, failedOnly, lines } = parseRunLogArgs(input)
  const client = createGithubClient({ token: await resolveGithubToken() })
  return client.getRunLog(repo, id, { failedOnly, lines })
}

const jobHeading = ({ name, id, conclusion, status, url }) =>
  `== ${name} (job ${id}): ${conclusion ?? status}  ${url}`

const failedStepsLine = ({ failedSteps }) =>
  failedSteps.length > 0 ? [`Failed steps: ${failedSteps.join(', ')}`] : []

const logLines = ({ status, logTail }) =>
  status === 'completed'
    ? logTail
    : ['The job has not finished, so it has no log yet.']

const renderJob = (job) =>
  [jobHeading(job), ...failedStepsLine(job), ...logLines(job)].join('\n')

export const renderRunLog = ({ runId, jobs }) =>
  jobs.length === 0
    ? `Run ${runId} has no jobs to show.`
    : jobs.map(renderJob).join('\n\n')

export const register = (gh, { timVersion }) => {
  gh.command('run-log <repo> <id>')
    .description(
      'Show the end of the log for each job in a GitHub Actions run, or for one job when given a check run id'
    )
    .option('--failed-only', 'Show only the jobs that failed')
    .option(
      '--lines <n>',
      'How many lines to show from the end of each log',
      String(DEFAULT_LINES)
    )
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim github run-log trade-imports-animals-frontend 11223344 --failed-only',
        '  tim github run-log trade-imports-animals-frontend 55667788 --lines 300 --json',
        '',
        'The id is either a workflow run id or the id `tim github checks` shows',
        'for a check. A check from outside GitHub Actions, such as SonarCloud,',
        'has no log here: open its details link instead.'
      ].join('\n')
    )
    .action(
      makeRunAction({
        run: ({ args }, opts) =>
          runRunLog({
            repo: args[0],
            id: args[1],
            failedOnly: opts.failedOnly,
            lines: opts.lines
          }),
        renderText: renderRunLog,
        timVersion
      })
    )
}
