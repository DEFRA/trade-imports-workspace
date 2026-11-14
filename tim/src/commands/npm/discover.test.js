import { afterEach, describe, expect, test } from 'vitest'
import { ERROR } from '../../constants/exitCodes.js'
import { recordTimRun } from '../../test-support/bash-golden-harness.js'
import {
  argsIn,
  cases,
  readDiscoverGolden,
  RUN_FOLDER,
  RUN_ID,
  stageDiscoverWorkspace
} from '../../npm-upgrade/__fixtures__/npm-discover-workspace.js'

const golden = readDiscoverGolden().discover

let staged

afterEach(() => {
  staged?.remove()
  staged = undefined
})

const refusedCases = cases.discover.filter(({ name }) =>
  golden.some((run) => run.case === name && run.exitCode !== 0)
)

const recordDiscover = async (args) => {
  staged = stageDiscoverWorkspace({ command: 'discover' })
  return recordTimRun(
    staged,
    ['npm', 'discover', ...argsIn(args, staged.root)],
    {
      watch: RUN_FOLDER
    }
  )
}

describe('tim npm discover refusals match discover-upgrades.sh', () => {
  test.each(
    refusedCases
      .filter(({ args }) => !args.includes('--json'))
      .map((fixtureCase) => [fixtureCase.name, fixtureCase])
  )('Should print and exit as the Bash did for %s', async (name, { args }) => {
    const run = await recordDiscover(args)

    expect({ case: name, input: args, ...run }).toEqual(
      golden.find((recorded) => recorded.case === name)
    )
  })

  test.each(
    refusedCases
      .filter(({ args }) => args.includes('--json'))
      .map((fixtureCase) => [fixtureCase.name, fixtureCase])
  )(
    'Should give the Bash error as the envelope error for %s',
    async (name, { args }) => {
      const run = await recordDiscover(args)

      const recorded = golden.find((candidate) => candidate.case === name)
      expect({
        exitCode: run.exitCode,
        error: JSON.parse(run.stdout).errors[0].message
      }).toEqual({
        exitCode: recorded.exitCode,
        error: JSON.parse(recorded.stdout).error
      })
    }
  )
})

describe('tim npm discover --repo', () => {
  test('Should look for the repo under the workspace repos folder', async () => {
    const run = await recordDiscover(['--repo', 'missing', '--run-id', RUN_ID])

    expect({ exitCode: run.exitCode, stderr: run.stderr }).toEqual({
      exitCode: ERROR,
      stderr:
        'Error: Repository path does not exist: <HOME>/git/defra/trade-imports-workspace/repos/missing\n'
    })
  })

  test('Should refuse a repository path and --repo together', async () => {
    const run = await recordDiscover([
      '<ROOT>/repos/trade-imports-animals-frontend',
      '--repo',
      'trade-imports-animals-frontend',
      '--run-id',
      RUN_ID
    ])

    expect({ exitCode: run.exitCode, stderr: run.stderr }).toEqual({
      exitCode: ERROR,
      stderr:
        'Error: Give a repository path or --repo, not both. Use --help for usage information\n'
    })
  })
})
