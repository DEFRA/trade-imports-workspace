import { expect, test } from 'vitest'
import {
  goldenText,
  recordBashRun,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  recordStartCase,
  START_SCRIPTS,
  startCases,
  stageStartWorkspace
} from './__fixtures__/govuk-start.js'

test.skipIf(!START_SCRIPTS.every(workspaceScriptExists))(
  'tools/govuk/start-upgrade.sh starts every fixture case with stub npm, curl and tim',
  async () => {
    const runs = []
    for (const startCase of startCases) {
      const staged = stageStartWorkspace({ scripts: START_SCRIPTS })
      try {
        runs.push(
          await recordStartCase(staged, startCase, (args, env) =>
            recordBashRun(staged, START_SCRIPTS[0], args, {
              env,
              exactOutput: true
            })
          )
        )
      } finally {
        staged.remove()
      }
    }

    await expect(goldenText(runs)).toMatchFileSnapshot(
      '__fixtures__/__golden__/govuk-start.json'
    )
  },
  180_000
)
