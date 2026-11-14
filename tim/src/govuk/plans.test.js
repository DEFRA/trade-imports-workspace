import { afterEach, describe, expect, test } from 'vitest'
import { normaliseRecordedText } from '../test-support/bash-golden-harness.js'
import {
  readGovukGolden,
  RUN_ID,
  stageGovukWorkspace
} from './__fixtures__/govuk-workspace.js'
import { listPlans, renderPlansText } from './plans.js'

const golden = readGovukGolden()

const goldenRun = (name) =>
  golden.plans.find(({ case: caseName }) => caseName === name)

const asRecorded = (value) =>
  JSON.parse(normaliseRecordedText(JSON.stringify(value), staged.home))

let staged

afterEach(() => staged?.remove())

describe('#listPlans', () => {
  test('Should give the counts and pending versions in version order as list-plans.sh did', () => {
    staged = stageGovukWorkspace()

    const plans = listPlans({
      workspaceRoot: staged.root,
      runId: RUN_ID,
      repo: 'trade-imports-animals-admin',
      filter: 'pending',
      sortSemver: true
    })

    expect(asRecorded(plans)).toEqual(
      JSON.parse(
        goldenRun('filter pending by semver on one repo as JSON').stdout
      )
    )
  })

  test('Should refuse a run folder that holds no state files', () => {
    staged = stageGovukWorkspace()

    expect(() =>
      listPlans({ workspaceRoot: staged.root, runId: 'EUDPA-300' })
    ).toThrow(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: `Error: No versions.{repo}.json found under ${staged.root}/workareas/govuk-upgrades/EUDPA-300`
      })
    )
  })
})

describe('#renderPlansText', () => {
  test('Should name the filter above the versions it matched', () => {
    staged = stageGovukWorkspace()
    const plans = listPlans({
      workspaceRoot: staged.root,
      runId: RUN_ID,
      filter: 'todo'
    })

    expect(`${renderPlansText(plans, 'todo')}\n`).toBe(
      goldenRun('filter todo').stdout
    )
  })
})
