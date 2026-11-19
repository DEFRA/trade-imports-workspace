import { markWorkspaceRoot } from '../../test-support/workspace-marker.js'
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
  workspace = mkdtempSync(join(tmpdir(), 'tim-lint-'))
  markWorkspaceRoot(workspace)
  mkdirSync(join(workspace, 'repos'))
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

const seedRepo = (repo, scripts) => {
  const dir = join(workspace, 'repos', repo)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: repo, version: '0.0.0', scripts })
  )
}

describe('tim workspace lint CLI', () => {
  test('runs the lint script in Node repos that have one and reports done', async () => {
    seedRepo('trade-imports-animals-frontend', {
      lint: 'node -e "process.exit(0)"'
    })
    const { stdout, exitCode } = await execa(
      'node',
      [cliPath, 'workspace', 'lint', '--workspace', workspace, '--json'],
      { reject: false }
    )
    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload.ok).toBe(true)
    expect(payload.result).toHaveLength(1)
    expect(payload.result[0].repo).toBe('trade-imports-animals-frontend')
  }, 30_000)

  test('exits PARTIAL_FAILURE when one repo fails lint', async () => {
    seedRepo('trade-imports-animals-frontend', {
      lint: 'node -e "process.exit(0)"'
    })
    seedRepo('trade-imports-animals-admin', {
      lint: 'node -e "process.exit(7)"'
    })
    const { stdout, exitCode } = await execa(
      'node',
      [cliPath, 'workspace', 'lint', '--workspace', workspace, '--json'],
      { reject: false }
    )
    expect(exitCode).toBe(5)
    const payload = JSON.parse(stdout.trim())
    expect(payload.ok).toBe(false)
    const admin = payload.result.find(
      (r) => r.repo === 'trade-imports-animals-admin'
    )
    expect(admin.ok).toBe(false)
  }, 30_000)

  test('skips repos with no lint script', async () => {
    seedRepo('trade-imports-animals-frontend', { build: 'echo build' })
    const { stdout, exitCode } = await execa(
      'node',
      [cliPath, 'workspace', 'lint', '--workspace', workspace, '--json'],
      { reject: false }
    )
    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload.result).toHaveLength(0)
  }, 30_000)
})
