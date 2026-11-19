import { afterEach, describe, expect, test } from 'vitest'
import {
  FRONTEND,
  RUN_ID,
  stageStartUpgradeWorkspace
} from '../__fixtures__/npm-start-upgrade-workspace.js'
import { discoverPhase } from './discover-phase.js'
import { PhaseStopped } from './run-repos.js'

const staging = []

afterEach(() => {
  staging.splice(0).forEach((staged) => staged.remove())
})

describe('#discoverPhase', () => {
  test('Should refuse, before discovering anything, a run with no phase 0', async () => {
    const staged = stageStartUpgradeWorkspace({}, 'http://127.0.0.1:9')
    staging.push(staged)
    const lines = []

    const discovery = discoverPhase({
      workspaceRoot: staged.root,
      runId: RUN_ID,
      repos: [FRONTEND],
      strategy: 'latest',
      warn: async (line) => lines.push(line)
    })

    await expect(discovery).rejects.toThrow(
      new PhaseStopped(
        `Refusing phase 1: no phase 0 run for ${RUN_ID}. Run --phase 0 first.`
      )
    )
    expect(lines).toEqual([
      `Refusing phase 1: no phase 0 run for ${RUN_ID}. Run --phase 0 first.`
    ])
  })
})
