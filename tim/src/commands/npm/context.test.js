import { afterEach, describe, expect, test } from 'vitest'
import { ERROR, OK } from '../../constants/exitCodes.js'
import { recordTimRun } from '../../test-support/bash-golden-harness.js'
import {
  cases,
  readDiscoverGolden,
  REPO,
  RUN_FOLDER,
  RUN_ID,
  stageDiscoverWorkspace
} from '../../npm-upgrade/__fixtures__/npm-discover-workspace.js'

const golden = readDiscoverGolden()

let staged

afterEach(() => {
  staged?.remove()
  staged = undefined
})

const recordContext = async (command, { args, withPrior, withoutDocs }) => {
  staged = stageDiscoverWorkspace({ command, withPrior, withoutDocs })
  return recordTimRun(staged, ['npm', 'context', command, ...args], {
    watch: RUN_FOLDER
  })
}

describe('tim npm context best-practices matches bake-best-practices.sh', () => {
  test.each(
    cases['best-practices'].map((fixtureCase) => [
      fixtureCase.name,
      fixtureCase
    ])
  )(
    'Should print, exit and write what the Bash did for %s',
    async (name, fixtureCase) => {
      const run = await recordContext('best-practices', fixtureCase)

      expect({ case: name, input: fixtureCase.args, ...run }).toEqual(
        golden['best-practices'].find((recorded) => recorded.case === name)
      )
    }
  )

  test('Should give the bundle path as the envelope result', async () => {
    const run = await recordContext('best-practices', {
      args: ['--run-id', RUN_ID, '--repo', REPO, '--json']
    })

    expect({
      exitCode: run.exitCode,
      result: JSON.parse(run.stdout).result
    }).toEqual({
      exitCode: OK,
      result: {
        path: `<HOME>/git/defra/trade-imports-workspace/${RUN_FOLDER}/${REPO}/best-practices.md`
      }
    })
  })
})

describe('tim npm context prebake refusals match prebake-context.sh', () => {
  test.each([
    'a package the run does not list',
    'a repo the run does not have'
  ])(
    'Should print, exit and leave the run as the Bash did for %s',
    async (name) => {
      const fixtureCase = cases.prebake.find(
        (candidate) => candidate.name === name
      )

      const run = await recordContext('prebake', fixtureCase)

      expect({ case: name, input: fixtureCase.args, ...run }).toEqual(
        golden.prebake.find((recorded) => recorded.case === name)
      )
    }
  )

  test('Should refuse a missing --package with its usage line and exit 1', async () => {
    const run = await recordContext('prebake', {
      args: ['--run-id', RUN_ID, '--repo', REPO]
    })

    expect({ exitCode: run.exitCode, stderr: run.stderr }).toEqual({
      exitCode: ERROR,
      stderr:
        'Usage: tim npm context prebake --run-id TICKET --repo REPO --package PKG\n'
    })
  })
})
