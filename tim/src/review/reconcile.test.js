import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { reconcileFileReviews, renderReconciledText } from './reconcile.js'
import { fullReviewId } from './__fixtures__/review-tools.js'
import { withStagedTools } from './__fixtures__/review-tools-runs.js'

const backend = 'trade-imports-animals-backend'
const fixedNow = () => new Date('2026-11-14T08:09:10.123Z')

const fileReviewPath = (root, name) =>
  join(
    root,
    'workareas',
    'reviews',
    fullReviewId,
    'file-reviews',
    backend,
    `${name}.review.json`
  )

describe('#reconcileFileReviews', () => {
  test('Should stamp each refreshed file with the time it ran', async () => {
    const review = await withStagedTools(({ root }) => {
      reconcileFileReviews({
        workspaceRoot: root,
        reviewId: fullReviewId,
        repo: backend,
        now: fixedNow
      })
      return JSON.parse(
        readFileSync(fileReviewPath(root, 'src_main_java_b.java'), 'utf8')
      )
    })

    expect(review.reconciled_at).toBe('2026-11-14T08:09:10Z')
  })

  test('Should store a finding with no line as the text null', async () => {
    const added = await withStagedTools(({ root }) => {
      const path = fileReviewPath(root, 'src_main_java_c.java')
      const review = JSON.parse(readFileSync(path, 'utf8'))
      writeFileSync(
        path,
        JSON.stringify({
          ...review,
          todos: [
            {
              id: 1,
              line: null,
              severity: 'Minor',
              category: 'naming',
              issue: 'Odd\n',
              fix: 'Rename'
            }
          ]
        })
      )
      return reconcileFileReviews({
        workspaceRoot: root,
        reviewId: fullReviewId,
        repo: backend
      })
    })

    expect(added.added.at(-1)).toBe('src/main/java/c.java:null [Minor] Odd')
  })
})

describe('#renderReconciledText', () => {
  test('Should say a dry run changes nothing and list each finding it would add', () => {
    const text = renderReconciledText({
      reviewId: 'EUDPA-1',
      repo: 'r',
      dryRun: true,
      refreshed: 1,
      added_count: 1,
      added: ['a.js:1 [Minor] x'],
      added_ids: ['(dry-run)'],
      skipped_already_reconciled: 0,
      skipped_unreviewed: 0,
      spot_check: []
    })

    expect(text.split('\n').slice(6)).toEqual([
      '  (dry-run — no mutations)',
      '',
      'Added:',
      '  #(dry-run) — a.js:1 [Minor] x',
      ''
    ])
  })
})
