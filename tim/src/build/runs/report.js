import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../../errors.js'
import { readIndex } from './archive.js'
import {
  addUsage,
  emptyUsage,
  readJsonLines,
  summariseTranscript,
  totalTokens
} from './transcript.js'

const RUN_LEVEL = '(run)'
const TOP_COUNT = 5
const INCREMENT_LABEL = /^([A-Za-z]+-\d+[A-Za-z0-9]*)\s+(.+)$/

/**
 * Splits an agent label into the increment it worked on and its stage. The
 * build loop labels an increment's agents `<id> <stage>`, with an optional
 * `:<group>` or attempt number after the stage (`inc-004 review:frontend`,
 * `inc-004 ci fix 2`). An agent with no increment id belongs to the run.
 *
 * @param {string|null} label
 * @returns {{increment: string, stage: string}}
 */
export const parseLabel = (label) => {
  const text = (label ?? 'unlabelled').trim()
  const match = text.match(INCREMENT_LABEL)
  const [increment, rest] = match ? [match[1], match[2]] : [RUN_LEVEL, text]
  const stage = rest
    .replace(/:.*$/, '')
    .replace(/\s+\d+$/, '')
    .trim()
  return { increment, stage }
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

const readJsonIfPresent = (path) => (existsSync(path) ? readJson(path) : null)

const listDirectory = (path) => (existsSync(path) ? readdirSync(path) : [])

const agentIdOf = (fileName) =>
  fileName.match(/^agent-([A-Za-z0-9]+)\.jsonl$/)?.[1] ?? null

const journalByAgent = (journal) =>
  journal.reduce((byAgent, line) => {
    if (!line.agentId) return byAgent
    const known = byAgent.get(line.agentId) ?? {}
    return byAgent.set(line.agentId, { ...known, [line.type]: line })
  }, new Map())

const progressByAgent = (run) =>
  new Map(
    (run?.workflowProgress ?? [])
      .filter((item) => item.type === 'workflow_agent' && item.agentId)
      .map((item) => [item.agentId, item])
  )

const outcomeOf = (journalLines, progress) => {
  if (journalLines?.failed) return 'failed'
  if (journalLines?.result) {
    return journalLines.result.result?.ok === false ? 'not ok' : 'ok'
  }
  if (progress?.state === 'done') return 'ok'
  return progress?.state ?? 'unfinished'
}

const nestedAgents = (runDir) => {
  const folder = join(runDir, 'subagents')
  return listDirectory(folder)
    .map(agentIdOf)
    .filter(Boolean)
    .map((agentId) => ({
      agentId,
      meta: readJsonIfPresent(join(folder, `agent-${agentId}.meta.json`)) ?? {},
      summary: summariseTranscript(
        readJsonLines(join(folder, `agent-${agentId}.jsonl`))
      )
    }))
}

const descendantsOf = (agentId, nested) => {
  const children = nested.filter(({ meta }) => meta.parentAgentId === agentId)
  return children.flatMap((child) => [
    child,
    ...descendantsOf(child.agentId, nested)
  ])
}

const subagentRow = ({ agentId, meta, summary }) => ({
  agentId,
  description: meta.description ?? null,
  agentType: meta.agentType ?? null,
  model: summary.model ?? meta.model ?? null,
  usage: summary.usage,
  totalTokens: totalTokens(summary.usage),
  toolUses: summary.toolUses,
  wallMs: summary.wallMs
})

const agentRow = ({ agentId, folder, journal, progress, nested }) => {
  const meta =
    readJsonIfPresent(join(folder, `agent-${agentId}.meta.json`)) ?? {}
  const summary = summariseTranscript(
    readJsonLines(join(folder, `agent-${agentId}.jsonl`))
  )
  const started = journal.get(agentId)?.started
  const label =
    started?.label ?? progress.get(agentId)?.label ?? meta.description ?? null
  const subagents = descendantsOf(agentId, nested).map(subagentRow)
  const usage = subagents.reduce(
    (sum, { usage: childUsage }) => addUsage(sum, childUsage),
    summary.usage
  )
  return {
    agentId,
    label,
    ...parseLabel(label),
    phase:
      started?.phase ??
      progress.get(agentId)?.phaseTitle ??
      meta.workflowPhase ??
      null,
    model: summary.model ?? progress.get(agentId)?.model ?? meta.model ?? null,
    usage,
    totalTokens: totalTokens(usage),
    toolUses:
      summary.toolUses +
      subagents.reduce((sum, child) => sum + child.toolUses, 0),
    requests: summary.requests,
    startedAt: summary.firstAt,
    endedAt: summary.lastAt,
    wallMs: summary.wallMs,
    attempt: progress.get(agentId)?.attempt ?? null,
    outcome: outcomeOf(journal.get(agentId), progress.get(agentId)),
    subagents
  }
}

const sumOf = (rows, pick) => rows.reduce((sum, row) => sum + pick(row), 0)

const spanOf = (rows) => {
  const starts = rows.map((row) => row.startedAt).filter((at) => at !== null)
  const ends = rows.map((row) => row.endedAt).filter((at) => at !== null)
  return starts.length === 0 ? 0 : Math.max(...ends) - Math.min(...starts)
}

const totalsOf = (agents) => {
  const usage = agents.reduce(
    (sum, agent) => addUsage(sum, agent.usage),
    emptyUsage()
  )
  return {
    agents: agents.length,
    usage,
    totalTokens: totalTokens(usage),
    toolUses: sumOf(agents, (agent) => agent.toolUses),
    agentMs: sumOf(agents, (agent) => agent.wallMs),
    wallMs: spanOf(agents)
  }
}

const groupBy = (rows, keyOf) =>
  rows.reduce((groups, row) => {
    const key = keyOf(row)
    return groups.set(key, [...(groups.get(key) ?? []), row])
  }, new Map())

const byStart = (left, right) => (left.startedAt ?? 0) - (right.startedAt ?? 0)

const stagesOf = (agents) =>
  [...groupBy(agents, (agent) => agent.stage).entries()].map(
    ([stage, members]) => ({
      stage,
      phase: members[0].phase,
      ...totalsOf(members),
      agents: members
    })
  )

const incrementsOf = (agents, outcomes) =>
  [...groupBy(agents, (agent) => agent.increment).entries()].map(
    ([increment, members]) => ({
      increment,
      outcome: outcomes.get(increment) ?? null,
      totals: totalsOf(members),
      stages: stagesOf(members)
    })
  )

const stageSummary = (increment) => (stage) => ({
  increment: increment.increment,
  stage: stage.stage,
  phase: stage.phase,
  agents: stage.agents.length,
  totalTokens: stage.totalTokens,
  wallMs: stage.wallMs
})

const topStages = (increments) => {
  const stages = increments.flatMap((increment) =>
    increment.stages.map(stageSummary(increment))
  )
  return {
    byTokens: [...stages]
      .sort((left, right) => right.totalTokens - left.totalTokens)
      .slice(0, TOP_COUNT),
    byTime: [...stages]
      .sort((left, right) => right.wallMs - left.wallMs)
      .slice(0, TOP_COUNT)
  }
}

/**
 * The cost and timing of one archived run, rolled up run → increment →
 * stage → agent. Tokens are summed from every model request in each agent's
 * transcript, with the agent's own subagents counted towards it. Stage and
 * increment wall time is the span from the first agent's start to the last
 * one's end, so parallel agents are not double counted; `agentMs` is the sum.
 *
 * @param {object} args
 * @param {string} args.archiveRoot
 * @param {string} args.runId
 * @returns {object}
 * @throws {TimError} NOT_FOUND when the run is not in the archive
 */
export const buildRunReport = ({ archiveRoot, runId }) => {
  const runDir = join(archiveRoot, 'runs', runId)
  const folder = join(runDir, 'transcripts')
  if (!existsSync(folder)) {
    throw new TimError(
      'NOT_FOUND',
      `Run ${runId} is not in the archive. Archive it first: tim build runs archive ${runId}`
    )
  }
  const run = readJsonIfPresent(join(runDir, 'run.json'))
  const journalPath = join(folder, 'journal.jsonl')
  const journal = journalByAgent(
    existsSync(journalPath) ? readJsonLines(journalPath) : []
  )
  const progress = progressByAgent(run)
  const nested = nestedAgents(runDir)
  const agents = listDirectory(folder)
    .map(agentIdOf)
    .filter(Boolean)
    .map((agentId) => agentRow({ agentId, folder, journal, progress, nested }))
    .sort(byStart)
  const outcomes = new Map(
    (run?.result?.increments ?? []).map(({ id, outcome }) => [id, outcome])
  )
  const increments = incrementsOf(agents, outcomes)
  const entry = readIndex(archiveRoot).runs[runId] ?? {}
  return {
    run: {
      runId,
      sessionId: entry.sessionId ?? null,
      workflowName: run?.workflowName ?? entry.workflowName ?? null,
      workarea: entry.workarea ?? null,
      status: run?.status ?? 'unfinished',
      startedAt: entry.startedAt ?? null,
      endedAt: entry.endedAt ?? null,
      durationMs: run?.durationMs ?? entry.durationMs ?? null,
      stopped: run?.result?.stopped ?? null,
      reported: run
        ? {
            agentCount: run.agentCount ?? null,
            totalTokens: run.totalTokens ?? null,
            totalToolCalls: run.totalToolCalls ?? null
          }
        : null,
      logs: run?.logs ?? []
    },
    totals: totalsOf(agents),
    increments,
    top: topStages(increments)
  }
}

const matchesFilters =
  ({ sessionId, workflow }) =>
  (entry) =>
    (sessionId === undefined || entry.sessionId === sessionId) &&
    (workflow === 'all' || entry.workflowName === workflow)

const stageAggregate = ([key, members]) => {
  const [phase, stage] = key.split('\u0000')
  const tokens = sumOf(members, (member) => member.totalTokens)
  const wall = sumOf(members, (member) => member.wallMs)
  return {
    phase: phase || null,
    stage,
    occurrences: members.length,
    totalTokens: tokens,
    meanTokens: Math.round(tokens / members.length),
    meanWallMs: Math.round(wall / members.length)
  }
}

/**
 * Reports on every archived run that matches the filters, plus each stage's
 * figures across all of them — the view for finding which stages cost most
 * over time.
 *
 * @param {object} args
 * @param {string} args.archiveRoot
 * @param {string} [args.sessionId]
 * @param {string} [args.workflow='increment-build-loop'] - A workflow name, or `all`
 * @returns {{runs: object[], stages: object[]}}
 */
export const buildAllRunsReport = ({
  archiveRoot,
  sessionId,
  workflow = 'increment-build-loop'
}) => {
  const entries = Object.values(readIndex(archiveRoot).runs)
    .filter(matchesFilters({ sessionId, workflow }))
    .sort((left, right) =>
      (left.startedAt ?? '').localeCompare(right.startedAt ?? '')
    )
  const runs = entries.map(({ runId }) =>
    buildRunReport({ archiveRoot, runId })
  )
  const stageRows = runs.flatMap(({ increments }) =>
    increments.flatMap((increment) =>
      increment.stages.map(stageSummary(increment))
    )
  )
  const stages = [
    ...groupBy(
      stageRows,
      (row) => `${row.phase ?? ''}\u0000${row.stage}`
    ).entries()
  ]
    .map(stageAggregate)
    .sort((left, right) => right.totalTokens - left.totalTokens)
  return { runs, stages }
}
