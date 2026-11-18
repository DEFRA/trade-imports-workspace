import { execaSync } from 'execa'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  FRONTEND,
  SCHEMAS,
  stageStartUpgradeWorkspace
} from '../__fixtures__/npm-start-upgrade-workspace.js'
import {
  PhaseStopped,
  refuseReposOffBranch,
  selectNpmRepos
} from './run-repos.js'

const staging = []

afterEach(() => {
  staging.splice(0).forEach((staged) => staged.remove())
})

const stagedRoot = () => {
  const staged = stageStartUpgradeWorkspace({}, 'http://127.0.0.1:9')
  staging.push(staged)
  return staged.root
}

const recordingWarn = () => {
  const lines = []
  return { lines, warn: async (line) => lines.push(line) }
}

describe('#selectNpmRepos', () => {
  test('Should take the roster repos flagged npmUpgradeDefault and warn about each one with no checkout or no package.json', async () => {
    const workspaceRoot = stagedRoot()
    const { lines, warn } = recordingWarn()

    const repos = await selectNpmRepos({ workspaceRoot, requested: [], warn })

    expect(repos).toEqual([FRONTEND, SCHEMAS])
    expect(lines).toEqual([
      'No package.json in trade-imports-stub, skipping (not an npm repo)',
      `Repo dir missing, skipping: ${join(workspaceRoot, 'repos', 'trade-imports-gone')}`
    ])
  })

  test('Should take only the repos asked for, in the order asked', async () => {
    const workspaceRoot = stagedRoot()
    const { warn } = recordingWarn()

    const repos = await selectNpmRepos({
      workspaceRoot,
      requested: [SCHEMAS, FRONTEND],
      warn
    })

    expect(repos).toEqual([SCHEMAS, FRONTEND])
  })
})

describe('#refuseReposOffBranch', () => {
  test('Should name a repo with a detached HEAD', async () => {
    const workspaceRoot = stagedRoot()
    const checkout = join(workspaceRoot, 'repos', FRONTEND)
    execaSync('git', ['-C', checkout, 'checkout', '--quiet', '--detach'])
    const { warn } = recordingWarn()

    const refusal = refuseReposOffBranch({
      workspaceRoot,
      repos: [FRONTEND],
      branch: 'main',
      warn
    })

    await expect(refusal).rejects.toThrow(
      new PhaseStopped(
        `Refusing to run: these repos are not on main:\n  ${FRONTEND} (on 'detached HEAD')`
      )
    )
  })

  test('Should check nothing with no branch', async () => {
    const workspaceRoot = stagedRoot()
    const { lines, warn } = recordingWarn()

    await refuseReposOffBranch({
      workspaceRoot,
      repos: [FRONTEND],
      branch: '',
      warn
    })

    expect(lines).toEqual([])
  })
})
