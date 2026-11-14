import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  expectRefreshCaseAsRecorded,
  recordTimInRefresh,
  recordedRefreshCasesFor,
  withStagedRefresh
} from '../../review/__fixtures__/review-refresh-runs.js'
import {
  refreshReviewId,
  stub
} from '../../review/__fixtures__/review-refresh.js'

describe('tim review file-diff matches the Bash it replaces', () => {
  test.concurrent.each(recordedRefreshCasesFor('file-diff'))(
    'Should give the recorded output and exit code when it $name',
    (refreshCase) => expectRefreshCaseAsRecorded(refreshCase),
    60_000
  )
})

describe('tim review file-diff', () => {
  test('Should give the file, the repo, where the diff came from and its blocks as JSON', async () => {
    const run = await withStagedRefresh({}, (staged) =>
      recordTimInRefresh(staged, [
        'review',
        'file-diff',
        'assets/logo.png',
        '--ticket',
        refreshReviewId,
        '--repo',
        stub,
        '--json'
      ])
    )

    expect(JSON.parse(run.stdout).result).toEqual({
      repo: stub,
      file: 'assets/logo.png',
      source: 'cache',
      diff: 'diff --git a/assets/logo.png b/assets/logo.png\nindex 7777777..8888888 100644\nBinary files a/assets/logo.png and b/assets/logo.png differ\n'
    })
  })

  test('Should refuse a review with no cached diff and say to pipe gh pr diff in', async () => {
    const run = await withStagedRefresh({}, async (staged) => {
      rmSync(join(staged.reviewFolderOf(refreshReviewId), '.diffs'), {
        recursive: true
      })
      return recordTimInRefresh(staged, [
        'review',
        'file-diff',
        'src/a.js',
        '--ticket',
        refreshReviewId,
        '--repo',
        stub
      ])
    })

    expect(run).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: `No cached diff at <HOME>/git/defra/trade-imports-workspace/workareas/reviews/${refreshReviewId}/.diffs/${stub}.diff; pipe gh pr diff in with --stdin\n`
    })
  })

  test('Should refuse a run with neither a review and repo nor --stdin', async () => {
    const run = await withStagedRefresh({}, (staged) =>
      recordTimInRefresh(staged, ['review', 'file-diff', 'src/a.js'])
    )

    expect(run).toEqual({
      exitCode: 1,
      stdout: '',
      stderr:
        'Usage: tim review file-diff <file> (--ticket REVIEW-ID --repo REPO | --stdin)\n'
    })
  })
})
