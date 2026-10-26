import { describe, test, expect, afterEach } from 'vitest'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { installStaleDependencies, staleDependencies } from './dependencies.js'

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value))
}

const repoWith = ({ declared, locked, installed }) => {
  root = mkdtempSync(join(tmpdir(), 'tim-build-dependencies-'))
  const repo = join(root, 'repo')
  writeJson(join(repo, 'package.json'), {
    name: 'repo',
    devDependencies: declared
  })
  if (locked) {
    writeJson(join(repo, 'package-lock.json'), {
      lockfileVersion: 3,
      packages: {
        '': { name: 'repo' },
        ...Object.fromEntries(
          Object.entries(locked).map(([name, version]) => [
            `node_modules/${name}`,
            { version }
          ])
        )
      }
    })
  }
  for (const [name, version] of Object.entries(installed ?? {})) {
    writeJson(join(repo, 'node_modules', name, 'package.json'), {
      name,
      version
    })
  }
  return repo
}

const callsPath = () => join(root, 'npm-calls')

const fakeNpm = ({ failOn } = {}) => {
  const bin = join(root, 'fake-bin')
  mkdirSync(bin, { recursive: true })
  const fail = failOn ? `if [ "$1" = '${failOn}' ]; then exit 7; fi\n` : ''
  writeFileSync(
    join(bin, 'npm'),
    `#!/usr/bin/env bash\necho "npm $*" >> '${callsPath()}'\n${fail}`
  )
  chmodSync(join(bin, 'npm'), 0o755)
  return { PATH: `${bin}:${process.env.PATH}` }
}

const npmCalls = () =>
  existsSync(callsPath())
    ? readFileSync(callsPath(), 'utf8').trim().split('\n')
    : []

const PLAYWRIGHT = '@playwright/test'

describe('staleDependencies', () => {
  test('finds none when every direct dependency is installed at its locked version', () => {
    const repo = repoWith({
      declared: { [PLAYWRIGHT]: '1.64.1' },
      locked: { [PLAYWRIGHT]: '1.64.1' },
      installed: { [PLAYWRIGHT]: '1.64.1' }
    })

    expect(staleDependencies(repo)).toEqual([])
  })

  test('names a direct dependency installed at another version than the lockfile', () => {
    const repo = repoWith({
      declared: { [PLAYWRIGHT]: '1.64.1' },
      locked: { [PLAYWRIGHT]: '1.64.1' },
      installed: { [PLAYWRIGHT]: '1.63.0' }
    })

    expect(staleDependencies(repo)).toEqual([
      { name: PLAYWRIGHT, locked: '1.64.1', installed: '1.63.0' }
    ])
  })

  test('names a direct dependency that is not installed', () => {
    const repo = repoWith({
      declared: { undici: '8.12.3' },
      locked: { undici: '8.12.3' }
    })

    expect(staleDependencies(repo)).toEqual([
      { name: 'undici', locked: '8.12.3', installed: null }
    ])
  })

  test('finds none in a folder with no lockfile', () => {
    const repo = repoWith({ declared: { undici: '8.12.3' } })

    expect(staleDependencies(repo)).toEqual([])
  })
})

describe('installStaleDependencies', () => {
  test('leaves a folder whose dependencies match its lockfile alone', async () => {
    const repo = repoWith({
      declared: { undici: '8.12.3' },
      locked: { undici: '8.12.3' },
      installed: { undici: '8.12.3' }
    })
    const env = fakeNpm()

    const outcome = await installStaleDependencies({
      repo: 'frontend',
      path: repo,
      logsDir: join(root, 'logs'),
      env
    })

    expect({ outcome, calls: npmCalls() }).toEqual({
      outcome: {
        repo: 'frontend',
        path: repo,
        stale: null,
        installed: false,
        reason: null
      },
      calls: []
    })
  })

  test('runs npm ci in a folder whose dependencies differ, and says which differed', async () => {
    const repo = repoWith({
      declared: { undici: '8.12.3' },
      locked: { undici: '8.12.3' },
      installed: { undici: '8.11.0' }
    })
    const env = fakeNpm()

    const outcome = await installStaleDependencies({
      repo: 'frontend',
      path: repo,
      logsDir: join(root, 'logs'),
      env
    })

    expect({ outcome, calls: npmCalls() }).toEqual({
      outcome: {
        repo: 'frontend',
        path: repo,
        stale: 'undici 8.11.0 (locked 8.12.3)',
        installed: true,
        reason: null
      },
      calls: ['npm ci']
    })
  })

  test('installs the Playwright browsers after npm ci in a folder that uses Playwright', async () => {
    const repo = repoWith({
      declared: { [PLAYWRIGHT]: '1.64.1' },
      locked: { [PLAYWRIGHT]: '1.64.1' },
      installed: { [PLAYWRIGHT]: '1.63.0' }
    })
    const env = fakeNpm()

    await installStaleDependencies({
      repo: 'tests',
      path: repo,
      logsDir: join(root, 'logs'),
      env
    })

    expect(npmCalls()).toEqual([
      'npm ci',
      'npm exec -- playwright install chromium chromium-headless-shell'
    ])
  })

  test('reports a failed npm ci with its log, and installs no browsers', async () => {
    const repo = repoWith({
      declared: { [PLAYWRIGHT]: '1.64.1' },
      locked: { [PLAYWRIGHT]: '1.64.1' }
    })
    const env = fakeNpm({ failOn: 'ci' })
    const logsDir = join(root, 'logs')

    const outcome = await installStaleDependencies({
      repo: 'tests',
      path: repo,
      logsDir,
      env
    })

    expect({ outcome, calls: npmCalls() }).toEqual({
      outcome: {
        repo: 'tests',
        path: repo,
        stale: `${PLAYWRIGHT} missing (locked 1.64.1)`,
        installed: false,
        reason: `npm ci exited 7 in tests. Read ${join(logsDir, 'gate-tests-install.log')}.`
      },
      calls: ['npm ci']
    })
  })
})
