import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { TimError } from '../errors.js'

export const NIGHTLY_JOBS_FILE = join('config', 'nightly-jobs.json')

const CRON_FIELD_COUNT = 5

const startsOffTheHalfHour = (cron) => {
  const [minute] = cron.split(/\s+/)
  return /^\d+$/.test(minute) && Number(minute) !== 0 && Number(minute) !== 30
}

const cronSchema = z
  .string()
  .trim()
  .refine((cron) => cron.split(/\s+/).length === CRON_FIELD_COUNT, {
    message: 'must have 5 fields: minute hour day-of-month month day-of-week'
  })
  .refine(startsOffTheHalfHour, {
    message: 'must start at a fixed minute that is not 0 or 30'
  })

const jobSchema = z.object({
  name: z
    .string()
    .regex(/^[a-z][a-z0-9-]*$/, 'must be lower-case words joined by hyphens'),
  skill: z.string().trim().min(1),
  prompt: z.string().trim().min(1),
  cron: cronSchema,
  enabled: z.boolean(),
  purpose: z.string().trim().min(1)
})

const registrySchema = z.object({
  jobs: z.array(jobSchema)
})

const describeIssue = ({ path, message }) =>
  path.length === 0 ? message : `${path.join('.')} ${message}`

const parseRegistryJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new TimError(
      'PARSE',
      `${NIGHTLY_JOBS_FILE} is not valid JSON: ${error.message}`,
      error
    )
  }
}

const repeatedName = (jobs) => {
  const names = jobs.map(({ name }) => name)
  return names.find((name, index) => names.indexOf(name) !== index)
}

/**
 * The text every nightly cron prompt starts with. `/nightly-start` finds the
 * crons it registered earlier by this prefix.
 *
 * @param {string} jobName
 * @returns {string}
 */
export const cronPromptMarker = (jobName) => `[nightly:${jobName}]`

const withCronPrompt = (job) => ({
  ...job,
  cronPrompt: `${cronPromptMarker(job.name)} ${job.prompt}`
})

/**
 * The jobs in `config/nightly-jobs.json`, each with the `cronPrompt` to
 * register: the job's prompt behind its `[nightly:<name>]` marker.
 *
 * @param {string} workspaceRoot
 * @returns {{name: string, skill: string, prompt: string, cron: string, enabled: boolean, purpose: string, cronPrompt: string}[]}
 * @throws {TimError} NOT_FOUND when the file is missing; PARSE when it is not
 *   valid JSON, breaks the schema or names a job twice
 */
export const readNightlyJobs = (workspaceRoot) => {
  const path = join(workspaceRoot, NIGHTLY_JOBS_FILE)
  if (!existsSync(path)) {
    throw new TimError('NOT_FOUND', `Cannot find ${NIGHTLY_JOBS_FILE}.`)
  }
  const result = registrySchema.safeParse(parseRegistryJson(path))
  if (!result.success) {
    throw new TimError(
      'PARSE',
      `${NIGHTLY_JOBS_FILE}: ${describeIssue(result.error.issues[0])}`
    )
  }
  const repeated = repeatedName(result.data.jobs)
  if (repeated) {
    throw new TimError(
      'PARSE',
      `${NIGHTLY_JOBS_FILE}: the job ${repeated} is named twice.`
    )
  }
  return result.data.jobs.map(withCronPrompt)
}
