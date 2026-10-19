import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { installHttpMocks, closeHttpMocks } from '../test-support/http-mock.js'
import { createSonarClient } from './sonar-client.js'

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
