import { describe, test, expect } from 'vitest'
import { parseIssueKey } from './shared.js'

describe('parseIssueKey', () => {
  test('returns the key without surrounding spaces', () => {
    expect(parseIssueKey(' EUDPA-200 ')).toBe('EUDPA-200')
  })

  test('refuses a value that is not a ticket key with a USAGE error', () => {
    expect(() => parseIssueKey('eudpa200')).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message: 'Give a Jira ticket key, for example EUDPA-200.'
      })
    )
  })
})
