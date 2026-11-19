import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { installHttpMocks, closeHttpMocks } from '../test-support/http-mock.js'
import { createSonarClient } from './sonar-client.js'

const sonarFixture = (name) =>
  JSON.parse(
    readFileSync(
      new URL(`../test-support/fixtures/sonar/${name}`, import.meta.url),
      'utf8'
    )
  )

const BASE = 'https://sonarcloud.io'
const PROJECT = 'DEFRA_trade-imports-plants-frontend'
let mockPool

beforeEach(() => {
  ;({ mockPool } = installHttpMocks())
})

afterEach(() => {
  closeHttpMocks()
})

const issue = {
  key: 'AZ1',
  rule: 'javascript:S6544',
  severity: 'MAJOR',
  type: 'BUG',
  component: `${PROJECT}:src/server/app/kit.js`,
  line: 42,
  message:
    'Promise returned in function argument where a void return was expected.'
}

const searchQuery = (scope) => ({
  componentKeys: PROJECT,
  issueStatuses: 'OPEN,CONFIRMED',
  ps: '500',
  ...scope
})

describe('listIssues', () => {
  test('returns the open issues on a pull request with file, line and link', async () => {
    mockPool(BASE)
      .get('/api/issues/search')
      .query(searchQuery({ pullRequest: '108' }))
      .reply(200, { total: 1, issues: [issue] })

    const result = await createSonarClient({ token: '' }).listIssues(
      'trade-imports-plants-frontend',
      { pullRequest: 108 }
    )

    expect(result).toEqual({
      project: PROJECT,
      pullRequest: '108',
      branch: null,
      total: 1,
      issues: [
        {
          key: 'AZ1',
          rule: 'javascript:S6544',
          severity: 'MAJOR',
          type: 'BUG',
          file: 'src/server/app/kit.js',
          line: 42,
          message: issue.message,
          url: `${BASE}/project/issues?id=${PROJECT}&pullRequest=108&open=AZ1`
        }
      ]
    })
  })

  test('takes a project key that already has the DEFRA_ prefix, and a branch', async () => {
    mockPool(BASE)
      .get('/api/issues/search')
      .query(searchQuery({ branch: 'main' }))
      .reply(200, { total: 0, issues: [] })

    const result = await createSonarClient({ token: '' }).listIssues(PROJECT, {
      branch: 'main'
    })

    expect(result).toMatchObject({ project: PROJECT, branch: 'main', total: 0 })
  })

  test('gives a file-level issue a null line', async () => {
    const { line: _line, ...fileLevel } = issue
    mockPool(BASE)
      .get('/api/issues/search')
      .query(true)
      .reply(200, { total: 1, issues: [fileLevel] })

    const result = await createSonarClient({ token: '' }).listIssues(PROJECT)

    expect(result.issues[0].line).toBeNull()
  })

  test('asks only for the severities given, and takes the line from the text range', async () => {
    const frontend = 'DEFRA_trade-imports-animals-frontend'
    mockPool(BASE)
      .get('/api/issues/search')
      .query({
        componentKeys: frontend,
        issueStatuses: 'OPEN,CONFIRMED',
        ps: '500',
        pullRequest: '484',
        severities: 'BLOCKER,CRITICAL'
      })
      .reply(200, sonarFixture('issues-pull-request.json'))

    const result = await createSonarClient({ token: '' }).listIssues(frontend, {
      pullRequest: '484',
      severities: ['BLOCKER', 'CRITICAL']
    })

    expect(result.issues).toEqual([
      {
        key: 'AaHY03BCGiVmDmX-rkCL',
        rule: 'javascript:S7750',
        severity: 'CRITICAL',
        type: 'CODE_SMELL',
        file: 'src/server/app/bridge/collection-complete.js',
        line: 12,
        message: 'Prefer `.findLast(…)` over `.filter(…).at(-1)`.',
        url: `${BASE}/project/issues?id=${frontend}&pullRequest=484&open=AaHY03BCGiVmDmX-rkCL`
      }
    ])
  })

  test('sends SONAR_TOKEN as a bearer token when one is set', async () => {
    mockPool(BASE)
      .get('/api/issues/search')
      .query(true)
      .matchHeader('authorization', 'Bearer secret')
      .reply(200, { total: 0, issues: [] })

    const result = await createSonarClient({ token: 'secret' }).listIssues(
      PROJECT
    )

    expect(result.total).toBe(0)
  })

  test.each([
    [401, 'AUTH', /SONAR_TOKEN/],
    [403, 'AUTH', /SONAR_TOKEN/],
    [404, 'NOT_FOUND', /can't find/],
    [429, 'RATE_LIMIT', /rate limited/],
    [500, 'NETWORK', /returned 500/]
  ])('maps a %s response to TimError(%s)', async (status, code, message) => {
    mockPool(BASE).get('/api/issues/search').query(true).reply(status, {})

    await expect(
      createSonarClient({ token: '' }).listIssues(PROJECT)
    ).rejects.toMatchObject({ code, message: expect.stringMatching(message) })
  })

  test('maps a body that is not JSON to TimError(PARSE)', async () => {
    mockPool(BASE).get('/api/issues/search').query(true).reply(200, 'not json')

    await expect(
      createSonarClient({ token: '' }).listIssues(PROJECT)
    ).rejects.toMatchObject({ code: 'PARSE' })
  })
})

describe('listPullRequests', () => {
  const frontend = 'DEFRA_trade-imports-animals-frontend'

  test('returns each pull request with its branch, base and analysed commit', async () => {
    mockPool(BASE)
      .get('/api/project_pull_requests/list')
      .query({ project: frontend })
      .reply(200, sonarFixture('pull-requests.json'))

    const result = await createSonarClient({ token: '' }).listPullRequests(
      'trade-imports-animals-frontend'
    )

    expect(result).toEqual({
      project: frontend,
      pullRequests: [
        {
          key: '484',
          branch: 'feat/EUDPA-696-overview-and-review',
          base: 'main',
          sha: '8ac42f0992109ab3f8202bde47e1c39514b1649f'
        },
        {
          key: '485',
          branch: 'chore/NO_JIRA-bash-to-tim',
          base: 'main',
          sha: 'd7cf87ef31461d549759443b9fa1b9bb5ae59deb'
        },
        {
          key: '312',
          branch: 'feat/EUDPA-312-not-analysed',
          base: 'main',
          sha: null
        }
      ]
    })
  })

  test('returns no pull requests when SonarCloud lists none', async () => {
    mockPool(BASE)
      .get('/api/project_pull_requests/list')
      .query(true)
      .reply(200, {})

    const result = await createSonarClient({ token: '' }).listPullRequests(
      frontend
    )

    expect(result.pullRequests).toEqual([])
  })

  test('sends SONAR_TOKEN as a bearer token when one is set', async () => {
    mockPool(BASE)
      .get('/api/project_pull_requests/list')
      .query(true)
      .matchHeader('authorization', 'Bearer secret')
      .reply(200, { pullRequests: [] })

    const result = await createSonarClient({
      token: 'secret'
    }).listPullRequests(frontend)

    expect(result.pullRequests).toEqual([])
  })

  test.each([
    [401, 'AUTH'],
    [404, 'NOT_FOUND'],
    [429, 'RATE_LIMIT']
  ])('maps a %s response to TimError(%s)', async (status, code) => {
    mockPool(BASE)
      .get('/api/project_pull_requests/list')
      .query(true)
      .reply(status, {})

    await expect(
      createSonarClient({ token: '' }).listPullRequests(frontend)
    ).rejects.toMatchObject({
      code,
      message: expect.stringMatching(/^listPullRequests\(/)
    })
  })
})

describe('qualityGate', () => {
  const condition = (over) => ({
    status: 'OK',
    metricKey: 'new_coverage',
    comparator: 'LT',
    periodIndex: 1,
    errorThreshold: '90',
    actualValue: '97.9',
    ...over
  })

  test('returns the status and every condition the gate weighed on a pull request', async () => {
    mockPool(BASE)
      .get('/api/qualitygates/project_status')
      .query({ projectKey: PROJECT, pullRequest: '435' })
      .reply(200, {
        projectStatus: { status: 'OK', conditions: [condition()] }
      })

    const result = await createSonarClient({ token: '' }).qualityGate(
      'trade-imports-plants-frontend',
      { pullRequest: 435 }
    )

    expect(result).toEqual({
      project: PROJECT,
      pullRequest: '435',
      branch: null,
      status: 'OK',
      conditions: [
        {
          metric: 'new_coverage',
          status: 'OK',
          comparator: 'LT',
          threshold: '90',
          actual: '97.9'
        }
      ],
      url: `${BASE}/summary/new_code?id=${PROJECT}&pullRequest=435`
    })
  })

  test('carries the threshold and the measurement of a failing condition', async () => {
    mockPool(BASE)
      .get('/api/qualitygates/project_status')
      .query(true)
      .reply(200, {
        projectStatus: {
          status: 'ERROR',
          conditions: [
            condition({
              status: 'ERROR',
              metricKey: 'new_blocker_violations',
              comparator: 'GT',
              errorThreshold: '0',
              actualValue: '3'
            })
          ]
        }
      })

    const result = await createSonarClient({ token: '' }).qualityGate(PROJECT, {
      pullRequest: 435
    })

    expect({ status: result.status, condition: result.conditions[0] }).toEqual({
      status: 'ERROR',
      condition: {
        metric: 'new_blocker_violations',
        status: 'ERROR',
        comparator: 'GT',
        threshold: '0',
        actual: '3'
      }
    })
  })

  test('links the branch it was asked about', async () => {
    mockPool(BASE)
      .get('/api/qualitygates/project_status')
      .query({ projectKey: PROJECT, branch: 'main' })
      .reply(200, { projectStatus: { status: 'OK', conditions: [] } })

    const result = await createSonarClient({ token: '' }).qualityGate(PROJECT, {
      branch: 'main'
    })

    expect({ branch: result.branch, url: result.url }).toEqual({
      branch: 'main',
      url: `${BASE}/summary/new_code?id=${PROJECT}&branch=main`
    })
  })

  test('reports NONE with no conditions when nothing has been analysed', async () => {
    mockPool(BASE)
      .get('/api/qualitygates/project_status')
      .query(true)
      .reply(200, { projectStatus: { status: 'NONE', conditions: [] } })

    const result = await createSonarClient({ token: '' }).qualityGate(PROJECT)

    expect({ status: result.status, conditions: result.conditions }).toEqual({
      status: 'NONE',
      conditions: []
    })
  })

  test('sends SONAR_TOKEN as a bearer token when one is set', async () => {
    mockPool(BASE)
      .get('/api/qualitygates/project_status')
      .query(true)
      .matchHeader('authorization', 'Bearer secret')
      .reply(200, { projectStatus: { status: 'OK', conditions: [] } })

    const result = await createSonarClient({ token: 'secret' }).qualityGate(
      PROJECT
    )

    expect(result.status).toBe('OK')
  })

  test('maps a refusal to the same TimError the issue search does', async () => {
    mockPool(BASE)
      .get('/api/qualitygates/project_status')
      .query(true)
      .reply(404, {})

    await expect(
      createSonarClient({ token: '' }).qualityGate(PROJECT)
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
