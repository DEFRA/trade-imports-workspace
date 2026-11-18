import { describe, expect, test } from 'vitest'
import {
  cases,
  expectedRunOf,
  replayUpgradeCase
} from './__fixtures__/npm-upgrade-workspace.js'

describe('#resetOverrides', () => {
  test.each(
    cases['reset-overrides'].map((fixtureCase) => [
      fixtureCase.name,
      fixtureCase
    ])
  )(
    'Should do what reset-overrides.sh did: %s',
    async (name, fixtureCase) => {
      const timRun = await replayUpgradeCase('reset-overrides', fixtureCase)

      expect(timRun).toEqual(expectedRunOf('reset-overrides', name))
    },
    60_000
  )
})
