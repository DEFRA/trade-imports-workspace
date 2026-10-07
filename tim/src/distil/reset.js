import { existsSync, mkdirSync, renameSync } from 'node:fs'
import { basename, join } from 'node:path'
import { TimError } from '../errors.js'
import {
  extractPartsOf,
  extractPathOf,
  partitionPathOf,
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
