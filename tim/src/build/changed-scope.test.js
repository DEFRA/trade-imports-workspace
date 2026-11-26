import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  git,
  writeFiles,
  commitAll,
  createRepoOnBranchFromMain
} from '../test-support/branched-repo.js'
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

  test('lets a covered spec that no longer exists pass rather than fail the rung', () => {
    const [run] = changedScopeRuns({
      coveredSpecs: ['tests/animals/gone.spec.ts']
    })

    expect(run.args).toEqual([
      'tests/animals/gone.spec.ts',
      '--pass-with-no-tests'
    ])
  })
})

describe('changedSpecPaths', () => {
  let root = null

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true })
    root = null
  })

  const repoWith = async (files) => {
    root = mkdtempSync(join(tmpdir(), 'changed-scope-'))
    await createRepoOnBranchFromMain(root, files)
    return root
  }

  test('lists the spec files the branch changed, and nothing else', async () => {
    const dir = await repoWith({ 'tests/animals/base.spec.ts': 'base\n' })
    writeFiles(dir, {
      'tests/animals/amend.spec.ts': 'new\n',
      'page-objects/animals/amend-page.ts': 'page\n',
      'docs/notes.md': 'notes\n'
    })
    await commitAll(dir, 'change')

    expect(await changedSpecPaths(dir, 'origin/main')).toEqual([
      'tests/animals/amend.spec.ts'
    ])
  })

  test('lists a spec the row has written but not committed', async () => {
    const dir = await repoWith({ 'tests/animals/base.spec.ts': 'base\n' })
    writeFiles(dir, { 'tests/animals/new.spec.ts': 'new\n' })

    expect(await changedSpecPaths(dir, 'origin/main')).toEqual([
      'tests/animals/new.spec.ts'
    ])
  })

  test('lists a spec the row has edited but not staged', async () => {
    const dir = await repoWith({ 'tests/animals/base.spec.ts': 'base\n' })
    writeFiles(dir, { 'tests/animals/base.spec.ts': 'edited\n' })

    expect(await changedSpecPaths(dir, 'origin/main')).toEqual([
      'tests/animals/base.spec.ts'
    ])
  })

  test('leaves out a spec the row deleted, which Playwright could not run', async () => {
    const dir = await repoWith({ 'tests/animals/base.spec.ts': 'base\n' })
    await git(dir, 'rm', '--quiet', 'tests/animals/base.spec.ts')

    expect(await changedSpecPaths(dir, 'origin/main')).toEqual([])
  })

  test('gives nothing when the branch changed no spec', async () => {
    const dir = await repoWith({ 'page-objects/a.ts': 'a\n' })
    writeFiles(dir, { 'page-objects/a.ts': 'edited\n' })

    expect(await changedSpecPaths(dir, 'origin/main')).toEqual([])
  })

  test('refuses a base the repo does not have, rather than reporting no specs', async () => {
    const dir = await repoWith({ 'tests/animals/base.spec.ts': 'base\n' })

    await expect(changedSpecPaths(dir, 'origin/nope')).rejects.toMatchObject({
      code: 'NOT_FOUND'
    })
  })
})
