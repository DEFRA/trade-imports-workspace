import { markWorkspaceRoot } from '../../test-support/workspace-marker.js'
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync
} from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { bundledRoster } from '../../test-support/roster.js'

const { nodeRepos: NODE_REPOS } = bundledRoster
import { cleanRepo, cleanAll, renderText } from './clean.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')

let workspace

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-clean-'))
  markWorkspaceRoot(workspace)
  mkdirSync(join(workspace, 'repos'))
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

const seedNodeModules = (repo) => {
  const modules = join(workspace, 'repos', repo, 'node_modules', 'foo')
  mkdirSync(modules, { recursive: true })
  writeFileSync(join(modules, 'package.json'), '{}')
}

describe('cleanRepo', () => {
  test('removes node_modules when present', () => {
    seedNodeModules('trade-imports-animals-frontend')
    const result = cleanRepo(workspace, 'trade-imports-animals-frontend')
    expect(result.removed).toBe(true)
    expect(
      existsSync(
        join(
          workspace,
          'repos',
          'trade-imports-animals-frontend',
          'node_modules'
        )
      )
    ).toBe(false)
  })

  test('reports removed: false when node_modules is absent', () => {
    mkdirSync(join(workspace, 'repos', 'trade-imports-animals-frontend'))
    const result = cleanRepo(workspace, 'trade-imports-animals-frontend')
    expect(result.removed).toBe(false)
  })
})

describe('cleanAll', () => {
  test('iterates every Node.js repo in NODE_REPOS', () => {
    const results = cleanAll(workspace)
    expect(results.map((r) => r.repo).sort()).toEqual([...NODE_REPOS].sort())
  })
})

describe('renderText', () => {
  test('marks removed and skipped repos distinctly', () => {
    const text = renderText([
      { repo: 'a', removed: true },
      { repo: 'b', removed: false }
    ])
    expect(text).toContain('a — removed node_modules')
    expect(text).toContain('b — (no node_modules)')
  })
})

describe('tim workspace clean CLI', () => {
  test('removes node_modules in the cloned repo and reports it', async () => {
    seedNodeModules('trade-imports-animals-frontend')
    const { stdout, exitCode } = await execa(
      'node',
      [cliPath, 'workspace', 'clean', '--workspace', workspace],
      { reject: false }
    )
    expect(exitCode).toBe(0)
    expect(stdout).toContain(
      'trade-imports-animals-frontend — removed node_modules'
    )
    expect(
      existsSync(
        join(
          workspace,
          'repos',
          'trade-imports-animals-frontend',
          'node_modules'
        )
      )
    ).toBe(false)
  })

  test('--json emits a structured object with one entry per Node.js repo', async () => {
    seedNodeModules('trade-imports-animals-admin')
    const { stdout, exitCode } = await execa(
      'node',
      [cliPath, 'workspace', 'clean', '--workspace', workspace, '--json'],
      { reject: false }
    )
    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload.ok).toBe(true)
    expect(payload.result).toHaveLength(NODE_REPOS.length)
    const admin = payload.result.find(
      (r) => r.repo === 'trade-imports-animals-admin'
    )
    expect(admin.removed).toBe(true)
  })
})
