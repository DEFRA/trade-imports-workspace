import { describe, expect, test } from 'vitest'
import {
  prepareLocalStyleReview,
  prepareStyleReview,
  preparedStyleText
} from './prepare.js'

const ignore = () => {}

describe('#prepareStyleReview', () => {
  test('Should refuse with a usage line when no review id is given', () => {
    expect(() =>
      prepareStyleReview({ workspaceRoot: '/ws', now: 'now', log: ignore })
    ).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message: 'Usage: tim style prepare <review-id> [--json]'
      })
    )
  })

  test('Should name the review workspace to prepare first when it is missing', () => {
    expect(() =>
      prepareStyleReview({
        workspaceRoot: '/ws-none',
        reviewId: 'EUDPA-1',
        now: 'now',
        log: ignore
      })
    ).toThrow(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message:
          "Review workspace missing: /ws-none/workareas/reviews/EUDPA-1/.review-meta.json\nPrepare it first with the review skill's Step 1: save the pull requests with gh, then run tim review prepare EUDPA-1"
      })
    )
  })
})

describe('#prepareLocalStyleReview', () => {
  test('Should refuse with a usage line when no branch is given', async () => {
    await expect(
      prepareLocalStyleReview({
        workspaceRoot: '/ws',
        repo: 'trade-imports-stub',
        now: 'now',
        log: ignore,
        reviewLog: ignore
      })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        'Usage: tim style prepare --local <repo> <branch> [--files F1,F2,...] [--json]'
    })
  })
})

describe('#preparedStyleText', () => {
  test('Should name the bundles and the next step for a ticket with source files', () => {
    const text = preparedStyleText({
      meta: { id: 'EUDPA-1', source_files: [{ repo: 'r', path: 'a.js' }] },
      folder: '/ws/s',
      createdFiles: 1,
      bundles: ['style-rules.r.node.md']
    })

    expect(text).toBe(
      '\n=== Code-Style Workspace Ready ===\nTicket: EUDPA-1\nDirectory: /ws/s\n\nCreated:\n  ✓ .style-meta.json\n  ✓ file-reviews/ (1 placeholders)\n  ✓ style-rules.r.node.md\n\nNext: spawn STYLE_FILE_REVIEWER subagents (FRESH Step 4).'
    )
  })

  test('Should say a branch with no source files needs no style review', () => {
    const text = preparedStyleText({
      meta: { local: true, repo: 'r', branch: 'main', source_files: [] },
      folder: '/ws/s',
      createdFiles: 0,
      bundles: []
    })

    expect(text.split('\n').at(-1)).toBe(
      'Note: no reviewable source files on this branch — no code-style review needed.'
    )
  })
})
