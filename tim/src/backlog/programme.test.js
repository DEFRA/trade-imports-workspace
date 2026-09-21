import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadProgramme } from './programme.js'

let workspace

const writeRegistry = (body) => {
  mkdirSync(join(workspace, 'tools', 'backlog'), { recursive: true })
  writeFileSync(
    join(workspace, 'tools', 'backlog', 'registry.json'),
    JSON.stringify(body)
  )
}

const writeCorpora = (body) => {
  mkdirSync(join(workspace, 'tools', 'parity'), { recursive: true })
  writeFileSync(
    join(workspace, 'tools', 'parity', 'corpora.json'),
    JSON.stringify(body)
  )
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-programme-'))
  writeCorpora({ default: 'alpha', corpora: {} })
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

describe('loadProgramme', () => {
  test("builds a requirements-v2 programme's paths from its registry entry: workarea absolute, backlog at <workarea>/backlog.json", () => {
    writeRegistry({
      programmes: {
        'fixture-requirements': {
          profile: 'requirements-v2',
          workarea: 'tim/src/backlog/__fixtures__/fixture-requirements'
        }
      }
    })

    const profile = loadProgramme({
      workspaceRoot: workspace,
      key: 'fixture-requirements'
    })

    expect(profile.profileKey).toBe('requirements-v2')
    expect(profile.paths.workarea).toBe(
      join(workspace, 'tim/src/backlog/__fixtures__/fixture-requirements')
    )
    expect(profile.paths.backlog).toBe(
      join(
        workspace,
        'tim/src/backlog/__fixtures__/fixture-requirements',
        'backlog.json'
      )
    )
    expect(profile.paths.state).toBe(
      join(
        workspace,
        'tim/src/backlog/__fixtures__/fixture-requirements',
        'build',
        'state.json'
      )
    )
  })

  test('expands a home-relative workarea rather than nesting it under the workspace', () => {
    writeRegistry({
      programmes: {
        'fixture-requirements': {
          profile: 'requirements-v2',
          workarea: '~/elsewhere/fixture-requirements'
        }
      }
    })

    const profile = loadProgramme({
      workspaceRoot: workspace,
      key: 'fixture-requirements'
    })

    expect(profile.paths.workarea).toMatch(/\/elsewhere\/fixture-requirements$/)
    expect(profile.paths.workarea).not.toContain(workspace)
  })

  test("takes an entry's explicit backlog path over the derived one", () => {
    writeRegistry({
      programmes: {
        'fixture-requirements': {
          profile: 'requirements-v2',
          workarea: 'workareas/shared/fixture-requirements',
          backlog: 'workareas/shared/fixture-requirements/state/backlog.json'
        }
      }
    })

    const profile = loadProgramme({
      workspaceRoot: workspace,
      key: 'fixture-requirements'
    })

    expect(profile.paths.backlog).toBe(
      join(
        workspace,
        'workareas/shared/fixture-requirements/state/backlog.json'
      )
    )
  })

  test('returns a parity corpus profile, with sides and bands present, for a parity-v1 entry', () => {
    writeCorpora({
      default: 'alpha',
      corpora: {
        alpha: {
          runId: 'RUN-1',
          backlog: 'workareas/journey-builder/RUN-1/backlog.json',
          deferred: 'workareas/journey-builder/RUN-1/deferred.json',
          meta: 'workareas/journey-builder/RUN-1/.corpus-meta.json',
          evidence: 'workareas/journey-builder/RUN-1/evidence.json',
          reportDir: 'workareas/journey-builder/RUN-1/report',
          workarea: 'workareas/shared/alpha',
          pairingModule: 'workareas/shared/alpha/pairs.js',
          deltasDir: 'workareas/shared/alpha/deltas',
          upstreamFindings: 'workareas/shared/alpha/backlog.json',
          sides: [],
          repos: {}
        }
      }
    })

    const profile = loadProgramme({ workspaceRoot: workspace, key: 'alpha' })

    expect(profile.profileKey).toBe('parity-v1')
    expect(profile.sides).toEqual([])
    expect(profile.bands.length).toBeGreaterThan(0)
  })

  test('refuses a programme whose entry names a profile no definition knows, naming the known profiles', () => {
    writeRegistry({
      programmes: {
        bogus: {
          profile: 'made-up-profile',
          workarea: 'workareas/shared/bogus'
        }
      }
    })

    expect(() =>
      loadProgramme({ workspaceRoot: workspace, key: 'bogus' })
    ).toThrow(/parity-v1, requirements-v2/)
  })

  test('refuses a non-parity programme whose entry names no workarea, naming the key and the registry file', () => {
    writeRegistry({
      programmes: {
        homeless: { profile: 'requirements-v2' }
      }
    })

    expect(() =>
      loadProgramme({ workspaceRoot: workspace, key: 'homeless' })
    ).toThrow(/homeless.*tools\/backlog\/registry\.json.*workarea/s)
  })
})
