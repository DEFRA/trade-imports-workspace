import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createSonarClient } from '../clients/sonar-client.js'
import { recordFolderFiles } from '../test-support/bash-golden-harness.js'
import { closeHttpMocks, installHttpMocks } from '../test-support/http-mock.js'
import {
  FIXED_NOW,
  goldenPath,
  stagePendingChecks
} from './__fixtures__/sonar-hooks.js'
import { settlePendingChecks } from './pending-check.js'

const SONARCLOUD = 'https://sonarcloud.io'
const frontend = 'DEFRA_trade-imports-animals-frontend'
const admin = 'DEFRA_trade-imports-animals-admin'

const bashRecordings = JSON.parse(
  readFileSync(new URL(goldenPath, import.meta.url), 'utf8')
)

const bashCheckOn = (event) =>
  bashRecordings.find(
    (recording) =>
      recording.case === 'check-pending' && recording.event === event
  )

const sonarFixture = (name) =>
  readFileSync(
    new URL(`../test-support/fixtures/sonar/${name}`, import.meta.url),
    'utf8'
  )

const issueSearch = (pullRequest) => ({
  componentKeys: frontend,
  issueStatuses: 'OPEN,CONFIRMED',
  ps: '500',
  pullRequest,
  severities: 'BLOCKER,CRITICAL'
})

let mockPool
let home

beforeEach(() => {
  ;({ mockPool } = installHttpMocks())
  home = mkdtempSync(join(tmpdir(), 'tim-pending-check-'))
})

afterEach(() => {
  closeHttpMocks()
  rmSync(home, { recursive: true, force: true })
})

const answerAsTheBashStandInDid = () => {
  const sonarCloud = mockPool(SONARCLOUD)
  sonarCloud
    .get('/api/project_pull_requests/list')
    .query({ project: frontend })
    .reply(200, sonarFixture('pull-requests.json'))
  sonarCloud
    .get('/api/project_pull_requests/list')
    .query({ project: admin })
    .reply(200, { pullRequests: [] })
  sonarCloud
    .get('/api/issues/search')
    .query(issueSearch('484'))
    .reply(200, sonarFixture('issues-pull-request.json'))
  sonarCloud
    .get('/api/issues/search')
    .query(issueSearch('485'))
    .reply(200, { total: 0, issues: [] })
  return sonarCloud
}

const settleOn = async (event) => {
  const folder = stagePendingChecks(home)
  const stdout = await settlePendingChecks({
    folder,
    event,
    client: createSonarClient({ token: undefined }),
    nowSeconds: FIXED_NOW
  })
  return { stdout, files: recordFolderFiles(folder, home) }
}

describe('#settlePendingChecks', () => {
  test.each(['UserPromptSubmit', 'SessionStart'])(
    'Should give the stdout and checks folder the Bash check gave on %s',
    async (event) => {
      answerAsTheBashStandInDid()

      const result = await settleOn(event)

      const bash = bashCheckOn(event)
      expect(result).toEqual({ stdout: bash.stdout, files: bash.files })
    }
  )

  test('Should drop only the expired checks and report nothing when SonarCloud cannot be reached', async () => {
    mockPool(SONARCLOUD)
      .get('/api/project_pull_requests/list')
      .query(true)
      .times(2)
      .replyWithError('connect ECONNREFUSED')

    const result = await settleOn('UserPromptSubmit')

    expect(result).toEqual({
      stdout: '',
      files: {
        [`pending__${admin}__cccccccccccccccccccccccccccccccccccccccc`]:
          'feat/no-push-time\n',
        [`pending__${frontend}__8ac42f0992109ab3f8202bde47e1c39514b1649f`]: `feat/EUDPA-696-overview-and-review\n${FIXED_NOW - 600}\n`,
        [`pending__${frontend}__aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`]: `feat/fresh\n${FIXED_NOW - 2699}\n`,
        [`pending__${frontend}__d7cf87ef31461d549759443b9fa1b9bb5ae59deb`]: `chore/NO_JIRA-bash-to-tim\n${FIXED_NOW - 600}\n`,
        [`pending__${frontend}__eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`]: `feat/EUDPA-696-overview-and-review\n${FIXED_NOW - 60}\n`,
        [`seen__${frontend}__dddddddddddddddddddddddddddddddddddddddd`]: ''
      }
    })
  })

  test('Should mark an analysed commit seen without reporting it when the issue search fails', async () => {
    const sonarCloud = mockPool(SONARCLOUD)
    sonarCloud
      .get('/api/project_pull_requests/list')
      .query(true)
      .times(2)
      .reply(200, sonarFixture('pull-requests.json'))
    sonarCloud.get('/api/issues/search').query(true).times(2).reply(500)

    const result = await settleOn('UserPromptSubmit')

    expect({
      stdout: result.stdout,
      seen: Object.keys(result.files).filter((name) =>
        name.startsWith('seen__')
      )
    }).toEqual({
      stdout: '',
      seen: [
        `seen__${frontend}__8ac42f0992109ab3f8202bde47e1c39514b1649f`,
        `seen__${frontend}__d7cf87ef31461d549759443b9fa1b9bb5ae59deb`,
        `seen__${frontend}__dddddddddddddddddddddddddddddddddddddddd`
      ]
    })
  })
})
