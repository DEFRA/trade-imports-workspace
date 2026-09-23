import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { findClusters, computeSpecGaps } from './gaps.js'

describe('findClusters', () => {
  test('groups scenarios that share an identical name across capabilities', () => {
    const rows = [
      { id: 'SCN-A', name: 'Sections run in a fixed order', notes: '' },
      { id: 'SCN-B', name: 'Sections run in a fixed order', notes: '' },
      { id: 'SCN-C', name: 'Something else entirely', notes: '' }
    ]

    const clusters = findClusters(rows)

    const groups = [...clusters.values()].map((ids) => ids.sort())
    expect(groups).toContainEqual(['SCN-A', 'SCN-B'])
    expect(groups).toContainEqual(['SCN-C'])
  })

  test('groups a scenario whose notes explicitly name another non-full scenario', () => {
    const rows = [
      {
        id: 'SCN-X',
        name: 'first claim',
        notes: 'GAP: nothing witnesses this'
      },
      {
        id: 'SCN-Y',
        name: 'second claim',
        notes: 'same hole SCN-X already records'
      }
    ]

    const clusters = findClusters(rows)

    expect(clusters.size).toBe(1)
  })

  test('leaves unrelated scenarios in their own clusters', () => {
    const rows = [
      { id: 'SCN-X', name: 'a', notes: '' },
      { id: 'SCN-Y', name: 'b', notes: '' }
    ]

    expect(findClusters(rows).size).toBe(2)
  })
})

let root

const CAPABILITY_A_SPEC = `# A Specification

## Purpose

Capability A.

## Requirements

### Requirement: A does a thing
**ID**: REQ-A-001
The system MUST do a thing.

#### Scenario: Sections run in a fixed order
**ID**: SCN-A-001-A
- **GIVEN** a
- **WHEN** b
- **THEN** c
`

const CAPABILITY_B_SPEC = `# B Specification

## Purpose

Capability B.

## Requirements

### Requirement: B does a thing
**ID**: REQ-B-001
The system MUST do a thing.

#### Scenario: Sections run in a fixed order
**ID**: SCN-B-001-A
- **GIVEN** a
- **WHEN** b
- **THEN** c
`

const noneCoverage = (capability, areaCode, id, name, notes) => ({
  capability,
  areaCode,
  specFile: `openspec/specs/${capability}/spec.md`,
  requirements: [
    {
      id: `REQ-${areaCode}-001`,
      name: `${areaCode} does a thing`,
      coverage: 'none',
      scenarios: [{ id, name, coverage: 'none', tests: [], notes }]
    }
  ]
})

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-spec-gaps-'))
  mkdirSync(join(root, 'openspec', 'specs', 'a'), { recursive: true })
  mkdirSync(join(root, 'openspec', 'specs', 'b'), { recursive: true })
  mkdirSync(join(root, 'openspec', 'coverage', 'a'), { recursive: true })
  mkdirSync(join(root, 'openspec', 'coverage', 'b'), { recursive: true })
  writeFileSync(
    join(root, 'openspec', 'specs', 'a', 'spec.md'),
    CAPABILITY_A_SPEC
  )
  writeFileSync(
    join(root, 'openspec', 'specs', 'b', 'spec.md'),
    CAPABILITY_B_SPEC
  )
  writeFileSync(
    join(root, 'openspec', 'coverage', 'a', 'coverage.json'),
    JSON.stringify(
      noneCoverage(
        'a',
        'A',
        'SCN-A-001-A',
        'Sections run in a fixed order',
        'GAP: nothing witnesses this'
      )
    )
  )
  writeFileSync(
    join(root, 'openspec', 'coverage', 'b', 'coverage.json'),
    JSON.stringify(
      noneCoverage(
        'b',
        'B',
        'SCN-B-001-A',
        'Sections run in a fixed order',
        'GAP: same hole in this service too'
      )
    )
  )
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('computeSpecGaps', () => {
  test('collapses the same-named gap in two capabilities into one row', async () => {
    const result = await computeSpecGaps({ workspaceRoot: root })

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].ids.sort()).toEqual(['SCN-A-001-A', 'SCN-B-001-A'])
    expect(result.rows[0].capabilities.sort()).toEqual(['a', 'b'])
    expect(result.noneCount).toBe(2)
    expect(result.partialCount).toBe(0)
  })

  test('renders the existing notes verbatim rather than re-deriving anything', async () => {
    const result = await computeSpecGaps({ workspaceRoot: root })

    expect(result.rows[0].notes).toEqual(
      expect.arrayContaining([
        'GAP: nothing witnesses this',
        'GAP: same hole in this service too'
      ])
    )
  })

  test('--scenario finds one scenario by id regardless of coverage state', async () => {
    const result = await computeSpecGaps({
      workspaceRoot: root,
      scenario: 'SCN-A-001-A'
    })

    expect(result.scenario.id).toBe('SCN-A-001-A')
  })

  test('--scenario raises NOT_FOUND for an unknown id', async () => {
    await expect(
      computeSpecGaps({ workspaceRoot: root, scenario: 'SCN-NOPE-001-A' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  test('--capability scopes to one capability and its descendants', async () => {
    const result = await computeSpecGaps({
      workspaceRoot: root,
      capability: 'a'
    })

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].capabilities).toEqual(['a'])
  })

  test('--unitOnly lists a scenario whose only full witness is a unit test', async () => {
    writeFileSync(
      join(root, 'openspec', 'coverage', 'a', 'coverage.json'),
      JSON.stringify({
        capability: 'a',
        areaCode: 'A',
        specFile: 'openspec/specs/a/spec.md',
        requirements: [
          {
            id: 'REQ-A-001',
            name: 'A does a thing',
            coverage: 'full',
            scenarios: [
              {
                id: 'SCN-A-001-A',
                name: 'Sections run in a fixed order',
                coverage: 'full',
                tests: [
                  {
                    type: 'unit',
                    repo: 'x',
                    file: 'a.test.js',
                    test: 't',
                    strength: 'full'
                  }
                ]
              }
            ]
          }
        ]
      })
    )

    const result = await computeSpecGaps({
      workspaceRoot: root,
      unitOnly: true,
      capability: 'a'
    })

    expect(result.unitOnly.map((row) => row.id)).toEqual(['SCN-A-001-A'])
  })
})
