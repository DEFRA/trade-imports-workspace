import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { REPOS, isWorkspaceBranchSynced } from '../../constants/repos.js'
import { createBareRepo, pushCommit } from '../../test-support/git-fixtures.js'

const syncedRepos = REPOS.filter(isWorkspaceBranchSynced)
const exemptRepos = REPOS.filter((repo) => !isWorkspaceBranchSynced(repo))

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')

let workspace
let fixturesDir

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-reset-'))
  fixturesDir = mkdtempSync(join(tmpdir(), 'tim-reset-fixtures-'))
  writeFileSync(join(workspace, 'Makefile'), 'all:\n')
  mkdirSync(join(workspace, 'repos'))
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
  rmSync(fixturesDir, { recursive: true, force: true })
})

describe('tim workspace reset CLI', () => {
  test('refuses to run without --yes in --json mode and exits USER_ABORT (4)', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      [cliPath, 'workspace', 'reset', '--workspace', workspace, '--json'],
      { reject: false }
    )
    expect(exitCode).toBe(4)
    const payload = JSON.parse(stdout.trim())
    expect(payload.ok).toBe(false)
    expect(payload.errors[0].code).toBe('USER_ABORT')
  })

  test('with --yes on an empty workspace, reports every synced repo as skipped', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      [
        cliPath,
        'workspace',
        'reset',
        '--workspace',
        workspace,
        '--yes',
        '--json'
      ],
      { reject: false }
    )
    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload.ok).toBe(true)
    expect(payload.result).toHaveLength(syncedRepos.length)
    for (const entry of payload.result) {
      expect(entry.label).toContain('(not cloned, skipping)')
    }
  })

  test('leaves a workspace-branch-sync-exempt repo out unless --include names it', async () => {
    const exempt = exemptRepos[0]

    const withoutInclude = await execa(
      'node',
      [
        cliPath,
        'workspace',
        'reset',
        '--workspace',
        workspace,
        '--yes',
        '--json'
      ],
      { reject: false }
    )
    const withoutPayload = JSON.parse(withoutInclude.stdout.trim())
    expect(withoutPayload.skipped).toEqual([exempt])
    expect(withoutPayload.result.some((r) => r.repo === exempt)).toBe(false)

    const withInclude = await execa(
      'node',
      [
        cliPath,
        'workspace',
        'reset',
        '--workspace',
        workspace,
        '--yes',
        '--include',
        exempt,
        '--json'
      ],
      { reject: false }
    )
    const withPayload = JSON.parse(withInclude.stdout.trim())
    expect(withPayload.skipped).toEqual([])
    expect(withPayload.result.some((r) => r.repo === exempt)).toBe(true)
  })

  test('--help describes --include in plain English', async () => {
    const { stdout } = await execa(
      'node',
      [cliPath, 'workspace', 'reset', '--help'],
      { reject: false }
    )
    expect(stdout).toContain('--include <repo>')
    expect(stdout).toContain('plants prototype')
  })

  test('prints a plain skip line in text mode', async () => {
    const exempt = exemptRepos[0]

    const { stdout } = await execa(
      'node',
      [cliPath, 'workspace', 'reset', '--workspace', workspace, '--yes'],
      { reject: false }
    )

    expect(stdout).toContain(
      `Skipped ${exempt}: designers' work lives there. Add --include ${exempt} to include it.`
    )
  })

  test('hard-resets a gh-pages-excluded clone to origin/main without fetching gh-pages', async () => {
    const repo = REPOS[0]
    const { workPath } = await createBareRepo(fixturesDir, repo)
    await execa(
      'node',
      [cliPath, 'workspace', 'setup', '--workspace', workspace, '--json'],
      {
        reject: false,
        env: { TIM_GITHUB_BASE_URL: `file://${fixturesDir}` }
      }
    )
    const dir = join(workspace, 'repos', repo)
    writeFileSync(join(dir, 'README.md'), 'local edit to discard\n')
    const newMainSha = await pushCommit(workPath, 'main', 'after-clone.txt')
    await pushCommit(workPath, 'gh-pages', 'new-report.html')

    const { stdout, exitCode } = await execa(
      'node',
      [
        cliPath,
        'workspace',
        'reset',
        '--workspace',
        workspace,
        '--yes',
        '--json'
      ],
      { reject: false }
    )

    expect(exitCode).toBe(0)
    const entry = JSON.parse(stdout.trim()).result.find(
      (item) => item.repo === repo
    )
    expect(entry.ok).toBe(true)
    const head = await execa('git', ['-C', dir, 'rev-parse', 'HEAD'])
    expect(head.stdout.trim()).toBe(newMainSha)
    const status = await execa('git', ['-C', dir, 'status', '--porcelain'])
    expect(status.stdout.trim()).toBe('')
    const branches = await execa('git', ['-C', dir, 'branch', '-r'])
    expect(branches.stdout).not.toContain('gh-pages')
  }, 60_000)
})
