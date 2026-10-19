import { describe, test, expect } from 'vitest'
import { execa } from 'execa'
import {
  GITHUB_REPO,
  GITHUB_REPO_PATH,
  mockGithubForEachTest
} from '../../test-support/github-mock.js'
import { TIM_CLI_PATH } from '../../test-support/tim-cli.js'
import { renderRunLog, runRunLog } from './run-log.js'

const github = mockGithubForEachTest()

const LOG_HOST = 'https://productionresultssa0.blob.core.windows.net'

const failedJob = {
  id: 701,
  run_id: 300,
  name: 'test',
  status: 'completed',
  conclusion: 'failure',
  html_url: 'https://github.com/x/job/701',
  steps: [{ name: 'Run tests', conclusion: 'failure' }]
}

describe('runRunLog', () => {
  test('returns the last lines of the failed job named by a check run id', async () => {
    github()
      .get(`${GITHUB_REPO_PATH}/actions/runs/701`)
      .reply(404, { message: 'Not Found' })
    github().get(`${GITHUB_REPO_PATH}/actions/jobs/701`).reply(200, failedJob)
    github()
      .get(`${GITHUB_REPO_PATH}/actions/jobs/701/logs`)
      .reply(302, '', { location: `${LOG_HOST}/701.txt` })
    github(LOG_HOST).get('/701.txt').reply(200, 'one\ntwo\nthree\n')

    const result = await runRunLog({
      repo: GITHUB_REPO,
      id: '701',
      failedOnly: true,
      lines: '2'
    })

    expect(result.jobs).toEqual([
      expect.objectContaining({
        id: 701,
        failedSteps: ['Run tests'],
        logTail: ['two', 'three']
      })
    ])
  })

  test('refuses an id that is not a whole number before sending any request', async () => {
    await expect(
      runRunLog({ repo: GITHUB_REPO, id: 'abc' })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: 'Give a workflow run id or check run id, for example 12345.'
    })
  })
})

describe('renderRunLog', () => {
  test('prints each job heading, its failed steps and its log tail', () => {
    const text = renderRunLog({
      runId: 300,
      jobs: [
        {
          id: 701,
          name: 'test',
          status: 'completed',
          conclusion: 'failure',
          url: 'https://github.com/x/job/701',
          failedSteps: ['Run tests'],
          logTail: ['FAIL src/a.test.js']
        }
      ]
    })

    expect(text).toBe(
      [
        '== test (job 701): failure  https://github.com/x/job/701',
        'Failed steps: Run tests',
        'FAIL src/a.test.js'
      ].join('\n')
    )
  })

  test('says an unfinished job has no log yet', () => {
    const text = renderRunLog({
      runId: 300,
      jobs: [
        {
          id: 700,
          name: 'e2e',
          status: 'in_progress',
          conclusion: null,
          url: 'u',
          failedSteps: [],
          logTail: []
        }
      ]
    })

    expect(text.split('\n')).toEqual([
      '== e2e (job 700): in_progress  u',
      'The job has not finished, so it has no log yet.'
    ])
  })

  test('says the run has no jobs to show when the list is empty', () => {
    expect(renderRunLog({ runId: 300, jobs: [] })).toBe(
      'Run 300 has no jobs to show.'
    )
  })
})

describe('tim github run-log', () => {
  test('exits 2 with a JSON USAGE error for a --lines of 0', async () => {
    const run = await execa(
      'node',
      [
        TIM_CLI_PATH,
        'github',
        'run-log',
        GITHUB_REPO,
        '300',
        '--lines',
        '0',
        '--json'
      ],
      { reject: false, env: { TIM_NO_AUTO_PULL: '1' } }
    )

    expect(run.exitCode).toBe(2)
    expect(JSON.parse(run.stdout).errors).toEqual([
      { code: 'USAGE', message: 'Give --lines as a whole number above 0.' }
    ])
  })
})
