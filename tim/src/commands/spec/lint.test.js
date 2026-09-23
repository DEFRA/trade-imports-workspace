import { describe, test, expect, afterEach } from 'vitest'
import { execa } from 'execa'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderLintText } from './lint.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')

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

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
})

const seedWorkspace = (specText) => {
  root = mkdtempSync(join(tmpdir(), 'tim-spec-lint-cli-'))
  writeFileSync(join(root, 'Makefile'), 'all:\n')
  mkdirSync(join(root, 'repos'), { recursive: true })
  mkdirSync(join(root, 'openspec', 'specs', 'widgets'), { recursive: true })
  mkdirSync(join(root, 'openspec', 'coverage', 'widgets'), { recursive: true })
  mkdirSync(
    join(root, '.claude', 'skills', 'requirements-pipeline', 'references'),
    {
      recursive: true
    }
  )
  writeFileSync(join(root, 'openspec', 'specs', 'widgets', 'spec.md'), specText)
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
}

const runTim = (args) =>
  execa('node', [cliPath, ...args, '--workspace', root], {
    reject: false,
    env: { TIM_NO_AUTO_PULL: '1' }
  })

describe('tim spec lint', () => {
  test('exits non-zero and reports the finding for a locally-broken spec', async () => {
    seedWorkspace(
      SPEC_TEXT.replace('The system MUST spin', 'The system SHALL spin')
    )

    const run = await runTim(['spec', 'lint', '--json'])
    const envelope = JSON.parse(run.stdout.trim())

    expect(run.exitCode).toBe(1)
    expect(envelope.result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          check: 'conventions',
          message: expect.stringContaining('SHALL')
        })
      ])
    )
  }, 60_000)

  test('exits zero for a well-formed capability', async () => {
    seedWorkspace(SPEC_TEXT)

    const run = await runTim([
      'spec',
      'lint',
      '--capability',
      'widgets',
      '--json'
    ])
    const envelope = JSON.parse(run.stdout.trim())

    expect(run.exitCode).toBe(0)
    expect(envelope.result.findings).toEqual([])
    expect(envelope.result.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          check: 'link-file',
          repo: 'trade-imports-x'
        }),
        expect.objectContaining({ check: 'link-test', repo: 'trade-imports-x' })
      ])
    )
  }, 60_000)
})

describe('renderLintText', () => {
  test('reports the finding count, each row, and what was skipped', () => {
    const text = renderLintText({
      specRoot: '/ws',
      capabilityCount: 1,
      findings: [
        {
          check: 'rollup',
          capability: 'widgets',
          message: 'REQ-WIDGET-001 is wrong.'
        }
      ],
      skipped: [
        {
          check: 'link-file',
          repo: 'trade-imports-x',
          reason: 'not cloned under repos/'
        }
      ]
    })
    const lines = text.split('\n')

    expect(lines[0]).toBe('1 finding across 1 capability under /ws.')
    expect(lines[1]).toContain('rollup')
    expect(lines[1]).toContain('widgets')
    expect(lines[1]).toContain('REQ-WIDGET-001 is wrong.')
    expect(lines[2]).toBe(
      'Skipped: link-file trade-imports-x: not cloned under repos/'
    )
  })

  test('says nothing was skipped when every linked repo resolved', () => {
    expect(
      renderLintText({
        specRoot: '/ws',
        capabilityCount: 1,
        findings: [],
        skipped: []
      }).split('\n')[1]
    ).toBe('Skipped: none.')
  })

  test('pluralises zero findings across many capabilities', () => {
    expect(
      renderLintText({
        specRoot: '/ws',
        capabilityCount: 72,
        findings: [],
        skipped: []
      }).split('\n')[0]
    ).toBe('0 findings across 72 capabilities under /ws.')
  })
})
