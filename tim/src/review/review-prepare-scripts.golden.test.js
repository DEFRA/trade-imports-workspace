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
import { normaliseRecording } from '../commands/refine/__fixtures__/normalise.js'
import {
  observeReview,
  prepareCases,
  prepareEnv,
  helperScripts,
  prepareScripts,
  stagePrepareWorkspace
} from './__fixtures__/review-prepare.js'

let atlassian

beforeAll(async () => {
  atlassian = await startAtlassianFixtureServer()
})

afterAll(() => atlassian?.close())

const recordCase = async (prepareCase) => {
  const staged = await stagePrepareWorkspace({
    scripts: [...prepareScripts, ...helperScripts]
  })
  try {
    const steps = []
    for (const {
      bash: [script, args],
      before
    } of prepareCase.steps) {
      before?.(staged)
      steps.push({
        input: args,
        ...normaliseRecording(
          await recordBashRun(staged, script, args, {
            env: prepareEnv(staged, atlassianEnv(atlassian.base)),
            exactOutput: true
          }),
          { base: atlassian.base }
        )
      })
    }
    const state =
      prepareCase.reviewId === undefined
        ? {}
        : {
            state: normaliseState(
              await observeReview(staged, prepareCase.reviewId),
              atlassian.base
            )
          }
    return { case: prepareCase.name, steps, ...state }
  } finally {
    staged.remove()
  }
}

const normaliseState = (state, base) =>
  JSON.parse(JSON.stringify(state).split(base).join('<BASE>'))

test.skipIf(!prepareScripts.every(workspaceScriptExists))(
  'prepare-review.sh, prepare-review-local.sh and start-review.sh give the recorded output, exit code and review for every case',
  async () => {
    const recordings = []
    for (const prepareCase of prepareCases) {
      recordings.push(await recordCase(prepareCase))
    }

    await expect(goldenText(recordings)).toMatchFileSnapshot(
      '__fixtures__/__golden__/review-prepare.json'
    )
  },
  600_000
)
