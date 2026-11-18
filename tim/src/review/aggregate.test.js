import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { aggregateFileReviews, utcSeconds } from './aggregate.js'
import { fullReviewId } from './__fixtures__/review-tools.js'
import { withStagedTools } from './__fixtures__/review-tools-runs.js'

const backend = 'trade-imports-animals-backend'
const fixedNow = () => new Date('2026-11-14T08:09:10.123Z')

describe('#aggregateFileReviews', () => {
  test('Should start the items file afresh, numbered across files in path order', async () => {
    const items = await withStagedTools(({ root }) => {
      aggregateFileReviews({
        workspaceRoot: root,
        reviewId: fullReviewId,
        repo: backend,
        writeItems: true,
        json: true,
        now: fixedNow
      })
      return JSON.parse(
        readFileSync(
          join(
            root,
            'workareas',
            'reviews',
            fullReviewId,
            `items.${backend}.json`
          ),
          'utf8'
        )
      ).items
    })

    expect(
      items.map(({ id, file, disposition }) => [id, file, disposition])
    ).toEqual([
      [1, 'pom.xml', null],
      [2, 'src/main/java/b.java', null],
      [3, 'src/main/java/b.java', null],
      [4, 'src/main/java/b.java', null]
    ])
  })

  test('Should stamp reconciled_at with the time it wrote the items', async () => {
    const review = await withStagedTools(({ root }) => {
      aggregateFileReviews({
        workspaceRoot: root,
        reviewId: fullReviewId,
        repo: backend,
        writeItems: true,
        json: true,
        now: fixedNow
      })
      return JSON.parse(
        readFileSync(
          join(
            root,
            'workareas',
            'reviews',
            fullReviewId,
            'file-reviews',
            backend,
            'pom.xml.review.json'
          ),
          'utf8'
        )
      )
    })

    expect(review.reconciled_at).toBe('2026-11-14T08:09:10Z')
  })

  test('Should refuse an unknown section', async () => {
    const refusal = await withStagedTools(({ root }) => {
      try {
        aggregateFileReviews({
          workspaceRoot: root,
          reviewId: fullReviewId,
          repo: backend,
          section: 'other'
        })
        return null
      } catch (error) {
        return error
      }
    })

    expect(refusal).toMatchObject({
      code: 'USAGE',
      message: 'Unknown --section: other'
    })
  })
})

describe('#utcSeconds', () => {
  test('Should drop the milliseconds', () => {
    expect(utcSeconds(fixedNow())).toBe('2026-11-14T08:09:10Z')
  })
})
