import { expect, test } from 'vitest'
import {
  goldenText,
  recordBashRun,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  filesWritten,
  scriptFor,
  toolsCases,
  toolsScripts,
  toolsWatchFolder
} from './__fixtures__/style-tools.js'
import { stageStyleWorkspace } from './__fixtures__/style-tools-runs.js'

const recordCase = async ({ name, steps }) => {
  const staged = stageStyleWorkspace({ scripts: toolsScripts })
  try {
    const recordedSteps = []
    for (const { command, args } of steps) {
      const { files, ...output } = await recordBashRun(
        staged,
        scriptFor(command),
        args,
        { watch: toolsWatchFolder, exactOutput: true }
      )
      recordedSteps.push({
        command,
        input: args,
        ...output,
        filesWritten: filesWritten(files)
      })
    }
    return { case: name, steps: recordedSteps }
  } finally {
    staged.remove()
  }
}

test.skipIf(!toolsScripts.every(workspaceScriptExists))(
  'the style items, per-file, aggregate and reconcile scripts give the recorded output, exit code and files for every case',
  async () => {
    const recordings = []
    for (const toolsCase of toolsCases) {
      recordings.push(await recordCase(toolsCase))
    }

    await expect(goldenText(recordings)).toMatchFileSnapshot(
      '__fixtures__/__golden__/style-tools.json'
    )
  },
  300_000
)
