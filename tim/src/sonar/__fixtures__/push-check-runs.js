import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normaliseRecordedText } from '../../test-support/bash-golden-harness.js'
import {
  BRANCH,
  PULL_REQUEST,
  recordAftermath,
  stageCase
} from './push-check.js'

const goldenFile = fileURLToPath(
  new URL('./__golden__/push-check.json', import.meta.url)
)

/**
 * The recording of a case as the Bash scripts ran it.
 *
 * @param {'check'|'gate'} route
 * @param {string} name
 */
export const bashRecordingOf = (route, name) =>
  JSON.parse(readFileSync(goldenFile, 'utf8')).find(
    (recording) => recording.route === route && recording.case === name
  )

const capturedPullRequests = () =>
  JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL(
          '../../test-support/fixtures/sonar/pull-requests.json',
          import.meta.url
        )
      ),
      'utf8'
    )
  )

/**
 * SonarCloud's pull request list for the fake service: the captured list,
 * with its first pull request moved onto {@link BRANCH} as
 * {@link PULL_REQUEST} when `withBranch` is set.
 */
export const pullRequestList = ({ withBranch }) => {
  const captured = capturedPullRequests()
  if (!withBranch) return captured
  const [first, ...rest] = captured.pullRequests
  return {
    pullRequests: [
      {
        ...first,
        key: PULL_REQUEST.key,
        branch: BRANCH,
        base: PULL_REQUEST.base
      },
      ...rest
    ]
  }
}

/**
 * Answers SonarCloud's pull request list for one case.
 *
 * @param {(origin: string) => import('nock').Scope} mockPool
 */
export const serveSonarPullRequests = (mockPool, testCase) =>
  mockPool('https://sonarcloud.io')
    .get('/api/project_pull_requests/list')
    .query(true)
    .reply(200, pullRequestList({ withBranch: Boolean(testCase.pullRequest) }))
    .persist()

/**
 * Stages a case in a fresh HOME, runs `act` and records what it did in
 * the shape the Bash recording has.
 *
 * @param {object} testCase
 * @param {(paths: {home: string, repo: string, bin: string}) => Promise<{exitCode: number, stderr: string}>} act
 */
export const recordTimCase = async (testCase, act) => {
  const home = mkdtempSync(join(tmpdir(), 'tim-push-check-'))
  try {
    const paths = await stageCase(home, testCase)
    const { exitCode, stderr } = await act(paths)
    return {
      exitCode,
      stdout: '',
      stderr: normaliseRecordedText(stderr, paths.home),
      ...(await recordAftermath(paths))
    }
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
}

/**
 * A `writeError` that keeps what it is given.
 */
export const collectedText = () => {
  const chunks = []
  return { write: (text) => chunks.push(text), text: () => chunks.join('') }
}

/**
 * A recording without the fields only a Bash run fills.
 */
export const comparable = ({ route: _route, case: _case, ...recording }) =>
  recording
