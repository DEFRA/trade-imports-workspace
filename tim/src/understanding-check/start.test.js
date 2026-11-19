import { describe, expect, test } from 'vitest'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startCheck, startText } from './start.js'

const withWorkspace = (assertions) => {
  const workspaceRoot = mkdtempSync(join(tmpdir(), 'tim-uc-start-'))
  try {
    return assertions(workspaceRoot)
  } finally {
    rmSync(workspaceRoot, { recursive: true, force: true })
  }
}

const checkDirOf = (workspaceRoot) =>
  join(workspaceRoot, 'workareas', 'understanding-checks', 'EUDPA-1')

describe('#startCheck', () => {
  test('Should start fresh and make the raw folder when the check has no meta', () => {
    withWorkspace((workspaceRoot) => {
      const started = startCheck({ workspaceRoot, ticket: 'EUDPA-1' })

      expect(started).toEqual({
        mode: 'FRESH',
        checkDir: checkDirOf(workspaceRoot),
        rawDir: join(checkDirOf(workspaceRoot), '.raw')
      })
      expect(existsSync(started.rawDir)).toBe(true)
    })
  })

  test('Should resume with the meta when the check already has one', () => {
    withWorkspace((workspaceRoot) => {
      mkdirSync(checkDirOf(workspaceRoot), { recursive: true })
      writeFileSync(
        join(checkDirOf(workspaceRoot), '.interview-meta.json'),
        '{"ticket": "EUDPA-1", "verdict": null}\n'
      )

      const started = startCheck({ workspaceRoot, ticket: 'EUDPA-1' })

      expect(started).toEqual({
        mode: 'RESUME',
        checkDir: checkDirOf(workspaceRoot),
        meta: { ticket: 'EUDPA-1', verdict: null }
      })
      expect(existsSync(join(checkDirOf(workspaceRoot), '.raw'))).toBe(false)
    })
  })
})

describe('#startText', () => {
  test('Should say MODE: FRESH first, then the folders and what to do next', () => {
    const text = startText({
      mode: 'FRESH',
      checkDir: '/w/check',
      rawDir: '/w/check/.raw'
    })

    expect(text).toBe(
      'MODE: FRESH\n\nCheck folder: /w/check\nRaw folder: /w/check/.raw\n\nSave the pull requests into the raw folder with gh, then run tim understanding-check prepare (see SKILL.md Step 1).'
    )
  })
})
