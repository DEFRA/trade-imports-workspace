import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { measureCommand } from './measure.js'

let outDir

afterEach(() => {
  rmSync(outDir, { recursive: true, force: true })
})

const readingWith = (load1) => async () => ({
  at: 'now',
  load1,
  freePercent: 50,
  hostUsedGiB: 8,
  swapUsedMiB: 100,
  swapouts: 1,
  pageouts: 1,
  dockerMiB: 0,
  dockerCpuPercent: 0,
  containers: [],
  shellStartMs: 5
})

const measureNode = (script, sample) => {
  outDir = mkdtempSync(join(tmpdir(), 'tim-measure-'))
  return measureCommand({
    label: 'run',
    outDir,
    command: process.execPath,
    args: ['-e', script],
    cwd: outDir,
    intervalMs: 20,
    sample
  })
}

describe('#measureCommand', () => {
  test('Should keep sampling until the command exits, and report its exit code and outcome lines', async () => {
    const summary = await measureNode(
      "console.log(String(3) + ' passed (1.0s)'); setTimeout(() => process.exit(3), 300)",
      readingWith(1)
    )

    expect({
      exitCode: summary.exitCode,
      outcome: summary.outcome,
      sampledWhileRunning: summary.samples > 3
    }).toEqual({
      exitCode: 3,
      outcome: ['3 passed (1.0s)'],
      sampledWhileRunning: true
    })
  })

  test('Should write the samples as CSV and the summary as JSON beside the log', async () => {
    const summary = await measureNode('', readingWith(7))

    const csv = readFileSync(summary.csv, 'utf8').split('\n')
    const written = JSON.parse(readFileSync(join(outDir, 'run.json'), 'utf8'))

    expect({
      header: csv[0],
      firstRow: csv[1],
      peakLoad1: written.peakLoad1
    }).toEqual({
      header:
        'at,load1,freePercent,hostUsedGiB,swapUsedMiB,swapouts,pageouts,dockerMiB,dockerCpuPercent,shellStartMs',
      firstRow: 'now,7,50,8,100,1,1,0,0,5',
      peakLoad1: 7
    })
  })
})
