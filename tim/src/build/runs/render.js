const THOUSAND = 1000
const MILLION = 1000000
const SECOND_MS = 1000
const MINUTE_S = 60
const HOUR_S = 3600

/**
 * A token count short enough for a table cell: 950, 41.2k, 3.40M.
 *
 * @param {number} count
 * @returns {string}
 */
export const formatTokens = (count) => {
  if (count >= MILLION) return `${(count / MILLION).toFixed(2)}M`
  if (count >= THOUSAND) return `${(count / THOUSAND).toFixed(1)}k`
  return String(count)
}

const twoDigits = (value) => String(value).padStart(2, '0')

/**
 * A duration as hours, minutes and seconds: 7s, 4m 05s, 1h 02m.
 *
 * @param {number|null} ms
 * @returns {string}
 */
export const formatDuration = (ms) => {
  if (ms === null || ms === undefined) return '-'
  const seconds = Math.round(ms / SECOND_MS)
  if (seconds < MINUTE_S) return `${seconds}s`
  if (seconds < HOUR_S) {
    return `${Math.floor(seconds / MINUTE_S)}m ${twoDigits(seconds % MINUTE_S)}s`
  }
  return `${Math.floor(seconds / HOUR_S)}h ${twoDigits(Math.floor((seconds % HOUR_S) / MINUTE_S))}m`
}

const shortModel = (model) =>
  model ? model.replace(/^claude-/, '').replace(/-\d{8}$/, '') : '-'

const isNumeric = (cell) => /^[\d.]+[kM]?$|^\d+[hms]/.test(cell)

/**
 * Lines of a plain-text table with each column padded to its widest cell.
 * Numbers line up on the right.
 *
 * @param {string[]} headings
 * @param {string[][]} rows
 * @returns {string[]}
 */
export const renderTable = (headings, rows) => {
  const widths = headings.map((heading, column) =>
    Math.max(heading.length, ...rows.map((row) => row[column].length))
  )
  const line = (cells) =>
    cells
      .map((cell, column) =>
        isNumeric(cell) && column > 0
          ? cell.padStart(widths[column])
          : cell.padEnd(widths[column])
      )
      .join('  ')
      .trimEnd()
  return [line(headings), ...rows.map(line)]
}

const AGENT_HEADINGS = [
  'agent',
  'model',
  'input',
  'output',
  'cache write',
  'cache read',
  'total',
  'tools',
  'time',
  'outcome'
]

const agentCells = (agent) => [
  `  ${agent.label ?? agent.agentId}`,
  shortModel(agent.model),
  formatTokens(agent.usage.input),
  formatTokens(agent.usage.output),
  formatTokens(agent.usage.cacheCreation),
  formatTokens(agent.usage.cacheRead),
  formatTokens(agent.totalTokens),
  String(agent.toolUses),
  formatDuration(agent.wallMs),
  agent.subagents.length > 0
    ? `${agent.outcome} (+${agent.subagents.length} subagents)`
    : agent.outcome
]

const stageCells = (stage) => [
  `${stage.phase ?? '-'} / ${stage.stage}`,
  '',
  formatTokens(stage.usage.input),
  formatTokens(stage.usage.output),
  formatTokens(stage.usage.cacheCreation),
  formatTokens(stage.usage.cacheRead),
  formatTokens(stage.totalTokens),
  String(stage.toolUses),
  formatDuration(stage.wallMs),
  `${stage.agents.length} agent${stage.agents.length === 1 ? '' : 's'}`
]

const incrementBlock = (increment) => [
  '',
  `${increment.increment}${increment.outcome ? ` — ${increment.outcome}` : ''}: ${formatTokens(increment.totals.totalTokens)} tokens, ${formatDuration(increment.totals.wallMs)}`,
  ...renderTable(
    AGENT_HEADINGS,
    increment.stages.flatMap((stage) => [
      stageCells(stage),
      ...stage.agents.map(agentCells)
    ])
  )
]

const topCells = (stage) => [
  `${stage.increment} ${stage.stage}`,
  stage.phase ?? '-',
  formatTokens(stage.totalTokens),
  formatDuration(stage.wallMs)
]

const runHeader = ({ run, totals }) => [
  `Run ${run.runId} — ${run.workflowName ?? 'unknown workflow'}, ${run.status}`,
  `Workarea: ${run.workarea ?? '-'}   Session: ${run.sessionId ?? '-'}`,
  `Started ${run.startedAt ?? '-'}, ran ${formatDuration(run.durationMs)}${run.stopped ? `, stopped: ${run.stopped.reason}` : ''}`,
  `${totals.agents} agents, ${formatTokens(totals.totalTokens)} tokens (${formatTokens(totals.usage.output)} output, ${formatTokens(totals.usage.cacheRead)} cache read), ${totals.toolUses} tool calls`
]

/**
 * The plain-text report of one run.
 *
 * @param {object} report - From `buildRunReport`
 * @returns {string}
 */
export const renderRunText = (report) =>
  [
    ...runHeader(report),
    ...report.increments.flatMap(incrementBlock),
    '',
    'Most tokens:',
    ...renderTable(
      ['stage', 'phase', 'tokens', 'time'],
      report.top.byTokens.map(topCells)
    ),
    '',
    'Longest:',
    ...renderTable(
      ['stage', 'phase', 'tokens', 'time'],
      report.top.byTime.map(topCells)
    )
  ].join('\n')

const runSummaryCells = ({ run, totals }) => [
  run.runId,
  run.startedAt?.slice(0, 16) ?? '-',
  run.workarea ?? '-',
  run.status,
  run.stopped?.reason ?? '-',
  String(totals.agents),
  formatTokens(totals.totalTokens),
  formatDuration(run.durationMs)
]

const stageAggregateCells = (stage) => [
  stage.stage,
  stage.phase ?? '-',
  String(stage.occurrences),
  formatTokens(stage.totalTokens),
  formatTokens(stage.meanTokens),
  formatDuration(stage.meanWallMs)
]

/**
 * The plain-text report across many runs: one line per run, then each
 * stage's figures over all of them.
 *
 * @param {{runs: object[], stages: object[]}} report - From `buildAllRunsReport`
 * @returns {string}
 */
export const renderAllRunsText = ({ runs, stages }) =>
  runs.length === 0
    ? 'No archived runs match. Archive some first: tim build runs archive --all'
    : [
        `${runs.length} run${runs.length === 1 ? '' : 's'}:`,
        ...renderTable(
          [
            'run',
            'started',
            'workarea',
            'status',
            'stopped',
            'agents',
            'tokens',
            'time'
          ],
          runs.map(runSummaryCells)
        ),
        '',
        'Stages across these runs, most tokens first:',
        ...renderTable(
          ['stage', 'phase', 'times', 'tokens', 'mean tokens', 'mean time'],
          stages.map(stageAggregateCells)
        )
      ].join('\n')

const archiveLine = ({ runId, copied, unchanged, entry }) =>
  `  ${runId}  ${entry.status.padEnd(10)}  ${entry.workarea ?? '-'}  copied ${copied}, unchanged ${unchanged}`

/**
 * The plain-text report of an archive.
 *
 * @param {object} args
 * @param {object[]} args.results - From `archiveRuns`
 * @param {string} args.archiveRoot
 * @returns {string}
 */
export const renderArchiveText = ({ results, archiveRoot }) =>
  [
    `Archived ${results.length} run${results.length === 1 ? '' : 's'} to ${archiveRoot}:`,
    ...results.map(archiveLine)
  ].join('\n')
