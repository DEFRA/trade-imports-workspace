import { describe, test, expect, afterEach } from 'vitest'
import { execa } from 'execa'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

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

const noneCoverage = () => ({
  capability: 'widgets',
  areaCode: 'WIDGET',
  specFile: 'openspec/specs/widgets/spec.md',
  requirements: [
    {
      id: 'REQ-WIDGET-001',
      name: 'Widgets spin',
      coverage: 'none',
      scenarios: [
        {
          id: 'SCN-WIDGET-001-A',
          name: 'A widget spins on load',
          coverage: 'none',
          tests: [],
          notes: 'GAP: nothing witnesses this yet.'
        }
      ]
    }
  ]
})

let root

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
})

const seedWorkspace = () => {
  root = mkdtempSync(join(tmpdir(), 'tim-spec-gaps-cli-'))
  writeFileSync(join(root, 'Makefile'), 'all:\n')
  mkdirSync(join(root, 'repos'), { recursive: true })
  mkdirSync(join(root, 'openspec', 'specs', 'widgets'), { recursive: true })
  mkdirSync(join(root, 'openspec', 'coverage', 'widgets'), { recursive: true })
  writeFileSync(
    join(root, 'openspec', 'specs', 'widgets', 'spec.md'),
    SPEC_TEXT
  )
  writeFileSync(
    join(root, 'openspec', 'coverage', 'widgets', 'coverage.json'),
    JSON.stringify(noneCoverage())
  )
}

const runTim = (args) =>
  execa('node', [cliPath, ...args, '--workspace', root], {
    reject: false,
    env: { TIM_NO_AUTO_PULL: '1' }
  })

describe('tim spec gaps', () => {
  test('reports the gap with its verbatim note, and no baseline warning', async () => {
    seedWorkspace()

    const run = await runTim(['spec', 'gaps', '--json'])
    const envelope = JSON.parse(run.stdout.trim())

    expect(run.exitCode).toBe(0)
    expect(envelope.result.noneCount).toBe(1)
    expect(envelope.result.rows[0]).toMatchObject({
      ids: ['SCN-WIDGET-001-A'],
      notes: ['GAP: nothing witnesses this yet.']
    })
    expect(envelope.result.staleness).toBeNull()
  })

  test('--scenario looks up one scenario by id', async () => {
    seedWorkspace()

    const run = await runTim([
      'spec',
      'gaps',
      '--scenario',
      'SCN-WIDGET-001-A',
      '--json'
    ])
    const envelope = JSON.parse(run.stdout.trim())

    expect(run.exitCode).toBe(0)
    expect(envelope.result.scenario.id).toBe('SCN-WIDGET-001-A')
  })

  test('exits with USAGE when --unit-only and --scenario are both given', async () => {
    seedWorkspace()

    const run = await runTim([
      'spec',
      'gaps',
      '--unit-only',
      '--scenario',
      'SCN-WIDGET-001-A'
    ])

    expect(run.exitCode).toBe(2)
    expect(run.stderr).toContain('cannot both be given')
  })

  test('exits with USAGE when --partial and --unit-only are both given', async () => {
    seedWorkspace()

    const run = await runTim(['spec', 'gaps', '--partial', '--unit-only'])

    expect(run.exitCode).toBe(2)
    expect(run.stderr).toContain('replaces it')
  })

  test('exits with USAGE when --none and --scenario are both given', async () => {
    seedWorkspace()

    const run = await runTim([
      'spec',
      'gaps',
      '--none',
      '--scenario',
      'SCN-WIDGET-001-A'
    ])

    expect(run.exitCode).toBe(2)
    expect(run.stderr).toContain('replaces it')
  })
})
