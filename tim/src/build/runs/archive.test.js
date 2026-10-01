import { describe, test, expect, afterEach } from 'vitest'
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import {
  archiveRootFor,
  archiveRuns,
  claudeProjectsDirFor,
  listRunSources,
  readIndex,
  resolveRunSource
} from './archive.js'

const here = dirname(fileURLToPath(import.meta.url))
const PROJECTS = join(here, '__fixtures__', 'projects')
const SESSION = '11111111-1111-4111-8111-111111111111'
const FINISHED = 'wf_aaaa0001-001'
const UNFINISHED = 'wf_aaaa0002-002'

let archiveRoot

afterEach(() => {
  if (archiveRoot) rmSync(archiveRoot, { recursive: true, force: true })
  archiveRoot = undefined
})

const freshArchive = () => {
  archiveRoot = mkdtempSync(join(tmpdir(), 'tim-build-runs-'))
  return archiveRoot
}

const filesUnder = (folder) =>
  readdirSync(folder, { recursive: true })
    .filter((name) => statSync(join(folder, name)).isFile())
    .sort()

const snapshotOf = (folder) =>
  filesUnder(folder).map((name) => {
    const { size, mtimeMs } = statSync(join(folder, name))
    return { name, size, mtimeMs }
  })

describe('claudeProjectsDirFor', () => {
  test('names the folder after the workspace path with every other character turned into a dash', () => {
    expect(
      claudeProjectsDirFor({
        workspaceRoot: '/Users/someone/git/defra/trade-imports-workspace',
        configDir: '/home/config'
      })
    ).toBe(
      '/home/config/projects/-Users-someone-git-defra-trade-imports-workspace'
    )
  })
})

describe('archiveRootFor', () => {
  test('puts the archive under workareas/, which git ignores', () => {
    expect(archiveRootFor('/workspace')).toBe(
      '/workspace/workareas/build-telemetry'
    )
  })
})

describe('listRunSources', () => {
  test('finds every workflow run in every session', () => {
    expect(
      listRunSources(PROJECTS).map(({ runId, sessionId }) => ({
        runId,
        sessionId
      }))
    ).toEqual([
      { runId: FINISHED, sessionId: SESSION },
      { runId: UNFINISHED, sessionId: SESSION }
    ])
  })

  test('finds nothing when the folder does not exist', () => {
    expect(listRunSources(join(PROJECTS, 'missing'))).toEqual([])
  })
})

describe('resolveRunSource', () => {
  test('finds a run by its id without the wf_ prefix', () => {
    expect(resolveRunSource(PROJECTS, 'aaaa0001-001').runFile).toBe(
      join(PROJECTS, SESSION, 'workflows', `${FINISHED}.json`)
    )
  })

  test('finds a run by the path of its transcript folder', () => {
    const transcriptDir = join(
      PROJECTS,
      SESSION,
      'subagents',
      'workflows',
      UNFINISHED
    )

    expect(resolveRunSource(PROJECTS, transcriptDir)).toMatchObject({
      runId: UNFINISHED,
      sessionId: SESSION,
      transcriptDir
    })
  })

  test('refuses a run id it cannot find', () => {
    expect(() => resolveRunSource(PROJECTS, 'wf_nothing-here')).toThrow(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: expect.stringContaining('Cannot find run wf_nothing-here')
      })
    )
  })
})

describe('archiveRuns', () => {
  test("copies the run's journal, transcripts, record and its agents' own subagents", () => {
    const root = freshArchive()

    archiveRuns({
      sources: [resolveRunSource(PROJECTS, FINISHED)],
      archiveRoot: root
    })

    expect(filesUnder(join(root, 'runs', FINISHED))).toEqual([
      'run.json',
      'subagents/agent-a0000000000000009.jsonl',
      'subagents/agent-a0000000000000009.meta.json',
      'transcripts/agent-a0000000000000001.jsonl',
      'transcripts/agent-a0000000000000001.meta.json',
      'transcripts/agent-a0000000000000002.jsonl',
      'transcripts/agent-a0000000000000002.meta.json',
      'transcripts/agent-a0000000000000003.jsonl',
      'transcripts/agent-a0000000000000003.meta.json',
      'transcripts/agent-a0000000000000004.jsonl',
      'transcripts/agent-a0000000000000004.meta.json',
      'transcripts/journal.jsonl'
    ])
  })

  test('copies every file byte for byte', () => {
    const root = freshArchive()

    archiveRuns({
      sources: [resolveRunSource(PROJECTS, FINISHED)],
      archiveRoot: root
    })

    expect(
      readFileSync(
        join(root, 'runs', FINISHED, 'transcripts', 'journal.jsonl'),
        'utf8'
      )
    ).toBe(
      readFileSync(
        join(
          PROJECTS,
          SESSION,
          'subagents',
          'workflows',
          FINISHED,
          'journal.jsonl'
        ),
        'utf8'
      )
    )
  })

  test('copies nothing the second time when nothing has changed', () => {
    const root = freshArchive()
    const sources = listRunSources(PROJECTS)
    archiveRuns({ sources, archiveRoot: root })

    const again = archiveRuns({ sources, archiveRoot: root })

    expect(again.map(({ runId, copied }) => ({ runId, copied }))).toEqual([
      { runId: FINISHED, copied: 0 },
      { runId: UNFINISHED, copied: 0 }
    ])
  })

  test('leaves the source folders exactly as they were', () => {
    const root = freshArchive()
    const before = snapshotOf(PROJECTS)

    archiveRuns({ sources: listRunSources(PROJECTS), archiveRoot: root })

    expect(snapshotOf(PROJECTS)).toEqual(before)
  })

  test('indexes a finished run from its record', () => {
    const root = freshArchive()

    archiveRuns({
      sources: [resolveRunSource(PROJECTS, FINISHED)],
      archiveRoot: root,
      now: new Date('2026-02-01T00:00:00.000Z')
    })

    expect(readIndex(root).runs[FINISHED]).toEqual({
      runId: FINISHED,
      sessionId: SESSION,
      workflowName: 'increment-build-loop',
      workarea: 'shared/demo-programme',
      status: 'completed',
      startedAt: '2026-01-01T10:00:00.000Z',
      endedAt: '2026-01-01T10:08:20.000Z',
      durationMs: 500000,
      agentCount: 4,
      stopReason: 'review-failed',
      increments: [{ id: 'inc-001', outcome: 'review-failed' }],
      source: join(PROJECTS, SESSION, 'subagents', 'workflows', FINISHED),
      archivedAt: '2026-02-01T00:00:00.000Z',
      refreshedAt: '2026-02-01T00:00:00.000Z'
    })
  })

  test('indexes a run with no record as unfinished, finding its workarea in a prompt', () => {
    const root = freshArchive()

    archiveRuns({
      sources: [resolveRunSource(PROJECTS, UNFINISHED)],
      archiveRoot: root
    })

    expect(readIndex(root).runs[UNFINISHED]).toMatchObject({
      workflowName: null,
      workarea: 'shared/demo-programme',
      status: 'unfinished',
      startedAt: '2026-01-02T09:00:00.000Z',
      agentCount: 1,
      stopReason: null,
      increments: []
    })
  })

  test('keeps the first archive time when a run is archived again', () => {
    const root = freshArchive()
    const sources = [resolveRunSource(PROJECTS, FINISHED)]
    archiveRuns({
      sources,
      archiveRoot: root,
      now: new Date('2026-02-01T00:00:00.000Z')
    })

    archiveRuns({
      sources,
      archiveRoot: root,
      now: new Date('2026-03-01T00:00:00.000Z')
    })

    expect(readIndex(root).runs[FINISHED]).toMatchObject({
      archivedAt: '2026-02-01T00:00:00.000Z',
      refreshedAt: '2026-03-01T00:00:00.000Z'
    })
  })
})
