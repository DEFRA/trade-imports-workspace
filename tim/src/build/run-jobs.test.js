import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { commitAll, git, writeFiles } from '../test-support/branched-repo.js'
import { judgeRunJobs } from './run-jobs.js'

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const PUBLISH = `name: Publish
on:
  push:
    branches: [main]
jobs:
  build:
    name: CDP-build-workflow
    runs-on: ubuntu-latest
    steps: []
  publish-arm64:
    needs: build
    uses: DEFRA/trade-imports-workspace/.github/workflows/publish-multiarch.yml@main
`

const CALLS_LOCAL = `name: CI
on: push
jobs:
  test:
    strategy:
      matrix:
        node: [22, 24]
    runs-on: ubuntu-latest
    steps: []
  release:
    uses: ./.github/workflows/release.yml
`

const RELEASE = `on: workflow_call
jobs:
  tag:
    runs-on: ubuntu-latest
    steps: []
  notes:
    name: Release notes
    runs-on: ubuntu-latest
    steps: []
`

const repoAt = async (files) => {
  root = mkdtempSync(join(tmpdir(), 'tim-run-jobs-'))
  const repoPath = join(root, 'repo')
  await git(root, 'init', '--quiet', '-b', 'main', repoPath)
  writeFiles(repoPath, files)
  await commitAll(repoPath, 'workflows')
  return {
    repoPath,
    commit: (await git(repoPath, 'rev-parse', 'HEAD')).stdout.trim()
  }
}

const job = (name, conclusion = 'success', status = 'completed') => ({
  name,
  status,
  conclusion: status === 'completed' ? conclusion : null
})

const judge = async ({ repoPath, commit }, workflow, jobs) => {
  const jobsFile = join(root, 'jobs.json')
  writeFileSync(jobsFile, JSON.stringify({ total_count: jobs.length, jobs }))
  return judgeRunJobs({ repoPath, commit, workflow, jobsFile })
}

describe('#judgeRunJobs', () => {
  test('Should count a run green when every defined job has passed, a remote reusable workflow’s jobs included', async () => {
    const repo = await repoAt({ '.github/workflows/publish.yml': PUBLISH })

    const verdict = await judge(repo, '.github/workflows/publish.yml', [
      job('CDP-build-workflow'),
      job('publish-arm64 / build-arm64'),
      job('publish-arm64 / merge-manifest', 'skipped')
    ])

    expect(verdict).toEqual({
      workflow: '.github/workflows/publish.yml',
      commit: repo.commit,
      green: true,
      declared: [
        'CDP-build-workflow',
        'publish-arm64 (calls DEFRA/trade-imports-workspace/.github/workflows/publish-multiarch.yml@main)'
      ],
      missing: [],
      notPassed: [],
      jobs: [
        'CDP-build-workflow: success',
        'publish-arm64 / build-arm64: success',
        'publish-arm64 / merge-manifest: skipped'
      ]
    })
  })

  test('Should not count a run green when a reusable workflow has no job in it yet', async () => {
    const repo = await repoAt({ '.github/workflows/publish.yml': PUBLISH })

    const verdict = await judge(repo, '.github/workflows/publish.yml', [
      job('CDP-build-workflow')
    ])

    expect({ green: verdict.green, missing: verdict.missing }).toEqual({
      green: false,
      missing: ['publish-arm64 / …']
    })
  })

  test('Should not count a run green while a job is still running or has failed', async () => {
    const repo = await repoAt({ '.github/workflows/publish.yml': PUBLISH })

    const verdict = await judge(repo, '.github/workflows/publish.yml', [
      job('CDP-build-workflow', 'failure'),
      job('publish-arm64 / build-arm64', null, 'in_progress')
    ])

    expect({ green: verdict.green, notPassed: verdict.notPassed }).toEqual({
      green: false,
      notPassed: [
        'CDP-build-workflow: failure',
        'publish-arm64 / build-arm64: in_progress'
      ]
    })
  })

  test('Should need every job of a reusable workflow in the same repo, and accept matrix jobs', async () => {
    const repo = await repoAt({
      '.github/workflows/ci.yml': CALLS_LOCAL,
      '.github/workflows/release.yml': RELEASE
    })

    const verdict = await judge(repo, '.github/workflows/ci.yml', [
      job('test (22)'),
      job('test (24)'),
      job('release / tag')
    ])

    expect({ green: verdict.green, missing: verdict.missing }).toEqual({
      green: false,
      missing: ['release / Release notes']
    })
  })

  test('Should accept a reusable workflow skipped as a whole', async () => {
    const repo = await repoAt({
      '.github/workflows/ci.yml': CALLS_LOCAL,
      '.github/workflows/release.yml': RELEASE
    })

    const verdict = await judge(repo, '.github/workflows/ci.yml', [
      job('test (22)'),
      job('test (24)'),
      job('release', 'skipped')
    ])

    expect(verdict.green).toBe(true)
  })

  test('Should refuse a jobs file with no jobs list', async () => {
    const repo = await repoAt({ '.github/workflows/publish.yml': PUBLISH })
    const jobsFile = join(root, 'jobs.json')
    writeFileSync(jobsFile, '{"message":"Not Found"}')

    await expect(
      judgeRunJobs({
        ...repo,
        workflow: '.github/workflows/publish.yml',
        jobsFile
      })
    ).rejects.toMatchObject({
      code: 'PARSE',
      message:
        'The jobs file holds no jobs list. Save the whole answer of `gh api repos/<owner>/<repo>/actions/runs/<id>/jobs?filter=latest`.'
    })
  })
})
