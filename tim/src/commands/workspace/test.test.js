import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')

let workspace

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-test-'))
  writeFileSync(join(workspace, 'Makefile'), 'all:\n')
  mkdirSync(join(workspace, 'repos'))
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

const seedNodeRepo = (repo, scripts) => {
  const dir = join(workspace, 'repos', repo)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: repo, version: '0.0.0', scripts })
  )
}

describe('tim workspace test CLI', () => {
  test('runs npm test in repos that have one and reports done', async () => {
    seedNodeRepo('trade-imports-animals-frontend', {
      test: 'node -e "process.exit(0)"'
    })
    const { stdout, exitCode } = await execa(
      'node',
      [cliPath, 'workspace', 'test', '--workspace', workspace, '--json'],
      { reject: false }
    )
    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload.ok).toBe(true)
    expect(payload.result[0].repo).toBe('trade-imports-animals-frontend')
  }, 30_000)

  test('exits PARTIAL_FAILURE and continues serially when one repo fails', async () => {
    seedNodeRepo('trade-imports-animals-frontend', {
      test: 'node -e "process.exit(0)"'
    })
    seedNodeRepo('trade-imports-animals-admin', {
      test: 'node -e "process.exit(3)"'
    })
    seedNodeRepo('trade-imports-ins-frontend', {
      test: 'node -e "process.exit(0)"'
    })
    const { stdout, exitCode } = await execa(
      'node',
      [cliPath, 'workspace', 'test', '--workspace', workspace, '--json'],
      { reject: false }
    )
    expect(exitCode).toBe(5)
    const payload = JSON.parse(stdout.trim())
    const byRepo = Object.fromEntries(payload.result.map((r) => [r.repo, r]))
    expect(byRepo['trade-imports-animals-admin'].ok).toBe(false)
    // ins-frontend still ran after admin failed — serial, not short-circuit
    expect(byRepo['trade-imports-ins-frontend'].ok).toBe(true)
  }, 30_000)

  test('skips Node repos with no test script', async () => {
    seedNodeRepo('trade-imports-animals-frontend', { build: 'echo' })
    const { stdout, exitCode } = await execa(
      'node',
      [cliPath, 'workspace', 'test', '--workspace', workspace, '--json'],
      { reject: false }
    )
    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload.result).toHaveLength(0)
  }, 30_000)

  test('skips trade-imports-animals-tests even when it has a test script', async () => {
    seedNodeRepo('trade-imports-animals-tests', {
      test: 'node -e "process.exit(3)"'
    })
    const { stdout, exitCode } = await execa(
      'node',
      [cliPath, 'workspace', 'test', '--workspace', workspace, '--json'],
      { reject: false }
    )
    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload.result).toHaveLength(0)
  }, 30_000)

  test('skips trade-imports-defra-id-stub even when it has a test script', async () => {
    seedNodeRepo('trade-imports-defra-id-stub', {
      test: 'node -e "process.exit(3)"'
    })
    const { stdout, exitCode } = await execa(
      'node',
      [cliPath, 'workspace', 'test', '--workspace', workspace, '--json'],
      { reject: false }
    )
    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload.result).toHaveLength(0)
  }, 30_000)
})
