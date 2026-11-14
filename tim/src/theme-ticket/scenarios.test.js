import { describe, expect, test } from 'vitest'
import { addedHeadingsInDiff, parseScenarios } from './scenarios.js'

describe('#parseScenarios', () => {
  test('Should read each scenario’s id and steps until the next requirement heading', () => {
    const text = [
      '### Requirement: Arrival',
      '#### Scenario: First',
      '**ID**: SCN-1',
      '- **GIVEN** a user',
      '- **WHEN** they continue',
      'Some prose that is not a step',
      '- **THEN** the next page shows',
      '#### Scenario: Second',
      '- **AND** no id',
      '### Requirement: Other',
      '- **THEN** belongs to no scenario'
    ].join('\n')

    expect([...parseScenarios(text).values()]).toEqual([
      {
        heading: 'First',
        id: 'SCN-1',
        steps: [
          { keyword: 'GIVEN', text: 'a user' },
          { keyword: 'WHEN', text: 'they continue' },
          { keyword: 'THEN', text: 'the next page shows' }
        ]
      },
      {
        heading: 'Second',
        id: null,
        steps: [{ keyword: 'AND', text: 'no id' }]
      }
    ])
  })
})

describe('#addedHeadingsInDiff', () => {
  test('Should list the scenario headings each file gains, by its path under openspec/specs/', () => {
    const diff = [
      'diff --git a/openspec/specs/plants/a/spec.md b/openspec/specs/plants/a/spec.md',
      '+++ b/openspec/specs/plants/a/spec.md',
      '+#### Scenario: Added here',
      '-#### Scenario: Taken away',
      '+#### Scenario: Also added ',
      '+++ b/openspec/specs/ins/b/spec.md',
      '+- **THEN** a step, not a heading',
      '+#### Scenario: In the second file'
    ].join('\n')

    expect([...addedHeadingsInDiff(diff)]).toEqual([
      ['plants/a/spec.md', ['Added here', 'Also added']],
      ['ins/b/spec.md', ['In the second file']]
    ])
  })
})
