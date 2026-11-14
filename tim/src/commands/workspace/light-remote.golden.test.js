import { afterAll, beforeAll, expect, test } from 'vitest'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  goldenText,
  recordBashRun,
  stageBashWorkspace,
  workspaceScriptExists
} from '../../test-support/bash-golden-harness.js'
import {
  bashArgsFor,
  createPullRequestOrigin,
  pinFetchCases,
  prepareCaseFolder,
  readPinnedState
} from './__fixtures__/pin-fetch-clones.js'

const LIGHT_REMOTE_SCRIPT = 'tools/git/light-remote.sh'

let staged

beforeAll(() => {
  staged = stageBashWorkspace({
    scripts: [LIGHT_REMOTE_SCRIPT].filter(workspaceScriptExists)
  })
})

afterAll(() => staged.remove())

const recordCase = async (pinFetchCase, barePath, clonesDir, index) => {
  const dir = await prepareCaseFolder(pinFetchCase, barePath, clonesDir, index)
  let recording
  for (const { bash } of pinFetchCase.runs) {
    recording = await recordBashRun(
      staged,
      LIGHT_REMOTE_SCRIPT,
      bashArgsFor(bash, dir)
    )
  }
  const state = pinFetchCase.clone === null ? {} : await readPinnedState(dir)
  return { case: pinFetchCase.name, ...recording, ...state }
}

test.skipIf(!workspaceScriptExists(LIGHT_REMOTE_SCRIPT))(
  'light-remote.sh pins a full clone and a review clone in each mode, twice over, and refuses a folder that is not a repo',
  async () => {
    const originsDir = join(staged.home, 'origins')
    const clonesDir = join(staged.home, 'clones')
    mkdirSync(originsDir)
    const { barePath } = await createPullRequestOrigin(originsDir)

    const recordings = []
    for (const [index, pinFetchCase] of pinFetchCases.entries()) {
      recordings.push(
        await recordCase(pinFetchCase, barePath, clonesDir, index)
      )
    }

    await expect(goldenText(recordings)).toMatchFileSnapshot(
      '__fixtures__/__golden__/light-remote.json'
    )
  },
  60_000
)
