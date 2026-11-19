import { describe, expect, test } from 'vitest'
import {
  cases,
  expectedRunOf,
  replayUpgradeCase
} from './__fixtures__/npm-upgrade-workspace.js'

describe('#runAutomatedUpgrades', () => {
  test.each(
    cases['run-auto'].map((fixtureCase) => [fixtureCase.name, fixtureCase])
  )(
    'Should do what run-automated-upgrades.sh did: %s',
    async (name, fixtureCase) => {
      const timRun = await replayUpgradeCase('run-auto', fixtureCase)

      expect(timRun).toEqual(expectedRunOf('run-auto', name))
    },
    60_000
  )
})
