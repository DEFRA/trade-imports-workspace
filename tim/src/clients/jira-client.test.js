import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { installHttpMocks, closeHttpMocks } from '../test-support/http-mock.js'
import { createJiraClient } from './jira-client.js'

const here = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(here, '..', 'test-support', 'fixtures', 'jira')
const loadFixture = (name) =>
  JSON.parse(readFileSync(join(fixturesDir, name), 'utf8'))

const BASE = 'https://example.atlassian.net'
let mockPool

beforeEach(() => {
  ;({ mockPool } = installHttpMocks())
})

afterEach(() => {
  closeHttpMocks()
})

describe('createJiraClient', () => {
  test('throws TimError(AUTH) when JIRA_USER or JIRA_TOKEN is missing', () => {
    expect(() =>
      createJiraClient({ user: null, token: 't', baseUrl: BASE })
    ).toThrowError(/JIRA_USER/)
    expect(() =>
      createJiraClient({ user: 'u', token: null, baseUrl: BASE })
    ).toThrowError(/JIRA_TOKEN/)
  })

  test('throws TimError(USAGE) when JIRA_BASE_URL is missing', () => {
    expect(() =>
      createJiraClient({ user: 'u', token: 't', baseUrl: null })
    ).toThrowError(/JIRA_BASE_URL/)
  })
})

describe('whoami', () => {
  test('returns the display name and account identifier', async () => {
    mockPool(BASE)
      .get('/rest/api/2/myself')
      .reply(200, { name: 'sam', displayName: 'Sam Farrington' })

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    expect(await client.whoami()).toEqual({
      user: 'sam',
      displayName: 'Sam Farrington'
    })
  })

  test('maps 401 to TimError(AUTH)', async () => {
    mockPool(BASE).get('/rest/api/2/myself').reply(401, {})
    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(client.whoami()).rejects.toMatchObject({
      name: 'TimError',
      code: 'AUTH'
    })
  })
})

describe('getTicket', () => {
  test('returns the parsed ticket shape', async () => {
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-200')
      .reply(200, {
        key: 'EUDPA-200',
        fields: {
          summary: 'Build the CLI',
          status: { name: 'In Dev' },
          issuetype: { name: 'Story' },
          assignee: { displayName: 'Sam' },
          priority: { name: 'High' },
          description: 'do it'
        }
      })

    const ticket = await createJiraClient({
      user: 'u',
      token: 't',
      baseUrl: BASE
    }).getTicket('EUDPA-200')

    expect(ticket).toEqual({
      id: 'EUDPA-200',
      summary: 'Build the CLI',
      status: 'In Dev',
      type: 'Story',
      assignee: 'Sam',
      priority: 'High',
      description: 'do it'
    })
  })

  test('maps 404 to TimError(NOT_FOUND)', async () => {
    mockPool(BASE).get('/rest/api/2/issue/EUDPA-NOPE').reply(404, {})
    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(client.getTicket('EUDPA-NOPE')).rejects.toMatchObject({
      code: 'NOT_FOUND'
    })
  })
})

describe('error mapping', () => {
  test('maps 429 to TimError(RATE_LIMIT)', async () => {
    mockPool(BASE).get('/rest/api/2/myself').reply(429, {})
    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(client.whoami()).rejects.toMatchObject({
      name: 'TimError',
      code: 'RATE_LIMIT'
    })
  })

  test('maps 500 to TimError(NETWORK) with the status code in the message', async () => {
    mockPool(BASE).get('/rest/api/2/myself').reply(500, {})
    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(client.whoami()).rejects.toMatchObject({
      name: 'TimError',
      code: 'NETWORK',
      message: expect.stringContaining('500')
    })
  })

  test('maps a fetch failure (no response) to TimError(NETWORK)', async () => {
    mockPool(BASE)
      .get('/rest/api/2/myself')
      .replyWithError({ message: 'connection reset' })
    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(client.whoami()).rejects.toMatchObject({
      name: 'TimError',
      code: 'NETWORK'
    })
  })

  test('maps an invalid JSON response body to TimError(PARSE)', async () => {
    mockPool(BASE).get('/rest/api/2/myself').reply(200, 'not really json', {
      'content-type': 'application/json'
    })
    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(client.whoami()).rejects.toMatchObject({
      name: 'TimError',
      code: 'PARSE'
    })
  })
})

describe('getComments', () => {
  test('returns the parsed comments list', async () => {
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-200/comment')
      .reply(200, {
        comments: [
          {
            id: '1',
            author: { displayName: 'Sam' },
            created: '2026-06-08T10:00:00.000Z',
            body: 'first'
          }
        ]
      })

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    expect(await client.getComments('EUDPA-200')).toEqual([
      {
        id: '1',
        author: 'Sam',
        createdAt: '2026-06-08T10:00:00.000Z',
        body: 'first'
      }
    ])
  })
})

describe('createIssue', () => {
  test('creates an issue and returns its key, id and browse url', async () => {
    mockPool(BASE)
      .post('/rest/api/2/issue', {
        fields: { project: { key: 'EUDPA' }, summary: 'x' }
      })
      .reply(201, loadFixture('create-issue-201.json'))

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    const result = await client.createIssue({
      project: { key: 'EUDPA' },
      summary: 'x'
    })

    expect(result).toEqual({
      key: 'EUDPA-999',
      id: '100001',
      url: `${BASE}/browse/EUDPA-999`
    })
  })

  test('maps a 400 with field errors to TimError(USAGE) carrying the reasons', async () => {
    mockPool(BASE)
      .post('/rest/api/2/issue')
      .reply(400, loadFixture('create-issue-400.json'))

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(client.createIssue({ summary: '' })).rejects.toMatchObject({
      name: 'TimError',
      code: 'USAGE',
      message: expect.stringContaining('Summary is required.')
    })
  })

  test('maps 401 to TimError(AUTH)', async () => {
    mockPool(BASE).post('/rest/api/2/issue').reply(401, {})
    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(client.createIssue({})).rejects.toMatchObject({
      name: 'TimError',
      code: 'AUTH'
    })
  })
})

describe('attachFiles', () => {
  let filePath

  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), 'tim-jira-client-attach-'))
    filePath = join(dir, 'screenshot.png')
    writeFileSync(filePath, 'fake-png-bytes')
  })

  afterEach(() => {
    rmSync(dirname(filePath), { recursive: true, force: true })
  })

  test('sends a multipart body with X-Atlassian-Token: no-check and returns an attached result', async () => {
    let capturedHeaders
    let capturedBody
    mockPool(BASE)
      .post('/rest/api/2/issue/EUDPA-200/attachments')
      .reply(function replyWithCapture(uri, requestBody) {
        capturedHeaders = this.req.headers
        capturedBody = requestBody
        return [200, loadFixture('attachment-created.json')]
      })

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    const results = await client.attachFiles('EUDPA-200', [filePath])

    expect(results).toEqual([
      {
        filename: 'screenshot.png',
        path: filePath,
        status: 'attached',
        id: '10001',
        size: 14
      }
    ])
    expect(capturedHeaders['x-atlassian-token']).toBe('no-check')
    expect(String(capturedHeaders['content-type'])).toContain(
      'multipart/form-data'
    )
    expect(capturedBody).toContain('fake-png-bytes')
  })

  test('records a per-file failure without throwing, so one bad file never stops the rest', async () => {
    mockPool(BASE)
      .post('/rest/api/2/issue/EUDPA-404/attachments')
      .reply(404, {})

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    const results = await client.attachFiles('EUDPA-404', [filePath])

    expect(results).toEqual([
      {
        filename: 'screenshot.png',
        path: filePath,
        status: 'failed',
        error: expect.stringContaining('not found')
      }
    ])
  })
})

describe('listAttachments', () => {
  test('returns the filenames already on an issue', async () => {
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-999?fields=attachment')
      .reply(200, loadFixture('issue-attachments.json'))

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    expect(await client.listAttachments('EUDPA-999')).toEqual([
      {
        id: '10001',
        filename: 'screenshot.png',
        size: 4096,
        created: '2026-09-28T10:00:00.000+0000'
      }
    ])
  })
})

describe('linkIssues', () => {
  test('creates a Relates link between two issues', async () => {
    mockPool(BASE)
      .post('/rest/api/2/issueLink', {
        type: { name: 'Relates' },
        inwardIssue: { key: 'EUDPA-200' },
        outwardIssue: { key: 'EUDPA-100' }
      })
      .reply(201, {})

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    expect(
      await client.linkIssues('Relates', 'EUDPA-200', 'EUDPA-100')
    ).toEqual({
      type: 'Relates',
      inwardKey: 'EUDPA-200',
      outwardKey: 'EUDPA-100'
    })
  })

  test('throws TimError(USAGE) for a link type other than Relates', async () => {
    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(
      client.linkIssues('Blocks', 'EUDPA-200', 'EUDPA-100')
    ).rejects.toMatchObject({ name: 'TimError', code: 'USAGE' })
  })

  test('maps 404 to TimError(NOT_FOUND) when an issue does not exist', async () => {
    mockPool(BASE).post('/rest/api/2/issueLink').reply(404, {})
    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(
      client.linkIssues('Relates', 'EUDPA-200', 'EUDPA-NOPE')
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('getIssueLinks', () => {
  test('returns the current issue links, to verify a link landed', async () => {
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-999?fields=issuelinks')
      .reply(200, loadFixture('issue-links.json'))

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    expect(await client.getIssueLinks('EUDPA-999')).toEqual([
      { type: 'Relates', inwardKey: null, outwardKey: 'EUDPA-1000' }
    ])
  })
})

describe('listOpenEpics', () => {
  test('returns key and summary for each open epic', async () => {
    mockPool(BASE)
      .get(
        /^\/rest\/api\/3\/search\/jql\?jql=.*&fields=summary&maxResults=100$/
      )
      .reply(200, loadFixture('list-open-epics.json'))

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    expect(await client.listOpenEpics('EUDPA')).toEqual([
      { key: 'EUDPA-100', summary: 'Designer prototyping, workspace-first' },
      { key: 'EUDPA-200', summary: 'Build the CLI' }
    ])
  })

  test('maps 429 to TimError(RATE_LIMIT)', async () => {
    mockPool(BASE)
      .get(/\/rest\/api\/3\/search\/jql/)
      .reply(429, {})
    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(client.listOpenEpics('EUDPA')).rejects.toMatchObject({
      code: 'RATE_LIMIT'
    })
  })
})

describe('listTransitions', () => {
  test('returns each transition with the status it leads to', async () => {
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-300/transitions')
      .reply(200, loadFixture('list-transitions.json'))

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    expect(await client.listTransitions('EUDPA-300')).toEqual([
      { id: '11', name: 'Start work', to: 'In Dev' },
      { id: '31', name: 'Done', to: 'Done' }
    ])
  })

  test('maps 404 to TimError(NOT_FOUND)', async () => {
    mockPool(BASE).get('/rest/api/2/issue/EUDPA-404/transitions').reply(404, {})
    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(client.listTransitions('EUDPA-404')).rejects.toMatchObject({
      code: 'NOT_FOUND'
    })
  })
})

describe('transitionIssue', () => {
  test('posts the transition id', async () => {
    let posted = null
    mockPool(BASE)
      .post('/rest/api/2/issue/EUDPA-300/transitions', (body) => {
        posted = body
        return true
      })
      .reply(204)

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await client.transitionIssue('EUDPA-300', '11')

    expect(posted).toEqual({ transition: { id: '11' } })
  })

  test('carries Jira’s reason on a 400', async () => {
    mockPool(BASE)
      .post('/rest/api/2/issue/EUDPA-300/transitions')
      .reply(400, { errorMessages: ['Transition id 99 is not valid.'] })

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(
      client.transitionIssue('EUDPA-300', '99')
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: 'transitionIssue(EUDPA-300): Transition id 99 is not valid.'
    })
  })
})

describe('moveToBoard', () => {
  test('posts the keys to the board and accepts a 204', async () => {
    let posted = null
    mockPool(BASE)
      .post('/rest/agile/1.0/board/13780/issue', (body) => {
        posted = body
        return true
      })
      .reply(204)

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await client.moveToBoard(13780, ['EUDPA-300'])

    expect(posted).toEqual({ issues: ['EUDPA-300'] })
  })

  test('treats a 200 with errors as a failure, naming them', async () => {
    mockPool(BASE)
      .post('/rest/agile/1.0/board/13780/issue')
      .reply(200, {
        errorMessages: ['Issue EUDPA-300 is not in the board filter.']
      })

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(
      client.moveToBoard(13780, ['EUDPA-300'])
    ).rejects.toMatchObject({
      code: 'UNKNOWN',
      message:
        'moveToBoard(13780, EUDPA-300): Jira answered 200, not 204: Issue EUDPA-300 is not in the board filter.'
    })
  })

  test('maps 401 to TimError(AUTH)', async () => {
    mockPool(BASE).post('/rest/agile/1.0/board/13780/issue').reply(401, {})
    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(
      client.moveToBoard(13780, ['EUDPA-300'])
    ).rejects.toMatchObject({ code: 'AUTH' })
  })
})

describe('listOpenChildren', () => {
  test('reads every page of an epic’s open children', async () => {
    mockPool(BASE)
      .get(
        /^\/rest\/api\/3\/search\/jql\?jql=parent%20%3D%20EUDPA-1%20AND%20statusCategory%20!%3D%20Done&fields=summary&maxResults=100$/
      )
      .reply(200, {
        issues: [{ key: 'EUDPA-2', fields: { summary: 'inc-001 — One' } }],
        nextPageToken: 'page-2'
      })
    mockPool(BASE)
      .get(/nextPageToken=page-2$/)
      .reply(200, {
        issues: [{ key: 'EUDPA-3', fields: { summary: 'inc-002 — Two' } }],
        isLast: true
      })

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    expect(await client.listOpenChildren('EUDPA-1')).toEqual([
      { key: 'EUDPA-2', summary: 'inc-001 — One' },
      { key: 'EUDPA-3', summary: 'inc-002 — Two' }
    ])
  })
})
