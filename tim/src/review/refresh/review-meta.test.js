import { describe, expect, test } from 'vitest'
import { pullRequestsOf, reposOf, snapshotChangesOf } from './review-meta.js'

const meta = {
  prs: [
    { repo: 'b-repo', pr: 2 },
    { repo: 'a-repo', pr: 1 },
    { repo: 'b-repo', pr: 3 }
  ],
  re_reviews: [
    { changes: [{ repo: 'a-repo', current_commit: 'one' }] },
    { changes: null },
    { changes: [{ repo: 'a-repo', current_commit: 'two' }, { repo: 'b-repo' }] }
  ]
}

describe('#reposOf', () => {
  test('Should list each repo once, in code-point order', () => {
    expect(reposOf(meta)).toEqual(['a-repo', 'b-repo'])
  })
})

describe('#pullRequestsOf', () => {
  test("Should keep a repo's pull requests in meta order", () => {
    expect(pullRequestsOf(meta, 'b-repo').map(({ pr }) => pr)).toEqual([2, 3])
  })
})

describe('#snapshotChangesOf', () => {
  test("Should list a repo's changes oldest first, passing over a snapshot with no changes", () => {
    expect(snapshotChangesOf(meta, 'a-repo')).toEqual([
      { repo: 'a-repo', current_commit: 'one' },
      { repo: 'a-repo', current_commit: 'two' }
    ])
  })

  test('Should list nothing for a review with no snapshots', () => {
    expect(snapshotChangesOf({ prs: [] }, 'a-repo')).toEqual([])
  })
})
