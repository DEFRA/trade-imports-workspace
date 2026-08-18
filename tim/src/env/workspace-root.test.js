import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir, homedir } from 'node:os'
import {
  resolveWorkspaceRoot,
  CANONICAL_WORKSPACE_PATH
} from './workspace-root.js'

const makeFakeWorkspace = () => {
  const root = mkdtempSync(join(tmpdir(), 'tim-ws-'))
  writeFileSync(join(root, 'Makefile'), 'all:\n')
  mkdirSync(join(root, 'repos'))
  return root
}

let workspace
let inside

beforeEach(() => {
  workspace = makeFakeWorkspace()
  inside = join(workspace, 'repos', 'trade-imports-animals-frontend', 'src')
  mkdirSync(inside, { recursive: true })
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

describe('resolveWorkspaceRoot', () => {
  test('explicit path takes precedence over env and cwd', () => {
    const resolved = resolveWorkspaceRoot({
      explicit: workspace,
      env: '/some/other/path',
      cwd: '/'
    })
    expect(resolved).toBe(workspace)
  })

  test('falls back to TIM_WORKSPACE env when explicit is unset', () => {
    const resolved = resolveWorkspaceRoot({ env: workspace, cwd: '/' })
    expect(resolved).toBe(workspace)
  })

  test('walks up from cwd to find the workspace root', () => {
    const resolved = resolveWorkspaceRoot({ cwd: inside, env: undefined })
    expect(resolved).toBe(workspace)
  })

  test('throws USAGE when the explicit path is not a directory', () => {
    expect(() =>
      resolveWorkspaceRoot({ explicit: join(workspace, 'no-such-dir') })
    ).toThrow(/not a directory/)
  })

  test('throws USAGE when the explicit path lacks workspace markers', () => {
    const empty = mkdtempSync(join(tmpdir(), 'tim-empty-'))
    try {
      expect(() => resolveWorkspaceRoot({ explicit: empty })).toThrow(
        /does not look like/
      )
    } finally {
      rmSync(empty, { recursive: true, force: true })
    }
  })

  test('throws USAGE when no workspace can be located', () => {
    const empty = mkdtempSync(join(tmpdir(), 'tim-no-canonical-'))
    try {
      expect(() =>
        resolveWorkspaceRoot({
          cwd: tmpdir(),
          env: undefined,
          canonical: empty
        })
      ).toThrow(/Cannot find the workspace root/)
    } finally {
      rmSync(empty, { recursive: true, force: true })
    }
  })

  test('falls back to the canonical path when the walk-up finds nothing', () => {
    const resolved = resolveWorkspaceRoot({
      cwd: tmpdir(),
      env: undefined,
      canonical: workspace
    })

    expect(resolved).toBe(workspace)
  })

  test('prefers a workspace found by walking up over the canonical path', () => {
    const other = makeFakeWorkspace()

    try {
      expect(
        resolveWorkspaceRoot({ cwd: inside, env: undefined, canonical: other })
      ).toBe(workspace)
    } finally {
      rmSync(other, { recursive: true, force: true })
    }
  })

  test('CANONICAL_WORKSPACE_PATH is the location tools/ scripts hardcode', () => {
    expect(CANONICAL_WORKSPACE_PATH).toBe(
      join(homedir(), 'git', 'defra', 'trade-imports-workspace')
    )
  })
})
