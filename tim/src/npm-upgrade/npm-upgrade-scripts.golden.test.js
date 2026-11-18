import { execa } from 'execa'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import {
  goldenText,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  cases,
  recordUpgradeRun,
  SCRIPT_FOR,
  stageUpgradeWorkspace
} from './__fixtures__/npm-upgrade-workspace.js'

const scripts = Object.values(SCRIPT_FOR)

const recordCase = async (command, fixtureCase) => {
  const staged = stageUpgradeWorkspace(fixtureCase, scripts)
  try {
    const result = await execa(
      '/bin/bash',
      [join(staged.root, SCRIPT_FOR[command]), ...fixtureCase.args],
      {
        cwd: staged.root,
        env: staged.env,
        extendEnv: true,
        reject: false,
        stripFinalNewline: false
      }
    )
    return recordUpgradeRun(staged, fixtureCase, result)
  } finally {
    staged.remove()
  }
}

test.skipIf(!scripts.every(workspaceScriptExists))(
  'tools/npm upgrades a package, runs a repo batch, refreshes a lockfile and resets overrides on every fixture case',
  async () => {
    const golden = {}
    for (const [command, commandCases] of Object.entries(cases)) {
      golden[command] = []
      for (const fixtureCase of commandCases) {
        golden[command].push(await recordCase(command, fixtureCase))
      }
    }

    await expect(goldenText(golden)).toMatchFileSnapshot(
      '__fixtures__/__golden__/npm-upgrade-scripts.json'
    )
  },
  900_000
)
