import { describe, test, expect } from 'vitest'
import {
  pointerOf,
  requirementsOfPointer,
  splitOffOf,
  splitOffRequirements,
  splitOffThemeIds
} from './split-off.js'

const THEME = {
  id: 'origin',
  title: 'Country of origin',
  why: 'req-001 to req-003 change only the origin pages.',
  touches: ['frontend:src/server/origin'],
  dependsOn: []
}

const ROWS = [
  { id: 'inc-001', requirements: ['req-001'] },
  { id: 'inc-002', requirements: ['req-002', 'req-001'] }
]

const pointer = (overrides = {}) => ({
  ...pointerOf({
    theme: THEME,
    branch: 'feat/NO_JIRA-hrp-origin',
    workarea: 'shared/hrp/themes/origin',
    backlogPath: 'themes/origin/backlog.json',
    rows: ROWS,
    fingerprints: null,
    at: '2026-10-09T12:00:00.000Z'
  }),
  ...overrides
})

describe('pointerOf', () => {
  test('names the theme, its branch and backlog, its rows and each requirement they covered once', () => {
    expect(pointer()).toEqual({
      theme: 'origin',
      title: 'Country of origin',
      why: THEME.why,
      touches: THEME.touches,
      dependsOn: [],
      branch: 'feat/NO_JIRA-hrp-origin',
      workarea: 'shared/hrp/themes/origin',
      backlog: 'themes/origin/backlog.json',
      increments: ['inc-001', 'inc-002'],
      requirements: ['req-001', 'req-002'],
      at: '2026-10-09T12:00:00.000Z'
    })
  })

  test('keeps the fingerprint of each requirement the rows covered, and no other', () => {
    const withFingerprints = pointerOf({
      theme: THEME,
      branch: 'feat/NO_JIRA-hrp-origin',
      workarea: 'shared/hrp/themes/origin',
      backlogPath: 'themes/origin/backlog.json',
      rows: ROWS,
      fingerprints: { 'req-001': 'f1', 'req-009': 'f9' },
      at: '2026-10-09T12:00:00.000Z'
    })

    expect(withFingerprints.fingerprints).toEqual({ 'req-001': 'f1' })
  })
})

describe('reading split-off pointers', () => {
  test('skips an entry that names no theme', () => {
    const backlog = { splitOff: [pointer(), { branch: 'x' }, 'origin'] }

    expect([
      splitOffOf(backlog).map((entry) => entry.theme),
      [...splitOffThemeIds(backlog)]
    ]).toEqual([['origin'], ['origin']])
  })

  test('holds the requirements a theme left with and the ones it picks up', () => {
    const backlog = { splitOff: [pointer({ pickUp: ['req-007', 'req-002'] })] }

    expect([
      requirementsOfPointer(backlog.splitOff[0]),
      [...splitOffRequirements(backlog).keys()]
    ]).toEqual([
      ['req-001', 'req-002', 'req-007'],
      ['req-001', 'req-002', 'req-007']
    ])
  })

  test('reads a backlog with no splitOff as none', () => {
    expect([splitOffOf({ increments: [] }), splitOffOf(null)]).toEqual([[], []])
  })
})
