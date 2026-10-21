import { describe, test, expect } from 'vitest'
import { execa } from 'execa'
import {
  loadJiraFixture,
  mockJiraForEachTest
} from '../../test-support/jira-mock.js'
import { TIM_CLI_PATH } from '../../test-support/tim-cli.js'
import { runAssign, renderAssignResult } from './assign.js'

const ASSIGNEE_PATH = '/rest/api/2/issue/EUDPA-200?fields=assignee'
const PAT = {
  accountId: '557058:aaaa1111-2222-3333-4444-555566667777',
  displayName: 'Pat Example'
}
const ME = { accountId: '557058:me', displayName: 'Sam Example' }

const jira = mockJiraForEachTest()

const assigneeReads = (...assignees) =>
  assignees.forEach((assignee) =>
    jira()
      .get(ASSIGNEE_PATH)
      .reply(200, { key: 'EUDPA-200', fields: { assignee } })
  )

const signedInAs = (user) => jira().get('/rest/api/2/myself').reply(200, user)

const acceptsAssignment = () => {
  const sent = { body: null }
  jira()
    .put('/rest/api/2/issue/EUDPA-200/assignee', (body) => {
      sent.body = body
      return true
    })
    .reply(204)
  return sent
}

describe('runAssign', () => {
  test('a dry run resolves "me", reads the current assignee and sends no write', async () => {
    signedInAs(ME)
    jira().get(ASSIGNEE_PATH).reply(200, loadJiraFixture('issue-assignee.json'))

    const result = await runAssign({
      key: 'EUDPA-200',
      assignee: 'me',
      confirm: false
    })

    expect(result).toEqual({
      mode: 'dry-run',
      key: 'EUDPA-200',
      accountId: '557058:me',
      previousAssignee: PAT
    })
  })

  test('--confirm assigns the account id and reads it back', async () => {
    assigneeReads(null, PAT)
    const sent = acceptsAssignment()

    const result = await runAssign({
      key: 'EUDPA-200',
      assignee: PAT.accountId,
      confirm: true
    })

    expect({ result, sent: sent.body }).toEqual({
      result: {
        mode: 'assigned',
        key: 'EUDPA-200',
        accountId: PAT.accountId,
        previousAssignee: null,
        assignee: PAT
      },
      sent: { accountId: PAT.accountId }
    })
  })

  test('leaves a ticket already assigned to that account alone, even with --confirm', async () => {
    assigneeReads(PAT)

    const result = await runAssign({
      key: 'EUDPA-200',
      assignee: PAT.accountId,
      confirm: true
    })

    expect(result).toEqual({
      mode: 'unchanged',
      key: 'EUDPA-200',
      accountId: PAT.accountId,
      previousAssignee: PAT,
      assignee: PAT
    })
  })

  test('fails when Jira accepts the assignment but the read-back shows someone else', async () => {
    assigneeReads(null, null)
    acceptsAssignment()

    await expect(
      runAssign({ key: 'EUDPA-200', assignee: PAT.accountId, confirm: true })
    ).rejects.toMatchObject({
      code: 'UNKNOWN',
      message:
        'Jira accepted the assignment, but EUDPA-200 is assigned to nobody. Check the ticket in Jira.'
    })
  })

  test('fails when Jira returns no account id for "me"', async () => {
    signedInAs({ name: 'sam', displayName: 'Sam Example' })

    await expect(
      runAssign({ key: 'EUDPA-200', assignee: 'me', confirm: false })
    ).rejects.toMatchObject({
      code: 'UNKNOWN',
      message:
        'Jira did not return your account id. Give the account id instead of "me".'
    })
  })

  test('refuses a key that is not a Jira key', async () => {
    await expect(
      runAssign({ key: 'eudpa 200', assignee: 'me', confirm: false })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: 'Give a Jira ticket key, for example EUDPA-200.'
    })
  })

  test('refuses an assignee with spaces in it', async () => {
    await expect(
      runAssign({ key: 'EUDPA-200', assignee: 'Pat Example', confirm: false })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: 'Give an Atlassian account id, or "me".'
    })
  })
})

describe('renderAssignResult', () => {
  test('renders a dry run with who has the ticket now', () => {
    expect(
      renderAssignResult({
        mode: 'dry-run',
        key: 'EUDPA-200',
        accountId: '557058:me',
        previousAssignee: PAT
      })
    ).toBe(
      [
        'Would assign EUDPA-200 to 557058:me. It is assigned to Pat Example now.',
        'This is a dry run. No request has been sent. Add --confirm to assign for real.'
      ].join('\n')
    )
  })

  test('renders an assignment with the previous assignee', () => {
    expect(
      renderAssignResult({
        mode: 'assigned',
        key: 'EUDPA-200',
        accountId: PAT.accountId,
        previousAssignee: null,
        assignee: PAT
      })
    ).toBe('Assigned EUDPA-200 to Pat Example, from nobody. Checked on Jira.')
  })

  test('says nothing changed for a ticket already assigned to that account', () => {
    expect(
      renderAssignResult({
        mode: 'unchanged',
        key: 'EUDPA-200',
        accountId: PAT.accountId,
        previousAssignee: PAT,
        assignee: PAT
      })
    ).toBe('EUDPA-200 is already assigned to Pat Example. Nothing changed.')
  })
})

describe('tim jira assign (spawn)', () => {
  test('emits an AUTH envelope when no Jira credentials are set', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      [TIM_CLI_PATH, 'jira', 'assign', 'EUDPA-200', 'me', '--json'],
      {
        reject: false,
        env: {
          ...process.env,
          JIRA_USER: '',
          JIRA_TOKEN: '',
          JIRA_BASE_URL: ''
        }
      }
    )

    expect({ exitCode, payload: JSON.parse(stdout.trim()) }).toMatchObject({
      exitCode: 1,
      payload: { ok: false, errors: [{ code: 'AUTH' }] }
    })
  })

  test('shows the dry-run and --confirm forms in --help', async () => {
    const { stdout } = await execa('node', [
      TIM_CLI_PATH,
      'jira',
      'assign',
      '--help'
    ])

    expect(stdout).toContain(
      [
        'Examples:',
        '  tim jira assign EUDPA-200 me --json',
        '  tim jira assign EUDPA-200 <accountId> --confirm --json'
      ].join('\n')
    )
  })
})
