import { describe, test, expect } from 'vitest'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  createNightlyWorkspace,
  nightlyJob,
  writeNightlyJobs,
  writeStopFile
} from '../test-support/nightly-workspace.js'
import { checkNightlyReadiness, readStopFile } from './readiness.js'

const readyEnv = { SONAR_TOKEN: 'sonar-test-token' }

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
