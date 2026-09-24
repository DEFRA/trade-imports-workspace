import { describe, test, expect } from 'vitest'
import {
  checkIdsPresent,
  checkIdParity,
  checkNameParity,
  checkGlobalIdUniqueness
} from './ids.js'

const requirement = (overrides = {}) => ({
  name: 'Widgets spin',
  id: 'REQ-WIDGET-001',
  body: '',
  scenarios: [
    { name: 'A widget spins on load', id: 'SCN-WIDGET-001-A', body: '' }
  ],
  ...overrides
})

const coverage = (overrides = {}) => ({
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
          tests: []
        }
      ]
    }
  ],
  ...overrides
})

const capability = ({ requirements, cov } = {}) => ({
  path: 'widgets',
  hasSpec: true,
  hasCoverage: true,
  coverageParseError: null,
  requirements: requirements ?? [requirement()],
  coverage: cov ?? coverage()
})

describe('checkIdsPresent', () => {
  test('passes when every requirement and scenario has an id', () => {
    expect(checkIdsPresent(capability())).toEqual([])
  })

  test('flags a requirement with no **ID**: line', () => {
    const findings = checkIdsPresent(
      capability({ requirements: [requirement({ id: null })] })
    )

    expect(findings).toEqual([
      expect.objectContaining({
        message: expect.stringContaining('has no **ID**:')
      })
    ])
  })

  test('flags a scenario with no **ID**: line', () => {
    const findings = checkIdsPresent(
      capability({
        requirements: [
          requirement({
            scenarios: [{ name: 'A widget spins on load', id: null, body: '' }]
          })
        ]
      })
    )

    expect(findings).toEqual([
      expect.objectContaining({ message: expect.stringContaining('scenario') })
    ])
  })
})

describe('checkIdParity', () => {
  test('passes when spec and coverage declare the same ids', () => {
    expect(checkIdParity(capability())).toEqual([])
  })

  test('flags an id coverage.json has but spec.md no longer does', () => {
    const findings = checkIdParity(
      capability({
        cov: coverage({
          requirements: [
            { ...coverage().requirements[0], id: 'REQ-WIDGET-999' }
          ]
        })
      })
    )

    expect(
      findings.some((f) =>
        f.message.includes(
          'REQ-WIDGET-001 is in spec.md but has no coverage.json entry'
        )
      )
    ).toBe(true)
    expect(
      findings.some((f) =>
        f.message.includes(
          'REQ-WIDGET-999 is in coverage.json but not in spec.md'
        )
      )
    ).toBe(true)
  })
})

describe('checkNameParity', () => {
  test('passes when a name matches verbatim', () => {
    expect(checkNameParity(capability())).toEqual([])
  })

  test('flags a coverage.json name that drifted from the spec.md heading', () => {
    const drifted = coverage()
    drifted.requirements[0].scenarios[0].name = 'A widget spins'

    const findings = checkNameParity(capability({ cov: drifted }))

    expect(findings).toEqual([
      expect.objectContaining({
        message: expect.stringContaining(
          'does not match spec.md\'s "A widget spins on load"'
        )
      })
    ])
  })
})

describe('checkGlobalIdUniqueness', () => {
  test('passes a corpus with no duplicated ids', () => {
    expect(checkGlobalIdUniqueness([capability()])).toEqual([])
  })

  test('flags an id duplicated within one capability, once', () => {
    const duplicated = requirement({
      scenarios: [
        { name: 'A widget spins on load', id: 'SCN-WIDGET-001-A', body: '' },
        { name: 'The create page is retired', id: 'SCN-WIDGET-001-A', body: '' }
      ]
    })

    const findings = checkGlobalIdUniqueness([
      capability({ requirements: [duplicated] })
    ])

    expect(findings).toEqual([
      expect.objectContaining({
        capability: 'widgets',
        message: expect.stringContaining('SCN-WIDGET-001-A is used 2 times')
      })
    ])
  })

  test('flags an id duplicated across two different capabilities, once per capability', () => {
    const other = { ...capability(), path: 'gadgets' }

    const findings = checkGlobalIdUniqueness([capability(), other])

    expect(new Set(findings.map((f) => f.capability))).toEqual(
      new Set(['gadgets', 'widgets'])
    )
    expect(
      findings.every(
        (f) =>
          f.message.includes('also in: gadgets') ||
          f.message.includes('also in: widgets')
      )
    ).toBe(true)
  })
})
