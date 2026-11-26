import { describe, test, expect, afterEach } from 'vitest'
import { execa } from 'execa'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  configureIdentity,
  createBareRepo,
  createFatClone,
  installRefusingPreCommitHook,
  pushCommit
} from '../test-support/git-fixtures.js'
import { runBuildBranch } from './branch.js'
import { WORKSPACE_FOLDER } from './envelope-repos.js'

const WORKAREA = 'shared/programme'

let root
let workspaceRoot

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const git = async (dir, ...args) =>
  (await execa('git', ['-C', dir, ...args], { reject: false })).stdout.trim()

const cloneOf = async (origins, name, path) => {
  const { barePath, workPath, shas } = await createBareRepo(origins, name, {
    withGhPages: false
  })
  await createFatClone(barePath, path)
  await configureIdentity(path)
  return { shas, workPath, path }
}

const clonesOf = async (origins, names) =>
  Object.fromEntries(
    await Promise.all(
      names.map(async (name) => [
        name,
        await cloneOf(origins, name, join(workspaceRoot, 'repos', name))
      ])
    )
  )

const backlogRepos = (names, workspaceRepo) => ({
  ...Object.fromEntries(names.map((name) => [name, { path: `repos/${name}` }])),
  ...(workspaceRepo === 'listed' ? { workspace: { path: '.' } } : {})
})

const workspaceBuilding = async (
  names,
  { workspaceRepo = null, envelope = {} } = {}
) => {
  root = mkdtempSync(join(tmpdir(), 'tim-build-branch-'))
  const origins = join(root, 'origins')
  mkdirSync(origins)
  workspaceRoot = workspaceRepo ? join(root, 'ws') : root
  const workspace = workspaceRepo
    ? await cloneOf(origins, WORKSPACE_FOLDER, workspaceRoot)
    : null
  const clones = await clonesOf(origins, names)
  const workarea = join(workspaceRoot, 'workareas', 'shared', 'programme')
  mkdirSync(workarea, { recursive: true })
  writeFileSync(
    join(workarea, 'backlog.json'),
    JSON.stringify({ ...envelope, repos: backlogRepos(names, workspaceRepo) })
  )
  return workspace ? { ...clones, workspace } : clones
}

const branchTo = (branch, options = {}) =>
  runBuildBranch({ workspaceRoot, workarea: WORKAREA, branch, ...options })

const openTo = (branch) => branchTo(branch, { open: true })

const errorFrom = async (promise) => {
  try {
    await promise
    return null
  } catch (error) {
    return { code: error.code, message: error.message }
  }
}

const commitsBeyondMain = (dir) =>
  git(dir, 'rev-list', '--count', 'origin/main..HEAD')

const reposByName = (outcome) =>
  Object.fromEntries(outcome.repos.map((repo) => [repo.key, repo]))

describe('runBuildBranch', () => {
  test("cuts a new branch from the repo's default branch", async () => {
    const { frontend } = await workspaceBuilding(['frontend'])

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
    const { frontend } = await workspaceBuilding(['frontend'])

    await branchTo('feat/EUDPA-1-origin')

    expect(
      await git(frontend.path, 'config', 'branch.feat/EUDPA-1-origin.merge')
    ).toBe('')
  })

  test('puts the repo on the branch it cut', async () => {
    const { frontend } = await workspaceBuilding(['frontend'])

    await branchTo('feat/EUDPA-1-origin')

    expect(await git(frontend.path, 'branch', '--show-current')).toBe(
      'feat/EUDPA-1-origin'
    )
  })

  test('changes nothing on a second run', async () => {
    const { frontend } = await workspaceBuilding(['frontend'])
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
    const { frontend } = await workspaceBuilding(['frontend'])
    await git(frontend.path, 'branch', '--no-track', 'spike/local', 'main')

    const outcome = await branchTo('spike/local')

    expect(outcome.repos).toEqual([
      expect.objectContaining({ created: false, switched: true, ok: true })
    ])
  })

  test('cuts a branch only the remote has from the remote copy, not from main', async () => {
    const { frontend } = await workspaceBuilding(['frontend'])

    const outcome = await branchTo('feature/example')

    expect(outcome.repos).toEqual([
      expect.objectContaining({
        head: frontend.shas.feature,
        createdFrom: 'origin/feature/example'
      })
    ])
  })

  test('puts every repo in the backlog on the branch', async () => {
    await workspaceBuilding(['frontend', 'backend'])

    const outcome = await branchTo('feat/EUDPA-2')

    expect(outcome.repos.map(({ repo, branch }) => [repo, branch])).toEqual([
      ['frontend', 'feat/EUDPA-2'],
      ['backend', 'feat/EUDPA-2']
    ])
  })

  test('refuses uncommitted work and names the files', async () => {
    const { backend } = await workspaceBuilding(['frontend', 'backend'])
    writeFileSync(join(backend.path, 'notes.txt'), 'work in progress\n')

    const error = await errorFrom(branchTo('feat/EUDPA-3'))

    expect(error).toEqual({
      code: 'DIRTY_TREE',
      message:
        'Nothing changed.\nbackend has uncommitted work: notes.txt. Commit or stash it first.'
    })
  })

  test('leaves every repo where it was when one is refused', async () => {
    const { frontend, backend } = await workspaceBuilding([
      'frontend',
      'backend'
    ])
    writeFileSync(join(backend.path, 'notes.txt'), 'work in progress\n')

    await errorFrom(branchTo('feat/EUDPA-3'))

    expect(await git(frontend.path, 'branch', '--show-current')).toBe('main')
  })

  test('accepts uncommitted work in a repo already on the branch', async () => {
    const { frontend } = await workspaceBuilding(['frontend'])
    await branchTo('feat/EUDPA-4')
    writeFileSync(join(frontend.path, 'notes.txt'), 'work in progress\n')

    const outcome = await branchTo('feat/EUDPA-4')

    expect(outcome.repos).toEqual([
      expect.objectContaining({ ok: true, switched: false, uncommitted: 1 })
    ])
  })

  test('carries the workspace repo’s own uncommitted files onto the branch', async () => {
    await workspaceBuilding([], { workspaceRepo: 'listed' })

    const outcome = await branchTo('chore/EUDPA-6-stack')

    expect({
      repos: outcome.repos.map(({ repo, branch, ok }) => ({
        repo,
        branch,
        ok
      })),
      stillThere: await git(workspaceRoot, 'status', '--short')
    }).toEqual({
      repos: [
        {
          repo: WORKSPACE_FOLDER,
          branch: 'chore/EUDPA-6-stack',
          ok: true
        }
      ],
      stillThere: '?? workareas/'
    })
  })

  test('refuses a repo that is not cloned', async () => {
    await workspaceBuilding(['frontend'])
    rmSync(join(workspaceRoot, 'repos', 'frontend'), {
      recursive: true,
      force: true
    })

    const error = await errorFrom(branchTo('feat/EUDPA-5'))

    expect(error.message).toContain('frontend is not cloned at')
  })

  test('reports branch, created, ok and head for each envelope repo, with no opening or origin fields and no workspace repo, without --open', async () => {
    const { frontend } = await workspaceBuilding(['frontend'], {
      workspaceRepo: 'unlisted'
    })

    const outcome = await branchTo('feat/EUDPA-8')

    const [reported] = outcome.repos
    expect({
      repos: outcome.repos.map(({ repo }) => repo),
      branch: reported.branch,
      created: reported.created,
      ok: reported.ok,
      head: reported.head,
      hasOpeningOrOriginField: [
        'openingCommit',
        'onOrigin',
        'pushNeeded',
        'originError'
      ].some((field) => field in reported),
      hasWorkspaceKey: outcome.repos.some(({ key }) => key === 'workspace')
    }).toEqual({
      repos: ['frontend'],
      branch: 'feat/EUDPA-8',
      created: true,
      ok: true,
      head: await git(frontend.path, 'rev-parse', 'HEAD'),
      hasOpeningOrOriginField: false,
      hasWorkspaceKey: false
    })
  })

  test('refuses a run with no branch and no open mode', async () => {
    const { frontend } = await workspaceBuilding(['frontend'], {
      envelope: { branch: 'feat/EUDPA-8' }
    })

    const error = await errorFrom(branchTo(undefined))

    expect({
      code: error.code,
      branch: await git(frontend.path, 'branch', '--show-current')
    }).toEqual({ code: 'USAGE', branch: 'main' })
  })
})

describe('runBuildBranch in open mode', () => {
  test('puts every repo and the workspace on the branch, each with one empty opening commit', async () => {
    const { frontend, backend, workspace } = await workspaceBuilding(
      ['frontend', 'backend'],
      { workspaceRepo: 'unlisted' }
    )

    const outcome = await openTo('feat/EUDPA-10-open')

    expect({
      repos: outcome.repos.map(({ key, branch }) => [key, branch]),
      commits: await Promise.all(
        [frontend, backend, workspace].map(({ path }) =>
          commitsBeyondMain(path)
        )
      ),
      changedFiles: await Promise.all(
        [frontend, backend, workspace].map(({ path }) =>
          git(path, 'show', '--name-only', '--format=', 'HEAD')
        )
      )
    }).toEqual({
      repos: [
        ['frontend', 'feat/EUDPA-10-open'],
        ['backend', 'feat/EUDPA-10-open'],
        ['workspace', 'feat/EUDPA-10-open']
      ],
      commits: ['1', '1', '1'],
      changedFiles: ['', '', '']
    })
  })

  test('scopes the opening commit by the envelope’s ticket', async () => {
    const { frontend } = await workspaceBuilding(['frontend'], {
      workspaceRepo: 'unlisted',
      envelope: { ticket: 'EUDPA-10' }
    })

    await openTo('feat/EUDPA-10-open')

    expect(await git(frontend.path, 'log', '-1', '--format=%s')).toBe(
      'chore(EUDPA-10): open feat/EUDPA-10-open'
    )
  })

  test('scopes the opening commit by the branch when the envelope has no ticket', async () => {
    const { frontend } = await workspaceBuilding(['frontend'], {
      workspaceRepo: 'unlisted'
    })

    await openTo('feat/EUDPA-10-open')

    expect(await git(frontend.path, 'log', '-1', '--format=%s')).toBe(
      'chore(feat/EUDPA-10-open): open feat/EUDPA-10-open'
    )
  })

  test('leaves every head where the first run left it on a second run', async () => {
    const { frontend, workspace } = await workspaceBuilding(['frontend'], {
      workspaceRepo: 'unlisted'
    })
    const first = await openTo('feat/EUDPA-10-open')

    const second = await openTo('feat/EUDPA-10-open')

    expect({
      heads: second.repos.map(({ head }) => head),
      openingCommits: second.repos.map(({ openingCommit }) => openingCommit),
      commits: [
        await commitsBeyondMain(frontend.path),
        await commitsBeyondMain(workspace.path)
      ]
    }).toEqual({
      heads: first.repos.map(({ head }) => head),
      openingCommits: [null, null],
      commits: ['1', '1']
    })
  })

  test('adds no opening commit to a branch origin already holds with commits of its own', async () => {
    const { frontend, workspace } = await workspaceBuilding(['frontend'], {
      workspaceRepo: 'unlisted'
    })

    const outcome = await openTo('feature/example')

    expect({
      heads: outcome.repos.map(({ head }) => head),
      openingCommits: outcome.repos.map(({ openingCommit }) => openingCommit)
    }).toEqual({
      heads: [frontend.shas.feature, workspace.shas.feature],
      openingCommits: [null, null]
    })
  })

  test('refuses a dirty repo, naming it, and leaves the workspace on its own branch', async () => {
    const { backend, workspace } = await workspaceBuilding(
      ['frontend', 'backend'],
      { workspaceRepo: 'unlisted' }
    )
    writeFileSync(join(backend.path, 'notes.txt'), 'work in progress\n')

    const error = await errorFrom(openTo('feat/EUDPA-10-open'))

    expect({
      error,
      workspaceBranch: await git(workspace.path, 'branch', '--show-current')
    }).toEqual({
      error: {
        code: 'DIRTY_TREE',
        message:
          'Nothing changed.\nbackend has uncommitted work: notes.txt. Commit or stash it first.'
      },
      workspaceBranch: 'main'
    })
  })

  test('carries the workspace’s untracked files and keeps its staged file staged and out of the opening commit', async () => {
    const { workspace } = await workspaceBuilding(['frontend'], {
      workspaceRepo: 'unlisted'
    })
    writeFileSync(join(workspace.path, 'staged.txt'), 'somebody else’s\n')
    await git(workspace.path, 'add', 'staged.txt')

    await openTo('feat/EUDPA-10-open')

    expect({
      status: await git(workspace.path, 'status', '--short'),
      committed: await git(
        workspace.path,
        'show',
        '--name-only',
        '--format=',
        'HEAD'
      )
    }).toEqual({
      status: 'A  staged.txt\n?? repos/\n?? workareas/',
      committed: ''
    })
  })

  test('uses the workspace repo the envelope maps instead of adding a second', async () => {
    await workspaceBuilding(['frontend'], { workspaceRepo: 'listed' })

    const outcome = await openTo('feat/EUDPA-10-open')

    expect(outcome.repos.map(({ key, repo }) => [key, repo])).toEqual([
      ['frontend', 'frontend'],
      ['workspace', WORKSPACE_FOLDER]
    ])
  })

  test('reports a branch cut only here as not on origin and needing a push', async () => {
    await workspaceBuilding(['frontend'], { workspaceRepo: 'unlisted' })

    const outcome = await openTo('feat/EUDPA-10-open')

    expect(
      outcome.repos.map(({ onOrigin, pushNeeded, originError }) => ({
        onOrigin,
        pushNeeded,
        originError
      }))
    ).toEqual([
      { onOrigin: false, pushNeeded: true, originError: null },
      { onOrigin: false, pushNeeded: true, originError: null }
    ])
  })

  test('reports a branch at origin’s head as on origin with no push needed', async () => {
    await workspaceBuilding(['frontend'], { workspaceRepo: 'unlisted' })

    const outcome = await openTo('feature/example')

    expect(
      outcome.repos.map(({ onOrigin, pushNeeded }) => ({
        onOrigin,
        pushNeeded
      }))
    ).toEqual([
      { onOrigin: true, pushNeeded: false },
      { onOrigin: true, pushNeeded: false }
    ])
  })

  test('reports a push needed when origin holds a different head for the branch', async () => {
    const { frontend } = await workspaceBuilding(['frontend'], {
      workspaceRepo: 'unlisted'
    })
    await openTo('feature/example')
    await pushCommit(frontend.workPath, 'feature/example', 'later.txt')

    const outcome = await openTo('feature/example')

    expect(reposByName(outcome).frontend).toEqual(
      expect.objectContaining({ onOrigin: true, pushNeeded: true })
    )
  })

  test('reports origin as unknown, with git’s reason, when it cannot be read', async () => {
    const { frontend } = await workspaceBuilding(['frontend'], {
      workspaceRepo: 'unlisted'
    })
    await git(frontend.path, 'remote', 'set-url', 'origin', join(root, 'gone'))

    const outcome = await openTo('feat/EUDPA-10-open')

    expect(reposByName(outcome).frontend).toEqual(
      expect.objectContaining({
        ok: true,
        onOrigin: null,
        pushNeeded: null,
        originError: expect.stringContaining('gone')
      })
    )
  })

  test('takes the branch from the envelope when none is given', async () => {
    await workspaceBuilding(['frontend'], {
      workspaceRepo: 'unlisted',
      envelope: { branch: 'feat/EUDPA-10-envelope' }
    })

    const outcome = await branchTo(undefined, { open: true })

    expect(outcome.branch).toBe('feat/EUDPA-10-envelope')
  })

  test('refuses before any repo changes when neither the call nor the envelope names a branch', async () => {
    const { frontend } = await workspaceBuilding(['frontend'], {
      workspaceRepo: 'unlisted'
    })

    const error = await errorFrom(branchTo(undefined, { open: true }))

    expect({
      code: error.code,
      branch: await git(frontend.path, 'branch', '--show-current')
    }).toEqual({ code: 'USAGE', branch: 'main' })
  })

  test('fails the repo whose hook refuses the opening commit and still reports the others', async () => {
    const { frontend } = await workspaceBuilding(['frontend'], {
      workspaceRepo: 'unlisted'
    })
    installRefusingPreCommitHook(frontend.path, 'no commits today')

    const outcome = await openTo('feat/EUDPA-10-open')

    expect(
      outcome.repos.map(({ key, ok, errorCode, error }) => ({
        key,
        ok,
        errorCode,
        error
      }))
    ).toEqual([
      {
        key: 'frontend',
        ok: false,
        errorCode: 'OPENING_COMMIT_FAILED',
        error: 'no commits today'
      },
      { key: 'workspace', ok: true, errorCode: undefined, error: null }
    ])
  })
})
