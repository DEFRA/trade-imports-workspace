import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execa } from 'execa'
import { afterEach, describe, expect, test } from 'vitest'
import { createDepsWorkspace } from '../../test-support/deps-workspace.js'
import { PhaseStopped } from '../phases/run-repos.js'
import { putReposOnUnattendedBranch } from './branch.js'

const FRONTEND = 'trade-imports-animals-frontend'
const BACKEND = 'trade-imports-animals-backend'
const BRANCH = 'chore/EUDPA-802-vitest-4.2'

const workspaces = []

afterEach(() => {
  workspaces
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true }))
})

const git = async (cwd, args) =>
  (
    await execa(
      'git',
      ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', ...args],
      { cwd }
    )
  ).stdout.trim()

const commitFile = async (cwd, name, text) => {
  writeFileSync(join(cwd, name), text)
  await git(cwd, ['add', name])
  await git(cwd, ['commit', '--quiet', '-m', `Add ${name}`])
}

const cloneOfOrigin = async (root, repo) => {
  const origin = join(root, 'origins', repo)
  mkdirSync(origin, { recursive: true })
  await git(origin, ['init', '--quiet', '-b', 'main'])
  await commitFile(origin, 'README.md', 'Origin\n')
  await git(root, ['clone', '--quiet', origin, join('repos', repo)])
  return join(root, 'repos', repo)
}

const stageWorkspace = async () => {
  const root = createDepsWorkspace({ cloned: [] })
  workspaces.push(root)
  const frontend = await cloneOfOrigin(root, FRONTEND)
  const backend = await cloneOfOrigin(root, BACKEND)
  return { root, frontend, backend }
}

const collector = () => {
  const lines = []
  return { lines, warn: async (line) => lines.push(line) }
}

const putOnBranch = (root, repos, warn) =>
  putReposOnUnattendedBranch({
    workspaceRoot: root,
    repos,
    branch: BRANCH,
    warn
  })

describe('#putReposOnUnattendedBranch', () => {
  test('Should make the branch from origin/main, not from the local branch checked out', async () => {
    const { root, frontend } = await stageWorkspace()
    await git(frontend, ['checkout', '--quiet', '-b', 'spike/local'])
    await commitFile(frontend, 'spike.txt', 'Spike\n')

    await putOnBranch(root, [FRONTEND], collector().warn)

    expect({
      branch: await git(frontend, ['branch', '--show-current']),
      head: await git(frontend, ['rev-parse', 'HEAD'])
    }).toEqual({
      branch: BRANCH,
      head: await git(frontend, ['rev-parse', 'origin/main'])
    })
  })

  test('Should switch to the branch when it is already there, keeping its commits', async () => {
    const { root, frontend } = await stageWorkspace()
    await git(frontend, ['checkout', '--quiet', '-b', BRANCH])
    await commitFile(frontend, 'upgrade.txt', 'Upgraded\n')
    const branchHead = await git(frontend, ['rev-parse', 'HEAD'])
    await git(frontend, ['checkout', '--quiet', 'main'])

    await putOnBranch(root, [FRONTEND], collector().warn)

    expect(await git(frontend, ['rev-parse', 'HEAD'])).toBe(branchHead)
  })

  test('Should say for each repo what it did', async () => {
    const { root } = await stageWorkspace()
    const { lines, warn } = collector()

    await putOnBranch(root, [FRONTEND, BACKEND], warn)

    expect(lines.filter((line) => line.startsWith('trade-imports-'))).toEqual([
      `${FRONTEND}: created ${BRANCH} from origin/main and switched to it`,
      `${BACKEND}: created ${BRANCH} from origin/main and switched to it`
    ])
  })

  test('Should stop before switching any repo when one has uncommitted changes', async () => {
    const { root, frontend, backend } = await stageWorkspace()
    writeFileSync(join(backend, 'notes.txt'), 'Work in progress\n')

    const switching = putOnBranch(root, [FRONTEND, BACKEND], collector().warn)

    await expect(switching).rejects.toThrow(
      new PhaseStopped(
        `Stopped before switching branches: these repos have uncommitted changes: ${BACKEND}`
      )
    )
    expect(await git(frontend, ['branch', '--show-current'])).toBe('main')
  })

  test('Should stop when a repo has no origin/main to start the branch from', async () => {
    const { root } = await stageWorkspace()
    const loose = join(root, 'repos', FRONTEND)
    await git(loose, ['remote', 'remove', 'origin'])

    const switching = putOnBranch(root, [FRONTEND], collector().warn)

    await expect(switching).rejects.toThrow(
      new PhaseStopped(
        `Can't put ${FRONTEND} on ${BRANCH}: Can't fetch origin in ${loose}.`
      )
    )
  })
})
