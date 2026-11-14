import { expect, test } from 'vitest'
import {
  goldenText,
  recordBashRun,
  workspaceScriptExists
} from '../../test-support/bash-golden-harness.js'
import {
  CHECK_SCRIPT,
  checkCases,
  PREREQS_FOLDER,
  PREREQS_SCRIPT,
  prereqsCases,
  stageScriptsWorkspace
} from './__fixtures__/ticket-creator-scripts.js'

const scriptsExist = [CHECK_SCRIPT, PREREQS_SCRIPT].every(workspaceScriptExists)

const recordIn = async (theCase, record) => {
  const staged = stageScriptsWorkspace(theCase)
  try {
    return { case: theCase.name, ...(await record(staged)) }
  } finally {
    staged.remove()
  }
}

const recordCheck = (theCase) =>
  recordIn(theCase, (staged) =>
    recordBashRun(staged, CHECK_SCRIPT, theCase.args, {
      exactOutput: true,
      env: { PATH: staged.path, STAND_IN_SYNC_TO: theCase.syncTo }
    })
  )

const recordPrereqs = (theCase) =>
  recordIn(theCase, (staged) =>
    recordBashRun(staged, PREREQS_SCRIPT, theCase.args ?? [], {
      exactOutput: true,
      watch: PREREQS_FOLDER,
      env: {
        PATH: staged.path,
        MIN_CAPABILITIES: undefined,
        ...theCase.env,
        STAND_IN_LIVE_VERSION:
          theCase.liveVersion === null
            ? undefined
            : String(theCase.liveVersion),
        STAND_IN_BOARD_MISSING: theCase.boardMissing ? '1' : undefined
      }
    })
  )

const recordEach = async (cases, record) => {
  const runs = []
  for (const theCase of cases) runs.push(await record(theCase))
  return runs
}

test.skipIf(!scriptsExist)(
  'tools/ticket-creator reports on each capability map and writes each set of prereqs',
  async () => {
    const golden = {
      check: await recordEach(checkCases, recordCheck),
      prereqs: await recordEach(prereqsCases, recordPrereqs)
    }

    await expect(goldenText(golden)).toMatchFileSnapshot(
      '__fixtures__/__golden__/ticket-creator-scripts.json'
    )
  },
  120_000
)
