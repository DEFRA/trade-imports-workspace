import { describe, test, expect, afterEach } from 'vitest'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execa } from 'execa'
import {
  clearGateResult,
  recordGateProcess,
  waitForGateResult,
  writeGateResult
} from './gate-result.js'

const pidOfEndedProcess = async () => {
  const ended = execa('node', ['-e', ''])
  await ended
  return ended.pid
}

let folder

afterEach(() => {
  rmSync(folder, { recursive: true, force: true })
})

const seedFolder = () => {
  folder = mkdtempSync(join(tmpdir(), 'tim-gate-result-'))
  return join(folder, 'nested', 'gate-result.json')
}

describe('gate result file', () => {
  test('a written result is what the wait returns', async () => {
    const resultPath = seedFolder()
    writeGateResult(resultPath, { ok: true, result: { green: true } })

    const wait = await waitForGateResult({ resultPath, seconds: 1 })

    expect(wait).toEqual({
      state: 'finished',
      envelope: { ok: true, result: { green: true } }
    })
  })

  test('the wait says the gate is running when no result arrives in time', async () => {
    const resultPath = seedFolder()

    const wait = await waitForGateResult({
      resultPath,
      seconds: 0.05,
      pollIntervalMs: 10
    })

    expect(wait).toEqual({ state: 'running' })
  })

  test('the wait picks up a result written while it waits', async () => {
    const resultPath = seedFolder()
    setTimeout(() => writeGateResult(resultPath, { ok: false }), 50)

    const wait = await waitForGateResult({
      resultPath,
      seconds: 5,
      pollIntervalMs: 10
    })

    expect(wait).toEqual({ state: 'finished', envelope: { ok: false } })
  })

  test('the wait says the gate died, at once, when its recorded process has gone with no result', async () => {
    const resultPath = seedFolder()
    recordGateProcess(resultPath, await pidOfEndedProcess())
    const startedAt = Date.now()

    const wait = await waitForGateResult({
      resultPath,
      seconds: 5,
      pollIntervalMs: 10
    })

    expect({ wait, returnedEarly: Date.now() - startedAt < 1000 }).toEqual({
      wait: { state: 'died' },
      returnedEarly: true
    })
  })

  test('the wait keeps waiting while the recorded process is still running', async () => {
    const resultPath = seedFolder()
    recordGateProcess(resultPath, process.pid)

    const wait = await waitForGateResult({
      resultPath,
      seconds: 0.05,
      pollIntervalMs: 10
    })

    expect(wait).toEqual({ state: 'running' })
  })

  test('a result the gate wrote before its process ended is what the wait returns', async () => {
    const resultPath = seedFolder()
    recordGateProcess(resultPath, await pidOfEndedProcess())
    writeGateResult(resultPath, { ok: true, result: { green: true } })

    const wait = await waitForGateResult({ resultPath, seconds: 1 })

    expect(wait).toEqual({
      state: 'finished',
      envelope: { ok: true, result: { green: true } }
    })
  })

  test('clearing removes an earlier result and leaves no part file behind', () => {
    const resultPath = seedFolder()
    writeGateResult(resultPath, { ok: true })

    clearGateResult(resultPath)

    expect({
      result: existsSync(resultPath),
      part: existsSync(`${resultPath}.part`)
    }).toEqual({ result: false, part: false })
  })

  test('clearing a result that is not there does nothing', () => {
    const resultPath = seedFolder()
    writeFileSync(join(folder, 'other.txt'), 'kept\n')

    clearGateResult(resultPath)

    expect(existsSync(join(folder, 'other.txt'))).toBe(true)
  })
})
