import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
  cases,
  readStartUpgradeGolden,
  recordStartUpgradeCase,
  startFixtureRegistry,
  timPhase
} from '../__fixtures__/npm-start-upgrade-workspace.js'

const BASH_USAGE_NAME =
  '<HOME>/git/defra/trade-imports-workspace/tools/npm/start-upgrade.sh'
const BASH_WALKER_PATH =
  '~/git/defra/trade-imports-workspace/.claude/skills/npm-upgrade/references/WALKER.md'

const asTimWrites = (text) =>
  typeof text === 'string'
    ? text
        .replaceAll(BASH_USAGE_NAME, 'tim npm upgrade')
        .replaceAll(
          BASH_WALKER_PATH,
          '<HOME>/git/defra/trade-imports-workspace/.claude/skills/npm-upgrade/references/WALKER.md'
        )
    : text

const expectedRunOf = (name) => {
  const recorded = readStartUpgradeGolden().find((run) => run.case === name)
  return {
    ...recorded,
    steps: recorded.steps.map((step) => ({
      ...step,
      stderr: asTimWrites(step.stderr)
    }))
  }
}

let registry

beforeAll(async () => {
  registry = await startFixtureRegistry()
})

afterAll(async () => {
  await registry.close()
})

describe('#runUpgradePhase', () => {
  test.each(cases.map((fixtureCase) => [fixtureCase.name, fixtureCase]))(
    'Should do what start-upgrade.sh did: %s',
    async (name, fixtureCase) => {
      const timRun = await recordStartUpgradeCase(
        fixtureCase,
        registry.url,
        timPhase
      )

      expect(timRun).toEqual(expectedRunOf(name))
    },
    180_000
  )
})
