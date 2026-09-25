import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { computeSpecGaps, matchesGapNarrowing } from './gaps.js'

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
    expect(matchesGapNarrowing({ coverage: 'partial' }, false, true)).toBe(true)
  })

  test('--none and --partial together keep both (union)', () => {
    expect(matchesGapNarrowing({ coverage: 'none' }, true, true)).toBe(true)
    expect(matchesGapNarrowing({ coverage: 'partial' }, true, true)).toBe(true)
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

#### Scenario: A scenario nothing witnesses
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

#### Scenario: A different claim
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
        'A scenario nothing witnesses',
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
        'A different claim',
        'GAP: same hole in this service too'
      )
    )
  )
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('computeSpecGaps', () => {
  test('lists every non-full scenario, risk-ordered none before partial', async () => {
    const result = await computeSpecGaps({ workspaceRoot: root })

    expect(result.rows.map((row) => row.id)).toEqual([
      'SCN-A-001-A',
      'SCN-B-001-A'
    ])
    expect(result.noneCount).toBe(2)
    expect(result.partialCount).toBe(0)
    expect(result.scenarioCount).toBe(2)
  })

  test('renders the existing notes verbatim rather than re-deriving anything', async () => {
    const result = await computeSpecGaps({ workspaceRoot: root })

    expect(result.rows[0].notes).toBe('GAP: nothing witnesses this')
  })

  test('--capability scopes to one capability and its descendants', async () => {
    const result = await computeSpecGaps({
      workspaceRoot: root,
      capability: 'a'
    })

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].capability).toBe('a')
  })

  test('raises NOT_FOUND for a --capability the corpus does not have', async () => {
    await expect(
      computeSpecGaps({ workspaceRoot: root, capability: 'does-not-exist' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  test('--capability includes a nested descendant capability', async () => {
    mkdirSync(join(root, 'openspec', 'specs', 'a', 'child'), {
      recursive: true
    })
    mkdirSync(join(root, 'openspec', 'coverage', 'a', 'child'), {
      recursive: true
    })
    writeFileSync(
      join(root, 'openspec', 'specs', 'a', 'child', 'spec.md'),
      `# A Child Specification

## Purpose

Capability A's child.

## Requirements

### Requirement: The child does a thing
**ID**: REQ-A-CHILD-001
The system MUST do a thing.

#### Scenario: A child scenario nothing witnesses
**ID**: SCN-A-CHILD-001-A
- **GIVEN** a
- **WHEN** b
- **THEN** c
`
    )
    writeFileSync(
      join(root, 'openspec', 'coverage', 'a', 'child', 'coverage.json'),
      JSON.stringify(
        noneCoverage(
          'a/child',
          'A-CHILD',
          'SCN-A-CHILD-001-A',
          'A child scenario nothing witnesses',
          'GAP: nothing witnesses this either'
        )
      )
    )

    const result = await computeSpecGaps({
      workspaceRoot: root,
      capability: 'a'
    })

    expect(result.rows.map((row) => row.capability).sort()).toEqual([
      'a',
      'a/child'
    ])
  })

  test('sorts none before partial when both are present', async () => {
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

    const result = await computeSpecGaps({ workspaceRoot: root })

    expect(result.rows.map((row) => row.id)).toEqual([
      'SCN-A-001-A',
      'SCN-B-001-A'
    ])
    expect(result.rows.map((row) => row.coverage)).toEqual(['none', 'partial'])
  })

  test('returns zero counts and no rows for an empty corpus', async () => {
    const emptyRoot = mkdtempSync(join(tmpdir(), 'tim-spec-gaps-empty-'))

    const result = await computeSpecGaps({ workspaceRoot: emptyRoot })

    expect(result).toEqual({
      noneCount: 0,
      partialCount: 0,
      scenarioCount: 0,
      rows: []
    })
  })

  test('--none / --partial narrow the gap list, unioned when both are given', async () => {
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

    const noneOnly = await computeSpecGaps({ workspaceRoot: root, none: true })
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

  test('leaves a full scenario out of the count and the rows', async () => {
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
                name: 'A scenario nothing witnesses',
                coverage: 'full',
                tests: [
                  {
                    type: 'fit',
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

    const result = await computeSpecGaps({ workspaceRoot: root })

    expect(result.rows.map((row) => row.id)).toEqual(['SCN-B-001-A'])
    expect(result.scenarioCount).toBe(2)
  })
})
