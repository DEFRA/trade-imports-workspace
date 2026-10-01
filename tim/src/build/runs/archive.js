import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  utimesSync,
  writeFileSync
} from 'node:fs'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { TimError } from '../../errors.js'
import { firstPromptText, readJsonLines } from './transcript.js'

const INDEX_SCHEMA_VERSION = 1
const RUN_ID = /^wf_[A-Za-z0-9-]+$/
const MTIME_TOLERANCE_MS = 1
const BACKLOG_PATH = /workareas\/([A-Za-z0-9._/-]+?)\/backlog\.json/

/**
 * Where the archive lives: under `workareas/`, which git ignores, and outside
 * `~/.claude`, whose session folders Claude Code deletes after
 * `cleanupPeriodDays` (30 days unless set).
 *
 * @param {string} workspaceRoot
 * @returns {string}
 */
export const archiveRootFor = (workspaceRoot) =>
  join(workspaceRoot, 'workareas', 'build-telemetry')

/**
 * The folder Claude Code keeps this workspace's session transcripts in:
 * `<config>/projects/<the workspace path with every other character than a
 * letter or digit turned into a dash>`.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.configDir] - Claude Code's config folder, `~/.claude` unless `CLAUDE_CONFIG_DIR` says otherwise
 * @returns {string}
 */
export const claudeProjectsDirFor = ({
  workspaceRoot,
  configDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')
}) => join(configDir, 'projects', workspaceRoot.replace(/[^A-Za-z0-9]/g, '-'))

const isDirectory = (path) => {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

const listDirectory = (path) => (isDirectory(path) ? readdirSync(path) : [])

const sourceFor = (sessionDir, runId) => ({
  runId,
  sessionId: basename(sessionDir),
  sessionDir,
  transcriptDir: join(sessionDir, 'subagents', 'workflows', runId),
  runFile: join(sessionDir, 'workflows', `${runId}.json`)
})

const runsInSession = (sessionDir) =>
  listDirectory(join(sessionDir, 'subagents', 'workflows'))
    .filter((name) => RUN_ID.test(name))
    .map((runId) => sourceFor(sessionDir, runId))

/**
 * Every workflow run Claude Code has kept a transcript folder for.
 *
 * @param {string} projectsDir
 * @returns {{runId: string, sessionId: string, sessionDir: string, transcriptDir: string, runFile: string}[]}
 */
export const listRunSources = (projectsDir) =>
  listDirectory(projectsDir)
    .map((name) => join(projectsDir, name))
    .filter(isDirectory)
    .flatMap(runsInSession)

const looksLikePath = (reference) =>
  isAbsolute(reference) || reference.includes('/') || reference.startsWith('~')

const expandHome = (path) =>
  path.startsWith('~') ? join(homedir(), path.slice(1)) : path

const sourceFromPath = (reference) => {
  const transcriptDir = resolve(expandHome(reference))
  const runId = basename(transcriptDir)
  if (!RUN_ID.test(runId) || !isDirectory(transcriptDir)) {
    throw new TimError(
      'NOT_FOUND',
      `Cannot find a workflow run folder at ${transcriptDir}. Give a run id such as wf_850da050-87a, or a folder under <session>/subagents/workflows/.`
    )
  }
  return sourceFor(dirname(dirname(dirname(transcriptDir))), runId)
}

const withRunPrefix = (reference) =>
  reference.startsWith('wf_') ? reference : `wf_${reference}`

/**
 * Finds one run's source folders from a run id (with or without its `wf_`
 * prefix) or from the path of its transcript folder.
 *
 * @param {string} projectsDir
 * @param {string} reference
 * @returns {{runId: string, sessionId: string, sessionDir: string, transcriptDir: string, runFile: string}}
 * @throws {TimError} NOT_FOUND when no such run exists
 */
export const resolveRunSource = (projectsDir, reference) => {
  if (looksLikePath(reference)) return sourceFromPath(reference)
  const runId = withRunPrefix(reference)
  const found = listRunSources(projectsDir).find(
    (source) => source.runId === runId
  )
  if (!found) {
    throw new TimError(
      'NOT_FOUND',
      `Cannot find run ${runId} under ${projectsDir}.`
    )
  }
  return found
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

const readJsonIfPresent = (path) => (existsSync(path) ? readJson(path) : null)

const agentIdOf = (fileName) =>
  fileName.match(/^agent-([A-Za-z0-9]+)\.jsonl$/)?.[1] ?? null

const runAgentIds = (transcriptDir) =>
  listDirectory(transcriptDir).map(agentIdOf).filter(Boolean)

const sessionChildren = (sessionDir) =>
  listDirectory(join(sessionDir, 'subagents'))
    .filter((name) => name.endsWith('.meta.json'))
    .map((name) => ({
      agentId: name.replace(/^agent-/, '').replace(/\.meta\.json$/, ''),
      parentAgentId: readJson(join(sessionDir, 'subagents', name)).parentAgentId
    }))
    .filter(({ parentAgentId }) => parentAgentId)

// An agent inside a workflow can start its own subagents. Claude Code keeps
// those beside the session's other subagents, not in the run's folder, with
// the parent's id in their meta file.
const descendantsOf = (rootIds, children) => {
  const found = new Set()
  let frontier = new Set(rootIds)
  while (frontier.size > 0) {
    const next = children
      .filter(({ parentAgentId }) => frontier.has(parentAgentId))
      .map(({ agentId }) => agentId)
      .filter((agentId) => !found.has(agentId))
    next.forEach((agentId) => found.add(agentId))
    frontier = new Set(next)
  }
  return [...found]
}

const nestedSubagentFiles = (source) =>
  descendantsOf(
    runAgentIds(source.transcriptDir),
    sessionChildren(source.sessionDir)
  ).flatMap((agentId) =>
    [`agent-${agentId}.jsonl`, `agent-${agentId}.meta.json`]
      .map((name) => join(source.sessionDir, 'subagents', name))
      .filter(existsSync)
      .map((from) => ({ from, to: join('subagents', basename(from)) }))
  )

const filesToCopy = (source) => [
  ...listDirectory(source.transcriptDir)
    .map((name) => join(source.transcriptDir, name))
    .filter((path) => !isDirectory(path))
    .map((from) => ({ from, to: join('transcripts', basename(from)) })),
  ...(existsSync(source.runFile)
    ? [{ from: source.runFile, to: 'run.json' }]
    : []),
  ...nestedSubagentFiles(source)
]

const isUnchanged = (from, to) => {
  if (!existsSync(to)) return false
  const source = statSync(from)
  const copy = statSync(to)
  return (
    source.size === copy.size &&
    Math.abs(source.mtimeMs - copy.mtimeMs) < MTIME_TOLERANCE_MS
  )
}

// Copies a file only when the copy is missing or differs, and gives the copy
// the source's modified time (utimes keeps it to within a millisecond), so a second archive of an unchanged run copies
// nothing and a run archived mid-flight picks up what has grown since.
const copyIfChanged = ({ from, to }) => {
  if (isUnchanged(from, to)) return false
  mkdirSync(dirname(to), { recursive: true })
  copyFileSync(from, to)
  const { atime, mtime } = statSync(from)
  utimesSync(to, atime, mtime)
  return true
}

const toIso = (time) =>
  Number.isFinite(time) ? new Date(time).toISOString() : null

const workareaFromPrompts = (transcriptDir) =>
  listDirectory(transcriptDir)
    .filter((name) => agentIdOf(name))
    .map((name) =>
      firstPromptText(readJsonLines(join(transcriptDir, name))).match(
        BACKLOG_PATH
      )
    )
    .find(Boolean)?.[1] ?? null

const latestModified = (paths) =>
  Math.max(...paths.map((path) => statSync(path).mtimeMs))

const earliestTimestamp = (transcriptDir) => {
  const times = listDirectory(transcriptDir)
    .filter((name) => agentIdOf(name))
    .map((name) => readJsonLines(join(transcriptDir, name))[0]?.timestamp)
    .map((timestamp) => Date.parse(timestamp))
    .filter(Number.isFinite)
  return times.length > 0 ? Math.min(...times) : null
}

const unfinishedTiming = (transcriptDir) => {
  const files = listDirectory(transcriptDir).map((name) =>
    join(transcriptDir, name)
  )
  const startedAt = earliestTimestamp(transcriptDir)
  const endedAt = files.length > 0 ? latestModified(files) : null
  return {
    startedAt,
    endedAt,
    durationMs:
      startedAt !== null && endedAt !== null ? endedAt - startedAt : null
  }
}

const finishedTiming = (run) => ({
  startedAt: run.startTime ?? null,
  endedAt:
    run.startTime !== undefined && run.durationMs !== undefined
      ? run.startTime + run.durationMs
      : null,
  durationMs: run.durationMs ?? null
})

const outcomesOf = (run) =>
  Array.isArray(run?.result?.increments)
    ? run.result.increments.map(({ id, outcome }) => ({ id, outcome }))
    : []

/**
 * The index entry for one run, from its archived copy: what it ran, over
 * which workarea, when, and how it ended. A run with no `run.json` has not
 * finished (or was archived while still running), so its status is
 * `unfinished` and its times come from the transcripts.
 *
 * @param {object} args
 * @param {string} args.runDir - The run's folder in the archive
 * @param {{runId: string, sessionId: string, transcriptDir: string}} args.source
 * @returns {object}
 */
export const indexEntryFor = ({ runDir, source }) => {
  const run = readJsonIfPresent(join(runDir, 'run.json'))
  const transcripts = join(runDir, 'transcripts')
  const timing = run ? finishedTiming(run) : unfinishedTiming(transcripts)
  return {
    runId: source.runId,
    sessionId: source.sessionId,
    workflowName: run?.workflowName ?? null,
    workarea:
      (typeof run?.args?.workarea === 'string' ? run.args.workarea : null) ??
      workareaFromPrompts(transcripts),
    status: run?.status ?? 'unfinished',
    startedAt: toIso(timing.startedAt),
    endedAt: toIso(timing.endedAt),
    durationMs: timing.durationMs,
    agentCount: runAgentIds(transcripts).length,
    stopReason: run?.result?.stopped?.reason ?? null,
    increments: outcomesOf(run),
    source: source.transcriptDir
  }
}

const indexPathFor = (archiveRoot) => join(archiveRoot, 'index.json')

/**
 * The archive's index: one entry per archived run, keyed by run id.
 *
 * @param {string} archiveRoot
 * @returns {{schemaVersion: number, runs: Record<string, object>}}
 */
export const readIndex = (archiveRoot) =>
  readJsonIfPresent(indexPathFor(archiveRoot)) ?? {
    schemaVersion: INDEX_SCHEMA_VERSION,
    runs: {}
  }

const writeIndex = (archiveRoot, index) => {
  mkdirSync(archiveRoot, { recursive: true })
  const path = indexPathFor(archiveRoot)
  const draft = `${path}.tmp`
  writeFileSync(draft, `${JSON.stringify(index, null, 2)}\n`)
  renameSync(draft, path)
}

const archiveOne = (source, archiveRoot, archivedAt) => {
  const runDir = join(archiveRoot, 'runs', source.runId)
  const copies = filesToCopy(source).map(({ from, to }) =>
    copyIfChanged({ from, to: join(runDir, to) })
  )
  const copied = copies.filter(Boolean).length
  return {
    runId: source.runId,
    sessionId: source.sessionId,
    runDir,
    copied,
    unchanged: copies.length - copied,
    entry: { ...indexEntryFor({ runDir, source }), archivedAt }
  }
}

const mergeIntoIndex = (archiveRoot, results) => {
  const index = readIndex(archiveRoot)
  const runs = results.reduce(
    (merged, { runId, entry }) => ({
      ...merged,
      [runId]: {
        ...entry,
        archivedAt: merged[runId]?.archivedAt ?? entry.archivedAt,
        refreshedAt: entry.archivedAt
      }
    }),
    index.runs
  )
  writeIndex(archiveRoot, { schemaVersion: INDEX_SCHEMA_VERSION, runs })
}

/**
 * Copies workflow runs' transcripts into the archive and records each in the
 * index. Only reads the sources: nothing under `~/.claude` is moved or
 * deleted. Copying again is safe — a file that has not changed is skipped.
 *
 * @param {object} args
 * @param {object[]} args.sources - From `resolveRunSource` or `listRunSources`
 * @param {string} args.archiveRoot
 * @param {Date} [args.now]
 * @returns {{runId: string, sessionId: string, runDir: string, copied: number, unchanged: number, entry: object}[]}
 */
export const archiveRuns = ({ sources, archiveRoot, now = new Date() }) => {
  const archivedAt = now.toISOString()
  const results = sources.map((source) =>
    archiveOne(source, archiveRoot, archivedAt)
  )
  mergeIntoIndex(archiveRoot, results)
  return results
}
