import { describe, test, expect } from 'vitest'
import { execa } from 'execa'
import {
  GITHUB_REPO,
  GITHUB_REPO_PATH,
  mockGithubForEachTest
} from '../../test-support/github-mock.js'
import { TIM_CLI_PATH } from '../../test-support/tim-cli.js'
import { renderRerun, runRerun } from './rerun.js'

const github = mockGithubForEachTest()

describe('runRerun', () => {
  test('runs the failed jobs of a run again when given a run id and --failed-only', async () => {
    const sent = []
    github().get(`${GITHUB_REPO_PATH}/actions/runs/300`).reply(200, { id: 300 })
    github()
      .post(`${GITHUB_REPO_PATH}/actions/runs/300/rerun-failed-jobs`, () => {
        sent.push('rerun-failed-jobs')
        return true
      })
      .reply(201, {})

    const result = await runRerun({
      repo: GITHUB_REPO,
      id: '300',
      failedOnly: true
    })

    expect(sent).toEqual(['rerun-failed-jobs'])
    expect(result).toEqual({
      repo: GITHUB_REPO,
      runId: 300,
      jobId: null,
      scope: 'failed-jobs'
    })
  })

  test('refuses an id that is not a whole number before sending any request', async () => {
    await expect(
      runRerun({ repo: GITHUB_REPO, id: 'abc' })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: 'Give a workflow run id or check run id, for example 12345.'
    })
  })
})

describe('renderRerun', () => {
  test('names the job and its run when one job was started again', () => {
    expect(
      renderRerun({ repo: 'r', runId: 300, jobId: 701, scope: 'job' })
    ).toBe('Started job 701 in run 300 again in r.')
  })

  test('says only the failed jobs were started again', () => {
    expect(
      renderRerun({ repo: 'r', runId: 300, jobId: null, scope: 'failed-jobs' })
    ).toBe('Started the failed jobs in run 300 again in r.')
  })

  test('says every job was started again', () => {
    expect(
      renderRerun({ repo: 'r', runId: 300, jobId: null, scope: 'run' })
    ).toBe('Started every job in run 300 again in r.')
  })
})

describe('tim github rerun', () => {
  test('exits 2 with a JSON USAGE error for a repo given with the DEFRA/ prefix', async () => {
    const run = await execa(
      'node',
      [
        TIM_CLI_PATH,
        'github',
        'rerun',
        `DEFRA/${GITHUB_REPO}`,
        '300',
        '--json'
      ],
      { reject: false, env: { TIM_NO_AUTO_PULL: '1' } }
    )

    expect(run.exitCode).toBe(2)
    expect(JSON.parse(run.stdout).errors).toEqual([
      {
        code: 'USAGE',
        message:
          'Give the repo name without the DEFRA/ prefix, for example trade-imports-animals-frontend.'
      }
    ])
  })
})
