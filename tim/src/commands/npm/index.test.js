import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { ERROR, OK } from '../../constants/exitCodes.js'
import { recordTimRun } from '../../test-support/bash-golden-harness.js'
import {
  ADMIN,
  readCases,
  readNpmGolden,
  RUN_FOLDER,
  RUN_ID,
  stageNpmWorkspace,
  writeCases
} from '../../npm-upgrade/__fixtures__/npm-workspace.js'

const golden = readNpmGolden()

const WATCHED = new Set([
  'set-status',
  'set-classification',
  'aggregate',
  'verify'
])

let staged

afterEach(() => {
  staged?.remove()
  staged = undefined
})

const recordCase = async (command, { name, args, withFragments = false }) => {
  staged = stageNpmWorkspace({ withFragments })
  const recording = await recordTimRun(
    staged,
    ['npm', 'packages', command, ...args],
    {
      watch: WATCHED.has(command) ? RUN_FOLDER : undefined
    }
  )
  staged.remove()
  staged = undefined
  return { case: name, input: args, ...recording }
}

const isJsonCase = ({ input }) => input.includes('--json')

const parsedJson = (text) => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

const goldenJsonOutcome = (run) => {
  const result = parsedJson(run.stdout)
  return result === undefined
    ? {
        case: run.case,
        exitCode: run.exitCode,
        error: run.stderr.trimEnd(),
        files: run.files
      }
    : {
        case: run.case,
        exitCode: run.exitCode,
        result,
        stderr: run.stderr,
        files: run.files
      }
}

const timJsonOutcome = (run) => {
  const envelope = JSON.parse(run.stdout)
  return envelope.ok
    ? {
        case: run.case,
        exitCode: run.exitCode,
        result: envelope.result,
        stderr: run.stderr,
        files: run.files
      }
    : {
        case: run.case,
        exitCode: run.exitCode,
        error: envelope.errors[0].message,
        files: run.files
      }
}

const recordEach = async (command, cases) => {
  const runs = []
  for (const fixtureCase of cases) {
    runs.push(await recordCase(command, fixtureCase))
  }
  return runs
}

describe.each(Object.keys({ ...readCases, ...writeCases }))(
  'tim npm packages %s matches its Bash script',
  (command) => {
    const cases = { ...readCases, ...writeCases }[command]

    test('Should print, exit and leave the run folder as the Bash did on every text case', async () => {
      const textCases = cases.filter(({ args }) => !args.includes('--json'))

      const runs = await recordEach(command, textCases)

      expect(runs).toEqual(golden[command].filter((run) => !isJsonCase(run)))
    })

    test('Should give the Bash JSON as the envelope result, or its message as the envelope error', async () => {
      const jsonCases = cases.filter(({ args }) => args.includes('--json'))

      const runs = await recordEach(command, jsonCases)

      expect(runs.map(timJsonOutcome)).toEqual(
        golden[command].filter(isJsonCase).map(goldenJsonOutcome)
      )
    })
  },
  120_000
)

describe('tim npm packages usage', () => {
  test.each([
    ['list', []],
    ['counts', []],
    ['aggregate', []],
    ['verify', []],
    ['set-status', ['--run-id', RUN_ID, '--repo', ADMIN, '--status', 'todo']],
    [
      'set-classification',
      [
        '--run-id',
        RUN_ID,
        '--repo',
        ADMIN,
        '--package',
        'lodash',
        '--classification',
        'auto',
        '--risk',
        'LOW',
        '--safe-for-automation',
        'true',
        '--rationale',
        ''
      ]
    ]
  ])(
    'Should refuse %s with a missing option, print its usage and exit 1',
    async (command, args) => {
      staged = stageNpmWorkspace()

      const run = await recordTimRun(staged, [
        'npm',
        'packages',
        command,
        ...args
      ])

      expect({ exitCode: run.exitCode, stdout: run.stdout }).toEqual({
        exitCode: ERROR,
        stdout: ''
      })
      expect(run.stderr).toContain(
        `Usage: tim npm packages ${command} --run-id TICKET`
      )
    }
  )
})

describe('tim npm packages set-classification in parallel', () => {
  test('Should keep all 20 classifications when 20 planners write at once and aggregate folds them', async () => {
    const names = Array.from(
      { length: 20 },
      (_, index) => `@scope/package-${index}`
    )
    const rows = names.map((name) => ({
      package: name,
      current: '1.0.0',
      target: '2.0.0',
      upgrade_type: 'major',
      classification: null
    }))
    staged = stageNpmWorkspace()
    const packagesFile = join(
      staged.root,
      RUN_FOLDER,
      'parallel-repo',
      'packages.parallel-repo.json'
    )
    mkdirSync(join(staged.root, RUN_FOLDER, 'parallel-repo'), {
      recursive: true
    })
    writeFileSync(
      packagesFile,
      JSON.stringify({ repo: 'parallel-repo', packages: rows })
    )

    const writes = await Promise.all(
      names.map((name, index) =>
        recordTimRun(staged, [
          'npm',
          'packages',
          'set-classification',
          '--run-id',
          RUN_ID,
          '--repo',
          'parallel-repo',
          '--package',
          name,
          '--classification',
          index % 2 === 0 ? 'auto' : 'manual',
          '--risk',
          'LOW',
          '--safe-for-automation',
          'true',
          '--rationale',
          `Row ${index}`
        ])
      )
    )
    const aggregate = await recordTimRun(staged, [
      'npm',
      'packages',
      'aggregate',
      '--run-id',
      RUN_ID,
      '--repo',
      'parallel-repo'
    ])

    expect(writes.map(({ exitCode }) => exitCode)).toEqual(names.map(() => OK))
    expect(aggregate.stdout).toMatch(/Aggregated 20 classification\(s\)/)
    expect(
      JSON.parse(readFileSync(packagesFile, 'utf8')).packages.map(
        ({ package: name, classification, rationale }) => ({
          name,
          classification,
          rationale
        })
      )
    ).toEqual(
      names.map((name, index) => ({
        name,
        classification: index % 2 === 0 ? 'auto' : 'manual',
        rationale: `Row ${index}`
      }))
    )
  }, 120_000)
})
