import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createServer } from 'node:http'
import { probeAll } from './auth.js'
import { TimError } from '../errors.js'
import { createJiraClient } from '../clients/jira-client.js'
import { createConfluenceClient } from '../clients/confluence-client.js'
import { installHttpMocks, closeHttpMocks } from '../test-support/http-mock.js'
import {
  createCliWorkspace,
  runTimInWorkspace,
  envelopeOf
} from '../test-support/tim-cli.js'
import { OK, MISSING_DEP } from '../constants/exitCodes.js'

const fakeClient = (whoami) => () => ({ whoami: async () => whoami })
const failingClient = (error) => () => ({
  whoami: async () => {
    throw error
  }
})

const BASE = 'https://example.atlassian.net'
const credentials = { user: 'sam@example.com', token: 'right-token' }
const basicAuthOf = ({ user, token }) =>
  `Basic ${Buffer.from(`${user}:${token}`).toString('base64')}`

const realClientsWith = (signIn) => ({
  jiraFactory: () => createJiraClient({ ...signIn, baseUrl: BASE }),
  confluenceFactory: () => createConfluenceClient({ ...signIn, baseUrl: BASE })
})

describe('probeAll', () => {
  test('returns an ok result with the user for Jira and Confluence only', async () => {
    const results = await probeAll({
      jiraFactory: fakeClient({ user: 'sam', displayName: 'Sam' }),
      confluenceFactory: fakeClient({ user: 'sam', displayName: 'Sam' })
    })

    expect(results).toEqual([
      { service: 'jira', ok: true, user: { user: 'sam', displayName: 'Sam' } },
      {
        service: 'confluence',
        ok: true,
        user: { user: 'sam', displayName: 'Sam' }
      }
    ])
  })

  test('captures per-service failures as ok=false with error.code', async () => {
    const results = await probeAll({
      jiraFactory: failingClient(new TimError('AUTH', 'bad token')),
      confluenceFactory: fakeClient({ user: 'sam' })
    })

    const byService = Object.fromEntries(results.map((r) => [r.service, r]))
    expect(byService.jira).toMatchObject({
      ok: false,
      error: { code: 'AUTH', message: 'bad token' }
    })
    expect(byService.confluence.ok).toBe(true)
  })

  test('preserves non-TimError error info under code: UNKNOWN', async () => {
    const results = await probeAll({
      jiraFactory: fakeClient({ user: 'sam' }),
      confluenceFactory: failingClient(new Error('boom'))
    })

    const confluence = results.find((r) => r.service === 'confluence')
    expect(confluence).toMatchObject({
      ok: false,
      error: { code: 'UNKNOWN', message: 'boom' }
    })
  })
})

describe('probeAll against the Atlassian endpoints', () => {
  let mockPool

  beforeEach(() => {
    ;({ mockPool } = installHttpMocks())
  })

  afterEach(() => {
    closeHttpMocks()
  })

  test('signs in to Jira /myself and Confluence /user/current with JIRA_USER and JIRA_TOKEN', async () => {
    mockPool(BASE)
      .matchHeader('authorization', basicAuthOf(credentials))
      .get('/rest/api/2/myself')
      .reply(200, { accountId: 'abc', displayName: 'Sam Farrington' })
    mockPool(BASE)
      .matchHeader('authorization', basicAuthOf(credentials))
      .get('/wiki/rest/api/user/current')
      .reply(200, {
        type: 'known',
        accountId: 'abc',
        displayName: 'Sam Farrington'
      })

    const results = await probeAll(realClientsWith(credentials))

    expect(
      results.map(({ service, ok, user }) => [service, ok, user.displayName])
    ).toEqual([
      ['jira', true, 'Sam Farrington'],
      ['confluence', true, 'Sam Farrington']
    ])
  })

  test('reports AUTH for both services when Atlassian refuses the token', async () => {
    mockPool(BASE).get('/rest/api/2/myself').reply(401, {})
    mockPool(BASE).get('/wiki/rest/api/user/current').reply(401, {})

    const results = await probeAll(
      realClientsWith({ ...credentials, token: 'wrong-token' })
    )

    expect(
      results.map(({ service, ok, error }) => [service, ok, error.code])
    ).toEqual([
      ['jira', false, 'AUTH'],
      ['confluence', false, 'AUTH']
    ])
  })
})

const startAtlassianStandIn = async ({ acceptedToken }) => {
  const server = createServer((request, response) => {
    const signedIn =
      request.headers.authorization ===
      basicAuthOf({
        user: credentials.user,
        token: acceptedToken
      })
    response.writeHead(signedIn ? 200 : 401, {
      'content-type': 'application/json'
    })
    response.end(
      JSON.stringify(signedIn ? { accountId: 'abc', displayName: 'Sam' } : {})
    )
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve))
  }
}

const runAuth = (env, args = []) =>
  runTimInWorkspace(createCliWorkspace('tim-auth-'), ['auth', ...args], {
    env: { JIRA_USER: credentials.user, ...env }
  })

describe('tim auth', () => {
  test('exits 0 and names the user for each service when the token is accepted', async () => {
    const atlassian = await startAtlassianStandIn({
      acceptedToken: 'right-token'
    })

    const run = await runAuth({
      JIRA_TOKEN: 'right-token',
      JIRA_BASE_URL: atlassian.baseUrl
    })
    await atlassian.close()

    expect([run.exitCode, run.stdout]).toEqual([
      OK,
      'jira: OK — Sam\nconfluence: OK — Sam'
    ])
  })

  test('exits non-zero with AUTH for each service when the token is wrong', async () => {
    const atlassian = await startAtlassianStandIn({
      acceptedToken: 'right-token'
    })

    const run = await runAuth(
      { JIRA_TOKEN: 'wrong-token', JIRA_BASE_URL: atlassian.baseUrl },
      ['--json']
    )
    await atlassian.close()

    expect(run.exitCode).toBe(MISSING_DEP)
    expect(envelopeOf(run).errors.map(({ code }) => code)).toEqual([
      'AUTH',
      'AUTH'
    ])
  })

  test('exits non-zero and asks for JIRA_TOKEN when it is not set', async () => {
    const run = await runAuth({
      JIRA_TOKEN: '',
      JIRA_BASE_URL: 'http://127.0.0.1:9'
    })

    expect([run.exitCode, run.stdout]).toEqual([
      MISSING_DEP,
      [
        'jira: FAILED — AUTH: Set JIRA_USER and JIRA_TOKEN to authenticate with Jira.',
        'confluence: FAILED — AUTH: Set JIRA_USER and JIRA_TOKEN to authenticate with Confluence.'
      ].join('\n')
    ])
  })
})
