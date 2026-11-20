import { describe, test, expect } from 'vitest'
import { mockJiraForEachTest } from '../../test-support/jira-mock.js'
import { runRegisteredCommand } from '../../test-support/process-output.js'
import { register } from './index.js'
import { renderMoveToTopResult, runMoveToTop } from './move-to-top.js'

const FIRST_TO_DO_PATH = `/rest/api/3/search/jql?jql=${encodeURIComponent(
  'project = EUDPA AND status = "To Do" ORDER BY Rank ASC'
)}&fields=summary,status,issuetype&maxResults=1`
const RANK_PATH = '/rest/agile/1.0/issue/rank'

const jira = mockJiraForEachTest()

const runTim = (...args) => runRegisteredCommand(register, ...args)

const ticketInStatus = (status) =>
  jira()
    .get('/rest/api/2/issue/EUDPA-200')
    .reply(200, { key: 'EUDPA-200', fields: { status: { name: status } } })

const firstToDoReads = (...keys) =>
  keys.forEach((key) =>
    jira()
      .get(FIRST_TO_DO_PATH)
      .reply(200, {
        issues: [{ key, fields: { summary: 'S', status: { name: 'To Do' } } }]
      })
  )

const acceptsRank = () => {
  const sent = { body: null }
  jira()
    .put(RANK_PATH, (body) => {
      sent.body = body
      return true
    })
    .reply(204)
  return sent
}

describe('runMoveToTop', () => {
  test('a dry run names the ticket it would rank above and sends no rank', async () => {
    ticketInStatus('To Do')
    firstToDoReads('EUDPA-100')

    const result = await runMoveToTop({ key: 'EUDPA-200', confirm: false })

    expect(result).toEqual({
      mode: 'dry-run',
      key: 'EUDPA-200',
      status: 'To Do',
      above: 'EUDPA-100'
    })
  })

  test('--confirm ranks the ticket above the first in its status and reads the order again', async () => {
    ticketInStatus('To Do')
    firstToDoReads('EUDPA-100', 'EUDPA-100', 'EUDPA-200')
    const sent = acceptsRank()

    const result = await runMoveToTop({
      key: 'EUDPA-200',
      confirm: true,
      readBackAttempts: 3,
      readBackDelayMs: 0
    })

    expect({ result, sent: sent.body }).toEqual({
      result: {
        mode: 'moved',
        key: 'EUDPA-200',
        status: 'To Do',
        above: 'EUDPA-100'
      },
      sent: { issues: ['EUDPA-200'], rankBeforeIssue: 'EUDPA-100' }
    })
  })

  test('leaves a ticket that is already first alone, even with --confirm', async () => {
    ticketInStatus('To Do')
    firstToDoReads('EUDPA-200')

    const result = await runMoveToTop({ key: 'EUDPA-200', confirm: true })

    expect(result).toEqual({
      mode: 'unchanged',
      key: 'EUDPA-200',
      status: 'To Do',
      above: null
    })
  })

  test('fails when Jira accepts the rank but the ticket is still not first', async () => {
    ticketInStatus('To Do')
    firstToDoReads('EUDPA-100', 'EUDPA-100', 'EUDPA-100')
    acceptsRank()

    await expect(
      runMoveToTop({
        key: 'EUDPA-200',
        confirm: true,
        readBackAttempts: 2,
        readBackDelayMs: 0
      })
    ).rejects.toMatchObject({
      code: 'UNKNOWN',
      message:
        'Jira accepted the rank, but EUDPA-200 is not the first To Do ticket in EUDPA. Check the board in Jira.'
    })
  })

  test('refuses a key that is not a Jira key', async () => {
    await expect(
      runMoveToTop({ key: 'eudpa 200', confirm: false })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: 'Give a Jira ticket key, for example EUDPA-200.'
    })
  })
})

describe('tim jira move-to-top', () => {
  test('--json puts the rank in the envelope', async () => {
    ticketInStatus('To Do')
    firstToDoReads('EUDPA-100', 'EUDPA-200')
    acceptsRank()

    const { stdout, exitCode } = await runTim(
      'jira',
      'move-to-top',
      'EUDPA-200',
      '--confirm',
      '--json'
    )

    expect({ result: JSON.parse(stdout).result, exitCode }).toEqual({
      result: {
        mode: 'moved',
        key: 'EUDPA-200',
        status: 'To Do',
        above: 'EUDPA-100'
      },
      exitCode: 0
    })
  })
})

describe('renderMoveToTopResult', () => {
  test('renders a dry run', () => {
    expect(
      renderMoveToTopResult({
        mode: 'dry-run',
        key: 'EUDPA-200',
        status: 'To Do',
        above: 'EUDPA-100'
      })
    ).toBe(
      [
        'Would rank EUDPA-200 above EUDPA-100, the first To Do ticket now.',
        'This is a dry run. No request has been sent. Add --confirm to move it for real.'
      ].join('\n')
    )
  })

  test('renders a rank', () => {
    expect(
      renderMoveToTopResult({
        mode: 'moved',
        key: 'EUDPA-200',
        status: 'To Do',
        above: 'EUDPA-100'
      })
    ).toBe(
      'Ranked EUDPA-200 above EUDPA-100, so it is the first To Do ticket. Checked on Jira.'
    )
  })

  test('says nothing changed for a ticket already first', () => {
    expect(
      renderMoveToTopResult({
        mode: 'unchanged',
        key: 'EUDPA-200',
        status: 'To Do',
        above: null
      })
    ).toBe('EUDPA-200 is already the first To Do ticket. Nothing changed.')
  })
})
