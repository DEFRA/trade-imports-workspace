import { expect, test } from 'vitest'
import {
  goldenText,
  recordBashRun,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  argsIn,
  cases,
  HELPER_SCRIPTS,
  RUN_FOLDER,
  SCRIPT_FOR,
  stageDiscoverWorkspace,
  stageFakeCommands
} from './__fixtures__/npm-discover-workspace.js'

const scripts = [...Object.values(SCRIPT_FOR), ...HELPER_SCRIPTS]

const recordCase = async (command, fixtureCase) => {
  const { name, args, upgrades, withPrior, withoutDocs } = fixtureCase
  const staged = stageDiscoverWorkspace({
    command,
    withPrior,
    withoutDocs,
    scripts
  })
  const fakes = stageFakeCommands({ upgrades })
  try {
    const recording = await recordBashRun(
      staged,
      SCRIPT_FOR[command],
      argsIn(args, staged.root),
      {
        exactOutput: true,
        watch: RUN_FOLDER,
        env: { PATH: `${fakes.bin}:${process.env.PATH}` }
      }
    )
    return { case: name, input: args, ...recording }
  } finally {
    staged.remove()
    fakes.remove()
  }
}

test.skipIf(!scripts.every(workspaceScriptExists))(
  'tools/npm discovers upgrades, bakes the best-practice bundle and pre-bakes package context on every fixture case',
  async () => {
    const golden = {}
    for (const [command, commandCases] of Object.entries(cases)) {
      golden[command] = []
      for (const fixtureCase of commandCases) {
        golden[command].push(await recordCase(command, fixtureCase))
      }
    }

    await expect(goldenText(golden)).toMatchFileSnapshot(
      '__fixtures__/__golden__/npm-discover-scripts.json'
    )
  },
  300_000
)
