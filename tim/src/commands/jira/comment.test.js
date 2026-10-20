import { describe, test, expect } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execa } from 'execa'
import { mockJiraForEachTest } from '../../test-support/jira-mock.js'
import { TIM_CLI_PATH } from '../../test-support/tim-cli.js'
import {
  parseCommentOptions,
  runComment,
  renderCommentResult
} from './comment.js'

const COMMENTS_PATH = '/rest/api/2/issue/EUDPA-200/comment'
const TEXT = 'Closing: no longer reproduces on main.'
const POSTED = {
  id: '10500',
  author: { displayName: 'Sam Example' },
  created: '2026-10-20T10:00:00.000+0100',
  body: TEXT
}
const EARLIER = {
  id: '10400',
  author: { displayName: 'Pat Example' },
  created: '2026-10-01T09:00:00.000+0100',
  body: 'Seen again on the dev stack.'
}

const jira = mockJiraForEachTest()

const commentReads = (...lists) =>
  lists.forEach((comments) =>
    jira().get(COMMENTS_PATH).reply(200, { comments })
  )

const acceptsComment = () => {
  const sent = { body: null }
  jira()
    .post(COMMENTS_PATH, (body) => {
      sent.body = body
      return true
    })
    .reply(201, POSTED)
  return sent
}

const commentFile = (text) => {
  const path = join(mkdtempSync(join(tmpdir(), 'tim-comment-')), 'c.txt')
  writeFileSync(path, text)
  return path
}

describe('parseCommentOptions', () => {
  test('refuses both --body and --file', () => {
    expect(() =>
      parseCommentOptions({ body: 'x', file: 'c.txt' })
    ).toThrowError('Give the comment with --body or --file, not both.')
  })

  test('refuses neither --body nor --file', () => {
    expect(() => parseCommentOptions({})).toThrowError(
      'Give the comment with --body or --file, not both.'
    )
  })
})

describe('runComment', () => {
  test('a dry run reads the comments and sends no write', async () => {
    commentReads([EARLIER])

    const result = await runComment({
      key: 'EUDPA-200',
      body: `  ${TEXT}\n`,
      confirm: false
    })

    expect(result).toEqual({ mode: 'dry-run', key: 'EUDPA-200', body: TEXT })
  })

  test('--confirm posts the comment and reads it back', async () => {
    commentReads([EARLIER], [EARLIER, POSTED])
    const sent = acceptsComment()

    const result = await runComment({
      key: 'EUDPA-200',
      body: TEXT,
      confirm: true
    })

    expect({ result, sent: sent.body }).toEqual({
      result: {
        mode: 'commented',
        key: 'EUDPA-200',
        body: TEXT,
        comment: {
          id: '10500',
          author: 'Sam Example',
          createdAt: '2026-10-20T10:00:00.000+0100',
          body: TEXT
        }
      },
      sent: { body: TEXT }
    })
  })

  test('reads the comment text from --file', async () => {
    commentReads([])

    const result = await runComment({
      key: 'EUDPA-200',
      file: commentFile(`${TEXT}\n`),
      confirm: false
    })

    expect(result.body).toBe(TEXT)
  })

  test('leaves a ticket that already has the same comment alone, even with --confirm', async () => {
    commentReads([EARLIER, POSTED])

    const result = await runComment({
      key: 'EUDPA-200',
      body: TEXT,
      confirm: true
    })

    expect(result).toEqual({
      mode: 'unchanged',
      key: 'EUDPA-200',
      body: TEXT,
      comment: {
        id: '10500',
        author: 'Sam Example',
        createdAt: '2026-10-20T10:00:00.000+0100',
        body: TEXT
      }
    })
  })

  test('fails when Jira accepts the comment but the read-back does not show it', async () => {
    commentReads([], [])
    acceptsComment()

    await expect(
      runComment({ key: 'EUDPA-200', body: TEXT, confirm: true })
    ).rejects.toMatchObject({
      code: 'UNKNOWN',
      message:
        'Jira accepted the comment, but EUDPA-200 does not show comment 10500. Check the ticket in Jira.'
    })
  })

  test('refuses an empty comment', async () => {
    await expect(
      runComment({ key: 'EUDPA-200', body: '  \n', confirm: false })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: 'The comment is empty. Give some text.'
    })
  })

  test('refuses a --file it cannot read', async () => {
    await expect(
      runComment({
        key: 'EUDPA-200',
        file: '/no/such/comment.txt',
        confirm: false
      })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: expect.stringMatching(/^Can't read \/no\/such\/comment\.txt: /)
    })
  })

  test('refuses a key that is not a Jira key', async () => {
    await expect(
      runComment({ key: 'eudpa 200', body: TEXT, confirm: false })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: 'Give a Jira ticket key, for example EUDPA-200.'
    })
  })
})

describe('renderCommentResult', () => {
  test('renders a dry run with the comment text', () => {
    expect(
      renderCommentResult({ mode: 'dry-run', key: 'EUDPA-200', body: TEXT })
    ).toBe(
      [
        'Would add this comment to EUDPA-200:',
        '',
        TEXT,
        '',
        'This is a dry run. No request has been sent. Add --confirm to post it for real.'
      ].join('\n')
    )
  })

  test('renders a posted comment with its id', () => {
    expect(
      renderCommentResult({
        mode: 'commented',
        key: 'EUDPA-200',
        body: TEXT,
        comment: { id: '10500' }
      })
    ).toBe('Added comment 10500 to EUDPA-200. Checked on Jira.')
  })

  test('says nothing changed for a comment the ticket already has', () => {
    expect(
      renderCommentResult({
        mode: 'unchanged',
        key: 'EUDPA-200',
        body: TEXT,
        comment: { id: '10500' }
      })
    ).toBe('EUDPA-200 already has this comment (10500). Nothing changed.')
  })
})

describe('tim jira comment (spawn)', () => {
  test('emits an AUTH envelope when no Jira credentials are set', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      [TIM_CLI_PATH, 'jira', 'comment', 'EUDPA-200', '--body', TEXT, '--json'],
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

  test('exits 2 with a USAGE envelope when both --body and --file are given', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      [
        TIM_CLI_PATH,
        'jira',
        'comment',
        'EUDPA-200',
        '--body',
        TEXT,
        '--file',
        'c.txt',
        '--json'
      ],
      { reject: false }
    )

    expect({ exitCode, payload: JSON.parse(stdout.trim()) }).toMatchObject({
      exitCode: 2,
      payload: {
        ok: false,
        errors: [
          {
            code: 'USAGE',
            message: 'Give the comment with --body or --file, not both.'
          }
        ]
      }
    })
  })

  test('shows the dry-run and --confirm forms in --help', async () => {
    const { stdout } = await execa('node', [
      TIM_CLI_PATH,
      'jira',
      'comment',
      '--help'
    ])

    expect(stdout).toContain(
      [
        'Examples:',
        '  tim jira comment EUDPA-200 --body "Fixed on main." --json',
        '  tim jira comment EUDPA-200 --file comment.txt --confirm --json'
      ].join('\n')
    )
  })
})
