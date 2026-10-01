import { describe, test, expect, afterEach } from 'vitest'
import { execa } from 'execa'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  createBareRepo,
  createFatClone,
  pushCommit
} from '../test-support/git-fixtures.js'
import { branchIncrementRepos } from './increment-branch.js'

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const IDENTITY = [
  '-c',
  'user.name=tim-test',
  '-c',
  'user.email=t@example.invalid'
]

const git = async (dir, ...args) =>
  (
    await execa('git', [...IDENTITY, '-C', dir, ...args], { reject: false })
  ).stdout.trim()

const cloneOf = async (name) => {
  const origins = join(root, 'origins')
  mkdirSync(origins, { recursive: true })
  const fixture = await createBareRepo(origins, name, { withGhPages: false })
  const path = join(root, 'repos', name)
  await createFatClone(fixture.barePath, path)
  return { ...fixture, key: name, path }
}

const fresh = () => {
  root = mkdtempSync(join(tmpdir(), 'tim-increment-branch-'))
}

const branch = (repos, name, base = 'main') =>
  branchIncrementRepos({
    repos: repos.map(({ key, path }) => ({ key, path })),
    branch: name,
    base
  })

const commitIn = async (path, file) => {
  writeFileSync(join(path, file), `${file}\n`)
  await git(path, 'add', file)
  await git(path, 'commit', '--quiet', '-m', `add ${file}`)
}

describe('branchIncrementRepos', () => {
  test('cuts a new branch from origin/<base> with no upstream, in every repo', async () => {
    fresh()
    const frontend = await cloneOf('frontend')
    const backend = await cloneOf('backend')

    const outcome = await branch([backend, frontend], 'feat/EUDPA-9-origin')

    expect({
      ok: outcome.ok,
      repos: outcome.repos.map(({ repo, cut, from }) => ({ repo, cut, from })),
      onBranch: await git(frontend.path, 'branch', '--show-current'),
      upstream: await git(
        frontend.path,
        'config',
        'branch.feat/EUDPA-9-origin.merge'
      )
    }).toEqual({
      ok: true,
      repos: [
        { repo: 'backend', cut: true, from: 'origin/main' },
        { repo: 'frontend', cut: true, from: 'origin/main' }
      ],
      onBranch: 'feat/EUDPA-9-origin',
      upstream: ''
    })
  })

  test('tracks a branch only origin has', async () => {
    fresh()
    const frontend = await cloneOf('frontend')

    const outcome = await branch([frontend], 'feature/example')

    expect({
      repo: outcome.repos[0],
      head: await git(frontend.path, 'rev-parse', 'HEAD')
    }).toEqual({
      repo: expect.objectContaining({
        cut: false,
        from: 'origin/feature/example'
      }),
      head: frontend.shas.feature
    })
  })

  test('fast-forwards a local branch to what has been pushed since', async () => {
    fresh()
    const frontend = await cloneOf('frontend')
    await git(
      frontend.path,
      'checkout',
      '--quiet',
      '-b',
      'feature/example',
      '--track',
      'origin/feature/example'
    )
    await git(frontend.path, 'checkout', '--quiet', 'main')
    const pushed = await pushCommit(
      frontend.workPath,
      'feature/example',
      'later.txt'
    )

    const outcome = await branch([frontend], 'feature/example')

    expect({
      ok: outcome.ok,
      head: await git(frontend.path, 'rev-parse', 'HEAD')
    }).toEqual({ ok: true, head: pushed })
  })

  test('stops at a local branch that has diverged from origin, naming it', async () => {
    fresh()
    const frontend = await cloneOf('frontend')
    await git(
      frontend.path,
      'checkout',
      '--quiet',
      '-b',
      'feature/example',
      '--track',
      'origin/feature/example'
    )
    await commitIn(frontend.path, 'local.txt')
    await git(frontend.path, 'checkout', '--quiet', 'main')
    await pushCommit(frontend.workPath, 'feature/example', 'remote.txt')

    const outcome = await branch([frontend], 'feature/example')

    expect({ ok: outcome.ok, reason: outcome.reason }).toEqual({
      ok: false,
      reason: expect.stringMatching(
        /^frontend: feature\/example has diverged from origin\/feature\/example, so a human needs to reconcile it: /
      )
    })
  })

  test('changes nothing in any repo when one has uncommitted work', async () => {
    fresh()
    const backend = await cloneOf('backend')
    const frontend = await cloneOf('frontend')
    writeFileSync(join(frontend.path, 'scratch.txt'), 'x\n')

    const outcome = await branch([backend, frontend], 'feat/EUDPA-9-origin')

    expect({
      ok: outcome.ok,
      reason: outcome.reason,
      backendBranch: await git(backend.path, 'branch', '--show-current')
    }).toEqual({
      ok: false,
      reason:
        "Nothing changed. frontend has uncommitted work, probably from an earlier attempt: scratch.txt. Nothing was stashed, reset or cleaned: that work is not this step's.",
      backendBranch: 'main'
    })
  })

  test('removes an upstream an older run left pointing at the base branch', async () => {
    fresh()
    const frontend = await cloneOf('frontend')
    await git(
      frontend.path,
      'checkout',
      '--quiet',
      '-b',
      'feat/EUDPA-9-origin',
      '--track',
      'origin/main'
    )
    await git(frontend.path, 'checkout', '--quiet', 'main')

    const outcome = await branch([frontend], 'feat/EUDPA-9-origin')

    expect({
      removed: outcome.repos[0].removedUpstream,
      upstream: await git(
        frontend.path,
        'config',
        'branch.feat/EUDPA-9-origin.merge'
      )
    }).toEqual({ removed: 'origin/main', upstream: '' })
  })

  test('refuses a repo that is not cloned', async () => {
    fresh()
    const missing = join(root, 'repos', 'backend')

    const outcome = await branch([{ key: 'backend', path: missing }], 'feat/x')

    expect(outcome.reason).toBe(
      `Nothing changed. backend is not cloned at ${missing}.`
    )
  })
})
