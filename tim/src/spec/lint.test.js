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

  test('runs only the check groups it is given', async () => {
    const broken = validCoverage()
    broken.requirements[0].coverage = 'partial'
    writeFileSync(
      join(root, 'openspec', 'coverage', 'widgets', 'coverage.json'),
      JSON.stringify(broken)
    )

    const coverageOnly = await runSpecLint({
      workspaceRoot: root,
      groups: ['coverage'],
      run: cleanOpenspecRun
    })
    const specsOnly = await runSpecLint({
      workspaceRoot: root,
      groups: ['specs'],
      run: cleanOpenspecRun
    })

    expect(coverageOnly.findings).toEqual([
      expect.objectContaining({ check: 'rollup', capability: 'widgets' })
    ])
    expect(specsOnly.findings).toEqual([])
  })

  test('reports every group it did not run, so a narrow pass never reads like a full one', async () => {
    const result = await runSpecLint({
      workspaceRoot: root,
      groups: ['specs'],
      run: cleanOpenspecRun
    })

    expect(result.groups).toEqual(['specs'])
    expect(result.skipped).toEqual([
      { check: 'coverage', repo: null, reason: 'not selected' },
      { check: 'binding', repo: null, reason: 'not selected' },
      { check: 'links', repo: null, reason: 'not selected' }
    ])
  })

  test('spawns no repo listing when the links group is left out', async () => {
    const commands = []
    const recordingRun = async (command, args) => {
      commands.push([command, ...args].join(' '))
      return cleanOpenspecRun()
    }

    await runSpecLint({
      workspaceRoot: root,
      groups: ['coverage', 'binding'],
      run: recordingRun
    })

    expect(commands).toEqual([])
  })

  test('shells out to openspec validate only when the specs group runs', async () => {
    const commands = []
    const recordingRun = async (command, args) => {
      commands.push([command, ...args].join(' '))
      return cleanOpenspecRun()
    }

    await runSpecLint({
      workspaceRoot: root,
      groups: ['specs'],
      run: recordingRun
    })

    expect(commands).toEqual([
      expect.stringContaining('validate --specs --strict --json')
    ])
  })

  test('keeps findings in report order when a group is left out', async () => {
    rmSync(join(root, 'openspec', 'coverage', 'widgets', 'coverage.json'))
    const spec = `${SPEC_TEXT}\n### Requirement: Widgets SHALL wobble\n**ID**: REQ-WIDGET-002\nThe system SHALL wobble.\n\n#### Scenario: A widget wobbles\n**ID**: SCN-WIDGET-002-A\n- **GIVEN** a widget\n- **WHEN** nudged\n- **THEN** it wobbles\n`
    writeFileSync(join(root, 'openspec', 'specs', 'widgets', 'spec.md'), spec)

    const all = await runSpecLint({
      workspaceRoot: root,
      run: cleanOpenspecRun
    })
    const withoutBinding = await runSpecLint({
      workspaceRoot: root,
      groups: ['specs', 'coverage', 'links'],
      run: cleanOpenspecRun
    })

    expect(all.findings.map((finding) => finding.check)).toEqual([
      'pairing',
      'conventions'
    ])
    expect(withoutBinding.findings.map((finding) => finding.check)).toEqual([
      'conventions'
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
    const calls = []
    const recordingRun = async (command, args, opts) => {
      calls.push({ command, args, cwd: opts?.cwd })
      return cleanOpenspecRun()
    }

    const result = await runSpecLint({
      workspaceRoot: root,
      capability: 'widgets',
      run: recordingRun
    })

    expect(result.capabilityCount).toBe(1)
    expect(
      result.findings.every((finding) => finding.capability === 'widgets')
    ).toBe(true)
    expect(calls[0].args).toContain('widgets')
    expect(calls[0].args).not.toContain('--specs')
  })

  test('a parent --capability does not pass the prefix to openspec validate', async () => {
    mkdirSync(join(root, 'openspec', 'specs', 'live-animals', 'widgets'), {
      recursive: true
    })
    mkdirSync(join(root, 'openspec', 'coverage', 'live-animals', 'widgets'), {
      recursive: true
    })
    writeFileSync(
      join(root, 'openspec', 'specs', 'live-animals', 'widgets', 'spec.md'),
      SPEC_TEXT
    )
    writeFileSync(
      join(
        root,
        'openspec',
        'coverage',
        'live-animals',
        'widgets',
        'coverage.json'
      ),
      JSON.stringify({
        ...validCoverage(),
        capability: 'live-animals/widgets',
        specFile: 'openspec/specs/live-animals/widgets/spec.md'
      })
    )
    const calls = []
    const recordingRun = async (command, args, opts) => {
      calls.push({ command, args, cwd: opts?.cwd })
      return cleanOpenspecRun()
    }

    const result = await runSpecLint({
      workspaceRoot: root,
      capability: 'live-animals',
      groups: ['specs'],
      run: recordingRun
    })

    expect(result.capabilityCount).toBeGreaterThan(0)
    expect(calls[0].args).toContain('--specs')
    expect(calls[0].args).not.toContain('live-animals')
  })

  test('flags coverage.json with no matching spec.md', async () => {
    rmSync(join(root, 'openspec', 'specs', 'widgets', 'spec.md'))

    const result = await runSpecLint({
      workspaceRoot: root,
      groups: ['binding'],
      run: cleanOpenspecRun
    })

    expect(result.findings).toEqual([
      expect.objectContaining({
        check: 'pairing',
        message: expect.stringContaining('no matching spec.md')
      })
    ])
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
