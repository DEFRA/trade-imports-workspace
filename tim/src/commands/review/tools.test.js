import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { recordTimRun } from '../../test-support/bash-golden-harness.js'
import { envelopeOf } from '../../test-support/tim-cli.js'
import {
  completeReviewId,
  fullReviewId,
  localReviewId,
  summaryRepos
} from '../../review/__fixtures__/review-tools.js'
import {
  expectToolsRunsAsRecorded,
  recordedToolsCasesFor,
  runToolsSteps,
  withStagedTools
} from '../../review/__fixtures__/review-tools-runs.js'

const backend = 'trade-imports-animals-backend'

const asTimWouldSay = (text) =>
  text
    .replace(
      'run aggregate-file-reviews.sh --write-items first',
      'run tim review aggregate --write-items first'
    )
    .replaceAll('prepare-review.sh', 'tim review prepare')

const reviewFile = (staged, ...parts) =>
  join(staged.root, 'workareas', 'reviews', ...parts)

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

describe.each(['items render', 'aggregate', 'verify', 'reconcile'])(
  'tim review %s matches the Bash it replaces',
  (prefix) => {
    test.concurrent.each(recordedToolsCasesFor(prefix))(
      'Should give the recorded output, exit code and files for $name',
      async ({ steps, recorded }) => {
        const runs = await withStagedTools((staged) =>
          runToolsSteps(staged, steps)
        )

        expectToolsRunsAsRecorded(runs, recorded, { asTimWouldSay })
      }
    )
  }
)

describe('tim review items render', () => {
  test('Should fill a comment that names tim review items render', async () => {
    const summary = await withStagedTools(async (staged) => {
      const path = reviewFile(
        staged,
        fullReviewId,
        `review.${summaryRepos.verdictOnly}.md`
      )
      writeFileSync(
        path,
        '## Risk\n\n<!-- items table: `tim review items render EUDPA-1 --repo r --write` puts it here. -->\n\n## Repository Verdict\n'
      )
      await recordTimRun(staged, [
        'review',
        'items',
        'render',
        fullReviewId,
        '--repo',
        summaryRepos.verdictOnly,
        '--write'
      ])
      return readFileSync(path, 'utf8')
    })

    expect(summary.split('\n').slice(0, 4)).toEqual([
      '## Risk',
      '',
      '| # | File | Line | Severity | Category | Issue | Must | One way | Disposition | Status | Notes |',
      '|---|------|------|----------|----------|-------|------|---------|-------------|--------|-------|'
    ])
  })
})

describe('tim review aggregate', () => {
  test('Should stamp reconciled_at on every reviewed file with --write-items, and leave the placeholder', async () => {
    const reviews = await withStagedTools(async (staged) => {
      await recordTimRun(staged, [
        'review',
        'aggregate',
        fullReviewId,
        '--repo',
        backend,
        '--write-items'
      ])
      const folder = reviewFile(staged, fullReviewId, 'file-reviews', backend)
      return ['docs_notes.md', 'pom.xml', 'src_main_java_b.java'].map((name) =>
        readJson(join(folder, `${name}.review.json`))
      )
    })

    expect(
      reviews.map(
        ({ reconciled_at: reconciledAt }) => reconciledAt > '2026-11-12'
      )
    ).toEqual([false, true, true])
  })

  test("Should give each file's rollup as the --json result", async () => {
    const run = await withStagedTools((staged) =>
      recordTimRun(staged, [
        'review',
        'aggregate',
        fullReviewId,
        '--repo',
        'trade-imports-animals-frontend',
        '--json'
      ])
    )

    expect(envelopeOf(run).result).toEqual([
      {
        file: 'src/server/app/index.js',
        verdict: 'NEEDS_ATTENTION',
        critical: 0,
        major: 1,
        minor: 0,
        todos: [
          {
            id: 1,
            line: 4,
            severity: 'Major',
            category: 'error-handling',
            issue: 'Swallows the error',
            fix: 'Must: rethrow.'
          }
        ]
      },
      {
        file: 'src/server/app/views.njk',
        verdict: 'PENDING_SOMETHING',
        critical: 0,
        major: 0,
        minor: 0,
        todos: []
      }
    ])
  })
})

describe('tim review verify', () => {
  test('Should give the pending files as the files --json result', async () => {
    const run = await withStagedTools((staged) =>
      recordTimRun(staged, [
        'review',
        'verify',
        'files',
        fullReviewId,
        '--json'
      ])
    )

    expect(envelopeOf(run).result).toEqual({
      ticket: fullReviewId,
      total: 7,
      reviewed: 5,
      pending: 2,
      coverage: '71%',
      complete: false,
      pending_files: [
        `${backend}|src/main/java/a.java`,
        `${backend}|docs/notes.md`
      ]
    })
  })

  test('Should refuse, naming the gh command to run, when a pull request has no facts file', async () => {
    const run = await withStagedTools((staged) => {
      rmSync(reviewFile(staged, completeReviewId, '.prs', `${backend}-21.json`))
      return recordTimRun(staged, [
        'review',
        'verify',
        'files',
        completeReviewId
      ])
    })

    expect({ exitCode: run.exitCode, stderr: run.stderr }).toEqual({
      exitCode: 1,
      stderr: `Can't find the changed files of ${backend}#21. Write them with:\n  gh api repos/DEFRA/${backend}/pulls/21/files --paginate --slurp > <HOME>/git/defra/trade-imports-workspace/workareas/reviews/${completeReviewId}/.prs/${backend}-21.json\n`
    })
  })

  test('Should give the skip as the consistency --json result for a local review', async () => {
    const run = await withStagedTools((staged) =>
      recordTimRun(staged, [
        'review',
        'verify',
        'consistency',
        localReviewId,
        '--json'
      ])
    )

    expect(envelopeOf(run).result).toEqual({
      ticket: localReviewId,
      skipped: true,
      reason: 'consistency theme not enabled for this review'
    })
  })

  test('Should give the pending repos as the consistency --json result', async () => {
    const run = await withStagedTools((staged) =>
      recordTimRun(staged, [
        'review',
        'verify',
        'consistency',
        fullReviewId,
        '--json'
      ])
    )

    expect(envelopeOf(run).result).toEqual({
      ticket: fullReviewId,
      total: 3,
      reviewed: 1,
      pending: 2,
      coverage: '33%',
      complete: false,
      pending_repos: ['trade-imports-animals-frontend', 'trade-imports-stub']
    })
  })
})

describe('tim review reconcile', () => {
  test('Should give what it added and the spot-check as the --json result', async () => {
    const run = await withStagedTools((staged) =>
      recordTimRun(staged, [
        'review',
        'reconcile',
        fullReviewId,
        '--repo',
        backend,
        '--json'
      ])
    )

    expect(envelopeOf(run).result).toEqual({
      added_count: 3,
      added: [
        'src/main/java/b.java:12 [Major] Returns 200 | 204 for a missing id',
        'src/main/java/b.java:30 [Minor] Vague name',
        'src/main/java/b.java:31 [Minor] Stale comment'
      ],
      added_ids: ['5', '6', '7'],
      skipped_already_reconciled: 1,
      skipped_unreviewed: 1,
      spot_check: [
        {
          id: 1,
          file: 'src/main/java/b.java',
          line: '9',
          issue: 'Pipes | here\nand a newline',
          notes: 'abc1234'
        },
        {
          id: 2,
          file: 'src/main/java/b.java',
          line: 7,
          issue: 'Short name',
          notes: ''
        }
      ]
    })
  })
})
