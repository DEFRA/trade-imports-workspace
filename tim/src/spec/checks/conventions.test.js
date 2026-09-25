import { describe, test, expect } from 'vitest'
import {
  checkThenPresent,
  checkNoShall,
  findCrossReferences,
  checkCrossReferences
} from './conventions.js'

const capability = ({ requirements, specText } = {}) => ({
  path: 'widgets',
  hasSpec: true,
  requirements: requirements ?? [
    {
      name: 'Widgets spin',
      id: 'REQ-WIDGET-001',
      body: 'The system MUST spin every widget.',
      scenarios: [
        {
          name: 'A widget spins',
          id: 'SCN-WIDGET-001-A',
          body: '- **GIVEN** a widget\n- **WHEN** it loads\n- **THEN** it spins'
        }
      ]
    }
  ],
  specText: specText ?? ''
})

describe('checkThenPresent', () => {
  test('passes a scenario with a - **THEN** line', () => {
    expect(checkThenPresent(capability())).toEqual([])
  })

  test('flags a scenario with no THEN at all', () => {
    const findings = checkThenPresent(
      capability({
        requirements: [
          {
            name: 'Widgets spin',
            id: 'REQ-WIDGET-001',
            body: '',
            scenarios: [
              {
                name: 'A widget spins',
                id: 'SCN-WIDGET-001-A',
                body: '- **GIVEN** a widget\n- **WHEN** it loads'
              }
            ]
          }
        ]
      })
    )

    expect(findings).toEqual([
      expect.objectContaining({
        message: expect.stringContaining('no - **THEN** line')
      })
    ])
  })
})

describe('checkNoShall', () => {
  test('passes a requirement body written with MUST', () => {
    expect(checkNoShall(capability())).toEqual([])
  })

  test('flags SHALL as a whole word', () => {
    const findings = checkNoShall(
      capability({
        requirements: [
          {
            name: 'Widgets spin',
            id: 'REQ-WIDGET-001',
            body: 'The system SHALL spin every widget.',
            scenarios: []
          }
        ]
      })
    )

    expect(findings).toEqual([
      expect.objectContaining({
        message: expect.stringContaining('uses SHALL instead of MUST')
      })
    ])
  })
})

describe('findCrossReferences', () => {
  test('finds a backticked, slash-separated capability path', () => {
    expect(
      findCrossReferences('See `live-animals/addresses` for the rest.')
    ).toEqual(['live-animals/addresses'])
  })

  test('ignores backticked text with no slash', () => {
    expect(findCrossReferences('Run `npm test` first.')).toEqual([])
  })

  test('dedupes a reference mentioned more than once', () => {
    expect(
      findCrossReferences(
        '`live-animals/addresses` then again `live-animals/addresses`'
      )
    ).toEqual(['live-animals/addresses'])
  })
})

describe('checkCrossReferences', () => {
  test('passes a cross-reference that resolves to a real capability', () => {
    const findings = checkCrossReferences(
      capability({ specText: 'See `live-animals/addresses` for the rest.' }),
      new Set(['live-animals/addresses'])
    )

    expect(findings).toEqual([])
  })

  test('flags a cross-reference to a capability that does not exist', () => {
    const findings = checkCrossReferences(
      capability({ specText: 'See `live-animals/gone` for the rest.' }),
      new Set(['live-animals/addresses'])
    )

    expect(findings).toEqual([
      expect.objectContaining({
        message: expect.stringContaining(
          '`live-animals/gone` in spec.md does not resolve'
        )
      })
    ])
  })
})
