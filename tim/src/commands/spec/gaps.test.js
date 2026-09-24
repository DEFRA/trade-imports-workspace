import { describe, test, expect, afterEach } from 'vitest'
import { execa } from 'execa'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderGapsText } from './gaps.js'

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
  test('reports the gap with its verbatim note', async () => {
    seedWorkspace()

    const run = await runTim(['spec', 'gaps', '--json'])
    const envelope = JSON.parse(run.stdout.trim())

    expect(run.exitCode).toBe(0)
    expect(envelope.result.noneCount).toBe(1)
    expect(envelope.result.rows[0]).toMatchObject({
      id: 'SCN-WIDGET-001-A',
      notes: 'GAP: nothing witnesses this yet.'
    })
  })

  test('--capability scopes to one capability', async () => {
    seedWorkspace()

    const run = await runTim([
      'spec',
      'gaps',
      '--capability',
      'widgets',
      '--json'
    ])
    const envelope = JSON.parse(run.stdout.trim())

    expect(run.exitCode).toBe(0)
    expect(envelope.result.rows).toHaveLength(1)
  })

  test('--partial with a none-only corpus reports zero rows', async () => {
    seedWorkspace()

    const run = await runTim(['spec', 'gaps', '--partial', '--json'])
    const envelope = JSON.parse(run.stdout.trim())

    expect(run.exitCode).toBe(0)
    expect(envelope.result.rows).toEqual([])
  })
})

describe('renderGapsText', () => {
  test('reports the counts and each row with its note indented below', () => {
    const text = renderGapsText({
      noneCount: 1,
      partialCount: 0,
      scenarioCount: 1,
      rows: [
        {
          id: 'SCN-WIDGET-001-A',
          name: 'A widget spins on load',
          capability: 'widgets',
          coverage: 'none',
          notes: 'GAP: nothing witnesses this yet.'
        }
      ]
    })
    const lines = text.split('\n')

    expect(lines[0]).toBe('1 none, 0 partial, of 1 scenarios in scope.')
    expect(lines[1]).toContain('none')
    expect(lines[1]).toContain('SCN-WIDGET-001-A')
    expect(lines[1]).toContain('widgets')
    expect(lines[1]).toContain('A widget spins on load')
    expect(lines[2]).toContain('GAP: nothing witnesses this yet.')
  })

  test('omits the note line when there are no notes', () => {
    const text = renderGapsText({
      noneCount: 1,
      partialCount: 0,
      scenarioCount: 1,
      rows: [
        {
          id: 'SCN-WIDGET-001-A',
          name: 'A widget spins on load',
          capability: 'widgets',
          coverage: 'none',
          notes: ''
        }
      ]
    })

    expect(text.split('\n')).toHaveLength(2)
  })
})
