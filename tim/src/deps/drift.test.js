import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execa } from 'execa'
import nock from 'nock'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  AXE_HOLD,
  SPRINGDOC_HOLD,
  createDepsWorkspace,
  fixtureDependencySetsHolding
} from '../test-support/deps-workspace.js'
import { depsCheckoutPath } from './checkout.js'
import { crossRepoSetsBehind, dependencyDrift, jumpBetween } from './drift.js'

const FRONTEND = 'trade-imports-animals-frontend'
const PUBLIC_REGISTRY = 'https://registry.npmjs.org'

const serveRegistryPackage = (name, versions) =>
  nock(PUBLIC_REGISTRY)
    .persist()
    .get((path) => decodeURIComponent(path) === `/${name}`)
    .reply(200, {
      name,
      'dist-tags': { latest: versions.at(-1) },
      versions: Object.fromEntries(
        versions.map((version) => [version, { name, version }])
      ),
      time: Object.fromEntries(
        versions.map((version) => [version, '2025-01-01T00:00:00.000Z'])
      )
    })

const git = (cwd, ...args) =>
  execa(
    'git',
    ['-c', 'user.name=tim', '-c', 'user.email=tim@example.test', ...args],
    { cwd }
  )

const commitPackageJson = async (folder, packageJson) => {
  await git(folder, 'init', '--quiet')
  writeFileSync(join(folder, 'package.json'), JSON.stringify(packageJson))
  await git(folder, 'add', 'package.json')
  await git(folder, 'commit', '--quiet', '-m', 'package.json')
}

const upstreamWithPackageJson = async (workspaceRoot, packageJson) => {
  const barePath = join(workspaceRoot, 'origins', `${FRONTEND}.git`)
  const seedPath = join(workspaceRoot, 'origins', 'seed')
  mkdirSync(barePath, { recursive: true })
  await git(barePath, 'init', '--quiet', '--bare', '--initial-branch=main')
  mkdirSync(seedPath)
  await commitPackageJson(seedPath, packageJson)
  await git(seedPath, 'branch', '-M', 'main')
  await git(seedPath, 'remote', 'add', 'origin', barePath)
  await git(seedPath, 'push', '--quiet', 'origin', 'main')
  const push = async (nextPackageJson) => {
    writeFileSync(
      join(seedPath, 'package.json'),
      JSON.stringify(nextPackageJson)
    )
    await git(seedPath, 'commit', '--quiet', '-am', 'package.json')
    await git(seedPath, 'push', '--quiet', 'origin', 'main')
  }
  return { barePath, push }
}

let root

beforeEach(() => {
  nock.disableNetConnect()
})

afterEach(() => {
  nock.cleanAll()
  nock.enableNetConnect()
  if (root) rmSync(root, { recursive: true, force: true })
  root = undefined
})

describe('#jumpBetween', () => {
  test.each([
    ['^1.2.3', '^2.0.0', 'major'],
    ['^1.2.3', '^1.3.0', 'minor'],
    ['~1.2.3', '~1.2.9', 'patch'],
    ['1.2.3', '1.2.4', 'patch']
  ])('Should call %s to %s a %s jump', (current, proposed, jump) => {
    expect(jumpBetween(current, proposed)).toBe(jump)
  })

  test('Should give no jump for a range that names no version', () => {
    expect(jumpBetween('github:owner/repo', '^1.0.0')).toBeNull()
  })
})

describe('#dependencyDrift', () => {
  test('Should list each outdated package with its jump, set and hold, and count the jumps', async () => {
    serveRegistryPackage('govuk-frontend', ['6.5.0', '6.6.0'])
    serveRegistryPackage('@axe-core/playwright', ['4.13.0', '4.14.0'])
    serveRegistryPackage('vitest', ['5.1.0', '6.0.0'])
    serveRegistryPackage('pino', ['10.4.0'])
    root = createDepsWorkspace({
      dependencySets: fixtureDependencySetsHolding([AXE_HOLD])
    })
    await commitPackageJson(depsCheckoutPath(root, FRONTEND), {
      dependencies: { 'govuk-frontend': '^6.5.0', pino: '^10.4.0' },
      devDependencies: { '@axe-core/playwright': '^4.13.0', vitest: '^5.1.0' }
    })

    const drift = await dependencyDrift({
      workspaceRoot: root,
      repos: [FRONTEND],
      ref: 'HEAD'
    })

    expect(drift.repos).toEqual([
      {
        repo: FRONTEND,
        read: true,
        packages: [
          {
            package: '@axe-core/playwright',
            current: '^4.13.0',
            proposed: '^4.14.0',
            jump: 'minor',
            set: null,
            held: true
          },
          {
            package: 'govuk-frontend',
            current: '^6.5.0',
            proposed: '^6.6.0',
            jump: 'minor',
            set: 'govuk-frontend',
            held: false
          },
          {
            package: 'vitest',
            current: '^5.1.0',
            proposed: '^6.0.0',
            jump: 'major',
            set: 'vitest',
            held: false
          }
        ],
        counts: { major: 1, minor: 2, patch: 0 }
      }
    ])
  })

  test('Should read only the npm repos beside a Maven hold, marking only the npm hold', async () => {
    serveRegistryPackage('@axe-core/playwright', ['4.13.0', '4.14.0'])
    root = createDepsWorkspace({
      dependencySets: fixtureDependencySetsHolding([AXE_HOLD, SPRINGDOC_HOLD]),
      cloned: [FRONTEND, 'trade-imports-animals-backend']
    })
    await commitPackageJson(depsCheckoutPath(root, FRONTEND), {
      devDependencies: { '@axe-core/playwright': '^4.13.0' }
    })

    const drift = await dependencyDrift({ workspaceRoot: root, ref: 'HEAD' })

    expect(
      drift.repos.map(({ repo, read, packages }) => ({
        repo,
        read,
        held: packages.map(({ package: name, held }) => ({ name, held }))
      }))
    ).toEqual([
      { repo: 'tim', read: false, held: [] },
      {
        repo: FRONTEND,
        read: true,
        held: [{ name: '@axe-core/playwright', held: true }]
      }
    ])
  })

  test('Should list the cross-repo set a repo is behind on, and leave out a repo-scoped set', async () => {
    serveRegistryPackage('govuk-frontend', ['6.5.0', '6.6.0'])
    serveRegistryPackage('vitest', ['5.1.0', '6.0.0'])
    root = createDepsWorkspace()
    await commitPackageJson(depsCheckoutPath(root, FRONTEND), {
      dependencies: { 'govuk-frontend': '^6.5.0', vitest: '^5.1.0' }
    })

    const drift = await dependencyDrift({
      workspaceRoot: root,
      repos: [FRONTEND],
      ref: 'HEAD'
    })

    expect(drift.setsBehind).toEqual([
      {
        set: 'govuk-frontend',
        behind: [
          {
            repo: FRONTEND,
            package: 'govuk-frontend',
            current: '^6.5.0',
            proposed: '^6.6.0',
            held: false
          }
        ]
      }
    ])
  })

  test('Should read package.json at the ref, not the working tree', async () => {
    serveRegistryPackage('pino', ['10.4.0', '11.0.0'])
    root = createDepsWorkspace()
    const folder = depsCheckoutPath(root, FRONTEND)
    await commitPackageJson(folder, { dependencies: { pino: '^11.0.0' } })
    writeFileSync(
      join(folder, 'package.json'),
      JSON.stringify({ dependencies: { pino: '^10.4.0' } })
    )

    const drift = await dependencyDrift({
      workspaceRoot: root,
      repos: [FRONTEND],
      ref: 'HEAD'
    })

    expect(drift.repos[0]).toMatchObject({ read: true, packages: [] })
  })

  test('Should read origin/main as last fetched without fetch, and as origin has it now with fetch', async () => {
    serveRegistryPackage('pino', ['10.4.0', '11.0.0'])
    root = createDepsWorkspace({ cloned: [] })
    const upstream = await upstreamWithPackageJson(root, {
      dependencies: { pino: '^10.4.0' }
    })
    await git(
      root,
      'clone',
      '--quiet',
      upstream.barePath,
      depsCheckoutPath(root, FRONTEND)
    )
    await upstream.push({ dependencies: { pino: '^11.0.0' } })
    const request = {
      workspaceRoot: root,
      repos: [FRONTEND],
      ref: 'origin/main'
    }

    const stale = await dependencyDrift(request)
    const fetched = await dependencyDrift({ ...request, fetch: true })

    expect(stale.repos[0].packages.map(({ package: name }) => name)).toEqual([
      'pino'
    ])
    expect(stale.repos[0]).not.toHaveProperty('fetched')
    expect(fetched.repos[0]).toMatchObject({
      read: true,
      fetched: true,
      packages: []
    })
  })

  test('Should still read the local ref, marked fetched false, when fetching origin fails', async () => {
    serveRegistryPackage('pino', ['10.4.0'])
    root = createDepsWorkspace()
    await commitPackageJson(depsCheckoutPath(root, FRONTEND), {
      dependencies: { pino: '^10.4.0' }
    })

    const drift = await dependencyDrift({
      workspaceRoot: root,
      repos: [FRONTEND],
      ref: 'HEAD',
      fetch: true
    })

    expect(drift.repos[0]).toMatchObject({
      read: true,
      fetched: false,
      packages: []
    })
  })

  test('Should mark a repo whose checkout has no package.json at the ref as not read', async () => {
    root = createDepsWorkspace()

    const drift = await dependencyDrift({
      workspaceRoot: root,
      repos: [FRONTEND],
      ref: 'origin/main'
    })

    expect(drift.repos).toEqual([
      {
        repo: FRONTEND,
        read: false,
        packages: [],
        counts: { major: 0, minor: 0, patch: 0 }
      }
    ])
  })

  test('Should refuse a repo that is not in scope for the dependency sets', async () => {
    root = createDepsWorkspace()

    await expect(
      dependencyDrift({
        workspaceRoot: root,
        repos: ['trade-imports-animals-backend'],
        ref: 'origin/main'
      })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: expect.stringMatching(
        /^trade-imports-animals-backend is not in scope/
      )
    })
  })
})

describe('#crossRepoSetsBehind', () => {
  test('Should leave out a set with no members', () => {
    const sets = [{ name: 'node', scope: 'cross-repo', members: [] }]
    const results = [
      {
        repo: FRONTEND,
        packages: [
          { package: 'node', set: 'node', current: '1', proposed: '2' }
        ]
      }
    ]

    expect(crossRepoSetsBehind(sets, results)).toEqual([])
  })
})
