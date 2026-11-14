import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  ADMIN,
  MISSING_RUN_ID,
  RUN_ID,
  stageNpmWorkspace
} from './__fixtures__/npm-workspace.js'
import { packagesPath, runFolder } from './state.js'
import {
  aggregateClassifications,
  renderVerifyPendingText,
  renderVerifyText,
  setPackageClassification,
  setPackageStatus,
  verifyClassificationCoverage
} from './writers.js'

let staged

afterEach(() => staged?.remove())

const NOW = new Date('2026-06-01T08:09:10.000Z')

const adminRow = (root, name) =>
  JSON.parse(
    readFileSync(packagesPath(runFolder(root, RUN_ID), ADMIN), 'utf8')
  ).packages.find(({ package: rowName }) => rowName === name)

describe('#setPackageStatus', () => {
  test('Should stamp done with the time and keep the commit', () => {
    staged = stageNpmWorkspace()

    setPackageStatus({
      workspaceRoot: staged.root,
      runId: RUN_ID,
      repo: ADMIN,
      packageName: 'eslint',
      status: 'done',
      commitSha: 'abc',
      now: NOW
    })

    expect(adminRow(staged.root, 'eslint')).toEqual(
      expect.objectContaining({
        implementation_status: 'done',
        completed_at: '2026-06-01T08:09:10Z',
        commit_sha: 'abc',
        failure_reason: null
      })
    )
  })

  test('Should refuse a package the file does not list', () => {
    staged = stageNpmWorkspace()

    expect(() =>
      setPackageStatus({
        workspaceRoot: staged.root,
        runId: RUN_ID,
        repo: ADMIN,
        packageName: 'left-pad',
        status: 'todo'
      })
    ).toThrow(expect.objectContaining({ code: 'NOT_FOUND' }))
  })
})

describe('#setPackageClassification', () => {
  test('Should write the fragment under the classifications folder and leave the packages file alone', () => {
    staged = stageNpmWorkspace()
    const before = adminRow(staged.root, '@hapi/hapi')

    const { path } = setPackageClassification({
      workspaceRoot: staged.root,
      runId: RUN_ID,
      repo: ADMIN,
      packageName: '@hapi/hapi',
      classification: 'manual',
      risk: 'HIGH',
      safeForAutomation: 'false',
      rationale: 'Moved',
      filesAffected: 'a.js, b.js',
      now: NOW
    })

    expect({
      path,
      fragment: JSON.parse(readFileSync(path, 'utf8')),
      row: adminRow(staged.root, '@hapi/hapi')
    }).toEqual({
      path: join(
        runFolder(staged.root, RUN_ID),
        ADMIN,
        'classifications',
        '@hapi__hapi.json'
      ),
      fragment: {
        package: '@hapi/hapi',
        classification: 'manual',
        risk: 'HIGH',
        safe_for_automation: false,
        rationale: 'Moved',
        classified_at: '2026-06-01T08:09:10Z',
        files_affected: ['a.js', 'b.js']
      },
      row: before
    })
  })
})

describe('#aggregateClassifications', () => {
  test('Should keep the row risk when the fragment has none and add the fields the row lacked', () => {
    staged = stageNpmWorkspace({ withFragments: true })

    aggregateClassifications({ workspaceRoot: staged.root, runId: RUN_ID })

    expect(adminRow(staged.root, 'pino')).toEqual({
      package: 'pino',
      current: '8.0.0',
      target: '9.0.0',
      upgrade_type: 'major',
      dependency_type: 'dependencies',
      classification: 'auto',
      implementation_status: 'todo',
      risk: null,
      safe_for_automation: null,
      rationale: 'Logger API unchanged',
      demoted_from_auto: false
    })
  })

  test('Should refuse a missing run folder', () => {
    staged = stageNpmWorkspace()

    expect(() =>
      aggregateClassifications({
        workspaceRoot: staged.root,
        runId: MISSING_RUN_ID
      })
    ).toThrow(expect.objectContaining({ code: 'NOT_FOUND' }))
  })
})

describe('#verifyClassificationCoverage', () => {
  test('Should fold the fragments first and write what that did to warn', async () => {
    staged = stageNpmWorkspace({ withFragments: true })
    const warnings = []

    const coverage = await verifyClassificationCoverage({
      workspaceRoot: staged.root,
      runId: RUN_ID,
      warn: async (text) => warnings.push(text)
    })

    expect({
      coverage,
      warnings: warnings.map((text) => text.split('\n').at(-1))
    }).toEqual({
      coverage: { pending_count: 0, pending: [] },
      warnings: ['Total fragments merged: 3']
    })
  })

  test('Should list the pending packages and write the refusal to warn for a missing run', async () => {
    staged = stageNpmWorkspace()
    const warnings = []

    const coverage = await verifyClassificationCoverage({
      workspaceRoot: staged.root,
      runId: MISSING_RUN_ID,
      warn: async (text) => warnings.push(text)
    })

    expect({ coverage, warnings }).toEqual({
      coverage: { pending_count: 0, pending: [] },
      warnings: [`Run dir not found: ${runFolder(staged.root, MISSING_RUN_ID)}`]
    })
  })
})

describe('#renderVerifyText', () => {
  test('Should print nothing on stdout and each pending package on the error text', () => {
    const coverage = {
      pending_count: 1,
      pending: [
        {
          repo: ADMIN,
          package: 'pino',
          current: '8.0.0',
          target: '9.0.0',
          upgrade_type: 'major'
        }
      ]
    }

    expect([
      renderVerifyText(coverage, { runId: RUN_ID }),
      renderVerifyPendingText(coverage)
    ]).toEqual([
      null,
      `✗ 1 package(s) still pending classification:\n  ${ADMIN}  pino  8.0.0 → 9.0.0  (major)`
    ])
  })
})
