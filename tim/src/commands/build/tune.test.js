import { describe, test, expect, afterEach } from 'vitest'
import { rmSync } from 'node:fs'
import {
  createCliWorkspace,
  envelopeOf,
  runTimInWorkspace
} from '../../test-support/tim-cli.js'
import { renderTuneText } from './tune.js'

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const runTune = (options) => {
  root = createCliWorkspace('tim-build-tune-cli-')
  return runTimInWorkspace(root, ['build', 'tune', '--json', ...options])
}

describe('tim build tune', () => {
  test('exits 2 with a plain message when --counts is not a list of numbers', async () => {
    const run = await runTune(['--counts', 'three'])

    expect({
      exitCode: run.exitCode,
      message: envelopeOf(run).errors[0].message
    }).toEqual({
      exitCode: 2,
      message:
        '--counts takes worker counts separated by commas, such as 2,3,4.'
    })
  })

  test('exits 2 when a worker count is above 16', async () => {
    const run = await runTune(['--counts', '2,32'])

    expect({
      exitCode: run.exitCode,
      message: envelopeOf(run).errors[0].message
    }).toEqual({
      exitCode: 2,
      message: 'Each worker count must be from 1 to 16.'
    })
  })
})

const RUNG = {
  key: 'trade-imports-plants-frontend/fit',
  workers: 3,
  reason:
    '4 workers was fastest but swapped out 50112 pages, so one fewer: 3 took 90s.',
  trials: [
    {
      workers: 3,
      exitCode: 0,
      wallSeconds: 90,
      swapoutPages: 0,
      shellStartMs: { max: 22 }
    },
    {
      workers: 4,
      exitCode: 1,
      wallSeconds: 82,
      swapoutPages: 50112,
      shellStartMs: { max: 40 }
    }
  ]
}

describe('renderTuneText', () => {
  test('lists each rung with its chosen count, reason and timed runs, and says where it wrote them', () => {
    const text = renderTuneText({
      tuned: true,
      rungs: [RUNG],
      counts: [3, 4],
      outDir: '/ws/workareas/machine-tuning/20261022T180000Z',
      machineFile: '/ws/config/machine.json',
      wrote: true
    })

    expect(text).toBe(
      [
        'Timed 1 rungs at 3 and 4 workers each, with the workspace stack up.',
        '  trade-imports-plants-frontend/fit: 3 workers. 4 workers was fastest but swapped out 50112 pages, so one fewer: 3 took 90s.',
        '    3 workers: 90s, passed, 0 pages swapped out, slowest shell start 22 ms',
        '    4 workers: 82s, failed (exit 1), 50112 pages swapped out, slowest shell start 40 ms',
        'Wrote these counts to /ws/config/machine.json. The gate and the build loop use them from their next run.',
        "Each run's log, samples and summary are in /ws/workareas/machine-tuning/20261022T180000Z."
      ].join('\n')
    )
  })

  test('says the file is unchanged on a dry run', () => {
    const text = renderTuneText({
      tuned: true,
      rungs: [],
      counts: [2],
      outDir: '/out',
      machineFile: '/ws/config/machine.json',
      wrote: false
    })

    expect(text).toContain(
      'Dry run: /ws/config/machine.json is unchanged. Run without --dry-run to save the counts.'
    )
  })

  test('says nothing was timed when the stack was not tim’s to take', () => {
    const text = renderTuneText({
      tuned: false,
      refused: {
        reason: 'The workspace stack is leased to "ibl-20261022T120000Z".'
      },
      rungs: []
    })

    expect(text).toBe(
      'Nothing was timed: tim could not take the workspace stack. The workspace stack is leased to "ibl-20261022T120000Z".'
    )
  })
})
