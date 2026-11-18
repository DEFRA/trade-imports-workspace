import { expect, test } from 'vitest'
import {
  goldenText,
  recordBashRun,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  readCases,
  RUN_FOLDER,
  SCRIPT_FOR,
  stageNpmWorkspace,
  writeCases
} from './__fixtures__/npm-workspace.js'

const scripts = Object.values(SCRIPT_FOR)

const WATCHED = new Set([
  'set-status',
  'set-classification',
  'aggregate',
  'verify'
])

const recordCase = async (command, { name, args, withFragments = false }) => {
  const staged = stageNpmWorkspace({ scripts, withFragments })
  try {
    const recording = await recordBashRun(staged, SCRIPT_FOR[command], args, {
      exactOutput: true,
      watch: WATCHED.has(command) ? RUN_FOLDER : undefined
    })
    return { case: name, input: args, ...recording }
  } finally {
    staged.remove()
  }
}

test.skipIf(!scripts.every(workspaceScriptExists))(
  'tools/npm lists, counts, writes, folds and checks package state on every fixture case',
  async () => {
    const golden = {}
    for (const [command, cases] of Object.entries({
      ...readCases,
      ...writeCases
    })) {
      golden[command] = []
      for (const fixtureCase of cases) {
        golden[command].push(await recordCase(command, fixtureCase))
      }
    }

    await expect(goldenText(golden)).toMatchFileSnapshot(
      '__fixtures__/__golden__/npm-packages-scripts.json'
    )
  },
  300_000
)
