import { describe, expect, test } from 'vitest'
import { withStagedRefresh } from '../__fixtures__/review-refresh-runs.js'
import {
  failingPullReviewId,
  schemas,
  stub
} from '../__fixtures__/review-refresh.js'
import {
  anyPullFailed,
  pulledJson,
  pullReviewRepos,
  renderPulledText
} from './pull.js'

describe('#pullReviewRepos', () => {
  test('Should fail a repo with no pull request number and one whose pull request ref is gone', async () => {
    const results = await withStagedRefresh({}, (staged) =>
      pullReviewRepos({
        workspaceRoot: staged.root,
        reviewId: failingPullReviewId
      })
    )

    expect(pulledJson(results)).toEqual([
      { repo: schemas, status: 'failed', message: 'no PR number in meta' },
      {
        repo: stub,
        status: 'failed',
        message: "fatal: couldn't find remote ref refs/pull/11/head"
      }
    ])
    expect(anyPullFailed(results)).toBe(true)
  })
})

describe('#renderPulledText', () => {
  test('Should print a short head for a pulled repo and the path of the meta file for a missing number', () => {
    expect(
      renderPulledText([
        { repo: 'r1', status: 'ok', head: '0123456789abcdef' },
        {
          repo: 'r2',
          status: 'failed',
          message: 'no PR number in meta',
          text: 'no PR number in /m.json'
        }
      ])
    ).toBe('  ✅ r1 — at 0123456\n  ❌ r2 — no PR number in /m.json')
  })
})
