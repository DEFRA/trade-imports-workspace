import { expect, test } from 'vitest'
import {
  goldenText,
  recordBashRun,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  checkPendingScript,
  checksFolder,
  goldenPath,
  recordPushScript,
  stagePendingChecks,
  stagePushedRepos,
  stageSonarHookWorkspace
} from './__fixtures__/sonar-hooks.js'

const recordInStagedWorkspace = async (arrange, script, args) => {
  const staged = stageSonarHookWorkspace()
  try {
    const input = await arrange(staged.root)
    const recording = await recordBashRun(staged, script, args, {
      watch: checksFolder,
      env: staged.env,
      exactOutput: true
    })
    return { input, ...recording }
  } finally {
    staged.remove()
  }
}

const recordCheckPending = async (event) => {
  const { input: _folder, ...recording } = await recordInStagedWorkspace(
    stagePendingChecks,
    checkPendingScript,
    [event]
  )
  return { case: 'check-pending', event, ...recording }
}

test.skipIf(
  ![recordPushScript, checkPendingScript].every(workspaceScriptExists)
)(
  'the Bash sonar hooks give the recorded stdout, exit code and checks folder for every case',
  async () => {
    const recordPush = {
      case: 'record-push',
      ...(await recordInStagedWorkspace(stagePushedRepos, recordPushScript, []))
    }
    const checkOnPrompt = await recordCheckPending('UserPromptSubmit')
    const checkOnSessionStart = await recordCheckPending('SessionStart')

    await expect(
      goldenText([recordPush, checkOnPrompt, checkOnSessionStart])
    ).toMatchFileSnapshot(goldenPath)
  },
  120_000
)
