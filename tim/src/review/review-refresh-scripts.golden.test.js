import { expect, test } from 'vitest'
import {
  goldenText,
  recordBashRun,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  observeReview,
  recordedArgs,
  refreshCases,
  refreshScripts,
  scriptFor,
  stageRefreshWorkspace
} from './__fixtures__/review-refresh.js'

const recordCase = async (refreshCase) => {
  const staged = await stageRefreshWorkspace({
    scripts: refreshScripts,
    stubCloneAt: refreshCase.stubCloneAt ?? 'head'
  })
  try {
    const args = refreshCase.bash(staged)
    const output = await recordBashRun(
      staged,
      scriptFor(refreshCase.command),
      args,
      {
        exactOutput: true,
        env: {
          PATH: staged.path,
          TIM_NO_AUTO_PULL: '1',
          TIM_WORKSPACE: undefined
        }
      }
    )
    const state = refreshCase.observe
      ? { state: await observeReview(staged, refreshCase.observe) }
      : {}
    return {
      case: refreshCase.name,
      input: recordedArgs(args, staged.home),
      ...output,
      ...state
    }
  } finally {
    staged.remove()
  }
}

test.skipIf(!refreshScripts.every(workspaceScriptExists))(
  'the refresh scripts and file-diff.sh give the recorded output, exit code and review state for every case',
  async () => {
    const recordings = []
    for (const refreshCase of refreshCases) {
      recordings.push(await recordCase(refreshCase))
    }

    await expect(goldenText(recordings)).toMatchFileSnapshot(
      '__fixtures__/__golden__/review-refresh.json'
    )
  },
  600_000
)
