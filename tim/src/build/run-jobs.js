import { readFile } from 'node:fs/promises'
import { load as yamlLoad } from 'js-yaml'
import { run } from '../exec/exec.js'
import { TimError } from '../errors.js'

const PASSING_CONCLUSIONS = ['success', 'skipped']
const LOCAL_WORKFLOW = /^\.\/(\.github\/workflows\/[^@]+\.ya?ml)$/
const EXPRESSION_START = '${{'

const readAt = async (repoPath, commit, file) => {
  const { exitCode, stdout, stderr } = await run(
    'git',
    ['show', `${commit}:${file}`],
    { cwd: repoPath }
  )
  if (exitCode !== 0) {
    throw new TimError(
      'NOT_FOUND',
      `Can't read ${file} at ${commit} in ${repoPath}: ${stderr.trim()}`
    )
  }
  try {
    return yamlLoad(stdout) ?? {}
  } catch (error) {
    throw new TimError(
      'PARSE',
      `Can't read ${file} at ${commit} as YAML: ${error.message}`,
      error
    )
  }
}

const displayNameOf = (key, job) =>
  typeof job?.name === 'string' ? job.name.split(EXPRESSION_START)[0] : key

const namedByExpression = (job) =>
  typeof job?.name === 'string' && job.name.includes(EXPRESSION_START)

const isExact = (job, name) => job.name === name
const isMatrixOf = (job, name) => job.name.startsWith(`${name} (`)
const isCalledBy = (job, name) => job.name.startsWith(`${name} / `)

const isRunOf = (job, declared) =>
  declared.namedByExpression
    ? job.name.startsWith(declared.name)
    : isExact(job, declared.name) || isMatrixOf(job, declared.name)

const declaredJobsOf = async (repoPath, commit, file, prefix) => {
  const workflow = await readAt(repoPath, commit, file)
  const jobs = Object.entries(workflow.jobs ?? {})
  return Promise.all(
    jobs.map(async ([key, job]) => {
      const name = `${prefix}${displayNameOf(key, job)}`
      const uses = typeof job?.uses === 'string' ? job.uses : null
      const local = uses?.match(LOCAL_WORKFLOW)?.[1] ?? null
      return {
        key,
        name,
        namedByExpression: namedByExpression(job),
        uses,
        calls: local
          ? await declaredJobsOf(repoPath, commit, local, `${name} / `)
          : null
      }
    })
  )
}

const skippedWhole = (declared, jobs) =>
  jobs.some(
    (job) => isExact(job, declared.name) && job.conclusion === 'skipped'
  )

const missingFrom = (declared, jobs) => {
  if (!declared.uses) {
    return jobs.some((job) => isRunOf(job, declared)) ? [] : [declared.name]
  }
  if (skippedWhole(declared, jobs)) return []
  if (declared.calls) {
    return declared.calls.flatMap((called) => missingFrom(called, jobs))
  }
  return jobs.some((job) => isCalledBy(job, declared.name))
    ? []
    : [`${declared.name} / …`]
}

const describeJob = ({ name, status, conclusion }) =>
  `${name}: ${status === 'completed' ? conclusion : status}`

const hasPassed = ({ status, conclusion }) =>
  status === 'completed' && PASSING_CONCLUSIONS.includes(conclusion)

const jobsIn = (listing) => {
  const jobs = Array.isArray(listing) ? listing : listing?.jobs
  if (!Array.isArray(jobs)) {
    throw new TimError(
      'PARSE',
      'The jobs file holds no jobs list. Save the whole answer of `gh api repos/<owner>/<repo>/actions/runs/<id>/jobs?filter=latest`.'
    )
  }
  return jobs.map(({ name, status, conclusion }) => ({
    name: String(name),
    status,
    conclusion: conclusion ?? null
  }))
}

const readJobsFile = async (path) => {
  try {
    return jobsIn(JSON.parse(await readFile(path, 'utf8')))
  } catch (error) {
    if (error instanceof TimError) throw error
    throw new TimError(
      'PARSE',
      `Can't read the jobs file ${path}: ${error.message}`,
      error
    )
  }
}

/**
 * Whether every job of one workflow run has passed, judged from the jobs a
 * GitHub Actions run reports (the saved answer of
 * `gh api repos/<owner>/<repo>/actions/runs/<id>/jobs?filter=latest`) against
 * the jobs the workflow file defines at the run's commit. A job passes when it
 * is completed with success or skipped. A defined job is present when a run
 * job carries its name, or its name and a matrix suffix. A job that calls a
 * reusable workflow is present when the run holds a job named
 * `<its name> / …`, or every job of that workflow when it is in the same repo,
 * or one job of its own name that was skipped. `green` is true only when no
 * defined job is missing and every run job has passed.
 *
 * @param {object} args
 * @param {string} args.repoPath
 * @param {string} args.commit
 * @param {string} args.workflow - The workflow file, such as `.github/workflows/publish.yml`
 * @param {string} args.jobsFile - The saved `gh api …/jobs` answer
 * @returns {Promise<{workflow: string, commit: string, green: boolean, declared: string[], missing: string[], notPassed: string[], jobs: string[]}>}
 * @throws {TimError} NOT_FOUND when git cannot read the workflow, PARSE when it or the jobs file cannot be read
 */
export const judgeRunJobs = async ({
  repoPath,
  commit,
  workflow,
  jobsFile
}) => {
  const jobs = await readJobsFile(jobsFile)
  const declared = await declaredJobsOf(repoPath, commit, workflow, '')
  const missing = declared.flatMap((job) => missingFrom(job, jobs))
  const notPassed = jobs.filter((job) => !hasPassed(job)).map(describeJob)
  return {
    workflow,
    commit,
    green: jobs.length > 0 && missing.length === 0 && notPassed.length === 0,
    declared: declared.map(({ name, uses }) =>
      uses ? `${name} (calls ${uses})` : name
    ),
    missing,
    notPassed,
    jobs: jobs.map(describeJob)
  }
}
