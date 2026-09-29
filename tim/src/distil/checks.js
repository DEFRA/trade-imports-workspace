import { unlinkSync } from 'node:fs'
import { TimError } from '../errors.js'
import { readJsonFile } from '../backlog/io.js'
import {
  DISTIL_SCHEMA_FILES,
  claimsHashOf,
  extractPathOf,
  orphanFilesOf,
  readJsonLenient,
  scopeHashOf,
  slugOf,
  verifyPartPathOf,
  verifyPartsOf,
  verifyPathOf
} from './files.js'
import { problemsError, schemaProblems } from './problems.js'

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
 * @returns {string[]}
 */
export const extractProblems = ({ source, value, schema, claimOwners }) => {
  const label = extractLabelOf(slugOf(source.id))
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

const stateOf = ({ extract, verifyRead, verify, parts }) => {
  if (!extract.exists) {
    return { state: 'pending', next: 'extract', reason: 'No extract yet.' }
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
  const reads = new Map(
    sources.sources.map((source) => [
      source.id,
      readJsonLenient(extractPathOf(layout, slugOf(source.id)))
    ])
  )
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
        ...stateOf({ extract, verifyRead, verify, parts }),
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

const STAGES = new Set(['extract', 'verify', 'all'])

const extractStageProblems = (entry) => {
  const label = extractLabelOf(entry.report.slug)
  if (!entry.report.extract.exists) return [`${label} does not exist yet.`]
  return [
    ...entry.problems.extract,
    ...(entry.problems.hash ? [entry.problems.hash] : [])
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

const checkedSource = (entry, { layout, stage, chunk }) => ({
  id: entry.report.id,
  slug: entry.report.slug,
  state: entry.report.state,
  claims: entry.report.extract.claims,
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

/**
 * Check one source, or every source, at one stage. Refuses with every
 * problem found, so a retry has the whole list to fix.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.schemas - From `loadDistilSchemas`
 * @param {string} args.workarea
 * @param {'extract'|'verify'|'all'} args.stage
 * @param {string} [args.sourceId] - One source; every source when left out
 * @param {number} [args.chunk] - Claims per verify range, for `chunks`
 * @param {boolean} [args.clearParts] - Once the check passes, remove the chosen sources' verify part files, so a fresh verify run merges nothing left from an earlier one
 * @returns {{stage: string, sources: object[], removedParts?: string[]}}
 * @throws {TimError} USAGE for an unknown stage, NOT_FOUND for an unknown source, LINT with every problem
 */
export const checkDistil = ({
  layout,
  schemas,
  workarea,
  stage,
  sourceId,
  chunk,
  clearParts = false
}) => {
  if (!STAGES.has(stage)) {
    throw new TimError('USAGE', `--stage must be one of: extract, verify, all.`)
  }
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
  const problems = chosen.flatMap((entry) => {
    if (stage === 'extract') return extractStageProblems(entry)
    if (stage === 'verify') return verifyStageProblems(entry, workarea)
    const extractSide = extractStageProblems(entry)
    return entry.extract
      ? [...extractSide, ...verifyStageProblems(entry, workarea)]
      : extractSide
  })
  const uniqueProblems = [...new Set(problems)]
  if (uniqueProblems.length) {
    throw problemsError(uniqueProblems, `in ${layout.dir}`)
  }
  return {
    stage,
    sources: chosen.map((entry) =>
      checkedSource(entry, { layout, stage, chunk })
    ),
    ...(clearParts ? { removedParts: removePartsOf(layout, chosen) } : {})
  }
}

const removePartsOf = (layout, entries) =>
  entries
    .flatMap((entry) => verifyPartsOf(layout, entry.report.slug))
    .map(({ path }) => {
      unlinkSync(path)
      return path
    })
