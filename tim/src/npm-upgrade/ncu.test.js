import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { ncuVersion, runNcu } from './ncu.js'

let repo

afterEach(() => {
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
})
