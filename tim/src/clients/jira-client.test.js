import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { installHttpMocks, closeHttpMocks } from '../test-support/http-mock.js'
import { createJiraClient, describeTransitions } from './jira-client.js'

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
      accountId: null,
      displayName: 'Sam Farrington'
    })
  })

  test('returns the account id Jira Cloud gives in place of a username', async () => {
    mockPool(BASE).get('/rest/api/2/myself').reply(200, {
      accountId: '557058:abc',
      displayName: 'Pat Example'
    })

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    expect(await client.whoami()).toEqual({
      user: '557058:abc',
      accountId: '557058:abc',
      displayName: 'Pat Example'
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
      parent: null,
      labels: [],
      updated: null,
      description: 'do it',
      subtasks: [],
      links: []
    })
  })

  test('returns the rendered description, parent, labels, update time and links read from this side', async () => {
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-713')
      .query({ expand: 'renderedFields' })
      .reply(200, loadFixture('issue-rendered-with-links.json'))
    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })

    const ticket = await client.getTicket('EUDPA-713', { withRendered: true })

    expect(ticket).toEqual({
      id: 'EUDPA-713',
      summary:
        'Store and enforce the owning organisation on every live animals notification',
      status: 'Done',
      type: 'Story',
      assignee: 'Martyn Nevers',
      priority: 'Medium',
      parent: 'EUDPA-133',
      labels: ['COMMON-CAP-0.2'],
      updated: '2026-11-13T15:43:59.072+0000',
      description:
        "*As* a trader acting for an organisation,\n*I want* to see and change only my organisation's import notifications,\n*So that* other organisations cannot see or change our consignments and party details",
      renderedDescription:
        "<p><b>As</b> a trader acting for an organisation,<br/>\n<b>I want</b> to see and change only my organisation's import notifications,<br/>\n<b>So that</b> other organisations cannot see or change our consignments and party details</p>",
      subtasks: [],
      links: [
        {
          id: '432588',
          type: 'Relates',
          direction: 'inward',
          relation: 'relates to',
          otherKey: 'EUDPA-715',
          otherStatus: 'Done',
          otherSummary:
            'Store and enforce the owning organisation on every plants notification'
        },
        {
          id: '432589',
          type: 'Blocks',
          direction: 'outward',
          relation: 'blocks',
          otherKey: 'EUDPA-714',
          otherStatus: 'In Dev',
          otherSummary:
            'Store and enforce the owning organisation on INS dashboard notifications'
        }
      ]
    })
  })

  test('returns no parent, no labels and no renderedDescription key for an epic read without rendering', async () => {
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-745')
      .reply(200, loadFixture('issue-epic-no-parent.json'))
    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })

    const ticket = await client.getTicket('EUDPA-745')

    expect(ticket).toEqual(
      expect.objectContaining({
        id: 'EUDPA-745',
        type: 'Epic',
        assignee: null,
        parent: null,
        labels: [],
        updated: '2026-10-27T18:06:56.908+0000',
        subtasks: [],
        links: []
      })
    )
    expect(Object.keys(ticket)).not.toContain('renderedDescription')
  })

  test('returns a null renderedDescription when the ticket has no description to render', async () => {
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-300')
      .query({ expand: 'renderedFields' })
      .reply(200, {
        ...loadFixture('issue-in-dev.json'),
        renderedFields: { description: null }
      })
    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })

    const ticket = await client.getTicket('EUDPA-300', { withRendered: true })

    expect(ticket.renderedDescription).toBeNull()
  })

  test('returns each subtask with its key, status and summary', async () => {
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-799')
      .reply(200, loadFixture('issue-with-subtasks.json'))
    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })

    const ticket = await client.getTicket('EUDPA-799')

    expect(ticket.subtasks).toEqual([
      {
        key: 'EUDPA-801',
        status: 'In Dev',
        summary: 'Turn on hot reload for the proxy in dev mode'
      },
      {
        key: 'EUDPA-802',
        status: 'To Do',
        summary: 'Document the dev overlay'
      }
    ])
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

  test("keeps Jira's error messages on a mapped failure", async () => {
    mockPool(BASE)
      .get('/rest/api/2/myself')
      .reply(404, { errorMessages: ['Issue does not exist'] })
    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(client.whoami()).rejects.toMatchObject({
      code: 'NOT_FOUND',
      jiraMessages: ['Issue does not exist']
    })
  })

  test('keeps no Jira error messages when the failure body is not JSON', async () => {
    mockPool(BASE).get('/rest/api/2/myself').reply(500, 'Bad gateway')
    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(client.whoami()).rejects.toMatchObject({
      code: 'NETWORK',
      jiraMessages: []
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

describe('addComment', () => {
  test('posts the body and returns the comment Jira created', async () => {
    const sent = { body: null }
    mockPool(BASE)
      .post('/rest/api/2/issue/EUDPA-200/comment', (body) => {
        sent.body = body
        return true
      })
      .reply(201, {
        id: '10500',
        author: { displayName: 'Sam' },
        created: '2026-10-20T10:00:00.000+0100',
        body: 'Closing: no longer reproduces.'
      })

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    const comment = await client.addComment(
      'EUDPA-200',
      'Closing: no longer reproduces.'
    )

    expect({ comment, sent: sent.body }).toEqual({
      comment: {
        id: '10500',
        author: 'Sam',
        createdAt: '2026-10-20T10:00:00.000+0100',
        body: 'Closing: no longer reproduces.'
      },
      sent: { body: 'Closing: no longer reproduces.' }
    })
  })

  test('carries Jira’s reason when it refuses the comment', async () => {
    mockPool(BASE)
      .post('/rest/api/2/issue/EUDPA-200/comment')
      .reply(400, { errors: { comment: 'Comment body can not be empty!' } })

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(client.addComment('EUDPA-200', ' ')).rejects.toMatchObject({
      code: 'USAGE',
      message: 'addComment(EUDPA-200): comment: Comment body can not be empty!'
    })
  })

  test('maps 401 to TimError(AUTH)', async () => {
    mockPool(BASE).post('/rest/api/2/issue/EUDPA-200/comment').reply(401, {})

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(client.addComment('EUDPA-200', 'x')).rejects.toMatchObject({
      code: 'AUTH'
    })
  })

  test('maps 404 to TimError(NOT_FOUND)', async () => {
    mockPool(BASE).post('/rest/api/2/issue/EUDPA-999/comment').reply(404, {})

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(client.addComment('EUDPA-999', 'x')).rejects.toMatchObject({
      code: 'NOT_FOUND'
    })
  })

  test('maps 429 to TimError(RATE_LIMIT)', async () => {
    mockPool(BASE).post('/rest/api/2/issue/EUDPA-200/comment').reply(429, {})

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(client.addComment('EUDPA-200', 'x')).rejects.toMatchObject({
      code: 'RATE_LIMIT'
    })
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

describe('updateIssue', () => {
  test('puts the fields verbatim and returns the key and browse url', async () => {
    mockPool(BASE)
      .put('/rest/api/2/issue/EUDPA-200', {
        fields: { summary: 'A clearer title' }
      })
      .reply(204)

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    const result = await client.updateIssue('EUDPA-200', {
      summary: 'A clearer title'
    })

    expect(result).toEqual({
      key: 'EUDPA-200',
      url: `${BASE}/browse/EUDPA-200`
    })
  })

  test('maps a 400 with field errors to TimError(USAGE) carrying the reasons', async () => {
    mockPool(BASE)
      .put('/rest/api/2/issue/EUDPA-200')
      .reply(400, { errors: { summary: 'Summary is required.' } })

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(
      client.updateIssue('EUDPA-200', { summary: '' })
    ).rejects.toMatchObject({
      name: 'TimError',
      code: 'USAGE',
      message: expect.stringContaining('Summary is required.')
    })
  })

  test('maps 404 to TimError(NOT_FOUND)', async () => {
    mockPool(BASE).put('/rest/api/2/issue/EUDPA-200').reply(404, {})
    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(
      client.updateIssue('EUDPA-200', { summary: 'x' })
    ).rejects.toMatchObject({ name: 'TimError', code: 'NOT_FOUND' })
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

describe.each([
  {
    method: 'deleteAttachment',
    path: '/rest/api/2/attachment/501',
    forbidden: 'Not permitted to delete attachment 501.',
    missing: 'No attachment with id 501.'
  },
  {
    method: 'deleteIssueLink',
    path: '/rest/api/2/issueLink/501',
    forbidden: 'Not permitted to delete link 501.',
    missing: 'No issue link with id 501.'
  }
])('$method', ({ method, path, forbidden, missing }) => {
  const deleteAnswering = (status) => {
    const deletion = mockPool(BASE).delete(path).reply(status)
    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    return { deletion, outcome: client[method]('501') }
  }

  test('sends the DELETE and resolves when Jira answers 204', async () => {
    const { deletion, outcome } = deleteAnswering(204)

    await expect(outcome).resolves.toBeUndefined()
    expect(deletion.isDone()).toBe(true)
  })

  test.each([
    [403, 'AUTH', forbidden],
    [404, 'NOT_FOUND', missing],
    [500, 'NETWORK', 'Delete failed with HTTP 500.']
  ])('maps %i to TimError(%s)', async (status, code, message) => {
    const { outcome } = deleteAnswering(status)

    await expect(outcome).rejects.toMatchObject({ code, message })
  })
})

describe('browseUrl', () => {
  test("gives the issue's page under a base URL with its trailing slash removed", () => {
    const client = createJiraClient({
      user: 'u',
      token: 't',
      baseUrl: `${BASE}/`
    })

    expect(client.browseUrl('EUDPA-1')).toBe(`${BASE}/browse/EUDPA-1`)
  })
})

const capturesIssueLink = () => {
  const posted = { body: null }
  mockPool(BASE)
    .post('/rest/api/2/issueLink', (body) => {
      posted.body = body
      return true
    })
    .reply(201, {})
  return posted
}

describe('relateIssues', () => {
  test('posts a Relates link between the two issues', async () => {
    const posted = capturesIssueLink()

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await client.relateIssues('EUDPA-200', 'EUDPA-100')

    expect(posted.body).toEqual({
      type: { name: 'Relates' },
      inwardIssue: { key: 'EUDPA-200' },
      outwardIssue: { key: 'EUDPA-100' }
    })
  })

  test('maps 404 to TimError(NOT_FOUND) when an issue does not exist', async () => {
    mockPool(BASE).post('/rest/api/2/issueLink').reply(404, {})
    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(
      client.relateIssues('EUDPA-200', 'EUDPA-NOPE')
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('recordBlocker', () => {
  test('sends the blocker as inwardIssue and the blocked issue as outwardIssue', async () => {
    const posted = capturesIssueLink()

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await client.recordBlocker({ blocker: 'EUDPA-181', blocked: 'EUDPA-183' })

    expect(posted.body).toEqual({
      type: { name: 'Blocks' },
      inwardIssue: { key: 'EUDPA-181' },
      outwardIssue: { key: 'EUDPA-183' }
    })
  })

  test('carries Jira’s reason on a 400', async () => {
    mockPool(BASE)
      .post('/rest/api/2/issueLink')
      .reply(400, { errorMessages: ['No issue link type with name Blocks.'] })

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(
      client.recordBlocker({ blocker: 'EUDPA-181', blocked: 'EUDPA-183' })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        'recordBlocker(EUDPA-181 blocks EUDPA-183): No issue link type with name Blocks.'
    })
  })
})

describe('getIssueLinks', () => {
  test('reads a Relates link from the issue’s side', async () => {
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-999?fields=issuelinks')
      .reply(200, loadFixture('issue-links.json'))

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    expect(await client.getIssueLinks('EUDPA-999')).toEqual([
      {
        id: '20001',
        type: 'Relates',
        direction: 'outward',
        relation: 'relates to',
        otherKey: 'EUDPA-1000'
      }
    ])
  })

  test('reads each Blocks link with the wording from the issue’s side', async () => {
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-200?fields=issuelinks')
      .reply(200, loadFixture('issue-links-blocks.json'))

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    expect(await client.getIssueLinks('EUDPA-200')).toEqual([
      {
        id: '30001',
        type: 'Blocks',
        direction: 'outward',
        relation: 'blocks',
        otherKey: 'EUDPA-300'
      },
      {
        id: '30002',
        type: 'Blocks',
        direction: 'inward',
        relation: 'is blocked by',
        otherKey: 'EUDPA-100'
      }
    ])
  })
})

describe('getAssignee', () => {
  test('returns the assignee’s account id and display name', async () => {
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-200?fields=assignee')
      .reply(200, loadFixture('issue-assignee.json'))

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    expect(await client.getAssignee('EUDPA-200')).toEqual({
      accountId: '557058:aaaa1111-2222-3333-4444-555566667777',
      displayName: 'Pat Example'
    })
  })

  test('returns null for an unassigned issue', async () => {
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-200?fields=assignee')
      .reply(200, { key: 'EUDPA-200', fields: { assignee: null } })

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    expect(await client.getAssignee('EUDPA-200')).toBeNull()
  })
})

describe('assignIssue', () => {
  test('puts the account id on the issue’s assignee', async () => {
    const sent = { body: null }
    mockPool(BASE)
      .put('/rest/api/2/issue/EUDPA-200/assignee', (body) => {
        sent.body = body
        return true
      })
      .reply(204)

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await client.assignIssue('EUDPA-200', '557058:abc')

    expect(sent.body).toEqual({ accountId: '557058:abc' })
  })

  test('carries Jira’s reason when it refuses the account', async () => {
    mockPool(BASE)
      .put('/rest/api/2/issue/EUDPA-200/assignee')
      .reply(400, {
        errors: { assignee: "User '557058:nope' cannot be assigned issues." }
      })

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(
      client.assignIssue('EUDPA-200', '557058:nope')
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        "assignIssue(EUDPA-200): assignee: User '557058:nope' cannot be assigned issues."
    })
  })

  test('maps 401 to TimError(AUTH)', async () => {
    mockPool(BASE).put('/rest/api/2/issue/EUDPA-200/assignee').reply(401, {})

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(
      client.assignIssue('EUDPA-200', '557058:abc')
    ).rejects.toMatchObject({ code: 'AUTH' })
  })
})

describe('getResolution', () => {
  test('returns the resolution’s name', async () => {
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-300?fields=resolution')
      .reply(200, {
        key: 'EUDPA-300',
        fields: { resolution: { id: '10001', name: "Won't Do" } }
      })

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    expect(await client.getResolution('EUDPA-300')).toBe("Won't Do")
  })

  test('returns null when the issue has no resolution', async () => {
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-300?fields=resolution')
      .reply(200, { key: 'EUDPA-300', fields: { resolution: null } })

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    expect(await client.getResolution('EUDPA-300')).toBeNull()
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

  test('returns the resolutions each transition’s screen accepts when asked', async () => {
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-300/transitions?expand=transitions.fields')
      .reply(200, loadFixture('list-transitions-with-fields.json'))

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    expect(
      await client.listTransitions('EUDPA-300', { withResolutions: true })
    ).toEqual([
      { id: '11', name: 'Start work', to: 'In Dev', resolutions: null },
      { id: '31', name: 'Done', to: 'Done', resolutions: ['Done', "Won't Do"] }
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
  const acceptsTransition = () => {
    const posted = { body: null }
    mockPool(BASE)
      .post('/rest/api/2/issue/EUDPA-300/transitions', (body) => {
        posted.body = body
        return true
      })
      .reply(204)
    return posted
  }

  test('posts the transition id', async () => {
    const posted = acceptsTransition()

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await client.transitionIssue('EUDPA-300', '11')

    expect(posted.body).toEqual({ transition: { id: '11' } })
  })

  test('posts the resolution as a field when given one', async () => {
    const posted = acceptsTransition()

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await client.transitionIssue('EUDPA-300', '31', { resolution: "Won't Do" })

    expect(posted.body).toEqual({
      transition: { id: '31' },
      fields: { resolution: { name: "Won't Do" } }
    })
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

describe('moveToStatus', () => {
  const client = () =>
    createJiraClient({ user: 'u', token: 't', baseUrl: BASE })

  const ticketIs = (status) =>
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-300')
      .reply(200, {
        ...loadFixture('issue-in-dev.json'),
        fields: {
          ...loadFixture('issue-in-dev.json').fields,
          status: { name: status }
        }
      })

  const offersTransitions = (body = loadFixture('list-transitions.json')) =>
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-300/transitions')
      .reply(200, body)

  const acceptsTransition = () => {
    const posted = { body: null }
    mockPool(BASE)
      .post('/rest/api/2/issue/EUDPA-300/transitions', (body) => {
        posted.body = body
        return true
      })
      .reply(204)
    return posted
  }

  test('moves the issue through the transition that leads to the status', async () => {
    ticketIs('In Dev')
    offersTransitions()
    const posted = acceptsTransition()

    const result = await client().moveToStatus('EUDPA-300', 'Done')

    expect({ result, posted: posted.body }).toEqual({
      result: {
        key: 'EUDPA-300',
        from: 'In Dev',
        to: 'Done',
        moved: true,
        transition: 'Done'
      },
      posted: { transition: { id: '31' } }
    })
  })

  test('leaves an issue already in the status alone', async () => {
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-300')
      .reply(200, loadFixture('issue-in-dev.json'))

    const result = await client().moveToStatus('EUDPA-300', 'In Dev')

    expect(result).toEqual({
      key: 'EUDPA-300',
      from: 'In Dev',
      to: 'In Dev',
      moved: false,
      transition: null
    })
  })

  test('takes the current status from the caller instead of reading the issue', async () => {
    offersTransitions()
    acceptsTransition()

    const result = await client().moveToStatus('EUDPA-300', 'In Dev', {
      from: 'To Do'
    })

    expect(result).toMatchObject({ from: 'To Do', to: 'In Dev', moved: true })
  })

  test('matches on the status, not the transition name, by default', async () => {
    ticketIs('To Do')
    offersTransitions()

    await expect(
      client().moveToStatus('EUDPA-300', 'Start work')
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        'EUDPA-300 is To Do and offers no transition to "Start work". The board offers (transition -> status): Start work -> In Dev, Done -> Done.',
      transitions: [
        { id: '11', name: 'Start work', to: 'In Dev' },
        { id: '31', name: 'Done', to: 'Done' }
      ]
    })
  })

  test('accepts a transition name when asked to', async () => {
    ticketIs('To Do')
    offersTransitions()
    const posted = acceptsTransition()

    const result = await client().moveToStatus('EUDPA-300', 'Start work', {
      matchTransitionName: true
    })

    expect({ result, posted: posted.body }).toEqual({
      result: {
        key: 'EUDPA-300',
        from: 'To Do',
        to: 'In Dev',
        moved: true,
        transition: 'Start work'
      },
      posted: { transition: { id: '11' } }
    })
  })

  test('compares status names exactly, so a different case does not match', async () => {
    ticketIs('In Dev')
    offersTransitions()

    await expect(
      client().moveToStatus('EUDPA-300', 'done')
    ).rejects.toMatchObject({ code: 'USAGE' })
  })

  test('says "none" when the issue offers no transitions', async () => {
    ticketIs('Done')
    offersTransitions({ transitions: [] })

    await expect(
      client().moveToStatus('EUDPA-300', 'In Dev')
    ).rejects.toMatchObject({
      message:
        'EUDPA-300 is Done and offers no transition to "In Dev". The board offers (transition -> status): none.',
      transitions: []
    })
  })

  test('maps a missing issue to TimError(NOT_FOUND)', async () => {
    mockPool(BASE).get('/rest/api/2/issue/EUDPA-404').reply(404, {})

    await expect(
      client().moveToStatus('EUDPA-404', 'Done')
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  test('maps rejected credentials to TimError(AUTH)', async () => {
    mockPool(BASE).get('/rest/api/2/issue/EUDPA-300').reply(401, {})

    await expect(
      client().moveToStatus('EUDPA-300', 'Done')
    ).rejects.toMatchObject({ code: 'AUTH' })
  })

  const offersTransitionsWithResolutions = () =>
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-300/transitions?expand=transitions.fields')
      .reply(200, loadFixture('list-transitions-with-fields.json'))

  test('sets a resolution the transition’s screen accepts', async () => {
    ticketIs('In Dev')
    offersTransitionsWithResolutions()
    const posted = acceptsTransition()

    const result = await client().moveToStatus('EUDPA-300', 'Done', {
      resolution: "Won't Do"
    })

    expect({ result, posted: posted.body }).toEqual({
      result: {
        key: 'EUDPA-300',
        from: 'In Dev',
        to: 'Done',
        moved: true,
        transition: 'Done',
        resolution: "Won't Do"
      },
      posted: {
        transition: { id: '31' },
        fields: { resolution: { name: "Won't Do" } }
      }
    })
  })

  test('refuses a resolution on a transition whose screen has no resolution field', async () => {
    ticketIs('To Do')
    offersTransitionsWithResolutions()

    await expect(
      client().moveToStatus('EUDPA-300', 'In Dev', { resolution: 'Done' })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        'The "Start work" transition on EUDPA-300 does not let you set a resolution. Run it again without --resolution.'
    })
  })

  test('refuses a resolution the transition does not offer, naming the ones it does', async () => {
    ticketIs('In Dev')
    offersTransitionsWithResolutions()

    await expect(
      client().moveToStatus('EUDPA-300', 'Done', { resolution: 'Duplicate' })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        'The "Done" transition on EUDPA-300 offers no resolution "Duplicate". It offers: Done, Won\'t Do.'
    })
  })

  test('carries Jira’s reason when it refuses the move', async () => {
    ticketIs('In Dev')
    offersTransitions()
    mockPool(BASE)
      .post('/rest/api/2/issue/EUDPA-300/transitions')
      .reply(400, { errorMessages: ['Resolution is required.'] })

    await expect(
      client().moveToStatus('EUDPA-300', 'Done')
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: 'transitionIssue(EUDPA-300): Resolution is required.'
    })
  })
})

describe('describeTransitions', () => {
  test('lists each transition with the status it leads to', () => {
    expect(
      describeTransitions([
        { name: 'Start work', to: 'In Dev' },
        { name: 'Done', to: 'Done' }
      ])
    ).toBe('Start work -> In Dev, Done -> Done')
  })

  test('says none when there are none', () => {
    expect(describeTransitions([])).toBe('none')
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

describe('searchIssues', () => {
  const issue = (key, summary) => ({
    key,
    fields: {
      summary,
      status: { name: 'To Do' },
      issuetype: { name: 'Task' }
    }
  })

  test('returns key, summary, status and type for each match', async () => {
    mockPool(BASE)
      .get(
        /^\/rest\/api\/3\/search\/jql\?jql=project%20%3D%20EUDPA&fields=summary,status,issuetype&maxResults=50$/
      )
      .reply(200, { issues: [issue('EUDPA-7', 'Check codes')] })

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    expect(await client.searchIssues('project = EUDPA')).toEqual([
      { key: 'EUDPA-7', summary: 'Check codes', status: 'To Do', type: 'Task' }
    ])
  })

  test('reads further pages until the limit is reached', async () => {
    mockPool(BASE)
      .get(/maxResults=3$/)
      .reply(200, {
        issues: [issue('EUDPA-1', 'One'), issue('EUDPA-2', 'Two')],
        nextPageToken: 'page-2'
      })
    mockPool(BASE)
      .get(/maxResults=1&nextPageToken=page-2$/)
      .reply(200, {
        issues: [issue('EUDPA-3', 'Three')],
        nextPageToken: 'page-3'
      })

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    const keys = (
      await client.searchIssues('project = EUDPA', { limit: 3 })
    ).map(({ key }) => key)
    expect(keys).toEqual(['EUDPA-1', 'EUDPA-2', 'EUDPA-3'])
  })

  test('maps a 400 for bad JQL to TimError(USAGE)', async () => {
    mockPool(BASE)
      .get(/^\/rest\/api\/3\/search\/jql/)
      .reply(400, { errorMessages: ["Field 'nope' does not exist"] })

    const client = createJiraClient({ user: 'u', token: 't', baseUrl: BASE })
    await expect(client.searchIssues('nope = 1')).rejects.toMatchObject({
      name: 'TimError',
      code: 'USAGE',
      message: "searchIssues: Field 'nope' does not exist"
    })
  })
})
