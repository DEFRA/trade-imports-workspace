import { describe, expect, test } from 'vitest'
import { withStagedRefresh } from '../__fixtures__/review-refresh-runs.js'
import { refreshReviewId, stub } from '../__fixtures__/review-refresh.js'
import { buildRefreshScope, renderScopeText } from './scope.js'

describe('#buildRefreshScope', () => {
  test('Should find no changes on a second run after it wrote a snapshot', async () => {
    const second = await withStagedRefresh({}, async (staged) => {
      const options = {
        workspaceRoot: staged.root,
        reviewId: refreshReviewId,
        repo: stub,
        pull: false,
        log: () => {}
      }
      await buildRefreshScope({ ...options, writeSnapshot: true })
      return buildRefreshScope(options)
    })

    expect(second.repos[0]).toMatchObject({
      no_changes: true,
      lists: { A: [], C: [] }
    })
  })

  test('Should refuse a run with no review id', async () => {
    await expect(
      buildRefreshScope({ workspaceRoot: '/no/such', log: () => {} })
    ).rejects.toMatchObject({ code: 'USAGE' })
  })
})

describe('#renderScopeText', () => {
  test('Should end with a blank line when no repo is cloned', () => {
    expect(
      renderScopeText({
        ticket: 'T-1',
        generated: '2026-11-14T00:00:00Z',
        totals: { list_a: 0, list_b: 0, list_c: 0, list_d: 0 },
        repos: []
      })
    ).toBe(
      'Refresh scope for T-1 (generated 2026-11-14T00:00:00Z)\n  Totals:  A=0 (changed)  B=0 (open inline)  C=0 (merge)  D=0 (gaps)\n'
    )
  })
})
