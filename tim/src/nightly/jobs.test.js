import { describe, test, expect } from 'vitest'
import { createCliWorkspace } from '../test-support/tim-cli.js'
import {
  nightlyJob,
  writeNightlyJobs
} from '../test-support/nightly-workspace.js'
import { readNightlyJobs, cronPromptMarker } from './jobs.js'

const workspaceWith = (registry) => {
  const root = createCliWorkspace('tim-nightly-jobs-')
  writeNightlyJobs(root, registry)
  return root
}

describe('#readNightlyJobs', () => {
  test('Should return each job with its prompt behind the nightly marker', () => {
    const root = workspaceWith({ jobs: [nightlyJob()] })

    const jobs = readNightlyJobs(root)

    expect(jobs).toEqual([
      {
        ...nightlyJob(),
        cronPrompt: '[nightly:digest] Run the nightly-digest skill unattended.'
      }
    ])
  })

  test('Should refuse with NOT_FOUND when the file is missing', () => {
    const root = createCliWorkspace('tim-nightly-jobs-')

    expect(() => readNightlyJobs(root)).toThrow(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: 'Cannot find config/nightly-jobs.json.'
      })
    )
  })

  test('Should refuse with PARSE when the file is not JSON', () => {
    const root = workspaceWith('{ not json')

    expect(() => readNightlyJobs(root)).toThrow(
      expect.objectContaining({
        code: 'PARSE',
        message: expect.stringMatching(
          /^config\/nightly-jobs\.json is not valid JSON: /
        )
      })
    )
  })

  test('Should refuse a cron that starts on the hour', () => {
    const root = workspaceWith({ jobs: [nightlyJob({ cron: '0 5 * * *' })] })

    expect(() => readNightlyJobs(root)).toThrow(
      expect.objectContaining({
        code: 'PARSE',
        message:
          'config/nightly-jobs.json: jobs.0.cron must start at a fixed minute that is not 0 or 30'
      })
    )
  })

  test('Should refuse a cron that starts on the half hour', () => {
    const root = workspaceWith({ jobs: [nightlyJob({ cron: '30 5 * * *' })] })

    expect(() => readNightlyJobs(root)).toThrow(
      expect.objectContaining({
        message:
          'config/nightly-jobs.json: jobs.0.cron must start at a fixed minute that is not 0 or 30'
      })
    )
  })

  test('Should refuse a cron without 5 fields', () => {
    const root = workspaceWith({ jobs: [nightlyJob({ cron: '53 5 * *' })] })

    expect(() => readNightlyJobs(root)).toThrow(
      expect.objectContaining({
        message:
          'config/nightly-jobs.json: jobs.0.cron must have 5 fields: minute hour day-of-month month day-of-week'
      })
    )
  })

  test('Should refuse a job named twice', () => {
    const root = workspaceWith({
      jobs: [nightlyJob(), nightlyJob({ cron: '13 1 * * *' })]
    })

    expect(() => readNightlyJobs(root)).toThrow(
      expect.objectContaining({
        code: 'PARSE',
        message: 'config/nightly-jobs.json: the job digest is named twice.'
      })
    )
  })
})

describe('#cronPromptMarker', () => {
  test('Should mark a prompt with the job name', () => {
    expect(cronPromptMarker('deps-fix')).toBe('[nightly:deps-fix]')
  })
})
