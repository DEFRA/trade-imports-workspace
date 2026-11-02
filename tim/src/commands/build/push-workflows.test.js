import { describe, test, expect, afterEach } from 'vitest'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { commitAll, git, writeFiles } from '../../test-support/branched-repo.js'
import {
  createCliWorkspace,
  envelopeOf,
  runTimInWorkspace
} from '../../test-support/tim-cli.js'
import { renderPushWorkflowsText } from './push-workflows.js'

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const TIM_CI = `on:
  push:
    branches: [main]
    paths: ['tim/**']
`

const repoWithMergedCommit = async (files) => {
  root = createCliWorkspace('tim-build-push-workflows-cli-')
  const repoPath = join(root, 'repos', 'workspace')
  await git(root, 'init', '--quiet', '-b', 'main', repoPath)
  writeFiles(repoPath, { '.github/workflows/tim-ci.yml': TIM_CI })
  await commitAll(repoPath, 'workflows')
  writeFiles(repoPath, files)
  await commitAll(repoPath, 'merge')
  return (await git(repoPath, 'rev-parse', 'HEAD')).stdout.trim()
}

const runTim = (args) => runTimInWorkspace(root, args)

describe('tim build push-workflows', () => {
  test('reports that a commit outside every workflow’s paths starts none', async () => {
    const sha = await repoWithMergedCommit({ 'openspec/a/spec.md': 'spec\n' })

    const run = await runTim([
      'build',
      'push-workflows',
      'workspace',
      '--commit',
      sha,
      '--json'
    ])

    expect({
      exitCode: run.exitCode,
      ok: envelopeOf(run).ok,
      starts: envelopeOf(run).result.starts
    }).toEqual({ exitCode: 0, ok: true, starts: [] })
  })

  test('names a workflow with no name by its path, as GitHub names its runs', async () => {
    const sha = await repoWithMergedCommit({ 'tim/a.js': 'export {}\n' })

    const run = await runTim([
      'build',
      'push-workflows',
      'workspace',
      '--commit',
      sha,
      '--json'
    ])

    expect(envelopeOf(run).result.starts).toEqual([
      '.github/workflows/tim-ci.yml'
    ])
  })

  test('exits 2 without --commit', async () => {
    await repoWithMergedCommit({ 'tim/a.js': 'export {}\n' })

    const run = await runTim(['build', 'push-workflows', 'workspace'])

    expect(run.exitCode).toBe(2)
  })
})

describe('#renderPushWorkflowsText', () => {
  test('says a commit starts no workflow, and why each one skips', () => {
    const text = renderPushWorkflowsText({
      commit: '4cd37b9c0123456789',
      branch: 'main',
      changedFiles: ['openspec/a/spec.md'],
      workflows: [
        {
          file: '.github/workflows/tim-ci.yml',
          name: 'tim CI',
          starts: false,
          reason: 'no changed file matches its paths'
        }
      ],
      starts: []
    })

    expect(text).toBe(
      [
        'A push of 4cd37b9c0123 to main starts no workflow.',
        'Files the commit changes: 1.',
        '  skips   .github/workflows/tim-ci.yml — no changed file matches its paths'
      ].join('\n')
    )
  })
})
