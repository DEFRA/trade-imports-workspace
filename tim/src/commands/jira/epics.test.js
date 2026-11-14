import { describe, test, expect, beforeEach } from 'vitest'
import { execa } from 'execa'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  mockJiraForEachTest,
  loadJiraFixture
} from '../../test-support/jira-mock.js'
import { runRegisteredCommand } from '../../test-support/process-output.js'
import { register } from './index.js'
import { runEpics, renderEpics, parseEpicsOptions } from './epics.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')

const jira = mockJiraForEachTest()

beforeEach(() => {
  delete process.env.JIRA_PROJECT_KEY
})

describe('parseEpicsOptions', () => {
  test('uses --project when given', () => {
    expect(parseEpicsOptions({ project: 'EUDPA' })).toEqual({
      project: 'EUDPA'
    })
  })

  test('falls back to JIRA_PROJECT_KEY when --project is not given', () => {
    process.env.JIRA_PROJECT_KEY = 'EUDPA'
    expect(parseEpicsOptions({})).toEqual({ project: 'EUDPA' })
  })

  test('throws USAGE when neither is set', () => {
    expect(() => parseEpicsOptions({})).toThrowError(
      expect.objectContaining({ code: 'USAGE' })
    )
  })
})

describe('runEpics', () => {
  test('returns the project and its open epics', async () => {
    jira()
      .get(/^\/rest\/api\/3\/search\/jql/)
      .reply(200, {
        issues: [
          { key: 'EUDPA-100', fields: { summary: 'Designer prototyping' } }
        ]
      })

    const result = await runEpics({ project: 'EUDPA' })
    expect(result).toEqual({
      project: 'EUDPA',
      epics: [{ key: 'EUDPA-100', summary: 'Designer prototyping' }]
    })
  })
})

describe('renderEpics', () => {
  test('lists key and summary per epic', () => {
    const text = renderEpics({
      project: 'EUDPA',
      epics: [{ key: 'EUDPA-100', summary: 'Designer prototyping' }]
    })
    expect(text).toBe('EUDPA-100  Designer prototyping')
  })

  test('says when there are none', () => {
    expect(renderEpics({ project: 'EUDPA', epics: [] })).toBe(
      'No open epics in EUDPA.'
    )
  })
})

describe('tim jira epics --json (spawn)', () => {
  test('emits an ok:false envelope with an AUTH error when no Jira credentials are set', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      [cliPath, 'jira', 'epics', '--project', 'EUDPA', '--json'],
      {
        reject: false,
        env: {
          ...process.env,
          JIRA_USER: '',
          JIRA_TOKEN: '',
          JIRA_BASE_URL: '',
          JIRA_PROJECT_KEY: ''
        }
      }
    )

    expect(exitCode).toBe(1)
    const payload = JSON.parse(stdout.trim())
    expect(payload).toMatchObject({
      ok: false,
      schema_version: 1,
      result: null,
      errors: [{ code: 'AUTH' }]
    })
  })
})

describe('tim jira epics --board', () => {
  const goldens = loadJiraFixture('board-epics-labels-bash-goldens.json')

  const servesBoardEpics = () =>
    jira()
      .get('/rest/agile/1.0/board/13780/epic?maxResults=100')
      .reply(200, goldens.boardEpicResponse)

  const runTim = (...args) => runRegisteredCommand(register, ...args)

  test("prints the board's open epics byte for byte as the Bash script did", async () => {
    servesBoardEpics()

    const { stdout, exitCode } = await runTim(
      'jira',
      'epics',
      '--board',
      '13780'
    )

    expect(stdout).toBe(`${goldens['epics-list'].stdout}\n`)
    expect(exitCode).toBe(0)
  })

  test('prints the done epics too with --include-done, as the Bash script did', async () => {
    servesBoardEpics()

    const { stdout } = await runTim(
      'jira',
      'epics',
      '--board',
      '13780',
      '--include-done'
    )

    expect(stdout).toBe(`${goldens['epics-list-include-done'].stdout}\n`)
  })

  test("puts the Bash script's JSON array in the envelope's result", async () => {
    servesBoardEpics()

    const { stdout } = await runTim(
      'jira',
      'epics',
      '--board',
      '13780',
      '--json'
    )

    expect(JSON.parse(stdout).result).toEqual({
      board: '13780',
      epics: goldens['epics-json'].stdout
    })
  })

  test("exits 1 with Jira's own messages, one per line, when Jira will not show the board", async () => {
    jira()
      .get('/rest/agile/1.0/board/99/epic?maxResults=100')
      .reply(404, {
        errorMessages: [
          'Board does not exist or you do not have permission to see it.'
        ],
        errors: {}
      })

    const { stdout, stderr, exitCode } = await runTim(
      'jira',
      'epics',
      '--board',
      '99'
    )

    expect({ stdout, stderr, exitCode }).toEqual({
      stdout: '',
      stderr: 'Board does not exist or you do not have permission to see it.\n',
      exitCode: 1
    })
  })

  test('prints nothing when the board has no open epics', async () => {
    jira()
      .get('/rest/agile/1.0/board/13780/epic?maxResults=100')
      .reply(200, { values: [] })

    const { stdout, exitCode } = await runTim(
      'jira',
      'epics',
      '--board',
      '13780'
    )

    expect(stdout).toBe('')
    expect(exitCode).toBe(0)
  })
})

describe('parseEpicsOptions with --board', () => {
  test('reads the board and whether to include done epics', () => {
    expect(parseEpicsOptions({ board: '13780', includeDone: true })).toEqual({
      board: '13780',
      includeDone: true
    })
  })

  test('refuses --project and --board together', () => {
    expect(() =>
      parseEpicsOptions({ project: 'EUDPA', board: '13780' })
    ).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: 'Give --project or --board, not both.'
      })
    )
  })

  test('refuses --include-done without --board', () => {
    expect(() =>
      parseEpicsOptions({ project: 'EUDPA', includeDone: true })
    ).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: 'Give --board with --include-done.'
      })
    )
  })

  test('refuses a board id that is not a number', () => {
    expect(() => parseEpicsOptions({ board: 'abc' })).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: 'Give --board as a number, such as 13780.'
      })
    )
  })
})
