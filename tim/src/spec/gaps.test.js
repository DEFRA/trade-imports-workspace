import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { findClusters, computeSpecGaps, matchesGapNarrowing } from './gaps.js'

describe('matchesGapNarrowing', () => {
  test('with neither flag, keeps every non-full row', () => {
    expect(matchesGapNarrowing({ coverage: 'none' }, false, false)).toBe(true)
    expect(matchesGapNarrowing({ coverage: 'partial' }, false, false)).toBe(
      true
    )
  })

  test('--none alone keeps only none', () => {
    expect(matchesGapNarrowing({ coverage: 'none' }, true, false)).toBe(true)
    expect(matchesGapNarrowing({ coverage: 'partial' }, true, false)).toBe(
      false
    )
  })

  test('--partial alone keeps only partial', () => {
    expect(matchesGapNarrowing({ coverage: 'none' }, false, true)).toBe(false)
    expect(matchesGapNarrowing({ coverage: 'partial' }, false, true)).toBe(
      true
    )
  })

  test('--none and --partial together keep both (union)', () => {
    expect(matchesGapNarrowing({ coverage: 'none' }, true, true)).toBe(true)
    expect(matchesGapNarrowing({ coverage: 'partial' }, true, true)).toBe(true)
  })
})

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

  test('--none lists only coverage-none rows', async () => {
    writeFileSync(
      join(root, 'openspec', 'coverage', 'b', 'coverage.json'),
      JSON.stringify({
        capability: 'b',
        areaCode: 'B',
        specFile: 'openspec/specs/b/spec.md',
        requirements: [
          {
            id: 'REQ-B-001',
            name: 'B does a thing',
            coverage: 'partial',
            scenarios: [
              {
                id: 'SCN-B-001-A',
                name: 'A different claim',
                coverage: 'partial',
                tests: [
                  {
                    type: 'unit',
                    repo: 'x',
                    file: 'b.test.js',
                    test: 't',
                    strength: 'partial'
                  }
                ],
                notes: 'partial only'
              }
            ]
          }
        ]
      })
    )

    const noneOnly = await computeSpecGaps({
      workspaceRoot: root,
      none: true
    })
    expect(noneOnly.rows.every((row) => row.coverage === 'none')).toBe(true)
    expect(noneOnly.rows).toHaveLength(1)

    const both = await computeSpecGaps({
      workspaceRoot: root,
      none: true,
      partial: true
    })
    expect(both.rows).toHaveLength(2)

    const partialOnly = await computeSpecGaps({
      workspaceRoot: root,
      partial: true
    })
    expect(partialOnly.rows.every((row) => row.coverage === 'partial')).toBe(
      true
    )
    expect(partialOnly.rows).toHaveLength(1)
  })

  test('staleness carries daysAgo when baseline.json is present', async () => {
    writeFileSync(
      join(root, 'openspec', 'baseline.json'),
      JSON.stringify({
        verifiedAt: '2026-09-16',
        verifiedBy: 'abc',
        repos: {}
      })
    )

    const result = await computeSpecGaps({ workspaceRoot: root })

    expect(result.staleness.verifiedAt).toBe('2026-09-16')
    expect(typeof result.staleness.daysAgo).toBe('number')
    expect(result.staleness.daysAgo).toBeGreaterThanOrEqual(0)
  })
})
