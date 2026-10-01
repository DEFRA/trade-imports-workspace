import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { archiveRuns, listRunSources } from './archive.js'
import { buildAllRunsReport, buildRunReport } from './report.js'
import {
  formatDuration,
  formatTokens,
  renderAllRunsText,
  renderArchiveText,
  renderRunText,
  renderTable
} from './render.js'

const here = dirname(fileURLToPath(import.meta.url))
const PROJECTS = join(here, '__fixtures__', 'projects')

let archiveRoot

afterEach(() => {
  if (archiveRoot) rmSync(archiveRoot, { recursive: true, force: true })
  archiveRoot = undefined
})

const archive = () => {
  archiveRoot = mkdtempSync(join(tmpdir(), 'tim-build-render-'))
  return archiveRuns({ sources: listRunSources(PROJECTS), archiveRoot })
}

const archivedFixtures = () => {
  archive()
  return archiveRoot
}

const finishedReport = () =>
  buildRunReport({ archiveRoot: archivedFixtures(), runId: 'wf_aaaa0001-001' })

describe('formatTokens', () => {
  test.each([
    [950, '950'],
    [41234, '41.2k'],
    [3404000, '3.40M']
  ])('shows %i as %s', (count, text) => {
    expect(formatTokens(count)).toBe(text)
  })
})

describe('formatDuration', () => {
  test.each([
    [7000, '7s'],
    [245000, '4m 05s'],
    [3720000, '1h 02m'],
    [null, '-']
  ])('shows %s ms as %s', (ms, text) => {
    expect(formatDuration(ms)).toBe(text)
  })
})

describe('renderTable', () => {
  test('pads text to the left and numbers to the right of each column', () => {
    expect(
      renderTable(
        ['stage', 'tokens'],
        [
          ['plan', '20.8k'],
          ['review', '950']
        ]
      )
    ).toEqual(['stage   tokens', 'plan     20.8k', 'review     950'])
  })
})

describe('renderRunText', () => {
  test('heads the report with the run, its workarea and its totals', () => {
    const text = renderRunText(finishedReport())

    expect(text.split('\n').slice(0, 4)).toEqual([
      'Run wf_aaaa0001-001 — increment-build-loop, completed',
      'Workarea: shared/demo-programme   Session: 11111111-1111-4111-8111-111111111111',
      'Started 2026-01-01T10:00:00.000Z, ran 8m 20s, stopped: review-failed',
      '4 agents, 25.4k tokens (3.4k output, 13.4k cache read), 4 tool calls'
    ])
  })

  test('marks an agent that started subagents', () => {
    const text = renderRunText(finishedReport())

    expect(text).toContain('ok (+1 subagents)')
  })
})

describe('renderAllRunsText', () => {
  test('says how to fill an empty archive', () => {
    expect(renderAllRunsText({ runs: [], stages: [] })).toBe(
      'No archived runs match. Archive some first: tim build runs archive --all'
    )
  })

  test('lists one line per run', () => {
    const text = renderAllRunsText(
      buildAllRunsReport({ archiveRoot: archivedFixtures() })
    )

    expect(text.split('\n').slice(0, 3)).toEqual([
      '1 run:',
      'run              started           workarea               status     stopped        agents  tokens  time',
      'wf_aaaa0001-001  2026-01-01T10:00  shared/demo-programme  completed  review-failed       4   25.4k  8m 20s'
    ])
  })
})

describe('renderArchiveText', () => {
  test('lists each archived run with what was copied', () => {
    const results = archive()

    expect(renderArchiveText({ results, archiveRoot }).split('\n')).toEqual([
      `Archived 2 runs to ${archiveRoot}:`,
      '  wf_aaaa0001-001  completed   shared/demo-programme  copied 12, unchanged 0',
      '  wf_aaaa0002-002  unfinished  shared/demo-programme  copied 3, unchanged 0'
    ])
  })
})
