import { describe, test, expect } from 'vitest'
import { changedScopeRuns } from './changed-scope.js'

describe('changedScopeRuns', () => {
  test('runs the specs the change reaches through the import graph', () => {
    expect(changedScopeRuns({ base: 'origin/main' })).toEqual([
      {
        suffix: '',
        args: ['--only-changed=origin/main', '--pass-with-no-tests']
      }
    ])
  })

  test('adds a second run for the specs the change’s scenarios are proved by', () => {
    expect(
      changedScopeRuns({
        base: 'origin/main',
        specs: ['tests/animals/e2e/features/cancel-amend-ui.spec.ts']
      })
    ).toEqual([
      {
        suffix: '',
        args: ['--only-changed=origin/main', '--pass-with-no-tests']
      },
      {
        suffix: '-covered',
        args: [
          'tests/animals/e2e/features/cancel-amend-ui.spec.ts',
          '--pass-with-no-tests'
        ]
      }
    ])
  })

  test('keeps every covered spec in the second run', () => {
    const [, covered] = changedScopeRuns({
      base: 'origin/main',
      specs: ['tests/animals/a.spec.ts', 'tests/plants/b.spec.ts']
    })
    expect(covered.args).toEqual([
      'tests/animals/a.spec.ts',
      'tests/plants/b.spec.ts',
      '--pass-with-no-tests'
    ])
  })

  test('compares against the base it is given', () => {
    const [changed] = changedScopeRuns({ base: 'origin/feat/EUDPA-845-theme' })
    expect(changed.args).toContain('--only-changed=origin/feat/EUDPA-845-theme')
  })

  test('passes with no tests, so a narrow change does not fail the rung', () => {
    const runs = changedScopeRuns({
      base: 'origin/main',
      specs: ['tests/animals/a.spec.ts']
    })
    for (const run of runs) {
      expect(run.args).toContain('--pass-with-no-tests')
    }
  })
})
