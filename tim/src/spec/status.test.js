import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execa } from 'execa'
import { loadBaseline, computeSpecStatus } from './status.js'

const SPEC_TEXT = `# Widgets Specification

## Purpose

The rules governing how a widget behaves once it is shown to a user.

## Requirements

### Requirement: Widgets spin
**ID**: REQ-WIDGET-001
The system MUST spin every widget.

#### Scenario: A widget spins on load
**ID**: SCN-WIDGET-001-A
- **GIVEN** a widget is shown
- **WHEN** the page loads
- **THEN** the widget spins
`

const coverageWithLink = (file) => ({
  capability: 'widgets',
  areaCode: 'WIDGET',
  specFile: 'openspec/specs/widgets/spec.md',
  requirements: [
    {
      id: 'REQ-WIDGET-001',
      name: 'Widgets spin',
      coverage: 'full',
      scenarios: [
        {
          id: 'SCN-WIDGET-001-A',
          name: 'A widget spins on load',
          coverage: 'full',
          tests: [
            {
              type: 'unit',
              repo: 'trade-imports-x',
              file,
              test: 'spins',
              strength: 'full'
            }
          ]
        }
      ]
    }
  ]
})

let root

const gitInit = async (dir) => {
  await execa('git', ['init', '--quiet', '-b', 'main', dir])
  await execa(
    'git',
    ['-c', 'user.name=t', '-c', 'user.email=t@t.invalid', 'add', '-A'],
    {
      cwd: dir
    }
  )
  await execa(
    'git',
    [
      '-c',
      'user.name=t',
      '-c',
      'user.email=t@t.invalid',
      'commit',
      '--quiet',
      '-m',
      'initial'
    ],
    { cwd: dir }
  )
}

const commit = async (dir, message) => {
  await execa(
    'git',
    ['-c', 'user.name=t', '-c', 'user.email=t@t.invalid', 'add', '-A'],
    {
      cwd: dir
    }
  )
  await execa(
    'git',
    [
      '-c',
      'user.name=t',
      '-c',
      'user.email=t@t.invalid',
      'commit',
      '--quiet',
      '-m',
      message
    ],
    { cwd: dir }
  )
}

const headSha = async (dir) =>
  (await execa('git', ['-C', dir, 'rev-parse', 'HEAD'])).stdout.trim()

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-spec-status-'))
  mkdirSync(join(root, 'openspec', 'specs', 'widgets'), { recursive: true })
  mkdirSync(join(root, 'openspec', 'coverage', 'widgets'), { recursive: true })
  writeFileSync(
    join(root, 'openspec', 'specs', 'widgets', 'spec.md'),
    SPEC_TEXT
  )
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('loadBaseline', () => {
  test('reads openspec/baseline.json', () => {
    mkdirSync(join(root, 'openspec'), { recursive: true })
    writeFileSync(
      join(root, 'openspec', 'baseline.json'),
      JSON.stringify({ verifiedAt: '2026-09-16', verifiedBy: 'abc', repos: {} })
    )

    expect(loadBaseline(root)).toEqual({
      verifiedAt: '2026-09-16',
      verifiedBy: 'abc',
      repos: {}
    })
  })

  test('raises NOT_FOUND when the file is missing', () => {
    expect(() => loadBaseline(root)).toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' })
    )
  })
})

describe('computeSpecStatus', () => {
  test('reports no linked test files changed when the repo is still at the baseline sha', async () => {
    const repoDir = join(root, 'repos', 'trade-imports-x')
    mkdirSync(join(repoDir, 'src'), { recursive: true })
    writeFileSync(join(repoDir, 'src', 'a.test.js'), 'test()')
    await gitInit(repoDir)
    const sha = await headSha(repoDir)

    writeFileSync(
      join(root, 'openspec', 'coverage', 'widgets', 'coverage.json'),
      JSON.stringify(coverageWithLink('src/a.test.js'))
    )
    writeFileSync(
      join(root, 'openspec', 'baseline.json'),
      JSON.stringify({
        verifiedAt: '2026-09-16',
        verifiedBy: sha,
        repos: { 'trade-imports-x': sha }
      })
    )

    const result = await computeSpecStatus({ workspaceRoot: root })

    expect(result.totalChangedLinkedFiles).toBe(0)
    expect(result.capabilitiesAffected).toBe(0)
    expect(result.repos).toEqual([
      {
        repo: 'trade-imports-x',
        baselineSha: sha,
        headSha: sha,
        cloned: true,
        changedLinkedFiles: []
      }
    ])
  })

  test('names the linked file and capability a later commit changed', async () => {
    const repoDir = join(root, 'repos', 'trade-imports-x')
    mkdirSync(join(repoDir, 'src'), { recursive: true })
    writeFileSync(join(repoDir, 'src', 'a.test.js'), 'test()')
    writeFileSync(join(repoDir, 'src', 'unrelated.js'), 'x')
    await gitInit(repoDir)
    const baselineSha = await headSha(repoDir)

    writeFileSync(join(repoDir, 'src', 'a.test.js'), 'test() // changed')
    await commit(repoDir, 'touch the linked test')

    writeFileSync(
      join(root, 'openspec', 'coverage', 'widgets', 'coverage.json'),
      JSON.stringify(coverageWithLink('src/a.test.js'))
    )
    writeFileSync(
      join(root, 'openspec', 'baseline.json'),
      JSON.stringify({
        verifiedAt: '2026-09-16',
        verifiedBy: baselineSha,
        repos: { 'trade-imports-x': baselineSha }
      })
    )

    const result = await computeSpecStatus({ workspaceRoot: root })

    expect(result.totalChangedLinkedFiles).toBe(1)
    expect(result.capabilitiesAffected).toBe(1)
    expect(result.repos[0].changedLinkedFiles).toEqual(['src/a.test.js'])
  })

  test('ignores a commit that touches only an unlinked file', async () => {
    const repoDir = join(root, 'repos', 'trade-imports-x')
    mkdirSync(join(repoDir, 'src'), { recursive: true })
    writeFileSync(join(repoDir, 'src', 'a.test.js'), 'test()')
    writeFileSync(join(repoDir, 'src', 'unrelated.js'), 'x')
    await gitInit(repoDir)
    const baselineSha = await headSha(repoDir)

    writeFileSync(join(repoDir, 'src', 'unrelated.js'), 'y')
    await commit(repoDir, 'touch something not linked')

    writeFileSync(
      join(root, 'openspec', 'coverage', 'widgets', 'coverage.json'),
      JSON.stringify(coverageWithLink('src/a.test.js'))
    )
    writeFileSync(
      join(root, 'openspec', 'baseline.json'),
      JSON.stringify({
        verifiedAt: '2026-09-16',
        verifiedBy: baselineSha,
        repos: { 'trade-imports-x': baselineSha }
      })
    )

    const result = await computeSpecStatus({ workspaceRoot: root })

    expect(result.totalChangedLinkedFiles).toBe(0)
  })

  test('reports a repo that is not cloned rather than crashing', async () => {
    writeFileSync(
      join(root, 'openspec', 'coverage', 'widgets', 'coverage.json'),
      JSON.stringify(coverageWithLink('src/a.test.js'))
    )
    writeFileSync(
      join(root, 'openspec', 'baseline.json'),
      JSON.stringify({
        verifiedAt: '2026-09-16',
        verifiedBy: 'abc',
        repos: { 'trade-imports-x': 'deadbeef' }
      })
    )

    const result = await computeSpecStatus({ workspaceRoot: root })

    expect(result.repos).toEqual([
      {
        repo: 'trade-imports-x',
        baselineSha: 'deadbeef',
        headSha: null,
        cloned: false,
        changedLinkedFiles: []
      }
    ])
  })
})
