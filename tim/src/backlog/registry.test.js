import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadRegistry, findProgramme, listProgrammes } from './registry.js'
import { loadCorpusProfile } from '../parity/corpus-profile.js'

let workspace

const writeCorpora = (body) => {
  mkdirSync(join(workspace, 'tools', 'parity'), { recursive: true })
  writeFileSync(
    join(workspace, 'tools', 'parity', 'corpora.json'),
    JSON.stringify(body)
  )
}

const writeRegistry = (body) => {
  mkdirSync(join(workspace, 'tools', 'backlog'), { recursive: true })
  writeFileSync(
    join(workspace, 'tools', 'backlog', 'registry.json'),
    JSON.stringify(body)
  )
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-registry-'))
  writeCorpora({
    default: 'alpha',
    corpora: { alpha: { runId: 'RUN-1', workarea: 'workareas/shared/alpha' } }
  })
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

describe('findProgramme', () => {
  test('finds a programme registered in tools/backlog/registry.json by its key, returning its profile key and its entry', () => {
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

  test('finds a corpus registered in tools/parity/corpora.json by its key, defaulting its profile to parity-v1', () => {
    const entry = findProgramme({ workspaceRoot: workspace, key: 'alpha' })

    expect(entry.profileKey).toBe('parity-v1')
    expect(entry.workarea).toBe('workareas/shared/alpha')
  })

  test('refuses an unknown key, listing the known ones', () => {
    writeRegistry({
      programmes: {
        'fixture-requirements': { profile: 'requirements-v2', workarea: 'x' }
      }
    })

    expect(() =>
      findProgramme({ workspaceRoot: workspace, key: 'nope' })
    ).toThrow(/alpha, fixture-requirements/)
  })

  test('resolves a corpora-only key when tools/backlog/registry.json is absent', () => {
    const entry = findProgramme({ workspaceRoot: workspace, key: 'alpha' })

    expect(entry.profileKey).toBe('parity-v1')
  })

  test('refuses an unregistered key when tools/backlog/registry.json is absent, naming it not found', () => {
    expect(() =>
      findProgramme({ workspaceRoot: workspace, key: 'fixture-requirements' })
    ).toThrow(/No programme registered under "fixture-requirements"/)
  })

  test('honours a corpora.json entry that names its own profile, rather than defaulting to parity-v1', () => {
    writeCorpora({
      default: 'alpha',
      corpora: {
        alpha: {
          runId: 'RUN-1',
          workarea: 'workareas/shared/alpha',
          profile: 'requirements-v2'
        }
      }
    })

    const entry = findProgramme({ workspaceRoot: workspace, key: 'alpha' })

    expect(entry.profileKey).toBe('requirements-v2')
  })

  test('names tools/parity/corpora.json when it is missing, with the message text unchanged', () => {
    rmSync(join(workspace, 'tools', 'parity', 'corpora.json'))

    expect(() =>
      findProgramme({ workspaceRoot: workspace, key: 'alpha' })
    ).toThrow(/^Can't find tools\/parity\/corpora\.json\.$/)
  })

  test('names the file when tools/parity/corpora.json is not valid JSON', () => {
    writeFileSync(
      join(workspace, 'tools', 'parity', 'corpora.json'),
      '{ not json'
    )

    expect(() =>
      findProgramme({ workspaceRoot: workspace, key: 'alpha' })
    ).toThrow(/Can't read.*corpora\.json/s)
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

  test('refuses a tools/backlog/registry.json entry that names no profile, listing the known profiles', () => {
    writeRegistry({
      programmes: {
        'no-profile-named': { workarea: 'workareas/shared/no-profile-named' }
      }
    })

    expect(() =>
      findProgramme({ workspaceRoot: workspace, key: 'no-profile-named' })
    ).toThrow(
      /no-profile-named.*tools\/backlog\/registry\.json.*parity-v1, requirements-v2/s
    )
  })
})

describe('loadRegistry', () => {
  test('lists every programme from both files in one listing', () => {
    writeRegistry({
      programmes: {
        'fixture-requirements': { profile: 'requirements-v2', workarea: 'x' }
      }
    })
    writeCorpora({
      default: 'alpha',
      corpora: {
        alpha: { runId: 'RUN-1', workarea: 'workareas/shared/alpha' },
        beta: { runId: 'RUN-2', workarea: 'workareas/shared/beta' }
      }
    })

    const keys = listProgrammes({ workspaceRoot: workspace }).map((p) => p.key)

    expect(keys).toEqual(['alpha', 'beta', 'fixture-requirements'])
  })

  test('refuses a key declared in both files, naming the key and both file paths', () => {
    writeRegistry({
      programmes: { alpha: { profile: 'requirements-v2', workarea: 'x' } }
    })

    expect(() => loadRegistry({ workspaceRoot: workspace })).toThrow(
      /alpha.*tools\/backlog\/registry\.json.*tools\/parity\/corpora\.json/s
    )
  })
})

describe('loadCorpusProfile', () => {
  test('refuses a workspace with no tools/parity/corpora.json, naming the exact path', () => {
    rmSync(join(workspace, 'tools', 'parity', 'corpora.json'))

    expect(() =>
      loadCorpusProfile({ workspaceRoot: workspace, explicit: 'alpha' })
    ).toThrow(/^Can't find tools\/parity\/corpora\.json\.$/)
  })
})
