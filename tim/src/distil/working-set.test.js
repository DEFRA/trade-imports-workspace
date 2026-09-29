import { describe, test, expect, afterEach } from 'vitest'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { workingSetOf, writeWorkingSet } from './working-set.js'
import {
  DEMO_WORKAREA,
  makeDistilWorkspace
} from '../test-support/distil-workspace.js'

let workspace

afterEach(() => {
  workspace?.remove()
  workspace = undefined
})

const gather = () =>
  workingSetOf({
    layout: workspace.layout,
    schemas: workspace.schemas,
    workarea: DEMO_WORKAREA
  })

describe('workingSetOf', () => {
  test('keeps held claims and missed claims, and leaves refuted claims out', () => {
    workspace = makeDistilWorkspace()

    const tests = gather().sources.find((source) => source.id === 'repo:tests')

    expect(tests.claims.map((claim) => [claim.id, claim.origin])).toEqual([
      ['tests-001', 'extract'],
      ['tests-002', 'extract'],
      ['tests-005', 'extract'],
      ['tests-001-m1', 'missed']
    ])
  })

  test('carries each source kind, role, precedence rank and counts', () => {
    workspace = makeDistilWorkspace()

    const { claims, ...tests } = gather().sources.find(
      (source) => source.id === 'repo:tests'
    )

    expect(tests).toEqual({
      id: 'repo:tests',
      kind: 'repo',
      role: 'what is already proven end to end, and where a performance suite would sit',
      rank: 2,
      slug: 'repo-tests',
      held: 3,
      refuted: 1,
      missed: 1
    })
  })

  test('counts every claim in the working set', () => {
    workspace = makeDistilWorkspace()

    expect(gather().total).toBe(1 + 4 + 6)
  })

  test('names a source that is not verified rather than dropping it silently', () => {
    workspace = makeDistilWorkspace()
    rmSync(join(workspace.layout.verifyDir, 'repo-tests.json'))

    const result = gather()

    expect(result.unavailable).toEqual([
      { id: 'repo:tests', state: 'extracted', reason: 'No verification yet.' }
    ])
    expect(result.sources.map((source) => source.id)).toEqual([
      'ruling:sam-2026-09-29c',
      'confluence:6608160092'
    ])
  })
})

describe('writeWorkingSet', () => {
  test('writes the whole working set and returns it without the claims', () => {
    workspace = makeDistilWorkspace()
    const workingSet = gather()

    const result = writeWorkingSet({ layout: workspace.layout, workingSet })

    expect(workspace.readJson(workspace.layout.workingSet)).toEqual(workingSet)
    expect(result.sources[0]).not.toHaveProperty('claims')
  })
})
