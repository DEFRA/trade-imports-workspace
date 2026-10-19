import { Octokit } from '@octokit/rest'
import { TimError, isTimError } from '../errors.js'

const DEFAULT_ORG = 'DEFRA'

const mapError = (error, action) => {
  if (isTimError(error)) return error
  const status = error?.status ?? error?.response?.status
  if (status === 401) {
    return new TimError(
      'AUTH',
      'GitHub rejected the token. Refresh with `gh auth login` or set GITHUB_TOKEN.',
      error
    )
  }
  if (status === 404) {
    return new TimError('NOT_FOUND', `${action}: not found.`, error)
  }
  if (status === 403 && /rate limit/i.test(error?.message ?? '')) {
    return new TimError(
      'RATE_LIMIT',
      `${action}: GitHub rate limit hit.`,
      error
    )
  }
  if (status >= 400) {
    return new TimError(
      'NETWORK',
      `${action}: GitHub returned ${status}.`,
      error
    )
  }
  return new TimError(
    'UNKNOWN',
    `${action}: ${error?.message ?? 'unknown error'}.`,
    error
  )
}

const PASSED_CONCLUSIONS = new Set(['success', 'neutral', 'skipped'])
const LOG_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z /
const ALL_DIGITS = /^\d+$/

const outcomeOfCheckRun = ({ status, conclusion }) => {
  if (status !== 'completed') return 'pending'
  return PASSED_CONCLUSIONS.has(conclusion) ? 'passed' : 'failed'
}

const OUTCOME_BY_STATUS_STATE = {
  pending: 'pending',
  success: 'passed',
  failure: 'failed',
  error: 'failed'
}

const checkFromCheckRun = (run) => ({
  kind: 'check',
  id: run.id,
  name: run.name,
  status: run.status,
  conclusion: run.conclusion,
  outcome: outcomeOfCheckRun(run),
  url: run.details_url ?? run.html_url ?? null
})

const checkFromCommitStatus = (status) => ({
  kind: 'status',
  id: status.id,
  name: status.context,
  status: status.state === 'pending' ? 'pending' : 'completed',
  conclusion: status.state === 'pending' ? null : status.state,
  outcome: OUTCOME_BY_STATUS_STATE[status.state] ?? 'failed',
  url: status.target_url ?? null
})

const newestRunPerName = (checkRuns) => [
  ...checkRuns
    .reduce((byName, run) => {
      const kept = byName.get(run.name)
      return kept && kept.id > run.id ? byName : byName.set(run.name, run)
    }, new Map())
    .values()
]

const isNotFound = (error) => (error?.status ?? error?.response?.status) === 404

const logWithoutRequestErrors = {
  debug: () => {},
  info: () => {},
  warn: (...args) => console.warn(...args),
  error: () => {}
}

const ERROR_ANNOTATION = '##[error]'

const logLinesOf = (log) =>
  String(log ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(LOG_TIMESTAMP, ''))
    .filter((line, index, all) => index < all.length - 1 || line !== '')

const tailEndingAtLastError = (log, lines) => {
  const all = logLinesOf(log)
  const lastError = all.findLastIndex((line) =>
    line.startsWith(ERROR_ANNOTATION)
  )
  const end = lastError === -1 ? all.length : lastError + 1
  return all.slice(Math.max(0, end - lines), end)
}

const jobSummary = (job) => ({
  id: job.id,
  name: job.name,
  status: job.status,
  conclusion: job.conclusion,
  url: job.html_url,
  failedSteps: (job.steps ?? [])
    .filter((step) => step.conclusion === 'failure')
    .map((step) => step.name)
})

const parseRepoFullName = (htmlUrl) => {
  const match = htmlUrl?.match(
    /github\.com\/([^/]+)\/([^/]+)\/(?:pull|issues)\//
  )
  return match ? { owner: match[1], repo: match[2] } : null
}

/**
 * Create a GitHub client. Token comes from the explicit `token` option,
 * falling back to GITHUB_TOKEN. Callers that need a `gh auth token`
 * fallback should do it before calling this factory.
 *
 * @param {object} [opts]
 * @param {string} [opts.token]
 * @param {string} [opts.org]
 * @returns {object} client with whoami / findPrsForTicket / getPr / getPrDiff
 *   / listWorkflowRuns / openPr / listChecks / getRunLog / getRunStatus methods
 * @throws {TimError} AUTH when no token is provided
 */
export const createGithubClient = ({
  token = process.env.GITHUB_TOKEN,
  org = DEFAULT_ORG
} = {}) => {
  if (!token) {
    throw new TimError(
      'AUTH',
      'Set GITHUB_TOKEN, or sign in with `gh auth login` and try again.'
    )
  }
  const octokit = new Octokit({ auth: token, log: logWithoutRequestErrors })

  const wrap = async (action, fn) => {
    try {
      return await fn()
    } catch (error) {
      throw mapError(error, action)
    }
  }

  const findOpenPrForHead = async (repo, head) => {
    const { data } = await octokit.pulls.list({
      owner: org,
      repo,
      head: `${org}:${head}`,
      state: 'open',
      per_page: 1
    })
    return data[0] ?? null
  }

  const createPr = async (repo, { head, base, title, body, draft }) => {
    const { data } = await octokit.pulls.create({
      owner: org,
      repo,
      head,
      base,
      title,
      body,
      draft
    })
    return data
  }

  const prHeadOrRef = async (repo, prOrRef) => {
    if (!ALL_DIGITS.test(String(prOrRef))) return String(prOrRef)
    const { data } = await octokit.pulls.get({
      owner: org,
      repo,
      pull_number: Number(prOrRef)
    })
    return data.head.sha
  }

  const listCheckRuns = (repo, sha) =>
    octokit.paginate(octokit.checks.listForRef, {
      owner: org,
      repo,
      ref: sha,
      filter: 'latest',
      per_page: 100
    })

  const commitStatusesAt = async (repo, ref) => {
    const { data } = await octokit.repos.getCombinedStatusForRef({
      owner: org,
      repo,
      ref,
      per_page: 100
    })
    return { sha: data.sha, statuses: data.statuses ?? [] }
  }

  const jobsOfRun = async (repo, id) => {
    try {
      await octokit.actions.getWorkflowRun({ owner: org, repo, run_id: id })
    } catch (error) {
      if (!isNotFound(error)) throw error
      const { data } = await octokit.actions.getJobForWorkflowRun({
        owner: org,
        repo,
        job_id: id
      })
      return { runId: data.run_id, jobs: [data] }
    }
    const jobs = await octokit.paginate(
      octokit.actions.listJobsForWorkflowRun,
      { owner: org, repo, run_id: id, filter: 'latest', per_page: 100 }
    )
    return { runId: id, jobs }
  }

  const jobLog = async (repo, jobId) => {
    const { data } = await octokit.actions.downloadJobLogsForWorkflowRun({
      owner: org,
      repo,
      job_id: jobId
    })
    return typeof data === 'string' ? data : Buffer.from(data).toString('utf8')
  }

  return {
    whoami: () =>
      wrap('whoami', async () => {
        const { data } = await octokit.users.getAuthenticated()
        return { login: data.login, name: data.name }
      }),

    findPrsForTicket: (ticketId) =>
      wrap(`findPrsForTicket(${ticketId})`, async () => {
        const q = `${ticketId} is:pr org:${org}`
        const { data } = await octokit.search.issuesAndPullRequests({
          q,
          per_page: 100
        })
        return data.items.map((item) => {
          const repoInfo = parseRepoFullName(item.html_url)
          return {
            repo: repoInfo?.repo ?? null,
            number: item.number,
            title: item.title,
            url: item.html_url,
            state: item.state
          }
        })
      }),

    getPr: (repo, number) =>
      wrap(`getPr(${repo}, ${number})`, async () => {
        const { data } = await octokit.pulls.get({
          owner: org,
          repo,
          pull_number: number
        })
        return {
          repo,
          number: data.number,
          title: data.title,
          state: data.state,
          url: data.html_url,
          author: data.user?.login ?? null,
          body: data.body ?? ''
        }
      }),

    getPrDiff: (repo, number) =>
      wrap(`getPrDiff(${repo}, ${number})`, async () => {
        const { data } = await octokit.pulls.get({
          owner: org,
          repo,
          pull_number: number,
          mediaType: { format: 'diff' }
        })
        return typeof data === 'string' ? data : String(data ?? '')
      }),

    listWorkflowRuns: (repo, { branch, workflow, limit = 20 } = {}) =>
      wrap(`listWorkflowRuns(${repo})`, async () => {
        const params = {
          owner: org,
          repo,
          per_page: limit
        }
        if (branch) params.branch = branch
        const callee = workflow
          ? () =>
              octokit.actions.listWorkflowRuns({
                ...params,
                workflow_id: workflow
              })
          : () => octokit.actions.listWorkflowRunsForRepo(params)
        const { data } = await callee()
        return data.workflow_runs.map((r) => ({
          id: r.id,
          name: r.name,
          headBranch: r.head_branch,
          headSha: r.head_sha,
          status: r.status,
          conclusion: r.conclusion,
          url: r.html_url,
          createdAt: r.created_at
        }))
      }),

    openPr: (repo, { head, base, title, body, draft = false }) =>
      wrap(`openPr(${repo}, ${head})`, async () => {
        const existing = await findOpenPrForHead(repo, head)
        const pr =
          existing ?? (await createPr(repo, { head, base, title, body, draft }))
        return {
          repo,
          number: pr.number,
          url: pr.html_url,
          head,
          base: pr.base?.ref ?? base,
          draft: pr.draft ?? draft,
          created: !existing
        }
      }),

    listChecks: (repo, prOrRef) =>
      wrap(`listChecks(${repo}, ${prOrRef})`, async () => {
        const ref = await prHeadOrRef(repo, prOrRef)
        const { sha, statuses } = await commitStatusesAt(repo, ref)
        const checkRuns = await listCheckRuns(repo, sha)
        return {
          repo,
          ref: String(prOrRef),
          sha,
          checks: [
            ...newestRunPerName(checkRuns).map(checkFromCheckRun),
            ...statuses.map(checkFromCommitStatus)
          ]
        }
      }),

    getRunLog: (repo, id, { failedOnly = false, lines = 100 } = {}) =>
      wrap(`getRunLog(${repo}, ${id})`, async () => {
        const { runId, jobs } = await jobsOfRun(repo, id).catch((error) => {
          if (!isNotFound(error)) throw error
          throw new TimError(
            'NOT_FOUND',
            `Can't find a workflow run or job with id ${id} in ${repo}. A check from outside GitHub Actions, such as SonarCloud, has no log here: open its details URL instead.`,
            error
          )
        })
        const chosen = failedOnly
          ? jobs.filter((job) => job.conclusion === 'failure')
          : jobs
        const withLogs = await Promise.all(
          chosen.map(async (job) => ({
            ...jobSummary(job),
            logTail:
              job.status === 'completed'
                ? tailEndingAtLastError(await jobLog(repo, job.id), lines)
                : []
          }))
        )
        return { repo, runId, jobs: withLogs }
      }),

    getRunStatus: (repo, runId) =>
      wrap(`getRunStatus(${repo}, ${runId})`, async () => {
        const { data } = await octokit.actions.getWorkflowRun({
          owner: org,
          repo,
          run_id: runId
        })
        return {
          id: data.id,
          status: data.status,
          conclusion: data.conclusion,
          url: data.html_url
        }
      })
  }
}
