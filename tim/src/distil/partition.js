import { DISTIL_SCHEMA_FILES } from './files.js'
import { schemaProblems } from './problems.js'

const isText = (value) => typeof value === 'string' && value.trim() !== ''
const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const objectsIn = (list) => (Array.isArray(list) ? list.filter(isObject) : [])
const idsOf = (list) =>
  objectsIn(list)
    .map((item) => item.id)
    .filter(isText)

const duplicatesIn = (values) => {
  const seen = new Set()
  const duplicates = new Set()
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value)
    seen.add(value)
  }
  return [...duplicates]
}

const MISSED_ID = /^(.+)-m[1-9][0-9]*$/
const MAX_LISTED_IDS = 10

const listIds = (ids) =>
  ids.length > MAX_LISTED_IDS
    ? `${ids.slice(0, MAX_LISTED_IDS).join(', ')} and ${ids.length - MAX_LISTED_IDS} more`
    : ids.join(', ')

export const partitionLabelOf = (slug) =>
  `distil/extract/${slug}.partition.json`

export const extractPartLabelOf = (slug, part) =>
  `distil/extract/${slug}.part${part}.json`

const numberingProblems = (label, parts) =>
  parts
    .map((part, index) => ({ part, expected: index + 1 }))
    .filter(({ part, expected }) => part.part !== expected)
    .map(
      ({ part, expected }) =>
        `${label} lists part ${JSON.stringify(part.part)} where part ${expected} belongs. Number the parts 1, 2, 3 and on, in order.`
    )

const prefixProblems = (label, parts) => {
  const prefixes = parts.map((part) => part.prefix).filter(isText)
  const shared = duplicatesIn(prefixes).map(
    (prefix) =>
      `${label} gives the prefix ${prefix} to more than one part. Each part needs a prefix of its own.`
  )
  const unique = [...new Set(prefixes)]
  const nested = unique.flatMap((outer) =>
    unique
      .filter((inner) => inner !== outer && inner.startsWith(`${outer}-`))
      .map(
        (inner) =>
          `${label} prefix ${inner} starts with the prefix ${outer}, so their claim ids could clash. Use prefixes where neither starts the other.`
      )
  )
  return [...shared, ...nested]
}

const keepsProblems = (label, parts) => {
  const kept = parts.flatMap((part) =>
    Array.isArray(part.keeps) ? part.keeps.filter(isText) : []
  )
  return [
    ...duplicatesIn(kept).map(
      (id) =>
        `${label} keeps claim ${id} in more than one part. Give each old claim id to the one part whose slice holds it.`
    ),
    ...[...new Set(kept)]
      .filter((id) => MISSED_ID.test(id))
      .map(
        (id) =>
          `${label} keeps ${id}, which ends in -m<N>: that is a claim a verifier found missing, never an extract claim.`
      )
  ]
}

/**
 * Every way a partition departs from partition.schema.json, plus what a
 * schema cannot hold: it names its own source, its parts are numbered 1 to n
 * in order, no two parts share a prefix or nest one inside another, and no
 * old claim id is kept by two parts.
 *
 * @param {object} args
 * @param {string} args.label - Such as `distil/extract/repo-tests.partition.json`
 * @param {{id: string}} args.source
 * @param {unknown} args.value - The parsed partition
 * @param {object} args.schema - The parsed partition.schema.json
 * @returns {string[]}
 */
export const partitionProblems = ({ label, source, value, schema }) => {
  const shapeProblems = schemaProblems({
    label,
    value,
    schema,
    schemaName: DISTIL_SCHEMA_FILES.partition
  })
  if (!isObject(value)) return shapeProblems
  const parts = objectsIn(value.parts)
  return [
    ...shapeProblems,
    ...(value.source === source.id
      ? []
      : [
          `${label} says it is from ${JSON.stringify(value.source)}, not ${source.id}.`
        ]),
    ...numberingProblems(label, parts),
    ...prefixProblems(label, parts),
    ...keepsProblems(label, parts)
  ]
}

/**
 * What a part's claims must keep to beyond the extract shape: the part
 * claims something, and every claim id is the part's prefix and a number,
 * or an old id the partition gave this part to keep.
 *
 * @param {object} args
 * @param {string} args.label - Such as `distil/extract/repo-tests.part2.json`
 * @param {{part: number, prefix: string, keeps?: string[]}} args.entry - The part's entry in the partition
 * @param {unknown} args.value - The parsed part file
 * @returns {string[]}
 */
export const partClaimProblems = ({ label, entry, value }) => {
  if (!isObject(value) || !Array.isArray(value.claims)) return []
  if (value.claims.length === 0) {
    return [
      `${label} has no claims. Part ${entry.part} names a slice with something in it: claim every page, field, rule and branch it shows, and record a gap where it is silent.`
    ]
  }
  const kept = new Set(entry.keeps ?? [])
  const strays = idsOf(value.claims).filter(
    (id) => !id.startsWith(`${entry.prefix}-`) && !kept.has(id)
  )
  return strays.length
    ? [
        `${label} has claim ids that are neither part ${entry.part}'s prefix ${entry.prefix} nor an id the partition gives it to keep: ${listIds(strays)}. Number new claims ${entry.prefix}-001, ${entry.prefix}-002 and on.`
      ]
    : []
}

/**
 * A claim id two parts of the same source both use.
 *
 * @param {string} slug - The source's file slug
 * @param {{entry: {part: number}, value?: {claims?: object[]}}[]} parts
 * @returns {string[]}
 */
export const crossPartProblems = (slug, parts) => {
  const owners = new Map()
  for (const { entry, value } of parts) {
    for (const id of new Set(idsOf(value?.claims))) {
      owners.set(id, [...(owners.get(id) ?? []), entry.part])
    }
  }
  return [...owners]
    .filter(([, partNumbers]) => partNumbers.length > 1)
    .map(
      ([id, partNumbers]) =>
        `${partNumbers.map((part) => extractPartLabelOf(slug, part)).join(' and ')} both have claim ${id}. A claim belongs to one part.`
    )
}

/**
 * The merged extract's structure: the partition's account of the whole
 * source, then each part's own, so the verifier and reconciler can see what
 * every part covered.
 *
 * @param {{structure: string}} partition
 * @param {{entry: {part: number, title: string}, value: {structure: string}}[]} parts
 * @returns {string}
 */
export const mergedStructureOf = (partition, parts) =>
  [
    partition.structure,
    '',
    `Extracted in ${parts.length} part${parts.length === 1 ? '' : 's'}:`,
    ...parts.map(
      ({ entry, value }) =>
        `Part ${entry.part}, ${entry.title}: ${value.structure}`
    )
  ].join('\n')

/**
 * Each part's claims as a range of the merged extract, in part order: how
 * many it holds, and its first and last claim id.
 *
 * @param {{entry: {part: number, title: string}, value: {claims: {id: string}[]}}[]} parts
 * @returns {{part: number, title: string, claims: number, from: string|null, to: string|null}[]}
 */
export const partRangesOf = (parts) =>
  parts.map(({ entry, value }) => ({
    part: entry.part,
    title: entry.title,
    claims: value.claims.length,
    from: value.claims[0]?.id ?? null,
    to: value.claims.at(-1)?.id ?? null
  }))
