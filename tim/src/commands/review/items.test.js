import { describe, expect, test } from 'vitest'
import { ERROR } from '../../constants/exitCodes.js'
import { recordTimRun } from '../../test-support/bash-golden-harness.js'
import { envelopeOf } from '../../test-support/tim-cli.js'
import { ticketReviewId } from '../../review/__fixtures__/review-ledger.js'
import {
  expectRunsAsRecorded,
  recordedCasesFor,
  runSteps,
  withStagedLedger
} from '../../review/__fixtures__/review-ledger-runs.js'

const runTimOnLedger = (args) =>
  withStagedLedger((staged) =>
    recordTimRun(staged, ['review', 'items', ...args])
  )

describe('tim review items matches the items Bash it replaces', () => {
  test.concurrent.each(recordedCasesFor('items'))(
    'Should give the recorded output, exit code and files for $name',
    async ({ steps, recorded, usage }) => {
      const runs = await withStagedLedger((staged) => runSteps(staged, steps))

      expectRunsAsRecorded(runs, recorded, { usage })
    }
  )
})

describe('tim review items --json', () => {
  test('Should give the filtered items, each with its repo, as the list result', async () => {
    const run = await runTimOnLedger([
      'list',
      ticketReviewId,
      '--filter',
      'merged',
      '--json'
    ])

    expect(envelopeOf(run).result).toEqual([
      {
        id: 7,
        file: 'pom.xml',
        line: '3',
        severity: 'Minor',
        category: 'duplication',
        issue: 'Same version twice',
        fix: 'Use a property',
        disposition: 'Merged',
        status: '—',
        notes: 'merged into #5',
        best_practice: 'docs/best-practices/java/maven.md',
        repo: 'trade-imports-animals-backend'
      }
    ])
  })

  test('Should give an empty list for a repo with no items file', async () => {
    const run = await runTimOnLedger([
      'list',
      ticketReviewId,
      '--repo',
      'trade-imports-stub',
      '--json'
    ])

    expect(envelopeOf(run).result).toEqual([])
  })

  test('Should give the breakdown and total as the counts result', async () => {
    const run = await runTimOnLedger([
      'counts',
      ticketReviewId,
      '--repo',
      'trade-imports-animals-frontend',
      '--json'
    ])

    expect(envelopeOf(run).result).toEqual({
      reviewId: ticketReviewId,
      repo: 'trade-imports-animals-frontend',
      breakdown: [
        { disposition: '', status: '', count: 1 },
        { disposition: 'Auto-Resolved', status: '—', count: 1 },
        { disposition: "Won't Fix", status: '—', count: 1 }
      ],
      total: 3
    })
  })

  test('Should give the marked item as the mark result', async () => {
    const run = await runTimOnLedger([
      'mark',
      ticketReviewId,
      '--repo',
      'trade-imports-animals-backend',
      '--item',
      '1',
      '--disposition',
      'Fix',
      '--json'
    ])

    expect(envelopeOf(run).result.item).toEqual({
      id: 1,
      file: 'src/main/java/Notification.java',
      line: '12',
      severity: 'Critical',
      category: 'security',
      issue: 'Logs the token',
      fix: 'Must: drop it. One way: redact it',
      disposition: 'Fix',
      status: 'Not Done',
      notes: null
    })
  })

  test('Should print one error envelope and exit 1 for a missing review', async () => {
    const run = await runTimOnLedger(['counts', 'EUDPA-404', '--json'])

    expect({ exitCode: run.exitCode, errors: envelopeOf(run).errors }).toEqual({
      exitCode: ERROR,
      errors: [
        {
          code: 'NOT_FOUND',
          message: expect.stringMatching(
            /^Review workspace not found: .*\/workareas\/reviews\/EUDPA-404$/
          )
        }
      ]
    })
  })
})

describe('tim review items mark', () => {
  test('Should refuse an item id that is not a number and leave the items as they were', async () => {
    const runs = await withStagedLedger((staged) =>
      runSteps(staged, [
        {
          command: 'items mark',
          args: [
            ticketReviewId,
            '--repo',
            'trade-imports-animals-backend',
            '--item',
            'first',
            '--disposition',
            'Fix'
          ]
        }
      ])
    )

    expect(runs).toEqual([
      {
        exitCode: ERROR,
        stdout: '',
        stderr: 'Invalid --item: first (must be a number)\n',
        filesWritten: {}
      }
    ])
  })
})
