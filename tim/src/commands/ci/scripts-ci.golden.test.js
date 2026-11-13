import { afterAll, beforeAll, expect, test } from 'vitest'
import {
  goldenText,
  recordBashRun,
  stageBashWorkspace,
  workspaceScriptExists
} from '../../test-support/bash-golden-harness.js'
import {
  allCases,
  BASH_SCRIPT_FOR,
  SCOPE_CONFIG_PATH,
  scopeConfigs
} from './__fixtures__/e2e-scope-cases.js'

const scripts = Object.values(BASH_SCRIPT_FOR)
const scriptsExist = scripts.every(workspaceScriptExists)

const stagedByConfig = {}

const configFilesFor = (config) =>
  config === null
    ? {}
    : { [SCOPE_CONFIG_PATH]: `${JSON.stringify(config, null, 2)}\n` }

beforeAll(() => {
  if (!scriptsExist) return
  for (const [name, config] of Object.entries(scopeConfigs)) {
    stagedByConfig[name] = stageBashWorkspace({
      scripts,
      files: configFilesFor(config)
    })
  }
})

afterAll(() => {
  for (const staged of Object.values(stagedByConfig)) staged.remove()
})

test.skipIf(!scriptsExist)(
  'scripts/ci resolves every scope entry and manual input, and normalises or refuses every suite and tag list',
  async () => {
    const recordings = []
    for (const ciCase of allCases) {
      const recording = await recordBashRun(
        stagedByConfig[ciCase.config],
        BASH_SCRIPT_FOR[ciCase.command],
        [],
        { env: ciCase.env, exactOutput: true }
      )
      recordings.push({ case: ciCase.name, ...recording })
    }

    await expect(goldenText(recordings)).toMatchFileSnapshot(
      '__fixtures__/__golden__/scripts-ci.json'
    )
  },
  60_000
)
