import { describe, test, expect } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { changedScopeRuns, changedSpecPaths } from './changed-scope.js'

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

  test('passes with no tests, so a deleted named spec does not fail the rung', () => {
    const [run] = changedScopeRuns({
      coveredSpecs: ['tests/animals/gone.spec.ts']
    })

    expect(run.args).toContain('--pass-with-no-tests')
  })
})

describe('changedSpecPaths', () => {
  const git = (cwd, args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' })

  const repoWithBranchChanging = (files) => {
    const root = mkdtempSync(join(tmpdir(), 'changed-scope-'))
    git(root, ['init', '--initial-branch=main'])
    git(root, ['config', 'user.email', 'test@example.com'])
    git(root, ['config', 'user.name', 'Test'])
    writeFileSync(join(root, 'README.md'), 'base\n')
    git(root, ['add', '.'])
    git(root, ['commit', '-m', 'base'])
    git(root, ['checkout', '-b', 'feat/branch'])
    for (const file of files) {
      mkdirSync(join(root, file.split('/').slice(0, -1).join('/')), {
        recursive: true
      })
      writeFileSync(join(root, file), 'changed\n')
    }
    git(root, ['add', '.'])
    git(root, ['commit', '-m', 'change'])
    return root
  }

  test('lists only the spec files the branch changed', async () => {
    const root = repoWithBranchChanging([
      'tests/animals/e2e/features/amend.spec.ts',
      'page-objects/animals/amend-page.ts',
      'docs/notes.md'
    ])

    expect(await changedSpecPaths(root, 'main')).toEqual([
      'tests/animals/e2e/features/amend.spec.ts'
    ])

    rmSync(root, { recursive: true, force: true })
  })

  test('gives nothing when the branch changed no spec', async () => {
    const root = repoWithBranchChanging(['page-objects/animals/amend-page.ts'])

    expect(await changedSpecPaths(root, 'main')).toEqual([])

    rmSync(root, { recursive: true, force: true })
  })
})

describe('changedSpecPaths and work that is not committed yet', () => {
  const git = (cwd, args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' })

  const repoOnBranch = () => {
    const root = mkdtempSync(join(tmpdir(), 'changed-scope-wip-'))
    git(root, ['init', '--initial-branch=main'])
    git(root, ['config', 'user.email', 'test@example.com'])
    git(root, ['config', 'user.name', 'Test'])
    mkdirSync(join(root, 'tests/animals'), { recursive: true })
    writeFileSync(join(root, 'tests/animals/existing.spec.ts'), 'base\n')
    git(root, ['add', '.'])
    git(root, ['commit', '-m', 'base'])
    git(root, ['checkout', '-b', 'feat/branch'])
    return root
  }

  test('lists a spec the row has written but not committed', async () => {
    const root = repoOnBranch()
    writeFileSync(join(root, 'tests/animals/new.spec.ts'), 'new\n')

    expect(await changedSpecPaths(root, 'main')).toEqual([
      'tests/animals/new.spec.ts'
    ])

    rmSync(root, { recursive: true, force: true })
  })

  test('lists a spec the row has edited but not staged', async () => {
    const root = repoOnBranch()
    writeFileSync(join(root, 'tests/animals/existing.spec.ts'), 'edited\n')

    expect(await changedSpecPaths(root, 'main')).toEqual([
      'tests/animals/existing.spec.ts'
    ])

    rmSync(root, { recursive: true, force: true })
  })

  test('leaves out a spec the row deleted, which Playwright could not run', async () => {
    const root = repoOnBranch()
    git(root, ['rm', '-q', 'tests/animals/existing.spec.ts'])

    expect(await changedSpecPaths(root, 'main')).toEqual([])

    rmSync(root, { recursive: true, force: true })
  })

  test('refuses a base the repo does not have, rather than reporting no specs', async () => {
    const root = repoOnBranch()

    await expect(changedSpecPaths(root, 'origin/nope')).rejects.toMatchObject({
      code: 'NOT_FOUND'
    })

    rmSync(root, { recursive: true, force: true })
  })
})
