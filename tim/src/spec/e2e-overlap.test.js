import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { computeE2eOverlap } from './e2e-overlap.js'

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

#### Scenario: A widget only an e2e test proves
**ID**: SCN-WIDGET-001-B
- **GIVEN** a widget is shown
- **WHEN** the browser navigates away and back
- **THEN** the widget still spins
`

const e2eTest = (test, notes = '') => ({
  type: 'e2e',
  repo: 'trade-imports-x',
  file: 'tests/e2e/widget.spec.ts',
  test,
  strength: 'full',
  notes
})

const fitTest = () => ({
  type: 'fit',
  repo: 'trade-imports-y',
  file: 'fit/widget.fit.spec.js',
  test: 'spins',
  strength: 'full'
})

const coverage = () => ({
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
          tests: [e2eTest('shadowed everywhere'), fitTest()]
        },
        {
          id: 'SCN-WIDGET-001-B',
          name: 'A widget only an e2e test proves',
          coverage: 'full',
          tests: [e2eTest('sole witness of browser behaviour')]
        }
      ]
    }
  ]
})

let root

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-spec-e2e-overlap-'))
  mkdirSync(join(root, 'openspec', 'specs', 'widgets'), { recursive: true })
  mkdirSync(join(root, 'openspec', 'coverage', 'widgets'), { recursive: true })
  writeFileSync(
    join(root, 'openspec', 'specs', 'widgets', 'spec.md'),
    SPEC_TEXT
  )
  writeFileSync(
    join(root, 'openspec', 'coverage', 'widgets', 'coverage.json'),
    JSON.stringify(coverage())
  )
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('computeE2eOverlap', () => {
  test('counts every distinct e2e test once', () => {
    const result = computeE2eOverlap({ workspaceRoot: root })

    expect(result.totalDistinctE2eTests).toBe(2)
  })

  test('lists an e2e test whose only scenario also has a full fit witness', () => {
    const result = computeE2eOverlap({ workspaceRoot: root })

    expect(result.overlapping.map((row) => row.test)).toEqual([
      'shadowed everywhere'
    ])
  })

  test('excludes an e2e test that is the sole witness of any scenario', () => {
    const result = computeE2eOverlap({ workspaceRoot: root })

    expect(result.overlappingCount).toBe(1)
    expect(result.overlapping.map((row) => row.test)).not.toContain(
      'sole witness of browser behaviour'
    )
  })

  test('states the overlap-is-not-grounds-for-deletion guidance', () => {
    const result = computeE2eOverlap({ workspaceRoot: root })

    expect(result.guidance).toContain('not grounds for deletion')
    expect(result.guidance).toContain('risk-based-testing.md')
  })

  test('keeps an e2e test off the shortlist when it witnesses one shadowed and one sole scenario', () => {
    const both = {
      ...coverage(),
      requirements: [
        {
          ...coverage().requirements[0],
          scenarios: [
            {
              id: 'SCN-WIDGET-001-A',
              name: 'A widget spins on load',
              coverage: 'full',
              tests: [e2eTest('shared test'), fitTest()]
            },
            {
              id: 'SCN-WIDGET-001-B',
              name: 'A widget only an e2e test proves',
              coverage: 'full',
              tests: [e2eTest('shared test')]
            }
          ]
        }
      ]
    }
    writeFileSync(
      join(root, 'openspec', 'coverage', 'widgets', 'coverage.json'),
      JSON.stringify(both)
    )

    const result = computeE2eOverlap({ workspaceRoot: root })

    expect(result.overlapping.map((row) => row.test)).not.toContain(
      'shared test'
    )
  })

  test('--capability scopes the corpus scanned', () => {
    const result = computeE2eOverlap({
      workspaceRoot: root,
      capability: 'gadgets'
    })

    expect(result.totalDistinctE2eTests).toBe(0)
  })
})
