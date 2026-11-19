import { describe, expect, test } from 'vitest'
import { runOf, unattendedRunOf, unattendedTicketOf } from './run-id.js'

describe('#runOf', () => {
  test.each([
    [
      { ticket: 'EUDPA-264' },
      { runId: 'EUDPA-264', branch: 'chore/EUDPA-264' }
    ],
    [
      { branch: 'feat/EUDPA-31-govuk-6' },
      { runId: 'EUDPA-31', branch: 'feat/EUDPA-31-govuk-6' }
    ],
    [
      { branch: 'spike/govuk 6+' },
      { runId: 'spike_govuk_6_', branch: 'spike/govuk 6+' }
    ],
    [
      { branch: 'chore/ABC-12-bump', projectKey: 'ABC' },
      { runId: 'ABC-12', branch: 'chore/ABC-12-bump' }
    ],
    [
      { branch: 'chore/EUDPA-12-bump', projectKey: 'ABC' },
      { runId: 'chore_EUDPA-12-bump', branch: 'chore/EUDPA-12-bump' }
    ]
  ])('Should give %o the run and branch %o', (input, expected) => {
    expect(runOf({ projectKey: 'EUDPA', ...input })).toEqual(expected)
  })

  test('Should take the project key from JIRA_PROJECT_KEY', () => {
    const before = process.env.JIRA_PROJECT_KEY
    process.env.JIRA_PROJECT_KEY = 'ABC'

    try {
      expect(runOf({ ticket: 'ABC-7' })).toEqual({
        runId: 'ABC-7',
        branch: 'chore/ABC-7'
      })
    } finally {
      if (before === undefined) delete process.env.JIRA_PROJECT_KEY
      else process.env.JIRA_PROJECT_KEY = before
    }
  })

  test.each([
    [
      { ticket: 'EUDPA-1', branch: 'chore/EUDPA-1' },
      'Pass --ticket OR --branch, not both'
    ],
    [{}, 'One of --ticket or --branch is required'],
    [{ ticket: 'ABC-1' }, '--ticket must match EUDPA-NNNN (got: ABC-1)'],
    [{ ticket: 'EUDPA-1x' }, '--ticket must match EUDPA-NNNN (got: EUDPA-1x)']
  ])('Should refuse %o as a usage error', (input, message) => {
    expect(() => runOf({ projectKey: 'EUDPA', ...input })).toThrow(
      expect.objectContaining({ code: 'USAGE', message })
    )
  })
})

describe('#unattendedTicketOf', () => {
  test.each(['EUDPA-802', 'NO_JIRA'])(
    'Should accept the ticket %s',
    (ticket) => {
      expect(unattendedTicketOf({ ticket, projectKey: 'EUDPA' })).toBe(ticket)
    }
  )

  test.each([
    [
      { branch: 'chore/EUDPA-802-x' },
      '--unattended names its own branch: pass --ticket EUDPA-NNNN or --ticket NO_JIRA, not --branch'
    ],
    [
      { ticket: 'EUDPA-802', branch: 'chore/EUDPA-802' },
      '--unattended names its own branch: pass --ticket EUDPA-NNNN or --ticket NO_JIRA, not --branch'
    ],
    [
      {},
      '--unattended names its own branch: pass --ticket EUDPA-NNNN or --ticket NO_JIRA, not --branch'
    ],
    [
      { ticket: 'ABC-1' },
      '--ticket must match EUDPA-NNNN or be NO_JIRA (got: ABC-1)'
    ],
    [
      { ticket: 'NO_JIRA-1' },
      '--ticket must match EUDPA-NNNN or be NO_JIRA (got: NO_JIRA-1)'
    ]
  ])('Should refuse %o as a usage error', (input, message) => {
    expect(() => unattendedTicketOf({ projectKey: 'EUDPA', ...input })).toThrow(
      expect.objectContaining({ code: 'USAGE', message })
    )
  })
})

describe('#unattendedRunOf', () => {
  test('Should name the run after the ticket and target, and the branch after the run', () => {
    expect(unattendedRunOf({ ticket: 'NO_JIRA', target: '6.6.0' })).toEqual({
      runId: 'NO_JIRA-govuk-frontend-6.6.0',
      branch: 'chore/NO_JIRA-govuk-frontend-6.6.0'
    })
  })

  test.each(['latest', '6.6.0-beta.1', 'v6.6.0', '6.6'])(
    'Should refuse the target %s as a usage error',
    (target) => {
      expect(() => unattendedRunOf({ ticket: 'EUDPA-802', target })).toThrow(
        expect.objectContaining({
          code: 'USAGE',
          message: `--target must be X.Y.Z in unattended mode (got: ${target})`
        })
      )
    }
  )
})
