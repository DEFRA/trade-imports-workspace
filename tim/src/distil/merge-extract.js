import { TimError } from '../errors.js'
import { writeJsonAtomic } from '../backlog/io.js'
import { extractPathOf, readJsonLenient, scopeHashOf, slugOf } from './files.js'
import {
  claimOwnersOf,
  extractReadsOf,
  inspectExtractParts,
  mergedExtractOf,
  readSources
} from './checks.js'
import { partRangesOf, partitionLabelOf } from './partition.js'
import { problemsError } from './problems.js'

const findSource = (layout, sources, sourceId) => {
  const source = sources.sources.find((candidate) => candidate.id === sourceId)
  if (!source) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find source ${sourceId} in ${layout.sources}.`
    )
  }
  return source
}

/**
 * Join one source's extract part files into its one extract, once the
 * partition and every part it names are in shape, no claim id is in two
 * parts and none clashes with another source's. The extract takes the
 * partition's structure and each part's, every claim in part order, and the
 * source's scope hash, so it counts as made for the source as sources.json
 * describes it now. The parts and the partition stay, so `check --stage
 * extract` can show the extract is still its parts merged. On any problem
 * nothing is written.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.schemas - From `loadDistilSchemas`
 * @param {string} args.workarea
 * @param {string} args.sourceId
 * @returns {{source: string, path: string, replaced: boolean, scopeHash: string, claims: number, parts: {part: number, title: string, claims: number, from: string|null, to: string|null}[]}}
 * @throws {TimError} NOT_FOUND for an unknown source or no partition, LINT with every problem
 */
export const mergeExtractParts = ({ layout, schemas, workarea, sourceId }) => {
  const sources = readSources(layout, schemas.sources)
  const source = findSource(layout, sources, sourceId)
  const slug = slugOf(source.id)
  const inspected = inspectExtractParts({
    layout,
    schemas,
    source,
    claimOwners: claimOwnersOf(extractReadsOf(layout, sources))
  })
  if (!inspected.exists) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find ${partitionLabelOf(slug)}. The characterise step writes it, then one extract agent per part writes ${slug}.part1.json, ${slug}.part2.json and so on.`
    )
  }
  if (inspected.problems.length) {
    throw problemsError(
      [...new Set(inspected.problems)],
      `merging ${source.id}'s extract parts in ${workarea}. Nothing was written and the parts are kept`
    )
  }
  const path = extractPathOf(layout, slug)
  const replaced = readJsonLenient(path).exists
  const scopeHash = scopeHashOf(source)
  const { structure, claims } = mergedExtractOf(inspected)
  writeJsonAtomic(path, { source: source.id, structure, scopeHash, claims })
  return {
    source: source.id,
    path,
    replaced,
    scopeHash,
    claims: claims.length,
    parts: partRangesOf(inspected.parts)
  }
}
