import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { archiveRuns, listRunSources } from './archive.js'
import { buildAllRunsReport, buildRunReport, parseLabel } from './report.js'

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

const archivedFixtures = () => {
  archiveRoot = mkdtempSync(join(tmpdir(), 'tim-build-report-'))
  archiveRuns({ sources: listRunSources(PROJECTS), archiveRoot })
  return archiveRoot
}

const finishedReport = () =>
  buildRunReport({ archiveRoot: archivedFixtures(), runId: FINISHED })

const stageOf = (report, increment, stage) =>
  report.increments
    .find((group) => group.increment === increment)
    .stages.find((group) => group.stage === stage)

describe('parseLabel', () => {
  test.each([
    ['inc-004 plan', { increment: 'inc-004', stage: 'plan' }],
    ['inc-004 review:frontend', { increment: 'inc-004', stage: 'review' }],
    ['inc-004 ci fix 2', { increment: 'inc-004', stage: 'ci fix' }],
    [
      'inc-004 branch-guard:Land',
      { increment: 'inc-004', stage: 'branch-guard' }
    ],
    ['derive next', { increment: '(run)', stage: 'derive next' }],
    [null, { increment: '(run)', stage: 'unlabelled' }]
  ])('reads %s as its increment and stage', (label, expected) => {
    expect(parseLabel(label)).toEqual(expected)
  })
})

describe('buildRunReport', () => {
  test("totals the whole run, counting the planner's own subagent towards it", () => {
    const report = finishedReport()

    expect(report.totals).toMatchObject({
      agents: 4,
      usage: { input: 65, output: 3410, cacheCreation: 8500, cacheRead: 13400 },
      totalTokens: 25375,
      toolUses: 4
    })
  })

  test('groups agents by increment, then by stage', () => {
    const report = finishedReport()

    expect(
      report.increments.map(({ increment, outcome, stages }) => ({
        increment,
        outcome,
        stages: stages.map(({ stage, phase }) => `${phase}/${stage}`)
      }))
    ).toEqual([
      { increment: '(run)', outcome: null, stages: ['Baseline/workspace'] },
      {
        increment: 'inc-001',
        outcome: 'review-failed',
        stages: ['Plan/plan', 'Review/review']
      }
    ])
  })

  test('gives a stage of parallel agents the span of its agents, not the sum', () => {
    const review = stageOf(finishedReport(), 'inc-001', 'review')

    expect(review).toMatchObject({
      totalTokens: 2310,
      wallMs: 120000,
      agentMs: 180000
    })
  })

  test('reports each agent with its model, tokens, tool calls, time and outcome', () => {
    const review = stageOf(finishedReport(), 'inc-001', 'review')

    expect(
      review.agents.map(
        ({ label, model, totalTokens, toolUses, wallMs, outcome }) => ({
          label,
          model,
          totalTokens,
          toolUses,
          wallMs,
          outcome
        })
      )
    ).toEqual([
      {
        label: 'inc-001 review:frontend',
        model: 'claude-sonnet-5-5',
        totalTokens: 1104,
        toolUses: 0,
        wallMs: 60000,
        outcome: 'ok'
      },
      {
        label: 'inc-001 review:backend',
        model: 'claude-sonnet-5-5',
        totalTokens: 1206,
        toolUses: 0,
        wallMs: 120000,
        outcome: 'failed'
      }
    ])
  })

  test("lists an agent's own subagents under it", () => {
    const [planner] = stageOf(finishedReport(), 'inc-001', 'plan').agents

    expect(planner.subagents).toEqual([
      {
        agentId: 'a0000000000000009',
        description: 'Fixture lookup for the planner',
        agentType: 'Explore',
        model: 'claude-sonnet-5-5',
        usage: { input: 5, output: 30, cacheCreation: 100, cacheRead: 100 },
        totalTokens: 235,
        toolUses: 1,
        wallMs: 20000
      }
    ])
  })

  test('ranks the most expensive and the slowest stages', () => {
    const { top } = finishedReport()

    expect({
      byTokens: top.byTokens.map(
        ({ increment, stage }) => `${increment} ${stage}`
      ),
      byTime: top.byTime.map(({ increment, stage }) => `${increment} ${stage}`)
    }).toEqual({
      byTokens: ['inc-001 plan', 'inc-001 review', '(run) workspace'],
      byTime: ['inc-001 plan', 'inc-001 review', '(run) workspace']
    })
  })

  test("keeps the run's own record: status, stop reason, logs and reported totals", () => {
    const { run } = finishedReport()

    expect(run).toMatchObject({
      runId: FINISHED,
      sessionId: SESSION,
      workflowName: 'increment-build-loop',
      workarea: 'shared/demo-programme',
      status: 'completed',
      durationMs: 500000,
      stopped: { reason: 'review-failed' },
      reported: { agentCount: 4, totalTokens: 12050, totalToolCalls: 3 },
      logs: [
        'increment-build-loop: resolved configuration {"workarea":"shared/demo-programme"}',
        'inc-001: REVIEW FAILED — fixture'
      ]
    })
  })

  test('reports a run with no record as unfinished, labelled from its journal', () => {
    const report = buildRunReport({
      archiveRoot: archivedFixtures(),
      runId: UNFINISHED
    })

    expect({
      status: report.run.status,
      agents: report.increments.flatMap(({ stages }) =>
        stages.flatMap(({ agents }) =>
          agents.map(({ label, outcome }) => ({ label, outcome }))
        )
      )
    }).toEqual({
      status: 'unfinished',
      agents: [{ label: 'preflight', outcome: 'unfinished' }]
    })
  })

  test('refuses a run that is not in the archive', () => {
    expect(() =>
      buildRunReport({
        archiveRoot: archivedFixtures(),
        runId: 'wf_missing-000'
      })
    ).toThrow(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message:
          'Run wf_missing-000 is not in the archive. Archive it first: tim build runs archive wf_missing-000'
      })
    )
  })
})

describe('buildAllRunsReport', () => {
  test('reports only build-loop runs by default', () => {
    const report = buildAllRunsReport({ archiveRoot: archivedFixtures() })

    expect(report.runs.map(({ run }) => run.runId)).toEqual([FINISHED])
  })

  test('reports every workflow when asked for all', () => {
    const report = buildAllRunsReport({
      archiveRoot: archivedFixtures(),
      workflow: 'all'
    })

    expect(report.runs.map(({ run }) => run.runId)).toEqual([
      FINISHED,
      UNFINISHED
    ])
  })

  test('reports nothing for a session with no runs', () => {
    const report = buildAllRunsReport({
      archiveRoot: archivedFixtures(),
      sessionId: 'another-session',
      workflow: 'all'
    })

    expect(report).toEqual({ runs: [], stages: [] })
  })

  test('sums each stage across runs, most tokens first', () => {
    const { stages } = buildAllRunsReport({ archiveRoot: archivedFixtures() })

    expect(stages).toEqual([
      {
        phase: 'Plan',
        stage: 'plan',
        occurrences: 1,
        totalTokens: 20770,
        meanTokens: 20770,
        meanWallMs: 300000
      },
      {
        phase: 'Review',
        stage: 'review',
        occurrences: 1,
        totalTokens: 2310,
        meanTokens: 2310,
        meanWallMs: 120000
      },
      {
        phase: 'Baseline',
        stage: 'workspace',
        occurrences: 1,
        totalTokens: 2295,
        meanTokens: 2295,
        meanWallMs: 6000
      }
    ])
  })
})
