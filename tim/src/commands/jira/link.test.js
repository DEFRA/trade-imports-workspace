import { describe, test, expect } from 'vitest'
import { execa } from 'execa'
import {
  loadJiraFixture,
  mockJiraForEachTest
} from '../../test-support/jira-mock.js'
import { TIM_CLI_PATH } from '../../test-support/tim-cli.js'
import { runLink, renderLinkResult, parseLinkOptions } from './link.js'

const jira = mockJiraForEachTest()

const acceptsIssueLink = () => {
  const posted = { body: null }
  jira()
    .post('/rest/api/2/issueLink', (body) => {
      posted.body = body
      return true
    })
    .reply(201, {})
  return posted
}

const linksRead = (key, issuelinks) =>
  jira()
    .get(`/rest/api/2/issue/${key}?fields=issuelinks`)
    .reply(200, { key, fields: { issuelinks } })

const blocksLink = (side, otherKey) => ({
  id: '30001',
  type: {
    name: 'Blocks',
    inward: 'is blocked by',
    outward: 'blocks'
  },
  [side]: { key: otherKey }
})

describe('parseLinkOptions', () => {
  test('defaults confirm to false', () => {
    expect(parseLinkOptions({})).toEqual({ confirm: false })
  })

  test('refuses a --blocks value that is not a Jira key', () => {
    expect(() => parseLinkOptions({ blocks: 'later' })).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: 'Give a Jira ticket key, for example EUDPA-200.'
      })
    )
  })
})

describe('runLink', () => {
  test('refuses a positional "blocks", which has no explicit direction', async () => {
    await expect(
      runLink({
        key: 'EUDPA-200',
        relationship: 'blocks',
        target: 'EUDPA-100',
        confirm: false
      })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        'tim cannot link "blocks" this way. Give one link: "relates <key>", --blocks <key> or --blocked-by <key>.'
    })
  })

  test('refuses two links at once', async () => {
    await expect(
      runLink({
        key: 'EUDPA-200',
        blocks: 'EUDPA-300',
        blockedBy: 'EUDPA-100',
        confirm: false
      })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        'Give one link: "relates <key>", --blocks <key> or --blocked-by <key>.'
    })
  })

  test('a dry run of --blocks makes no request and states the direction', async () => {
    const result = await runLink({
      key: 'EUDPA-200',
      blocks: 'EUDPA-300',
      confirm: false
    })

    expect(result).toEqual({
      mode: 'dry-run',
      key: 'EUDPA-200',
      target: 'EUDPA-300',
      type: 'Blocks',
      requested: 'EUDPA-200 blocks EUDPA-300'
    })
  })

  test('--confirm relates creates the link then reads it back', async () => {
    const posted = acceptsIssueLink()
    linksRead('EUDPA-200', [
      {
        id: '20001',
        type: { name: 'Relates', inward: 'relates to', outward: 'relates to' },
        outwardIssue: { key: 'EUDPA-100' }
      }
    ])

    const result = await runLink({
      key: 'EUDPA-200',
      relationship: 'relates',
      target: 'EUDPA-100',
      confirm: true
    })

    expect({ result, posted: posted.body }).toEqual({
      result: {
        mode: 'linked',
        key: 'EUDPA-200',
        target: 'EUDPA-100',
        type: 'Relates',
        requested: 'EUDPA-200 relates to EUDPA-100',
        stored: 'EUDPA-200 relates to EUDPA-100',
        verified: true
      },
      posted: {
        type: { name: 'Relates' },
        inwardIssue: { key: 'EUDPA-200' },
        outwardIssue: { key: 'EUDPA-100' }
      }
    })
  })

  test('--confirm --blocks sends this ticket as the blocker and reports the stored direction', async () => {
    const posted = acceptsIssueLink()
    linksRead('EUDPA-200', [blocksLink('outwardIssue', 'EUDPA-300')])

    const result = await runLink({
      key: 'EUDPA-200',
      blocks: 'EUDPA-300',
      confirm: true
    })

    expect({ stored: result.stored, posted: posted.body }).toEqual({
      stored: 'EUDPA-200 blocks EUDPA-300',
      posted: {
        type: { name: 'Blocks' },
        inwardIssue: { key: 'EUDPA-200' },
        outwardIssue: { key: 'EUDPA-300' }
      }
    })
  })

  test('--confirm --blocked-by sends the other ticket as the blocker and reports the stored direction', async () => {
    const posted = acceptsIssueLink()
    linksRead('EUDPA-183', [blocksLink('inwardIssue', 'EUDPA-181')])

    const result = await runLink({
      key: 'EUDPA-183',
      blockedBy: 'EUDPA-181',
      confirm: true
    })

    expect({ stored: result.stored, posted: posted.body }).toEqual({
      stored: 'EUDPA-183 is blocked by EUDPA-181',
      posted: {
        type: { name: 'Blocks' },
        inwardIssue: { key: 'EUDPA-181' },
        outwardIssue: { key: 'EUDPA-183' }
      }
    })
  })

  test('fails naming the stored direction when Jira holds the link the other way round', async () => {
    acceptsIssueLink()
    linksRead('EUDPA-200', [blocksLink('inwardIssue', 'EUDPA-300')])

    await expect(
      runLink({ key: 'EUDPA-200', blocks: 'EUDPA-300', confirm: true })
    ).rejects.toMatchObject({
      code: 'UNKNOWN',
      message:
        'Asked for "EUDPA-200 blocks EUDPA-300", but Jira stored "EUDPA-200 is blocked by EUDPA-300". Remove that link in Jira and run `tim jira link` again.'
    })
  })

  test('throws NETWORK when the link does not show up on the read-back', async () => {
    acceptsIssueLink()
    linksRead('EUDPA-200', [])

    await expect(
      runLink({
        key: 'EUDPA-200',
        relationship: 'relates',
        target: 'EUDPA-100',
        confirm: true
      })
    ).rejects.toMatchObject({ code: 'NETWORK' })
  })

  test('ignores a link to another ticket when reading back', async () => {
    acceptsIssueLink()
    linksRead('EUDPA-200', [
      loadJiraFixture('issue-links-blocks.json').fields.issuelinks[1]
    ])

    await expect(
      runLink({ key: 'EUDPA-200', blocks: 'EUDPA-300', confirm: true })
    ).rejects.toMatchObject({ code: 'NETWORK' })
  })
})

describe('renderLinkResult', () => {
  test('renders the dry run with the direction asked for', () => {
    expect(
      renderLinkResult({
        mode: 'dry-run',
        key: 'EUDPA-200',
        target: 'EUDPA-300',
        type: 'Blocks',
        requested: 'EUDPA-200 blocks EUDPA-300'
      })
    ).toBe(
      [
        'Would link: EUDPA-200 blocks EUDPA-300 (Blocks).',
        'This is a dry run. No request has been sent. Add --confirm to link for real.'
      ].join('\n')
    )
  })

  test('renders the direction Jira stored', () => {
    expect(
      renderLinkResult({
        mode: 'linked',
        key: 'EUDPA-183',
        target: 'EUDPA-181',
        type: 'Blocks',
        requested: 'EUDPA-183 is blocked by EUDPA-181',
        stored: 'EUDPA-183 is blocked by EUDPA-181',
        verified: true
      })
    ).toBe(
      'Linked: EUDPA-183 is blocked by EUDPA-181 (Blocks). Jira stores it this way round.'
    )
  })
})

describe('tim jira link (spawn)', () => {
  test('prints a --blocked-by dry run as JSON', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      [
        TIM_CLI_PATH,
        'jira',
        'link',
        'EUDPA-183',
        '--blocked-by',
        'EUDPA-181',
        '--json'
      ],
      { reject: false, env: { ...process.env, JIRA_USER: '', JIRA_TOKEN: '' } }
    )

    expect({ exitCode, payload: JSON.parse(stdout.trim()) }).toMatchObject({
      exitCode: 0,
      payload: {
        ok: true,
        result: {
          mode: 'dry-run',
          type: 'Blocks',
          requested: 'EUDPA-183 is blocked by EUDPA-181'
        }
      }
    })
  })
})
