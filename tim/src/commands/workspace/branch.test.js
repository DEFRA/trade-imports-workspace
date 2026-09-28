import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { REPOS, isWorkspaceBranchSynced } from '../../constants/repos.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')

const IDENTITY = [
  '-c',
  'user.name=tim-test',
  '-c',
  'user.email=tim-test@example.invalid'
]

const git = (cwd, ...args) => execa('git', [...IDENTITY, ...args], { cwd })

const commit = async (workPath, fileName, message) => {
  writeFileSync(join(workPath, fileName), `${message}\n`)
  await git(workPath, 'add', fileName)
  await git(workPath, 'commit', '--quiet', '-m', message)
}

const fileNameFor = (branch) => `${branch.replace(/[^a-z0-9]/gi, '-')}.txt`

const createOrigin = async (baseDir, repoName, branches) => {
  const workPath = join(baseDir, `${repoName}-work`)
  const barePath = join(baseDir, `${repoName}.git`)

  await execa('git', ['init', '--quiet', '-b', 'main', workPath])
  await commit(workPath, 'README.md', 'initial commit')

  for (const branch of branches) {
    await git(workPath, 'switch', '--quiet', '-c', branch)
    await commit(workPath, fileNameFor(branch), `work on ${branch}`)
    await git(workPath, 'switch', '--quiet', 'main')
  }

  await execa('git', ['clone', '--quiet', '--bare', workPath, barePath])
  return barePath
}

const cloneRepo = async (barePath, dir) =>
  execa('git', ['clone', '--quiet', `file://${barePath}`, dir])

const runCli = (workspace, args) =>
  execa(
    'node',
    [cliPath, 'workspace', 'branch', ...args, '--workspace', workspace],
    {
      reject: false
    }
  )

const currentBranch = async (dir) => {
  const { stdout } = await git(dir, 'branch', '--show-current')
  return stdout.trim()
}

const repoDir = (workspace, index) => join(workspace, 'repos', REPOS[index])

// seedWorkspace clones only the first three repos; any later repo the
// workspace branch sync covers is reported as not cloned.
const UNCLONED_SYNCED_REPO = REPOS.slice(3).find((repo) =>
  isWorkspaceBranchSynced(repo)
)

let workspace
let fixtures

const seedWorkspace = async () => {
  const frontend = await createOrigin(fixtures, 'frontend', [
    'feat/EUDPA-1-alpha',
    'feat/EUDPA-2-beta',
    'feat/EUDPA-2-gamma'
  ])
  const admin = await createOrigin(fixtures, 'admin', [
    'feat/EUDPA-1-alpha',
    'side/track'
  ])
  const tests = await createOrigin(fixtures, 'tests', ['side/track'])

  await cloneRepo(frontend, repoDir(workspace, 0))
  await cloneRepo(admin, repoDir(workspace, 1))
  await cloneRepo(tests, repoDir(workspace, 2))

  await git(repoDir(workspace, 2), 'switch', '--quiet', 'side/track')
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-branch-'))
  fixtures = mkdtempSync(join(tmpdir(), 'tim-branch-fixtures-'))
  writeFileSync(join(workspace, 'Makefile'), 'all:\n')
  mkdirSync(join(workspace, 'repos'))
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
  rmSync(fixtures, { recursive: true, force: true })
})

const byRepo = (payload) =>
  Object.fromEntries(payload.result.repos.map((row) => [row.repo, row]))

describe('workspace branch', () => {
  test('reports the current branch of every cloned repo when given no argument', async () => {
    await seedWorkspace()

    const { stdout, exitCode } = await runCli(workspace, ['--json'])

    expect(exitCode).toBe(0)
    const rows = byRepo(JSON.parse(stdout.trim()))
    expect(rows[REPOS[0]].branch).toBe('main')
    expect(rows[REPOS[2]].branch).toBe('side/track')
    expect(rows[REPOS[3]].cloned).toBe(false)
  }, 60_000)

  test('checks out the branch where it exists and moves the rest to their default branch', async () => {
    await seedWorkspace()

    const { exitCode } = await runCli(workspace, ['feat/EUDPA-1-alpha'])

    expect(exitCode).toBe(0)
    expect(await currentBranch(repoDir(workspace, 0))).toBe(
      'feat/EUDPA-1-alpha'
    )
    expect(await currentBranch(repoDir(workspace, 1))).toBe(
      'feat/EUDPA-1-alpha'
    )
    expect(await currentBranch(repoDir(workspace, 2))).toBe('main')
  }, 60_000)

  test('tracks the remote branch rather than branching from the current head', async () => {
    await seedWorkspace()

    await runCli(workspace, ['feat/EUDPA-1-alpha'])

    const { stdout } = await git(
      repoDir(workspace, 0),
      'rev-parse',
      '--abbrev-ref',
      'feat/EUDPA-1-alpha@{upstream}'
    )
    expect(stdout.trim()).toBe('origin/feat/EUDPA-1-alpha')
  }, 60_000)

  test('resolves a ticket reference that matches exactly one branch', async () => {
    await seedWorkspace()

    const { stdout, exitCode } = await runCli(workspace, ['EUDPA-1', '--json'])

    expect(exitCode).toBe(0)
    expect(JSON.parse(stdout.trim()).result.branch).toBe('feat/EUDPA-1-alpha')
    expect(await currentBranch(repoDir(workspace, 0))).toBe(
      'feat/EUDPA-1-alpha'
    )
  }, 60_000)

  test('lists the candidates and changes nothing when a ticket matches several branches', async () => {
    await seedWorkspace()

    const { stdout, exitCode } = await runCli(workspace, ['EUDPA-2', '--json'])

    expect(exitCode).toBe(2)
    const payload = JSON.parse(stdout.trim())
    expect(payload.result.candidates.map(({ branch }) => branch)).toEqual([
      'feat/EUDPA-2-beta',
      'feat/EUDPA-2-gamma'
    ])
    expect(await currentBranch(repoDir(workspace, 0))).toBe('main')
  }, 60_000)

  test('reports not found for a ticket with no matching branch', async () => {
    await seedWorkspace()

    const { stdout, exitCode } = await runCli(workspace, [
      'EUDPA-404',
      '--json'
    ])

    expect(exitCode).toBe(1)
    expect(JSON.parse(stdout.trim()).errors[0]).toEqual({
      code: 'NOT_FOUND',
      message: "Can't find a branch for EUDPA-404 in any repo."
    })
  }, 60_000)

  test('stashes uncommitted work before switching and reports where it went', async () => {
    await seedWorkspace()
    writeFileSync(join(repoDir(workspace, 0), 'scratch.txt'), 'in progress\n')

    const { stdout, exitCode } = await runCli(workspace, [
      'feat/EUDPA-1-alpha',
      '--json'
    ])

    expect(exitCode).toBe(0)
    expect(byRepo(JSON.parse(stdout.trim()))[REPOS[0]].stashed).toBe(true)
    const { stdout: stashList } = await git(
      repoDir(workspace, 0),
      'stash',
      'list'
    )
    expect(stashList).toContain('tim: switching to feat/EUDPA-1-alpha')
  }, 60_000)

  test('leaves a repo alone when another worktree holds the branch', async () => {
    await seedWorkspace()
    const parked = join(fixtures, 'parked-worktree')
    await git(
      repoDir(workspace, 0),
      'worktree',
      'add',
      '--quiet',
      '-b',
      'feat/EUDPA-1-alpha',
      parked,
      'origin/feat/EUDPA-1-alpha'
    )

    const { stdout, exitCode } = await runCli(workspace, [
      'feat/EUDPA-1-alpha',
      '--json'
    ])

    expect(exitCode).toBe(0)
    expect(byRepo(JSON.parse(stdout.trim()))[REPOS[0]]).toMatchObject({
      action: 'in-worktree',
      worktreePath: expect.stringContaining('parked-worktree')
    })
    expect(await currentBranch(repoDir(workspace, 0))).toBe('main')
  }, 60_000)

  test('changes nothing in dry-run mode', async () => {
    await seedWorkspace()

    const { stdout, exitCode } = await runCli(workspace, [
      'feat/EUDPA-1-alpha',
      '--dry-run',
      '--json'
    ])

    expect(exitCode).toBe(0)
    expect(byRepo(JSON.parse(stdout.trim()))[REPOS[0]].action).toBe('switched')
    expect(await currentBranch(repoDir(workspace, 0))).toBe('main')
  }, 60_000)

  test('reports where a planned branch would need creating in dry-run mode, and changes nothing', async () => {
    await seedWorkspace()

    const { stdout, exitCode } = await runCli(workspace, [
      'feat/NO_JIRA-planned',
      '--dry-run',
      '--json'
    ])

    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload.result.planned).toBe(true)
    expect(byRepo(payload)[REPOS[0]]).toMatchObject({
      action: 'would-create',
      target: 'feat/NO_JIRA-planned',
      base: 'main'
    })
    expect(byRepo(payload)[UNCLONED_SYNCED_REPO].action).toBe('skipped')
    expect(await currentBranch(repoDir(workspace, 0))).toBe('main')
  }, 60_000)

  test('still reports not found for an unknown branch name without dry-run', async () => {
    await seedWorkspace()

    const { exitCode } = await runCli(workspace, ['feat/NO_JIRA-planned'])

    expect(exitCode).toBe(1)
  }, 60_000)

  test('reports repos that are not cloned as skipped', async () => {
    await seedWorkspace()

    const { stdout } = await runCli(workspace, ['feat/EUDPA-1-alpha', '--json'])

    expect(
      byRepo(JSON.parse(stdout.trim()))[UNCLONED_SYNCED_REPO]
    ).toMatchObject({
      action: 'skipped',
      ok: true
    })
  }, 60_000)

  test('excludes a workspace-branch-sync-exempt repo from the report, and lists it as skipped', async () => {
    await seedWorkspace()
    const exempt = REPOS.find((repo) => !isWorkspaceBranchSynced(repo))

    const { stdout, exitCode } = await runCli(workspace, ['--json'])

    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(byRepo(payload)[exempt]).toBeUndefined()
    expect(payload.result.skipped).toEqual([exempt])
  }, 60_000)

  test('reports a workspace-branch-sync-exempt repo when --include names it', async () => {
    await seedWorkspace()
    const exempt = REPOS.find((repo) => !isWorkspaceBranchSynced(repo))

    const { stdout, exitCode } = await runCli(workspace, [
      '--include',
      exempt,
      '--json'
    ])

    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(byRepo(payload)[exempt]).toMatchObject({ cloned: false })
    expect(payload.result.skipped).toEqual([])
  }, 60_000)

  test('exits with a usage error for an unresolvable workspace', async () => {
    const { stdout, exitCode } = await runCli(join(workspace, 'nope'), [
      '--json'
    ])

    expect(exitCode).toBe(2)
    expect(JSON.parse(stdout.trim()).errors[0].code).toBe('USAGE')
  }, 60_000)
})
