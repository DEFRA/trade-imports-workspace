import { afterAll, beforeAll, expect, test } from 'vitest'
import {
  goldenText,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  bashPhase,
  cases,
  recordStartUpgradeCase,
  SCRIPT,
  startFixtureRegistry
} from './__fixtures__/npm-start-upgrade-workspace.js'

let registry

beforeAll(async () => {
  registry = await startFixtureRegistry()
})

afterAll(async () => {
  await registry.close()
})

test.skipIf(!workspaceScriptExists(SCRIPT))(
  'tools/npm/start-upgrade.sh runs every phase on every fixture case',
  async () => {
    const golden = []
    for (const fixtureCase of cases) {
      golden.push(
        await recordStartUpgradeCase(fixtureCase, registry.url, bashPhase, [
          SCRIPT
        ])
      )
    }

    await expect(goldenText(golden)).toMatchFileSnapshot(
      '__fixtures__/__golden__/npm-start-upgrade-script.json'
    )
  },
  900_000
)
