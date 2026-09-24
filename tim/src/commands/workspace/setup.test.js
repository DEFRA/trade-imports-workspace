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
import { REPOS, upstreamOf } from '../../constants/repos.js'
import {
  createBareRepo,
  createFatClone
} from '../../test-support/git-fixtures.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')

let workspace
let fixturesDir

// A real (if empty) repo, not a hand-rolled `.git` dir — so the upstream
// remote checks this suite exercises can run genuine `git config`/`git
// remote` commands against it, the same as against a real clone.
const fakeClone = async (repo) => {
  await execa('git', ['init', '--quiet', join(workspace, 'repos', repo)])
}

const fakeCloneAllExcept = async (realRepo) => {
  for (const repo of REPOS.filter((repo) => repo !== realRepo)) {
    await fakeClone(repo)
  }
}

const runSetup = (env = {}) =>
  execa(
    'node',
    [cliPath, 'workspace', 'setup', '--workspace', workspace, '--json'],
    { reject: false, env }
  )

// Reports git 2.25.1 (too old for negative refspecs) but otherwise
// proxies to the real git, so a scenario that shouldn't need a version
// check at all can still exercise its other git reads/writes for real.
const oldGitShim = async () => {
  const { stdout: realGit } = await execa('which', ['git'])
  const shimDir = join(workspace, 'shim-bin')
  mkdirSync(shimDir)
  const shim = join(shimDir, 'git')
  writeFileSync(
    shim,
    `#!/bin/sh\nif [ "$1" = "version" ]; then\n  echo "git version 2.25.1"\n  exit 0\nfi\nexec "${realGit.trim()}" "$@"\n`
  )
  chmodSync(shim, 0o755)
  return `${shimDir}:${process.env.PATH}`
}

const UPSTREAM_FETCH_REFSPEC = '+refs/heads/main:refs/remotes/upstream/main'

const upstreamRemoteConfig = async (dir) => {
  const read = (key) =>
    execa('git', ['-C', dir, 'config', '--get', key], { reject: false })
  const readAll = async (key) => {
    const result = await execa('git', ['-C', dir, 'config', '--get-all', key], {
      reject: false
    })
    return result.exitCode === 0 ? result.stdout.split('\n') : []
  }
  const url = await read('remote.upstream.url')
  return {
    url: url.exitCode === 0 ? url.stdout.trim() : null,
    fetch: await readAll('remote.upstream.fetch'),
    tagOpt: (await read('remote.upstream.tagOpt')).stdout.trim() || null,
    pushurl: (await read('remote.upstream.pushurl')).stdout.trim() || null
  }
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
    for (const repo of REPOS) await fakeClone(repo)

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
    await fakeCloneAllExcept(repo)

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
    await fakeCloneAllExcept(repo)

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
    await fakeCloneAllExcept(repo)

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

  test('reports a clear error when git is older than 2.29', async () => {
    await fakeCloneAllExcept(REPOS[0])

    const { stdout, exitCode } = await runSetup({ PATH: await oldGitShim() })

    expect(exitCode).toBe(1)
    const payload = JSON.parse(stdout.trim())
    expect(payload.ok).toBe(false)
    expect(payload.errors[0].code).toBe('MISSING_DEP')
    expect(payload.errors[0].message).toContain('2.29')
  }, 60_000)

  test('does not need git 2.29 when every repo is already cloned and healed', async () => {
    for (const repo of REPOS) await fakeClone(repo)

    const { stdout, exitCode } = await runSetup({ PATH: await oldGitShim() })

    expect(exitCode).toBe(0)
    expect(JSON.parse(stdout.trim()).ok).toBe(true)
  }, 60_000)

  describe('upstream remote (repos.json "upstream" field)', () => {
    const repoWithUpstream = REPOS.find((repo) => upstreamOf(repo))
    const repoWithoutUpstream = REPOS.find((repo) => !upstreamOf(repo))
    const upstreamTarget = upstreamOf(repoWithUpstream)

    test('adds the upstream remote on a fresh clone', async () => {
      await createBareRepo(fixturesDir, repoWithUpstream)
      await fakeCloneAllExcept(repoWithUpstream)

      const { stdout, exitCode } = await runSetup({
        TIM_GITHUB_BASE_URL: `file://${fixturesDir}`
      })

      expect(exitCode).toBe(0)
      const payload = JSON.parse(stdout.trim())
      expect(payload.ok).toBe(true)
      const entry = payload.result.find((r) => r.repo === repoWithUpstream)
      expect(entry.label).toContain('upstream remote added')

      const dir = join(workspace, 'repos', repoWithUpstream)
      const config = await upstreamRemoteConfig(dir)
      expect(config.url).toBe(`file://${fixturesDir}/${upstreamTarget}.git`)
      expect(config.fetch).toEqual([UPSTREAM_FETCH_REFSPEC])
      expect(config.tagOpt).toBe('--no-tags')
      expect(config.pushurl).toBe('DISABLED')
    }, 60_000)

    test('corrects an upstream remote that is misconfigured', async () => {
      const dir = join(workspace, 'repos', repoWithUpstream)
      await execa('git', ['init', '--quiet', dir])
      await execa('git', [
        '-C',
        dir,
        'remote',
        'add',
        'upstream',
        'https://example.invalid/wrong-repo.git'
      ])
      await execa('git', [
        '-C',
        dir,
        'config',
        '--replace-all',
        'remote.upstream.fetch',
        '+refs/heads/*:refs/remotes/upstream/*'
      ])
      await fakeCloneAllExcept(repoWithUpstream)

      const { stdout, exitCode } = await runSetup({
        TIM_GITHUB_BASE_URL: `file://${fixturesDir}`
      })

      expect(exitCode).toBe(0)
      const payload = JSON.parse(stdout.trim())
      expect(payload.ok).toBe(true)
      const entry = payload.result.find((r) => r.repo === repoWithUpstream)
      expect(entry.label).toContain('upstream remote corrected')

      const config = await upstreamRemoteConfig(dir)
      expect(config.url).toBe(`file://${fixturesDir}/${upstreamTarget}.git`)
      expect(config.fetch).toEqual([UPSTREAM_FETCH_REFSPEC])
      expect(config.tagOpt).toBe('--no-tags')
      expect(config.pushurl).toBe('DISABLED')
    }, 60_000)

    test('leaves an already-correct upstream remote untouched', async () => {
      const dir = join(workspace, 'repos', repoWithUpstream)
      const url = `file://${fixturesDir}/${upstreamTarget}.git`
      await execa('git', ['init', '--quiet', dir])
      await execa('git', ['-C', dir, 'remote', 'add', 'upstream', url])
      await execa('git', [
        '-C',
        dir,
        'config',
        '--replace-all',
        'remote.upstream.fetch',
        UPSTREAM_FETCH_REFSPEC
      ])
      await execa('git', [
        '-C',
        dir,
        'config',
        '--replace-all',
        'remote.upstream.tagOpt',
        '--no-tags'
      ])
      await execa('git', [
        '-C',
        dir,
        'config',
        '--replace-all',
        'remote.upstream.pushurl',
        'DISABLED'
      ])
      await fakeCloneAllExcept(repoWithUpstream)

      const { stdout, exitCode } = await runSetup({
        TIM_GITHUB_BASE_URL: `file://${fixturesDir}`
      })

      expect(exitCode).toBe(0)
      const payload = JSON.parse(stdout.trim())
      expect(payload.ok).toBe(true)
      const entry = payload.result.find((r) => r.repo === repoWithUpstream)
      expect(entry.label).not.toContain('upstream remote added')
      expect(entry.label).not.toContain('upstream remote corrected')

      const config = await upstreamRemoteConfig(dir)
      expect(config.url).toBe(url)
      expect(config.fetch).toEqual([UPSTREAM_FETCH_REFSPEC])
      expect(config.tagOpt).toBe('--no-tags')
      expect(config.pushurl).toBe('DISABLED')
    }, 60_000)

    test('adds no upstream remote for a repo the manifest declares none for', async () => {
      for (const repo of REPOS) await fakeClone(repo)

      const { stdout, exitCode } = await runSetup()

      expect(exitCode).toBe(0)
      expect(JSON.parse(stdout.trim()).ok).toBe(true)
      const dir = join(workspace, 'repos', repoWithoutUpstream)
      const config = await upstreamRemoteConfig(dir)
      expect(config.url).toBeNull()
    }, 60_000)
  })
})
