import { describe, test, expect } from 'vitest'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  commitWorkspaceFile,
  createNightlyRepo,
  createNightlyWorkspace,
  nightlyJob,
  writeNightlyJobs,
  writeStopFile,
  writeWorkspaceFile
} from '../test-support/nightly-workspace.js'
import { checkNightlyReadiness, readStopFile } from './readiness.js'

const readyEnv = {
  SONAR_TOKEN: 'sonar-test-token',
  TMUX: '/private/tmp/tmux-501/default,1234,0'
}

const checkNamed = (readiness, name) =>
  readiness.checks.find((check) => check.name === name)

describe('#checkNightlyReadiness', () => {
  test('Should be ready when every check passes', async () => {
    const root = await createNightlyWorkspace()

    const readiness = await checkNightlyReadiness(root, { env: readyEnv })

    expect(readiness.ready).toBe(true)
    expect(readiness.checks.map(({ name, ok }) => ({ name, ok }))).toEqual([
      { name: 'sonar-token', ok: true },
      { name: 'no-anthropic-api-key', ok: true },
      { name: 'detached-session', ok: true },
      { name: 'stop-file', ok: true },
      { name: 'jobs-config', ok: true },
      { name: 'clean-checkouts', ok: true }
    ])
  })

  test('Should list every job with its cron prompt', async () => {
    const root = await createNightlyWorkspace([
      nightlyJob(),
      nightlyJob({ name: 'deps-fix', cron: '13 1 * * *', enabled: false })
    ])

    const { jobs } = await checkNightlyReadiness(root, { env: readyEnv })

    expect(
      jobs.map(({ name, enabled, cronPrompt }) => ({
        name,
        enabled,
        cronPrompt
      }))
    ).toEqual([
      {
        name: 'digest',
        enabled: true,
        cronPrompt: '[nightly:digest] Run the nightly-digest skill unattended.'
      },
      {
        name: 'deps-fix',
        enabled: false,
        cronPrompt:
          '[nightly:deps-fix] Run the nightly-digest skill unattended.'
      }
    ])
  })

  test('Should fail the sonar-token check when SONAR_TOKEN is blank', async () => {
    const root = await createNightlyWorkspace()

    const readiness = await checkNightlyReadiness(root, {
      env: { SONAR_TOKEN: ' ' }
    })

    expect(readiness.ready).toBe(false)
    expect(checkNamed(readiness, 'sonar-token')).toEqual({
      name: 'sonar-token',
      ok: false,
      detail:
        'SONAR_TOKEN is not set, so the Sonar push gate would skip. Set it in ~/.zshrc and restart the session.'
    })
  })

  test('Should fail when ANTHROPIC_API_KEY is set', async () => {
    const root = await createNightlyWorkspace()

    const readiness = await checkNightlyReadiness(root, {
      env: { ...readyEnv, ANTHROPIC_API_KEY: 'sk-ant-test' }
    })

    expect(readiness.ready).toBe(false)
    expect(checkNamed(readiness, 'no-anthropic-api-key').ok).toBe(false)
  })

  test('Should pass the detached-session check inside screen', async () => {
    const root = await createNightlyWorkspace()

    const readiness = await checkNightlyReadiness(root, {
      env: { SONAR_TOKEN: 'sonar-test-token', STY: '1234.nightly' }
    })

    expect(checkNamed(readiness, 'detached-session')).toEqual({
      name: 'detached-session',
      ok: true,
      detail: 'Running inside screen'
    })
  })

  test('Should fail the detached-session check when neither TMUX nor STY is set', async () => {
    const root = await createNightlyWorkspace()

    const readiness = await checkNightlyReadiness(root, {
      env: { SONAR_TOKEN: 'sonar-test-token', TMUX: '', STY: ' ' }
    })

    expect(readiness.ready).toBe(false)
    expect(checkNamed(readiness, 'detached-session')).toEqual({
      name: 'detached-session',
      ok: false,
      detail:
        'This session is not running inside tmux or screen, so it ends when the SSH connection closes. Start claude inside tmux new -s nightly or screen -S nightly.'
    })
  })

  test('Should fail and give the reason when the stop file exists', async () => {
    const root = await createNightlyWorkspace()
    writeStopFile(root, 'Holding while main is red\n')

    const readiness = await checkNightlyReadiness(root, { env: readyEnv })

    expect(readiness.ready).toBe(false)
    expect(checkNamed(readiness, 'stop-file')).toEqual({
      name: 'stop-file',
      ok: false,
      detail:
        'workareas/nightly/STOP exists: Holding while main is red. Remove it to let the jobs run.'
    })
  })

  test('Should fail the jobs-config check when the registry is invalid', async () => {
    const root = await createNightlyWorkspace()
    writeNightlyJobs(root, { jobs: [nightlyJob({ cron: '0 5 * * *' })] })

    const readiness = await checkNightlyReadiness(root, { env: readyEnv })

    expect(checkNamed(readiness, 'jobs-config')).toEqual({
      name: 'jobs-config',
      ok: false,
      detail:
        'config/nightly-jobs.json: jobs.0.cron must start at a fixed minute that is not 0 or 30'
    })
    expect(readiness.jobs).toEqual([])
  })

  test('Should name the workspace when it has uncommitted changes', async () => {
    const root = await createNightlyWorkspace()
    writeFileSync(join(root, 'notes.txt'), 'draft\n')

    const readiness = await checkNightlyReadiness(root, { env: readyEnv })

    expect(checkNamed(readiness, 'clean-checkouts')).toEqual({
      name: 'clean-checkouts',
      ok: false,
      detail: 'Uncommitted changes in: workspace'
    })
  })

  test('Should pass the clean-checkouts check with an untracked folder under workareas/shared/', async () => {
    const root = await createNightlyWorkspace()
    writeWorkspaceFile(root, 'workareas/shared/handover/notes.md', 'draft\n')

    const readiness = await checkNightlyReadiness(root, { env: readyEnv })

    expect(checkNamed(readiness, 'clean-checkouts')).toEqual({
      name: 'clean-checkouts',
      ok: true,
      detail:
        'The workspace, outside workareas/, and every cloned repo are clean'
    })
  })

  test('Should pass the clean-checkouts check with a tracked file under workareas/shared/ modified', async () => {
    const root = await createNightlyWorkspace()
    await commitWorkspaceFile(root, 'workareas/shared/plan.md', 'plan\n')
    writeWorkspaceFile(root, 'workareas/shared/plan.md', 'plan, edited\n')

    const readiness = await checkNightlyReadiness(root, { env: readyEnv })

    expect(checkNamed(readiness, 'clean-checkouts').ok).toBe(true)
  })

  test('Should name the workspace when it has a change outside workareas/ as well as one inside', async () => {
    const root = await createNightlyWorkspace()
    writeWorkspaceFile(root, 'workareas/shared/notes.md', 'draft\n')
    writeWorkspaceFile(root, 'docs/workareas.md', 'draft\n')

    const readiness = await checkNightlyReadiness(root, { env: readyEnv })

    expect(checkNamed(readiness, 'clean-checkouts')).toEqual({
      name: 'clean-checkouts',
      ok: false,
      detail: 'Uncommitted changes in: workspace'
    })
  })

  test('Should name a cloned repo with an untracked file in its own workareas/ folder', async () => {
    const root = await createNightlyWorkspace()
    const repo = await createNightlyRepo(root, 'trade-imports-stub')
    writeWorkspaceFile(repo, 'workareas/notes.md', 'draft\n')

    const readiness = await checkNightlyReadiness(root, { env: readyEnv })

    expect(checkNamed(readiness, 'clean-checkouts')).toEqual({
      name: 'clean-checkouts',
      ok: false,
      detail: 'Uncommitted changes in: trade-imports-stub'
    })
  })

  test('Should fail the fetch check when origin cannot be fetched', async () => {
    const root = await createNightlyWorkspace()

    const readiness = await checkNightlyReadiness(root, {
      env: readyEnv,
      fetch: true
    })

    expect(readiness.ready).toBe(false)
    expect(checkNamed(readiness, 'fetch')).toEqual({
      name: 'fetch',
      ok: false,
      detail: 'Fetching origin failed in: workspace'
    })
  })
})

describe('#readStopFile', () => {
  test('Should report not stopped when the file is absent', async () => {
    const root = await createNightlyWorkspace()

    expect(readStopFile(root)).toEqual({
      stopped: false,
      path: join(root, 'workareas', 'nightly', 'STOP'),
      reason: null
    })
  })

  test('Should report stopped with no reason when the file is empty', async () => {
    const root = await createNightlyWorkspace()
    writeStopFile(root, '\n')

    expect(readStopFile(root)).toEqual({
      stopped: true,
      path: join(root, 'workareas', 'nightly', 'STOP'),
      reason: null
    })
  })
})
