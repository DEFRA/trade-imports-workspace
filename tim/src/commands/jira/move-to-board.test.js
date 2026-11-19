import { describe, test, expect, vi, afterEach } from 'vitest'
import { mockJiraForEachTest } from '../../test-support/jira-mock.js'
import { runRegisteredCommand } from '../../test-support/process-output.js'
import { bundledRoster, timWorkspaceRoot } from '../../test-support/roster.js'
import { register } from './index.js'
import {
  parseMoveToBoardOptions,
  renderMoveToBoardResult,
  runMoveToBoard
} from './move-to-board.js'

const BACKLOG_PATH =
  '/rest/agile/1.0/board/13780/backlog?jql=key%20%3D%20EUDPA-200&fields=summary&maxResults=1'
const MOVE_PATH = '/rest/agile/1.0/board/13780/issue'

const jira = mockJiraForEachTest()

afterEach(() => {
  vi.restoreAllMocks()
})

const runTim = (...args) => runRegisteredCommand(register, ...args)

const backlogReads = (...holdsTicket) =>
  holdsTicket.forEach((holds) =>
    jira()
      .get(BACKLOG_PATH)
      .reply(200, {
        issues: holds ? [{ key: 'EUDPA-200', fields: { summary: 'S' } }] : []
      })
  )

const acceptsMove = () => {
  const sent = { body: null }
  jira()
    .post(MOVE_PATH, (body) => {
      sent.body = body
      return true
    })
    .reply(204)
  return sent
}

describe('runMoveToBoard', () => {
  test('a dry run reads the backlog and sends no move', async () => {
    backlogReads(true)

    const result = await runMoveToBoard({
      key: 'EUDPA-200',
      board: '13780',
      confirm: false
    })

    expect(result).toEqual({
      mode: 'dry-run',
      key: 'EUDPA-200',
      board: '13780'
    })
  })

  test('--confirm moves the ticket onto the board and reads the backlog again', async () => {
    backlogReads(true, false)
    const sent = acceptsMove()

    const result = await runMoveToBoard({
      key: 'EUDPA-200',
      board: '13780',
      confirm: true,
      readBackDelayMs: 0
    })

    expect({ result, sent: sent.body }).toEqual({
      result: { mode: 'moved', key: 'EUDPA-200', board: '13780' },
      sent: { issues: ['EUDPA-200'] }
    })
  })

  test('reads the backlog again until the move shows, while Jira trails it', async () => {
    backlogReads(true, true, true, false)
    acceptsMove()

    const result = await runMoveToBoard({
      key: 'EUDPA-200',
      board: '13780',
      confirm: true,
      readBackAttempts: 3,
      readBackDelayMs: 0
    })

    expect(result).toEqual({ mode: 'moved', key: 'EUDPA-200', board: '13780' })
  })

  test('leaves a ticket not in the backlog alone, even with --confirm', async () => {
    backlogReads(false)

    const result = await runMoveToBoard({
      key: 'EUDPA-200',
      board: '13780',
      confirm: true
    })

    expect(result).toEqual({
      mode: 'unchanged',
      key: 'EUDPA-200',
      board: '13780'
    })
  })

  test('fails when Jira accepts the move but the ticket is still in the backlog', async () => {
    backlogReads(true, true, true)
    acceptsMove()

    await expect(
      runMoveToBoard({
        key: 'EUDPA-200',
        board: '13780',
        confirm: true,
        readBackAttempts: 2,
        readBackDelayMs: 0
      })
    ).rejects.toMatchObject({
      code: 'UNKNOWN',
      message:
        "Jira accepted the move, but EUDPA-200 is still in board 13780's backlog. Check the board in Jira."
    })
  })

  test('refuses a key that is not a Jira key', async () => {
    await expect(
      runMoveToBoard({ key: 'eudpa 200', board: '13780', confirm: false })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: 'Give a Jira ticket key, for example EUDPA-200.'
    })
  })
})

describe('parseMoveToBoardOptions', () => {
  test("takes the workspace's board and a dry run when neither is given", () => {
    expect(parseMoveToBoardOptions({ workspace: timWorkspaceRoot })).toEqual({
      board: String(bundledRoster.jiraBoard),
      confirm: false
    })
  })

  test('refuses a board that is not a number', () => {
    expect(() => parseMoveToBoardOptions({ board: 'EUDPA' })).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message: 'Give --board as a number, such as 13780.'
      })
    )
  })
})

describe('tim jira move-to-board', () => {
  test('--json puts the move in the envelope', async () => {
    backlogReads(true, false)
    acceptsMove()

    const { stdout, exitCode } = await runTim(
      'jira',
      'move-to-board',
      'EUDPA-200',
      '--board',
      '13780',
      '--confirm',
      '--json'
    )

    expect({ result: JSON.parse(stdout).result, exitCode }).toEqual({
      result: { mode: 'moved', key: 'EUDPA-200', board: '13780' },
      exitCode: 0
    })
  })

  test("reads the workspace's board when --board is left out", async () => {
    backlogReads(true)

    const { stdout, exitCode } = await runTim(
      'jira',
      'move-to-board',
      'EUDPA-200',
      '--workspace',
      timWorkspaceRoot,
      '--json'
    )

    expect({ result: JSON.parse(stdout).result, exitCode }).toEqual({
      result: {
        mode: 'dry-run',
        key: 'EUDPA-200',
        board: String(bundledRoster.jiraBoard)
      },
      exitCode: 0
    })
  })

  test('exits 2 with a usage message when --board is not a number', async () => {
    const { stderr, exitCode } = await runTim(
      'jira',
      'move-to-board',
      'EUDPA-200',
      '--board',
      'EUDPA'
    )

    expect({ stderr, exitCode }).toEqual({
      stderr: 'Give --board as a number, such as 13780.\n',
      exitCode: 2
    })
  })
})

describe('renderMoveToBoardResult', () => {
  test('renders a dry run', () => {
    expect(
      renderMoveToBoardResult({
        mode: 'dry-run',
        key: 'EUDPA-200',
        board: '13780'
      })
    ).toBe(
      [
        "Would move EUDPA-200 from board 13780's backlog onto the board.",
        'This is a dry run. No request has been sent. Add --confirm to move it for real.'
      ].join('\n')
    )
  })

  test('renders a move', () => {
    expect(
      renderMoveToBoardResult({
        mode: 'moved',
        key: 'EUDPA-200',
        board: '13780'
      })
    ).toBe(
      "Moved EUDPA-200 from board 13780's backlog onto the board. Checked on Jira."
    )
  })

  test('says nothing changed for a ticket not in the backlog', () => {
    expect(
      renderMoveToBoardResult({
        mode: 'unchanged',
        key: 'EUDPA-200',
        board: '13780'
      })
    ).toBe("EUDPA-200 is not in board 13780's backlog. Nothing changed.")
  })
})
