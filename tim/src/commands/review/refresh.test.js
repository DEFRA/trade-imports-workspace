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

describe.each(['merge-resolved', 'gaps', 'pull', 'scope'])(
  'tim review refresh %s matches the Bash it replaces',
  (command) => {
    test.concurrent.each(recordedRefreshCasesFor(command))(
      'Should give the recorded output, exit code and review state when $name',
      (refreshCase) => expectRefreshCaseAsRecorded(refreshCase),
      60_000
    )
  }
)

describe('tim review refresh gaps', () => {
  test('Should refuse a pull request with no facts file and name the gh command that writes it', async () => {
    const run = await withStagedRefresh({}, (staged) =>
      recordTimInRefresh(staged, [
        'review',
        'refresh',
        'gaps',
        refreshReviewId,
        '--repo',
        stub,
        '--pr',
        '12'
      ])
    )

    expect(run).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: `Can't find the changed files of ${stub}#12. Write them with:\n  gh api repos/DEFRA/${stub}/pulls/12/files --paginate --slurp > <HOME>/git/defra/trade-imports-workspace/workareas/reviews/${refreshReviewId}/.prs/${stub}-12.json\n`
    })
  })
})

describe('tim review refresh scope', () => {
  test('Should leave a pull request with no facts file out of list D with a warning', async () => {
    const { run, scope } = await withStagedRefresh({}, async (staged) => {
      rmSync(
        join(staged.reviewFolderOf(refreshReviewId), '.prs', `${stub}-9.json`)
      )
      const scopeRun = await recordTimInRefresh(staged, [
        'review',
        'refresh',
        'scope',
        refreshReviewId,
        '--no-pull',
        '--repo',
        stub,
        '--json'
      ])
      return { run: scopeRun, scope: JSON.parse(scopeRun.stdout).result }
    })

    expect(run.exitCode).toBe(0)
    expect(run.stderr).toBe(
      `Warning: List D leaves out ${stub}#9. Can't find the changed files of ${stub}#9. Write them with:\n  gh api repos/DEFRA/${stub}/pulls/9/files --paginate --slurp > <HOME>/git/defra/trade-imports-workspace/workareas/reviews/${refreshReviewId}/.prs/${stub}-9.json\n`
    )
    expect(scope.repos[0].lists.D).toEqual([
      { file: 'src/moved.js' },
      { file: 'src/new.js' }
    ])
  })

  test('Should print its help with an example and the options, and touch nothing', async () => {
    const run = await withStagedRefresh({}, (staged) =>
      recordTimInRefresh(staged, ['review', 'refresh', 'scope', '--help'])
    )

    expect(run.exitCode).toBe(0)
    expect(run.stdout).toContain('--no-pull')
    expect(run.stdout).toContain('--write-snapshot')
    expect(run.stdout).toContain(
      'tim review refresh scope EUDPA-1234 --write-snapshot --json'
    )
  })
})
