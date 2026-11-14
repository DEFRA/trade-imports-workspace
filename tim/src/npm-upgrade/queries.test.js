import { afterEach, describe, expect, test } from 'vitest'
import {
  ADMIN,
  FRONTEND,
  MISSING_RUN_ID,
  RUN_ID,
  stageNpmWorkspace
} from './__fixtures__/npm-workspace.js'
import {
  alternative,
  countPackages,
  listPackages,
  renderCountsText,
  renderPackagesTsv
} from './queries.js'

let staged

afterEach(() => staged?.remove())

const namesOf = (rows) => rows.map(({ package: name }) => name)

describe('#alternative', () => {
  test.each([
    [null, 'x', 'x'],
    [undefined, 'x', 'x'],
    [false, 'x', 'x'],
    ['', 'x', ''],
    [0, 'x', 0],
    [null, undefined, null]
  ])('Should give %j // %j as %j', (value, fallback, expected) => {
    expect(alternative(value, fallback)).toEqual(expected)
  })
})

describe('#listPackages', () => {
  test('Should treat a todo row as pending status', () => {
    staged = stageNpmWorkspace()

    const rows = listPackages({
      workspaceRoot: staged.root,
      runId: RUN_ID,
      repo: ADMIN,
      status: 'pending'
    })

    expect(namesOf(rows)).toEqual(['@hapi/hapi', 'pino'])
  })

  test('Should treat a row with no classification as pending classification', () => {
    staged = stageNpmWorkspace()

    const rows = listPackages({
      workspaceRoot: staged.root,
      runId: RUN_ID,
      classification: 'pending'
    })

    expect(namesOf(rows)).toEqual(['@hapi/hapi', 'pino'])
  })

  test('Should give no rows for a missing run when asked to', () => {
    staged = stageNpmWorkspace()

    expect(
      listPackages({
        workspaceRoot: staged.root,
        runId: MISSING_RUN_ID,
        emptyWhenRunMissing: true
      })
    ).toEqual([])
  })

  test('Should refuse a risk outside the list', () => {
    staged = stageNpmWorkspace()

    expect(() =>
      listPackages({ workspaceRoot: staged.root, runId: RUN_ID, risk: 'low' })
    ).toThrow(
      expect.objectContaining({ code: 'USAGE', message: 'Invalid --risk: low' })
    )
  })
})

describe('#renderPackagesTsv', () => {
  test('Should escape tabs, newlines and backslashes and print null as nothing', () => {
    const rows = [
      { repo: 'r', package: 'p', current: null, failure_reason: 'a\tb\nc\\d' }
    ]

    expect(renderPackagesTsv(rows)).toBe(
      'r\tp\t\t\t\t\tpending\t\tpending\t\ta\\tb\\nc\\\\d'
    )
  })

  test('Should print nothing for no rows', () => {
    expect(renderPackagesTsv([])).toBeNull()
  })
})

describe('#countPackages', () => {
  test('Should count manual rows by risk and every row by repo', () => {
    staged = stageNpmWorkspace()

    const { summary } = countPackages({
      workspaceRoot: staged.root,
      runId: RUN_ID
    })

    expect({
      byRisk: summary.by_risk,
      repos: summary.by_repo.map(({ repo, total }) => [repo, total])
    }).toEqual({
      byRisk: [
        { key: 'HIGH', count: 1 },
        { key: 'MEDIUM', count: 1 }
      ],
      repos: [
        [ADMIN, 4],
        [FRONTEND, 3]
      ]
    })
  })

  test('Should give zero counts with no by-repo list for a missing run when asked to', () => {
    staged = stageNpmWorkspace()

    expect(
      countPackages({
        workspaceRoot: staged.root,
        runId: MISSING_RUN_ID,
        emptyWhenRunMissing: true
      })
    ).toEqual({
      found: false,
      summary: { total: 0, by_classification: [], by_status: [], by_risk: [] }
    })
  })
})

describe('#renderCountsText', () => {
  test('Should say none under the risk heading when no package is manual', () => {
    const counts = {
      found: true,
      summary: {
        total: 1,
        by_classification: [{ key: 'auto', count: 1 }],
        by_status: [],
        by_risk: [],
        by_repo: []
      }
    }

    expect(renderCountsText(counts, { runId: RUN_ID })).toContain(
      '  Manual upgrades by risk:\n    (none)\n'
    )
  })
})
