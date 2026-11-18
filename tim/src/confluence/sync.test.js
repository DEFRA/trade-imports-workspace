import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createConfluenceClient } from '../clients/confluence-client.js'
import { closeHttpMocks, installHttpMocks } from '../test-support/http-mock.js'
import {
  CONFLUENCE_ORIGIN,
  ROOT_ID,
  mockConfluence
} from './__fixtures__/confluence-tree.js'
import { mirrorFolderOf, pageFileText, slugOf, syncConfluence } from './sync.js'

describe('#slugOf', () => {
  test.each([
    ['Overview & Goals', 'overview-and-goals'],
    ['  Études: Notes!  ', 'tudes-notes'],
    ['--Deep--Page--', 'deep-page'],
    ['Capability "Map" v2', 'capability-map-v2'],
    ['', '']
  ])('turns %j into %j', (title, slug) => {
    expect(slugOf(title)).toBe(slug)
  })
})

describe('#pageFileText', () => {
  test('writes the page details as front matter, with quotes in the title escaped', () => {
    const text = pageFileText(
      {
        id: '7',
        title: 'Say "hi"',
        version: 4,
        space: 'EUDP',
        updated: '2026-10-22T13:35:45.624Z',
        body: '<p>Body</p>'
      },
      'https://example.atlassian.net'
    )

    expect(text).toBe(
      [
        '---',
        'confluence-page-id: "7"',
        'title: "Say \\"hi\\""',
        'version: 4',
        'space: EUDP',
        'last-updated: "2026-10-22T13:35:45.624Z"',
        'url: "https://example.atlassian.net/wiki/spaces/EUDP/pages/7"',
        '---',
        '',
        '# Say "hi"',
        '',
        'Body',
        ''
      ].join('\n')
    )
  })

  test('writes null for details Confluence left out', () => {
    const text = pageFileText(
      {
        id: '7',
        title: null,
        version: null,
        space: null,
        updated: null,
        body: ''
      },
      'https://example.atlassian.net'
    )

    expect(text.split('\n').slice(2, 7)).toEqual([
      'title: "null"',
      'version: null',
      'space: null',
      'last-updated: "null"',
      'url: "https://example.atlassian.net/wiki/spaces/null/pages/7"'
    ])
  })
})

describe('#syncConfluence', () => {
  const state = { workspaceRoot: null }

  beforeEach(() => {
    mockConfluence(installHttpMocks().mockPool)
    state.workspaceRoot = mkdtempSync(join(tmpdir(), 'tim-confluence-sync-'))
  })

  afterEach(() => {
    closeHttpMocks()
    rmSync(state.workspaceRoot, { recursive: true, force: true })
  })

  const sync = (options) =>
    syncConfluence({
      client: createConfluenceClient({
        user: 'sam',
        token: 'token',
        baseUrl: CONFLUENCE_ORIGIN
      }),
      workspaceRoot: state.workspaceRoot,
      baseUrl: CONFLUENCE_ORIGIN,
      pause: async () => {},
      ...options
    })

  test('returns each written page with its path inside the mirror folder', async () => {
    const result = await sync({ rootId: ROOT_ID })

    expect(result.pages.map(({ id, path }) => [id, path])).toEqual([
      ['201', 'overview-and-goals.md'],
      ['202', 'architecture/index.md'],
      ['301', 'architecture/data-flow.md'],
      ['401', 'architecture/sub-folder/deep-page.md'],
      ['205', 'capability-map.md'],
      ['206', 'empty-page.md'],
      ['204', 'team-folder/tudes-notes.md']
    ])
    expect(result.outputDir).toBe(mirrorFolderOf(state.workspaceRoot))
  })

  test('refuses a page that has never been synced, naming the next step', async () => {
    await expect(sync({ pageId: '301' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: `No synced file found for page 301 under ${mirrorFolderOf(state.workspaceRoot)}. Run a full sync first so its path is known: tim confluence sync`
    })
  })
})
