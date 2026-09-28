import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { parsePinnedNpmVersion, buildNpmInstallCommand } from './install.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')

let workspace

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-install-'))
  writeFileSync(join(workspace, 'Makefile'), 'all:\n')
  mkdirSync(join(workspace, 'repos'))
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

const seedNpmPkg = (repo, { packageManager } = {}) => {
  const dir = join(workspace, 'repos', repo)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({
      name: repo,
      version: '0.0.0',
      ...(packageManager ? { packageManager } : {})
    })
  )
  writeFileSync(
    join(dir, 'package-lock.json'),
    JSON.stringify({
      name: repo,
      version: '0.0.0',
      lockfileVersion: 3,
      requires: true,
      packages: { '': { name: repo, version: '0.0.0' } }
    })
  )
}

describe('parsePinnedNpmVersion', () => {
  test('reads the version out of a Corepack packageManager field', () => {
    expect(parsePinnedNpmVersion('npm@11.6.2')).toBe('11.6.2')
  })

  test('drops a trailing Corepack integrity hash', () => {
    expect(parsePinnedNpmVersion('npm@11.6.2+sha512-abc123')).toBe('11.6.2')
  })

  test('returns null for a non-npm package manager', () => {
    expect(parsePinnedNpmVersion('yarn@4.0.0')).toBeNull()
  })

  test('returns null when there is no packageManager field', () => {
    expect(parsePinnedNpmVersion(null)).toBeNull()
    expect(parsePinnedNpmVersion(undefined)).toBeNull()
  })
})

describe('buildNpmInstallCommand', () => {
  test('runs the pinned npm through `npm exec` when it differs from the running npm', () => {
    expect(
      buildNpmInstallCommand({
        dir: '/ws/repos/trade-imports-plants-prototype',
        packageManager: 'npm@11.6.2',
        runningNpmVersion: '10.2.0'
      })
    ).toEqual({
      command: 'npm',
      args: [
        'exec',
        '--yes',
        'npm@11.6.2',
        '--',
        'ci',
        '--prefix',
        '/ws/repos/trade-imports-plants-prototype'
      ]
    })
  })

  test('runs plain `npm ci` when the pinned version matches the running npm', () => {
    expect(
      buildNpmInstallCommand({
        dir: '/ws/repos/trade-imports-plants-prototype',
        packageManager: 'npm@11.6.2',
        runningNpmVersion: '11.6.2'
      })
    ).toEqual({
      command: 'npm',
      args: ['--prefix', '/ws/repos/trade-imports-plants-prototype', 'ci']
    })
  })

  test('runs plain `npm ci` for a repo with no pinned npm version', () => {
    expect(
      buildNpmInstallCommand({
        dir: '/ws/repos/trade-imports-animals-frontend',
        packageManager: null,
        runningNpmVersion: '11.6.2'
      })
    ).toEqual({
      command: 'npm',
      args: ['--prefix', '/ws/repos/trade-imports-animals-frontend', 'ci']
    })
  })
})

describe('tim workspace install CLI', () => {
  test('completes successfully across the seeded Node.js repos', async () => {
    seedNpmPkg('trade-imports-animals-frontend')
    seedNpmPkg('trade-imports-animals-admin')

    const { stdout, exitCode } = await execa(
      'node',
      [
        cliPath,
        'workspace',
        'install',
        '--workspace',
        workspace,
        '--node-only',
        '--json'
      ],
      { reject: false }
    )
    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload.ok).toBe(true)
    const frontend = payload.result.find(
      (r) => r.repo === 'trade-imports-animals-frontend'
    )
    expect(frontend.ok).toBe(true)
    expect(frontend.exitCode).toBe(0)
  }, 60_000)

  test('exits 5 (PARTIAL_FAILURE) and reports the failing repo when npm ci fails', async () => {
    seedNpmPkg('trade-imports-animals-frontend')
    rmSync(
      join(
        workspace,
        'repos',
        'trade-imports-animals-frontend',
        'package-lock.json'
      )
    )

    const { stdout, exitCode } = await execa(
      'node',
      [
        cliPath,
        'workspace',
        'install',
        '--workspace',
        workspace,
        '--node-only',
        '--json'
      ],
      { reject: false }
    )
    expect(exitCode).toBe(5)
    const payload = JSON.parse(stdout.trim())
    expect(payload.ok).toBe(false)
    const frontend = payload.result.find(
      (r) => r.repo === 'trade-imports-animals-frontend'
    )
    expect(frontend.ok).toBe(false)
    expect(frontend.exitCode).not.toBe(0)
  }, 60_000)

  test('--repo trade-imports-plants-prototype installs through its pinned npm when it differs from the running npm', async () => {
    seedNpmPkg('trade-imports-plants-prototype', {
      packageManager: 'npm@0.0.1-does-not-exist'
    })

    const { stdout, exitCode } = await execa(
      'node',
      [
        cliPath,
        'workspace',
        'install',
        '--workspace',
        workspace,
        '--repo',
        'trade-imports-plants-prototype',
        '--json'
      ],
      { reject: false }
    )
    expect(exitCode).toBe(5)
    const payload = JSON.parse(stdout.trim())
    const entry = payload.result.find(
      (r) => r.repo === 'trade-imports-plants-prototype'
    )
    expect(entry.label).toContain(
      `npm exec --yes npm@0.0.1-does-not-exist -- ci --prefix`
    )
    expect(entry.label).toContain('trade-imports-plants-prototype')
  }, 60_000)

  test('--repo installs only the named repo, even when others are cloned', async () => {
    seedNpmPkg('trade-imports-animals-frontend')
    seedNpmPkg('trade-imports-animals-admin')

    const { stdout, exitCode } = await execa(
      'node',
      [
        cliPath,
        'workspace',
        'install',
        '--workspace',
        workspace,
        '--repo',
        'trade-imports-animals-admin',
        '--json'
      ],
      { reject: false }
    )
    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload.result).toHaveLength(1)
    expect(payload.result[0].repo).toBe('trade-imports-animals-admin')
  }, 60_000)

  test('skips repos that are not cloned', async () => {
    seedNpmPkg('trade-imports-animals-frontend')

    const { stdout, exitCode } = await execa(
      'node',
      [
        cliPath,
        'workspace',
        'install',
        '--workspace',
        workspace,
        '--node-only',
        '--json'
      ],
      { reject: false }
    )
    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload.result).toHaveLength(1)
    expect(payload.result[0].repo).toBe('trade-imports-animals-frontend')
  }, 60_000)
})
