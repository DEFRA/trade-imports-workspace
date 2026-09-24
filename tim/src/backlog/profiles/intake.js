import { z } from 'zod'
import { TimError } from '../../errors.js'

/**
 * Throw PARSE, naming the file (or the row's identity) and the reason.
 *
 * @param {string} file
 * @param {string} message
 * @throws {TimError} PARSE
 */
export const fail = (file, message) => {
  throw new TimError('PARSE', `${file}: ${message}`)
}

export const requireText = (value, field, file) => {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(file, `"${field}" is missing or empty.`)
  }
  return value.trim()
}

export const requireFrom = (value, field, allowed, file) => {
  if (!allowed.includes(value)) {
    fail(
      file,
      `"${field}" is "${value ?? 'missing'}". This programme allows: ${allowed.join(', ')}.`
    )
  }
  return value
}

export const requireNonEmptyArray = (value, field, file) => {
  if (!Array.isArray(value) || value.length === 0) {
    fail(file, `"${field}" must be a list with at least one entry.`)
  }
  return value
}

/**
 * Describe a zod issue in one line, naming the actual bad value rather than
 * the literal "undefined".
 *
 * @param {object} [issue]
 * @returns {string}
 */
export const describeIssue = (issue) => {
  if (!issue) return 'failed validation'
  const path = issue.path.length ? `.${issue.path.join('.')}` : ''
  if (issue.code === 'invalid_type') {
    return `expected ${issue.expected} at ${path || '<root>'}, got ${issue.input ?? 'undefined'}`
  }
  return `${issue.message} at ${path || '<root>'}`
}

// Additive-tolerant, subtractive-strict. Unknown keys pass through untouched
// so a later increment (rule, verify-record, combine) can add fields this one
// does not know about; a missing or retyped required key is a hard, named
// error.
export const passthrough = (shape) => z.object(shape).catchall(z.unknown())

/**
 * Refuse any key on an authored file that is not a known v2 field.
 *
 * Two-tier: a key DESIGN 3.14 names as absent by design (a recipe,
 * executor, run-state, repo how-field or layer field) is refused with its
 * own home sentence; any other unknown key is refused generically, listing
 * the fields this collection knows.
 *
 * @param {object} args
 * @param {object} args.raw - The authored file, as parsed JSON
 * @param {string} args.file
 * @param {object} args.known - The collection's class map (field -> {class, persisted})
 * @param {object} args.refused - REFUSED_FIELDS: field -> home sentence
 * @param {string} args.what - What this collection's items are, for the message ("requirement atom")
 * @throws {TimError} PARSE
 */
export const refuseUnknownKeys = ({ raw, file, known, refused, what }) => {
  for (const key of Object.keys(raw)) {
    if (Object.hasOwn(known, key)) continue
    if (Object.hasOwn(refused, key)) fail(file, refused[key])
    fail(
      file,
      `"${key}" is not a field of a ${what}. Known fields: ${Object.keys(known).sort().join(', ')}.`
    )
  }
}

/**
 * Refuse an authored key this collection classes but does not yet persist,
 * unless ingest itself is the field's eventual owner.
 *
 * A `persisted: false` entry in the class map names the later command that
 * will accept the field — `needs` carried exactly this risk until this
 * increment gave it a writer. Until that later command exists, authoring
 * the field would silently vanish on every ingest, so it is refused by
 * name instead — except when the owner is ingest itself
 * (e.g. a derived field a later ingest pass computes), which nothing today
 * authors directly.
 *
 * @param {object} args
 * @param {object} args.raw - The authored file, as parsed JSON
 * @param {string} args.file
 * @param {object} args.known - The collection's class map (field -> {class, persisted, owner})
 * @throws {TimError} PARSE
 */
export const refuseUnbuiltFields = ({ raw, file, known }) => {
  for (const key of Object.keys(raw)) {
    const entry = known[key]
    if (!entry || entry.persisted !== false) continue
    if (entry.owner?.includes('ingest')) continue
    fail(
      file,
      `"${key}" is not written by this increment yet. ${entry.owner} will accept it.`
    )
  }
}

/**
 * Refuse a key DESIGN 3.14 names as absent by design on a row this writer
 * reads in or writes out.
 *
 * A schema's `.catchall` keeps a row tolerant of a *neutral* stray key —
 * one a later, unbuilt command will add — but a key named here is not
 * neutral: it is a recipe, executor, run-state, repo how-field or layer
 * field that must never reach a saved backlog, however it got onto the row.
 *
 * @param {object} args
 * @param {object} args.row
 * @param {string} args.where - The row's id, or a positional fallback
 * @param {object} args.refused - REFUSED_FIELDS: field -> home sentence
 * @throws {TimError} PARSE
 */
export const refuseRefusedKeys = ({ row, where, refused }) => {
  for (const key of Object.keys(row)) {
    if (Object.hasOwn(refused, key)) fail(where, refused[key])
  }
}
