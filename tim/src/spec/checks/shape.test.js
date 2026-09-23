import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  checkCoverageShape,
  checkNoneHasNotes,
  checkAreaCodeAndSpecFile,
  readAreasTable
} from './shape.js'

const VALID_COVERAGE = {
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
}

const capabilityWithCoverage = (coverage, overrides = {}) => ({
  path: 'widgets',
  hasSpec: true,
  hasCoverage: true,
  coverage,
  coverageParseError: null,
  ...overrides
})

describe('checkCoverageShape', () => {
  test('reports nothing for a well-formed coverage.json', () => {
    expect(checkCoverageShape(capabilityWithCoverage(VALID_COVERAGE))).toEqual(
      []
    )
  })

  test('reports a bad type enum value', () => {
    const broken = {
      ...VALID_COVERAGE,
      requirements: [
        {
          ...VALID_COVERAGE.requirements[0],
          scenarios: [
            {
              ...VALID_COVERAGE.requirements[0].scenarios[0],
              tests: [
                {
                  ...VALID_COVERAGE.requirements[0].scenarios[0].tests[0],
                  type: 'browser'
                }
              ]
            }
          ]
        }
      ]
    }

    const findings = checkCoverageShape(capabilityWithCoverage(broken))

    expect(findings).toHaveLength(1)
    expect(findings[0].capability).toBe('widgets')
  })

  test('reports a captured JSON parse error rather than throwing', () => {
    const findings = checkCoverageShape(
      capabilityWithCoverage(null, { coverageParseError: 'Unexpected token' })
    )

    expect(findings).toEqual([
      expect.objectContaining({
        message: expect.stringContaining('not valid JSON')
      })
    ])
  })

  test('has nothing to say about a capability with no coverage.json', () => {
    expect(
      checkCoverageShape({ path: 'widgets', hasSpec: true, hasCoverage: false })
    ).toEqual([])
  })
})

describe('checkNoneHasNotes', () => {
  test('flags a "none" scenario with no notes', () => {
    const withGap = {
      ...VALID_COVERAGE,
      requirements: [
        {
          ...VALID_COVERAGE.requirements[0],
          scenarios: [
            {
              ...VALID_COVERAGE.requirements[0].scenarios[0],
              coverage: 'none',
              tests: []
            }
          ]
        }
      ]
    }

    const findings = checkNoneHasNotes(capabilityWithCoverage(withGap))

    expect(findings).toEqual([
      expect.objectContaining({ message: expect.stringContaining('no notes') })
    ])
  })

  test('passes a "none" scenario that carries a note', () => {
    const withNote = {
      ...VALID_COVERAGE,
      requirements: [
        {
          ...VALID_COVERAGE.requirements[0],
          scenarios: [
            {
              ...VALID_COVERAGE.requirements[0].scenarios[0],
              coverage: 'none',
              tests: [],
              notes: 'GAP: checked every tier, nothing witnesses this.'
            }
          ]
        }
      ]
    }

    expect(checkNoneHasNotes(capabilityWithCoverage(withNote))).toEqual([])
  })
})

let root

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-spec-shape-'))
  mkdirSync(join(root, 'openspec', 'coverage'), { recursive: true })
  writeFileSync(
    join(root, 'openspec', 'coverage', 'AREAS.md'),
    ['| Capability | Area code |', '|---|---|', '| widgets | WIDGET |'].join(
      '\n'
    )
  )
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('readAreasTable', () => {
  test('maps each capability to its area code', () => {
    expect(readAreasTable(root).get('widgets')).toBe('WIDGET')
  })
})

describe('checkAreaCodeAndSpecFile', () => {
  test('passes a coverage.json whose areaCode and specFile both match', () => {
    const areasTable = readAreasTable(root)

    expect(
      checkAreaCodeAndSpecFile(
        capabilityWithCoverage(VALID_COVERAGE),
        areasTable
      )
    ).toEqual([])
  })

  test('flags an areaCode that drifted from AREAS.md', () => {
    const areasTable = readAreasTable(root)
    const wrongArea = { ...VALID_COVERAGE, areaCode: 'WRONG' }

    const findings = checkAreaCodeAndSpecFile(
      capabilityWithCoverage(wrongArea),
      areasTable
    )

    expect(findings).toEqual([
      expect.objectContaining({
        message: expect.stringContaining('does not match AREAS.md')
      })
    ])
  })

  test('flags a specFile that is not openspec/-relative to this capability', () => {
    const areasTable = readAreasTable(root)
    const wrongPath = {
      ...VALID_COVERAGE,
      specFile: 'openspec/specs/wrong/spec.md'
    }

    const findings = checkAreaCodeAndSpecFile(
      capabilityWithCoverage(wrongPath),
      areasTable
    )

    expect(findings).toEqual([
      expect.objectContaining({ message: expect.stringContaining('specFile') })
    ])
  })

  test('flags a capability AREAS.md has no row for', () => {
    const areasTable = readAreasTable(root)
    const orphan = capabilityWithCoverage(
      { ...VALID_COVERAGE, specFile: 'openspec/specs/gadgets/spec.md' },
      { path: 'gadgets' }
    )

    const findings = checkAreaCodeAndSpecFile(orphan, areasTable)

    expect(findings).toEqual([
      expect.objectContaining({
        message: expect.stringContaining('AREAS.md has no row')
      })
    ])
  })
})
