import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { ERROR, OK, USAGE } from '../../constants/exitCodes.js'
import {
  normaliseRecordedText,
  recordTimRun
} from '../../test-support/bash-golden-harness.js'
import {
  applyCases,
  readGovukApplyGolden,
  recordApplyCase,
  stageApplyRepos
} from '../../govuk/__fixtures__/govuk-apply.js'
import {
  ADMIN,
  RUN_ID,
  stageGovukWorkspace
} from '../../govuk/__fixtures__/govuk-workspace.js'
import {
  readGovukWritesGolden,
  writeCases
} from '../../govuk/__fixtures__/govuk-writes.js'

const writesGolden = readGovukWritesGolden()
const applyGolden = readGovukApplyGolden()

const asTimArgs = (bashArgs) =>
  bashArgs.map((arg) => (arg === '--version' ? '--govuk-version' : arg))

const stateFileText = (root, repo) => {
  const path = join(
    root,
    'workareas/govuk-upgrades',
    RUN_ID,
    repo,
    `versions.${repo}.json`
  )
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}

let staged

afterEach(() => staged?.remove())

const recordWriteCase = async (command, { name, steps }) => {
  staged = stageGovukWorkspace()
  const runs = []
  for (const args of steps) {
    runs.push(
      await recordTimRun(staged, ['govuk', command, ...asTimArgs(args)])
    )
  }
  const repo = steps[0][steps[0].indexOf('--repo') + 1]
  const state = stateFileText(staged.root, repo)
  const record = {
    case: name,
    steps,
    runs,
    state: state === null ? null : normaliseRecordedText(state, staged.home)
  }
  staged.remove()
  staged = undefined
  return record
}

const asUsageRefusal = (golden) => ({
  ...golden,
  runs: golden.runs.map((run) => ({ ...run, exitCode: USAGE }))
})

describe.each(Object.keys(writeCases))(
  'tim govuk %s matches its Bash script',
  (command) => {
    test('Should print, exit and leave the state file as the Bash did on every case', async () => {
      const runs = []
      for (const writeCase of writeCases[command]) {
        runs.push(await recordWriteCase(command, writeCase))
      }

      expect(runs).toEqual(
        writesGolden[command].map((golden) =>
          golden.case === 'invalid classification'
            ? asUsageRefusal(golden)
            : golden
        )
      )
    })
  }
)

describe('tim govuk state writes', () => {
  test('Should stamp classified_at as UTC to the second', async () => {
    staged = stageGovukWorkspace()

    await recordTimRun(staged, [
      'govuk',
      'classify',
      '--run-id',
      RUN_ID,
      '--repo',
      ADMIN,
      '--govuk-version',
      '5.10.0',
      '--classification',
      'todo'
    ])

    const state = JSON.parse(stateFileText(staged.root, ADMIN))
    expect(state.versions[0].classified_at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
    )
  })

  test('Should refuse a missing --classification with exit 2 and leave the state file alone', async () => {
    staged = stageGovukWorkspace()
    const before = stateFileText(staged.root, ADMIN)

    const run = await recordTimRun(staged, [
      'govuk',
      'classify',
      '--run-id',
      RUN_ID,
      '--repo',
      ADMIN,
      '--govuk-version',
      '5.10.0'
    ])

    expect(run).toEqual({
      exitCode: USAGE,
      stdout: '',
      stderr: 'Missing --classification\n'
    })
    expect(stateFileText(staged.root, ADMIN)).toBe(before)
  })

  test('Should give the changed version as the envelope result with --json', async () => {
    staged = stageGovukWorkspace()

    const run = await recordTimRun(staged, [
      'govuk',
      'mark-failed',
      '--run-id',
      RUN_ID,
      '--repo',
      ADMIN,
      '--govuk-version',
      '5.8.0',
      '--reason',
      'npm test failed',
      '--json'
    ])

    expect(run.exitCode).toBe(OK)
    expect(JSON.parse(run.stdout).result).toEqual({
      message: `Marked ${ADMIN}@5.8.0 as failed: npm test failed`,
      entry: expect.objectContaining({
        version: '5.8.0',
        implementation_status: 'failed',
        failure_reason: 'npm test failed'
      })
    })
  })
})

const NON_FINAL_SUCCESSES = new Set([
  'intermediate todo',
  'failed version applied again',
  'govuk-frontend in devDependencies'
])

const applyGoldenAsTimExits = () =>
  applyGolden.map((golden) =>
    NON_FINAL_SUCCESSES.has(golden.case) ? { ...golden, exitCode: OK } : golden
  )

describe('tim govuk apply matches apply-version.sh', () => {
  test('Should print, exit, commit and leave the files as the Bash did on every case, exiting 0 on every success', async () => {
    const runs = []
    for (const applyCase of applyCases) {
      staged = stageGovukWorkspace()
      stageApplyRepos(staged)
      runs.push(
        await recordApplyCase(staged, applyCase, (args, env) =>
          recordTimRun(staged, ['govuk', 'apply', ...asTimArgs(args)], { env })
        )
      )
      staged.remove()
      staged = undefined
    }

    expect(runs).toEqual(applyGoldenAsTimExits())
  }, 120_000)

  test('Should give the outcome as the envelope result and exit 1 when npm test fails with --json', async () => {
    staged = stageGovukWorkspace()
    stageApplyRepos(staged)
    const testFails = applyCases.find(({ name }) => name === 'npm test fails')

    const record = await recordApplyCase(staged, testFails, (args, env) =>
      recordTimRun(staged, ['govuk', 'apply', ...asTimArgs(args), '--json'], {
        env
      })
    )

    const installLog = `/tmp/govuk-install-${ADMIN}-5.8.0-<STAMP>.txt`
    const testLog = `/tmp/govuk-test-${ADMIN}-5.8.0-<STAMP>.txt`
    expect(record.exitCode).toBe(ERROR)
    expect(JSON.parse(record.stdout).result).toEqual({
      outcome: 'failed',
      repo: ADMIN,
      version: '5.8.0',
      reason: `npm test failed — see ${testLog}`,
      installLog,
      testLog
    })
    expect(Object.keys(record.logs).sort()).toEqual([installLog, testLog])
  })
})
