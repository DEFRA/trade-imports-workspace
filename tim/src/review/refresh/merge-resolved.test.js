import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { withStagedRefresh } from '../__fixtures__/review-refresh-runs.js'
import { refreshReviewId, stub } from '../__fixtures__/review-refresh.js'
import { listMergeResolved, renderMergeResolvedTsv } from './merge-resolved.js'

describe('#listMergeResolved', () => {
  test('Should list a conflicted file the window changed and leave out one it did not', async () => {
    const { resolved, merge } = await withStagedRefresh({}, async (staged) => ({
      resolved: await listMergeResolved({
        repoDir: join(staged.reviewFolderOf(refreshReviewId), 'repos', stub),
        prior: staged.shas.stub.base,
        head: staged.shas.stub.head
      }),
      merge: staged.shas.stub.merge
    }))

    expect(resolved).toEqual([{ merge, file: 'src/a.js' }])
  })

  test('Should refuse a folder that is not a git repo', async () => {
    await expect(
      listMergeResolved({ repoDir: '/no/such/repo', prior: 'a', head: 'b' })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: 'Not a git repo: /no/such/repo'
    })
  })
})

describe('#renderMergeResolvedTsv', () => {
  test('Should print one tab-separated line per file', () => {
    expect(
      renderMergeResolvedTsv([
        { merge: 'm1', file: 'a.js' },
        { merge: 'm2', file: 'b.js' }
      ])
    ).toBe('m1\ta.js\nm2\tb.js')
  })
})
