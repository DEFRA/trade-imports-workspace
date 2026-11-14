import { describe, expect, test } from 'vitest'
import { withStagedRefresh } from '../__fixtures__/review-refresh-runs.js'
import { refreshReviewId, stub } from '../__fixtures__/review-refresh.js'
import { coverageGapsIn, listCoverageGaps } from './gaps.js'

describe('#coverageGapsIn', () => {
  test('Should list a renamed file by its new path only, and pass over files with a review', async () => {
    const gaps = await withStagedRefresh({}, async (staged) =>
      coverageGapsIn({
        reviewFolder: staged.reviewFolderOf(refreshReviewId),
        repo: stub,
        pr: 7
      })
    )

    expect(gaps).toEqual(['src/new.js', 'src/moved.js'])
  })
})

describe('#listCoverageGaps', () => {
  test('Should refuse a run with no pull request', () => {
    expect(() =>
      listCoverageGaps({
        workspaceRoot: '/no/such/workspace',
        reviewId: refreshReviewId,
        repo: stub
      })
    ).toThrow(
      'Usage: tim review refresh gaps <review-id> --repo REPO --pr NUMBER'
    )
  })
})
