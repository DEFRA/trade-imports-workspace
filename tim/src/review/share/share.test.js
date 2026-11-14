import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { stageShareWorkspace } from '../__fixtures__/review-share.js'
import { shareReview, sharedReviewText } from './share.js'

const withStaged = async (use) => {
  const staged = stageShareWorkspace()
  try {
    return await use(staged)
  } finally {
    staged.remove()
  }
}

const leftBodyPath = (message) =>
  message.match(/^Rendered body left at: (\S+)$/m)[1]

describe('#shareReview', () => {
  test('Should refuse an id that is not a ticket with the usage line', async () => {
    await withStaged(async (staged) => {
      const sharing = shareReview({
        workspaceRoot: staged.root,
        ticket: 'local/trade-imports-stub/feat/x'
      })

      await expect(sharing).rejects.toMatchObject({
        code: 'USAGE',
        message: expect.stringMatching(/^Usage: tim review share EUDPA-XXXXX/)
      })
    })
  })

  test('Should refuse a PR number that is not a number', async () => {
    await withStaged(async (staged) => {
      const sharing = shareReview({
        workspaceRoot: staged.root,
        ticket: 'EUDPA-201',
        pr: 'twelve',
        commentOnly: true,
        dryRun: true
      })

      await expect(sharing).rejects.toMatchObject({
        code: 'USAGE',
        message: '--pr must be a number. Got "twelve".'
      })
    })
  })

  test('Should say a summary over the limit is already summarised, and leave its body', async () => {
    await withStaged(async (staged) => {
      const index = join(
        staged.root,
        'workareas/reviews/EUDPA-203/review-index.md'
      )
      writeFileSync(index, `**Verdict:** ${'long '.repeat(14000)}\n`)

      const error = await shareReview({
        workspaceRoot: staged.root,
        ticket: 'EUDPA-203',
        commentOnly: true,
        summary: true,
        dryRun: true
      }).catch((caught) => caught)

      const bodyPath = leftBodyPath(error.message)
      expect(error.message.split('\n').slice(0, 2)).toEqual([
        `Comment body for trade-imports-animals-frontend#1 is ${Buffer.byteLength(readFileSync(bodyPath, 'utf8'))} characters; GitHub accepts 65536.`,
        'Already summarising. Shorten the verdict in review-index.md, or post the detail as an attachment on the ticket.'
      ])
      rmSync(bodyPath)
    })
  })
})

describe('#sharedReviewText', () => {
  test('Should list a gh pr comment command for each body of a comment-only share', () => {
    const text = sharedReviewText({
      dry_run: false,
      ticket: 'EUDPA-1',
      mode: 'comment-only',
      branch: null,
      reviewer: 'someone',
      body_files: [{ repo: 'trade-imports-stub', pr: 7, file: '/tmp/body.md' }],
      prs: [{ repo: 'trade-imports-stub', pr: 7 }]
    })

    expect(text).toBe(
      [
        'Review ready to post for EUDPA-1.',
        '',
        'Reviewer:      someone',
        'Post each comment with gh:',
        '  gh pr comment 7 --repo DEFRA/trade-imports-stub --body-file /tmp/body.md',
        '',
        'Bodies archived at:',
        '  - trade-imports-stub#7 → /tmp/body.md'
      ].join('\n')
    )
  })
})
