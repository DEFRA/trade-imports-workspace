import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { installHttpMocks, closeHttpMocks } from '../test-support/http-mock.js'
import { createConfluenceClient, pageIdFrom } from './confluence-client.js'

const BASE = 'https://example.atlassian.net'
let mockPool

beforeEach(() => {
  ;({ mockPool } = installHttpMocks())
})

afterEach(() => {
  closeHttpMocks()
})

describe('createConfluenceClient', () => {
  test('throws TimError(AUTH) when credentials are missing', () => {
    expect(() =>
      createConfluenceClient({ user: null, token: 't', baseUrl: BASE })
    ).toThrowError(/JIRA_USER/)
  })

  test('throws TimError(USAGE) when JIRA_BASE_URL is missing', () => {
    expect(() =>
      createConfluenceClient({ user: 'u', token: 't', baseUrl: null })
    ).toThrowError(/JIRA_BASE_URL/)
  })
})

describe('whoami', () => {
  test('returns the display name from /wiki/rest/api/user/current', async () => {
    mockPool(BASE)
      .get('/wiki/rest/api/user/current')
      .reply(200, {
        username: 'sam',
        profile: { displayName: 'Sam Farrington' }
      })

    const client = createConfluenceClient({
      user: 'u',
      token: 't',
      baseUrl: BASE
    })
    expect(await client.whoami()).toEqual({
      user: 'sam',
      displayName: 'Sam Farrington'
    })
  })

  test('maps 401 to TimError(AUTH)', async () => {
    mockPool(BASE).get('/wiki/rest/api/user/current').reply(401, {})
    const client = createConfluenceClient({
      user: 'u',
      token: 't',
      baseUrl: BASE
    })
    await expect(client.whoami()).rejects.toMatchObject({ code: 'AUTH' })
  })
})

const signedInClient = () =>
  createConfluenceClient({ user: 'u', token: 't', baseUrl: BASE })

describe('pageIdFrom', () => {
  test.each([
    ['123', '123'],
    ['https://example.atlassian.net/wiki/spaces/IT/pages/123/Title', '123'],
    ['https://example.atlassian.net/wiki/spaces/IT/pages/123', '123'],
    ['http://example.atlassian.net/wiki/pages/9/a/pages/77/b', '77']
  ])('finds the page id in %s', (input, pageId) => {
    expect(pageIdFrom(input)).toBe(pageId)
  })

  test.each([
    'abc',
    'https://example.atlassian.net/wiki/spaces/IT/overview',
    '',
    '12a'
  ])('throws TimError(USAGE) for %j', (input) => {
    expect(() => pageIdFrom(input)).toThrowError(
      expect.objectContaining({ code: 'USAGE' })
    )
  })
})

describe('getPage', () => {
  const FULL_EXPAND =
    'body.storage,body.view,version,space,history,metadata.labels'

  test('returns the storage body, view body, labels and page details', async () => {
    mockPool(BASE)
      .get('/wiki/rest/api/content/123')
      .query({ expand: FULL_EXPAND })
      .reply(200, {
        id: '123',
        title: 'Page',
        version: {
          number: 7,
          when: '2026-11-10T09:55:01.152Z',
          by: { displayName: 'Sam Farrington' }
        },
        space: { key: 'EUDP' },
        metadata: { labels: { results: [{ name: 'a' }, { name: 'b' }] } },
        body: {
          storage: { value: '<p>hi</p>' },
          view: { value: '<p>view</p>' }
        }
      })

    expect(await signedInClient().getPage('123')).toEqual({
      id: '123',
      title: 'Page',
      version: 7,
      body: '<p>hi</p>',
      space: 'EUDP',
      updated: '2026-11-10T09:55:01.152Z',
      updatedBy: 'Sam Farrington',
      url: `${BASE}/wiki/spaces/EUDP/pages/123`,
      labels: ['a', 'b'],
      bodyView: '<p>view</p>'
    })
  })

  test('fetches the page a URL names', async () => {
    mockPool(BASE)
      .get('/wiki/rest/api/content/456')
      .query({ expand: FULL_EXPAND })
      .reply(200, { id: '456', title: 'From URL' })

    const page = await signedInClient().getPage(
      `${BASE}/wiki/spaces/EUDP/pages/456/From+URL`
    )

    expect(page.title).toBe('From URL')
  })

  test('maps 404 to TimError(NOT_FOUND)', async () => {
    mockPool(BASE)
      .get('/wiki/rest/api/content/999')
      .query({ expand: FULL_EXPAND })
      .reply(404, {})

    await expect(signedInClient().getPage('999')).rejects.toMatchObject({
      code: 'NOT_FOUND'
    })
  })

  test('maps 401 to TimError(AUTH)', async () => {
    mockPool(BASE)
      .get('/wiki/rest/api/content/999')
      .query({ expand: FULL_EXPAND })
      .reply(401, {})

    await expect(signedInClient().getPage('999')).rejects.toMatchObject({
      code: 'AUTH'
    })
  })
})

describe('getPageView', () => {
  test("returns Confluence's response for the view body, details and labels unchanged", async () => {
    const response = {
      id: '123',
      title: 'Page',
      body: { view: { value: '<p>view</p>' }, _expandable: { storage: '' } }
    }
    mockPool(BASE)
      .get('/wiki/rest/api/content/123')
      .query({ expand: 'body.view,version,space,history,metadata.labels' })
      .reply(200, response)

    expect(await signedInClient().getPageView('123')).toEqual(response)
  })
})

describe('getChildren', () => {
  const childrenOf = (count, prefix) =>
    Array.from({ length: count }, (_, index) => ({
      id: `${prefix}${index}`,
      type: prefix
    }))

  test('returns every child page across result pages, then the child folders', async () => {
    const firstPages = childrenOf(50, 'page')
    const lastPages = [{ id: 'page50', type: 'page' }]
    const folders = [{ id: 'folder0', type: 'folder' }]
    mockPool(BASE)
      .get('/wiki/rest/api/content/123/child/page')
      .query({ limit: '50', start: '0' })
      .reply(200, { results: firstPages })
      .get('/wiki/rest/api/content/123/child/page')
      .query({ limit: '50', start: '50' })
      .reply(200, { results: lastPages })
      .get('/wiki/rest/api/content/123/child/folder')
      .query({ limit: '50', start: '0' })
      .reply(200, { results: folders })

    expect(await signedInClient().getChildren('123')).toEqual([
      ...firstPages,
      ...lastPages,
      ...folders
    ])
  })
})

describe('getContent', () => {
  test('returns the id, type and title of a folder', async () => {
    mockPool(BASE)
      .get('/wiki/rest/api/content/302')
      .reply(200, { id: '302', type: 'folder', title: 'Sub Folder', extra: 1 })

    expect(await signedInClient().getContent('302')).toEqual({
      id: '302',
      type: 'folder',
      title: 'Sub Folder'
    })
  })

  test('maps 404 to TimError(NOT_FOUND) naming the content id', async () => {
    mockPool(BASE).get('/wiki/rest/api/content/999').reply(404, {})

    await expect(signedInClient().getContent('999')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'getContent(999): not found.'
    })
  })
})

describe('getPageExport', () => {
  test('returns the export body and page details', async () => {
    mockPool(BASE)
      .get('/wiki/rest/api/content/123')
      .query({ expand: 'body.export_view,version,space' })
      .reply(200, {
        id: '123',
        title: 'Page',
        version: { number: 3, when: '2026-11-10T09:55:01.152Z' },
        space: { key: 'EUDP' },
        body: { export_view: { value: '<p>export</p>' } }
      })

    expect(await signedInClient().getPageExport('123')).toEqual({
      id: '123',
      title: 'Page',
      version: 3,
      space: 'EUDP',
      updated: '2026-11-10T09:55:01.152Z',
      body: '<p>export</p>'
    })
  })
})

describe('error mapping', () => {
  test('maps 429 to TimError(RATE_LIMIT)', async () => {
    mockPool(BASE).get('/wiki/rest/api/user/current').reply(429, {})
    const client = createConfluenceClient({
      user: 'u',
      token: 't',
      baseUrl: BASE
    })
    await expect(client.whoami()).rejects.toMatchObject({
      name: 'TimError',
      code: 'RATE_LIMIT'
    })
  })

  test('maps 500 to TimError(NETWORK) with the status code in the message', async () => {
    mockPool(BASE).get('/wiki/rest/api/user/current').reply(500, {})
    const client = createConfluenceClient({
      user: 'u',
      token: 't',
      baseUrl: BASE
    })
    await expect(client.whoami()).rejects.toMatchObject({
      name: 'TimError',
      code: 'NETWORK',
      message: expect.stringContaining('500')
    })
  })

  test('maps a fetch failure (no response) to TimError(NETWORK)', async () => {
    mockPool(BASE)
      .get('/wiki/rest/api/user/current')
      .replyWithError({ message: 'connection reset' })
    const client = createConfluenceClient({
      user: 'u',
      token: 't',
      baseUrl: BASE
    })
    await expect(client.whoami()).rejects.toMatchObject({
      name: 'TimError',
      code: 'NETWORK'
    })
  })

  test('maps an invalid JSON response body to TimError(PARSE)', async () => {
    mockPool(BASE)
      .get('/wiki/rest/api/user/current')
      .reply(200, 'not really json', {
        'content-type': 'application/json'
      })
    const client = createConfluenceClient({
      user: 'u',
      token: 't',
      baseUrl: BASE
    })
    await expect(client.whoami()).rejects.toMatchObject({
      name: 'TimError',
      code: 'PARSE'
    })
  })
})
