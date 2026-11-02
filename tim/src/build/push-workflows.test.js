import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { commitAll, git, writeFiles } from '../test-support/branched-repo.js'
import { findPushWorkflows, pushVerdict } from './push-workflows.js'

const PUSH_TO_MAIN = { branch: 'main', files: ['openspec/a/spec.md'] }

const TIM_CI = `name: tim CI
on:
  push:
    branches: [main]
    paths:
      - 'tim/**'
      - '**/CLAUDE.md'
  pull_request:
`

const E2E_ON_PRS = `name: E2E
on:
  pull_request:
  workflow_dispatch:
`

describe('#pushVerdict', () => {
  test('starts a workflow whose push trigger names no filters', () => {
    const verdict = pushVerdict('name: Publish\non: push\n', PUSH_TO_MAIN)

    expect(verdict).toEqual({
      name: 'Publish',
      starts: true,
      reason: 'a push to main with these files starts it'
    })
  })

  test('starts a workflow that lists push among its events', () => {
    const verdict = pushVerdict('on: [push, pull_request]\n', PUSH_TO_MAIN)

    expect(verdict.starts).toBe(true)
  })

  test('skips a workflow with no push trigger', () => {
    const verdict = pushVerdict(E2E_ON_PRS, PUSH_TO_MAIN)

    expect(verdict).toEqual({
      name: 'E2E',
      starts: false,
      reason: 'it has no push trigger'
    })
  })

  test('skips a workflow when no changed file matches its paths', () => {
    const verdict = pushVerdict(TIM_CI, {
      branch: 'main',
      files: ['openspec/a/spec.md', 'workareas/shared/x/backlog.json']
    })

    expect(verdict).toEqual({
      name: 'tim CI',
      starts: false,
      reason: 'no changed file matches its paths'
    })
  })

  test('starts a workflow when one changed file matches its paths', () => {
    const verdict = pushVerdict(TIM_CI, {
      branch: 'main',
      files: ['openspec/a/spec.md', 'repos/CLAUDE.md']
    })

    expect(verdict.starts).toBe(true)
  })

  test('skips a workflow whose branches leave out the branch', () => {
    const verdict = pushVerdict(
      'on:\n  push:\n    branches: [release/*]\n',
      PUSH_TO_MAIN
    )

    expect(verdict.reason).toBe(
      'its push trigger lists no branch matching main'
    )
  })

  test('skips a workflow whose branches-ignore covers the branch', () => {
    const verdict = pushVerdict(
      "on:\n  push:\n    branches-ignore: ['main']\n",
      PUSH_TO_MAIN
    )

    expect(verdict.reason).toBe('its push trigger ignores main')
  })

  test('skips a workflow that a push fires only for tags', () => {
    const verdict = pushVerdict(
      "on:\n  push:\n    tags: ['v*']\n",
      PUSH_TO_MAIN
    )

    expect(verdict.reason).toBe('its push trigger fires on tags only')
  })

  test('skips a workflow whose paths-ignore covers every changed file', () => {
    const verdict = pushVerdict(
      "on:\n  push:\n    paths-ignore: ['openspec/**']\n",
      PUSH_TO_MAIN
    )

    expect(verdict.reason).toBe('its paths-ignore covers every changed file')
  })

  test('reads a later ! pattern as taking a file back out of the paths', () => {
    const verdict = pushVerdict(
      "on:\n  push:\n    paths: ['openspec/**', '!openspec/**/spec.md']\n",
      PUSH_TO_MAIN
    )

    expect(verdict.starts).toBe(false)
  })
})

describe('#findPushWorkflows', () => {
  let root

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  const repoWithWorkflows = async () => {
    root = mkdtempSync(join(tmpdir(), 'tim-push-workflows-'))
    await git(root, 'init', '--quiet', '-b', 'main')
    writeFiles(root, {
      '.github/workflows/tim-ci.yml': TIM_CI,
      '.github/workflows/e2e-tests.yml': E2E_ON_PRS,
      '.github/workflows/README.md': 'not a workflow',
      'tim/src/cli.js': 'export {}\n'
    })
    await commitAll(root, 'workflows')
  }

  const commitFiles = async (files) => {
    writeFiles(root, files)
    await commitAll(root, 'change')
    return (await git(root, 'rev-parse', 'HEAD')).stdout.trim()
  }

  test('finds no workflow a commit touching only openspec and workareas starts', async () => {
    await repoWithWorkflows()
    const sha = await commitFiles({
      'openspec/a/spec.md': 'spec\n',
      'workareas/shared/x/backlog.json': '{}\n'
    })

    const outcome = await findPushWorkflows({
      repoPath: root,
      commit: sha,
      branch: 'main'
    })

    expect(outcome).toEqual({
      commit: sha,
      branch: 'main',
      changedFiles: ['openspec/a/spec.md', 'workareas/shared/x/backlog.json'],
      workflows: [
        {
          file: '.github/workflows/e2e-tests.yml',
          name: 'E2E',
          starts: false,
          reason: 'it has no push trigger'
        },
        {
          file: '.github/workflows/tim-ci.yml',
          name: 'tim CI',
          starts: false,
          reason: 'no changed file matches its paths'
        }
      ],
      starts: []
    })
  })

  test('names the workflow a commit touching its paths starts', async () => {
    await repoWithWorkflows()
    const sha = await commitFiles({ 'tim/src/cli.js': 'export const x = 1\n' })

    const outcome = await findPushWorkflows({
      repoPath: root,
      commit: sha,
      branch: 'main'
    })

    expect(outcome.starts).toEqual(['tim CI'])
  })

  test('reads the workflow files as the commit holds them', async () => {
    await repoWithWorkflows()
    const sha = await commitFiles({
      '.github/workflows/tim-ci.yml': 'name: tim checks\non: push\n'
    })

    const outcome = await findPushWorkflows({
      repoPath: root,
      commit: sha,
      branch: 'main'
    })

    expect(outcome.starts).toEqual(['tim checks'])
  })

  test('refuses a workflow file that is not YAML, naming it', async () => {
    await repoWithWorkflows()
    const sha = await commitFiles({
      '.github/workflows/broken.yml': 'on: [push\n'
    })

    await expect(
      findPushWorkflows({ repoPath: root, commit: sha, branch: 'main' })
    ).rejects.toMatchObject({
      code: 'PARSE',
      message: expect.stringContaining(
        `Can't read .github/workflows/broken.yml at ${sha} as YAML`
      )
    })
  })

  test('refuses a commit git does not have', async () => {
    await repoWithWorkflows()

    await expect(
      findPushWorkflows({ repoPath: root, commit: 'deadbeef', branch: 'main' })
    ).rejects.toMatchObject({ code: 'UNKNOWN' })
  })
})
