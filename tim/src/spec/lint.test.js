import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { runSpecLint } from './lint.js'

const SPEC_TEXT = `# Widgets Specification

## Purpose

Widgets.

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

const validCoverage = () => ({
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
              file: 'src/a.test.js',
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
const cleanOpenspecRun = async () => ({
  stdout: JSON.stringify({
    items: [{ id: 'widgets', valid: true, issues: [] }]
  }),
  stderr: '',
  exitCode: 0
})

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-spec-lint-'))
  mkdirSync(join(root, 'openspec', 'specs', 'widgets'), { recursive: true })
  mkdirSync(join(root, 'openspec', 'coverage', 'widgets'), { recursive: true })
  writeFileSync(
    join(root, 'openspec', 'specs', 'widgets', 'spec.md'),
    SPEC_TEXT
  )
  writeFileSync(
    join(root, 'openspec', 'coverage', 'widgets', 'coverage.json'),
    JSON.stringify(validCoverage())
  )
  writeFileSync(
    join(root, 'openspec', 'coverage', 'AREAS.md'),
    ['| Capability | Area code |', '|---|---|', '| widgets | WIDGET |'].join(
      '\n'
    )
  )
  mkdirSync(
    join(root, '.claude', 'skills', 'requirements-pipeline', 'references'),
    {
      recursive: true
    }
  )
  writeFileSync(
    join(
      root,
      '.claude',
      'skills',
      'requirements-pipeline',
      'references',
      'gates.json'
    ),
    JSON.stringify({ repos: {} })
  )
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('runSpecLint', () => {
  test('is clean for a well-formed capability, and reports the repo checks as skipped', async () => {
    const result = await runSpecLint({
      workspaceRoot: root,
      run: cleanOpenspecRun
    })

    expect(result.findings).toEqual([])
    expect(result.capabilityCount).toBe(1)
    expect(result.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          check: 'link-file',
          repo: 'trade-imports-x'
        }),
        expect.objectContaining({ check: 'link-test', repo: 'trade-imports-x' })
      ])
    )
  })

  test('flags a capability with a spec.md but no coverage.json', async () => {
    rmSync(join(root, 'openspec', 'coverage', 'widgets', 'coverage.json'))

    const result = await runSpecLint({
      workspaceRoot: root,
      run: cleanOpenspecRun
    })

    expect(result.findings).toEqual([
      expect.objectContaining({
        check: 'pairing',
        message: expect.stringContaining('no matching coverage.json')
      })
    ])
  })

  test('flags a broken requirement rollup', async () => {
    const broken = validCoverage()
    broken.requirements[0].coverage = 'partial'
    writeFileSync(
      join(root, 'openspec', 'coverage', 'widgets', 'coverage.json'),
      JSON.stringify(broken)
    )

    const result = await runSpecLint({
      workspaceRoot: root,
      run: cleanOpenspecRun
    })

    expect(result.findings).toEqual([
      expect.objectContaining({ check: 'rollup', capability: 'widgets' })
    ])
  })

  test('merges a finding delegated from openspec validate --json', async () => {
    const failingOpenspecRun = async () => ({
      stdout: JSON.stringify({
        items: [
          {
            id: 'widgets',
            valid: false,
            issues: [
              {
                level: 'ERROR',
                path: 'file',
                message: 'Spec must have a Purpose section.'
              }
            ]
          }
        ]
      }),
      stderr: '',
      exitCode: 1
    })

    const result = await runSpecLint({
      workspaceRoot: root,
      run: failingOpenspecRun
    })

    expect(result.findings).toEqual([
      expect.objectContaining({
        check: 'openspec-validate',
        capability: 'widgets'
      })
    ])
  })

  test('--capability scopes both the local checks and the delegated ones', async () => {
    mkdirSync(join(root, 'openspec', 'specs', 'gadgets'), { recursive: true })
    writeFileSync(
      join(root, 'openspec', 'specs', 'gadgets', 'spec.md'),
      SPEC_TEXT.replaceAll('widget', 'gadget').replaceAll('WIDGET', 'GADGET')
    )

    const result = await runSpecLint({
      workspaceRoot: root,
      capability: 'widgets',
      run: cleanOpenspecRun
    })

    expect(result.capabilityCount).toBe(1)
    expect(
      result.findings.every((finding) => finding.capability === 'widgets')
    ).toBe(true)
  })

  test('raises NOT_FOUND for a --capability the corpus does not have', async () => {
    await expect(
      runSpecLint({
        workspaceRoot: root,
        capability: 'does-not-exist',
        run: cleanOpenspecRun
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  test('--root validates a different checkout instead of the workspace root', async () => {
    const worktree = mkdtempSync(join(tmpdir(), 'tim-spec-lint-worktree-'))
    mkdirSync(join(worktree, 'openspec', 'specs', 'widgets'), {
      recursive: true
    })
    mkdirSync(join(worktree, 'openspec', 'coverage', 'widgets'), {
      recursive: true
    })
    writeFileSync(
      join(worktree, 'openspec', 'specs', 'widgets', 'spec.md'),
      SPEC_TEXT.replace('The system MUST spin', 'The system SHALL spin')
    )
    writeFileSync(
      join(worktree, 'openspec', 'coverage', 'widgets', 'coverage.json'),
      JSON.stringify(validCoverage())
    )
    writeFileSync(
      join(worktree, 'openspec', 'coverage', 'AREAS.md'),
      ['| Capability | Area code |', '|---|---|', '| widgets | WIDGET |'].join(
        '\n'
      )
    )

    const result = await runSpecLint({
      workspaceRoot: root,
      root: worktree,
      run: cleanOpenspecRun
    })

    expect(result.specRoot).toBe(worktree)
    expect(result.findings).toEqual([
      expect.objectContaining({ message: expect.stringContaining('SHALL') })
    ])

    rmSync(worktree, { recursive: true, force: true })
  })
})
