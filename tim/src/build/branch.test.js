import { describe, test, expect, afterEach } from 'vitest'
import { execa } from 'execa'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createBareRepo, createFatClone } from '../test-support/git-fixtures.js'
import { runBuildBranch } from './branch.js'

const WORKAREA = 'shared/programme'

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const git = async (dir, ...args) =>
  (await execa('git', ['-C', dir, ...args], { reject: false })).stdout.trim()

// A workspace whose backlog builds the named repos, each a clone of its own
// bare origin with main and feature/example.
const workspaceWith = async (...names) => {
  root = mkdtempSync(join(tmpdir(), 'tim-build-branch-'))
  const origins = join(root, 'origins')
  mkdirSync(origins)
  const repos = {}
  for (const name of names) {
    const { barePath, shas } = await createBareRepo(origins, name, {
      withGhPages: false
    })
    await createFatClone(barePath, join(root, 'repos', name))
    repos[name] = { shas, path: join(root, 'repos', name) }
  }
  const workarea = join(root, 'workareas', 'shared', 'programme')
  mkdirSync(workarea, { recursive: true })
  writeFileSync(
    join(workarea, 'backlog.json'),
    JSON.stringify({
      repos: Object.fromEntries(
        names.map((name) => [name, { path: `repos/${name}` }])
      )
    })
  )
  return repos
}

const branchTo = (branch) =>
  runBuildBranch({ workspaceRoot: root, workarea: WORKAREA, branch })

const errorFrom = async (promise) => {
  try {
    await promise
    return null
  } catch (error) {
    return { code: error.code, message: error.message }
  }
}

describe('runBuildBranch', () => {
  test("cuts a new branch from the repo's default branch", async () => {
    const { frontend } = await workspaceWith('frontend')

    const outcome = await branchTo('feat/EUDPA-1-origin')

    expect(outcome.repos).toEqual([
      expect.objectContaining({
        repo: 'frontend',
        branch: 'feat/EUDPA-1-origin',
        head: frontend.shas.main,
        created: true,
        createdFrom: 'origin/main',
        ok: true
      })
    ])
  })

  test('cuts the branch without an upstream, so a push never lands on main', async () => {
    const { frontend } = await workspaceWith('frontend')

    await branchTo('feat/EUDPA-1-origin')

    expect(
      await git(frontend.path, 'config', 'branch.feat/EUDPA-1-origin.merge')
    ).toBe('')
  })

  test('puts the repo on the branch it cut', async () => {
    const { frontend } = await workspaceWith('frontend')

    await branchTo('feat/EUDPA-1-origin')

    expect(await git(frontend.path, 'branch', '--show-current')).toBe(
      'feat/EUDPA-1-origin'
    )
  })

  test('changes nothing on a second run', async () => {
    const { frontend } = await workspaceWith('frontend')
    await branchTo('feat/EUDPA-1-origin')

    const outcome = await branchTo('feat/EUDPA-1-origin')

    expect(outcome.repos).toEqual([
      expect.objectContaining({
        head: frontend.shas.main,
        created: false,
        switched: false,
        ok: true
      })
    ])
  })

  test('checks out a branch that already exists locally', async () => {
    const { frontend } = await workspaceWith('frontend')
    await git(frontend.path, 'branch', '--no-track', 'spike/local', 'main')

    const outcome = await branchTo('spike/local')

    expect(outcome.repos).toEqual([
      expect.objectContaining({ created: false, switched: true, ok: true })
    ])
  })

  test('cuts a branch only the remote has from the remote copy, not from main', async () => {
    const { frontend } = await workspaceWith('frontend')

    const outcome = await branchTo('feature/example')

    expect(outcome.repos).toEqual([
      expect.objectContaining({
        head: frontend.shas.feature,
        createdFrom: 'origin/feature/example'
      })
    ])
  })

  test('puts every repo in the backlog on the branch', async () => {
    await workspaceWith('frontend', 'backend')

    const outcome = await branchTo('feat/EUDPA-2')

    expect(outcome.repos.map(({ repo, branch }) => [repo, branch])).toEqual([
      ['frontend', 'feat/EUDPA-2'],
      ['backend', 'feat/EUDPA-2']
    ])
  })

  test('refuses uncommitted work and names the files', async () => {
    const { backend } = await workspaceWith('frontend', 'backend')
    writeFileSync(join(backend.path, 'notes.txt'), 'work in progress\n')

    const error = await errorFrom(branchTo('feat/EUDPA-3'))

    expect(error).toEqual({
      code: 'DIRTY_TREE',
      message:
        'Nothing changed.\nbackend has uncommitted work: notes.txt. Commit or stash it first.'
    })
  })

  test('leaves every repo where it was when one is refused', async () => {
    const { frontend, backend } = await workspaceWith('frontend', 'backend')
    writeFileSync(join(backend.path, 'notes.txt'), 'work in progress\n')

    await errorFrom(branchTo('feat/EUDPA-3'))

    expect(await git(frontend.path, 'branch', '--show-current')).toBe('main')
  })

  test('accepts uncommitted work in a repo already on the branch', async () => {
    const { frontend } = await workspaceWith('frontend')
    await branchTo('feat/EUDPA-4')
    writeFileSync(join(frontend.path, 'notes.txt'), 'work in progress\n')

    const outcome = await branchTo('feat/EUDPA-4')

    expect(outcome.repos).toEqual([
      expect.objectContaining({ ok: true, switched: false, uncommitted: 1 })
    ])
  })

  test('refuses a repo that is not cloned', async () => {
    await workspaceWith('frontend')
    rmSync(join(root, 'repos', 'frontend'), { recursive: true, force: true })

    const error = await errorFrom(branchTo('feat/EUDPA-5'))

    expect(error.message).toContain('frontend is not cloned at')
  })
})
