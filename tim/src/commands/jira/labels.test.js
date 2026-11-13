import { describe, test, expect, vi, afterEach } from 'vitest'
import {
  mockJiraForEachTest,
  loadJiraFixture
} from '../../test-support/jira-mock.js'
import { runRegisteredCommand } from '../../test-support/process-output.js'
import { register } from './index.js'
import { parseLabelsOptions, renderLabels } from './labels.js'

const goldens = loadJiraFixture('board-epics-labels-bash-goldens.json')

const jira = mockJiraForEachTest()

afterEach(() => {
  vi.restoreAllMocks()
})

const runTim = (...args) => runRegisteredCommand(register, ...args)

const servesBoardBacklog = () =>
  jira()
    .get('/rest/agile/1.0/board/13780/backlog?maxResults=1000&fields=labels')
    .reply(200, goldens.boardBacklogResponse)

describe('tim jira labels --board', () => {
  test('prints the label counts byte for byte as the Bash script did', async () => {
    servesBoardBacklog()

    const { stdout, exitCode } = await runTim(
      'jira',
      'labels',
      '--board',
      '13780'
    )

    expect(stdout).toBe(`${goldens['labels-list'].stdout}\n`)
    expect(exitCode).toBe(0)
  })

  test("puts the Bash script's JSON array in the envelope's result", async () => {
    servesBoardBacklog()

    const { stdout } = await runTim(
      'jira',
      'labels',
      '--board',
      '13780',
      '--json'
    )

    expect(JSON.parse(stdout).result).toEqual({
      board: '13780',
      labels: goldens['labels-json'].stdout
    })
  })

  test("exits 1 with Jira's own messages, one per line, when Jira will not show the board", async () => {
    jira()
      .get('/rest/agile/1.0/board/99/backlog?maxResults=1000&fields=labels')
      .reply(404, {
        errorMessages: ['Board does not exist.', 'Check the board id.'],
        errors: {}
      })

    const { stdout, stderr, exitCode } = await runTim(
      'jira',
      'labels',
      '--board',
      '99'
    )

    expect({ stdout, stderr, exitCode }).toEqual({
      stdout: '',
      stderr: 'Board does not exist.\nCheck the board id.\n',
      exitCode: 1
    })
  })

  test("puts Jira's messages in the error envelope with --json", async () => {
    jira()
      .get('/rest/agile/1.0/board/99/backlog?maxResults=1000&fields=labels')
      .reply(404, { errorMessages: ['Board does not exist.'], errors: {} })

    const { stdout, exitCode } = await runTim(
      'jira',
      'labels',
      '--board',
      '99',
      '--json'
    )

    expect(JSON.parse(stdout).errors).toEqual([
      { code: 'NOT_FOUND', message: 'Board does not exist.' }
    ])
    expect(exitCode).toBe(1)
  })

  test('exits 2 with a usage message when --board is missing', async () => {
    const { stderr, exitCode } = await runTim('jira', 'labels')

    expect(stderr).toBe('Give --board <id>, such as 13780.\n')
    expect(exitCode).toBe(2)
  })
})

describe('renderLabels', () => {
  test('pads the count to four columns and puts labels used equally in reverse alphabetical order', () => {
    const text = renderLabels({
      labels: [
        { label: 'Change', count: 1 },
        { label: 'hedy', count: 1 },
        { label: 'NewRequirement', count: 1 },
        { label: 'Skeleton', count: 31 }
      ]
    })

    expect(text).toBe(
      ['  31 Skeleton', '   1 NewRequirement', '   1 hedy', '   1 Change'].join(
        '\n'
      )
    )
  })

  test('prints nothing when the backlog has no labels', () => {
    expect(renderLabels({ labels: [] })).toBeNull()
  })
})

describe('parseLabelsOptions', () => {
  test('refuses a board id that is not a number', () => {
    expect(() => parseLabelsOptions({ board: 'abc' })).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: 'Give --board as a number, such as 13780.'
      })
    )
  })
})
