import { realpathSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  FRONTEND,
  RUN_ID,
  SCHEMAS,
  stageStartUpgradeWorkspace
} from '../__fixtures__/npm-start-upgrade-workspace.js'
import {
  automatedPhase,
  foldLeftoverClassifications,
  resetOverridesPhase
} from './runner-phases.js'

const staging = []

afterEach(() => {
  staging.splice(0).forEach((staged) => staged.remove())
})

const stagedRoot = (fixtureCase = {}) => {
  const staged = stageStartUpgradeWorkspace(fixtureCase, 'http://127.0.0.1:9')
  staging.push(staged)
  return staged.root
}

const recordingWarn = () => {
  const lines = []
  return { lines, warn: async (line) => lines.push(line) }
}

describe('#foldLeftoverClassifications', () => {
  test('Should say the run folder is missing rather than stop', async () => {
    const workspaceRoot = stagedRoot()
    const { lines, warn } = recordingWarn()

    await foldLeftoverClassifications({ workspaceRoot, runId: RUN_ID, warn })

    expect(lines).toEqual([
      `Run dir not found: ${join(workspaceRoot, 'workareas', 'npm-upgrades', RUN_ID)}`
    ])
  })
})

describe('#automatedPhase', () => {
  test('Should be ok with nothing to run when no repo was discovered', async () => {
    const workspaceRoot = stagedRoot()
    const { warn } = recordingWarn()

    const outcome = await automatedPhase({
      workspaceRoot,
      runId: RUN_ID,
      repos: [FRONTEND, SCHEMAS],
      warn
    })

    expect(outcome).toEqual({
      exitCode: 0,
      result: {
        status: 'ok',
        cascade_failures: [],
        stopped: [],
        failed: [],
        per_repo: []
      },
      text: '{"status":"ok","cascade_failures":[],"stopped":[],"failed":[],"per_repo":[]}'
    })
  })
})

describe('#resetOverridesPhase', () => {
  test('Should stop a repo with uncommitted changes and give the last lines it wrote as the error', async () => {
    const workspaceRoot = stagedRoot({
      repos: { [FRONTEND]: { overrides: { lodash: '4.17.21' } } }
    })
    writeFileSync(
      join(workspaceRoot, 'repos', FRONTEND, 'package.json'),
      '{ "name": "changed" }\n'
    )
    const { warn } = recordingWarn()

    const outcome = await resetOverridesPhase({
      workspaceRoot,
      runId: RUN_ID,
      repos: [FRONTEND],
      warn
    })

    expect(outcome.exitCode).toBe(1)
    expect(outcome.result).toMatchObject({
      status: 'stopped',
      stopped: [FRONTEND],
      per_repo: [
        {
          repo: FRONTEND,
          exit_code: 2,
          error: `Uncommitted changes in ${realpathSync(join(workspaceRoot, 'repos', FRONTEND))}. Commit or stash first.`
        }
      ]
    })
  })
})
