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

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-programme-'))
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

  test('gives paths.opsLog and paths.journal under the workarea', () => {
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

    expect(profile.paths.opsLog).toBe(
      join(
        workspace,
        'tim/src/backlog/__fixtures__/fixture-requirements',
        '.backlog-ops.jsonl'
      )
    )
    expect(profile.paths.journal).toBe(
      join(
        workspace,
        'tim/src/backlog/__fixtures__/fixture-requirements',
        'build',
        'journal.jsonl'
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
    ).toThrow(/Unknown profile "made-up-profile".*requirements-v2/s)
  })

  test('refuses a programme whose entry names no workarea, naming the key and the registry file', () => {
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
