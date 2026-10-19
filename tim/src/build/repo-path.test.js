import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { resolveRepoPath } from './repo-path.js'

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const workspaceWithRepo = (folder) => {
  root = mkdtempSync(join(tmpdir(), 'tim-repo-path-'))
  mkdirSync(join(root, 'repos', folder), { recursive: true })
}

describe('resolveRepoPath', () => {
  test('returns a path that exists as given', () => {
    workspaceWithRepo('frontend')

    expect(resolveRepoPath(root, join(root, 'repos', 'frontend'))).toBe(
      join(root, 'repos', 'frontend')
    )
  })

  test('finds a folder name under the workspace repos folder', () => {
    workspaceWithRepo('trade-imports-unlikely-folder-name')

    expect(resolveRepoPath(root, 'trade-imports-unlikely-folder-name')).toBe(
      join(root, 'repos', 'trade-imports-unlikely-folder-name')
    )
  })

  test('refuses a repo that is neither a path nor a folder under repos', () => {
    workspaceWithRepo('frontend')

    expect(() => resolveRepoPath(root, 'trade-imports-missing')).toThrow(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: `Can't find trade-imports-missing, either as a path or as a folder under ${join(root, 'repos')}.`
      })
    )
  })
})
