import { describe, test, expect, afterEach } from 'vitest'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { resetReconcile, resetSources, supersededStampOf } from './reset.js'
import { distilStatus } from './checks.js'
import { mergeExtractParts } from './merge-extract.js'
import {
  DEMO_WORKAREA,
  makeDistilWorkspace,
  splitExtractIntoParts
} from '../test-support/distil-workspace.js'

let workspace

afterEach(() => {
  workspace?.remove()
  workspace = undefined
})

const NOW = new Date('2026-10-07T18:20:52.123Z')
const STAMP = '2026-10-07T18-20-52-123Z'

const reset = (options) =>
  resetSources({
    layout: workspace.layout,
    schemas: workspace.schemas,
    now: NOW,
    ...options
  })

const stateOf = (sourceId) =>
  distilStatus({
    layout: workspace.layout,
    schemas: workspace.schemas,
    workarea: DEMO_WORKAREA
  }).sources.find((source) => source.id === sourceId)

const supersededDir = () => join(workspace.layout.supersededDir, STAMP)

/**
 * The demo's repo:tests extracted in parts and merged, with a verify part
 * left over beside its verification: every kind of file a reset moves.
 */
const partitionedAndMerged = () => {
  workspace = makeDistilWorkspace()
  splitExtractIntoParts(workspace)
  mergeExtractParts({
    layout: workspace.layout,
    schemas: workspace.schemas,
    workarea: DEMO_WORKAREA,
    sourceId: 'repo:tests'
  })
  workspace.writeJson(
    join(workspace.layout.verifyDir, 'repo-tests.part1.json'),
    {}
  )
}

describe('supersededStampOf', () => {
  test('names the folder by the time in UTC, without colons or a dot', () => {
    expect(supersededStampOf(NOW)).toBe(STAMP)
  })
})

describe('resetSources', () => {
  test('sets a verified source back to pending', () => {
    partitionedAndMerged()

    reset({ sourceIds: ['repo:tests'] })

    expect(stateOf('repo:tests')).toMatchObject({
      state: 'pending',
      next: 'extract',
      reason: 'No extract yet.'
    })
  })

  test('moves the extract, partition, parts and verify files under superseded, by stage', () => {
    partitionedAndMerged()

    reset({ sourceIds: ['repo:tests'] })

    expect({
      extract: readdirSync(join(supersededDir(), 'extract')),
      verify: readdirSync(join(supersededDir(), 'verify'))
    }).toEqual({
      extract: [
        'repo-tests.json',
        'repo-tests.part1.json',
        'repo-tests.part2.json',
        'repo-tests.partition.json'
      ],
      verify: ['repo-tests.json', 'repo-tests.part1.json']
    })
  })

  test('says what it moved, from where to where', () => {
    partitionedAndMerged()

    const result = reset({ sourceIds: ['repo:tests'] })

    expect(result).toMatchObject({
      superseded: supersededDir(),
      moved: 6,
      sources: [{ id: 'repo:tests', slug: 'repo-tests' }]
    })
    expect(result.sources[0].moved[0]).toEqual({
      from: join(workspace.layout.extractDir, 'repo-tests.json'),
      to: join(supersededDir(), 'extract', 'repo-tests.json')
    })
  })

  test('leaves every other source as it was', () => {
    partitionedAndMerged()

    reset({ sourceIds: ['repo:tests'] })

    expect(stateOf('confluence:6608160092').state).toBe('verified')
  })

  test('resets every source with all', () => {
    workspace = makeDistilWorkspace()

    reset({ all: true })

    expect(
      distilStatus({
        layout: workspace.layout,
        schemas: workspace.schemas,
        workarea: DEMO_WORKAREA
      }).counts
    ).toMatchObject({ pending: 3, verified: 0 })
  })

  test('moves nothing and makes no folder for a source with no files', () => {
    workspace = makeDistilWorkspace()
    reset({ sourceIds: ['repo:tests'] })

    const again = resetSources({
      layout: workspace.layout,
      schemas: workspace.schemas,
      sourceIds: ['repo:tests'],
      now: new Date('2026-10-08T09:00:00.000Z')
    })

    expect(again).toEqual({
      superseded: null,
      moved: 0,
      sources: [{ id: 'repo:tests', slug: 'repo-tests', moved: [] }]
    })
    expect(
      existsSync(
        join(workspace.layout.supersededDir, '2026-10-08T09-00-00-000Z')
      )
    ).toBe(false)
  })

  test('names a source sources.json does not have, and moves nothing', () => {
    workspace = makeDistilWorkspace()

    expect(() => reset({ sourceIds: ['repo:tests', 'repo:gone'] })).toThrow(
      `Can't find repo:gone in ${workspace.layout.sources}. Its sources are ruling:sam-2026-09-29c, repo:tests, confluence:6608160092.`
    )
    expect(stateOf('repo:tests').state).toBe('verified')
  })

  test('asks for sources or all, not both and not neither', () => {
    workspace = makeDistilWorkspace()

    expect(() => reset({ sourceIds: ['repo:tests'], all: true })).toThrow(
      'Name the sources to reset with --source, once for each, or reset every source with --all. Not both.'
    )
    expect(() => reset({})).toThrow('Name the sources to reset with --source')
  })

  test('refuses to mix files into a folder another reset already made', () => {
    workspace = makeDistilWorkspace()
    mkdirSync(supersededDir(), { recursive: true })

    expect(() => reset({ sourceIds: ['repo:tests'] })).toThrow(
      `${supersededDir()} already exists. Run the reset again.`
    )
  })
})

describe('resetReconcile', () => {
  const resetLater = () =>
    resetReconcile({ layout: workspace.layout, now: NOW })

  /** The demo with every later-stage file a reconcile reset moves. */
  const reconciledAndReported = () => {
    workspace = makeDistilWorkspace()
    workspace.writeJson(workspace.layout.workingSet, {})
    workspace.writeJson(workspace.layout.areas, {})
    workspace.writeJson(
      join(workspace.layout.areasDir, 'suite', 'reconciled.json'),
      {}
    )
    workspace.writeJson(join(workspace.layout.challengeDir, 'c-002.json'), {})
    workspace.writeJson(
      join(workspace.layout.dir, 'distil', 'backlog-snapshot.before.json'),
      {}
    )
    writeFileSync(workspace.layout.report, '# report\n')
  }

  test('moves every later-stage file under superseded/<time>/reconcile', () => {
    reconciledAndReported()

    resetLater()

    expect(readdirSync(join(supersededDir(), 'reconcile')).sort()).toEqual([
      'areas',
      'areas.json',
      'backlog-snapshot.before.json',
      'backlog.json',
      'challenge',
      'conflicts.json',
      'report.md',
      'requirements.json',
      'working-set.json'
    ])
  })

  test('keeps every verified extract, so the next launch goes straight to reconcile', () => {
    reconciledAndReported()

    resetLater()

    expect(
      distilStatus({
        layout: workspace.layout,
        schemas: workspace.schemas,
        workarea: DEMO_WORKAREA
      }).counts
    ).toMatchObject({ verified: 3, pending: 0 })
  })

  test('refuses while the backlog has a built row, and moves nothing', () => {
    workspace = makeDistilWorkspace()
    workspace.editJson(workspace.layout.backlog, (backlog) => ({
      ...backlog,
      increments: backlog.increments.map((row, index) =>
        index === 0 ? { ...row, status: 'done', commit: 'abc1234' } : row
      )
    }))
    const builtId = workspace.readJson(workspace.layout.backlog).increments[0]
      .id

    expect(() => resetLater()).toThrow(
      `backlog.json has rows with build work on them: ${builtId}. A reconcile reset starts the backlog again and would lose their ids. Re-distil without a reset instead: it keeps every id and never changes a built row.`
    )
    expect(existsSync(workspace.layout.requirements)).toBe(true)
  })
})
