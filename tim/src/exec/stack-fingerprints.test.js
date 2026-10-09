import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  renameSync
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import {
  DEV_OVERLAY_PATH,
  devServices,
  repoFingerprints,
  serviceFingerprints,
  refreshDecision,
  planRefresh,
  stackFilesFingerprint
} from './stack-fingerprints.js'

const here = dirname(fileURLToPath(import.meta.url))
const realWorkspaceRoot = resolve(here, '..', '..', '..')

let root

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-stack-fingerprints-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const writeFile = (path, body) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, body)
}

const git = (path, ...args) =>
  execa('git', [
    '-C',
    path,
    '-c',
    'user.name=tim',
    '-c',
    'user.email=tim@example.com',
    '-c',
    'commit.gpgsign=false',
    ...args
  ])

// A repo with a Dockerfile and package.json outside src/, and source under
// src/, all committed.
const committedRepo = async (folder = 'frontend') => {
  const path = join(root, 'repos', folder)
  writeFile(join(path, 'Dockerfile'), 'FROM node\nCOPY . .\n')
  writeFile(join(path, 'package.json'), '{"name":"frontend"}\n')
  writeFile(join(path, 'src', 'index.js'), 'export const one = 1\n')
  writeFile(join(path, '.gitignore'), 'node_modules\n')
  await git(path, 'init', '-q')
  await git(path, 'add', '.')
  await git(path, 'commit', '-q', '-m', 'first')
  return { path, mounted: ['src'] }
}

describe('devServices', () => {
  test("reads the workspace's dev overlay: each service, its repo folder and its bind-mounted src", () => {
    const services = devServices(realWorkspaceRoot)

    expect({
      everyRepoUnderRepos: services.every(
        ({ repo, path }) => path === join(realWorkspaceRoot, 'repos', repo)
      ),
      everyRepoNamedForItsService: services.every(
        ({ service, repo }) => service === repo
      ),
      everyServiceMountsSrc: services.every(({ mounted }) =>
        mounted.includes('src')
      ),
      stub: services.find(({ service }) => service === 'trade-imports-stub')
    }).toEqual({
      everyRepoUnderRepos: true,
      everyRepoNamedForItsService: true,
      everyServiceMountsSrc: true,
      stub: {
        service: 'trade-imports-stub',
        repo: 'trade-imports-stub',
        path: join(realWorkspaceRoot, 'repos', 'trade-imports-stub'),
        mounted: ['src'],
        refreshWith: []
      }
    })
  })

  test("reads that reference-data refreshes with the stub, whose MDM answers it caches", () => {
    const referenceData = devServices(realWorkspaceRoot).find(
      ({ service }) => service === 'trade-imports-reference-data'
    )

    expect(referenceData.refreshWith).toEqual(['trade-imports-stub'])
  })

  test('leaves out a service the overlay does not build, and a mount outside the repo', () => {
    writeFile(
      join(root, DEV_OVERLAY_PATH),
      [
        'services:',
        '  web:',
        '    build:',
        '      context: ../../repos/web',
        '    volumes:',
        '      - ../../repos/web/src:/home/node/src',
        '      - ../../shared:/shared',
        '  mongodb:',
        '    environment:',
        '      - A=1',
        '  api:',
        '    build: ../../repos/api',
        '    x-refresh-with:',
        '      - web',
        ''
      ].join('\n')
    )

    expect(devServices(root)).toEqual([
      {
        service: 'web',
        repo: 'web',
        path: join(root, 'repos', 'web'),
        mounted: ['src'],
        refreshWith: []
      },
      {
        service: 'api',
        repo: 'api',
        path: join(root, 'repos', 'api'),
        mounted: [],
        refreshWith: ['web']
      }
    ])
  })

  test('finds no services in a workspace with no dev overlay', () => {
    expect(devServices(root)).toEqual([])
  })
})

describe('repoFingerprints', () => {
  test('gives the same fingerprints for an unchanged working tree', async () => {
    const repo = await committedRepo()

    const first = await repoFingerprints(repo)
    const second = await repoFingerprints(repo)

    expect({ same: first, build: first.build }).toEqual({
      same: second,
      build: expect.stringMatching(/^[0-9a-f]{64}$/)
    })
  })

  const changeOf = async (change) => {
    const repo = await committedRepo()
    const before = await repoFingerprints(repo)
    await change(repo.path)
    const after = await repoFingerprints(repo)
    return {
      build: before.build === after.build ? 'same' : 'changed',
      source: before.source === after.source ? 'same' : 'changed'
    }
  }

  test('changes only the source fingerprint for an uncommitted edit under src/', async () => {
    expect(
      await changeOf((path) =>
        writeFileSync(join(path, 'src', 'index.js'), 'export const one = 2\n')
      )
    ).toEqual({ build: 'same', source: 'changed' })
  })

  test('changes only the source fingerprint for a new untracked file under src/', async () => {
    expect(
      await changeOf((path) =>
        writeFileSync(join(path, 'src', 'extra.js'), 'export {}\n')
      )
    ).toEqual({ build: 'same', source: 'changed' })
  })

  test('changes only the build fingerprint for an edit outside src/', async () => {
    expect(
      await changeOf((path) =>
        writeFileSync(join(path, 'package.json'), '{"name":"changed"}\n')
      )
    ).toEqual({ build: 'changed', source: 'same' })
  })

  test('changes the build fingerprint for a committed change outside src/', async () => {
    expect(
      await changeOf(async (path) => {
        writeFileSync(join(path, 'Dockerfile'), 'FROM node:24\n')
        await git(path, 'commit', '-q', '-am', 'bump')
      })
    ).toEqual({ build: 'changed', source: 'same' })
  })

  test('changes the build fingerprint when a file outside src/ is deleted', async () => {
    expect(await changeOf((path) => rmSync(join(path, 'Dockerfile')))).toEqual({
      build: 'changed',
      source: 'same'
    })
  })

  test('ignores files git ignores', async () => {
    expect(
      await changeOf((path) =>
        writeFile(join(path, 'node_modules', 'x', 'index.js'), 'x\n')
      )
    ).toEqual({ build: 'same', source: 'same' })
  })

  test('gives the same fingerprints once an edit is committed as it did while uncommitted', async () => {
    const repo = await committedRepo()
    writeFileSync(join(repo.path, 'src', 'index.js'), 'export const one = 3\n')
    const uncommitted = await repoFingerprints(repo)
    await git(repo.path, 'commit', '-q', '-am', 'three')

    expect(await repoFingerprints(repo)).toEqual(uncommitted)
  })

  test('knows nothing of a folder that is missing or not a git checkout', async () => {
    const plain = join(root, 'plain')
    mkdirSync(plain)

    expect([
      await repoFingerprints({ path: join(root, 'missing'), mounted: ['src'] }),
      await repoFingerprints({ path: plain, mounted: ['src'] })
    ]).toEqual([
      { build: null, source: null },
      { build: null, source: null }
    ])
  })
})

describe('serviceFingerprints', () => {
  test('fingerprints every service the dev overlay builds, by service name', async () => {
    await committedRepo('web')
    writeFile(
      join(root, DEV_OVERLAY_PATH),
      'services:\n  web:\n    build:\n      context: ../../repos/web\n    volumes:\n      - ../../repos/web/src:/home/node/src\n'
    )

    expect(await serviceFingerprints(root)).toEqual({
      web: {
        build: expect.stringMatching(/^[0-9a-f]{64}$/),
        source: expect.stringMatching(/^[0-9a-f]{64}$/)
      }
    })
  })
})

describe('refreshDecision', () => {
  const recorded = { build: 'b1', source: 's1' }

  test('leaves a service whose fingerprints have not changed', () => {
    expect(refreshDecision(recorded, { build: 'b1', source: 's1' })).toBe(
      'leave'
    )
  })

  test('restarts a service whose source alone changed', () => {
    expect(refreshDecision(recorded, { build: 'b1', source: 's2' })).toBe(
      'restart'
    )
  })

  test('rebuilds a service whose build inputs changed, whatever its source did', () => {
    expect([
      refreshDecision(recorded, { build: 'b2', source: 's1' }),
      refreshDecision(recorded, { build: 'b2', source: 's2' })
    ]).toEqual(['rebuild', 'rebuild'])
  })

  test('rebuilds a service the lease has no fingerprints for', () => {
    expect(refreshDecision(undefined, { build: 'b1', source: 's1' })).toBe(
      'rebuild'
    )
  })

  test('rebuilds a service whose fingerprints cannot be read now', () => {
    expect(refreshDecision(recorded, { build: null, source: null })).toBe(
      'rebuild'
    )
  })
})

describe('planRefresh', () => {
  test('sorts every current service into rebuild, restart or leave', () => {
    expect(
      planRefresh(
        {
          same: { build: 'b', source: 's' },
          edited: { build: 'b', source: 's' },
          bumped: { build: 'b', source: 's' }
        },
        {
          same: { build: 'b', source: 's' },
          edited: { build: 'b', source: 'x' },
          bumped: { build: 'x', source: 's' },
          added: { build: 'b', source: 's' }
        }
      )
    ).toEqual({
      rebuild: ['bumped', 'added'],
      restart: ['edited'],
      leave: ['same']
    })
  })

  test('rebuilds every service for a lease written before fingerprints were kept', () => {
    expect(
      planRefresh(undefined, {
        web: { build: 'b', source: 's' },
        api: { build: 'b', source: 's' }
      })
    ).toEqual({ rebuild: ['web', 'api'], restart: [], leave: [] })
  })

  test('restarts an unchanged service when a service it refreshes with is rebuilt or restarted', () => {
    const unchanged = { build: 'b', source: 's' }

    expect([
      planRefresh(
        { stub: unchanged, refdata: unchanged, web: unchanged },
        { stub: { build: 'x', source: 's' }, refdata: unchanged, web: unchanged },
        { refdata: ['stub'] }
      ),
      planRefresh(
        { stub: unchanged, refdata: unchanged },
        { stub: { build: 'b', source: 'x' }, refdata: unchanged },
        { refdata: ['stub'] }
      )
    ]).toEqual([
      { rebuild: ['stub'], restart: ['refdata'], leave: ['web'] },
      { rebuild: [], restart: ['stub', 'refdata'], leave: [] }
    ])
  })

  test('leaves a service that refreshes with an upstream that is itself left alone', () => {
    const unchanged = { build: 'b', source: 's' }

    expect(
      planRefresh(
        { stub: unchanged, refdata: unchanged },
        { stub: unchanged, refdata: unchanged },
        { refdata: ['stub'] }
      )
    ).toEqual({ rebuild: [], restart: [], leave: ['stub', 'refdata'] })
  })
})

// A workspace repo with committed stack files and one other file.
const committedWorkspace = async () => {
  writeFile(join(root, 'docker', 'stack', 'compose.yml'), 'name: trade\n')
  writeFile(join(root, 'scripts', 'stack', 'run-stack.sh'), 'echo up\n')
  writeFile(join(root, 'README.md'), '# workspace\n')
  await git(root, 'init', '-q')
  await git(root, 'add', '.')
  await git(root, 'commit', '-q', '-m', 'first')
}

describe('stackFilesFingerprint', () => {
  test('stays the same while no stack file changes', async () => {
    await committedWorkspace()
    const before = await stackFilesFingerprint(root)
    writeFile(join(root, 'README.md'), '# edited\n')
    writeFile(join(root, 'docker', 'stack', '.staged', 'init.sh'), 'x\n')

    expect(await stackFilesFingerprint(root)).toBe(before)
  })

  test.each([
    ['an edited compose file', join('docker', 'stack', 'compose.yml')],
    ['an edited stack script', join('scripts', 'stack', 'run-stack.sh')],
    ['a new compose overlay', join('docker', 'stack', 'perf.compose.yml')]
  ])('changes with %s', async (_change, file) => {
    await committedWorkspace()
    const before = await stackFilesFingerprint(root)
    writeFile(join(root, file), 'changed\n')

    expect(await stackFilesFingerprint(root)).not.toBe(before)
  })

  test('changes when a stack file is deleted', async () => {
    await committedWorkspace()
    writeFile(join(root, 'docker', 'stack', 'perf.compose.yml'), 'x\n')
    await git(root, 'add', '.')
    await git(root, 'commit', '-q', '-m', 'second')
    const before = await stackFilesFingerprint(root)
    rmSync(join(root, 'docker', 'stack', 'perf.compose.yml'))

    expect(await stackFilesFingerprint(root)).not.toBe(before)
  })

  test('changes when a stack file is renamed, keeping its contents', async () => {
    await committedWorkspace()
    const before = await stackFilesFingerprint(root)
    await git(
      root,
      'mv',
      join('docker', 'stack', 'compose.yml'),
      join('docker', 'stack', 'base.compose.yml')
    )

    expect(await stackFilesFingerprint(root)).not.toBe(before)
  })

  test('changes when a stack file is renamed on disk only', async () => {
    await committedWorkspace()
    const before = await stackFilesFingerprint(root)
    renameSync(
      join(root, 'docker', 'stack', 'compose.yml'),
      join(root, 'docker', 'stack', 'base.compose.yml')
    )

    expect(await stackFilesFingerprint(root)).not.toBe(before)
  })

  test('changes with a committed change to a stack file', async () => {
    await committedWorkspace()
    const before = await stackFilesFingerprint(root)
    writeFile(join(root, 'docker', 'stack', 'compose.yml'), 'name: other\n')
    await git(root, 'commit', '-q', '-am', 'second')

    expect(await stackFilesFingerprint(root)).not.toBe(before)
  })

  test('gives nothing for a workspace that is not a git checkout', async () => {
    writeFile(join(root, 'docker', 'stack', 'compose.yml'), 'name: trade\n')

    expect(await stackFilesFingerprint(root)).toBeNull()
  })
})
