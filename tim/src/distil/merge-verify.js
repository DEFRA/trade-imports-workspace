import { unlinkSync } from 'node:fs'
import { TimError } from '../errors.js'
import { writeJsonAtomic } from '../backlog/io.js'
import {
  DISTIL_SCHEMA_FILES,
  claimsHashOf,
  readJsonLenient,
  slugOf,
  verifyPartsOf,
  verifyPathOf
} from './files.js'
import { inspectSources, readSources, verifyCheck } from './checks.js'
import { problemsError, schemaProblems } from './problems.js'

const partLabelOf = (slug, part) => `distil/verify/${slug}.part${part}.json`

const readPart = ({ slug, part, path, source, schema }) => {
  const label = partLabelOf(slug, part)
  const read = readJsonLenient(path)
  if (read.error) return { problems: [`${label} ${read.error}`] }
  const problems = [
    ...schemaProblems({
      label,
      value: read.value,
      schema,
      schemaName: DISTIL_SCHEMA_FILES.verify
    }),
    ...(read.value?.source === source.id
      ? []
      : [
          `${label} says it is from ${JSON.stringify(read.value?.source)}, not ${source.id}.`
        ])
  ]
  return { problems, value: read.value }
}

const inClaimOrder = (claims, verdicts) => {
  const position = new Map(claims.map((claim, index) => [claim.id, index]))
  const rank = (verdict) => position.get(verdict.id) ?? claims.length
  return verdicts.toSorted((left, right) => rank(left) - rank(right))
}

const findEntry = ({ layout, schemas, workarea, sourceId }) => {
  const sources = readSources(layout, schemas.sources)
  const entry = inspectSources({ layout, schemas, sources, workarea }).find(
    (candidate) => candidate.source.id === sourceId
  )
  if (!entry) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find source ${sourceId} in ${layout.sources}.`
    )
  }
  return entry
}

/**
 * Join one source's verify part files into its one verify file, once every
 * part is in shape and together they give each claim in the extract exactly
 * one verdict. The file records the hash of the extract it judged, so a later
 * change to the extract makes it stale. Only then are the parts removed; on
 * any problem nothing is written and the parts stay for the retry.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.schemas - From `loadDistilSchemas`
 * @param {string} args.workarea
 * @param {string} args.sourceId
 * @returns {{source: string, path: string, parts: string[], replaced: boolean, extractHash: string, verdicts: number, held: number, refuted: number, missed: number}}
 * @throws {TimError} NOT_FOUND with no parts or an unknown source, LINT with every problem
 */
export const mergeVerifyParts = ({ layout, schemas, workarea, sourceId }) => {
  const entry = findEntry({ layout, schemas, workarea, sourceId })
  const { source } = entry
  const slug = slugOf(source.id)
  const parts = verifyPartsOf(layout, slug)
  if (!parts.length) {
    throw new TimError(
      'NOT_FOUND',
      `No verify part files for ${source.id}. Each verify agent writes distil/verify/${slug}.part1.json, ${slug}.part2.json and so on.`
    )
  }
  if (!entry.extract) {
    throw new TimError(
      'LINT',
      `distil/extract/${slug}.json is missing or out of shape, so its verify parts cannot be merged. Run: tim distil check ${workarea} --source ${source.id} --stage extract`
    )
  }
  const read = parts.map((part) =>
    readPart({ slug, ...part, source, schema: schemas.verify })
  )
  const readProblems = read.flatMap((part) => part.problems)
  const merged = {
    source: source.id,
    extractHash: claimsHashOf(entry.extract.claims),
    verdicts: inClaimOrder(
      entry.extract.claims,
      read.flatMap((part) => part.value?.verdicts ?? [])
    ),
    missed: read.flatMap((part) => part.value?.missed ?? [])
  }
  const check = verifyCheck({
    source,
    extract: entry.extract,
    value: merged,
    schema: null,
    workarea,
    label: `The merged verification of ${source.id}`
  })
  const problems = [...new Set([...readProblems, ...check.problems])]
  if (problems.length) {
    throw problemsError(
      problems,
      `merging ${source.id}'s verify parts. Nothing was written and the parts are kept`
    )
  }
  const path = verifyPathOf(layout, slug)
  const replaced = readJsonLenient(path).exists
  writeJsonAtomic(path, merged)
  for (const part of parts) unlinkSync(part.path)
  return {
    source: source.id,
    path,
    parts: parts.map((part) => part.path),
    replaced,
    extractHash: merged.extractHash,
    verdicts: check.verdicts,
    held: check.held,
    refuted: check.refuted,
    missed: check.missed
  }
}
