import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  closeHttpMocks,
  installHttpMocks
} from '../../test-support/http-mock.js'
import {
  BRANCH,
  FAKE_TOKEN,
  PROJECT_KEY,
  caseEnv,
  checkCases,
  createRepo,
  stageFakeTools
} from '../__fixtures__/push-check.js'
import {
  bashRecordingOf,
  collectedText,
  comparable,
  recordTimCase,
  serveSonarPullRequests
} from '../__fixtures__/push-check-runs.js'
import { projectKeyIn, runPushCheck } from './pipeline.js'

let mockPool

beforeEach(() => {
  ;({ mockPool } = installHttpMocks())
})

afterEach(() => {
  closeHttpMocks()
})

const runCase = (testCase, extra = {}) =>
  recordTimCase(testCase, async (paths) => {
    const env = caseEnv(paths, testCase)
    const stderr = collectedText()
    const { exitCode } = await runPushCheck({
      dir: paths.repo,
      env,
      token: env.SONAR_TOKEN,
      writeError: stderr.write,
      ...extra
    })
    return { exitCode, stderr: stderr.text() }
  })

const pushCases = checkCases.filter(({ command }) => command === undefined)

describe('#runPushCheck matches the Bash check', () => {
  test.each(pushCases.map((testCase) => [testCase.name, testCase]))(
    '%s',
    async (name, testCase) => {
      serveSonarPullRequests(mockPool, testCase)

      const recording = await runCase(testCase)

      expect(recording).toEqual(comparable(bashRecordingOf('check', name)))
    }
  )
})

describe('#runPushCheck', () => {
  test('analyses as the pull request given, without asking SonarCloud', async () => {
    const testCase = { name: 'flags' }

    const recording = await runCase(testCase, {
      pullRequest: '7',
      base: 'develop'
    })

    expect({
      scannerCall: recording.calls.split('\n').at(-2),
      askedSonarCloud: recording.stderr.includes("Can't ask SonarCloud")
    }).toEqual({
      scannerCall: `sonar-scanner -Dsonar.token=${FAKE_TOKEN} -Dsonar.host.url=https://sonarcloud.io -Dsonar.organization=defra -Dsonar.projectKey=${PROJECT_KEY} -Dsonar.qualitygate.wait=true -Dsonar.pullrequest.key=7 -Dsonar.pullrequest.branch=${BRANCH} -Dsonar.pullrequest.base=develop @ <HOME>/service`,
      askedSonarCloud: false
    })
  })

  test('checks the branch, and says why, when SonarCloud cannot be asked', async () => {
    mockPool('https://sonarcloud.io')
      .get('/api/project_pull_requests/list')
      .query(true)
      .reply(401)

    const recording = await runCase({ name: 'sonarcloud refuses' })

    expect({
      firstLine: recording.stderr.split('\n')[0],
      scannerScope: recording.calls.split('\n').at(-2).split(' ').at(-3)
    }).toEqual({
      firstLine: `Can't ask SonarCloud for this branch's pull request (listPullRequests(${PROJECT_KEY}): SonarCloud refused the request. Set SONAR_TOKEN to a SonarCloud token that can read this project.). Checking the branch instead.`,
      scannerScope: `-Dsonar.branch.name=${BRANCH}`
    })
  })

  test('blocks with the log tail when the build tool is not installed', async () => {
    const home = mkdtempSync(join(tmpdir(), 'tim-push-check-'))
    const repo = await createRepo(join(home, 'service'), { kind: 'java' })
    const bin = stageFakeTools(home)
    rmSync(join(bin, 'mvn'))
    const stderr = collectedText()

    const result = await runPushCheck({
      dir: repo,
      env: { ...caseEnv({ home, bin }, {}), FAKE_PR: undefined },
      token: FAKE_TOKEN,
      pullRequest: '1',
      base: 'main',
      writeError: stderr.write
    })
    rmSync(home, { recursive: true, force: true })

    expect({ exitCode: result.exitCode, stderr: stderr.text() }).toEqual({
      exitCode: 2,
      stderr: expect.stringContaining(
        `Failed: mvn. Last 60 lines of ${repo}/.cache/sonar-push-check.log:\nmvn: command not found\n\n`
      )
    })
  })

  test('reports the outcome, project and scope it ran', async () => {
    const testCase = { name: 'result' }
    serveSonarPullRequests(mockPool, { pullRequest: true })
    const home = mkdtempSync(join(tmpdir(), 'tim-push-check-'))
    const repo = await createRepo(join(home, 'service'))
    const bin = stageFakeTools(home)

    const result = await runPushCheck({
      dir: repo,
      env: caseEnv({ home, bin }, testCase),
      token: FAKE_TOKEN,
      writeError: () => {}
    })
    rmSync(home, { recursive: true, force: true })

    expect(result).toEqual({
      outcome: 'passed',
      exitCode: 0,
      project: PROJECT_KEY,
      pullRequest: '42',
      branch: BRANCH
    })
  })
})

describe('#projectKeyIn', () => {
  const withProperties = (text) => {
    const dir = mkdtempSync(join(tmpdir(), 'tim-project-key-'))
    if (text !== null) {
      writeFileSync(join(dir, 'sonar-project.properties'), text)
    }
    return dir
  }

  test.each([
    ['the key on its line', 'sonar.projectKey=DEFRA_x\n', 'DEFRA_x'],
    ['everything after the first equals sign', 'sonar.projectKey=a=b\n', 'a=b'],
    ['nothing for an empty key', 'sonar.projectKey=\n', null],
    ['nothing without the key', 'sonar.organization=defra\n', null],
    ['nothing for a commented key', '#sonar.projectKey=DEFRA_x\n', null],
    ['nothing without the file', null, null]
  ])('reads %s', (_title, text, key) => {
    const dir = withProperties(text)

    const found = projectKeyIn(dir)
    rmSync(dir, { recursive: true, force: true })

    expect(found).toBe(key)
  })
})
