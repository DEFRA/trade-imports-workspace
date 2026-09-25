import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseSpecMarkdown, buildCorpus } from './corpus.js'

const SPEC_TEXT = `# Widgets Specification

## Purpose

Widgets.

## Requirements

### Requirement: Widgets spin
**ID**: REQ-WIDGET-001
The system MUST spin every widget. See also REQ-OTHER-001, mentioned only in prose, never on its own **ID**: line.

#### Scenario: A widget spins on load
**ID**: SCN-WIDGET-001-A
- **GIVEN** a widget is shown
- **WHEN** the page loads
- **THEN** the widget spins

#### Scenario: A widget stops on click
**ID**: SCN-WIDGET-001-B
- **GIVEN** a widget is spinning
- **WHEN** the user clicks it
- **THEN** it stops
`

describe('parseSpecMarkdown', () => {
  test('reads each requirement and scenario with its own ID, not a prose mention', () => {
    const requirements = parseSpecMarkdown(SPEC_TEXT)
    const [requirement] = requirements

    expect(requirement.name).toBe('Widgets spin')
    expect(requirement.id).toBe('REQ-WIDGET-001')
    expect(requirements).toHaveLength(1)
    expect(requirements.map((r) => r.id)).not.toContain('REQ-OTHER-001')
    expect(requirement.scenarios).toHaveLength(2)
    expect(requirement.scenarios[0]).toMatchObject({
      name: 'A widget spins on load',
      id: 'SCN-WIDGET-001-A'
    })
  })

  test('keeps a requirement body separate from its scenarios', () => {
    const [requirement] = parseSpecMarkdown(SPEC_TEXT)

    expect(requirement.body).toContain('The system MUST spin every widget')
    expect(requirement.body).not.toContain('GIVEN')
  })

  test('leaves the id null when a requirement has no **ID**: line', () => {
    const [requirement] = parseSpecMarkdown(
      SPEC_TEXT.replace('**ID**: REQ-WIDGET-001\n', '')
    )

    expect(requirement.id).toBeNull()
  })

  test('reads a CRLF-encoded spec.md the same as LF', () => {
    const requirements = parseSpecMarkdown(SPEC_TEXT.replaceAll('\n', '\r\n'))

    expect(requirements).toHaveLength(1)
    expect(requirements[0].id).toBe('REQ-WIDGET-001')
    expect(requirements[0].scenarios).toHaveLength(2)
    expect(requirements[0].scenarios[0].id).toBe('SCN-WIDGET-001-A')
  })
})

let root

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-spec-corpus-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const writeSpec = (capability, text) => {
  const dir = join(root, 'openspec', 'specs', capability)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'spec.md'), text)
}

const writeCoverage = (capability, body) => {
  const dir = join(root, 'openspec', 'coverage', capability)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'coverage.json'), JSON.stringify(body))
}

describe('buildCorpus', () => {
  test('returns an empty capabilities list for a root with no spec.md or coverage.json', () => {
    const corpus = buildCorpus({ root })

    expect(corpus.capabilities).toEqual([])
  })

  test('leaves the missing half null when only coverage.json exists', () => {
    writeCoverage('widgets', { capability: 'widgets' })

    const corpus = buildCorpus({ root })

    expect(corpus.capabilities).toEqual([
      expect.objectContaining({
        path: 'widgets',
        hasSpec: false,
        specText: null,
        hasCoverage: true
      })
    ])
  })

  test('pairs a capability with both a spec.md and a coverage.json', () => {
    writeSpec('widgets', SPEC_TEXT)
    writeCoverage('widgets', { capability: 'widgets' })

    const corpus = buildCorpus({ root })

    expect(corpus.capabilities).toEqual([
      expect.objectContaining({
        path: 'widgets',
        hasSpec: true,
        hasCoverage: true
      })
    ])
  })

  test('leaves the missing half null rather than deciding it is a violation', () => {
    writeSpec('widgets', SPEC_TEXT)

    const corpus = buildCorpus({ root })

    expect(corpus.capabilities).toEqual([
      expect.objectContaining({
        path: 'widgets',
        hasSpec: true,
        hasCoverage: false,
        coverage: null
      })
    ])
  })

  test('captures a coverage.json parse error instead of throwing', () => {
    writeSpec('widgets', SPEC_TEXT)
    const dir = join(root, 'openspec', 'coverage', 'widgets')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'coverage.json'), 'THIS IS NOT JSON {{{')

    const corpus = buildCorpus({ root })

    expect(corpus.capabilities[0].coverage).toBeNull()
    expect(corpus.capabilities[0].coverageParseError).toMatch(/JSON/)
  })

  test('finds a capability nested under a directory of capabilities', () => {
    writeSpec('journey-pages/origin', SPEC_TEXT)
    writeCoverage('journey-pages/origin', {
      capability: 'journey-pages/origin'
    })

    const corpus = buildCorpus({ root })

    expect(corpus.capabilities.map((entry) => entry.path)).toEqual([
      'journey-pages/origin'
    ])
  })
})
