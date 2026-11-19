import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  ADMIN,
  EMPTY_RUN_ID,
  FRONTEND,
  NO_FILE_REPO,
  RUN_ID,
  stageNpmWorkspace
} from './__fixtures__/npm-workspace.js'
import {
  fragmentFileName,
  packageRowsOf,
  packagesFilesOfRun,
  readPackagesFile,
  requireOneOf,
  requireOptions,
  requireRunFolder,
  runFolder,
  utcStamp
} from './state.js'

let staged

afterEach(() => staged?.remove())

describe('#fragmentFileName', () => {
  test('Should turn each slash of a scoped package into a double underscore', () => {
    expect(fragmentFileName('@hapi/hapi')).toBe('@hapi__hapi.json')
  })
})

describe('#utcStamp', () => {
  test('Should print UTC to the second with a Z', () => {
    expect(utcStamp(new Date('2026-05-27T10:11:12.345Z'))).toBe(
      '2026-05-27T10:11:12Z'
    )
  })
})

describe('#packagesFilesOfRun', () => {
  test('Should list every repo packages file in path order', () => {
    staged = stageNpmWorkspace()
    const folder = runFolder(staged.root, RUN_ID)

    expect(packagesFilesOfRun(folder)).toEqual([
      join(folder, ADMIN, `packages.${ADMIN}.json`),
      join(folder, FRONTEND, `packages.${FRONTEND}.json`)
    ])
  })

  test('Should list nothing for a repo with no packages file', () => {
    staged = stageNpmWorkspace()

    expect(
      packagesFilesOfRun(runFolder(staged.root, RUN_ID), NO_FILE_REPO)
    ).toEqual([])
  })

  test('Should list nothing for a run whose repo folders hold no packages file', () => {
    staged = stageNpmWorkspace()

    expect(packagesFilesOfRun(runFolder(staged.root, EMPTY_RUN_ID))).toEqual([])
  })
})

describe('#packageRowsOf', () => {
  test('Should give each row the repo of its file', () => {
    staged = stageNpmWorkspace()
    const folder = runFolder(staged.root, RUN_ID)

    const rows = packageRowsOf(packagesFilesOfRun(folder, FRONTEND))

    expect(rows.map(({ package: name, repo }) => [name, repo])).toEqual([
      ['govuk-frontend-helper', FRONTEND],
      ['@playwright/test', FRONTEND],
      ['hapi-pino', FRONTEND]
    ])
  })
})

describe('#readPackagesFile', () => {
  test('Should refuse a missing packages file with NOT_FOUND naming it', () => {
    staged = stageNpmWorkspace()
    const path = join(
      runFolder(staged.root, RUN_ID),
      NO_FILE_REPO,
      'packages.x.json'
    )

    expect(() => readPackagesFile(path)).toThrow(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: `Packages file not found: ${path}`
      })
    )
  })
})

describe('#requireRunFolder', () => {
  test('Should refuse a missing run folder with NOT_FOUND naming it', () => {
    staged = stageNpmWorkspace()
    const folder = runFolder(staged.root, 'EUDPA-999')

    expect(() => requireRunFolder(folder)).toThrow(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: `Run dir not found: ${folder}`
      })
    )
  })
})

describe('#requireOptions', () => {
  test('Should name the first empty option and give the usage line', () => {
    expect(() =>
      requireOptions({ 'run-id': 'EUDPA-1', repo: '' }, 'Usage: x')
    ).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message: 'Missing --repo\nUsage: x'
      })
    )
  })
})

describe('#requireOneOf', () => {
  test('Should refuse a value outside the list with the hint after it', () => {
    expect(() => requireOneOf('risk', 'low', ['LOW'], ' (LOW)')).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message: 'Invalid --risk: low (LOW)'
      })
    )
  })

  test('Should accept a value left out', () => {
    expect(requireOneOf('risk', undefined, ['LOW'])).toBeUndefined()
  })
})
