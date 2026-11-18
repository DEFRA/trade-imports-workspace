import { describe, expect, test } from 'vitest'
import {
  cases,
  expectedRunOf,
  replayUpgradeCase
} from './__fixtures__/npm-upgrade-workspace.js'

describe('#refreshLockfile', () => {
  test.each(
    cases['refresh-lockfile'].map((fixtureCase) => [
      fixtureCase.name,
      fixtureCase
    ])
  )(
    'Should do what refresh-lockfile.sh did: %s',
    async (name, fixtureCase) => {
      const timRun = await replayUpgradeCase('refresh-lockfile', fixtureCase)

      expect(timRun).toEqual(expectedRunOf('refresh-lockfile', name))
    },
    60_000
  )
})
