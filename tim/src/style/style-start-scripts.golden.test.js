import { afterAll, beforeAll, expect, test } from 'vitest'
import {
  goldenText,
  recordBashRun,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  atlassianEnv,
  startAtlassianFixtureServer
} from '../commands/refine/__fixtures__/atlassian-server.js'
import {
  argsIn,
  scriptFor,
  stageStyleStart,
  startCases,
  startScripts,
  startWatchFolder
} from './__fixtures__/style-start.js'

let atlassian

beforeAll(async () => {
  atlassian = await startAtlassianFixtureServer()
})

afterAll(() => atlassian?.close())

const recordCase = async ({ name, steps }) => {
  const staged = await stageStyleStart({
    scripts: startScripts,
    atlassian: atlassianEnv(atlassian.base)
  })
  try {
    const recordedSteps = []
    for (const { command, args, before } of steps) {
      await before?.(staged)
      const { files, ...output } = await recordBashRun(
        staged,
        scriptFor[command],
        argsIn(args, staged),
        { watch: startWatchFolder, env: staged.env, exactOutput: true }
      )
      recordedSteps.push({ command, input: args, ...output, files })
    }
    return { case: name, steps: recordedSteps }
  } finally {
    staged.remove()
  }
}

test.skipIf(!startScripts.every(workspaceScriptExists))(
  'the style start, prepare, scope, file init and bundle scripts give the recorded output, exit code and files for every case',
  async () => {
    const recordings = []
    for (const startCase of startCases) {
      recordings.push(await recordCase(startCase))
    }

    await expect(goldenText(recordings)).toMatchFileSnapshot(
      '__fixtures__/__golden__/style-start.json'
    )
  },
  900_000
)
