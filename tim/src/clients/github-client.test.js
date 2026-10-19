import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { installHttpMocks, closeHttpMocks } from '../test-support/http-mock.js'
import { createGithubClient } from './github-client.js'

const ORIGIN = 'https://api.github.com'

let mockPool

beforeEach(() => {
  ;({ mockPool } = installHttpMocks())
})

afterEach(() => {
  closeHttpMocks()
})

describe('createGithubClient', () => {
  test('throws TimError(AUTH) when no token is provided and GITHUB_TOKEN is unset', () => {
    const prev = process.env.GITHUB_TOKEN
    delete process.env.GITHUB_TOKEN
    try {
      expect(() => createGithubClient()).toThrowError(/Set GITHUB_TOKEN/)
    } finally {
      if (prev !== undefined) process.env.GITHUB_TOKEN = prev
    }
  })
})

describe('whoami', () => {
  test('returns the authenticated login and name', async () => {
    mockPool(ORIGIN)
      .get('/user')
      .reply(200, { login: 'sam', name: 'Sam Farrington' })
    const client = createGithubClient({ token: 't' })
    expect(await client.whoami()).toEqual({
      login: 'sam',
      name: 'Sam Farrington'
    })
  })

  test('maps a 401 to TimError(AUTH)', async () => {
    mockPool(ORIGIN).get('/user').reply(401, { message: 'Bad credentials' })
    const client = createGithubClient({ token: 't' })
    await expect(client.whoami()).rejects.toMatchObject({
      name: 'TimError',
      code: 'AUTH'
    })
  })
})

describe('findPrsForTicket', () => {
  test('returns parsed PRs for the given ticket id', async () => {
    mockPool(ORIGIN)
      .get('/search/issues')
      .query({ q: 'EUDPA-200 is:pr org:DEFRA', per_page: 100 })
      .reply(200, {
        items: [
          {
            number: 42,
            title: 'Add X',
            state: 'open',
            html_url:
              'https://github.com/DEFRA/trade-imports-animals-frontend/pull/42'
          }
        ]
      })

    const prs = await createGithubClient({ token: 't' }).findPrsForTicket(
      'EUDPA-200'
    )

    expect(prs).toEqual([
      {
        repo: 'trade-imports-animals-frontend',
        number: 42,
        title: 'Add X',
        url: 'https://github.com/DEFRA/trade-imports-animals-frontend/pull/42',
        state: 'open'
      }
    ])
  })
})

describe('getPr', () => {
  test('returns the parsed PR record for repo + number', async () => {
    mockPool(ORIGIN)
      .get('/repos/DEFRA/trade-imports-animals-frontend/pulls/42')
      .reply(200, {
        number: 42,
        title: 'Add X',
        state: 'open',
        html_url:
          'https://github.com/DEFRA/trade-imports-animals-frontend/pull/42',
        user: { login: 'sam' },
        body: 'description'
      })

    const pr = await createGithubClient({ token: 't' }).getPr(
      'trade-imports-animals-frontend',
      42
    )

    expect(pr).toEqual({
      repo: 'trade-imports-animals-frontend',
      number: 42,
      title: 'Add X',
      state: 'open',
      url: 'https://github.com/DEFRA/trade-imports-animals-frontend/pull/42',
      author: 'sam',
      body: 'description'
    })
  })

  test('maps 404 to TimError(NOT_FOUND)', async () => {
    mockPool(ORIGIN)
      .get('/repos/DEFRA/trade-imports-animals-frontend/pulls/999')
      .reply(404, { message: 'Not Found' })

    await expect(
      createGithubClient({ token: 't' }).getPr(
        'trade-imports-animals-frontend',
        999
      )
    ).rejects.toMatchObject({ name: 'TimError', code: 'NOT_FOUND' })
  })
})

describe('listWorkflowRuns', () => {
  test('returns parsed workflow runs filtered by branch', async () => {
    mockPool(ORIGIN)
      .get('/repos/DEFRA/trade-imports-animals-frontend/actions/runs')
      .query({ branch: 'feat/x', per_page: 5 })
      .reply(200, {
        workflow_runs: [
          {
            id: 99,
            name: 'check-pr',
            head_branch: 'feat/x',
            head_sha: 'abc123',
            status: 'completed',
            conclusion: 'success',
            html_url:
              'https://github.com/DEFRA/trade-imports-animals-frontend/actions/runs/99',
            created_at: '2026-06-08T10:00:00Z'
          }
        ]
      })

    const runs = await createGithubClient({ token: 't' }).listWorkflowRuns(
      'trade-imports-animals-frontend',
      { branch: 'feat/x', limit: 5 }
    )

    expect(runs).toEqual([
      {
        id: 99,
        name: 'check-pr',
        headBranch: 'feat/x',
        headSha: 'abc123',
        status: 'completed',
        conclusion: 'success',
        url: 'https://github.com/DEFRA/trade-imports-animals-frontend/actions/runs/99',
        createdAt: '2026-06-08T10:00:00Z'
      }
    ])
  })
})

describe('error mapping', () => {
  test('maps a 403 with a rate-limit body to TimError(RATE_LIMIT)', async () => {
    mockPool(ORIGIN).get('/user').reply(403, {
      message: 'API rate limit exceeded for user ID 1.',
      documentation_url: 'https://docs.github.com/'
    })
    const client = createGithubClient({ token: 't' })
    await expect(client.whoami()).rejects.toMatchObject({
      name: 'TimError',
      code: 'RATE_LIMIT'
    })
  })

  test('maps a generic 4xx/5xx to TimError(NETWORK)', async () => {
    mockPool(ORIGIN).get('/user').reply(500, { message: 'Internal error' })
    const client = createGithubClient({ token: 't' })
    await expect(client.whoami()).rejects.toMatchObject({
      name: 'TimError',
      code: 'NETWORK',
      message: expect.stringContaining('500')
    })
  })
})

describe('getPrDiff', () => {
  test('returns the diff as a string for repo + number', async () => {
    const diff = 'diff --git a/file.js b/file.js\n+const a = 1\n'
    mockPool(ORIGIN)
      .get('/repos/DEFRA/trade-imports-animals-frontend/pulls/42')
      .reply(200, diff, { 'content-type': 'application/vnd.github.v3.diff' })

    const result = await createGithubClient({ token: 't' }).getPrDiff(
      'trade-imports-animals-frontend',
      42
    )

    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('listWorkflowRuns filtered by workflow id', () => {
  test('hits the workflow-specific endpoint when a workflow id is supplied', async () => {
    mockPool(ORIGIN)
      .get(
        '/repos/DEFRA/trade-imports-animals-frontend/actions/workflows/ci.yml/runs'
      )
      .query({ per_page: 20, branch: 'main' })
      .reply(200, {
        workflow_runs: [
          {
            id: 7,
            name: 'ci',
            head_branch: 'main',
            head_sha: 'sha',
            status: 'completed',
            conclusion: 'success',
            html_url: 'https://github.com/x/y/actions/runs/7',
            created_at: '2026-06-08T10:00:00Z'
          }
        ]
      })

    const runs = await createGithubClient({ token: 't' }).listWorkflowRuns(
      'trade-imports-animals-frontend',
      { workflow: 'ci.yml', branch: 'main' }
    )

    expect(runs).toEqual([
      expect.objectContaining({ id: 7, name: 'ci', conclusion: 'success' })
    ])
  })
})

describe('getRunStatus', () => {
  test('returns the status and conclusion of a single run', async () => {
    mockPool(ORIGIN)
      .get('/repos/DEFRA/trade-imports-animals-frontend/actions/runs/99')
      .reply(200, {
        id: 99,
        status: 'in_progress',
        conclusion: null,
        html_url:
          'https://github.com/DEFRA/trade-imports-animals-frontend/actions/runs/99'
      })

    const status = await createGithubClient({ token: 't' }).getRunStatus(
      'trade-imports-animals-frontend',
      99
    )

    expect(status).toEqual({
      id: 99,
      status: 'in_progress',
      conclusion: null,
      url: 'https://github.com/DEFRA/trade-imports-animals-frontend/actions/runs/99'
    })
  })
})

const REPO = 'trade-imports-animals-frontend'
const REPO_PATH = `/repos/DEFRA/${REPO}`
const HEAD_SHA = 'abc1234def5678'

const prCreatedFrom = (body) => ({
  number: 51,
  html_url: `https://github.com/DEFRA/${REPO}/pull/51`,
  draft: body.draft,
  base: { ref: body.base }
})

describe('openPr', () => {
  test('opens a PR from the head branch and reports it as created', async () => {
    const sent = { body: null }
    mockPool(ORIGIN)
      .get(`${REPO_PATH}/pulls`)
      .query({ head: 'DEFRA:chore/NO_JIRA-x', state: 'open', per_page: 1 })
      .reply(200, [])
    mockPool(ORIGIN)
      .post(`${REPO_PATH}/pulls`, (body) => {
        sent.body = body
        return true
      })
      .reply(201, (_uri, body) => prCreatedFrom(body))

    const pr = await createGithubClient({ token: 't' }).openPr(REPO, {
      head: 'chore/NO_JIRA-x',
      base: 'main',
      title: 'Tidy the logs',
      body: 'Why it matters',
      draft: true
    })

    expect(sent.body).toEqual({
      head: 'chore/NO_JIRA-x',
      base: 'main',
      title: 'Tidy the logs',
      body: 'Why it matters',
      draft: true
    })
    expect(pr).toEqual({
      repo: REPO,
      number: 51,
      url: `https://github.com/DEFRA/${REPO}/pull/51`,
      head: 'chore/NO_JIRA-x',
      base: 'main',
      draft: true,
      created: true
    })
  })

  test('returns the open PR for the head branch instead of opening a second one', async () => {
    mockPool(ORIGIN)
      .get(`${REPO_PATH}/pulls`)
      .query({ head: 'DEFRA:chore/NO_JIRA-x', state: 'open', per_page: 1 })
      .reply(200, [
        {
          number: 40,
          html_url: `https://github.com/DEFRA/${REPO}/pull/40`,
          draft: false,
          base: { ref: 'main' }
        }
      ])

    const pr = await createGithubClient({ token: 't' }).openPr(REPO, {
      head: 'chore/NO_JIRA-x',
      base: 'main',
      title: 'Tidy the logs',
      body: 'Why it matters'
    })

    expect(pr).toEqual({
      repo: REPO,
      number: 40,
      url: `https://github.com/DEFRA/${REPO}/pull/40`,
      head: 'chore/NO_JIRA-x',
      base: 'main',
      draft: false,
      created: false
    })
  })

  test('maps a refused create to TimError(NETWORK) naming the status', async () => {
    mockPool(ORIGIN).get(`${REPO_PATH}/pulls`).query(true).reply(200, [])
    mockPool(ORIGIN)
      .post(`${REPO_PATH}/pulls`)
      .reply(422, { message: 'No commits between main and chore/NO_JIRA-x' })

    await expect(
      createGithubClient({ token: 't' }).openPr(REPO, {
        head: 'chore/NO_JIRA-x',
        base: 'main',
        title: 'Tidy the logs',
        body: ''
      })
    ).rejects.toMatchObject({
      code: 'NETWORK',
      message: `openPr(${REPO}, chore/NO_JIRA-x): GitHub returned 422.`
    })
  })
})

const replyWithChecks = (ref, { sha = ref, checkRuns = [], statuses = [] }) => {
  mockPool(ORIGIN)
    .get(`${REPO_PATH}/commits/${ref}/status`)
    .query({ per_page: 100 })
    .reply(200, { state: 'pending', sha, statuses })
  mockPool(ORIGIN)
    .get(`${REPO_PATH}/commits/${sha}/check-runs`)
    .query({ filter: 'latest', per_page: 100 })
    .reply(200, { total_count: checkRuns.length, check_runs: checkRuns })
}

describe('listChecks', () => {
  test("lists the check runs and commit statuses on a PR's head commit with an outcome each", async () => {
    mockPool(ORIGIN)
      .get(`${REPO_PATH}/pulls/51`)
      .reply(200, { number: 51, head: { sha: HEAD_SHA } })
    replyWithChecks(HEAD_SHA, {
      checkRuns: [
        {
          id: 1,
          name: 'Build',
          status: 'completed',
          conclusion: 'success',
          details_url: 'https://github.com/x/runs/1'
        },
        {
          id: 2,
          name: 'SonarCloud Code Analysis',
          status: 'completed',
          conclusion: 'failure',
          details_url: 'https://sonarcloud.io/x'
        },
        {
          id: 3,
          name: 'E2E',
          status: 'in_progress',
          conclusion: null,
          details_url: 'https://github.com/x/runs/3'
        }
      ],
      statuses: [
        {
          id: 9,
          context: 'snyk',
          state: 'error',
          target_url: 'https://snyk.io/x'
        }
      ]
    })

    const result = await createGithubClient({ token: 't' }).listChecks(
      REPO,
      '51'
    )

    expect(result).toEqual({
      repo: REPO,
      ref: '51',
      sha: HEAD_SHA,
      checks: [
        {
          kind: 'check',
          id: 1,
          name: 'Build',
          status: 'completed',
          conclusion: 'success',
          outcome: 'passed',
          url: 'https://github.com/x/runs/1'
        },
        {
          kind: 'check',
          id: 2,
          name: 'SonarCloud Code Analysis',
          status: 'completed',
          conclusion: 'failure',
          outcome: 'failed',
          url: 'https://sonarcloud.io/x'
        },
        {
          kind: 'check',
          id: 3,
          name: 'E2E',
          status: 'in_progress',
          conclusion: null,
          outcome: 'pending',
          url: 'https://github.com/x/runs/3'
        },
        {
          kind: 'status',
          id: 9,
          name: 'snyk',
          status: 'completed',
          conclusion: 'error',
          outcome: 'failed',
          url: 'https://snyk.io/x'
        }
      ]
    })
  })

  test('keeps only the newest check run of each name when a commit has been checked more than once', async () => {
    replyWithChecks(HEAD_SHA, {
      checkRuns: [
        {
          id: 20,
          name: 'e2e',
          status: 'completed',
          conclusion: 'success',
          details_url: 'https://github.com/x/runs/20'
        },
        {
          id: 10,
          name: 'e2e',
          status: 'completed',
          conclusion: 'failure',
          details_url: 'https://github.com/x/runs/10'
        }
      ]
    })

    const result = await createGithubClient({ token: 't' }).listChecks(
      REPO,
      HEAD_SHA
    )

    expect(result.checks.map(({ id, outcome }) => ({ id, outcome }))).toEqual([
      { id: 20, outcome: 'passed' }
    ])
  })

  test('resolves a branch to the sha of its head commit without looking up a PR', async () => {
    replyWithChecks('main', {
      sha: HEAD_SHA,
      checkRuns: [
        {
          id: 4,
          name: 'Lint',
          status: 'completed',
          conclusion: 'skipped',
          details_url: null,
          html_url: 'https://github.com/x/runs/4'
        }
      ]
    })

    const result = await createGithubClient({ token: 't' }).listChecks(
      REPO,
      'main'
    )

    expect(result.sha).toBe(HEAD_SHA)
    expect(result.checks).toEqual([
      expect.objectContaining({
        name: 'Lint',
        outcome: 'passed',
        url: 'https://github.com/x/runs/4'
      })
    ])
  })

  test('maps a missing PR to TimError(NOT_FOUND)', async () => {
    mockPool(ORIGIN)
      .get(`${REPO_PATH}/pulls/999`)
      .reply(404, { message: 'Not Found' })

    await expect(
      createGithubClient({ token: 't' }).listChecks(REPO, '999')
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

const LOG_HOST = 'https://productionresultssa0.blob.core.windows.net'

const replyWithJobLog = (jobId, text) => {
  mockPool(ORIGIN)
    .get(`${REPO_PATH}/actions/jobs/${jobId}/logs`)
    .reply(302, '', { location: `${LOG_HOST}/logs/${jobId}.txt` })
  mockPool(LOG_HOST)
    .get(`/logs/${jobId}.txt`)
    .reply(200, text, { 'content-type': 'text/plain' })
}

const job = (overrides) => ({
  id: 700,
  run_id: 300,
  name: 'build',
  status: 'completed',
  conclusion: 'success',
  html_url: 'https://github.com/x/job/700',
  steps: [],
  ...overrides
})

describe('getRunLog', () => {
  test('returns the log tail of only the failed jobs in a run, without timestamps', async () => {
    mockPool(ORIGIN)
      .get(`${REPO_PATH}/actions/runs/300`)
      .reply(200, { id: 300 })
    mockPool(ORIGIN)
      .get(`${REPO_PATH}/actions/runs/300/jobs`)
      .query({ filter: 'latest', per_page: 100 })
      .reply(200, {
        total_count: 2,
        jobs: [
          job({ id: 700 }),
          job({
            id: 701,
            name: 'test',
            conclusion: 'failure',
            html_url: 'https://github.com/x/job/701',
            steps: [
              { name: 'Install', conclusion: 'success' },
              { name: 'Run tests', conclusion: 'failure' }
            ]
          })
        ]
      })
    replyWithJobLog(
      701,
      '2026-10-19T10:00:00.1234567Z npm test\n2026-10-19T10:00:01.0000000Z FAIL src/a.test.js\n2026-10-19T10:00:02.0000000Z ##[error]Process completed with exit code 1.\n'
    )

    const result = await createGithubClient({ token: 't' }).getRunLog(
      REPO,
      300,
      { failedOnly: true, lines: 2 }
    )

    expect(result).toEqual({
      repo: REPO,
      runId: 300,
      jobs: [
        {
          id: 701,
          name: 'test',
          status: 'completed',
          conclusion: 'failure',
          url: 'https://github.com/x/job/701',
          failedSteps: ['Run tests'],
          logTail: [
            'FAIL src/a.test.js',
            '##[error]Process completed with exit code 1.'
          ]
        }
      ]
    })
  })

  test('reads one job when the id is a check run id rather than a run id', async () => {
    mockPool(ORIGIN)
      .get(`${REPO_PATH}/actions/runs/701`)
      .reply(404, { message: 'Not Found' })
    mockPool(ORIGIN)
      .get(`${REPO_PATH}/actions/jobs/701`)
      .reply(200, job({ id: 701, conclusion: 'failure' }))
    replyWithJobLog(701, 'only line\n')

    const result = await createGithubClient({ token: 't' }).getRunLog(REPO, 701)

    expect(result.runId).toBe(300)
    expect(result.jobs.map(({ id, logTail }) => ({ id, logTail }))).toEqual([
      { id: 701, logTail: ['only line'] }
    ])
  })

  test('ends the log tail at the last error line, leaving out the clean-up after it', async () => {
    mockPool(ORIGIN)
      .get(`${REPO_PATH}/actions/runs/701`)
      .reply(404, { message: 'Not Found' })
    mockPool(ORIGIN)
      .get(`${REPO_PATH}/actions/jobs/701`)
      .reply(200, job({ id: 701, conclusion: 'failure' }))
    replyWithJobLog(
      701,
      'npm test\nFAIL src/a.test.js\n##[error]Process completed with exit code 1.\nPost job cleanup.\nCleaning up orphan processes\n'
    )

    const result = await createGithubClient({ token: 't' }).getRunLog(
      REPO,
      701,
      { lines: 2 }
    )

    expect(result.jobs[0].logTail).toEqual([
      'FAIL src/a.test.js',
      '##[error]Process completed with exit code 1.'
    ])
  })

  test('gives an unfinished job an empty log tail instead of downloading it', async () => {
    mockPool(ORIGIN)
      .get(`${REPO_PATH}/actions/runs/300`)
      .reply(200, { id: 300 })
    mockPool(ORIGIN)
      .get(`${REPO_PATH}/actions/runs/300/jobs`)
      .query(true)
      .reply(200, {
        total_count: 1,
        jobs: [job({ status: 'in_progress', conclusion: null })]
      })

    const result = await createGithubClient({ token: 't' }).getRunLog(REPO, 300)

    expect(result.jobs).toEqual([
      expect.objectContaining({ id: 700, status: 'in_progress', logTail: [] })
    ])
  })

  test('says a non-Actions check has no log here when neither a run nor a job has the id', async () => {
    mockPool(ORIGIN)
      .get(`${REPO_PATH}/actions/runs/5`)
      .reply(404, { message: 'Not Found' })
    mockPool(ORIGIN)
      .get(`${REPO_PATH}/actions/jobs/5`)
      .reply(404, { message: 'Not Found' })

    await expect(
      createGithubClient({ token: 't' }).getRunLog(REPO, 5)
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: `Can't find a workflow run or job with id 5 in ${REPO}. A check from outside GitHub Actions, such as SonarCloud, has no log here: open its details URL instead.`
    })
  })
})

describe('rerun', () => {
  const recordPost = (path, sent) =>
    mockPool(ORIGIN)
      .post(path, () => {
        sent.push(path)
        return true
      })
      .reply(201, {})

  test('runs one job again when the id is a check run id', async () => {
    const sent = []
    mockPool(ORIGIN)
      .get(`${REPO_PATH}/actions/runs/701`)
      .reply(404, { message: 'Not Found' })
    mockPool(ORIGIN)
      .get(`${REPO_PATH}/actions/jobs/701`)
      .reply(200, job({ id: 701, conclusion: 'failure' }))
    recordPost(`${REPO_PATH}/actions/jobs/701/rerun`, sent)

    const result = await createGithubClient({ token: 't' }).rerun(REPO, 701)

    expect(sent).toEqual([`${REPO_PATH}/actions/jobs/701/rerun`])
    expect(result).toEqual({ repo: REPO, runId: 300, jobId: 701, scope: 'job' })
  })

  test('runs only the failed jobs of a run when asked to', async () => {
    const sent = []
    mockPool(ORIGIN)
      .get(`${REPO_PATH}/actions/runs/300`)
      .reply(200, { id: 300 })
    recordPost(`${REPO_PATH}/actions/runs/300/rerun-failed-jobs`, sent)

    const result = await createGithubClient({ token: 't' }).rerun(REPO, 300, {
      failedOnly: true
    })

    expect(sent).toEqual([`${REPO_PATH}/actions/runs/300/rerun-failed-jobs`])
    expect(result).toEqual({
      repo: REPO,
      runId: 300,
      jobId: null,
      scope: 'failed-jobs'
    })
  })

  test('runs every job of a run again by default', async () => {
    const sent = []
    mockPool(ORIGIN)
      .get(`${REPO_PATH}/actions/runs/300`)
      .reply(200, { id: 300 })
    recordPost(`${REPO_PATH}/actions/runs/300/rerun`, sent)

    const result = await createGithubClient({ token: 't' }).rerun(REPO, 300)

    expect(sent).toEqual([`${REPO_PATH}/actions/runs/300/rerun`])
    expect(result.scope).toBe('run')
  })

  test('says a non-Actions check cannot be run again when neither a run nor a job has the id', async () => {
    mockPool(ORIGIN)
      .get(`${REPO_PATH}/actions/runs/5`)
      .reply(404, { message: 'Not Found' })
    mockPool(ORIGIN)
      .get(`${REPO_PATH}/actions/jobs/5`)
      .reply(404, { message: 'Not Found' })

    await expect(
      createGithubClient({ token: 't' }).rerun(REPO, 5)
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: `Can't find a workflow run or job with id 5 in ${REPO}. A check from outside GitHub Actions, such as SonarCloud, can't be run again from here.`
    })
  })

  test('maps a refused rerun to TimError(NETWORK)', async () => {
    mockPool(ORIGIN)
      .get(`${REPO_PATH}/actions/runs/300`)
      .reply(200, { id: 300 })
    mockPool(ORIGIN)
      .post(`${REPO_PATH}/actions/runs/300/rerun`)
      .reply(403, { message: 'This workflow is already running' })

    await expect(
      createGithubClient({ token: 't' }).rerun(REPO, 300)
    ).rejects.toMatchObject({ code: 'NETWORK' })
  })
})
