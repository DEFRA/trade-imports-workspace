import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  chmodSync,
  rmSync
} from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { REPOS, upstreamFor } from '../../constants/repos.js'
import {
  createBareRepo,
  createFatClone
} from '../../test-support/git-fixtures.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')

let workspace
let fixturesDir

const fakeClone = (repo) => {
  const dir = join(workspace, 'repos', repo, '.git')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'HEAD'), 'ref: refs/heads/main\n')
}

const fakeCloneAllExcept = (realRepo) => {
  for (const repo of REPOS.filter((repo) => repo !== realRepo)) fakeClone(repo)
}

const runSetup = (env = {}) =>
  execa(
    'node',
    [cliPath, 'workspace', 'setup', '--workspace', workspace, '--json'],
    { reject: false, env }
  )

const oldGitShim = () => {
  const shimDir = join(workspace, 'shim-bin')
  mkdirSync(shimDir)
  const shim = join(shimDir, 'git')
  writeFileSync(
    shim,
    '#!/bin/sh\nif [ "$1" = "version" ]; then\n  echo "git version 2.25.1"\n  exit 0\nfi\nexit 1\n'
  )
  chmodSync(shim, 0o755)
  return `${shimDir}:${process.env.PATH}`
}

const fetchRefspecs = async (dir) => {
  const { stdout } = await execa('git', [
    '-C',
    dir,
    'config',
    '--get-all',
    'remote.origin.fetch'
  ])
  return stdout.split('\n')
}

const remoteBranches = async (dir) => {
  const { stdout } = await execa('git', ['-C', dir, 'branch', '-r'])
  return stdout
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-setup-'))
  fixturesDir = mkdtempSync(join(tmpdir(), 'tim-setup-fixtures-'))
  writeFileSync(join(workspace, 'Makefile'), 'all:\n')
  mkdirSync(join(workspace, 'repos'))
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
  rmSync(fixturesDir, { recursive: true, force: true })
})

describe('tim workspace setup CLI', () => {
  test('reports every repo as already-cloned when all are present', async () => {
    for (const repo of REPOS) fakeClone(repo)

    const { stdout, exitCode } = await runSetup()
    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload.ok).toBe(true)
    expect(payload.result.every((r) => r.ok)).toBe(true)
    expect(payload.result).toHaveLength(REPOS.length)
  }, 60_000)

  test('clones with a fetch refspec that excludes gh-pages', async () => {
    const repo = REPOS[0]
    const { shas } = await createBareRepo(fixturesDir, repo)
    fakeCloneAllExcept(repo)

    const { stdout, exitCode } = await runSetup({
      TIM_GITHUB_BASE_URL: `file://${fixturesDir}`
    })

    expect(exitCode).toBe(0)
    expect(JSON.parse(stdout.trim()).ok).toBe(true)
    const dir = join(workspace, 'repos', repo)
    expect(await fetchRefspecs(dir)).toEqual([
      '+refs/heads/*:refs/remotes/origin/*',
      '^refs/heads/gh-pages'
    ])
    const branches = await remoteBranches(dir)
    expect(branches).toContain('origin/feature/example')
    expect(branches).not.toContain('gh-pages')
    const tags = await execa('git', ['-C', dir, 'tag', '-l', 'v1.0.0'])
    expect(tags.stdout.trim()).toBe('v1.0.0')
    const ghPagesObject = await execa(
      'git',
      ['-C', dir, 'cat-file', '-e', shas.ghPages],
      { reject: false }
    )
    expect(ghPagesObject.exitCode).not.toBe(0)
    const checkout = await execa('git', [
      '-C',
      dir,
      'checkout',
      'feature/example'
    ])
    expect(checkout.exitCode).toBe(0)
  }, 60_000)

  test('clones a repo whose remote has no gh-pages branch', async () => {
    const repo = REPOS[0]
    await createBareRepo(fixturesDir, repo, { withGhPages: false })
    fakeCloneAllExcept(repo)

    const { stdout, exitCode } = await runSetup({
      TIM_GITHUB_BASE_URL: `file://${fixturesDir}`
    })

    expect(exitCode).toBe(0)
    expect(JSON.parse(stdout.trim()).ok).toBe(true)
    const dir = join(workspace, 'repos', repo)
    expect(await fetchRefspecs(dir)).toEqual([
      '+refs/heads/*:refs/remotes/origin/*',
      '^refs/heads/gh-pages'
    ])
    expect(await remoteBranches(dir)).toContain('origin/feature/example')
  }, 60_000)

  test('heals an already-cloned repo that still fetches gh-pages', async () => {
    const repo = REPOS[0]
    const { barePath, shas } = await createBareRepo(fixturesDir, repo)
    const dir = join(workspace, 'repos', repo)
    await createFatClone(barePath, dir)
    fakeCloneAllExcept(repo)

    const { stdout, exitCode } = await runSetup()

    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload.ok).toBe(true)
    const healed = payload.result.find((entry) => entry.repo === repo)
    expect(healed.label).toContain('gh-pages excluded')
    expect(await fetchRefspecs(dir)).toEqual([
      '+refs/heads/*:refs/remotes/origin/*',
      '^refs/heads/gh-pages'
    ])
    expect(await remoteBranches(dir)).not.toContain('gh-pages')
    const ghPagesObject = await execa(
      'git',
      ['-C', dir, 'cat-file', '-e', shas.ghPages],
      { reject: false }
    )
    expect(ghPagesObject.exitCode).not.toBe(0)
  }, 60_000)

  test('adds the fetch-only upstream remote for a repo that declares one, and is a no-op on a second run', async () => {
    const repo = REPOS.find((candidate) => upstreamFor(candidate))
    const upstream = upstreamFor(repo)
    const { barePath } = await createBareRepo(fixturesDir, repo, {
      withGhPages: false
    })
    const dir = join(workspace, 'repos', repo)
    await createFatClone(barePath, dir)
    fakeCloneAllExcept(repo)

    const first = await runSetup()
    expect(first.exitCode).toBe(0)
    const firstEntry = JSON.parse(first.stdout.trim()).result.find(
      (entry) => entry.repo === repo
    )
    expect(firstEntry.ok).toBe(true)
    expect(firstEntry.label).toContain('upstream remote added (fetch-only)')

    const remotes = await execa('git', ['-C', dir, 'remote'])
    expect(remotes.stdout.split('\n')).toContain(upstream.name)
    const fetchUrl = await execa('git', [
      '-C',
      dir,
      'remote',
      'get-url',
      upstream.name
    ])
    expect(fetchUrl.stdout.trim()).toBe(upstream.url)
    const pushUrl = await execa('git', [
      '-C',
      dir,
      'remote',
      'get-url',
      '--push',
      upstream.name
    ])
    expect(pushUrl.stdout.trim()).toBe('DISABLED')

    const second = await runSetup()
    expect(second.exitCode).toBe(0)
    const secondEntry = JSON.parse(second.stdout.trim()).result.find(
      (entry) => entry.repo === repo
    )
    expect(secondEntry.ok).toBe(true)
    expect(secondEntry.label).toContain('upstream already set up')
  }, 60_000)

  test('reports a clear error when git is older than 2.29', async () => {
    fakeCloneAllExcept(REPOS[0])

    const { stdout, exitCode } = await runSetup({ PATH: oldGitShim() })

    expect(exitCode).toBe(1)
    const payload = JSON.parse(stdout.trim())
    expect(payload.ok).toBe(false)
    expect(payload.errors[0].code).toBe('MISSING_DEP')
    expect(payload.errors[0].message).toContain('2.29')
  }, 60_000)

  test('does not need git 2.29 when every repo is already cloned and healed', async () => {
    for (const repo of REPOS) fakeClone(repo)

    const { stdout, exitCode } = await runSetup({ PATH: oldGitShim() })

    expect(exitCode).toBe(0)
    expect(JSON.parse(stdout.trim()).ok).toBe(true)
  }, 60_000)
})
