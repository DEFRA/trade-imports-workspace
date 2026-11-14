import { describe, expect, test } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkedVerdict, finalizeRefinement } from './finalize.js'

const workspaceWithMeta = (ticket, meta) => {
  const workspaceRoot = mkdtempSync(join(tmpdir(), 'tim-refine-finalize-'))
  const folder = join(workspaceRoot, 'workareas', 'ticket-refinement', ticket)
  mkdirSync(folder, { recursive: true })
  writeFileSync(join(folder, '.refinement-meta.json'), JSON.stringify(meta))
  return { workspaceRoot, metaFile: join(folder, '.refinement-meta.json') }
}

describe('#checkedVerdict', () => {
  test('Should refuse a verdict with the wrong spacing', () => {
    expect(() => checkedVerdict('NEEDS  WORK')).toThrowError(
      "Error: --verdict must be one of: READY, NEEDS WORK, SPIKE REQUIRED\nGot: 'NEEDS  WORK'"
    )
  })
})

describe('#finalizeRefinement', () => {
  test('Should add the verdict keys after the others when the meta has none', () => {
    const { workspaceRoot, metaFile } = workspaceWithMeta('EUDPA-9', {
      ticket: 'EUDPA-9'
    })

    finalizeRefinement({
      workspaceRoot,
      ticket: 'EUDPA-9',
      verdict: 'READY',
      now: () => new Date('2026-11-13T10:11:12.345Z')
    })

    expect(readFileSync(metaFile, 'utf8')).toBe(
      '{\n  "ticket": "EUDPA-9",\n  "verdict": "READY",\n  "verdict_reason": null,\n  "completed_at": "2026-11-13T10:11:12Z"\n}\n'
    )
  })
})
