import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import {
  verifyConsistency,
  verifyFileCoverage,
  verifyStyleCoverage
} from './verify.js'
import {
  completeReviewId,
  fullReviewId,
  missingReviewId
} from './__fixtures__/review-tools.js'
import { withStagedTools } from './__fixtures__/review-tools-runs.js'

const fixedNow = () => new Date('2026-11-14T08:09:10.123Z')

const verifiedWith = (verify, reviewId) =>
  withStagedTools(({ root }) => {
    const verified = verify({ workspaceRoot: root, reviewId, now: fixedNow })
    return {
      ...verified,
      checklist: readFileSync(verified.verificationPath, 'utf8')
    }
  })

describe('#verifyFileCoverage', () => {
  test('Should write a confirmed checklist stamped with the time it ran', async () => {
    const { checklist } = await verifiedWith(
      verifyFileCoverage,
      completeReviewId
    )

    expect(checklist).toBe(
      [
        '# File Review Coverage Verification',
        '',
        `**Ticket:** ${completeReviewId}`,
        '**Last Verified:** 2026-11-14T08:09:10Z',
        '**Total files changed:** 1',
        '**Files reviewed:** 1',
        '**Coverage:** 100%',
        '',
        '## Changed Files Checklist',
        '',
        '| # | Repository | Changed File | Status |',
        '|---|------------|--------------|--------|',
        '| 1 | trade-imports-animals-backend | `pom.xml` | ✅ Reviewed |',
        '',
        '## Verification Result',
        '',
        '- [x] **CONFIRMED: All files have been reviewed**',
        ''
      ].join('\n')
    )
  })

  test('Should round the coverage down', async () => {
    const { coverage } = await verifiedWith(verifyFileCoverage, fullReviewId)

    expect(coverage).toBe('71%')
  })
})

describe('#verifyStyleCoverage', () => {
  test('Should count a style review only once it has a verdict', async () => {
    const { reviewed, pending_files: pendingFiles } = await verifiedWith(
      verifyStyleCoverage,
      fullReviewId
    )

    expect({ reviewed, pendingFiles }).toEqual({
      reviewed: 1,
      pendingFiles: [
        'trade-imports-animals-frontend|src/server/app/form.js',
        'trade-imports-animals-backend|src/main/java/b.java'
      ]
    })
  })
})

describe('#verifyConsistency', () => {
  test('Should count a repo named by two pull requests once', async () => {
    const { total } = await verifiedWith(verifyConsistency, fullReviewId)

    expect(total).toBe(3)
  })

  test('Should refuse a missing review', async () => {
    const refusal = await withStagedTools(({ root }) => {
      try {
        return verifyConsistency({
          workspaceRoot: root,
          reviewId: missingReviewId
        })
      } catch (error) {
        return error
      }
    })

    expect(refusal).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Error: Review directory not found. Run prepare-review.sh first.'
    })
  })
})
