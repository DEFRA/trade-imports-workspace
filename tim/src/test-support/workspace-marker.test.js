import { describe, test, expect } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { resolveWorkspaceRoot } from '../env/workspace-root.js'
import { markWorkspaceRoot } from './workspace-marker.js'

describe('#markWorkspaceRoot', () => {
  test('Should make a folder holding repos/ resolve as the workspace root', () => {
    const root = mkdtempSync(join(tmpdir(), 'tim-marker-'))
    mkdirSync(join(root, 'repos'))

    markWorkspaceRoot(root)

    try {
      expect(resolveWorkspaceRoot({ explicit: root })).toBe(root)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
