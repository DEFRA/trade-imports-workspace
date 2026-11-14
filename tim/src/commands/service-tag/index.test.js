import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { execa } from 'execa'
import { readFileSync } from 'node:fs'
import { ERROR, OK } from '../../constants/exitCodes.js'
import { normaliseRecordedText } from '../../test-support/bash-golden-harness.js'
import { envelopeOf, TIM_CLI_PATH } from '../../test-support/tim-cli.js'
import { recordingOf } from './__fixtures__/recording.js'
import {
  failureCases,
  specsCases,
  stageServiceTagWorkspace,
  startCases
} from './__fixtures__/service-tag-workspace.js'

const golden = JSON.parse(
  readFileSync(
    new URL(
      './__fixtures__/__golden__/service-tag-scripts.json',
      import.meta.url
    ),
    'utf8'
  )
)

const runTim = (staged, args) =>
  execa(
    'node',
    [TIM_CLI_PATH, '--workspace', staged.root, 'service-tag', ...args],
    {
      reject: false,
      stripFinalNewline: false,
      env: { TIM_NO_AUTO_PULL: '1', TIM_WORKSPACE: undefined },
      extendEnv: true
    }
  )

const recordTimRun = async (staged, name, args) => {
  const run = await runTim(staged, args)
  return recordingOf(name, {
    exitCode: run.exitCode,
    stdout: normaliseRecordedText(run.stdout, staged.home),
    stderr: normaliseRecordedText(run.stderr, staged.home)
  })
}

let staged

beforeAll(async () => {
  staged = await stageServiceTagWorkspace()
})

afterAll(() => staged.remove())

describe('tim service-tag specs matches list-specs.sh', () => {
  test.each(specsCases.map((specsCase, index) => ({ ...specsCase, index })))(
    'Should print the recorded specs for $name',
    async ({ name, args, index }) => {
      const recording = await recordTimRun(staged, name, ['specs', ...args])

      expect(recording).toEqual(golden.specs[index])
    }
  )
})

describe('tim service-tag start matches start-service-tag.sh', () => {
  test.each(startCases.map((startCase, index) => ({ ...startCase, index })))(
    'Should print the recorded report for $name',
    async ({ name, args, index }) => {
      const recording = await recordTimRun(staged, name, ['start', ...args])

      expect(recording).toEqual(golden.start[index])
    }
  )
})

describe('tim service-tag refusals match the scripts', () => {
  test.each(
    failureCases.map((failureCase, index) => ({ ...failureCase, index }))
  )(
    'Should refuse $name with the recorded message and exit 1',
    async ({ name, command, withClone, withScope, index }) => {
      const missing = await stageServiceTagWorkspace({ withClone, withScope })

      const recording = await recordTimRun(missing, name, [command])
      missing.remove()

      expect(recording).toEqual(golden.failures[index])
      expect(recording.exitCode).toBe(ERROR)
    }
  )
})

const resultOf = (recorded) =>
  JSON.parse(recorded.stdout.replace(/^MODE: READY\n/, ''))

describe('tim service-tag --json', () => {
  test('Should give the specs list as the envelope result', async () => {
    const run = await runTim(staged, [
      'specs',
      '--tag',
      '@address-book',
      '--json'
    ])

    expect(run.exitCode).toBe(OK)
    expect(
      JSON.parse(
        normaliseRecordedText(
          JSON.stringify(envelopeOf(run).result),
          staged.home
        )
      )
    ).toEqual(resultOf(golden.specs[5]))
  })

  test('Should give the start report as the envelope result, with no ready line', async () => {
    const run = await runTim(staged, ['start', '--service', 'odd', '--json'])

    expect(run.exitCode).toBe(OK)
    expect(
      JSON.parse(
        normaliseRecordedText(
          JSON.stringify(envelopeOf(run).result),
          staged.home
        )
      )
    ).toEqual(resultOf(golden.start[3]))
  })

  test('Should give one error envelope when the clone is missing', async () => {
    const missing = await stageServiceTagWorkspace({ withClone: false })

    const run = await runTim(missing, ['specs', '--json'])
    missing.remove()

    expect(run.exitCode).toBe(ERROR)
    expect(envelopeOf(run).errors).toEqual([
      {
        code: 'MISSING_DEP',
        message: `No ins-tests clone at ${missing.root}/repos/trade-imports-ins-tests`
      }
    ])
  })
})
