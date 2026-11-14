import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ROOT_ID,
  mockConfluence
} from '../../confluence/__fixtures__/confluence-tree.js'
import {
  CLEAN_SCRIPT,
  MIRROR_FOLDER,
  syncCases
} from '../../confluence/__fixtures__/sync-cases.js'
import {
  normaliseRecordedText,
  recordFolderFiles,
  stageBashWorkspace
} from '../../test-support/bash-golden-harness.js'
import { renderPage, register } from './index.js'
import { mockJiraForEachTest } from '../../test-support/jira-mock.js'
import { runRegisteredCommand } from '../../test-support/process-output.js'

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

  const runTim = (...args) => runRegisteredCommand(register, ...args)

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

const SCRIPT_GOLDEN = JSON.parse(
  readFileSync(
    new URL(
      '../../confluence/__fixtures__/__golden__/confluence-scripts.json',
      import.meta.url
    ),
    'utf8'
  )
)

const goldenFor = (name) =>
  SCRIPT_GOLDEN.find((recording) => recording.case === name)

const timArgsFor = ({ script, args }) =>
  script === CLEAN_SCRIPT ? [...args, '--clean'] : args

describe('tim confluence sync', () => {
  const atlassian = mockJiraForEachTest()
  const state = { staged: null }

  beforeEach(() => {
    mockConfluence(() => atlassian())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    state.staged?.remove()
  })

  const stageWorkspace = (files = {}) => {
    state.staged = stageBashWorkspace({
      scripts: [],
      files: {
        'repos.json': '[]\n',
        'docs/best-practices/README.md': '# Best practices\n',
        ...files
      }
    })
    process.env.TIM_WORKSPACE = state.staged.root
    return state.staged
  }

  const runSync = async (syncCase) => {
    const staged = stageWorkspace(syncCase.files)
    const { stdout, stderr, exitCode } = await runRegisteredCommand(
      register,
      'confluence',
      'sync',
      ...timArgsFor(syncCase)
    )
    return {
      exitCode,
      stdout: normaliseRecordedText(stdout, staged.home),
      stderr: normaliseRecordedText(stderr, staged.home),
      files: recordFolderFiles(join(staged.root, MIRROR_FOLDER), staged.home)
    }
  }

  const SAME_AS_BASH = [
    'full sync',
    'dry run',
    'one page refreshed in place',
    'one page dry run',
    'clean removes an orphan then syncs',
    'clean with nothing to remove'
  ]

  test.each(SAME_AS_BASH)(
    'writes the output, files and exit code the Bash scripts did for: %s',
    async (name) => {
      const syncCase = syncCases.find((candidate) => candidate.name === name)

      const recording = await runSync(syncCase)

      const { case: _, ...golden } = goldenFor(name)
      expect(recording).toEqual(golden)
    }
  )

  test('says a never-synced page needs a full sync first and exits 1', async () => {
    const syncCase = syncCases.find(
      ({ name }) => name === 'one page never synced'
    )

    const recording = await runSync(syncCase)

    expect(recording).toEqual({
      exitCode: 1,
      stdout: '',
      stderr:
        'No synced file found for page 999 under <HOME>/git/defra/trade-imports-workspace/docs/confluence. Run a full sync first so its path is known: tim confluence sync\n',
      files: goldenFor('one page never synced').files
    })
  })

  test('stops with a not-found error and exit 1 when the root does not exist', async () => {
    const recording = await runSync(
      syncCases.find(({ name }) => name === 'unknown root')
    )

    expect(recording.exitCode).toBe(1)
    expect(recording.stderr).toBe('getChildren(999): not found.\n')
    expect(recording.stdout.split('\n').at(-2)).toBe('[root-folder]')
  })

  test('refuses to start without JIRA_BASE_URL, writing nothing', async () => {
    delete process.env.JIRA_BASE_URL

    const recording = await runSync(
      syncCases.find(({ name }) => name === 'no base URL')
    )

    expect(recording).toEqual({
      exitCode: 2,
      stdout: '',
      stderr: 'Set JIRA_BASE_URL to point at the Atlassian instance.\n',
      files: {}
    })
  })

  test('refuses to start without JIRA_TOKEN, exits 1 and leaves the mirror for --clean in place', async () => {
    delete process.env.JIRA_TOKEN
    const cleanCase = syncCases.find(
      ({ name }) => name === 'clean removes an orphan then syncs'
    )

    const recording = await runSync(cleanCase)

    expect(recording).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: 'Set JIRA_USER and JIRA_TOKEN to authenticate with Confluence.\n',
      files: { 'orphan.md': 'Deleted in Confluence\n' }
    })
  })

  test('refuses a --root-id with no page id in it, exits 2 and leaves the mirror for --clean in place', async () => {
    const cleanCase = syncCases.find(
      ({ name }) => name === 'clean removes an orphan then syncs'
    )

    const recording = await runSync({
      ...cleanCase,
      args: ['--root-id', 'root-folder']
    })

    expect(recording).toEqual({
      exitCode: 2,
      stdout: '',
      stderr:
        'Cannot find a page id in "root-folder". Give a page id, or a page URL with /pages/<id> in it.\n',
      files: { 'orphan.md': 'Deleted in Confluence\n' }
    })
  })

  test('refuses a --page-id with no page id in it, exits 2 and leaves the synced files as they were', async () => {
    const refreshCase = syncCases.find(
      ({ name }) => name === 'one page refreshed in place'
    )

    const recording = await runSync({
      ...refreshCase,
      args: ['--page-id', 'not-a-page']
    })

    expect(recording).toEqual({
      exitCode: 2,
      stdout: '',
      stderr:
        'Cannot find a page id in "not-a-page". Give a page id, or a page URL with /pages/<id> in it.\n',
      files: goldenFor('one page never synced').files
    })
  })

  test('refreshes the page a --page-id URL names, as it does for the bare id', async () => {
    const refreshCase = syncCases.find(
      ({ name }) => name === 'one page refreshed in place'
    )

    const recording = await runSync({
      ...refreshCase,
      args: [
        '--page-id',
        'https://example.atlassian.net/wiki/spaces/EUDP/pages/301/Some+title'
      ]
    })

    const { case: _, ...golden } = goldenFor('one page refreshed in place')
    expect(recording).toEqual(golden)
  })

  test('writes only under the workspace it runs in, and reports that folder in --json', async () => {
    const staged = stageWorkspace()

    const { stdout } = await runRegisteredCommand(
      register,
      'confluence',
      'sync',
      '--root-id',
      ROOT_ID,
      '--json'
    )

    const { result } = JSON.parse(stdout)
    expect(result.outputDir).toBe(join(staged.root, MIRROR_FOLDER))
    expect(result.pages).toHaveLength(7)
    expect(stdout.split('\n')).toHaveLength(2)
  })
})
