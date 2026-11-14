import { afterEach, describe, expect, test } from 'vitest'
import { normaliseRecordedText } from '../test-support/bash-golden-harness.js'
import {
  readGovukGolden,
  RUN_ID,
  stageGovukWorkspace
} from './__fixtures__/govuk-workspace.js'
import { renderVersionPlan } from './render-plan.js'

const golden = readGovukGolden()

const goldenRun = (name) =>
  golden.render.find(({ case: caseName }) => caseName === name)

let staged

afterEach(() => staged?.remove())

const render = (repo, version) =>
  renderVersionPlan({
    workspaceRoot: staged.root,
    runId: RUN_ID,
    repo,
    version
  })

describe('#renderVersionPlan', () => {
  test('Should render a failed version with its reason as render-version-plan.sh did', () => {
    staged = stageGovukWorkspace()

    const { markdown } = render('trade-imports-animals-admin', '5.7.0')

    expect(`${normaliseRecordedText(markdown, staged.home)}\n`).toBe(
      goldenRun('failed with a reason').stdout
    )
  })

  test('Should point at the changelog path in this workspace when the section is missing', () => {
    staged = stageGovukWorkspace()

    const { markdown } = render('trade-imports-animals-frontend', '5.10.0')

    expect(markdown.split('\n').at(-1)).toBe(
      `_Pre-baked changelog section not found: ${staged.root}/workareas/govuk-upgrades/${RUN_ID}/trade-imports-animals-frontend/version__5.10.0.changelog.md_`
    )
  })

  test('Should refuse a version the repo does not have', () => {
    staged = stageGovukWorkspace()

    expect(() => render('trade-imports-animals-admin', '4.0.0')).toThrow(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: `Version 4.0.0 not found in ${staged.root}/workareas/govuk-upgrades/${RUN_ID}/trade-imports-animals-admin/versions.trade-imports-animals-admin.json`
      })
    )
  })

  test('Should refuse a missing run id before reading anything', () => {
    expect(() =>
      renderVersionPlan({
        workspaceRoot: '/nowhere',
        repo: 'alpha',
        version: '5.0.0'
      })
    ).toThrow(
      expect.objectContaining({ code: 'USAGE', message: 'Missing --run-id' })
    )
  })
})
