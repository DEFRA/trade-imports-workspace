import { describe, test, expect } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  acceptsComment,
  acceptsCommentEdit,
  commentReads,
  mockJiraForEachTest
} from '../../test-support/jira-mock.js'
import { runTim } from '../../test-support/tim-cli.js'
import {
  parseCommentOptions,
  runComment,
  renderCommentResult
} from './comment.js'

const KEY = 'EUDPA-200'
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
    commentReads(jira, KEY, { before: [EARLIER] })

    const result = await runComment({
      key: 'EUDPA-200',
      body: `  ${TEXT}\n`,
      confirm: false
    })

    expect(result).toEqual({ mode: 'dry-run', key: 'EUDPA-200', body: TEXT })
  })

  test('--confirm posts the comment and reads it back', async () => {
    commentReads(jira, KEY, { before: [EARLIER], after: [EARLIER, POSTED] })
    const sent = acceptsComment(jira, KEY, POSTED)

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
    commentReads(jira, KEY, { before: [] })

    const result = await runComment({
      key: 'EUDPA-200',
      file: commentFile(`${TEXT}\n`),
      confirm: false
    })

    expect(result.body).toBe(TEXT)
  })

  test('leaves a ticket that already has the same comment alone, even with --confirm', async () => {
    commentReads(jira, KEY, { before: [EARLIER, POSTED] })

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
    commentReads(jira, KEY, { before: [], after: [] })
    acceptsComment(jira, KEY, POSTED)

    await expect(
      runComment({ key: 'EUDPA-200', body: TEXT, confirm: true })
    ).rejects.toMatchObject({
      code: 'UNKNOWN',
      message:
        'Jira accepted the comment, but EUDPA-200 does not show comment 10500. Check the ticket in Jira.'
    })
  })

  test('with a comment to replace, --confirm edits that comment, reads it back and posts nothing new', async () => {
    const edited = { ...EARLIER, body: TEXT }
    commentReads(jira, KEY, { before: [EARLIER], after: [edited] })
    const sent = acceptsCommentEdit(jira, KEY, EARLIER.id, edited)

    const result = await runComment({
      key: KEY,
      body: TEXT,
      confirm: true,
      replaceCommentId: EARLIER.id
    })

    expect({ result, sent: sent.body }).toEqual({
      result: {
        mode: 'edited',
        key: KEY,
        body: TEXT,
        replaceCommentId: EARLIER.id,
        comment: {
          id: EARLIER.id,
          author: 'Pat Example',
          createdAt: EARLIER.created,
          body: TEXT
        }
      },
      sent: { body: TEXT }
    })
  })

  test('with a comment to replace, a dry run names the comment and sends no write', async () => {
    commentReads(jira, KEY, { before: [EARLIER] })

    const result = await runComment({
      key: KEY,
      body: TEXT,
      confirm: false,
      replaceCommentId: EARLIER.id
    })

    expect(result).toEqual({
      mode: 'dry-run',
      key: KEY,
      body: TEXT,
      replaceCommentId: EARLIER.id
    })
  })

  test('with a comment to replace, leaves a ticket that already has the same text alone, even with --confirm', async () => {
    commentReads(jira, KEY, { before: [{ ...EARLIER, body: TEXT }] })

    const result = await runComment({
      key: KEY,
      body: TEXT,
      confirm: true,
      replaceCommentId: EARLIER.id
    })

    expect(result.mode).toBe('unchanged')
  })

  test('with a comment to replace, fails when the read-back still shows the old text', async () => {
    commentReads(jira, KEY, { before: [EARLIER], after: [EARLIER] })
    acceptsCommentEdit(jira, KEY, EARLIER.id, { ...EARLIER, body: TEXT })

    await expect(
      runComment({
        key: KEY,
        body: TEXT,
        confirm: true,
        replaceCommentId: EARLIER.id
      })
    ).rejects.toMatchObject({
      code: 'UNKNOWN',
      message:
        'Jira accepted the edit, but comment 10400 on EUDPA-200 does not hold the new text. Check the ticket in Jira.'
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

  test('renders a replacing dry run with the comment id', () => {
    expect(
      renderCommentResult({
        mode: 'dry-run',
        key: 'EUDPA-200',
        body: TEXT,
        replaceCommentId: '10400'
      })
    ).toBe(
      [
        'Would replace comment 10400 on EUDPA-200 with this text:',
        '',
        TEXT,
        '',
        'This is a dry run. No request has been sent. Add --confirm to post it for real.'
      ].join('\n')
    )
  })

  test('renders an edited comment with its id and key', () => {
    expect(
      renderCommentResult({
        mode: 'edited',
        key: 'EUDPA-200',
        body: TEXT,
        comment: { id: '10400' }
      })
    ).toBe('Edited comment 10400 on EUDPA-200. Checked on Jira.')
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
    const { stdout, exitCode } = await runTim(
      ['jira', 'comment', 'EUDPA-200', '--body', TEXT, '--json'],
      { env: { JIRA_USER: '', JIRA_TOKEN: '', JIRA_BASE_URL: '' } }
    )

    expect({ exitCode, payload: JSON.parse(stdout.trim()) }).toMatchObject({
      exitCode: 1,
      payload: { ok: false, errors: [{ code: 'AUTH' }] }
    })
  })

  test('exits 2 with a USAGE envelope when both --body and --file are given', async () => {
    const { stdout, exitCode } = await runTim([
      'jira',
      'comment',
      'EUDPA-200',
      '--body',
      TEXT,
      '--file',
      'c.txt',
      '--json'
    ])

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
    const { stdout } = await runTim(['jira', 'comment', '--help'])

    expect(stdout).toContain(
      [
        'Examples:',
        '  tim jira comment EUDPA-200 --body "Fixed on main." --json',
        '  tim jira comment EUDPA-200 --file comment.txt --confirm --json'
      ].join('\n')
    )
  })
})
