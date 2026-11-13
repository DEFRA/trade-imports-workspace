import { describe, test, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import { renderPage, register } from './index.js'
import { mockJiraForEachTest } from '../../test-support/jira-mock.js'
import { captureProcessOutput } from '../../test-support/process-output.js'

const CONFLUENCE_FIXTURES = fileURLToPath(
  new URL('../../test-support/fixtures/confluence/', import.meta.url)
)

const fixtureText = (name) =>
  readFileSync(`${CONFLUENCE_FIXTURES}${name}`, 'utf8')

const FULL_EXPAND =
  'body.storage,body.view,version,space,history,metadata.labels'
const VIEW_EXPAND = 'body.view,version,space,history,metadata.labels'

describe('tim confluence page', () => {
  const atlassian = mockJiraForEachTest()

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const servesPage = (pageId, expand, responseText) =>
    atlassian()
      .get(`/wiki/rest/api/content/${pageId}`)
      .query({ expand })
      .reply(200, responseText, { 'content-type': 'application/json' })

  const runTim = async (...args) => {
    const captured = captureProcessOutput()
    const program = new Command().option('--json').exitOverride()
    register(program, { timVersion: '1.0.0' })

    await program.parseAsync(['node', 'tim', ...args])

    return captured
  }

  test.each([
    ['page-with-label', '6619005520'],
    ['page-no-labels', '6525093960'],
    ['page-no-body', '6525093960']
  ])(
    'prints the page details, labels and view body of %s byte for byte as the golden text',
    async (fixture, pageId) => {
      servesPage(pageId, FULL_EXPAND, fixtureText(`${fixture}.json`))

      const { stdout, exitCode } = await runTim('confluence', 'page', pageId)

      expect(stdout).toBe(fixtureText(`${fixture}.text.txt`))
      expect(exitCode).toBe(0)
    }
  )

  test("prints Confluence's own response byte for byte with --raw", async () => {
    const response = fixtureText('page-with-label.json')
    servesPage('6619005520', VIEW_EXPAND, response)

    const { stdout, exitCode } = await runTim(
      'confluence',
      'page',
      '6619005520',
      '--raw'
    )

    expect(stdout).toBe(response)
    expect(exitCode).toBe(0)
  })

  test('fetches the page a URL names', async () => {
    servesPage('6619005520', FULL_EXPAND, fixtureText('page-with-label.json'))

    const { stdout } = await runTim(
      'confluence',
      'page',
      'https://example.atlassian.net/wiki/spaces/EUDP/pages/6619005520/02+INS+Auth'
    )

    expect(stdout.split('\n')[0]).toBe('=== Page 6619005520 ===')
  })

  test('returns the storage body as body and the page details in --json', async () => {
    const page = JSON.parse(fixtureText('page-with-label.json'))
    const withStorage = {
      ...page,
      body: { ...page.body, storage: { value: '<p>storage</p>' } }
    }
    servesPage('6619005520', FULL_EXPAND, JSON.stringify(withStorage))

    const { stdout } = await runTim(
      'confluence',
      'page',
      '6619005520',
      '--json'
    )

    expect(JSON.parse(stdout).result).toEqual({
      id: '6619005520',
      title: '02 INS Auth: Scenario 0, John signs in',
      version: 48,
      body: '<p>storage</p>',
      space: 'EUDP',
      updated: '2026-10-22T13:35:45.624Z',
      updatedBy: 'Ben Letton',
      url: 'https://example.atlassian.net/wiki/spaces/EUDP/pages/6619005520',
      labels: ['generated'],
      bodyView: page.body.view.value
    })
  })

  test('refuses input with no page id with exit code 2', async () => {
    const { stderr, exitCode } = await runTim('confluence', 'page', 'abc')

    expect(stderr).toBe(
      'Cannot find a page id in "abc". Give a page id, or a page URL with /pages/<id> in it.\n'
    )
    expect(exitCode).toBe(2)
  })

  test('exits 2 with an AUTH error when Confluence refuses the credentials', async () => {
    atlassian()
      .get('/wiki/rest/api/content/123')
      .query({ expand: FULL_EXPAND })
      .reply(401, {})

    const { stdout, exitCode } = await runTim(
      'confluence',
      'page',
      '123',
      '--json'
    )

    expect(JSON.parse(stdout).errors[0].code).toBe('AUTH')
    expect(exitCode).toBe(2)
  })

  test('exits 1 with a NOT_FOUND error when the page does not exist', async () => {
    atlassian()
      .get('/wiki/rest/api/content/123')
      .query({ expand: FULL_EXPAND })
      .reply(404, {})

    const { stdout, exitCode } = await runTim(
      'confluence',
      'page',
      '123',
      '--json'
    )

    expect(JSON.parse(stdout).errors[0].code).toBe('NOT_FOUND')
    expect(exitCode).toBe(1)
  })
})

describe('renderPage', () => {
  test('shows null for missing details, as the page layout always has', () => {
    const text = renderPage({
      id: '1',
      title: null,
      version: null,
      space: null,
      updated: null,
      updatedBy: null,
      url: 'https://example.atlassian.net/wiki/spaces/null/pages/1',
      labels: [],
      bodyView: ''
    })

    expect(text).toBe(
      [
        '=== Page 1 ===',
        'Title: null',
        'Space: null',
        'Version: null (Updated: null)',
        'Updated by: null',
        'URL: https://example.atlassian.net/wiki/spaces/null/pages/1',
        '',
        '=== Labels ===',
        '',
        '=== Body (HTML) ===',
        ''
      ].join('\n')
    )
  })
})
