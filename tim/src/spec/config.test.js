import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { resolveSpecRoot } from './config.js'

let workspaceRoot

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), 'tim-spec-config-'))
  mkdirSync(join(workspaceRoot, 'openspec', 'specs'), { recursive: true })
})

afterEach(() => {
  rmSync(workspaceRoot, { recursive: true, force: true })
})

describe('resolveSpecRoot', () => {
  test('defaults to the workspace root with no --root', () => {
    expect(resolveSpecRoot({ workspaceRoot })).toBe(workspaceRoot)
  })

  test('roots to --root instead, for a worktree journey-builder wrote the spec into', () => {
    const worktree = mkdtempSync(join(tmpdir(), 'tim-spec-worktree-'))
    mkdirSync(join(worktree, 'openspec', 'specs'), { recursive: true })

    expect(resolveSpecRoot({ workspaceRoot, root: worktree })).toBe(worktree)

    rmSync(worktree, { recursive: true, force: true })
  })

  test('refuses a --root with no openspec/specs under it', () => {
    const empty = mkdtempSync(join(tmpdir(), 'tim-spec-empty-'))

    expect(() => resolveSpecRoot({ workspaceRoot, root: empty })).toThrow(
      /is not a spec root/
    )

    rmSync(empty, { recursive: true, force: true })
  })
})
