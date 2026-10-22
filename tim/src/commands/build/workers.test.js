import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  createCliWorkspace,
  envelopeOf,
  runTimInWorkspace
} from '../../test-support/tim-cli.js'
import { renderWorkersText } from './workers.js'

let root
let configDir

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
  rmSync(configDir, { recursive: true, force: true })
})

const runWorkers = (machineJson) => {
  root = createCliWorkspace('tim-build-workers-cli-')
  configDir = mkdtempSync(join(tmpdir(), 'tim-build-workers-config-'))
  const configPath = join(configDir, 'machine.json')
  if (machineJson !== undefined) writeFileSync(configPath, machineJson)
  return {
    configPath,
    run: runTimInWorkspace(root, ['build', 'workers', '--json'], {
      env: { TIM_MACHINE_CONFIG: configPath }
    })
  }
}

describe('tim build workers', () => {
  test('prints the worker count for each rung the machine settings name, with the file it read', async () => {
    const { configPath, run } = runWorkers(
      JSON.stringify({
        parallelRepos: 1,
        workers: {
          'trade-imports-animals-frontend/fit': 3,
          'trade-imports-ins-tests/e2e': 3
        }
      })
    )

    const finished = await run

    expect({
      exitCode: finished.exitCode,
      result: envelopeOf(finished).result
    }).toEqual({
      exitCode: 0,
      result: {
        config: configPath,
        workers: {
          'trade-imports-animals-frontend/fit': 3,
          'trade-imports-ins-tests/e2e': 3
        }
      }
    })
  })

  test('prints no counts and no file when the machine has no settings file', async () => {
    const { run } = runWorkers(undefined)

    const finished = await run

    expect({
      exitCode: finished.exitCode,
      result: envelopeOf(finished).result
    }).toEqual({ exitCode: 0, result: { config: null, workers: {} } })
  })

  test('exits non-zero and names the bad key when the settings file is wrong', async () => {
    const { configPath, run } = runWorkers(
      JSON.stringify({ workers: { animals: 3 } })
    )

    const finished = await run

    expect({
      failed: finished.exitCode !== 0,
      message: envelopeOf(finished).errors[0].message
    }).toEqual({
      failed: true,
      message: `${configPath} has problems:\n  workers.animals: Invalid key in record`
    })
  })
})

describe('renderWorkersText', () => {
  test('lists each rung and its count under the file it came from', () => {
    const text = renderWorkersText({
      config: '/home/me/.config/tim/machine.json',
      workers: { 'trade-imports-plants-frontend/fit': 4 }
    })

    expect(text).toBe(
      'Worker counts from /home/me/.config/tim/machine.json:\n  trade-imports-plants-frontend/fit  4'
    )
  })

  test('says every run keeps its own script’s count when there is no file', () => {
    const text = renderWorkersText({ config: null, workers: {} })

    expect(text).toBe(
      'This machine has no settings file, so every FIT and E2E run uses its own script’s worker count.'
    )
  })

  test('says the file names no counts when its workers are empty', () => {
    const text = renderWorkersText({
      config: '/home/me/.config/tim/machine.json',
      workers: {}
    })

    expect(text).toBe(
      '/home/me/.config/tim/machine.json names no worker counts.'
    )
  })
})
