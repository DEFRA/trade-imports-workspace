import { describe, test, expect, afterEach } from 'vitest'
import { rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { commitAll, git, writeFiles } from '../../test-support/branched-repo.js'
import {
  createCliWorkspace,
  envelopeOf,
  runTimInWorkspace
} from '../../test-support/tim-cli.js'
import { renderRunJobsText } from './run-jobs.js'

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const PUBLISH = `name: Publish
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps: []
`

const repoWithWorkflow = async () => {
  root = createCliWorkspace('tim-build-run-jobs-cli-')
  const repoPath = join(root, 'repos', 'frontend')
  await git(root, 'init', '--quiet', '-b', 'main', repoPath)
  writeFiles(repoPath, { '.github/workflows/publish.yml': PUBLISH })
  await commitAll(repoPath, 'workflows')
  return (await git(repoPath, 'rev-parse', 'HEAD')).stdout.trim()
}

describe('tim build run-jobs', () => {
  test('Should report green in a JSON envelope when every job has passed', async () => {
    const sha = await repoWithWorkflow()
    const jobsFile = join(root, 'jobs.json')
    writeFileSync(
      jobsFile,
      JSON.stringify({
        jobs: [{ name: 'build', status: 'completed', conclusion: 'success' }]
      })
    )

    const run = await runTimInWorkspace(root, [
      'build',
      'run-jobs',
      'frontend',
      '--commit',
      sha,
      '--workflow',
      '.github/workflows/publish.yml',
      '--jobs',
      jobsFile,
      '--json'
    ])

    expect({
      exitCode: run.exitCode,
      green: envelopeOf(run).result.green,
      missing: envelopeOf(run).result.missing
    }).toEqual({ exitCode: 0, green: true, missing: [] })
  })

  test('Should exit 2 asking for the jobs file when --jobs is left out', async () => {
    const sha = await repoWithWorkflow()

    const run = await runTimInWorkspace(root, [
      'build',
      'run-jobs',
      'frontend',
      '--commit',
      sha,
      '--workflow',
      '.github/workflows/publish.yml',
      '--json'
    ])

    expect({
      exitCode: run.exitCode,
      message: envelopeOf(run).errors[0].message
    }).toEqual({
      exitCode: 2,
      message:
        'Name the saved jobs answer with --jobs: the output of gh api repos/<owner>/<repo>/actions/runs/<id>/jobs?filter=latest.'
    })
  })
})

describe('#renderRunJobsText', () => {
  test('Should say what is missing and what has not passed, then list every job', () => {
    expect(
      renderRunJobsText({
        workflow: '.github/workflows/publish.yml',
        green: false,
        missing: ['publish-arm64 / …'],
        notPassed: [],
        jobs: ['CDP-build-workflow: success']
      })
    ).toBe(
      [
        'Not every job of .github/workflows/publish.yml has passed.',
        'Defined jobs with no job in the run: publish-arm64 / ….',
        'Jobs not passed: none.',
        '  CDP-build-workflow: success'
      ].join('\n')
    )
  })
})
