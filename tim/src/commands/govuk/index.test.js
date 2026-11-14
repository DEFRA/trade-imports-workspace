import { afterEach, describe, expect, test } from 'vitest'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ERROR, OK, USAGE } from '../../constants/exitCodes.js'
import { recordTimRun } from '../../test-support/bash-golden-harness.js'
import {
  plansCases,
  plansRefusals,
  readGovukGolden,
  renderCases,
  renderRefusals,
  RUN_ID,
  stageGovukWorkspace,
  summariesCases,
  summariesRefusals
} from '../../govuk/__fixtures__/govuk-workspace.js'

const golden = readGovukGolden()

const isJsonCase = (args) => args.includes('--json')

const bashRefusalAsEnvelopeError = (stderr) => stderr.replace(/\n$/, '')

const asTimArgs = (bashArgs) =>
  bashArgs.map((arg) => (arg === '--version' ? '--govuk-version' : arg))

const recordEach = async (command, cases) => {
  const runs = []
  for (const { name, args } of cases) {
    runs.push({
      case: name,
      input: args,
      ...(await recordTimRun(staged, ['govuk', command, ...asTimArgs(args)]))
    })
  }
  return runs
}

const textRunsOf = (runs) => runs.filter(({ input }) => !isJsonCase(input))

const jsonRunsOf = (runs) =>
  runs
    .filter(({ input }) => isJsonCase(input))
    .map(({ case: name, exitCode, stdout }) => ({
      case: name,
      exitCode,
      result: JSON.parse(stdout).result
    }))

const goldenJsonRunsOf = (runs) =>
  runs
    .filter(({ input, exitCode }) => isJsonCase(input) && exitCode === OK)
    .map(({ case: name, exitCode, stdout }) => ({
      case: name,
      exitCode,
      result: stdout === '' ? [] : JSON.parse(stdout)
    }))

let staged

afterEach(() => staged?.remove())

describe('tim govuk plans matches list-plans.sh and upgrade-status.sh', () => {
  test('Should print the recorded text for every listing and refusal', async () => {
    staged = stageGovukWorkspace()
    const cases = [...plansCases, ...plansRefusals].filter(
      ({ args }) => !isJsonCase(args)
    )

    const runs = await recordEach('plans', cases)

    expect(runs).toEqual(textRunsOf(golden.plans))
    expect(runs).toEqual(textRunsOf(golden.status))
  })

  test('Should give the recorded JSON as the envelope result for every listing', async () => {
    staged = stageGovukWorkspace()

    const runs = await recordEach(
      'plans',
      plansCases.filter(({ args }) => isJsonCase(args))
    )

    expect(jsonRunsOf(runs)).toEqual(goldenJsonRunsOf(golden.plans))
  })

  test('Should refuse an unknown filter with an error envelope and exit 1', async () => {
    staged = stageGovukWorkspace()

    const run = await recordTimRun(staged, [
      'govuk',
      'plans',
      '--run-id',
      RUN_ID,
      '--filter',
      'later',
      '--json'
    ])

    expect(run.exitCode).toBe(ERROR)
    expect(JSON.parse(run.stdout).errors).toEqual([
      {
        code: 'USAGE',
        message: bashRefusalAsEnvelopeError(
          golden.plans.find(({ case: name }) => name === 'unknown filter')
            .stderr
        )
      }
    ])
  })
})

describe('tim govuk summaries matches list-plan-summaries.sh', () => {
  test('Should print the recorded tab-separated lines for every case and refusal', async () => {
    staged = stageGovukWorkspace()
    const cases = [...summariesCases, ...summariesRefusals].filter(
      ({ args }) => !isJsonCase(args)
    )

    const runs = await recordEach('summaries', cases)

    expect(runs).toEqual(textRunsOf(golden.summaries))
  })

  test('Should give the recorded rows as the envelope result, and no rows for a run with no state files', async () => {
    staged = stageGovukWorkspace()

    const runs = await recordEach(
      'summaries',
      summariesCases.filter(({ args }) => isJsonCase(args))
    )

    expect(jsonRunsOf(runs)).toEqual(goldenJsonRunsOf(golden.summaries))
  })

  test('Should print nothing and exit 0 for an empty run folder', async () => {
    staged = stageGovukWorkspace()
    mkdirSync(join(staged.root, 'workareas/govuk-upgrades/EUDPA-302'))

    const run = await recordTimRun(staged, [
      'govuk',
      'summaries',
      '--run-id',
      'EUDPA-302'
    ])

    expect(run).toEqual({ exitCode: OK, stdout: '', stderr: '' })
  })
})

describe('tim govuk render-plan matches render-version-plan.sh', () => {
  test('Should print the recorded markdown for every version and refusal', async () => {
    staged = stageGovukWorkspace()

    const runs = await recordEach('render-plan', [
      ...renderCases,
      ...renderRefusals
    ])

    expect(runs).toEqual(golden.render)
  })

  test('Should give the markdown as the envelope result with --json', async () => {
    staged = stageGovukWorkspace()
    const [{ args }] = renderCases

    const run = await recordTimRun(staged, [
      'govuk',
      'render-plan',
      ...asTimArgs(args),
      '--json'
    ])

    expect(JSON.parse(run.stdout).result).toEqual({
      markdown: golden.render[0].stdout.replace(/\n$/, '')
    })
  })

  test('Should refuse a missing --govuk-version with exit 2', async () => {
    staged = stageGovukWorkspace()

    const run = await recordTimRun(staged, [
      'govuk',
      'render-plan',
      '--run-id',
      RUN_ID,
      '--repo',
      'trade-imports-animals-admin'
    ])

    expect(run).toEqual({
      exitCode: USAGE,
      stdout: '',
      stderr: 'Missing --govuk-version\n'
    })
  })
})
