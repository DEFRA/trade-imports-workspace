import { describe, test, expect } from 'vitest'
import { probeAll } from './auth.js'
import { TimError } from '../errors.js'

const fakeClient = (whoami) => () => ({ whoami: async () => whoami })
const failingClient = (error) => () => ({
  whoami: async () => {
    throw error
  }
})

describe('probeAll', () => {
  test('returns an ok result with the user for Jira and Confluence only', async () => {
    const results = await probeAll({
      jiraFactory: fakeClient({ user: 'sam', displayName: 'Sam' }),
      confluenceFactory: fakeClient({ user: 'sam', displayName: 'Sam' })
    })

    expect(results).toEqual([
      { service: 'jira', ok: true, user: { user: 'sam', displayName: 'Sam' } },
      {
        service: 'confluence',
        ok: true,
        user: { user: 'sam', displayName: 'Sam' }
      }
    ])
  })

  test('captures per-service failures as ok=false with error.code', async () => {
    const results = await probeAll({
      jiraFactory: failingClient(new TimError('AUTH', 'bad token')),
      confluenceFactory: fakeClient({ user: 'sam' })
    })

    const byService = Object.fromEntries(results.map((r) => [r.service, r]))
    expect(byService.jira).toMatchObject({
      ok: false,
      error: { code: 'AUTH', message: 'bad token' }
    })
    expect(byService.confluence.ok).toBe(true)
  })

  test('preserves non-TimError error info under code: UNKNOWN', async () => {
    const results = await probeAll({
      jiraFactory: fakeClient({ user: 'sam' }),
      confluenceFactory: failingClient(new Error('boom'))
    })

    const confluence = results.find((r) => r.service === 'confluence')
    expect(confluence).toMatchObject({
      ok: false,
      error: { code: 'UNKNOWN', message: 'boom' }
    })
  })
})
