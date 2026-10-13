import { describe, test, expect, afterEach } from 'vitest'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  clearGateResult,
  waitForGateResult,
  writeGateResult
} from './gate-result.js'

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

    const envelope = await waitForGateResult({ resultPath, seconds: 1 })

    expect(envelope).toEqual({ ok: true, result: { green: true } })
  })

  test('the wait returns null when no result arrives in time', async () => {
    const resultPath = seedFolder()

    const envelope = await waitForGateResult({
      resultPath,
      seconds: 0.05,
      pollIntervalMs: 10
    })

    expect(envelope).toBeNull()
  })

  test('the wait picks up a result written while it waits', async () => {
    const resultPath = seedFolder()
    setTimeout(() => writeGateResult(resultPath, { ok: false }), 50)

    const envelope = await waitForGateResult({
      resultPath,
      seconds: 5,
      pollIntervalMs: 10
    })

    expect(envelope).toEqual({ ok: false })
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
