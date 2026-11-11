import { describe, test, expect } from 'vitest'
import { draftSignedOffTicket } from './ticket-draft.js'

const GIVEN = '- **GIVEN** a trader on the origin page'

const rewritten = {
  id: 'SCN-ORIGIN-001-A',
  name: 'The page lists countries',
  capability: 'plants/journey-pages/origin',
  change: 'changed',
  why: 'It was signed off, and the change rewrites its name or steps.',
  foundIn: { commit: 'HEAD', sha: 'abcdef1234567890' },
  before: {
    name: 'The page lists countries',
    steps: [GIVEN, '- **THEN** the page lists every country']
  },
  after: {
    name: 'The page lists countries',
    steps: [GIVEN, '- **THEN** the page lists some countries']
  }
}

const testEdited = {
  id: 'SCN-ORIGIN-001-B',
  name: 'The page saves the country',
  capability: 'plants/journey-pages/origin',
  change: 'test-edited',
  why: 'A test linked to it in coverage.json is edited: trade-imports-plants-frontend/src/origin.test.js.',
  foundIn: { repo: 'trade-imports-plants-frontend', base: 'origin/main' },
  test: {
    repo: 'trade-imports-plants-frontend',
    file: 'src/origin.test.js',
    titles: ['saves the country']
  },
  before: {
    name: 'The page saves the country',
    steps: [GIVEN, '- **THEN** the country is saved']
  },
  after: {
    name: 'The page saves the country',
    steps: [GIVEN, '- **THEN** the country is saved']
  }
}

const removed = {
  ...rewritten,
  id: 'SCN-ORIGIN-001-C',
  change: 'removed',
  why: 'It was signed off, and the change removes it.',
  foundIn: { range: 'main...HEAD', from: 'a', to: 'b' },
  after: null
}

describe('#draftSignedOffTicket', () => {
  test('Should draft nothing when no signed-off scenario changes', () => {
    expect(draftSignedOffTicket([])).toBeNull()
  })

  test('Should say which signed-off behaviour changes, from what to what, and how to approve or refuse it', () => {
    expect(draftSignedOffTicket([rewritten, testEdited])).toEqual({
      summary: 'Approve or refuse changes to 2 signed-off scenarios',
      description: [
        'This work changes behaviour that was signed off. The pull requests stay as drafts until a person approves or refuses it.',
        '',
        'Approve: take the pull requests out of draft and merge them as normal.',
        'Refuse: take the spec change out, and the code behind it. For a linked test, fix the code, not the test.',
        '',
        'The page lists countries (SCN-ORIGIN-001-A)',
        'Capability: plants/journey-pages/origin',
        'What happens: Name or steps changed',
        'Why it counts: It was signed off, and the change rewrites its name or steps.',
        'Found in: commit abcdef123456',
        'Before:',
        '  The page lists countries',
        `  ${GIVEN}`,
        '  - **THEN** the page lists every country',
        'After:',
        '  The page lists countries',
        `  ${GIVEN}`,
        '  - **THEN** the page lists some countries',
        '',
        'The page saves the country (SCN-ORIGIN-001-B)',
        'Capability: plants/journey-pages/origin',
        'What happens: A linked test is edited',
        'Why it counts: A test linked to it in coverage.json is edited: trade-imports-plants-frontend/src/origin.test.js.',
        'Found in: repos/trade-imports-plants-frontend against origin/main, committed and uncommitted',
        'Test: trade-imports-plants-frontend/src/origin.test.js',
        '  "saves the country"',
        'Steps, unchanged in the spec:',
        '  The page saves the country',
        `  ${GIVEN}`,
        '  - **THEN** the country is saved'
      ].join('\n')
    })
  })

  test('Should count a scenario found twice once, and say a removed scenario is gone from the spec', () => {
    const draft = draftSignedOffTicket([
      removed,
      { ...removed, foundIn: { commit: 'HEAD', sha: 'b' } }
    ])

    expect({
      summary: draft.summary,
      foundIn: draft.description
        .split('\n')
        .filter((line) => /^(Found in|After)/.test(line))
    }).toEqual({
      summary: 'Approve or refuse a change to a signed-off scenario',
      foundIn: [
        'Found in: range main...HEAD',
        'After: removed from the spec',
        'Found in: commit b',
        'After: removed from the spec'
      ]
    })
  })
})
