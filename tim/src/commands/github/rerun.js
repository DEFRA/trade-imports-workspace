import { z } from 'zod'
import { createGithubClient } from '../../clients/github-client.js'
import { TimError } from '../../errors.js'
import { resolveGithubToken } from '../auth.js'
import { makeRunAction } from '../_run-action.js'
import { repoNameSchema } from './shared.js'

const ID_MESSAGE = 'Give a workflow run id or check run id, for example 12345.'

const argsSchema = z.object({
  repo: repoNameSchema,
  id: z.coerce
    .number({ error: ID_MESSAGE })
    .int(ID_MESSAGE)
    .positive(ID_MESSAGE),
  failedOnly: z.boolean().optional().default(false)
})

/**
 * Validate `rerun`'s arguments before any request is sent.
 *
 * @param {object} input
 * @returns {{repo: string, id: number, failedOnly: boolean}}
 * @throws {TimError} USAGE naming the first malformed argument
 */
export const parseRerunArgs = (input) => {
  const result = argsSchema.safeParse(input)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

/**
 * `tim github rerun`'s full behaviour: runs one job again when given a
 * check run id, or a whole workflow run (only its failed jobs with
 * `failedOnly`) when given a run id.
 *
 * @param {object} input - The raw arguments, validated by `parseRerunArgs`
 * @returns {Promise<{repo: string, runId: number, jobId: number | null, scope: 'job' | 'failed-jobs' | 'run'}>}
 * @throws {TimError} USAGE for a bad argument, before any request; NOT_FOUND when no run or job has the id
 */
export const runRerun = async (input) => {
  const { repo, id, failedOnly } = parseRerunArgs(input)
  const client = createGithubClient({ token: await resolveGithubToken() })
  return client.rerun(repo, id, { failedOnly })
}

const RERUN_DESCRIPTIONS = {
  job: ({ jobId, runId }) => `job ${jobId} in run ${runId}`,
  'failed-jobs': ({ runId }) => `the failed jobs in run ${runId}`,
  run: ({ runId }) => `every job in run ${runId}`
}

export const renderRerun = (result) =>
  `Started ${RERUN_DESCRIPTIONS[result.scope](result)} again in ${result.repo}.`

export const register = (gh, { timVersion }) => {
  gh.command('rerun <repo> <id>')
    .description(
      'Run a GitHub Actions job again when given a check run id, or a whole run when given a run id'
    )
    .option(
      '--failed-only',
      'With a run id, run only the jobs that failed again'
    )
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim github rerun trade-imports-address-book 117975702015',
        '  tim github rerun trade-imports-animals-frontend 39226771919 --failed-only --json',
        '',
        'The id is either the id `tim github checks` shows for a check, or a',
        'workflow run id. A check from outside GitHub Actions, such as',
        'SonarCloud, cannot be run again from here.'
      ].join('\n')
    )
    .action(
      makeRunAction({
        run: ({ args }, opts) =>
          runRerun({
            repo: args[0],
            id: args[1],
            failedOnly: opts.failedOnly
          }),
        renderText: renderRerun,
        timVersion
      })
    )
}
