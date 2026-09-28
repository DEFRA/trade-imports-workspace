import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  installHttpMocks,
  closeHttpMocks
} from '../../test-support/http-mock.js'
import { runLink, renderLinkResult, parseLinkOptions } from './link.js'

const BASE = 'https://example.atlassian.net'
let mockPool
let originalEnv

beforeEach(() => {
  originalEnv = { ...process.env }
  process.env.JIRA_USER = 'sam'
  process.env.JIRA_TOKEN = 'token'
  process.env.JIRA_BASE_URL = BASE
  ;({ mockPool } = installHttpMocks())
})

afterEach(() => {
  process.env = originalEnv
  closeHttpMocks()
})

describe('parseLinkOptions', () => {
  test('defaults confirm to false', () => {
    expect(parseLinkOptions({})).toEqual({ confirm: false })
  })
})

describe('runLink', () => {
  test('throws USAGE for a relationship other than "relates"', async () => {
    await expect(
      runLink({
        key: 'EUDPA-200',
        relationship: 'blocks',
        target: 'EUDPA-100',
        confirm: false
      })
    ).rejects.toMatchObject({ code: 'USAGE' })
  })

  test('a dry run makes no request', async () => {
    const result = await runLink({
      key: 'EUDPA-200',
      relationship: 'relates',
      target: 'EUDPA-100',
      confirm: false
    })
    expect(result).toEqual({
      mode: 'dry-run',
      key: 'EUDPA-200',
      target: 'EUDPA-100',
      type: 'Relates'
    })
  })

  test('--confirm creates the link then GET-verifies it landed', async () => {
    mockPool(BASE).post('/rest/api/2/issueLink').reply(201, {})
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-200?fields=issuelinks')
      .reply(200, {
        fields: {
          issuelinks: [
            { type: { name: 'Relates' }, outwardIssue: { key: 'EUDPA-100' } }
          ]
        }
      })

    const result = await runLink({
      key: 'EUDPA-200',
      relationship: 'relates',
      target: 'EUDPA-100',
      confirm: true
    })

    expect(result).toEqual({
      mode: 'linked',
      key: 'EUDPA-200',
      target: 'EUDPA-100',
      type: 'Relates',
      verified: true
    })
  })

  test('throws NETWORK when the link does not show up on the follow-up GET', async () => {
    mockPool(BASE).post('/rest/api/2/issueLink').reply(201, {})
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-200?fields=issuelinks')
      .reply(200, { fields: { issuelinks: [] } })

    await expect(
      runLink({
        key: 'EUDPA-200',
        relationship: 'relates',
        target: 'EUDPA-100',
        confirm: true
      })
    ).rejects.toMatchObject({ code: 'NETWORK' })
  })
})

describe('renderLinkResult', () => {
  test('renders a dry-run message', () => {
    const text = renderLinkResult({
      mode: 'dry-run',
      key: 'EUDPA-200',
      target: 'EUDPA-100'
    })
    expect(text).toContain('Would link EUDPA-200 to EUDPA-100')
    expect(text).toContain('dry run')
  })

  test('renders a verified link message', () => {
    const text = renderLinkResult({
      mode: 'linked',
      key: 'EUDPA-200',
      target: 'EUDPA-100',
      verified: true
    })
    expect(text).toContain('Linked EUDPA-200 to EUDPA-100')
    expect(text).toContain('Verified')
  })
})
