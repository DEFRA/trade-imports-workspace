import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { REPOS } from '../../constants/repos.js'
import {
  collectStatuses,
  collectSpecStaleness,
  renderSpecStalenessLine,
  renderText
} from './status.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')

const gitInit = async (path) => {
  await execa('git', ['init', '-q', '-b', 'main'], { cwd: path })
  await execa('git', ['config', 'user.email', 'test@example.com'], {
    cwd: path
  })
  await execa('git', ['config', 'user.name', 'Test'], { cwd: path })
}

const gitCommit = async (path, message = 'init') => {
  writeFileSync(join(path, 'file.txt'), 'hello\n')
  await execa('git', ['add', 'file.txt'], { cwd: path })
  await execa('git', ['commit', '-q', '-m', message], { cwd: path })
}

let workspace

beforeEach(async () => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-status-'))
  writeFileSync(join(workspace, 'Makefile'), 'all:\n')
  const reposDir = join(workspace, 'repos')
  mkdirSync(reposDir)
  // Clone one Node repo, leave the rest absent
  const cloned = join(reposDir, 'trade-imports-animals-frontend')
  mkdirSync(cloned)
  await gitInit(cloned)
  await gitCommit(cloned)
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

describe('collectStatuses', () => {
  test('reports cloned repo with branch and absent repos as not cloned', async () => {
    const statuses = await collectStatuses(workspace)
    const byRepo = Object.fromEntries(statuses.map((s) => [s.repo, s]))

    expect(byRepo['trade-imports-animals-frontend']).toMatchObject({
      cloned: true,
      branch: 'main',
      dirty: 0
    })
    expect(byRepo['trade-imports-animals-backend']).toMatchObject({
      cloned: false,
      branch: null
    })
  })

  test('marks dirty entries when there are uncommitted changes', async () => {
    writeFileSync(
      join(workspace, 'repos', 'trade-imports-animals-frontend', 'new.txt'),
      'unstaged\n'
    )
    const statuses = await collectStatuses(workspace)
    const frontend = statuses.find(
      (s) => s.repo === 'trade-imports-animals-frontend'
    )
    expect(frontend.dirty).toBeGreaterThan(0)
  })
})

describe('renderText', () => {
  test('emits "=== repo ===" headers for each repo and marks absent ones', () => {
    const text = renderText([
      { repo: 'a', cloned: true, raw: '## main' },
      { repo: 'b', cloned: false, raw: '' }
    ])
    expect(text).toContain('=== a ===')
    expect(text).toContain('## main')
    expect(text).toContain('=== b === (not cloned)')
  })

  test('appends the staleness line when spec status is available', () => {
    const text = renderText([{ repo: 'a', cloned: true, raw: '## main' }], {
      verifiedAt: '2026-09-16',
      daysAgo: 7,
      totalChangedLinkedFiles: 14,
      totalChangedLinks: 80,
      capabilitiesAffected: 21,
      capabilityCount: 72
    })

    expect(text).toContain('Behaviour Spec verified 2026-09-16 (7 days ago)')
  })

  test('adds nothing when spec status is null (no baseline.json)', () => {
    const text = renderText([{ repo: 'a', cloned: true, raw: '## main' }], null)

    expect(text).not.toContain('Behaviour Spec')
  })
})

describe('renderSpecStalenessLine', () => {
  test('reports the verified date, age, and the unverified totals', () => {
    expect(
      renderSpecStalenessLine({
        verifiedAt: '2026-09-16',
        daysAgo: 7,
        totalChangedLinkedFiles: 14,
        totalChangedLinks: 80,
        capabilitiesAffected: 21,
        capabilityCount: 72
      })
    ).toBe(
      'Behaviour Spec verified 2026-09-16 (7 days ago) — 14 linked test files changed since, 80 links across 21 of 72 capabilities unverified.'
    )
  })

  test('pluralises a single day and a single file correctly', () => {
    expect(
      renderSpecStalenessLine({
        verifiedAt: '2026-09-22',
        daysAgo: 1,
        totalChangedLinkedFiles: 1,
        totalChangedLinks: 1,
        capabilitiesAffected: 1,
        capabilityCount: 72
      })
    ).toBe(
      'Behaviour Spec verified 2026-09-22 (1 day ago) — 1 linked test file changed since, 1 link across 1 of 72 capabilities unverified.'
    )
  })
})

describe('collectSpecStaleness', () => {
  test('returns null when openspec/baseline.json is absent', async () => {
    await expect(collectSpecStaleness(workspace)).resolves.toBeNull()
  })

  test('computes staleness when a baseline is present', async () => {
    mkdirSync(join(workspace, 'openspec'), { recursive: true })
    writeFileSync(
      join(workspace, 'openspec', 'baseline.json'),
      JSON.stringify({ verifiedAt: '2026-09-16', verifiedBy: 'abc', repos: {} })
    )

    const staleness = await collectSpecStaleness(workspace)

    expect(staleness).toMatchObject({
      verifiedAt: '2026-09-16',
      totalChangedLinkedFiles: 0
    })
    expect(staleness.daysAgo).toBeGreaterThanOrEqual(0)
  })
})

describe('tim workspace status CLI', () => {
  test('prints the cloned repo with branch and marks absent ones as not cloned', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      [cliPath, 'workspace', 'status', '--workspace', workspace],
      { reject: false }
    )
    expect(exitCode).toBe(0)
    expect(stdout).toContain('=== trade-imports-animals-frontend ===')
    expect(stdout).toContain('## main')
    expect(stdout).toContain(
      '=== trade-imports-animals-backend === (not cloned)'
    )
  })

  test('--json emits a structured object with one entry per repo', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      [cliPath, 'workspace', 'status', '--workspace', workspace, '--json'],
      { reject: false }
    )
    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload.ok).toBe(true)
    expect(payload.schema_version).toBe(1)
    expect(payload.result.repos).toHaveLength(REPOS.length)
    const frontend = payload.result.repos.find(
      (r) => r.repo === 'trade-imports-animals-frontend'
    )
    expect(frontend).toMatchObject({ cloned: true, branch: 'main', dirty: 0 })
    expect(payload.result.specStatus).toBeNull()
  })

  test('exits 2 with a JSON error envelope when --workspace is invalid', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      [
        cliPath,
        'workspace',
        'status',
        '--workspace',
        '/no/such/path',
        '--json'
      ],
      { reject: false }
    )
    expect(exitCode).toBe(2)
    const payload = JSON.parse(stdout.trim())
    expect(payload.ok).toBe(false)
    expect(payload.errors[0].code).toBe('USAGE')
  })
})
