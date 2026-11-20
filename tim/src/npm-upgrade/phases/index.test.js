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

describe('#runUpgradePhase with --trailer', () => {
  const COAUTHOR = 'Co-Authored-By: Claude <noreply@anthropic.com>'
  const SESSION = 'Claude-Session: https://claude.ai/code/session_1'

  const withTrailers = (name) => {
    const fixtureCase = cases.find((candidate) => candidate.name === name)
    return {
      ...fixtureCase,
      steps: fixtureCase.steps.map(({ phase }) => ({
        phase: [...phase, '--trailer', COAUTHOR, '--trailer', SESSION]
      }))
    }
  }

  const frontendLogOf = (timRun) =>
    timRun.repos['trade-imports-animals-frontend'].log.replaceAll(
      /^[0-9a-f]{7,40} /gm,
      '<COMMIT> '
    )

  test('Should end each phase 2 upgrade commit with the trailers in the order given', async () => {
    const timRun = await recordStartUpgradeCase(
      withTrailers('phase 2 skips a repo phase 1 never discovered'),
      registry.url,
      timPhase
    )

    expect(frontendLogOf(timRun)).toBe(
      `<COMMIT> Upgrade lodash 4.17.20 → 4.17.21\n${COAUTHOR}\n${SESSION}\n\n<COMMIT> Fixture repo\n`
    )
  }, 180_000)

  test('Should end the phase 4 commit with the trailers in the order given', async () => {
    const timRun = await recordStartUpgradeCase(
      withTrailers('phase 4 keeps the overrides the audit and the tests need'),
      registry.url,
      timPhase
    )

    const log = frontendLogOf(timRun)
    const ending = `\n${COAUTHOR}\n${SESSION}\n\n<COMMIT> Fixture repo\n`
    expect(log).toMatch(/^<COMMIT> Remove overrides\nRemoved: /)
    expect(log.slice(-ending.length)).toBe(ending)
  }, 180_000)
})
