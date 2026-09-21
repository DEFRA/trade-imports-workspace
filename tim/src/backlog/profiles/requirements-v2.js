import { join } from 'node:path'
import { z } from 'zod'
import { TimError } from '../../errors.js'

/**
 * DESIGN section 3.4's ten requirement kinds. Anything else is a typo.
 */
export const KINDS = [
  'capability',
  'rule',
  'data',
  'content',
  'integration',
  'reference-data',
  'non-functional',
  'hygiene',
  'constraint',
  'spike'
]

// Additive-tolerant, subtractive-strict — the same rule parity's schema
// follows (parity/schema.js). Unknown keys pass through untouched so a later
// increment (rule, verify-record, combine) can add fields this one does not
// know about; a missing or retyped required key is a hard, named error.
const passthrough = (shape) => z.object(shape).catchall(z.unknown())

export const atomSchema = passthrough({
  id: z.string(),
  key: z.string(),
  slice: z.string(),
  kind: z.enum(KINDS),
  title: z.string(),
  statement: z.string(),
  why: z.string(),
  acceptance: z.array(z.unknown()).min(1),
  falsifiedBy: z.string(),
  sources: z.array(z.unknown()),
  surface: passthrough({ repos: z.array(z.string()) }),
  dependsOn: z.array(z.string()),
  relatedTo: z.array(z.string()),
  status: z.string(),
  provenance: z.unknown().nullable()
})

export const v2BacklogSchema = passthrough({
  schemaVersion: z.literal(2),
  programme: z.string(),
  profile: z.literal('requirements-v2'),
  requirements: z.array(z.unknown())
})

const firstIssue = (error) => error.issues?.[0]

const describeIssue = (issue) => {
  if (!issue) return 'failed validation'
  const path = issue.path.length ? `.${issue.path.join('.')}` : ''
  if (issue.code === 'invalid_type') {
    return `expected ${issue.expected} at ${path || '<root>'}, got ${issue.input ?? 'undefined'}`
  }
  return `${issue.message} at ${path || '<root>'}`
}

/**
 * Parse one atom row, naming the atom id and the field path on failure.
 *
 * @param {unknown} raw - The row as it will be written to backlog.json
 * @param {number} index - Its position, used when the row has no usable id
 * @returns {object} The parsed row, unknown keys preserved
 * @throws {TimError} PARSE, naming the id and the field
 */
export const parseAtom = (raw, index) => {
  const result = atomSchema.safeParse(raw, { reportInput: true })
  if (result.success) return result.data
  const id =
    typeof raw === 'object' && raw !== null && typeof raw.id === 'string'
      ? raw.id
      : `requirements[${index}]`
  throw new TimError(
    'PARSE',
    `${id}: ${describeIssue(firstIssue(result.error))}`
  )
}

/**
 * Parse a whole requirements-v2 backlog file, atom by atom, so the first bad
 * atom is named rather than the whole array being rejected at once.
 *
 * @param {unknown} raw - The parsed JSON of a backlog file
 * @returns {object} The backlog with every atom parsed
 * @throws {TimError} PARSE
 */
export const parseV2Backlog = (raw) => {
  const outer = v2BacklogSchema.safeParse(raw, { reportInput: true })
  if (!outer.success) {
    throw new TimError(
      'PARSE',
      `backlog: ${describeIssue(firstIssue(outer.error))}`
    )
  }
  return {
    ...outer.data,
    requirements: outer.data.requirements.map(parseAtom)
  }
}

/**
 * A verifier's record of having looked at an atom.
 *
 * Read from `provenance.verifiedBy` and nowhere else — DESIGN 3.4's
 * Provenance shape gives that field no other home, unlike parity's finding
 * files, which grew a top-level fallback over time.
 *
 * @param {object} raw - An atom file as parsed
 * @returns {object|string|null}
 */
export const verificationOf = (raw) => raw?.provenance?.verifiedBy ?? null

const fail = (file, message) => {
  throw new TimError('PARSE', `${file}: ${message}`)
}

const requireText = (value, field, file) => {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(file, `"${field}" is missing or empty.`)
  }
  return value.trim()
}

const requireFrom = (value, field, allowed, file) => {
  if (!allowed.includes(value)) {
    fail(
      file,
      `"${field}" is "${value ?? 'missing'}". This programme allows: ${allowed.join(', ')}.`
    )
  }
  return value
}

const requireNonEmptyArray = (value, field, file) => {
  if (!Array.isArray(value) || value.length === 0) {
    fail(file, `"${field}" must be a list with at least one entry.`)
  }
  return value
}

const stringArray = (value) => (Array.isArray(value) ? value : [])

/**
 * Read and validate one authored requirement atom file.
 *
 * Every refusal names the file and the field, the same contract parity's
 * finding validator keeps.
 *
 * @param {object} args
 * @param {object} args.raw - The parsed atom file
 * @param {string} args.file - Its file name, for the error message
 * @returns {object} The atom, normalised
 * @throws {TimError} PARSE, naming the file and the field
 */
export const validateAtom = ({ raw, file }) => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    fail(file, 'is not a requirement atom object.')
  }

  const key = requireText(raw.key, 'key', file)
  const slice = requireText(raw.slice, 'slice', file)
  const kind = requireFrom(raw.kind, 'kind', KINDS, file)
  const title = requireText(raw.title, 'title', file)
  const statement = requireText(raw.statement, 'statement', file)
  const why = requireText(raw.why, 'why', file)
  const falsifiedBy = requireText(raw.falsifiedBy, 'falsifiedBy', file)
  requireNonEmptyArray(raw.acceptance, 'acceptance', file)
  requireNonEmptyArray(raw.sources, 'sources', file)

  const surface = raw.surface
  if (
    typeof surface !== 'object' ||
    surface === null ||
    Array.isArray(surface)
  ) {
    fail(file, '"surface" must be an object.')
  }
  if (!Array.isArray(surface.repos)) {
    fail(file, '"surface.repos" must be a list.')
  }

  if (raw.dependsOn !== undefined && !Array.isArray(raw.dependsOn)) {
    fail(file, '"dependsOn" must be a list.')
  }
  if (raw.relatedTo !== undefined && !Array.isArray(raw.relatedTo)) {
    fail(file, '"relatedTo" must be a list.')
  }

  return {
    file,
    key,
    slice,
    kind,
    title,
    statement,
    why,
    acceptance: raw.acceptance,
    falsifiedBy,
    sources: raw.sources,
    surface,
    dependsOn: stringArray(raw.dependsOn),
    relatedTo: stringArray(raw.relatedTo),
    provenance: raw.provenance ?? null,
    // undefined, not verificationOf's own null: JSON.stringify drops an
    // undefined key outright, so an unverified atom's row carries no
    // "verification" key at all rather than a written-out null.
    verification: verificationOf(raw) ?? undefined
  }
}

/** The status a newborn atom is given. See parity's sibling `INITIAL_STATUS`. */
const STATUS_PROPOSED = 'proposed'

const tally = (items, key) =>
  items.reduce(
    (counts, item) => ({
      ...counts,
      [item[key]]: (counts[item[key]] ?? 0) + 1
    }),
    {}
  )

/**
 * The `requirements-v2` profile definition: DESIGN section 3.4's atom shape,
 * expressed as the hooks the generic core in `backlog/ingest.js` calls. See
 * `tim/src/parity/profile-v1.js` for the sibling parity definition and
 * DESIGN section 4.1's hook table for why each choice below is what it is.
 */
export const requirementsV2 = {
  key: 'requirements-v2',
  itemsKey: 'requirements',
  idPrefix: 'req-',
  identityField: 'key',
  identityOf: (item) => item.key,
  slugOf: (item) => item.key,
  itemsDir: (profile) => join(profile.paths.workarea, 'distil', 'atoms'),
  context: () => ({}),
  validateItem: ({ raw, file }) => validateAtom({ raw, file }),
  sortKey: (item) => [item.slice, item.file],
  references: [
    { field: 'dependsOn', shape: 'string' },
    { field: 'relatedTo', shape: 'string' }
  ],
  frozen: { field: 'statement', compose: (item) => item.statement },
  bornStatus: () => STATUS_PROPOSED,
  isRuled: (row) => row.status !== STATUS_PROPOSED,
  requireVerification: () => false,
  rowFrom: ({ item, id }) => ({
    id,
    key: item.key,
    slice: item.slice,
    kind: item.kind,
    title: item.title,
    statement: item.statement,
    why: item.why,
    acceptance: item.acceptance,
    falsifiedBy: item.falsifiedBy,
    sources: item.sources,
    surface: item.surface,
    dependsOn: item.dependsOn,
    relatedTo: item.relatedTo,
    provenance: item.provenance
  }),
  bornExtras: () => ({}),
  foldOnto: () => ({}),
  header: ({ profile }) => ({
    schemaVersion: 2,
    programme: profile.id,
    profile: 'requirements-v2'
  }),
  parseBacklog: parseV2Backlog,
  parseItem: parseAtom,
  summary: ({ items, dir }) => ({
    atomsDir: dir,
    byKind: tally(items, 'kind'),
    bySlice: tally(items, 'slice')
  }),
  messages: {
    itemsDirMissing: (dir) =>
      `No atoms at ${dir}. An agent writes one JSON file per atom there.`,
    replaceBlocked: (ids) =>
      `--replace would discard rulings on ${ids.length} atoms: ${ids.join(', ')}. Re-run without it to merge, or move the backlog aside first.`,
    droppedRuling: ({ dir, rows }) =>
      `These atoms hold a ruling but their files are no longer in ${dir}: ${rows.map((row) => row.key).join(', ')}. Put the files back, or clear the rulings first.`,
    frozenChanged: (entries) =>
      `statement is frozen at first ingest and these atoms would change it: ${entries.join(', ')}. It is the oracle a later rewrite is checked against, so a changed statement is a new variant atom, never an edit.`,
    unverified: (files) =>
      `${files.length} atoms carry no verification record and this programme requires one before a first ingest: ${files.join(', ')}.`,
    referenceNoId: (field) =>
      `"${field}" holds an entry that is not a key. Name the other atom by its key.`,
    referenceUnknown: (field, named) =>
      `"${field}" names "${named}", which is no atom in this run. Use the other atom's key.`,
    referenceSelf: (field, named) =>
      `"${field}" names "${named}", which is this atom itself.`
  }
}
