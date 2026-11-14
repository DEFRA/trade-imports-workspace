import { afterEach, describe, expect, test } from 'vitest'
import {
  readGovukGolden,
  RUN_ID,
  stageGovukWorkspace
} from './__fixtures__/govuk-workspace.js'
import { listPlanSummaries, renderSummariesText } from './summaries.js'

const golden = readGovukGolden()

const goldenRun = (name) =>
  golden.summaries.find(({ case: caseName }) => caseName === name)

let staged

afterEach(() => staged?.remove())

describe('#listPlanSummaries', () => {
  test('Should list the versions still to apply, noops left out, by repo then version', () => {
    staged = stageGovukWorkspace()

    const rows = listPlanSummaries({
      workspaceRoot: staged.root,
      runId: RUN_ID
    })

    expect(rows).toEqual(JSON.parse(goldenRun('every repo as JSON').stdout))
  })

  test('Should give no rows for a run folder with no state files', () => {
    staged = stageGovukWorkspace()

    expect(
      listPlanSummaries({ workspaceRoot: staged.root, runId: 'EUDPA-300' })
    ).toEqual([])
  })
})

describe('#renderSummariesText', () => {
  test('Should print one tab-separated line a row, escaping tabs and new lines as jq did', () => {
    const rows = [
      {
        repo: 'alpha',
        version: '5.0.0',
        classification: 'todo',
        change_count: 2,
        summary: 'One\tTwo\nThree \\ four'
      }
    ]

    expect(renderSummariesText(rows)).toBe(
      'alpha\t5.0.0\ttodo\t2\tOne\\tTwo\\nThree \\\\ four'
    )
  })

  test('Should print nothing for no rows', () => {
    expect(renderSummariesText([])).toBeNull()
  })
})
