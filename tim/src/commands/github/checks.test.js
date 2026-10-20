import { describe, test, expect } from 'vitest'
import { execa } from 'execa'
import {
  GITHUB_REPO,
  GITHUB_REPO_PATH,
  mockGithubForEachTest
} from '../../test-support/github-mock.js'
import { TIM_CLI_PATH } from '../../test-support/tim-cli.js'
import { exitCodeForChecks, renderChecks, runChecks } from './checks.js'

const github = mockGithubForEachTest()

const SHA = 'abc1234def5678'
const FAST_POLL = { intervalSeconds: 0.001, timeoutSeconds: 5 }

const checkRun = (id, name, status, conclusion) => ({
  id,
  name,
  status,
  conclusion,
  details_url: `https://github.com/x/runs/${id}`
})

const BUILD_PASSED = checkRun(1, 'Build', 'completed', 'success')
const SONAR_PASSED = checkRun(
  2,
  'SonarCloud Code Analysis',
  'completed',
  'success'
)
const SONAR_FAILED = checkRun(
  2,
  'SonarCloud Code Analysis',
  'completed',
  'failure'
)
const E2E_RUNNING = checkRun(3, 'E2E', 'in_progress', null)

const prHeadIs = (sha) =>
  github().get(`${GITHUB_REPO_PATH}/pulls/51`).reply(200, { head: { sha } })

const pollSees = (checkRuns, statuses = []) => {
  prHeadIs(SHA)
  github()
    .get(`${GITHUB_REPO_PATH}/commits/${SHA}/check-runs`)
    .query(true)
    .reply(200, { total_count: checkRuns.length, check_runs: checkRuns })
  github()
    .get(`${GITHUB_REPO_PATH}/commits/${SHA}/status`)
    .query(true)
    .reply(200, { sha: SHA, statuses })
}

describe('runChecks', () => {
  test('lists the checks once with counts, an overall outcome and the SonarCloud gate', async () => {
    pollSees([BUILD_PASSED, SONAR_FAILED, E2E_RUNNING])

    const result = await runChecks({ repo: GITHUB_REPO, ref: '51' })

    expect(result).toEqual(
      expect.objectContaining({
        sha: SHA,
        outcome: 'pending',
        counts: { passed: 1, failed: 1, pending: 1 },
        sonarGate: { outcome: 'failed', url: 'https://github.com/x/runs/2' },
        timedOut: false
      })
    )
  })

  test('counts a commit with no checks yet as pending', async () => {
    pollSees([])

    const result = await runChecks({ repo: GITHUB_REPO, ref: '51' })

    expect(result.outcome).toBe('pending')
  })

  test('watches until nothing is pending and reports a failure as soon as it settles', async () => {
    pollSees([BUILD_PASSED, E2E_RUNNING])
    pollSees([BUILD_PASSED, checkRun(3, 'E2E', 'completed', 'failure')])

    const result = await runChecks({
      repo: GITHUB_REPO,
      ref: '51',
      watch: true,
      ...FAST_POLL
    })

    expect(result).toEqual(
      expect.objectContaining({
        outcome: 'failed',
        counts: { passed: 1, failed: 1, pending: 0 },
        timedOut: false
      })
    )
  })

  test('reports a pass only after a second poll sees the same checks, so a late check is not missed', async () => {
    pollSees([BUILD_PASSED])
    pollSees([BUILD_PASSED, SONAR_PASSED])
    pollSees([BUILD_PASSED, SONAR_PASSED])

    const result = await runChecks({
      repo: GITHUB_REPO,
      ref: '51',
      watch: true,
      ...FAST_POLL
    })

    expect(result.outcome).toBe('passed')
    expect(result.checks.map(({ name }) => name)).toEqual([
      'Build',
      'SonarCloud Code Analysis'
    ])
  })

  test('stops at the timeout and marks the result as timed out while checks are pending', async () => {
    pollSees([E2E_RUNNING])

    const result = await runChecks({
      repo: GITHUB_REPO,
      ref: '51',
      watch: true,
      intervalSeconds: 10,
      timeoutSeconds: 1
    })

    expect(result).toEqual(
      expect.objectContaining({ outcome: 'pending', timedOut: true })
    )
  })

  test('refuses a timeout that is not a number of seconds', async () => {
    await expect(
      runChecks({ repo: GITHUB_REPO, ref: '51', timeoutSeconds: 'soon' })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: 'Give --timeout as a number of seconds.'
    })
  })
})

describe('exitCodeForChecks', () => {
  test('maps a watched outcome to 0 for passed, 1 for failed and 2 for pending', () => {
    const codes = ['passed', 'failed', 'pending'].map((outcome) =>
      exitCodeForChecks({ outcome }, { watch: true })
    )

    expect(codes).toEqual([0, 1, 2])
  })

  test('exits 0 for any outcome when not watching', () => {
    expect(exitCodeForChecks({ outcome: 'failed' }, { watch: false })).toBe(0)
  })
})

describe('renderChecks', () => {
  const result = {
    repo: GITHUB_REPO,
    ref: '51',
    sha: SHA,
    outcome: 'failed',
    counts: { passed: 1, failed: 1, pending: 0 },
    sonarGate: { outcome: 'failed', url: 'https://sonarcloud.io/x' },
    timedOut: false,
    checks: [
      {
        kind: 'check',
        id: 1,
        name: 'Build',
        outcome: 'passed',
        url: 'https://github.com/x/runs/1'
      },
      {
        kind: 'status',
        id: 9,
        name: 'snyk',
        outcome: 'failed',
        url: null
      }
    ]
  }

  test('prints a headline, the SonarCloud gate and one line per check with its id', () => {
    expect(renderChecks(result)).toBe(
      [
        `${GITHUB_REPO} 51 at abc1234: failed (1 passed, 1 failed, 0 pending)`,
        'SonarCloud gate: failed',
        '  passed  Build (check 1)  https://github.com/x/runs/1',
        '  failed  snyk (status 9)'
      ].join('\n')
    )
  })

  test('says no checks have reported when the list is empty', () => {
    expect(renderChecks({ ...result, checks: [] })).toBe(
      `No checks have reported on ${GITHUB_REPO} 51 at abc1234 yet.`
    )
  })

  test('ends with a timeout line when the watch timed out', () => {
    expect(
      renderChecks({ ...result, timedOut: true })
        .split('\n')
        .at(-1)
    ).toBe('Checks were still pending when the watch timed out.')
  })
})

describe('tim github checks', () => {
  test('exits 2 with a JSON USAGE error for an interval of 0', async () => {
    const run = await execa(
      'node',
      [
        TIM_CLI_PATH,
        'github',
        'checks',
        GITHUB_REPO,
        '51',
        '--watch',
        '--interval',
        '0',
        '--json'
      ],
      { reject: false, env: { TIM_NO_AUTO_PULL: '1' } }
    )

    expect(run.exitCode).toBe(2)
    expect(JSON.parse(run.stdout).errors).toEqual([
      {
        code: 'USAGE',
        message: 'Give --interval as a number of seconds above 0.'
      }
    ])
  })
})
