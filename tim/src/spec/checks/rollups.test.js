import { describe, test, expect } from 'vitest'
import {
  derivedScenarioCoverage,
  derivedRequirementCoverage,
  checkScenarioRollup,
  checkRequirementRollup
} from './rollups.js'

describe('derivedScenarioCoverage', () => {
  test('is full when any linked test is full-strength', () => {
    expect(
      derivedScenarioCoverage([{ strength: 'partial' }, { strength: 'full' }])
    ).toBe('full')
  })

  test('is partial when there are links but none full-strength', () => {
    expect(derivedScenarioCoverage([{ strength: 'partial' }])).toBe('partial')
  })

  test('is none when there are no links at all', () => {
    expect(derivedScenarioCoverage([])).toBe('none')
  })
})

describe('derivedRequirementCoverage', () => {
  test('is full only when every scenario is full', () => {
    expect(
      derivedRequirementCoverage([{ coverage: 'full' }, { coverage: 'full' }])
    ).toBe('full')
  })

  test('is none only when every scenario is none', () => {
    expect(
      derivedRequirementCoverage([{ coverage: 'none' }, { coverage: 'none' }])
    ).toBe('none')
  })

  test('is partial for any other mix, including one none among fulls', () => {
    expect(
      derivedRequirementCoverage([{ coverage: 'full' }, { coverage: 'none' }])
    ).toBe('partial')
  })
})

const capability = (requirements) => ({
  path: 'widgets',
  hasCoverage: true,
  coverageParseError: null,
  coverage: {
    capability: 'widgets',
    areaCode: 'WIDGET',
    specFile: 'openspec/specs/widgets/spec.md',
    requirements
  }
})

describe('checkScenarioRollup', () => {
  test('passes a scenario whose stated coverage matches its tests', () => {
    const findings = checkScenarioRollup(
      capability([
        {
          id: 'REQ-WIDGET-001',
          name: 'Widgets spin',
          coverage: 'full',
          scenarios: [
            {
              id: 'SCN-WIDGET-001-A',
              name: 'A widget spins',
              coverage: 'full',
              tests: [
                {
                  type: 'unit',
                  repo: 'x',
                  file: 'a.js',
                  test: 't',
                  strength: 'full'
                }
              ]
            }
          ]
        }
      ])
    )

    expect(findings).toEqual([])
  })

  test('flags a scenario stated full with no full-strength test behind it', () => {
    const findings = checkScenarioRollup(
      capability([
        {
          id: 'REQ-WIDGET-001',
          name: 'Widgets spin',
          coverage: 'full',
          scenarios: [
            {
              id: 'SCN-WIDGET-001-A',
              name: 'A widget spins',
              coverage: 'full',
              tests: [
                {
                  type: 'unit',
                  repo: 'x',
                  file: 'a.js',
                  test: 't',
                  strength: 'partial'
                }
              ]
            }
          ]
        }
      ])
    )

    expect(findings).toEqual([
      expect.objectContaining({
        message: expect.stringContaining('SCN-WIDGET-001-A')
      })
    ])
  })
})

describe('checkRequirementRollup', () => {
  test('flags a requirement stated "none" when one of its scenarios is full', () => {
    const findings = checkRequirementRollup(
      capability([
        {
          id: 'REQ-WIDGET-001',
          name: 'Widgets spin',
          coverage: 'none',
          scenarios: [
            {
              id: 'SCN-WIDGET-001-A',
              name: 'A widget spins',
              coverage: 'full',
              tests: [
                {
                  type: 'unit',
                  repo: 'x',
                  file: 'a.js',
                  test: 't',
                  strength: 'full'
                }
              ]
            }
          ]
        }
      ])
    )

    expect(findings).toEqual([
      expect.objectContaining({
        message: expect.stringContaining('REQ-WIDGET-001')
      })
    ])
  })
})
