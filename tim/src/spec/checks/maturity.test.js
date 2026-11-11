import { describe, test, expect } from 'vitest'
import { parseSpecMarkdown } from '../corpus.js'
import { checkMaturityLine, checkSignedOffMarks } from './maturity.js'

const specText = ({
  purpose = '',
  scenarioMeta = '',
  requirementMeta = ''
} = {}) =>
  `# Origin Page Specification

## Purpose

${purpose}The page asks where the consignment comes from.

## Requirements

### Requirement: The page asks for the country of origin
**ID**: REQ-ORIGIN-001
${requirementMeta}The system MUST ask for the country of origin.

#### Scenario: The page shows the country question
**ID**: SCN-ORIGIN-001-A
${scenarioMeta}- **GIVEN** the user is on the origin page
- **WHEN** the page loads
- **THEN** it asks for the country of origin
`

const capabilityAt = (path, text) => ({
  path,
  hasSpec: true,
  specText: text,
  requirements: parseSpecMarkdown(text)
})

const messagesOf = (findings) => findings.map((finding) => finding.message)

describe('checkMaturityLine', () => {
  test('passes a page spec with a valid Maturity line under Purpose', () => {
    const capability = capabilityAt(
      'plants/journey-pages/origin',
      specText({ purpose: '**Maturity**: exploring\n\n' })
    )

    expect(checkMaturityLine(capability)).toEqual([])
  })

  test('passes every maturity level', () => {
    const levels = ['exploring', 'detailing', 'agreed', 'readyForLive']

    const findings = levels.flatMap((level) =>
      checkMaturityLine(
        capabilityAt(
          'live-animals/journey-pages/origin',
          specText({ purpose: `**Maturity**: ${level}\n\n` })
        )
      )
    )

    expect(findings).toEqual([])
  })

  test('flags a page spec with no Maturity line', () => {
    const capability = capabilityAt('plants/journey-pages/origin', specText())

    expect(checkMaturityLine(capability)).toEqual([
      {
        check: 'maturity',
        capability: 'plants/journey-pages/origin',
        message: 'Page spec has no **Maturity** line under ## Purpose.'
      }
    ])
  })

  test('lets an admin page spec leave the Maturity line out', () => {
    const capability = capabilityAt('admin/journey-pages/origin', specText())

    expect(checkMaturityLine(capability)).toEqual([])
  })

  test('flags a Maturity line naming a level that does not exist', () => {
    const capability = capabilityAt(
      'plants/journey-pages/origin',
      specText({ purpose: '**Maturity**: signed-off\n\n' })
    )

    expect(messagesOf(checkMaturityLine(capability))).toEqual([
      'Maturity line "**Maturity**: signed-off" must read **Maturity**: <exploring|detailing|agreed|readyForLive>.'
    ])
  })

  test('flags a Maturity line written in the wrong case', () => {
    const capability = capabilityAt(
      'plants/journey-pages/origin',
      specText({ purpose: '**maturity**: exploring\n\n' })
    )

    expect(messagesOf(checkMaturityLine(capability))).toEqual([
      'Maturity line "**maturity**: exploring" must read **Maturity**: <exploring|detailing|agreed|readyForLive>.'
    ])
  })

  test('flags a Maturity line outside the Purpose section', () => {
    const capability = capabilityAt(
      'plants/journey-pages/origin',
      specText({ requirementMeta: '**Maturity**: exploring\n' })
    )

    expect(messagesOf(checkMaturityLine(capability))).toEqual([
      'Maturity line must sit under ## Purpose.'
    ])
  })

  test('flags a page spec with two Maturity lines', () => {
    const capability = capabilityAt(
      'plants/journey-pages/origin',
      specText({ purpose: '**Maturity**: exploring\n**Maturity**: agreed\n\n' })
    )

    expect(messagesOf(checkMaturityLine(capability))).toEqual([
      'Page spec has 2 Maturity lines. It must have one.'
    ])
  })

  test('flags a Maturity line on a spec that is not a page spec', () => {
    const capability = capabilityAt(
      'plants/journey-flow',
      specText({ purpose: '**Maturity**: exploring\n\n' })
    )

    expect(messagesOf(checkMaturityLine(capability))).toEqual([
      'Only a journey-pages page spec carries a Maturity line.'
    ])
  })

  test('does not require a Maturity line on a spec that is not a page spec', () => {
    const capability = capabilityAt('plants/journey-flow', specText())

    expect(checkMaturityLine(capability)).toEqual([])
  })
})

describe('checkSignedOffMarks', () => {
  test('passes a spec with no Signed off mark', () => {
    const capability = capabilityAt('plants/journey-flow', specText())

    expect(checkSignedOffMarks(capability)).toEqual([])
  })

  test('passes a well-formed mark directly after the scenario ID line, in any spec', () => {
    const capability = capabilityAt(
      'plants/journey-flow',
      specText({ scenarioMeta: '**Signed off**: 2026-11-11\n' })
    )

    expect(checkSignedOffMarks(capability)).toEqual([])
  })

  test('flags a mark whose date is not YYYY-MM-DD', () => {
    const capability = capabilityAt(
      'plants/journey-flow',
      specText({ scenarioMeta: '**Signed off**: 11/11/2026\n' })
    )

    expect(checkSignedOffMarks(capability)).toEqual([
      {
        check: 'maturity',
        capability: 'plants/journey-flow',
        message:
          'Scenario "The page shows the country question" Signed off line "**Signed off**: 11/11/2026" must read **Signed off**: <YYYY-MM-DD>, with a real date.'
      }
    ])
  })

  test('flags a mark whose date does not exist', () => {
    const capability = capabilityAt(
      'plants/journey-flow',
      specText({ scenarioMeta: '**Signed off**: 2026-02-30\n' })
    )

    expect(messagesOf(checkSignedOffMarks(capability))).toEqual([
      'Scenario "The page shows the country question" Signed off line "**Signed off**: 2026-02-30" must read **Signed off**: <YYYY-MM-DD>, with a real date.'
    ])
  })

  test('flags a mark that sits below the scenario steps', () => {
    const text = specText().replace(
      '- **THEN** it asks for the country of origin',
      '- **THEN** it asks for the country of origin\n**Signed off**: 2026-11-11'
    )
    const capability = capabilityAt('plants/journey-flow', text)

    expect(messagesOf(checkSignedOffMarks(capability))).toEqual([
      'Scenario "The page shows the country question" has its Signed off line away from its ID line. It must sit directly after it.'
    ])
  })

  test('flags a scenario with two marks', () => {
    const capability = capabilityAt(
      'plants/journey-flow',
      specText({
        scenarioMeta: '**Signed off**: 2026-11-11\n**Signed off**: 2026-11-12\n'
      })
    )

    expect(messagesOf(checkSignedOffMarks(capability))).toEqual([
      'Scenario "The page shows the country question" has 2 Signed off lines. It must have one.'
    ])
  })

  test('flags a mark on a requirement rather than a scenario', () => {
    const capability = capabilityAt(
      'plants/journey-flow',
      specText({ requirementMeta: '**Signed off**: 2026-11-11\n' })
    )

    expect(messagesOf(checkSignedOffMarks(capability))).toEqual([
      'A Signed off line sits outside a scenario. Only a scenario carries one.'
    ])
  })
})
