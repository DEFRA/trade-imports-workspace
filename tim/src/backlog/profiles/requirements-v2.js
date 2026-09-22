import { join } from 'node:path'
import { z } from 'zod'
import { TimError } from '../../errors.js'
import {
  fail,
  requireText,
  requireFrom,
  requireNonEmptyArray,
  describeIssue,
  passthrough,
  refuseUnknownKeys,
  refuseUnbuiltFields,
  refuseRefusedKeys
} from './intake.js'
import { ATOM_FIELDS, REFUSED_FIELDS } from './requirements-v2.classes.js'
import { parseIncrement } from './requirements-v2-increments.js'
import { checkLedger, REQUIREMENT_ID } from './requirements-v2.ledger.js'

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
  provenance: z.unknown().nullable(),
  needs: z.array(z.string()).optional(),
  supersededBy: z.string().regex(REQUIREMENT_ID).nullable().optional()
})

export const v2BacklogSchema = passthrough({
  schemaVersion: z.literal(2),
  programme: z.string(),
  profile: z.literal('requirements-v2'),
  requirements: z.array(z.unknown()),
  increments: z.array(z.unknown()).optional()
})

const firstIssue = (error) => error.issues?.[0]

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
  if (!result.success) {
    const id =
      typeof raw === 'object' && raw !== null && typeof raw.id === 'string'
        ? raw.id
        : `requirements[${index}]`
    throw new TimError(
      'PARSE',
      `${id}: ${describeIssue(firstIssue(result.error))}`
    )
  }
  const row = result.data
  const where = typeof row.id === 'string' ? row.id : `requirements[${index}]`
  refuseRefusedKeys({ row, where, refused: REFUSED_FIELDS })
  return row
}

/**
 * Parse a whole requirements-v2 backlog file: every atom, and — when
 * present — every increment, each refusing a row carrying a key DESIGN
 * 3.14 names as absent by design (D8, D26), so a re-parse never silently
 * carries one through, whichever pass triggered it. Also checks the
 * ledger (`questions[]`, `decisions[]` and every atom's `needs`) via
 * `checkLedger` — see its own doc comment.
 *
 * @param {unknown} raw - The parsed JSON of a backlog file
 * @returns {object} The backlog with every atom and increment parsed
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
  const resolved = {
    ...outer.data,
    requirements: outer.data.requirements.map(parseAtom),
    ...(outer.data.increments !== undefined
      ? { increments: outer.data.increments.map(parseIncrement) }
      : {})
  }
  return checkLedger(resolved)
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

const stringArray = (value) => (Array.isArray(value) ? value : [])

const isInvalidNeed = (entry) =>
  typeof entry !== 'string' || entry.trim() === ''

const validateNeeds = (raw, file) => {
  if (raw.needs === undefined) return []
  if (!Array.isArray(raw.needs)) fail(file, '"needs" must be a list.')
  if (raw.needs.some(isInvalidNeed)) {
    fail(file, '"needs" holds an entry that is not a non-empty string.')
  }
  return raw.needs
}

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

  refuseUnknownKeys({
    raw,
    file,
    known: ATOM_FIELDS,
    refused: REFUSED_FIELDS,
    what: 'requirement atom'
  })
  refuseUnbuiltFields({ raw, file, known: ATOM_FIELDS })

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
    needs: validateNeeds(raw, file),
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
 * The `requirements-v2` profile's **atoms** collection: DESIGN section
 * 3.4's atom shape, expressed as the hooks the generic core in
 * `backlog/ingest.js` calls. See `tim/src/parity/profile-v1.js` for the
 * sibling parity definition and `./requirements-v2-increments.js` for the
 * sibling increments collection.
 */
export const requirementsV2 = {
  key: 'requirements-v2',
  collection: 'atoms',
  itemsKey: 'requirements',
  idPrefix: 'req-',
  identityField: 'key',
  identityOf: (item) => item.key,
  slugOf: (item) => item.key,
  itemsDir: (profile) => join(profile.paths.workarea, 'distil', 'atoms'),
  // Every atom id an existing increment's `members` claims, mapped to the
  // increment keys that claim it. The atoms pass has no rule of its own
  // over `status`, so a `proposed` atom's file going away is otherwise
  // free to drop — but a claimed atom's id would then dangle in
  // `increments[]` the moment this pass writes, before the increments
  // pass ever runs again to notice. checkRows below refuses that write.
  //
  // `claimsByAtomKey` carries the same claim keyed by the atom's *key*
  // rather than its old id — `--replace` renumbers every atom by position,
  // so a claimed atom's id can survive as a string (some row now holds it)
  // while pointing at a completely different atom. checkRows compares the
  // claimed atom's id before and after the rebuild to catch that.
  context: (profile, existing) => {
    const keyById = new Map(
      (existing?.requirements ?? []).map((row) => [row.id, row.key])
    )
    const claimsByAtomId = new Map()
    const claimsByAtomKey = new Map()
    for (const row of existing?.increments ?? []) {
      for (const atomId of row.members ?? []) {
        claimsByAtomId.set(atomId, [
          ...(claimsByAtomId.get(atomId) ?? []),
          row.key
        ])
        const atomKey = keyById.get(atomId)
        if (!atomKey) continue
        const claim = claimsByAtomKey.get(atomKey) ?? {
          oldId: atomId,
          incrementKeys: []
        }
        claimsByAtomKey.set(atomKey, {
          oldId: atomId,
          incrementKeys: [...claim.incrementKeys, row.key]
        })
      }
    }
    return { claimsByAtomId, claimsByAtomKey, keyById }
  },
  validateItem: ({ raw, file }) => validateAtom({ raw, file }),
  sortKey: (item) => [item.slice, item.file],
  references: [
    { field: 'dependsOn', shape: 'string', scope: 'batch', verifyIds: true },
    { field: 'relatedTo', shape: 'string', scope: 'batch', verifyIds: true }
  ],
  frozen: { field: 'statement', compose: (item) => item.statement },
  cycleEdges: (rows) => rows.map((row) => [row.id, row.dependsOn ?? []]),
  bornStatus: () => STATUS_PROPOSED,
  isRuled: (row) => row.status !== STATUS_PROPOSED,
  requireVerification: () => false,
  checkRows: ({ rows, context }) => {
    const presentIds = new Set(rows.map((row) => row.id))
    const goneButClaimed = [
      ...(context.claimsByAtomId?.entries() ?? [])
    ].filter(([atomId]) => !presentIds.has(atomId))
    if (goneButClaimed.length) {
      throw new TimError(
        'USAGE',
        goneButClaimed
          .map(([atomId, incrementKeys]) => {
            const atomKey = context.keyById?.get(atomId) ?? atomId
            const owners =
              incrementKeys.length === 1 ? 'that increment' : 'those increments'
            return `${atomId} (${atomKey}) is claimed by ${incrementKeys.join(', ')}, but its atom file is gone. Put the file back, or remove it from ${owners} and run \`tim backlog ingest <p> --increments\` first.`
          })
          .join(' ')
      )
    }

    const idByKey = new Map(rows.map((row) => [row.key, row.id]))
    const renumbered = [...(context.claimsByAtomKey?.entries() ?? [])].filter(
      ([atomKey, claim]) => idByKey.get(atomKey) !== claim.oldId
    )
    if (renumbered.length) {
      throw new TimError(
        'USAGE',
        renumbered
          .map(
            ([atomKey, claim]) =>
              `${atomKey} is claimed by ${claim.incrementKeys.join(', ')}, but --replace gave it a different id. Re-run without --replace, or run the increments pass again afterwards so the claim tracks the new id.`
          )
          .join(' ')
      )
    }
  },
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
  bornExtras: ({ item }) => ({ needs: item.needs }),
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
      `"${field}" names "${named}", which is this atom itself.`,
    cycle: (path) =>
      `A dependsOn cycle: ${path.map((node) => `${node.key} ("${node.title}")`).join(' → ')}.`
  }
}
