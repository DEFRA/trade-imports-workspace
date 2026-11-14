import { describe, expect, test } from 'vitest'
import { runOf } from './run-id.js'

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
