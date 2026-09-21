import { join } from 'node:path'
import { z } from 'zod'
import { TimError } from '../../errors.js'
import { startedIncrementIds } from '../state.js'
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
import { INCREMENT_FIELDS, REFUSED_FIELDS } from './requirements-v2.classes.js'
import { parseV2Backlog } from './requirements-v2.js'

/** DESIGN 3.5's `class` enum. */
export const INCREMENT_CLASSES = [
  'feat',
  'fix',
  'chore',
  'refactor',
  'test',
  'docs'
]

/** DESIGN 3.5's `checkpoint` enum, `null` aside. */
export const CHECKPOINTS = ['halt-after', 'walkthrough']

/** DESIGN 3.5's `size.class` enum. */
export const SIZE_CLASSES = ['S', 'M', 'L']

/** The key prefix reserved for a synthesised solo increment (D12). */
export const SOLO_KEY_PREFIX = 'solo--'

/**
 * An increment is protected once it has a recorded build attempt, or a
 * status only a decision or the build loop can put there (D14). `blocked`
 * and `superseded` are derivations, not rulings, so neither is here.
 */
export const RULED_STATUSES = new Set(['deferred', 'dropped', 'done'])

export const incrementSchema = passthrough({
  id: z.string(),
  key: z.string(),
  title: z.string().optional(),
  outcome: z.string().optional(),
  why: z.string(),
  members: z.array(z.string()).min(1),
  class: z.string(),
  surface: z.unknown(),
  milestone: z.unknown().nullable(),
  dependsOn: z.array(z.string()),
  sequence: z.unknown().nullable(),
  needs: z.array(z.string()),
  checkpoint: z.unknown().nullable(),
  size: z.unknown(),
  combination: z.unknown().nullable(),
  status: z.string(),
  doneBy: z.unknown().nullable(),
  statusNote: z.string().nullable()
})

const firstIssue = (error) => error.issues?.[0]

/**
 * Parse one increment row, naming its id and the field path on failure, and
 * refusing a row carrying a key DESIGN 3.14 names as absent by design (D26).
 *
 * @param {unknown} raw
 * @param {number} index
 * @returns {object}
 * @throws {TimError} PARSE
 */
export const parseIncrement = (raw, index) => {
  const result = incrementSchema.safeParse(raw, { reportInput: true })
  if (!result.success) {
    const id =
      typeof raw === 'object' && raw !== null && typeof raw.id === 'string'
        ? raw.id
        : `increments[${index}]`
    throw new TimError(
      'PARSE',
      `${id}: ${describeIssue(firstIssue(result.error))}`
    )
  }
  const row = result.data
  const where = typeof row.id === 'string' ? row.id : `increments[${index}]`
  refuseRefusedKeys({ row, where, refused: REFUSED_FIELDS })
  return row
}

/**
 * Read and validate one authored increment file (D21).
 *
 * @param {object} args
 * @param {object} args.raw
 * @param {string} args.file
 * @returns {object} The increment, normalised
 * @throws {TimError} PARSE, naming the file and the field
 */
export const validateIncrement = ({ raw, file }) => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    fail(file, 'is not a requirement increment object.')
  }

  refuseUnknownKeys({
    raw,
    file,
    known: INCREMENT_FIELDS,
    refused: REFUSED_FIELDS,
    what: 'requirement increment'
  })
  refuseUnbuiltFields({ raw, file, known: INCREMENT_FIELDS })

  const key = requireText(raw.key, 'key', file)
  if (key.startsWith(SOLO_KEY_PREFIX)) {
    fail(
      file,
      `"key" starts with "${SOLO_KEY_PREFIX}", which is reserved for a synthesised solo increment. Choose a different key.`
    )
  }
  const title = requireText(raw.title, 'title', file)
  const outcome = requireText(raw.outcome, 'outcome', file)
  const why = requireText(raw.why, 'why', file)
  requireNonEmptyArray(raw.members, 'members', file)
  const changeClass = requireFrom(raw.class, 'class', INCREMENT_CLASSES, file)

  if (!Object.hasOwn(raw, 'milestone')) {
    fail(file, '"milestone" is missing. It may be null.')
  }
  if (!Object.hasOwn(raw, 'checkpoint')) {
    fail(file, '"checkpoint" is missing. It may be null.')
  }
  if (raw.checkpoint !== null && !CHECKPOINTS.includes(raw.checkpoint)) {
    fail(
      file,
      `"checkpoint" is "${raw.checkpoint}". Allowed: null, ${CHECKPOINTS.join(', ')}.`
    )
  }

  const size = raw.size
  if (typeof size !== 'object' || size === null || Array.isArray(size)) {
    fail(file, '"size" must be an object with "class" and "basis".')
  }
  requireFrom(size.class, 'size.class', SIZE_CLASSES, file)
  requireText(size.basis, 'size.basis', file)

  const combination = raw.combination
  if (
    typeof combination !== 'object' ||
    combination === null ||
    Array.isArray(combination)
  ) {
    fail(file, '"combination" must be an object with a non-empty "why".')
  }
  requireText(combination.why, 'combination.why', file)
  if (combination.rules !== undefined && !Array.isArray(combination.rules)) {
    fail(file, '"combination.rules" must be a list.')
  }

  if (raw.dependsOn !== undefined && !Array.isArray(raw.dependsOn)) {
    fail(file, '"dependsOn" must be a list.')
  }

  return {
    file,
    key,
    title,
    outcome,
    why,
    members: raw.members,
    class: changeClass,
    milestone: raw.milestone ?? null,
    dependsOn: Array.isArray(raw.dependsOn) ? raw.dependsOn : [],
    sequence: raw.sequence ?? null,
    checkpoint: raw.checkpoint ?? null,
    size: { class: size.class, basis: size.basis },
    combination: {
      why: combination.why,
      rules: Array.isArray(combination.rules) ? combination.rules : [],
      ...(combination.risk !== undefined ? { risk: combination.risk } : {}),
      ...(combination.attributability !== undefined
        ? { attributability: combination.attributability }
        : {}),
      ...(combination.reverseEffects !== undefined
        ? { reverseEffects: combination.reverseEffects }
        : {})
    }
  }
}

/**
 * The key of the earliest atom in a `supersededBy` chain leading to this
 * atom — the root a solo's key is built from (D12), so a ruling's variant
 * never changes the solo's key.
 *
 * @param {object} atomRow
 * @param {object[]} atomRows
 * @returns {string}
 */
export const rootKeyOf = (atomRow, atomRows) => {
  const supersededFrom = new Map()
  for (const row of atomRows) {
    if (row.supersededBy) supersededFrom.set(row.supersededBy, row)
  }
  const visited = new Set([atomRow.id])
  let current = atomRow
  while (supersededFrom.has(current.id)) {
    const next = supersededFrom.get(current.id)
    if (visited.has(next.id)) return atomRow.key
    visited.add(next.id)
    current = next
  }
  return current.key
}

const SOLO_SMALL_MAX = 3
const SOLO_MEDIUM_MAX = 8
const [SIZE_SMALL, SIZE_MEDIUM, SIZE_LARGE] = SIZE_CLASSES

const soloSizeFor = (atomRow) => {
  const count = (atomRow.acceptance ?? []).length
  const sizeClass =
    count <= SOLO_SMALL_MAX
      ? SIZE_SMALL
      : count <= SOLO_MEDIUM_MAX
        ? SIZE_MEDIUM
        : SIZE_LARGE
  const criteria = count === 1 ? 'criterion' : 'criteria'
  return { class: sizeClass, basis: `${count} ${criteria}, 1 atom` }
}

const soloItemFor = (atomRow, atomRows) => ({
  file: null,
  key: `${SOLO_KEY_PREFIX}${rootKeyOf(atomRow, atomRows)}`,
  title: undefined,
  outcome: undefined,
  why: atomRow.why,
  members: [atomRow.id],
  class: atomRow.kind === 'hygiene' ? 'chore' : 'feat',
  milestone: null,
  dependsOn: [],
  sequence: null,
  checkpoint: null,
  size: soloSizeFor(atomRow),
  combination: null,
  edgeChecks: []
})

/**
 * Where a `supersededBy` chain leads: the id of the atom nothing else has
 * superseded. A reference naming any atom in the chain resolves here, so a
 * ruling's variant is claimed without the combiner having to edit the file
 * (D12). A chain that loops back on itself stops and resolves to the atom
 * it started from — a `rule` bug, not something to resolve past.
 *
 * @param {string} atomId
 * @param {Map<string, object>} byId
 * @returns {string}
 */
const forwardResolve = (atomId, byId) => {
  const visited = new Set([atomId])
  let current = byId.get(atomId)
  while (current?.supersededBy) {
    if (visited.has(current.supersededBy)) return atomId
    visited.add(current.supersededBy)
    current = byId.get(current.supersededBy)
  }
  return current?.id ?? atomId
}

const resolvedMemberIds = (item, atomTable) =>
  (item.members ?? [])
    .map((raw) => atomTable.get(String(raw).trim()))
    .filter(Boolean)

/**
 * One synthesised increment per adopted atom that no authored increment
 * claims (D11, req-013).
 *
 * A claim is matched on the atom's id: an authored `members` entry is
 * normalised through `atomTable`, which holds every atom's key and its id.
 *
 * @param {object} args
 * @param {object[]} args.authoredItems
 * @param {object[]} args.atomRows
 * @param {Map<string, string>} args.atomTable
 * @returns {object[]} Solo items, sorted by key
 */
export const soloIncrementsFor = ({ authoredItems, atomRows, atomTable }) => {
  const claimed = new Set()
  for (const item of authoredItems) {
    for (const atomId of resolvedMemberIds(item, atomTable)) claimed.add(atomId)
  }
  return atomRows
    .filter((row) => row.status === 'adopted' && !claimed.has(row.id))
    .map((row) => soloItemFor(row, atomRows))
    .sort((a, b) => a.key.localeCompare(b.key))
}

/**
 * The authored items plus one synthesised solo per unclaimed adopted atom,
 * run before ids are assigned (D11).
 *
 * Also records, on `context`, which increment (by key) claims each atom —
 * `dependsOn` lifting (D22) needs that whole-batch fact and this is the one
 * pass over every item's `members` that already has it in hand.
 *
 * @param {object} args
 * @returns {object[]}
 */
export const expandItems = ({ items, context }) => {
  const solos = soloIncrementsFor({
    authoredItems: items,
    atomRows: context.atomRows,
    atomTable: context.atomTable
  })

  const membership = new Map()
  for (const item of items) {
    for (const atomId of resolvedMemberIds(item, context.atomTable)) {
      membership.set(atomId, item.key)
    }
  }
  for (const solo of solos) membership.set(solo.members[0], solo.key)
  context.membershipKeyByAtomId = membership

  return [...items, ...solos]
}

const CONTRIBUTING_EXCLUDED_STATUSES = new Set([
  'superseded',
  'parked',
  'rejected'
])

const memberRowsFor = (item, context) => {
  const byId = new Map((context.atomRows ?? []).map((row) => [row.id, row]))
  return (item.members ?? []).map((id) => byId.get(id)).filter(Boolean)
}

/**
 * The union of every non-excluded member atom's `needs`, sorted (DESIGN
 * 3.10). A member that is `superseded`, `parked` or `rejected` no longer
 * contributes its own needs. `rule` calls this with the same `{atomRows}`
 * shape ingest builds it with, so a recomputed row after a ruling matches
 * what a re-ingest would derive (T-I3).
 *
 * @param {object} item - An increment row (its `members`)
 * @param {{atomRows: object[]}} context
 * @returns {string[]}
 */
export const needsFor = (item, context) => {
  const rows = memberRowsFor(item, context).filter(
    (row) => !CONTRIBUTING_EXCLUDED_STATUSES.has(row.status)
  )
  const needs = rows.flatMap((row) =>
    Array.isArray(row.needs) ? row.needs : []
  )
  return [...new Set(needs)].sort()
}

/**
 * `blocked` when the increment has any need or a `disputed` member,
 * otherwise `todo` (DESIGN 3.9).
 *
 * @param {object} item - An increment row (its `members`)
 * @param {{atomRows: object[]}} context
 * @returns {'blocked'|'todo'}
 */
export const bornStatusFor = (item, context) => {
  const hasDisputedMember = memberRowsFor(item, context).some(
    (row) => row.status === 'disputed'
  )
  return needsFor(item, context).length > 0 || hasDisputedMember
    ? 'blocked'
    : 'todo'
}

const surfaceFor = (item, context) => {
  const repos = new Set()
  const areas = new Set()
  for (const row of memberRowsFor(item, context)) {
    for (const repo of row.surface?.repos ?? []) repos.add(repo)
    if (row.surface?.area) areas.add(row.surface.area)
  }
  return { repos: [...repos].sort(), areas: [...areas].sort() }
}

/**
 * Each member atom's `dependsOn` atom ids, mapped to the increment that
 * owns them; an edge inside this increment is dropped, one pointing
 * outside is unioned with the authored `dependsOn` (D22).
 *
 * `tables.batch` — the id/key table this ingest run already built to
 * resolve every other reference — is what turns the owning increment's key
 * into its id; an atom claimed by no increment in this run contributes no
 * edge, rather than being refused (that is the membership check's job).
 *
 * @param {object} args
 * @param {object} args.item - A resolved increment item (dependsOn already ids)
 * @param {object} args.context
 * @param {{batch: Map<string, string>}} args.tables
 * @returns {string[]} Sorted, deduplicated increment ids
 */
export const liftDependencies = ({ item, context, tables }) => {
  const ownId = tables.batch.get(item.key)
  const lifted = new Set()
  for (const memberRow of memberRowsFor(item, context)) {
    for (const targetAtomId of memberRow.dependsOn ?? []) {
      const survivorId = context.atomTable?.get(targetAtomId) ?? targetAtomId
      const owningKey = context.membershipKeyByAtomId?.get(survivorId)
      if (!owningKey) continue
      const owningId = tables.batch.get(owningKey)
      if (!owningId || owningId === ownId) continue
      lifted.add(owningId)
    }
  }
  const union = new Set(item.dependsOn ?? [])
  for (const id of lifted) union.add(id)
  union.delete(ownId)
  return [...union].sort()
}

const claimsFor = (rows) => {
  const counts = new Map()
  for (const row of rows) {
    for (const memberId of row.members ?? []) {
      counts.set(memberId, (counts.get(memberId) ?? 0) + 1)
    }
  }
  return counts
}

const claimantsOf = (atomId, rows) =>
  rows
    .filter((row) => (row.members ?? []).includes(atomId))
    .map((row) => row.key)

/**
 * Every adopted atom is in exactly one increment (D13, req-013).
 *
 * @param {object} args
 * @param {object[]} args.rows
 * @param {object} args.context
 * @throws {TimError} USAGE, naming the atom's key and every increment that claims it
 */
export const checkOneIncrementPerAtom = ({ rows, context }) => {
  const adopted = (context.atomRows ?? []).filter(
    (row) => row.status === 'adopted'
  )
  const counts = claimsFor(rows)
  const invalid = adopted.filter((row) => (counts.get(row.id) ?? 0) !== 1)
  if (!invalid.length) return

  throw new TimError(
    'USAGE',
    invalid
      .map((atomRow) => {
        const claimants = claimantsOf(atomRow.id, rows)
        return claimants.length === 0
          ? `${atomRow.key} is not claimed by any increment.`
          : `${atomRow.key} is claimed by ${claimants.join(' and ')}.`
      })
      .join(' ')
  )
}

const membershipSummary = ({ rows, context }) => {
  const adopted = (context.atomRows ?? []).filter(
    (row) => row.status === 'adopted'
  )
  const counts = claimsFor(rows)
  const covered = adopted.filter(
    (row) => (counts.get(row.id) ?? 0) === 1
  ).length
  const solo = rows.filter((row) => row.key.startsWith(SOLO_KEY_PREFIX)).length
  return {
    adopted: adopted.length,
    covered,
    solo,
    combined: rows.length - solo
  }
}

const stateReason = (row, context) =>
  context?.startedIds?.has(row.id)
    ? 'has started (build/state.json records an attempt)'
    : `has been ruled ${row.status}`

const header = ({ profile }) => ({
  schemaVersion: 2,
  programme: profile.id,
  profile: 'requirements-v2'
})

/**
 * The `requirements-v2` profile's **increments** collection: DESIGN section
 * 3.5's buildable-unit shape, expressed as the hooks `backlog/ingest.js`
 * calls. See `./requirements-v2.js` for the sibling atoms collection.
 */
export const requirementsV2Increments = {
  key: 'requirements-v2',
  collection: 'increments',
  itemsKey: 'increments',
  idPrefix: 'inc-',
  identityField: 'key',
  identityOf: (item) => item.key,
  slugOf: (item) => item.key,
  itemsDir: (profile) => join(profile.paths.workarea, 'distil', 'increments'),
  context: (profile, existing) => {
    const atomRows = existing?.requirements ?? []
    if (!existing || atomRows.length === 0) {
      throw new TimError(
        'USAGE',
        'No atoms yet for this programme. Run "tim backlog ingest <p> --atoms" first.'
      )
    }
    const byId = new Map(atomRows.map((row) => [row.id, row]))
    const atomTable = new Map()
    for (const row of atomRows) {
      const survivorId = forwardResolve(row.id, byId)
      if (typeof row.id === 'string') atomTable.set(row.id, survivorId)
      if (typeof row.key === 'string') atomTable.set(row.key, survivorId)
    }
    return {
      atomRows,
      atomTable,
      startedIds: startedIncrementIds(profile.paths.state)
    }
  },
  validateItem: ({ raw, file }) => validateIncrement({ raw, file }),
  sortKey: (item) => [item.key],
  expandItems,
  referenceTables: (context) => ({ atoms: context.atomTable }),
  references: [
    { field: 'dependsOn', shape: 'string', scope: 'batch', verifyIds: true },
    {
      field: 'members',
      shape: 'string',
      scope: 'atoms',
      idPrefix: 'req-',
      verifyIds: true
    }
  ],
  frozen: null,
  regroupField: 'members',
  bornStatus: ({ item, context }) => bornStatusFor(item, context),
  isRuled: (row, context) =>
    (context?.startedIds?.has(row.id) ?? false) ||
    RULED_STATUSES.has(row.status),
  requireVerification: () => false,
  rowFrom: ({ item, id, context, tables = { batch: new Map() } }) => ({
    id,
    key: item.key,
    ...(item.title !== undefined ? { title: item.title } : {}),
    ...(item.outcome !== undefined ? { outcome: item.outcome } : {}),
    why: item.why,
    members: item.members,
    class: item.class,
    surface: surfaceFor(item, context),
    milestone: item.milestone,
    dependsOn: liftDependencies({ item, context, tables }),
    sequence: item.sequence,
    needs: needsFor(item, context),
    checkpoint: item.checkpoint,
    size: item.size,
    combination: item.combination
  }),
  bornExtras: () => ({ doneBy: null, statusNote: null }),
  foldOnto: () => ({}),
  cycleEdges: (rows) => rows.map((row) => [row.id, row.dependsOn ?? []]),
  checkRows: ({ rows, context }) => checkOneIncrementPerAtom({ rows, context }),
  header,
  // A wrapper, not the bare import: requirements-v2.js imports parseIncrement
  // from this file, so a direct reference here would be read before that
  // cycle finishes resolving. Deferring the lookup to call time is enough —
  // by then both modules have finished loading.
  parseBacklog: (raw) => parseV2Backlog(raw),
  parseItem: parseIncrement,
  summary: ({ rows, context, dir }) => ({
    incrementsDir: dir,
    membership: membershipSummary({ rows, context })
  }),
  messages: {
    itemsDirMissing: (dir) =>
      `No increments at ${dir}. An agent writes one JSON file per increment there. An empty directory is correct when every atom is solo.`,
    replaceBlocked: (ids, { rows, context } = {}) =>
      `--replace would discard rulings on ${ids.length} increments: ${(
        rows ?? ids
      )
        .map((entry) =>
          typeof entry === 'string'
            ? entry
            : `${entry.id} (${stateReason(entry, context)})`
        )
        .join(
          ', '
        )}. Re-run without it to merge, or move the backlog aside first.`,
    droppedRuling: ({ dir, rows, context }) =>
      `${rows
        .map((row) => {
          const location = row.key.startsWith(SOLO_KEY_PREFIX)
            ? `its atom (${row.members?.[0] ?? 'unknown'}) is now claimed by another increment`
            : `its file is no longer in ${dir}`
          return `${row.id} (${row.key}) ${stateReason(row, context)}, and ${location}.`
        })
        .join(' ')} Put the file back, or clear the ruling first.`,
    unverified: (files) =>
      `${files.length} increments carry no verification record: ${files.join(', ')}.`,
    referenceNoId: (field) =>
      `"${field}" holds an entry that is not a key. Name the other ${field === 'members' ? 'atom' : 'increment'} by its key.`,
    referenceUnknown: (field, named) =>
      `"${field}" names "${named}", which is no ${field === 'members' ? 'atom' : 'increment'} in this run. Use the other ${field === 'members' ? 'atom' : 'increment'}'s key.`,
    referenceSelf: (field, named) =>
      `"${field}" names "${named}", which is this increment itself.`,
    cycle: (path) =>
      `A dependsOn cycle: ${path.map((node) => (node.title ? `${node.key} ("${node.title}")` : node.key)).join(' → ')}.`,
    regrouped: (list) =>
      list
        .map(
          ({ id, key, before, after }) =>
            `Cannot regroup ${id} (${key}): it has started or been ruled on. Its members would change from ${before.join(', ')} to ${after.join(', ')}. Put its members back as they were in distil/increments/, or leave it as is and claim the new membership from a different increment.`
        )
        .join('\n')
  }
}
