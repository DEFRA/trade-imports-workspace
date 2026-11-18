import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ERROR, OK } from '../../constants/exitCodes.js'
import { recordTimRun } from '../../test-support/bash-golden-harness.js'
import { ticketReviewId } from '../../review/__fixtures__/review-ledger.js'
import {
  expectRunsAsRecorded,
  recordedCasesFor,
  runSteps,
  withStagedLedger
} from '../../review/__fixtures__/review-ledger-runs.js'

const backendNotification = [
  '--repo',
  'trade-imports-animals-backend',
  '--file',
  'src/main/java/Notification.java'
]

describe('tim review file matches the per-file Bash it replaces', () => {
  test.concurrent.each(recordedCasesFor('file'))(
    'Should give the recorded output, exit code and files for $name',
    async ({ steps, recorded, usage }) => {
      const runs = await withStagedLedger((staged) => runSteps(staged, steps))

      expectRunsAsRecorded(runs, recorded, { usage })
    }
  )
})

describe('tim review file refuses a value that is not JSON', () => {
  test('Should refuse a line that is not a number and leave the review as it was', async () => {
    const runs = await withStagedLedger((staged) =>
      runSteps(staged, [
        {
          command: 'file add',
          args: [
            ticketReviewId,
            ...backendNotification,
            '--line',
            '12-14',
            '--severity',
            'Minor',
            '--category',
            'naming',
            '--issue',
            'Vague name',
            '--fix',
            'Rename it'
          ]
        }
      ])
    )

    expect(runs).toEqual([
      {
        exitCode: ERROR,
        stdout: '',
        stderr: 'Invalid --line: 12-14 (must be a number)\n',
        filesWritten: {}
      }
    ])
  })

  test('Should refuse a PR that is not a number and write no review', async () => {
    const runs = await withStagedLedger((staged) =>
      runSteps(staged, [
        {
          command: 'file init',
          args: [
            ticketReviewId,
            '--repo',
            'trade-imports-animals-backend',
            '--file',
            'src/New.java',
            '--commit',
            'abc1234',
            '--pr',
            'none',
            '--mode',
            'FRESH'
          ]
        }
      ])
    )

    expect(runs).toEqual([
      {
        exitCode: ERROR,
        stdout: '',
        stderr: 'Invalid --pr: none (must be a number)\n',
        filesWritten: {}
      }
    ])
  })
})

describe('tim review file verdict', () => {
  test('Should stamp reviewed_at as UTC to the second', async () => {
    const reviewedAt = await withStagedLedger(async (staged) => {
      await recordTimRun(staged, [
        'review',
        'file',
        'verdict',
        ticketReviewId,
        ...backendNotification,
        '--verdict',
        'SAFE'
      ])
      const reviewPath = join(
        staged.root,
        'workareas/reviews',
        ticketReviewId,
        'file-reviews/trade-imports-animals-backend/src_main_java_Notification.java.review.json'
      )
      return JSON.parse(readFileSync(reviewPath, 'utf8')).reviewed_at
    })

    expect(reviewedAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/)
  })

  test('Should give the review with its verdict as the --json result', async () => {
    const run = await withStagedLedger((staged) =>
      recordTimRun(staged, [
        'review',
        'file',
        'verdict',
        ticketReviewId,
        ...backendNotification,
        '--verdict',
        'NEEDS_ATTENTION',
        '--reason',
        'Wrong status',
        '--json'
      ])
    )

    expect(run.exitCode).toBe(OK)
    expect(JSON.parse(run.stdout).result.review).toMatchObject({
      verdict: 'NEEDS_ATTENTION',
      verdict_reason: 'Wrong status'
    })
  })
})
