import { describe, test, expect } from 'vitest'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { MISSING_DEP, OK } from '../../constants/exitCodes.js'
import { envelopeOf, runTimInWorkspace } from '../../test-support/tim-cli.js'
import {
  createNightlyWorkspace,
  writeStopFile
} from '../../test-support/nightly-workspace.js'
import { renderCheckText, renderStoppedText } from './index.js'

const readyEnv = { SONAR_TOKEN: 'sonar-test-token', ANTHROPIC_API_KEY: '' }

describe('tim nightly check', () => {
  test('Should exit 0 with ready true when every check passes', async () => {
    const root = await createNightlyWorkspace()

    const run = await runTimInWorkspace(root, ['nightly', 'check', '--json'], {
      env: readyEnv
    })

    expect(run.exitCode).toBe(OK)
    expect(envelopeOf(run).result.ready).toBe(true)
  })

  test('Should exit 3 with ready false when the workspace has changes', async () => {
    const root = await createNightlyWorkspace()
    writeFileSync(join(root, 'notes.txt'), 'draft\n')

    const run = await runTimInWorkspace(root, ['nightly', 'check', '--json'], {
      env: readyEnv
    })

    expect(run.exitCode).toBe(MISSING_DEP)
    expect(envelopeOf(run).result.ready).toBe(false)
  })
})

describe('tim nightly stopped', () => {
  test('Should report the reason in the stop file and exit 0', async () => {
    const root = await createNightlyWorkspace()
    writeStopFile(root, 'Holding while main is red')

    const run = await runTimInWorkspace(root, ['nightly', 'stopped', '--json'])

    expect(run.exitCode).toBe(OK)
    expect(envelopeOf(run).result).toEqual({
      stopped: true,
      path: join(root, 'workareas', 'nightly', 'STOP'),
      reason: 'Holding while main is red'
    })
  })
})

describe('#renderCheckText', () => {
  test('Should print each check, each job and the verdict', () => {
    const text = renderCheckText({
      ready: false,
      checks: [
        { name: 'sonar-token', ok: true, detail: 'SONAR_TOKEN is set' },
        {
          name: 'stop-file',
          ok: false,
          detail: 'workareas/nightly/STOP exists'
        }
      ],
      jobs: [{ name: 'digest', cron: '53 5 * * *', enabled: false }]
    })

    expect(text).toBe(
      [
        'sonar-token: OK — SONAR_TOKEN is set',
        'stop-file: FAILED — workareas/nightly/STOP exists',
        'Jobs:',
        '  digest: off, cron 53 5 * * *',
        'Not ready. Fix each FAILED line, then run this again.'
      ].join('\n')
    )
  })
})

describe('#renderStoppedText', () => {
  test('Should say not stopped when the file is absent', () => {
    expect(
      renderStoppedText({
        stopped: false,
        path: '/w/workareas/nightly/STOP',
        reason: null
      })
    ).toBe('Not stopped. /w/workareas/nightly/STOP is absent.')
  })

  test('Should give the reason when the file has one', () => {
    expect(
      renderStoppedText({ stopped: true, path: '/w/STOP', reason: 'Paused' })
    ).toBe('Stopped: Paused')
  })
})
