import { z } from 'zod'
import { TimError } from '../errors.js'

/** DESIGN 4.2's increment id shape, `inc-001` upward. */
export const INCREMENT_ID = /^inc-\d{3,}$/

const attemptSchema = z.looseObject({ n: z.number().int().positive() })

const headSchema = z.strictObject({
  sha: z.string().regex(/^[0-9a-f]{40}$/, 'must be a 40-character commit sha'),
  branch: z.string().min(1),
  dirty: z.boolean()
})

const incrementStateSchema = z.strictObject({
  phase: z.string().trim().min(1).optional(),
  // Both forms `startedIncrementIds` already reads (inc-005 D15): an array
  // of attempts, or a bare count.
  attempts: z
    .union([z.number().int().nonnegative(), z.array(attemptSchema)])
    .optional(),
  ticket: z.string().min(1).nullable().optional(),
  branch: z.string().min(1).nullable().optional(),
  plan: z.string().min(1).nullable().optional(),
  heads: z.record(z.string().min(1), headSchema).optional()
})

/**
 * `build/state.json`'s shape. Strict at every level, so a hand-edit that
 * lands on the wrong path is refused rather than silently ignored — the
 * "why" behind req-023. Fields later increments add (`holds`, commits, PRs,
 * CI, audits, acceptance, registered build runs) are deliberately absent:
 * each is added with its own writer when it is built.
 */
export const stateSchema = z.strictObject({
  schemaVersion: z.literal(1).optional(),
  increments: z.record(z.string().regex(INCREMENT_ID), incrementStateSchema)
})

/** The fields `tim backlog state set` may write. */
export const SETTABLE_FIELDS = [
  'phase',
  'attempts',
  'ticket',
  'branch',
  'plan',
  'heads'
]

/** One line of `build/journal.jsonl` (DESIGN 4.2's append-only journal). */
export const journalEntrySchema = z.strictObject({
  at: z.iso.datetime(),
  id: z.string().regex(INCREMENT_ID),
  note: z.string().trim().min(1),
  stage: z.string().min(1).optional(),
  by: z.string().min(1).optional()
})

// An unrecognized-key issue's own `path` names the object that holds the
// stray key, not the key itself (zod4's `keys` field does that), so the
// dotted path a reader needs — `increments.inc-001.phse` — is built by
// appending the key names to the object's path.
const dottedPath = (issue) => {
  const base = issue.path.join('.')
  if (issue.code === 'unrecognized_keys' && issue.keys?.length) {
    return [base, issue.keys.join(', ')].filter(Boolean).join('.')
  }
  return base
}

const messageFor = (path, error) => {
  const issue = error.issues?.[0]
  const location = issue ? dottedPath(issue) : ''
  const reason = issue?.message ?? 'failed validation'
  const locationPrefix = location ? `${location} ` : ''
  return `${path} would not be valid: ${locationPrefix}${reason}. Nothing changed.`
}

/**
 * Validate a whole `build/state.json` body before it is written.
 *
 * @param {unknown} parsed
 * @param {string} path - Named in the error
 * @returns {object}
 * @throws {TimError} PARSE
 */
export const validateState = (parsed, path) => {
  const result = stateSchema.safeParse(parsed)
  if (!result.success) {
    throw new TimError('PARSE', messageFor(path, result.error))
  }
  return result.data
}

/**
 * Validate one journal line before the whole file is written.
 *
 * @param {unknown} parsed
 * @param {string} path - Named in the error
 * @returns {object}
 * @throws {TimError} PARSE
 */
export const validateJournalEntry = (parsed, path) => {
  const result = journalEntrySchema.safeParse(parsed)
  if (!result.success) {
    throw new TimError('PARSE', messageFor(path, result.error))
  }
  return result.data
}
