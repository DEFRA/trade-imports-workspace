import { expect, test } from 'vitest'
import {
  goldenText,
  recordBashRun,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  callLogFolder,
  goldenPath,
  mcpTidyCases,
  mcpTidyScript,
  stageMcpTidyWorkspace
} from './__fixtures__/mcp-tidy.js'

const recordBashTidy = async (caseName) => {
  const staged = stageMcpTidyWorkspace(caseName)
  try {
    const recording = await recordBashRun(staged, mcpTidyScript, [], {
      watch: callLogFolder,
      env: staged.env,
      exactOutput: true
    })
    return { case: caseName, ...recording }
  } finally {
    staged.remove()
  }
}

test.skipIf(!workspaceScriptExists(mcpTidyScript))(
  'the Bash MCP container tidy gives the recorded stdout, exit code and docker calls for every case',
  async () => {
    const recordings = []
    for (const caseName of Object.keys(mcpTidyCases)) {
      recordings.push(await recordBashTidy(caseName))
    }

    await expect(goldenText(recordings)).toMatchFileSnapshot(goldenPath)
  },
  60_000
)
