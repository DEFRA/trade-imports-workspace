import { expect, test } from 'vitest'
import {
  goldenText,
  recordBashRun,
  workspaceScriptExists
} from '../../test-support/bash-golden-harness.js'
import { recordingOf } from './__fixtures__/recording.js'
import {
  BASH_SCRIPT_FOR,
  failureCases,
  specsCases,
  stageServiceTagWorkspace,
  startCases
} from './__fixtures__/service-tag-workspace.js'

const scripts = Object.values(BASH_SCRIPT_FOR)
const scriptsExist = scripts.every(workspaceScriptExists)

const recordCases = async (staged, command, cases) => {
  const recordings = []
  for (const { name, args } of cases) {
    const run = await recordBashRun(staged, BASH_SCRIPT_FOR[command], args, {
      exactOutput: true
    })
    recordings.push(recordingOf(name, run))
  }
  return recordings
}

const recordFailure = async ({ name, command, withClone, withScope }) => {
  const staged = await stageServiceTagWorkspace({
    scripts,
    withClone,
    withScope
  })
  try {
    const run = await recordBashRun(staged, BASH_SCRIPT_FOR[command], [], {
      exactOutput: true
    })
    return recordingOf(name, run)
  } finally {
    staged.remove()
  }
}

test.skipIf(!scriptsExist)(
  'tools/service-tag lists specs by every filter, reports every scope entry and refuses a missing clone or scope file',
  async () => {
    const staged = await stageServiceTagWorkspace({ scripts })
    try {
      const golden = {
        specs: await recordCases(staged, 'specs', specsCases),
        start: await recordCases(staged, 'start', startCases),
        failures: await Promise.all(failureCases.map(recordFailure))
      }

      await expect(goldenText(golden)).toMatchFileSnapshot(
        '__fixtures__/__golden__/service-tag-scripts.json'
      )
    } finally {
      staged.remove()
    }
  },
  120_000
)
