import { describe, expect, test } from 'vitest'
import {
  cases,
  expectedRunOf,
  replayUpgradeCase
} from './__fixtures__/npm-upgrade-workspace.js'

describe('#upgradePackage', () => {
  test.each(
    cases['upgrade-one'].map((fixtureCase) => [fixtureCase.name, fixtureCase])
  )(
    'Should do what upgrade-one-package.sh did: %s',
    async (name, fixtureCase) => {
      const timRun = await replayUpgradeCase('upgrade-one', fixtureCase)

      expect(timRun).toEqual(expectedRunOf('upgrade-one', name))
    },
    60_000
  )

  test.each(
    cases['run-manual'].map((fixtureCase) => [fixtureCase.name, fixtureCase])
  )(
    'Should do what run-manual-upgrade.sh did: %s',
    async (name, fixtureCase) => {
      const timRun = await replayUpgradeCase('run-manual', fixtureCase)

      expect(timRun).toEqual(expectedRunOf('run-manual', name))
    },
    60_000
  )
})
