import { afterEach, describe, expect, test } from 'vitest'
import { ERROR, USAGE } from '../../constants/exitCodes.js'
import { recordTimRun } from '../../test-support/bash-golden-harness.js'
import {
  readGovukStartGolden,
  recordStartCase,
  startCases,
  stageStartWorkspace
} from '../../govuk/__fixtures__/govuk-start.js'

let staged

afterEach(() => {
  staged?.remove()
  staged = undefined
})

const goldenOf = (name) =>
  readGovukStartGolden().find((recorded) => recorded.case === name)

const caseNamed = (name) =>
  startCases.find((startCase) => startCase.name === name)

const recordCli = (name, extraArgs = []) =>
  recordStartCase(staged, caseNamed(name), (args, env) =>
    recordTimRun(staged, ['govuk', 'start', ...args, ...extraArgs], { env })
  )

describe('tim govuk start', () => {
  test('Should print, exit 1 and set the branches as the Bash did when every repo is up to date', async () => {
    staged = stageStartWorkspace()

    const record = await recordCli('every repo up to date')

    expect(record).toEqual(goldenOf('every repo up to date'))
  })

  test.each([
    'ticket and branch both',
    'neither ticket nor branch',
    'ticket from another project'
  ])('Should refuse "%s" with the Bash message and exit 2', async (name) => {
    staged = stageStartWorkspace()
    const golden = goldenOf(name)

    const record = await recordCli(name)

    expect(record).toEqual({
      ...golden,
      runs: golden.runs.map((run) => ({ ...run, exitCode: USAGE }))
    })
  })

  test('Should give the refusal as a JSON envelope error with --json', async () => {
    staged = stageStartWorkspace()

    const record = await recordCli('every repo up to date', ['--json'])

    const [run] = record.runs
    expect(run.exitCode).toBe(ERROR)
    expect(JSON.parse(run.stdout)).toEqual(
      expect.objectContaining({
        ok: false,
        errors: [
          {
            code: 'NOT_FOUND',
            message:
              'Error: No versions.{repo}.json found under <HOME>/git/defra/trade-imports-workspace/workareas/govuk-upgrades/EUDPA-501'
          }
        ]
      })
    )
    expect(run.stderr).toBe('')
  })
})
