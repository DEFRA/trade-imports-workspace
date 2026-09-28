import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { REPOS, isWorkspaceBranchSynced } from '../../constants/repos.js'
import {
  createBareRepo,
  createFatClone,
  pushCommit
} from '../../test-support/git-fixtures.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')

const syncedRepos = REPOS.filter(isWorkspaceBranchSynced)
const exemptRepos = REPOS.filter((repo) => !isWorkspaceBranchSynced(repo))

let workspace
let fixturesDir

const runUpdate = (extraArgs = []) =>
  execa(
    'node',
    [
      cliPath,
      'workspace',
      'update',
      '--workspace',
      workspace,
      '--json',
      ...extraArgs
    ],
    { reject: false }
  )

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-update-'))
  fixturesDir = mkdtempSync(join(tmpdir(), 'tim-update-fixtures-'))
  writeFileSync(join(workspace, 'Makefile'), 'all:\n')
  mkdirSync(join(workspace, 'repos'))
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
  rmSync(fixturesDir, { recursive: true, force: true })
})

describe('tim workspace update CLI', () => {
  test('reports every synced repo as skipped when none are cloned', async () => {
    const { stdout, exitCode } = await runUpdate()
    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload.ok).toBe(true)
    expect(payload.result).toHaveLength(syncedRepos.length)
    for (const entry of payload.result) {
      expect(entry.label).toContain('(not cloned, skipping)')
    }
  }, 30_000)

  test('leaves a workspace-branch-sync-exempt repo out unless --include names it', async () => {
    const exempt = exemptRepos[0]

    const without = await runUpdate()
    const withoutPayload = JSON.parse(without.stdout.trim())
    expect(withoutPayload.skipped).toEqual([exempt])
    expect(withoutPayload.result.some((r) => r.repo === exempt)).toBe(false)

    const withIncluded = await runUpdate(['--include', exempt])
    const withPayload = JSON.parse(withIncluded.stdout.trim())
    expect(withPayload.skipped).toEqual([])
    expect(withPayload.result.some((r) => r.repo === exempt)).toBe(true)
  }, 30_000)

  test('heals a fat clone on first update, then pulls without gh-pages', async () => {
    const repo = REPOS[0]
    const { barePath, workPath, shas } = await createBareRepo(fixturesDir, repo)
    const dir = join(workspace, 'repos', repo)
    await createFatClone(barePath, dir)
    await execa('git', ['-C', dir, 'branch', 'local-work', shas.feature])
    writeFileSync(join(dir, 'README.md'), 'uncommitted edit\n')
    await execa('git', [
      '-C',
      dir,
      '-c',
      'user.name=tim-test',
      '-c',
      'user.email=tim-test@example.invalid',
      'stash',
      'push',
      '--quiet'
    ])
    const newMainSha = await pushCommit(workPath, 'main', 'after-clone.txt')
    await pushCommit(workPath, 'gh-pages', 'new-report.html')

    const first = await runUpdate()
    expect(first.exitCode).toBe(0)
    const firstPayload = JSON.parse(first.stdout.trim())
    expect(firstPayload.ok).toBe(true)
    const healedEntry = firstPayload.result.find((entry) => entry.repo === repo)
    expect(healedEntry.label).toContain('gh-pages excluded')

    expect(
      (
        await execa('git', [
          '-C',
          dir,
          'config',
          '--get-all',
          'remote.origin.fetch'
        ])
      ).stdout.split('\n')
    ).toEqual(['+refs/heads/*:refs/remotes/origin/*', '^refs/heads/gh-pages'])
    const branches = await execa('git', ['-C', dir, 'branch', '-a'])
    expect(branches.stdout).toContain('local-work')
    expect(branches.stdout).not.toContain('gh-pages')
    const pulledSha = await execa('git', [
      '-C',
      dir,
      'rev-parse',
      'origin/main'
    ])
    expect(pulledSha.stdout.trim()).toBe(newMainSha)
    const ghPagesObject = await execa(
      'git',
      ['-C', dir, 'cat-file', '-e', shas.ghPages],
      { reject: false }
    )
    expect(ghPagesObject.exitCode).not.toBe(0)
    const stashes = await execa('git', ['-C', dir, 'stash', 'list'])
    expect(stashes.stdout).not.toBe('')

    const second = await runUpdate()
    expect(second.exitCode).toBe(0)
    const secondEntry = JSON.parse(second.stdout.trim()).result.find(
      (entry) => entry.repo === repo
    )
    expect(secondEntry.label).toBe(`${repo} — git pull --rebase`)
  }, 60_000)
})
