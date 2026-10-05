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
    repos: repos.map(({ key, path, workspace }) => ({ key, path, workspace })),
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

  test('names at most 20 uncommitted files when it refuses a repo, counting the rest', async () => {
    fresh()
    const frontend = await cloneOf('frontend')
    for (let index = 0; index < 60; index += 1) {
      writeFileSync(join(frontend.path, `scratch-${index}.txt`), 'x\n')
    }

    const outcome = await branch([frontend], 'feat/EUDPA-9-origin')

    expect(outcome.reason).toMatch(
      /^Nothing changed\. frontend has uncommitted work, probably from an earlier attempt: (scratch-\d+\.txt, ){19}scratch-\d+\.txt and 40 more\. Nothing was stashed/
    )
  })

  describe('a local branch the base has moved past', () => {
    const cutLocally = (path, name) =>
      git(path, 'branch', '--no-track', name, 'origin/main')

    const reused = (outcome) => {
      const [{ cut, from, caughtUpToBase }] = outcome.repos
      return { ok: outcome.ok, cut, from, caughtUpToBase }
    }

    test('fast-forwards a branch with no commits of its own to origin/<base>', async () => {
      fresh()
      const frontend = await cloneOf('frontend')
      await cutLocally(frontend.path, 'feat/EUDPA-9-origin')
      const moved = await pushCommit(frontend.workPath, 'main', 'later.txt')

      const outcome = await branch([frontend], 'feat/EUDPA-9-origin')

      expect({
        ...reused(outcome),
        head: await git(frontend.path, 'rev-parse', 'HEAD')
      }).toEqual({
        ok: true,
        cut: false,
        from: 'origin/main',
        caughtUpToBase: true,
        head: moved
      })
    })

    test('leaves a branch with commits of its own where it is', async () => {
      fresh()
      const frontend = await cloneOf('frontend')
      await git(
        frontend.path,
        'checkout',
        '--quiet',
        '-b',
        'feat/EUDPA-9-origin',
        '--no-track',
        'origin/main'
      )
      await commitIn(frontend.path, 'own.txt')
      const own = await git(frontend.path, 'rev-parse', 'HEAD')
      await git(frontend.path, 'checkout', '--quiet', 'main')
      await pushCommit(frontend.workPath, 'main', 'later.txt')

      const outcome = await branch([frontend], 'feat/EUDPA-9-origin')

      expect({
        ...reused(outcome),
        head: await git(frontend.path, 'rev-parse', 'HEAD')
      }).toEqual({
        ok: true,
        cut: false,
        from: null,
        caughtUpToBase: false,
        head: own
      })
    })

    test('leaves a branch already at origin/<base> unchanged', async () => {
      fresh()
      const frontend = await cloneOf('frontend')
      await cutLocally(frontend.path, 'feat/EUDPA-9-origin')

      const outcome = await branch([frontend], 'feat/EUDPA-9-origin')

      expect({
        ...reused(outcome),
        head: await git(frontend.path, 'rev-parse', 'HEAD')
      }).toEqual({
        ok: true,
        cut: false,
        from: null,
        caughtUpToBase: false,
        head: frontend.shas.main
      })
    })

    test('fast-forwards the workspace repo with its uncommitted files intact', async () => {
      fresh()
      const workspace = {
        ...(await cloneOf('trade-imports-workspace')),
        key: 'workspace',
        workspace: true
      }
      await cutLocally(workspace.path, 'chore/EUDPA-9-perf-mode')
      const moved = await pushCommit(workspace.workPath, 'main', 'later.md')
      writeFileSync(join(workspace.path, 'README.md'), '# edited\n')
      writeFileSync(join(workspace.path, 'notes.txt'), 'mine\n')

      const outcome = await branch([workspace], 'chore/EUDPA-9-perf-mode')

      expect({
        ...reused(outcome),
        carried: outcome.repos[0]?.carried,
        head: await git(workspace.path, 'rev-parse', 'HEAD'),
        stillEdited: await git(workspace.path, 'status', '--short')
      }).toEqual({
        ok: true,
        cut: false,
        from: 'origin/main',
        caughtUpToBase: true,
        carried: ['README.md', 'notes.txt'],
        head: moved,
        stillEdited: 'M README.md\n?? notes.txt'
      })
    })

    test('stops, naming each file, when the fast-forward would overwrite one the workspace carries', async () => {
      fresh()
      const workspace = {
        ...(await cloneOf('trade-imports-workspace')),
        key: 'workspace',
        workspace: true
      }
      await cutLocally(workspace.path, 'chore/EUDPA-9-perf-mode')
      await pushCommit(workspace.workPath, 'main', 'README.md')
      writeFileSync(join(workspace.path, 'README.md'), '# edited\n')

      const outcome = await branch([workspace], 'chore/EUDPA-9-perf-mode')

      expect({
        ok: outcome.ok,
        reason: outcome.reason,
        stillEdited: await git(workspace.path, 'status', '--short')
      }).toEqual({
        ok: false,
        reason:
          'workspace: switching to chore/EUDPA-9-perf-mode would overwrite uncommitted files in the workspace: README.md. Nothing was stashed, reset or cleaned. Commit or move those files by hand, then run again.',
        stillEdited: 'M README.md'
      })
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

  describe('the workspace repo itself', () => {
    const workspaceClone = async () => ({
      ...(await cloneOf('trade-imports-workspace')),
      key: 'workspace',
      workspace: true
    })

    test('carries its uncommitted files across the switch and lists them', async () => {
      fresh()
      const workspace = await workspaceClone()
      writeFileSync(join(workspace.path, 'README.md'), '# edited\n')
      mkdirSync(join(workspace.path, 'workareas', 'shared', 'programme'), {
        recursive: true
      })
      writeFileSync(
        join(
          workspace.path,
          'workareas',
          'shared',
          'programme',
          'backlog.json'
        ),
        '{}\n'
      )

      const outcome = await branch([workspace], 'chore/EUDPA-9-perf-mode')

      expect({
        ok: outcome.ok,
        carried: outcome.repos[0].carried,
        cut: outcome.repos[0].cut,
        onBranch: await git(workspace.path, 'branch', '--show-current'),
        stillEdited: await git(workspace.path, 'status', '--short')
      }).toEqual({
        ok: true,
        carried: ['README.md', 'workareas/shared/programme/backlog.json'],
        cut: true,
        onBranch: 'chore/EUDPA-9-perf-mode',
        stillEdited: 'M README.md\n?? workareas/'
      })
    })

    test('stops, naming each file, when the switch would overwrite one it carries', async () => {
      fresh()
      const workspace = await workspaceClone()
      await pushCommit(workspace.workPath, 'main', 'README.md')
      writeFileSync(join(workspace.path, 'README.md'), '# edited\n')

      const outcome = await branch([workspace], 'chore/EUDPA-9-perf-mode')

      expect({
        ok: outcome.ok,
        reason: outcome.reason,
        onBranch: await git(workspace.path, 'branch', '--show-current')
      }).toEqual({
        ok: false,
        reason:
          'workspace: switching to chore/EUDPA-9-perf-mode would overwrite uncommitted files in the workspace: README.md. Nothing was stashed, reset or cleaned. Commit or move those files by hand, then run again.',
        onBranch: 'main'
      })
    })

    test('names at most 20 files in the way of the switch, counting the rest', async () => {
      fresh()
      const workspace = await workspaceClone()
      for (let index = 0; index < 25; index += 1) {
        await pushCommit(workspace.workPath, 'main', `added-${index}.md`)
        writeFileSync(join(workspace.path, `added-${index}.md`), '# mine\n')
      }

      const outcome = await branch([workspace], 'chore/EUDPA-9-perf-mode')

      expect(outcome.reason).toMatch(
        /^workspace: switching to chore\/EUDPA-9-perf-mode would overwrite uncommitted files in the workspace: (added-\d+\.md, ){19}added-\d+\.md and 5 more\. Nothing was stashed/
      )
    })

    test('lists each file in an untracked folder, so a file the increment adds there later is not among them', async () => {
      fresh()
      const workspace = await workspaceClone()
      const folder = join(workspace.path, 'workareas', 'shared', 'programme')
      mkdirSync(folder, { recursive: true })
      writeFileSync(join(folder, 'backlog.json'), '{}\n')

      const outcome = await branch([workspace], 'chore/EUDPA-9-perf-mode')
      writeFileSync(join(folder, 'plan.md'), '# the increment’s\n')
      const newFile = 'workareas/shared/programme/plan.md'

      expect({
        carried: outcome.repos[0].carried,
        coversNewFile: outcome.repos[0].carried.some(
          (path) => newFile === path || newFile.startsWith(path)
        )
      }).toEqual({
        carried: ['workareas/shared/programme/backlog.json'],
        coversNewFile: false
      })
    })

    test('lists both paths of a rename and a deleted file', async () => {
      fresh()
      const workspace = await workspaceClone()
      await commitIn(workspace.path, 'old-name.md')
      await commitIn(workspace.path, 'gone.md')
      await git(workspace.path, 'mv', 'old-name.md', 'new-name.md')
      rmSync(join(workspace.path, 'gone.md'))

      const outcome = await branch([workspace], 'chore/EUDPA-9-perf-mode')

      expect([...outcome.repos[0].carried].sort()).toEqual([
        'gone.md',
        'new-name.md',
        'old-name.md'
      ])
    })

    test('lists nothing carried when the workspace is clean', async () => {
      fresh()
      const workspace = await workspaceClone()

      const outcome = await branch([workspace], 'chore/EUDPA-9-perf-mode')

      expect(outcome.repos[0].carried).toEqual([])
    })

    test('still refuses an ordinary repo with uncommitted work beside it', async () => {
      fresh()
      const workspace = await workspaceClone()
      const stub = await cloneOf('stub')
      writeFileSync(join(workspace.path, 'notes.txt'), 'mine\n')
      writeFileSync(join(stub.path, 'scratch.txt'), 'x\n')

      const outcome = await branch([stub, workspace], 'chore/EUDPA-9-perf-mode')

      expect(outcome.reason).toBe(
        "Nothing changed. stub has uncommitted work, probably from an earlier attempt: scratch.txt. Nothing was stashed, reset or cleaned: that work is not this step's."
      )
    })
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
