import { expect, test } from 'vitest'
import {
  goldenText,
  recordBashRun,
  stageBashWorkspace,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  filesWritten,
  ledgerCases,
  ledgerFiles,
  ledgerScripts,
  ledgerWatchFolder,
  scriptFor
} from './__fixtures__/review-ledger.js'

const recordCase = async ({ name, steps }) => {
  const staged = stageBashWorkspace({
    scripts: ledgerScripts,
    files: ledgerFiles
  })
  try {
    const recordedSteps = []
    for (const { command, args } of steps) {
      const { files, ...output } = await recordBashRun(
        staged,
        scriptFor(command),
        args,
        { watch: ledgerWatchFolder, exactOutput: true }
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

test.skipIf(!ledgerScripts.every(workspaceScriptExists))(
  'the per-file review and items scripts give the recorded output, exit code and files for every case',
  async () => {
    const recordings = []
    for (const ledgerCase of ledgerCases) {
      recordings.push(await recordCase(ledgerCase))
    }

    await expect(goldenText(recordings)).toMatchFileSnapshot(
      '__fixtures__/__golden__/review-ledger.json'
    )
  },
  120_000
)
