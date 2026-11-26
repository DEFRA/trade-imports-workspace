import { describe, test, expect } from 'vitest'
import { changedScopeRuns, isSpecFile } from './changed-scope.js'

describe('isSpecFile', () => {
  test.each([
    'tests/animals/e2e/features/amend.spec.ts',
    'tests/plants/a.spec.js',
    'fit/origin.fit.spec.js',
    'a.spec.mjs',
    'a.spec.tsx'
  ])('collects %s', (path) => {
    expect(isSpecFile(path)).toBe(true)
  })

  test.each([
    'page-objects/animals/amend-page.ts',
    'fixtures/ui.ts',
    'docs/notes.md',
    'src/k6/journeys.js',
    'tests/animals/spec.ts',
    'tests/animals/amend.spec.ts.snap'
  ])('leaves %s out', (path) => {
    expect(isSpecFile(path)).toBe(false)
  })
})

describe('changedScopeRuns', () => {
  test('runs the spec files the branch changed', () => {
    expect(
      changedScopeRuns({ specs: ['tests/animals/e2e/features/a.spec.ts'] })
    ).toEqual([
      {
        suffix: '',
        args: ['tests/animals/e2e/features/a.spec.ts', '--pass-with-no-tests']
      }
    ])
  })

  test('adds the specs the change’s scenarios are proved by', () => {
    const [run] = changedScopeRuns({
      specs: ['tests/animals/a.spec.ts'],
      coveredSpecs: ['tests/plants/b.spec.ts']
    })

    expect(run.args).toEqual([
      'tests/animals/a.spec.ts',
      'tests/plants/b.spec.ts',
      '--pass-with-no-tests'
    ])
  })

  test('names a spec once when it is both changed and covered', () => {
    const [run] = changedScopeRuns({
      specs: ['tests/animals/a.spec.ts'],
      coveredSpecs: ['tests/animals/a.spec.ts']
    })

    expect(run.args).toEqual([
      'tests/animals/a.spec.ts',
      '--pass-with-no-tests'
    ])
  })

  test('plans no run when the change touches no spec', () => {
    expect(changedScopeRuns({})).toEqual([])
  })

  test('runs a covered spec when the branch changed none of its own', () => {
    const [run] = changedScopeRuns({
      coveredSpecs: ['tests/animals/covered.spec.ts']
    })

    expect(run.args).toEqual([
      'tests/animals/covered.spec.ts',
      '--pass-with-no-tests'
    ])
  })

  test('lets a covered spec that no longer exists pass rather than fail the rung', () => {
    const [run] = changedScopeRuns({
      coveredSpecs: ['tests/animals/gone.spec.ts']
    })

    expect(run.args).toContain('--pass-with-no-tests')
  })
})
