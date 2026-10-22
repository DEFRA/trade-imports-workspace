import { describe, test, expect, afterEach } from 'vitest'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  createCliWorkspace,
  envelopeOf,
  runTimInWorkspace
} from '../../test-support/tim-cli.js'
import { renderMeasureText } from './measure.js'

let root
let outDir

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
  rmSync(outDir, { recursive: true, force: true })
})

const measure = (options, command) => {
  root = createCliWorkspace('tim-build-measure-cli-')
  outDir = mkdtempSync(join(tmpdir(), 'tim-build-measure-out-'))
  return runTimInWorkspace(root, [
    'build',
    'measure',
    '--out',
    outDir,
    '--interval',
    '0.05',
    '--json',
    ...options,
    '--',
    ...command
  ])
}

describe('tim build measure', () => {
  test('exits 1 and reports the exit code when the command fails, with its log, samples and summary written', async () => {
    const run = await measure(
      ['--label', 'failing'],
      [process.execPath, '-e', 'setTimeout(() => process.exit(4), 200)']
    )

    const { result } = envelopeOf(run)
    expect({
      exitCode: run.exitCode,
      commandExit: result.exitCode,
      files: ['failing.log', 'failing.csv', 'failing.json'].map((file) =>
        existsSync(join(outDir, file))
      )
    }).toEqual({ exitCode: 1, commandExit: 4, files: [true, true, true] })
  })

  test('exits 0 when the command passes', async () => {
    const run = await measure(
      ['--label', 'passing'],
      [process.execPath, '-e', '']
    )

    expect(run.exitCode).toBe(0)
  })

  test('exits 2 with a plain message when the label could not name a file', async () => {
    const run = await measure(
      ['--label', '../escape'],
      [process.execPath, '-e', '']
    )

    expect({
      exitCode: run.exitCode,
      message: envelopeOf(run).errors[0].message
    }).toEqual({
      exitCode: 2,
      message:
        'The label names the output files: use letters, digits, ".", "_" and "-", such as plants-fit-w4.'
    })
  })
})

describe('renderMeasureText', () => {
  test('says how the run went and what it did to the machine, with a dash for a reading it could not take', () => {
    expect(
      renderMeasureText({
        label: 'plants-fit-w4',
        exitCode: 0,
        wallSeconds: 312,
        samples: 63,
        outcome: ['304 passed (5.1m)'],
        peakLoad1: 11.2,
        lowestFreePercent: 18,
        peakHostUsedGiB: 14.1,
        swapStartMiB: 1600,
        swapPeakMiB: 2300,
        swapoutPages: 4100,
        peakDockerMiB: null,
        peakDockerCpuPercent: null,
        shellStartMs: { median: 12, p95: 90, max: 240 },
        log: '/m/plants-fit-w4.log',
        csv: '/m/plants-fit-w4.csv'
      })
    ).toBe(
      [
        'plants-fit-w4: exited 0 after 312s (63 samples).',
        '  304 passed (5.1m)',
        'Peak load 11.2. Lowest free memory 18%. Peak memory in use 14.1 GiB.',
        'Swap 1600 MiB at the start, 2300 MiB at its peak, 4100 pages swapped out.',
        'Docker peak - and - CPU.',
        'A shell took 12 ms to start (p95 90 ms, worst 240 ms).',
        'Log /m/plants-fit-w4.log. Samples /m/plants-fit-w4.csv.'
      ].join('\n')
    )
  })
})
