import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  defaultMachineConfigPath,
  readMachineConfig,
  withMachineWorkers
} from './machine-config.js'

let folder

afterEach(() => {
  if (folder) rmSync(folder, { recursive: true, force: true })
  folder = undefined
})

const fileWith = (text) => {
  folder = mkdtempSync(join(tmpdir(), 'tim-machine-config-'))
  const path = join(folder, 'machine.json')
  writeFileSync(path, text)
  return path
}

const fitRung = { repo: 'frontend', name: 'fit', phase: 'fit', refusal: null }

describe('#defaultMachineConfigPath', () => {
  test('Should prefer TIM_MACHINE_CONFIG, then XDG_CONFIG_HOME', () => {
    expect([
      defaultMachineConfigPath({
        TIM_MACHINE_CONFIG: '/a/machine.json',
        XDG_CONFIG_HOME: '/b'
      }),
      defaultMachineConfigPath({ XDG_CONFIG_HOME: '/b' })
    ]).toEqual(['/a/machine.json', '/b/tim/machine.json'])
  })
})

describe('#readMachineConfig', () => {
  test('Should give null when this machine has no file', () => {
    folder = mkdtempSync(join(tmpdir(), 'tim-machine-config-'))

    expect(readMachineConfig(join(folder, 'machine.json'))).toBeNull()
  })

  test('Should name the file when it is not JSON', () => {
    const path = fileWith('{ workers: ')

    expect(() => readMachineConfig(path)).toThrow(`${path} is not valid JSON`)
  })

  test('Should read the settings with the path they came from', () => {
    const path = fileWith(
      JSON.stringify({ parallelRepos: 1, workers: { 'frontend/fit': 4 } })
    )

    expect(readMachineConfig(path)).toEqual({
      path,
      parallelRepos: 1,
      workers: { 'frontend/fit': 4 }
    })
  })
})

describe('#withMachineWorkers', () => {
  test('Should give the named FIT rung its count and leave a refused one alone', () => {
    const machine = { workers: { 'frontend/fit': 4, 'tests/e2e': 3 } }
    const refusedE2e = {
      repo: 'tests',
      name: 'e2e',
      phase: 'e2e',
      refusal: 'not covered'
    }

    expect(
      withMachineWorkers([fitRung, refusedE2e], machine).map(
        ({ workers }) => workers ?? null
      )
    ).toEqual([4, null])
  })
})
