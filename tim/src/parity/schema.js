import { z } from 'zod'
import { TimError } from '../errors.js'

/**
 * Schema version stamped into the report footer. Bump when a required key
 * changes shape, so a page in someone's browser can be told which generator
 * built it.
 */
export const PARITY_SCHEMA_VERSION = 1

// Additive-tolerant, subtractive-strict. Unknown keys pass through untouched
// so journey-builder can add fields freely; a missing or retyped required key
// is a hard, named error, so a rename fails the build the moment it happens
// instead of emitting a silently empty section.
const passthrough = (shape) => z.object(shape).catchall(z.unknown())

const nullableString = z.string().nullable()

export const noteSchema = passthrough({
  note: z.string(),
  at: z.string()
})

export const decisionSchema = passthrough({
  ruling: z.string(),
  note: z.string(),
  ruledAt: z.string().optional(),
  by: z.string().optional()
})

export const citationSchema = passthrough({
  ref: z.string(),
  kind: z.enum(['code', 'capture']),
  side: nullableString,
  repo: nullableString,
  // Null on a citation that could not be resolved. A citation that names no
  // file is information — it is queued for a human and rendered as inert code
  // with the reason — so the schema has to be able to hold one.
  path: nullableString,
  lines: z
    .object({ start: z.number().int(), end: z.number().int() })
    .nullable()
    .optional(),
  asWritten: z.string(),
  anchors: z.array(z.string()).optional(),
  resolution: z.enum([
    'explicit',
    'basename-resolved',
    'continuation',
    'human',
    'unresolved'
  ]),
  why: z.string().optional(),
  needsHuman: z.boolean().optional()
})

export const decisionRequiredSchema = passthrough({
  question: z.string(),
  audience: z.string(),
  source: z.enum(['extracted', 'authored']),
  options: z.array(z.string()).optional(),
  consequence: z.string().optional(),
  cites: z.array(z.string()).optional()
})

export const relatedToSchema = passthrough({
  id: z.string(),
  relation: z.string(),
  why: z.string()
})

export const findingSchema = passthrough({
  frontend: z.string().optional(),
  prototype: z.string().optional(),
  difference: z.string().optional(),
  correction: z.string().optional(),
  falsifiedBy: z.string().optional(),
  verification: z.string().optional(),
  verbatim: z.boolean().optional(),
  longBecause: z.string().optional(),
  cites: z.record(z.string(), z.array(z.string())).optional(),
  decisionRequired: decisionRequiredSchema.optional(),
  relatedTo: z.array(relatedToSchema).optional()
})

export const visualFrameSchema = passthrough({
  kind: z.enum(['pair', 'only', 'sequence', 'page', 'contact-sheet', 'none']),
  reason: z.string().optional(),
  screens: z.record(z.string(), z.string()).optional(),
  anchors: z.record(z.string(), z.unknown()).optional(),
  curatedAgainst: z.record(z.string(), z.string()).optional(),
  fromDelta: z.object({ file: z.string(), index: z.number().int() }).optional(),
  caption: z.string().optional(),
  reframe: z.boolean().optional()
})

export const incrementSchema = passthrough({
  id: z.string(),
  type: z.string(),
  milestone: nullableString,
  domain: z.string(),
  title: z.string(),
  detail: z.string(),
  screens: z.array(z.string()),
  evidence: passthrough({}),
  confidence: z.string(),
  band: z.string(),
  gate: nullableString,
  dependsOn: z.array(z.string()),
  status: z.string(),
  commit: nullableString,
  failure_reason: nullableString,

  notes: z.array(noteSchema).optional(),
  decision: decisionSchema.nullable().optional(),
  finding: findingSchema.optional(),
  citations: z.array(citationSchema).optional(),
  visual: z.array(visualFrameSchema).optional(),
  corpus: z.string().optional()
})

export const backlogSchema = passthrough({
  run_id: z.string(),
  target: z.string(),
  note: z.string().optional(),
  corpus: z.string().optional(),
  increments: z.array(z.unknown())
})

// Candidates are a thinner shape on purpose: they carry prototype-side
// evidence only and have not had the treatment a backlog increment had, so
// they must not be able to acquire a band, a gate or a status by accident.
export const candidateSchema = passthrough({
  id: z.string(),
  domain: z.string(),
  title: z.string(),
  detail: z.string(),
  evidence: passthrough({}),
  verified: z.boolean()
})

export const deferredSchema = passthrough({
  run_id: z.string(),
  state: z.string(),
  note: z.string().optional(),
  deferredOn: z.string().optional(),
  deferredBy: z.string().optional(),
  deferredReason: z.string().optional(),
  revisitWhen: z.array(z.string()).optional(),
  capturedAgainst: z.record(z.string(), z.string()).optional(),
  candidates: z.array(candidateSchema)
})

export const corpusMetaSchema = passthrough({
  corpus: z.string(),
  run_id: z.string(),
  schemaVersion: z.number().int(),
  capturedOn: z.string(),
  pins: z.record(z.string(), passthrough({ sha: z.string() })),
  counts: z.record(z.string(), z.unknown()),
  images: z.record(z.string(), z.unknown()).optional()
})

const firstIssue = (error) => error.issues?.[0]

const describe = (issue) => {
  if (!issue) return 'failed validation'
  const path = issue.path.length ? `.${issue.path.join('.')}` : ''
  if (issue.code === 'invalid_type') {
    return `expected ${issue.expected} at ${path || '<root>'}, got ${issue.received ?? 'undefined'}`
  }
  return `${issue.message} at ${path || '<root>'}`
}

/**
 * Parse one increment, naming the increment id and the field path on failure.
 *
 * @param {unknown} raw - The increment object as read from the backlog
 * @param {number} index - Its position, used when the object has no usable id
 * @returns {object} The parsed increment, unknown keys preserved
 * @throws {TimError} PARSE, naming the id and the field
 */
export const parseIncrement = (raw, index) => {
  const result = incrementSchema.safeParse(raw)
  if (result.success) return result.data
  const id =
    typeof raw === 'object' && raw !== null && typeof raw.id === 'string'
      ? raw.id
      : `increments[${index}]`
  throw new TimError('PARSE', `${id}: ${describe(firstIssue(result.error))}`)
}

/**
 * Parse a whole backlog file, increment by increment, so the first bad
 * increment is named rather than the whole array being rejected at once.
 *
 * @param {unknown} raw - The parsed JSON of a backlog file
 * @returns {object} The backlog with every increment parsed
 * @throws {TimError} PARSE
 */
export const parseBacklog = (raw) => {
  const outer = backlogSchema.safeParse(raw)
  if (!outer.success) {
    throw new TimError('PARSE', `backlog: ${describe(firstIssue(outer.error))}`)
  }
  return {
    ...outer.data,
    increments: outer.data.increments.map(parseIncrement)
  }
}

/**
 * Parse deferred.json. Candidates never enter a count or a filter, so the
 * only job here is to prove they are the shape the report expects.
 *
 * @param {unknown} raw - The parsed JSON of a deferred file
 * @returns {object}
 * @throws {TimError} PARSE
 */
export const parseDeferred = (raw) => {
  const result = deferredSchema.safeParse(raw)
  if (result.success) return result.data
  throw new TimError('PARSE', `deferred: ${describe(firstIssue(result.error))}`)
}

/**
 * Parse .corpus-meta.json — the single source of every masthead fact.
 *
 * @param {unknown} raw - The parsed JSON of a corpus-meta file
 * @returns {object}
 * @throws {TimError} PARSE
 */
export const parseCorpusMeta = (raw) => {
  const result = corpusMetaSchema.safeParse(raw)
  if (result.success) return result.data
  throw new TimError(
    'PARSE',
    `corpus-meta: ${describe(firstIssue(result.error))}`
  )
}
