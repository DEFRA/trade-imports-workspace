import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  blockRealNetwork,
  restoreRealNetwork,
  serveRegistryPackage,
  writeRegistryRepo
} from './__fixtures__/ncu-registry.js'
import { ncuVersion, runNcu } from './ncu.js'

let repo

beforeEach(() => {
  blockRealNetwork()
})

afterEach(() => {
  restoreRealNetwork()
  if (repo) rmSync(repo, { recursive: true, force: true })
  repo = undefined
})

describe('#ncuVersion', () => {
  test('Should give the npm-check-updates version tim pins', () => {
    const timPackage = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
    )

    expect(ncuVersion()).toBe(timPackage.dependencies['npm-check-updates'])
  })
})

describe('#runNcu', () => {
  test('Should report no upgrades for a package.json with no dependencies', async () => {
    repo = mkdtempSync(join(tmpdir(), 'tim-ncu-'))
    writeFileSync(join(repo, 'package.json'), '{ "name": "empty" }\n')

    const upgrades = await runNcu({ cwd: repo, target: 'latest' })

    expect(upgrades).toEqual({})
  })

  describe('With a registry offering patch, minor and major releases', () => {
    beforeEach(() => {
      serveRegistryPackage('widget', ['1.2.3', '1.2.9', '1.5.0', '2.1.0'])
    })

    test.each([
      ['latest', '^2.1.0'],
      ['minor', '^1.5.0'],
      ['patch', '^1.2.9']
    ])(
      'Should propose the %s target for the package.json in cwd',
      async (target, expected) => {
        repo = writeRegistryRepo(mkdtempSync(join(tmpdir(), 'tim-ncu-')), {
          widget: '^1.2.3'
        })

        const upgrades = await runNcu({ cwd: repo, target })

        expect(upgrades).toEqual({ widget: expected })
      }
    )

    test('Should read the dependencies from the package.json in cwd', async () => {
      serveRegistryPackage('gadget', ['3.0.0', '4.0.0'])
      repo = writeRegistryRepo(mkdtempSync(join(tmpdir(), 'tim-ncu-')), {
        gadget: '^3.0.0'
      })

      const upgrades = await runNcu({ cwd: repo, target: 'latest' })

      expect(upgrades).toEqual({ gadget: '^4.0.0' })
    })
  })
})
