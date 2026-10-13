import { unlinkSync } from 'node:fs'
import { TimError } from '../errors.js'
import { readJsonFile } from '../backlog/io.js'
import {
  DISTIL_SCHEMA_FILES,
  canonicalJsonOf,
  claimsHashOf,
  extractPartPathOf,
  extractPartsOf,
  extractPathOf,
  orphanFilesOf,
  partitionPathOf,
  readJsonLenient,
  scopeHashOf,
  slugOf,
  verifyPartPathOf,
  verifyPartsOf,
  verifyPathOf
} from './files.js'
import { problemsError, schemaProblems } from './problems.js'
import {
  crossPartProblems,
  extractPartLabelOf,
  mergedStructureOf,
  partClaimProblems,
  partRangesOf,
  partitionLabelOf,
  partitionProblems
} from './partition.js'

export const STATES = ['pending', 'extracted', 'verified', 'stale', 'invalid']

const MISSED_ID = /^(.+)-m[1-9][0-9]*$/
const MAX_LISTED_IDS = 10

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

const countOf = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

const listIds = (ids) =>
  ids.length > MAX_LISTED_IDS
    ? `${ids.slice(0, MAX_LISTED_IDS).join(', ')} and ${ids.length - MAX_LISTED_IDS} more`
    : ids.join(', ')

const extractLabelOf = (slug) => `distil/extract/${slug}.json`
const verifyLabelOf = (slug) => `distil/verify/${slug}.json`

const sourceIdsOf = (sources) => idsOf(sources?.sources)

const slugClashes = (ids) => {
  const bySlug = Object.groupBy([...new Set(ids)], slugOf)
  return Object.entries(bySlug)
    .filter(([, sharing]) => sharing.length > 1)
    .map(
      ([slug, sharing]) =>
        `sources.json: ${sharing.join(' and ')} share the file slug ${slug}. Rename one.`
    )
}

const precedenceProblems = (sources, ids) => {
  if (!Array.isArray(sources.precedence)) return []
  const ranked = new Set(sources.precedence)
  const known = new Set(ids)
  return [
    ...sources.precedence
      .filter((id) => isText(id) && !known.has(id))
      .map(
        (id) => `sources.json precedence names ${id}, which is not a source.`
      ),
    ...ids
      .filter((id) => !ranked.has(id))
      .map((id) => `sources.json precedence does not rank ${id}.`)
  ]
}

const repoSourceProblems = (sources, ids) =>
  isObject(sources.repos)
    ? Object.keys(sources.repos)
        .filter((key) => !ids.includes(`repo:${key}`))
        .map(
          (key) =>
            `sources.json repos names ${key}, but no source is repo:${key}. The target repo is always a source.`
        )
    : []

/**
 * Every way sources.json departs from sources.schema.json, plus what a
 * schema cannot hold: ids and file slugs are unique, precedence ranks every
 * source and nothing else, and every repo is also a `repo:<key>` source.
 *
 * @param {unknown} sources - The parsed sources.json
 * @param {object} schema - The parsed sources.schema.json
 * @returns {string[]}
 */
export const sourcesProblems = (sources, schema) => {
  const problems = schemaProblems({
    label: 'sources.json',
    value: sources,
    schema,
    schemaName: DISTIL_SCHEMA_FILES.sources
  })
  if (!isObject(sources)) return problems
  const ids = sourceIdsOf(sources)
  return [
    ...problems,
    ...duplicatesIn(ids).map(
      (id) => `sources.json names ${id} more than once.`
    ),
    ...slugClashes(ids),
    ...precedenceProblems(sources, ids),
    ...repoSourceProblems(sources, ids)
  ]
}

/**
 * Read sources.json and refuse it unless it is in shape: every other distil
 * command works from its list of sources.
 *
 * @param {object} layout - From `distilLayout`
 * @param {object} schema - The parsed sources.schema.json
 * @returns {object} The parsed sources.json
 * @throws {TimError} NOT_FOUND when it is missing, PARSE when it is not JSON, LINT when it is out of shape
 */
export const readSources = (layout, schema) => {
  const sources = readJsonFile(layout.sources)
  const problems = sourcesProblems(sources, schema)
  if (problems.length) throw problemsError(problems, `in ${layout.sources}`)
  return sources
}

/**
 * Every source's extract, read without throwing, by source id.
 *
 * @param {object} layout - From `distilLayout`
 * @param {object} sources - The parsed sources.json, already in shape
 * @returns {Map<string, {exists: boolean, value?: unknown, error?: string}>}
 */
export const extractReadsOf = (layout, sources) =>
  new Map(
    sources.sources.map((source) => [
      source.id,
      readJsonLenient(extractPathOf(layout, slugOf(source.id)))
    ])
  )

/**
 * Which sources' extracts hold each claim id, so a claim id two sources use
 * is caught: requirements cite claims by id alone.
 *
 * @param {Map<string, {value?: unknown}>} extracts - Each source id's extract read
 * @returns {Map<string, string[]>}
 */
export const claimOwnersOf = (extracts) => {
  const owners = new Map()
  for (const [sourceId, read] of extracts) {
    for (const id of new Set(idsOf(read.value?.claims))) {
      owners.set(id, [...(owners.get(id) ?? []), sourceId])
    }
  }
  return owners
}

const QUOTED_CONFIDENCES = new Set(['verbatim', 'inferred'])

const emptyQuoteProblems = (label, claims, what) =>
  objectsIn(claims)
    .filter(
      (claim) =>
        QUOTED_CONFIDENCES.has(claim.confidence) &&
        typeof claim.quote === 'string' &&
        !isText(claim.quote)
    )
    .map(
      (claim) =>
        `${label} ${what} ${claim.id} is ${claim.confidence} but its quote is empty. Only a gap may leave the quote empty.`
    )

const sourceMismatch = (label, value, source) =>
  isObject(value) && value.source !== source.id
    ? [
        `${label} says it is from ${JSON.stringify(value.source)}, not ${source.id}.`
      ]
    : []

/**
 * Every way one extract departs from extract.schema.json, plus what a
 * schema cannot hold. The scope hash is checked apart, by
 * `scopeHashProblem`: a stale extract is in shape, just out of date.
 *
 * @param {object} args
 * @param {{id: string}} args.source
 * @param {unknown} args.value - The parsed extract
 * @param {object} args.schema - The parsed extract.schema.json
 * @param {Map<string, string[]>} args.claimOwners - From `claimOwnersOf`
 * @param {string} [args.label] - The file as the reader knows it; the extract by default, or one of its part files
 * @returns {string[]}
 */
export const extractProblems = ({
  source,
  value,
  schema,
  claimOwners,
  label = extractLabelOf(slugOf(source.id))
}) => {
  const ids = idsOf(value?.claims)
  return [
    ...schemaProblems({
      label,
      value,
      schema,
      schemaName: DISTIL_SCHEMA_FILES.extract
    }),
    ...sourceMismatch(label, value, source),
    ...emptyQuoteProblems(label, value?.claims, 'claim'),
    ...duplicatesIn(ids).map(
      (id) => `${label} has claim id ${id} more than once.`
    ),
    ...ids
      .filter((id) => MISSED_ID.test(id))
      .map(
        (id) =>
          `${label} claim ${id} ends in -m<N>, which is kept for claims a verifier finds missing. Renumber it.`
      ),
    ...[...new Set(ids)].flatMap((id) =>
      (claimOwners.get(id) ?? [])
        .filter((owner) => owner !== source.id)
        .map(
          (owner) =>
            `${label} claim ${id} is also in ${owner}'s extract. Claim ids must be unique across the workarea, so give this source a prefix of its own.`
        )
    )
  ]
}

const shortHash = (hash) => hash.slice(0, 12)

/**
 * Whether an extract's recorded scope hash still matches its source.
 *
 * @param {object} args
 * @param {object} args.source - The source from sources.json
 * @param {object} args.value - The parsed extract
 * @param {string} args.workarea - As the command was given it, for the fix
 * @returns {{state: 'current'|'missing'|'changed', problem: string|null}}
 */
export const scopeHashCheck = ({ source, value, workarea }) => {
  const label = extractLabelOf(slugOf(source.id))
  const current = scopeHashOf(source)
  if (!isText(value?.scopeHash)) {
    return {
      state: 'missing',
      problem: `${label} records no scope hash. Once the extract is done, run: tim distil stamp ${workarea} --source ${source.id}`
    }
  }
  if (value.scopeHash !== current) {
    return {
      state: 'changed',
      problem: `${label} was extracted for scope hash ${shortHash(value.scopeHash)}, but ${source.id}'s kind, locator or scope has changed since (now ${shortHash(current)}). Extract it again.`
    }
  }
  return { state: 'current', problem: null }
}

const readPartFile = ({ layout, schemas, source, entry, claimOwners }) => {
  const slug = slugOf(source.id)
  const label = extractPartLabelOf(slug, entry.part)
  const path = extractPartPathOf(layout, slug, entry.part)
  const read = readJsonLenient(path)
  if (!read.exists) {
    return {
      entry,
      path,
      problems: [
        `${label} does not exist yet: part ${entry.part} (${entry.title}) has no extract.`
      ]
    }
  }
  if (read.error) return { entry, path, problems: unreadable(label, read) }
  return {
    entry,
    path,
    value: read.value,
    problems: [
      ...extractProblems({
        source,
        value: read.value,
        schema: schemas.extract,
        claimOwners,
        label
      }),
      ...partClaimProblems({ label, entry, value: read.value })
    ]
  }
}

/**
 * Read one source's partition, if it has one, and judge it.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.schemas - From `loadDistilSchemas`
 * @param {object} args.source - The source from sources.json
 * @returns {{exists: boolean, value?: unknown, problems: string[]}}
 */
export const readPartition = ({ layout, schemas, source }) => {
  const slug = slugOf(source.id)
  const label = partitionLabelOf(slug)
  const read = readJsonLenient(partitionPathOf(layout, slug))
  if (!read.exists) return { exists: false, problems: [] }
  if (read.error) return { exists: true, problems: unreadable(label, read) }
  return {
    exists: true,
    value: read.value,
    problems: partitionProblems({
      label,
      source,
      value: read.value,
      schema: schemas.partition
    })
  }
}

const strayPartProblems = (slug, files, entries) =>
  files
    .filter((file) => !entries.some((entry) => entry.part === file.part))
    .map(
      (file) =>
        `${extractPartLabelOf(slug, file.part)} is not a part of ${partitionLabelOf(slug)}, which has ${entries.length} part${entries.length === 1 ? '' : 's'}. It is left from an earlier partition: tim distil check --stage partition --clear-parts removes it.`
    )

/**
 * Read and judge one source's partition and the extract part files it calls
 * for. Each part is checked against extract.schema.json and its own prefix;
 * across parts, every part has its file, no file is outside the partition,
 * and no claim id is in two parts.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.schemas - From `loadDistilSchemas`
 * @param {object} args.source - The source from sources.json
 * @param {Map<string, string[]>} args.claimOwners - From `claimOwnersOf`
 * @param {number} [args.part] - Check only this part, and the partition
 * @returns {{exists: boolean, partition?: object, parts: object[], problems: string[]}}
 *   `parts` holds each part's entry, path, parsed file and problems
 */
export const inspectExtractParts = ({
  layout,
  schemas,
  source,
  claimOwners,
  part
}) => {
  const slug = slugOf(source.id)
  const label = partitionLabelOf(slug)
  const read = readPartition({ layout, schemas, source })
  if (!read.exists) return { exists: false, parts: [], problems: [] }
  if (read.problems.length) {
    return {
      exists: true,
      partition: read.value,
      parts: [],
      problems: read.problems
    }
  }
  const entries = read.value.parts
  const chosen =
    part === undefined
      ? entries
      : entries.filter((entry) => entry.part === part)
  if (!chosen.length) {
    return {
      exists: true,
      partition: read.value,
      parts: [],
      problems: [
        `${label} has no part ${part}. Its parts are 1 to ${entries.length}.`
      ]
    }
  }
  const parts = chosen.map((entry) =>
    readPartFile({ layout, schemas, source, entry, claimOwners })
  )
  const whole = part === undefined
  return {
    exists: true,
    partition: read.value,
    parts,
    problems: [
      ...parts.flatMap((partRead) => partRead.problems),
      ...(whole
        ? [
            ...strayPartProblems(slug, extractPartsOf(layout, slug), entries),
            ...crossPartProblems(slug, parts)
          ]
        : [])
    ]
  }
}

/**
 * The extract its parts make: the partition's structure and each part's,
 * then every part's claims in part order.
 *
 * @param {{partition: object, parts: {entry: object, value: object}[]}} inspected - From `inspectExtractParts`, with no problems
 * @returns {{structure: string, claims: object[]}}
 */
export const mergedExtractOf = ({ partition, parts }) => ({
  structure: mergedStructureOf(partition, parts),
  claims: parts.flatMap(({ value }) => value.claims)
})

const mergeMismatchProblem = ({ source, extract, inspected, workarea }) => {
  const merged = mergedExtractOf(inspected)
  const same =
    canonicalJsonOf({
      structure: extract.structure,
      claims: extract.claims
    }) === canonicalJsonOf(merged)
  return same
    ? []
    : [
        `${extractLabelOf(slugOf(source.id))} is not its parts merged: a part changed after the merge, or the extract was written by hand. Run: tim distil merge-extract ${workarea} --source ${source.id}`
      ]
}

/**
 * Whether a verify file records the hash of the extract as it stands now,
 * so a verification of an earlier extract is never taken for this one.
 *
 * @param {object} args
 * @param {object} args.extract - The parsed extract, already in shape
 * @param {unknown} args.value - The parsed verify file
 * @param {string} args.label
 * @param {{id: string}} args.source
 * @param {string} args.workarea - As the command was given it, for the fix
 * @returns {{state: 'current'|'missing'|'changed', problem: string|null}}
 */
export const extractHashCheck = ({
  extract,
  value,
  label,
  source,
  workarea
}) => {
  const recorded = isObject(value) ? value.extractHash : undefined
  if (!isText(recorded)) {
    return {
      state: 'missing',
      problem: `${label} records no extract hash, so nothing shows it judged the extract as it stands. Verify it again, or, if you know it judged this extract, run: tim distil adopt ${workarea} --source ${source.id}`
    }
  }
  if (recorded !== claimsHashOf(extract.claims)) {
    return {
      state: 'changed',
      problem: `${label} judged an earlier extract: the claims changed after it was verified. Verify it again.`
    }
  }
  return { state: 'current', problem: null }
}

const verdictCounts = (verdicts, missed) => ({
  verdicts: verdicts.length,
  held: verdicts.filter((verdict) => verdict.holds === true).length,
  refuted: verdicts.filter((verdict) => verdict.holds === false).length,
  missed: missed.length
})

const parityProblems = (label, claimIds, verdictIds) => {
  const claims = new Set(claimIds)
  const judged = new Set(verdictIds)
  const unjudged = claimIds.filter((id) => !judged.has(id))
  return [
    ...duplicatesIn(verdictIds).map(
      (id) => `${label} gives ${id} more than one verdict.`
    ),
    ...(unjudged.length
      ? [
          `${label} has no verdict for ${countOf(unjudged.length, 'claim')}: ${listIds(unjudged)}.`
        ]
      : []),
    ...[...judged]
      .filter((id) => !claims.has(id))
      .map(
        (id) =>
          `${label} gives a verdict on ${id}, which is not a claim in the extract.`
      )
  ]
}

const missedProblems = (label, claimIds, missedIds) => {
  const claims = new Set(claimIds)
  return [
    ...duplicatesIn(missedIds).map(
      (id) => `${label} lists missed claim ${id} more than once.`
    ),
    ...[...new Set(missedIds)]
      .filter((id) => !claims.has(id.match(MISSED_ID)?.[1]))
      .map(
        (id) =>
          `${label} missed claim ${id} must be named <claim id>-m<N> after a claim in the extract, such as ${claimIds[0] ?? 'conf-001'}-m1.`
      )
  ]
}

/**
 * Check one source's verification against its extract: the shape, then the
 * rules a schema cannot hold. Verdict ids must be exactly the extract's
 * claim ids, each once; every missed id is <claim id>-m<N>, each once. The
 * extract hash is checked apart, in `hash`: a verification of an earlier
 * extract is in shape, just out of date.
 *
 * @param {object} args
 * @param {{id: string}} args.source
 * @param {object} args.extract - The parsed extract, already in shape
 * @param {unknown} args.value - The parsed verify file
 * @param {object|null} args.schema - The parsed verify.schema.json; null when the parts it came from were already checked against it
 * @param {string} args.workarea - As the command was given it, for the fix
 * @param {string} [args.label]
 * @returns {{problems: string[], hash: {state: string, problem: string|null}, parity: boolean, verdicts: number, held: number, refuted: number, missed: number}}
 */
export const verifyCheck = ({
  source,
  extract,
  value,
  schema,
  workarea,
  label = verifyLabelOf(slugOf(source.id))
}) => {
  const claimIds = idsOf(extract.claims)
  const verdicts = objectsIn(value?.verdicts)
  const missed = objectsIn(value?.missed)
  const parity = parityProblems(
    label,
    claimIds,
    verdicts.map((verdict) => verdict.id).filter(isText)
  )
  return {
    problems: [
      ...(schema
        ? schemaProblems({
            label,
            value,
            schema,
            schemaName: DISTIL_SCHEMA_FILES.verify
          })
        : []),
      ...sourceMismatch(label, value, source),
      ...emptyQuoteProblems(label, missed, 'missed claim'),
      ...parity,
      ...missedProblems(label, claimIds, idsOf(missed))
    ],
    hash: extractHashCheck({ extract, value, label, source, workarea }),
    parity: parity.length === 0,
    ...verdictCounts(verdicts, missed)
  }
}

const unreadable = (label, read) => [`${label} ${read.error}`]

const inspectExtract = ({ source, read, schemas, claimOwners, workarea }) => {
  if (!read.exists) return { exists: false, valid: false, problems: [] }
  if (read.error) {
    return {
      exists: true,
      valid: false,
      problems: unreadable(extractLabelOf(slugOf(source.id)), read)
    }
  }
  const problems = extractProblems({
    source,
    value: read.value,
    schema: schemas.extract,
    claimOwners
  })
  return {
    exists: true,
    valid: problems.length === 0,
    problems,
    hash: scopeHashCheck({ source, value: read.value, workarea })
  }
}

const inspectVerify = ({ source, extract, read, schemas, workarea }) => {
  if (!read.exists || !extract) return null
  if (read.error) {
    return {
      problems: unreadable(verifyLabelOf(slugOf(source.id)), read),
      hash: { state: 'missing', problem: null },
      parity: false
    }
  }
  return verifyCheck({
    source,
    extract,
    value: read.value,
    schema: schemas.verify,
    workarea
  })
}

const VERIFY_HASH_REASONS = {
  missing:
    'The verification records no extract hash, so nothing shows it judged this extract.',
  changed: 'The extract changed after it was verified.'
}

const pendingReason = (partition) => {
  if (!partition.exists) return 'No extract yet.'
  const planned = Array.isArray(partition.value?.parts)
    ? partition.value.parts.length
    : null
  const written = countOf(partition.written, 'part file')
  return planned === null
    ? `No extract yet. A partition is written, and ${written}.`
    : `No extract yet. Its partition has ${countOf(planned, 'part')}, and ${written} ${partition.written === 1 ? 'is' : 'are'} written.`
}

const stateOf = ({ extract, verifyRead, verify, parts, partition }) => {
  if (!extract.exists) {
    return {
      state: 'pending',
      next: 'extract',
      reason: pendingReason(partition)
    }
  }
  if (!extract.valid) {
    return {
      state: 'invalid',
      next: 'extract',
      reason: `The extract has ${countOf(extract.problems.length, 'problem')}.`
    }
  }
  if (extract.hash.state !== 'current') {
    return {
      state: 'stale',
      next: 'extract',
      reason:
        extract.hash.state === 'missing'
          ? 'The extract records no scope hash.'
          : "The source's kind, locator or scope changed after it was extracted."
    }
  }
  if (!verifyRead.exists) {
    return {
      state: 'extracted',
      next: 'verify',
      reason: parts.length
        ? `No verification yet, and ${countOf(parts.length, 'verify part')} to merge.`
        : 'No verification yet.'
    }
  }
  if (verify.problems.length) {
    return {
      state: 'invalid',
      next: 'verify',
      reason: `The verification has ${countOf(verify.problems.length, 'problem')}.`
    }
  }
  if (verify.hash.state !== 'current') {
    return {
      state: 'stale',
      next: 'verify',
      reason: VERIFY_HASH_REASONS[verify.hash.state]
    }
  }
  return { state: 'verified', next: null, reason: 'Extracted and verified.' }
}

const publicVerify = ({ path, read, verify, parts }) => ({
  path,
  exists: read.exists,
  valid: verify ? verify.problems.length === 0 : null,
  parity: verify ? verify.parity : null,
  problems: verify?.problems ?? [],
  extractHash: verify?.hash.state ?? null,
  verdicts: verify?.verdicts ?? null,
  held: verify?.held ?? null,
  refuted: verify?.refuted ?? null,
  missed: verify?.missed ?? null,
  parts: parts.map((part) => part.path)
})

/**
 * Read and judge every source's extract and verification. Each entry keeps
 * the parsed files beside the public report, for the commands that go on to
 * merge, gather or cite them.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.schemas - From `loadDistilSchemas`
 * @param {object} args.sources - The parsed sources.json, already in shape
 * @param {string} args.workarea
 * @returns {{report: object, source: object, extract: object|undefined, verify: object|undefined, raw: {extract: unknown, verify: unknown}, problems: object}[]}
 *   `extract` and `verify` are set only when in shape; `raw` holds whatever parsed
 */
export const inspectSources = ({ layout, schemas, sources, workarea }) => {
  const reads = extractReadsOf(layout, sources)
  const claimOwners = claimOwnersOf(reads)
  return sources.sources.map((source) => {
    const slug = slugOf(source.id)
    const extractRead = reads.get(source.id)
    const extract = inspectExtract({
      source,
      read: extractRead,
      schemas,
      claimOwners,
      workarea
    })
    const extractValue = extract.valid ? extractRead.value : undefined
    const verifyPath = verifyPathOf(layout, slug)
    const verifyRead = readJsonLenient(verifyPath)
    const verify = inspectVerify({
      source,
      extract: extractValue,
      read: verifyRead,
      schemas,
      workarea
    })
    const parts = verifyPartsOf(layout, slug)
    const partition = {
      ...readJsonLenient(partitionPathOf(layout, slug)),
      written: extractPartsOf(layout, slug).length
    }
    return {
      source,
      extract: extractValue,
      verify:
        verify &&
        verify.problems.length === 0 &&
        verify.hash.state === 'current'
          ? verifyRead.value
          : undefined,
      raw: { extract: extractRead.value, verify: verifyRead.value },
      problems: {
        extract: extract.problems,
        hash: extract.hash?.problem ?? null,
        verify: verify?.problems ?? [],
        verifyHash: verify?.hash.problem ?? null
      },
      report: {
        id: source.id,
        kind: source.kind,
        slug,
        scopeHash: scopeHashOf(source),
        ...stateOf({ extract, verifyRead, verify, parts, partition }),
        extract: {
          path: extractPathOf(layout, slug),
          exists: extract.exists,
          valid: extract.exists ? extract.valid : null,
          problems: extract.problems,
          claims: extractValue ? extractValue.claims.length : null,
          scopeHash: isText(extractRead.value?.scopeHash)
            ? extractRead.value.scopeHash
            : null
        },
        verify: publicVerify({
          path: verifyPath,
          read: verifyRead,
          verify,
          parts
        })
      }
    }
  })
}

const countStates = (reports) =>
  Object.fromEntries(
    STATES.map((state) => [
      state,
      reports.filter((report) => report.state === state).length
    ])
  )

/**
 * The work list for a distil run: every source's state, what it needs next,
 * and the files it has. A source already verified with an unchanged scope
 * hash needs nothing, so a relaunch skips it.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.schemas - From `loadDistilSchemas`
 * @param {string} args.workarea
 * @returns {{workarea: string, path: string, sources: object[], counts: Record<string, number>, work: object[], orphans: string[]}}
 * @throws {TimError} when sources.json is missing or out of shape
 */
export const distilStatus = ({ layout, schemas, workarea }) => {
  const sources = readSources(layout, schemas.sources)
  const reports = inspectSources({ layout, schemas, sources, workarea }).map(
    (entry) => entry.report
  )
  return {
    workarea,
    path: layout.dir,
    sources: reports,
    counts: countStates(reports),
    work: reports
      .filter((report) => report.next !== null)
      .map(({ id, slug, kind, state, next }) => ({
        id,
        slug,
        kind,
        state,
        next
      })),
    orphans: orphanFilesOf(
      layout,
      new Set(reports.map((report) => report.slug))
    )
  }
}

/**
 * Split an extract's claims into ranges of at most `size` claims, one per
 * verify agent, each with the part file it writes. An extract with no claims
 * still gets one range, so its verifier can record what the extract missed.
 *
 * @param {object} args
 * @param {object} args.layout
 * @param {string} args.slug
 * @param {{id: string}[]} args.claims
 * @param {number} [args.size] - Claims per range; the whole extract when left out
 * @returns {{part: number, from: string|null, to: string|null, count: number, path: string}[]}
 */
export const verifyChunksOf = ({ layout, slug, claims, size }) => {
  const width = size ?? Math.max(claims.length, 1)
  const starts = claims.length
    ? Array.from(
        { length: Math.ceil(claims.length / width) },
        (_, index) => index * width
      )
    : [0]
  return starts.map((start, index) => {
    const slice = claims.slice(start, start + width)
    return {
      part: index + 1,
      from: slice[0]?.id ?? null,
      to: slice.at(-1)?.id ?? null,
      count: slice.length,
      path: verifyPartPathOf(layout, slug, index + 1)
    }
  })
}

const STAGES = ['partition', 'extract', 'verify', 'all']

const partitionStageProblems = (entry, partition) =>
  partition.exists
    ? partition.problems
    : [
        `${partitionLabelOf(entry.report.slug)} does not exist yet. The characterise step writes it, before any part is extracted.`
      ]

const missingExtractProblem = (entry, inspected, workarea) => {
  const label = extractLabelOf(entry.report.slug)
  return inspected.exists && inspected.problems.length === 0
    ? `${label} does not exist yet. Merge its parts: tim distil merge-extract ${workarea} --source ${entry.report.id}`
    : `${label} does not exist yet.`
}

const extractStageProblems = (entry, inspected, workarea) => {
  if (!entry.report.extract.exists) {
    return [
      missingExtractProblem(entry, inspected, workarea),
      ...inspected.problems
    ]
  }
  const mergeProblems =
    inspected.exists && inspected.problems.length === 0 && entry.extract
      ? mergeMismatchProblem({
          source: entry.source,
          extract: entry.extract,
          inspected,
          workarea
        })
      : []
  return [
    ...entry.problems.extract,
    ...(entry.problems.hash ? [entry.problems.hash] : []),
    ...inspected.problems,
    ...mergeProblems
  ]
}

const verifyStageProblems = (entry, workarea) => {
  const { slug, id, verify } = entry.report
  const label = verifyLabelOf(slug)
  if (!entry.extract) {
    return [
      `${extractLabelOf(slug)} is missing or out of shape, so ${label} cannot be checked against it. Run: tim distil check ${workarea} --source ${id} --stage extract`
    ]
  }
  if (!verify.exists) {
    return verify.parts.length
      ? [
          `${label} does not exist yet. Merge its ${countOf(verify.parts.length, 'part file')} first: tim distil merge-verify ${workarea} --source ${id}`
        ]
      : [`${label} does not exist yet.`]
  }
  return [
    ...entry.problems.verify,
    ...(entry.problems.verifyHash ? [entry.problems.verifyHash] : [])
  ]
}

const checkedSource = (entry, inspected, { layout, stage, chunk }) => ({
  id: entry.report.id,
  slug: entry.report.slug,
  state: entry.report.state,
  claims: entry.report.extract.claims,
  ...(stage !== 'verify' && inspected.exists
    ? { parts: partRangesOf(inspected.parts) }
    : {}),
  chunks:
    stage !== 'verify' && entry.extract
      ? verifyChunksOf({
          layout,
          slug: entry.report.slug,
          claims: entry.extract.claims,
          size: chunk
        })
      : null,
  verify:
    stage !== 'extract' && entry.verify
      ? {
          verdicts: entry.report.verify.verdicts,
          held: entry.report.verify.held,
          refuted: entry.report.verify.refuted,
          missed: entry.report.verify.missed
        }
      : null
})

const partitionedSource = (entry, partition, layout) => ({
  id: entry.report.id,
  slug: entry.report.slug,
  structure: partition.value.structure,
  parts: partition.value.parts.map((part) => ({
    part: part.part,
    title: part.title,
    prefix: part.prefix,
    path: extractPartPathOf(layout, entry.report.slug, part.part)
  }))
})

const usageProblem = ({ stage, part, clearParts }) => {
  if (!STAGES.includes(stage)) {
    return `--stage must be one of: ${STAGES.join(', ')}.`
  }
  if (part !== undefined && stage !== 'extract') {
    return '--part goes with --stage extract: it checks one extract part file.'
  }
  if (part !== undefined && clearParts) {
    return '--clear-parts cannot go with --part: one part is checked while the others are still being written.'
  }
  return null
}

const chosenEntries = ({ layout, schemas, workarea, sourceId }) => {
  const sources = readSources(layout, schemas.sources)
  const entries = inspectSources({ layout, schemas, sources, workarea })
  const chosen = sourceId
    ? entries.filter((entry) => entry.source.id === sourceId)
    : entries
  if (sourceId && !chosen.length) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find source ${sourceId} in ${layout.sources}.`
    )
  }
  return {
    chosen,
    claimOwners: claimOwnersOf(extractReadsOf(layout, sources))
  }
}

const refuseAny = (problems, layout) => {
  const uniqueProblems = [...new Set(problems)]
  if (uniqueProblems.length) {
    throw problemsError(uniqueProblems, `in ${layout.dir}`)
  }
}

const checkPartitions = ({ layout, schemas, chosen, clearParts }) => {
  const read = chosen.map((entry) => ({
    entry,
    partition: readPartition({ layout, schemas, source: entry.source })
  }))
  refuseAny(
    read.flatMap(({ entry, partition }) =>
      partitionStageProblems(entry, partition)
    ),
    layout
  )
  return {
    stage: 'partition',
    sources: read.map(({ entry, partition }) =>
      partitionedSource(entry, partition, layout)
    ),
    ...(clearParts
      ? {
          removedParts: removeFiles(chosen, (slug) =>
            extractPartsOf(layout, slug)
          )
        }
      : {})
  }
}

const checkOnePart = ({ layout, schemas, chosen, claimOwners, part }) => {
  const inspected = chosen.map((entry) => ({
    entry,
    parts: inspectExtractParts({
      layout,
      schemas,
      source: entry.source,
      claimOwners,
      part
    })
  }))
  refuseAny(
    inspected.flatMap(({ entry, parts }) =>
      parts.exists ? parts.problems : partitionStageProblems(entry, parts)
    ),
    layout
  )
  return {
    stage: 'extract',
    part,
    sources: inspected.map(({ entry, parts }) => ({
      id: entry.report.id,
      slug: entry.report.slug,
      parts: partRangesOf(parts.parts)
    }))
  }
}

/**
 * Check one source, or every source, at one stage. Refuses with every
 * problem found, so a retry has the whole list to fix.
 *
 * - `partition`: the source's partition, before any part is extracted.
 * - `extract`: the extract, and, when the source was extracted in parts,
 *   its partition, every part file and that the extract is its parts merged.
 *   With `part`, only the partition and that one part file.
 * - `verify`: the verification against the extract.
 * - `all`: extract and verify.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.schemas - From `loadDistilSchemas`
 * @param {string} args.workarea
 * @param {'partition'|'extract'|'verify'|'all'} args.stage
 * @param {string} [args.sourceId] - One source; every source when left out
 * @param {number} [args.chunk] - Claims per verify range, for `chunks`
 * @param {number} [args.part] - With stage extract: check only this part file
 * @param {boolean} [args.clearParts] - Once the check passes, remove the part files the next stage writes, so nothing from an earlier run is merged: the extract part files after the partition stage, the verify part files after any other
 * @returns {{stage: string, sources: object[], part?: number, removedParts?: string[]}}
 * @throws {TimError} USAGE for an unknown stage or options that do not go together, NOT_FOUND for an unknown source, LINT with every problem
 */
export const checkDistil = ({
  layout,
  schemas,
  workarea,
  stage,
  sourceId,
  chunk,
  part,
  clearParts = false
}) => {
  const usage = usageProblem({ stage, part, clearParts })
  if (usage) throw new TimError('USAGE', usage)
  const { chosen, claimOwners } = chosenEntries({
    layout,
    schemas,
    workarea,
    sourceId
  })
  if (stage === 'partition') {
    return checkPartitions({ layout, schemas, chosen, clearParts })
  }
  if (part !== undefined) {
    return checkOnePart({ layout, schemas, chosen, claimOwners, part })
  }
  const inspected = new Map(
    chosen.map((entry) => [
      entry.source.id,
      stage === 'verify'
        ? { exists: false, parts: [], problems: [] }
        : inspectExtractParts({
            layout,
            schemas,
            source: entry.source,
            claimOwners
          })
    ])
  )
  refuseAny(
    chosen.flatMap((entry) => {
      const parts = inspected.get(entry.source.id)
      if (stage === 'extract') {
        return extractStageProblems(entry, parts, workarea)
      }
      if (stage === 'verify') return verifyStageProblems(entry, workarea)
      const extractSide = extractStageProblems(entry, parts, workarea)
      return entry.extract
        ? [...extractSide, ...verifyStageProblems(entry, workarea)]
        : extractSide
    }),
    layout
  )
  return {
    stage,
    sources: chosen.map((entry) =>
      checkedSource(entry, inspected.get(entry.source.id), {
        layout,
        stage,
        chunk
      })
    ),
    ...(clearParts
      ? {
          removedParts: removeFiles(chosen, (slug) =>
            verifyPartsOf(layout, slug)
          )
        }
      : {})
  }
}

const removeFiles = (entries, filesOf) =>
  entries
    .flatMap((entry) => filesOf(entry.report.slug))
    .map(({ path }) => {
      unlinkSync(path)
      return path
    })
