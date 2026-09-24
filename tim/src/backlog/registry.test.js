import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { findProgramme, listProgrammes } from './registry.js'

let workspace

const writeRegistry = (body) => {
  mkdirSync(join(workspace, 'tools', 'backlog'), { recursive: true })
  writeFileSync(
    join(workspace, 'tools', 'backlog', 'registry.json'),
    JSON.stringify(body)
  )
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-registry-'))
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

describe('findProgramme', () => {
  test('finds a programme by its key, returning its profile key and its entry', () => {
    writeRegistry({
      programmes: {
        'fixture-requirements': {
          profile: 'requirements-v2',
          workarea: 'tim/src/backlog/__fixtures__/fixture-requirements'
        }
      }
    })

    const entry = findProgramme({
      workspaceRoot: workspace,
      key: 'fixture-requirements'
    })

    expect(entry.profileKey).toBe('requirements-v2')
    expect(entry.workarea).toBe(
      'tim/src/backlog/__fixtures__/fixture-requirements'
    )
  })

  test('refuses an unknown key, listing the known ones', () => {
    writeRegistry({
      programmes: {
        alpha: { profile: 'requirements-v2', workarea: 'x' },
        'fixture-requirements': { profile: 'requirements-v2', workarea: 'y' }
      }
    })

    expect(() =>
      findProgramme({ workspaceRoot: workspace, key: 'nope' })
    ).toThrow(/alpha, fixture-requirements/)
  })

  test('says so when the registry registers no programme at all', () => {
    writeRegistry({ programmes: {} })

    expect(() =>
      findProgramme({ workspaceRoot: workspace, key: 'fixture-requirements' })
    ).toThrow(
      /No programme registered under "fixture-requirements"\. tools\/backlog\/registry\.json registers none at all\./
    )
  })

  test('names tools/backlog/registry.json when it is missing', () => {
    expect(() =>
      findProgramme({ workspaceRoot: workspace, key: 'fixture-requirements' })
    ).toThrow(/^Can't find tools\/backlog\/registry\.json\.$/)
  })

  test('refuses malformed JSON in tools/backlog/registry.json, naming the file rather than crashing raw', () => {
    mkdirSync(join(workspace, 'tools', 'backlog'), { recursive: true })
    writeFileSync(
      join(workspace, 'tools', 'backlog', 'registry.json'),
      '{ not json'
    )

    expect(() =>
      findProgramme({ workspaceRoot: workspace, key: 'alpha' })
    ).toThrow(/registry\.json.*not valid JSON/s)
  })

  test('refuses an entry that names no profile, listing the known profiles', () => {
    writeRegistry({
      programmes: {
        'no-profile-named': { workarea: 'workareas/shared/no-profile-named' }
      }
    })

    expect(() =>
      findProgramme({ workspaceRoot: workspace, key: 'no-profile-named' })
    ).toThrow(
      /no-profile-named.*tools\/backlog\/registry\.json.*requirements-v2/s
    )
  })
})

describe('listProgrammes', () => {
  test('lists every registered programme, sorted by key', () => {
    writeRegistry({
      programmes: {
        'fixture-requirements': { profile: 'requirements-v2', workarea: 'x' },
        beta: { profile: 'requirements-v2', workarea: 'y' },
        alpha: { profile: 'requirements-v2', workarea: 'z' }
      }
    })

    const keys = listProgrammes({ workspaceRoot: workspace }).map(
      (programme) => programme.key
    )

    expect(keys).toEqual(['alpha', 'beta', 'fixture-requirements'])
  })
})
