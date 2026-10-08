import { existsSync, mkdirSync, readdirSync, renameSync } from 'node:fs'
import { basename, join } from 'node:path'
import { TimError } from '../errors.js'
import {
  extractPartsOf,
  extractPathOf,
  partitionPathOf,
  readJsonLenient,
  slugOf,
  verifyPartsOf,
  verifyPathOf
} from './files.js'
import { readSources } from './checks.js'

/**
 * The folder name a reset at `now` moves files into: the time in UTC, with
 * the colons and dot a file name cannot always hold turned into hyphens.
 *
 * @param {Date} now
 * @returns {string} Such as `2026-10-07T18-20-52-123Z`
 */
export const supersededStampOf = (now) =>
  now.toISOString().replace(/[:.]/g, '-')

const chosenSources = (layout, sources, sourceIds, all) => {
  if (all) return sources.sources
  const unknown = sourceIds.filter(
    (id) => !sources.sources.some((source) => source.id === id)
  )
  if (unknown.length) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find ${unknown.join(', ')} in ${layout.sources}. Its sources are ${sources.sources.map((source) => source.id).join(', ')}.`
    )
  }
  return sources.sources.filter((source) => sourceIds.includes(source.id))
}

const extractFilesOf = (layout, slug) =>
  [
    extractPathOf(layout, slug),
    partitionPathOf(layout, slug),
    ...extractPartsOf(layout, slug).map((part) => part.path)
  ].filter((path) => existsSync(path))

const verifyFilesOf = (layout, slug) =>
  [
    verifyPathOf(layout, slug),
    ...verifyPartsOf(layout, slug).map((part) => part.path)
  ].filter((path) => existsSync(path))

const moveInto = (folder, paths) =>
  paths.map((from) => {
    mkdirSync(folder, { recursive: true })
    const to = join(folder, basename(from))
    renameSync(from, to)
    return { from, to }
  })

/**
 * Set sources back to pending, so the next distil launch extracts and
 * verifies them again even though their scope has not changed: for when the
 * extract method has changed. Each source's extract, partition, extract
 * parts, verification and verify parts move to
 * `distil/superseded/<time>/extract/` and `.../verify/`, so nothing is lost.
 * The source's working folder stays where it is.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.schemas - From `loadDistilSchemas`
 * @param {string[]} [args.sourceIds] - The sources to reset
 * @param {boolean} [args.all] - Reset every source in sources.json instead
 * @param {Date} [args.now] - When the reset happens, which names its folder
 * @returns {{superseded: string|null, moved: number, sources: {id: string, slug: string, moved: {from: string, to: string}[]}[]}}
 * @throws {TimError} USAGE with no source named or both kinds of choice, NOT_FOUND for an unknown source, USAGE when the folder for this time already exists
 */
export const resetSources = ({
  layout,
  schemas,
  sourceIds = [],
  all = false,
  now = new Date()
}) => {
  if (all === sourceIds.length > 0) {
    throw new TimError(
      'USAGE',
      'Name the sources to reset with --source, once for each, or reset every source with --all. Not both.'
    )
  }
  const sources = readSources(layout, schemas.sources)
  const chosen = chosenSources(layout, sources, sourceIds, all)
  const superseded = join(layout.supersededDir, supersededStampOf(now))
  if (existsSync(superseded)) {
    throw new TimError(
      'USAGE',
      `${superseded} already exists. Run the reset again.`
    )
  }
  const reset = chosen.map((source) => {
    const slug = slugOf(source.id)
    return {
      id: source.id,
      slug,
      moved: [
        ...moveInto(join(superseded, 'extract'), extractFilesOf(layout, slug)),
        ...moveInto(join(superseded, 'verify'), verifyFilesOf(layout, slug))
      ]
    }
  })
  const moved = reset.reduce((total, source) => total + source.moved.length, 0)
  return { superseded: moved ? superseded : null, moved, sources: reset }
}

const SNAPSHOT_FILE = /^backlog-snapshot\..+\.json$/

// A row with build state on it: built, parked with work behind it, or
// carrying a commit, branch or pull request the build loop wrote.
const BUILT_STATUSES = new Set(['done', 'deferred'])
const isBuiltRow = (row) =>
  BUILT_STATUSES.has(row?.status) ||
  Boolean(row?.commit) ||
  Boolean(row?.branch) ||
  (Array.isArray(row?.prs) && row.prs.length > 0)

const builtRowsOf = (layout) => {
  const read = readJsonLenient(layout.backlog)
  return Array.isArray(read.value?.increments)
    ? read.value.increments.filter(isBuiltRow).map((row) => row.id)
    : []
}

const reconcileFilesOf = (layout) => {
  const distilDir = join(layout.dir, 'distil')
  const snapshots = existsSync(distilDir)
    ? readdirSync(distilDir)
        .filter((name) => SNAPSHOT_FILE.test(name))
        .map((name) => join(distilDir, name))
    : []
  return [
    layout.requirements,
    layout.conflicts,
    layout.workingSet,
    layout.areas,
    layout.areasDir,
    layout.challengeDir,
    ...snapshots,
    layout.backlog,
    layout.report
  ].filter((path) => existsSync(path))
}

/**
 * Start reconcile afresh while keeping every verified extract: move
 * requirements.json, conflicts.json, the working sets, the area plan and
 * every area's files, the challenge verdicts, the backlog snapshots,
 * backlog.json and report.md to `distil/superseded/<time>/reconcile/`. The
 * next launch skips every verified source and reconciles from nothing, so
 * new requirement, conflict and row ids start again from 001.
 *
 * For after a change to the reconcile or consolidate method. A normal
 * re-distil keeps every id and needs no reset. Refuses when the backlog has
 * a built row, because a fresh backlog would lose its ids.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {Date} [args.now] - When the reset happens, which names its folder
 * @returns {{superseded: string|null, moved: {from: string, to: string}[]}}
 * @throws {TimError} USAGE when the backlog has built rows or the folder for this time already exists
 */
export const resetReconcile = ({ layout, now = new Date() }) => {
  const built = builtRowsOf(layout)
  if (built.length) {
    throw new TimError(
      'USAGE',
      `backlog.json has rows with build work on them: ${built.join(', ')}. A reconcile reset starts the backlog again and would lose their ids. Re-distil without a reset instead: it keeps every id and never changes a built row.`
    )
  }
  const superseded = join(layout.supersededDir, supersededStampOf(now))
  if (existsSync(superseded)) {
    throw new TimError(
      'USAGE',
      `${superseded} already exists. Run the reset again.`
    )
  }
  const moved = moveInto(
    join(superseded, 'reconcile'),
    reconcileFilesOf(layout)
  )
  return { superseded: moved.length ? superseded : null, moved }
}
