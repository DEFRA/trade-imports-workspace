import { afterEach, describe, expect, test } from 'vitest'
import { recordTimRun } from '../../test-support/bash-golden-harness.js'
import {
  argsIn,
  cases,
  EMPTY_REPORT,
  GHSA,
  REPO,
  RUN_FOLDER,
  RUN_ID,
  stageAuditWorkspace,
  stageFakeCommands
} from '../../npm-upgrade/__fixtures__/npm-audit-workspace.js'
import {
  expectSameAsBash,
  goldenRunOf
} from '../../npm-upgrade/__fixtures__/npm-audit-replay.js'

const staging = []

afterEach(() => {
  staging.splice(0).forEach((staged) => staged.remove())
})

const stage = (fixtureCase) => {
  const staged = stageAuditWorkspace(fixtureCase)
  const fakes = stageFakeCommands(fixtureCase)
  staging.push(staged, fakes)
  return { staged, fakes }
}

const runTim = (fixtureCase, args) => {
  const { staged, fakes } = stage(fixtureCase)
  return recordTimRun(staged, argsIn(args, staged.root), {
    env: fakes.env,
    watch: RUN_FOLDER
  })
}

const caseNamed = (commandName, name) =>
  cases[commandName].find((fixtureCase) => fixtureCase.name === name)

describe('tim npm audit, spawned, on cases that do not hang on the date', () => {
  test.each([
    ['baseline', 'red on advisories with and without a fix'],
    ['baseline', 'green with nothing reported'],
    ['baseline', 'a fix blocked upstream stays green'],
    ['baseline', 'no audit-ci config'],
    ['baseline', 'audit-ci gives no report'],
    ['baseline', 'no run id'],
    ['allow', 'an advisory not in the audit is refused'],
    ['allow', 'a GHSA in upper case'],
    ['forget', 'drops one entry'],
    ['forget', 'not a GHSA id']
  ])(
    'Should print and exit as the Bash did: %s %s',
    async (commandName, name) => {
      const fixtureCase = caseNamed(commandName, name)

      const { files, ...timRun } = await runTim(fixtureCase, [
        'npm',
        'audit',
        commandName,
        ...fixtureCase.args
      ])

      const {
        case: recordedName,
        input,
        configs,
        ...recorded
      } = goldenRunOf(commandName, name)
      expectSameAsBash({ ...timRun, files }, recorded, fixtureCase)
    },
    30_000
  )
})

describe('tim npm audit baseline --json', () => {
  test('Should give the summary in the envelope and exit 1 on a red audit', async () => {
    const fixtureCase = { auditExit: 1 }

    const { stdout, exitCode } = await runTim(fixtureCase, [
      'npm',
      'audit',
      'baseline',
      '--run-id',
      RUN_ID,
      '--repo',
      REPO,
      '--json'
    ])

    const envelope = JSON.parse(stdout)
    expect(exitCode).toBe(1)
    expect(envelope.ok).toBe(true)
    expect(envelope.result.failing).toEqual([
      GHSA.ws,
      GHSA.basicFtp,
      GHSA.braces
    ])
  }, 30_000)
})

describe('tim npm audit baseline options', () => {
  test('Should exit 2 on an option it does not know', async () => {
    const { exitCode, stderr } = await runTim({}, [
      'npm',
      'audit',
      'baseline',
      '--run-id',
      RUN_ID,
      '--repo',
      REPO,
      '--colour'
    ])

    expect(exitCode).toBe(2)
    expect(stderr).toContain("unknown option '--colour'")
  }, 30_000)
})

describe('tim npm audit gate', () => {
  const gateArgs = [
    'npm',
    'audit',
    'gate',
    '--run-id',
    RUN_ID,
    '--repo',
    REPO,
    '--package',
    'lodash',
    '--target',
    '4.17.21'
  ]

  test('Should print a green status and exit 0 on a clean audit', async () => {
    const { stdout, exitCode } = await runTim(
      { report: EMPTY_REPORT },
      gateArgs
    )

    expect(exitCode).toBe(0)
    expect(JSON.parse(stdout)).toEqual({
      status: 'green',
      reason: null,
      allowlisted: []
    })
  }, 30_000)

  test('Should exit 1 with the reason when an advisory has a fix', async () => {
    const { stdout, exitCode } = await runTim({ auditExit: 1 }, gateArgs)

    expect(exitCode).toBe(1)
    expect(JSON.parse(stdout).status).toBe('red')
  }, 30_000)

  test('Should exit 2 when the audit cannot run', async () => {
    const { stdout, exitCode } = await runTim(
      { report: 'not json', auditExit: 1 },
      gateArgs
    )

    expect(exitCode).toBe(2)
    expect(JSON.parse(stdout).status).toBe('not_run')
  }, 30_000)

  test('Should exit 2 without a target', async () => {
    const { exitCode, stderr } = await runTim({}, gateArgs.slice(0, -2))

    expect(exitCode).toBe(2)
    expect(stderr).toContain('Usage: tim npm audit gate')
  }, 30_000)
})
