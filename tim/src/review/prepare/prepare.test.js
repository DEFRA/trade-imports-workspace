import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { prepareReview, preparedReviewText, reviewIdOf } from './prepare.js'

const folders = []

afterEach(() => {
  folders.splice(0).forEach((folder) => rmSync(folder, { recursive: true }))
})

describe('#reviewIdOf', () => {
  test.each([
    [{ ticket: 'EUDPA-1' }, 'EUDPA-1'],
    [{ branch: 'feature/tidy/logs' }, 'tidy-logs'],
    [{ branch: 'feat/feature/x' }, 'feat-feature-x'],
    [{ ticket: 'EUDPA-1', branch: 'fix/a' }, 'fix-a']
  ])('Should keep %j under %s', (named, reviewId) => {
    expect(reviewIdOf(named)).toBe(reviewId)
  })
})

describe('#prepareReview', () => {
  test('Should refuse no ticket and no branch before writing anything', async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'tim-review-prepare-'))
    folders.push(workspaceRoot)
    const written = []

    await expect(
      prepareReview({
        workspaceRoot,
        now: '2026-11-14T09:00:00Z',
        write: (text) => written.push(text)
      })
    ).rejects.toMatchObject({ code: 'USAGE' })
    expect(written).toEqual([])
  })
})

describe('#preparedReviewText', () => {
  test('Should name the branch review and each clone', () => {
    const text = preparedReviewText({
      meta: { id: 'tidy-logs' },
      folder: '/w/workareas/reviews/tidy-logs',
      branch: 'feature/tidy/logs',
      type: 'Branch Review',
      summary: 'Tidy the logs',
      cloned: ['trade-imports-stub'],
      createdFiles: 2,
      stubRepos: 1
    })

    expect(text.split('\n').slice(0, 6)).toEqual([
      '',
      '=== Review Workspace Ready ===',
      'Review: tidy-logs',
      'Branch: feature/tidy/logs',
      'Summary: Tidy the logs',
      'Directory: /w/workareas/reviews/tidy-logs'
    ])
    expect(text).toContain(
      '  ✓ repos/trade-imports-stub/\n  ✓ file-reviews/ (2 files)\n'
    )
  })
})
