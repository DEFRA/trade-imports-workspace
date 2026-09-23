import { existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { readJsonFile } from './io.js'
import { TimError } from '../errors.js'
import { findCycle } from './graph.js'
import { profileFor, DEFAULT_PROFILE_KEY } from './profiles/index.js'
import { readVersioned, parseJsonText, commitWrite } from './write.js'
import { findOperation, fingerprintOf } from './ops-log.js'

const compareSortKey = (left, right) => {
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    const cmp = String(left[index] ?? '').localeCompare(
      String(right[index] ?? '')
    )
    if (cmp !== 0) return cmp
  }
  return 0
}

/**
 * Every item file in the directory, validated through the profile and
 * sorted in the order ids are assigned: the profile's own `sortKey`.
 *
 * @param {object} args
 * @param {string} args.dir
 * @param {object} args.profile
 * @param {object} args.definition
 * @param {object} args.context
 * @returns {object[]}
 * @throws {TimError} NOT_FOUND when the directory does not exist
 */
const readItems = ({ dir, profile, definition, context }) => {
  if (!existsSync(dir)) {
    throw new TimError('NOT_FOUND', definition.messages.itemsDirMissing(dir))
  }
  const files = readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
  const items = files.map((file) =>
    definition.validateItem({
      raw: readJsonFile(join(dir, file)),
      file,
      profile,
      context
    })
  )
  return items.sort((left, right) =>
    compareSortKey(definition.sortKey(left), definition.sortKey(right))
  )
}

const numberOf = (id, idPrefix) => {
  const match = new RegExp(`^${idPrefix}(\\d+)$`).exec(id ?? '')
  return match ? Number(match[1]) : 0
}

const idFor = (idPrefix, number) =>
  `${idPrefix}${String(number).padStart(3, '0')}`

/**
 * Give every item an id, and never move one.
 *
 * An id is what a ruling, a citation and a build-loop commit are attached to.
 * Numbering by position alone would renumber half the backlog the moment an
 * agent adds an item whose file sorts early, and every ruling already made
 * would then be attached to a different item — silently, because the shape
 * still validates. So a file the profile already recognises (by its identity
 * field) keeps its id, and only a file nobody has seen before takes the next
 * number.
 *
 * @param {object} args
 * @param {object[]} args.items - In sorted order
 * @param {object[]} args.existing - Rows already in the backlog
 * @param {boolean} [args.replace] - Renumber from one, ignoring what is there
 * @param {object} args.definition
 * @returns {Map<string, string>} Identity to id
 */
const assignIds = ({ items, existing, replace, definition }) => {
  if (replace) {
    return new Map(
      items.map((item, i) => [
        definition.identityOf(item),
        idFor(definition.idPrefix, i + 1)
      ])
    )
  }
  const known = new Map(
    existing
      .filter((row) => typeof row[definition.identityField] === 'string')
      .map((row) => [row[definition.identityField], row.id])
  )
  let next = existing.reduce(
    (max, row) => Math.max(max, numberOf(row.id, definition.idPrefix)),
    0
  )
  return new Map(
    items.map((item) => {
      const identity = definition.identityOf(item)
      const held = known.get(identity)
      if (held) return [identity, held]
      next += 1
      return [identity, idFor(definition.idPrefix, next)]
    })
  )
}

const looksResolved = (value, idPrefix) =>
  new RegExp(`^${idPrefix}\\d+$`).test(value)

const fail = (file, message) => {
  throw new TimError('PARSE', `${file}: ${message}`)
}

/**
 * Resolve one reference entry against its field's table.
 *
 * A field with `verifyIds` always looks the entry up, even when it already
 * reads like an id — a dangling id must be caught, not waved through. A
 * field without it keeps the historic short-circuit: an already-id-shaped
 * entry is trusted as is.
 *
 * @param {object} args
 * @returns {string|undefined}
 */
const resolveOne = ({ entry, named, table, definition }) => {
  const idPrefix = entry.idPrefix ?? definition.idPrefix
  if (!entry.verifyIds && looksResolved(named, idPrefix)) return named
  return table.get(named)
}

/**
 * Point every declared reference field at the id it means.
 *
 * A cross-reference is authored before any id exists — this run is what
 * hands them out — so the contract has it name the other item by a slug.
 * Turning that into an id here, in the same pass that assigns the ids, is
 * what lets an item refer to one written later in the same batch.
 *
 * @param {object} args
 * @param {object} args.item - A validated item
 * @param {string} args.id - The id this run gave it
 * @param {Object<string, Map<string, string>>} args.tables - Lookup table
 *   per scope (always has `batch`; profiles can add more via
 *   `referenceTables`)
 * @param {object} args.definition
 * @returns {object} The item, with every declared reference field resolved
 * @throws {TimError} PARSE, naming the item (its file, or its identity when
 *   it has none) and the field
 */
const resolveReferences = ({ item, id, tables, definition }) => {
  const resolved = { ...item }
  const where = item.file ?? definition.identityOf(item)
  for (const entry of definition.references) {
    const { field, shape } = entry
    const raw = item[field]
    if (!raw) continue
    const table = tables[entry.scope] ?? tables.batch
    resolved[field] = raw.map((rawEntry) => {
      const named = shape === 'object' ? rawEntry?.id : rawEntry
      if (typeof named !== 'string' || named.trim() === '') {
        fail(where, definition.messages.referenceNoId(field))
      }
      const trimmed = named.trim()
      const resolvedId = resolveOne({
        entry,
        named: trimmed,
        table,
        definition
      })
      if (!resolvedId) {
        fail(where, definition.messages.referenceUnknown(field, trimmed))
      }
      if (resolvedId === id) {
        fail(where, definition.messages.referenceSelf(field, trimmed))
      }
      return shape === 'object' ? { ...rawEntry, id: resolvedId } : resolvedId
    })
  }
  return resolved
}

const born = ({ item, id, profile, definition, context, tables }) => ({
  ...definition.rowFrom({ item, id, profile, context, tables }),
  ...(definition.frozen
    ? { [definition.frozen.field]: definition.frozen.compose(item) }
    : {}),
  ...definition.bornExtras({ item, id, profile, context, tables }),
  status: definition.bornStatus({ item, profile, context, tables })
})

/**
 * Fold an authored item back onto a row that already exists.
 *
 * Spread the old row first and the authored fields over the top, so anything
 * this tool does not own survives untouched. That is what makes re-running
 * safe once work has started.
 *
 * @param {object} args
 * @returns {object}
 */
const refreshed = ({ row, item, id, profile, definition, context, tables }) => {
  const authored = definition.rowFrom({ item, id, profile, context, tables })
  const frozenExtra = definition.frozen
    ? {
        [definition.frozen.field]:
          row[definition.frozen.field] ?? definition.frozen.compose(item)
      }
    : {}
  return {
    ...row,
    ...authored,
    ...frozenExtra,
    ...definition.foldOnto({ row, item, id, profile, authored, context })
  }
}

const ruled = (rows, definition, context) =>
  rows.filter((row) => definition.isRuled(row, context))

/**
 * Every identity (the profile's `identityOf`) claimed by more than one item
 * in this run, each mapped to the items that share it.
 *
 * A collision collapses in `assignIds` — the Map it builds keeps only the
 * last entry — so two authored files (or an authored file and a synthesised
 * item, e.g. a `solo--` key) sharing one key would otherwise silently merge
 * into a single row under one id, burning a number and losing one item's
 * content. This is checked before ids are assigned, so it names both.
 *
 * @param {object[]} items
 * @param {object} definition
 * @returns {[string, object[]][]}
 */
const duplicateIdentities = (items, definition) => {
  const seen = new Map()
  for (const item of items) {
    const identity = definition.identityOf(item)
    seen.set(identity, [...(seen.get(identity) ?? []), item])
  }
  return [...seen.entries()].filter(([, group]) => group.length > 1)
}

const sameMembers = (before, after) =>
  before.size === after.size && [...before].every((entry) => after.has(entry))

const assertNoDuplicateIdentities = (items, definition) => {
  const duplicated = duplicateIdentities(items, definition)
  if (!duplicated.length) return
  throw new TimError(
    'USAGE',
    duplicated
      .map(
        ([identity, group]) =>
          `"${identity}" names more than one item: ${group.map((item) => item.file ?? identity).join(', ')}. Each item's key must be unique.`
      )
      .join(' ')
  )
}

const assertReplaceAllowed = ({
  replace,
  existingRows,
  definition,
  context
}) => {
  if (!replace || !existingRows.length) return
  const blocked = ruled(existingRows, definition, context)
  if (!blocked.length) return
  throw new TimError(
    'USAGE',
    definition.messages.replaceBlocked(
      blocked.map((row) => row.id),
      { rows: blocked, context }
    )
  )
}

// An item whose file has gone leaves the backlog with it — striking one is
// a deliberate act. Striking one somebody has already ruled on or built is
// not, so `assertNoDroppedRulings` stops the run and says which file to put
// back.
const findDropped = ({ existingRows, items, definition }) => {
  const present = new Set(items.map(definition.identityOf))
  return existingRows.filter(
    (row) =>
      row[definition.identityField] &&
      !present.has(row[definition.identityField])
  )
}

const assertNoDroppedRulings = ({ dropped, dir, definition, context }) => {
  const droppedRulings = ruled(dropped, definition, context)
  if (!droppedRulings.length) return
  throw new TimError(
    'USAGE',
    definition.messages.droppedRuling({ dir, rows: droppedRulings, context })
  )
}

/**
 * Every authored item folded onto its row: born when it is new, refreshed
 * onto the existing row otherwise. Pure — it pushes nothing to a side
 * list; `frozenChanges` and `regroupedRows` derive their own findings from
 * what this returns.
 *
 * @param {object} args
 * @returns {{id: string, item: object, previous: object|undefined, row: object}[]}
 */
const buildRows = ({
  items,
  ids,
  byId,
  replace,
  profile,
  definition,
  context,
  tables
}) =>
  items.map((authored) => {
    const id = ids.get(definition.identityOf(authored))
    const item = resolveReferences({ item: authored, id, tables, definition })
    const previous = replace ? undefined : byId.get(id)
    if (!previous) {
      return {
        id,
        item,
        previous,
        row: born({ item, id, profile, definition, context, tables })
      }
    }
    return {
      id,
      item,
      previous,
      row: refreshed({
        row: previous,
        item,
        id,
        profile,
        definition,
        context,
        tables
      })
    }
  })

const frozenChanges = (built, definition) => {
  if (!definition.frozen) return []
  return built
    .filter(({ previous, item }) => {
      if (!previous) return false
      const wouldBe = definition.frozen.compose(item)
      const currentFrozen = previous[definition.frozen.field]
      return Boolean(currentFrozen) && currentFrozen !== wouldBe
    })
    .map(({ id, item }) => `${id} (${definition.identityOf(item)})`)
}

const assertNoFrozenChanges = (entries, definition) => {
  if (!entries.length) return
  throw new TimError('USAGE', definition.messages.frozenChanged(entries))
}

const regroupedRows = (built, definition, context) => {
  if (!definition.regroupField) return []
  return built
    .filter(({ previous }) => previous && definition.isRuled(previous, context))
    .map(({ id, item, previous, row }) => {
      const before = new Set(previous[definition.regroupField] ?? [])
      const after = new Set(row[definition.regroupField] ?? [])
      if (sameMembers(before, after)) return null
      return {
        id,
        key: definition.identityOf(item),
        before: [...before],
        after: [...after]
      }
    })
    .filter(Boolean)
}

const assertNoRegroups = (entries, definition) => {
  if (!entries.length) return
  throw new TimError('USAGE', definition.messages.regrouped(entries))
}

// The verify-before-ingest gate. A profile that does not declare
// requireVerification is untouched: re-ingesting a programme that predates
// the flag has to stay a no-op.
const assertVerified = ({ items, byId, ids, replace, definition, profile }) => {
  if (!definition.requireVerification(profile)) return
  const unverified = items
    .filter(
      (item) => !byId.has(ids.get(definition.identityOf(item))) || replace
    )
    .filter((item) => !item.verification)
    .map((item) => definition.identityOf(item))
  if (!unverified.length) return
  throw new TimError(
    'USAGE',
    definition.messages.unverified(unverified, profile)
  )
}

const assertNoCycle = (rows, definition) => {
  const cyclePath = findCycle(new Map(definition.cycleEdges(rows)))
  if (!cyclePath) return
  const byRowId = new Map(rows.map((row) => [row.id, row]))
  const path = cyclePath.map((id) => {
    const row = byRowId.get(id)
    return { id, key: row?.key ?? id, title: row?.title }
  })
  throw new TimError('USAGE', definition.messages.cycle(path))
}

/**
 * Assemble a programme's backlog.json from the item files an agent
 * authored, through the profile registered for it.
 *
 * One writer core serves every registered programme: it names no atom and no
 * increment. Everything profile-shaped is a hook on the definition resolved
 * from `profile.profileKey` and `collection` — see
 * `tim/src/backlog/profiles/index.js` for the profiles this core knows, and
 * `tim/src/backlog/profiles/requirements-v2.js` /
 * `tim/src/backlog/profiles/requirements-v2-increments.js` for what each hook
 * does for its own collection.
 *
 * The write itself goes through `write.js`'s `commitWrite` — one lock, one
 * lost-update check and one idempotent operation log for every profile. A
 * caller that passes no `opId` writes no operation log: the lock is held only
 * for the milliseconds of the rename, and the lost-update check can only fire
 * when two ingests race on one programme.
 *
 * @param {object} args
 * @param {object} args.profile - A loaded programme
 * @param {string} args.workspaceRoot
 * @param {string} [args.collection] - Which of the profile's item
 *   collections to ingest; defaults to the profile's own default
 * @param {boolean} [args.replace] - Rebuild from scratch rather than merging
 * @param {boolean} [args.dryRun] - Report and write nothing
 * @param {string} [args.target] - Build-loop target, passed to the profile's
 *   own header hook
 * @param {string} [args.opId] - An idempotency key; a replay returns the
 *   original result and writes nothing (req-016)
 * @param {string} [args.expectSha] - The version this run is based on;
 *   defaults to the version it reads. When the file no longer matches on
 *   write, the run is refused (req-015)
 * @param {string} [args.command] - Named in the lock and the operation log;
 *   defaults to 'backlog ingest'
 * @param {number[]} [args.retryDelaysMs]
 * @returns {object} A summary of what was written
 * @throws {TimError} NOT_FOUND when the item directory is missing, PARSE for
 *   a bad item file, USAGE for an unknown profile or collection, two items
 *   sharing one identity, a destructive rebuild, a dropped ruling, a
 *   regrouped started or ruled increment, a dependency cycle, a
 *   double-claimed atom, a frozen-field change, missing verification, an
 *   increments pass with no atoms yet, an atoms pass that would drop an
 *   atom a claimed increment still names, LOST_UPDATE, or LOCKED
 */
export const runIngest = ({
  profile,
  workspaceRoot,
  collection,
  replace = false,
  dryRun = false,
  target,
  opId,
  expectSha,
  command,
  retryDelaysMs
}) => {
  const definition = profileFor(
    profile.profileKey ?? DEFAULT_PROFILE_KEY,
    collection
  )
  const resolvedCommand = command ?? 'backlog ingest'

  const backlogPath = profile.paths.backlog
  const opsLogPath =
    profile.paths.opsLog ?? join(dirname(backlogPath), '.backlog-ops.jsonl')
  const fingerprint = opId
    ? fingerprintOf({
        verb: 'backlog ingest',
        programme: profile.id,
        collection: definition.collection,
        replace,
        target: target ?? null
      })
    : undefined

  if (opId && !dryRun) {
    const found = findOperation({ opsLogPath, opId, fingerprint })
    if (found) return found.result
  }

  const versioned = readVersioned(backlogPath)
  const existing = versioned.exists
    ? definition.parseBacklog(parseJsonText(versioned.text, backlogPath))
    : null
  const context = definition.context(profile, existing)

  const dir = definition.itemsDir(profile)
  const authoredItems = readItems({ dir, profile, definition, context })
  const items = definition.expandItems({
    items: authoredItems,
    existing,
    profile,
    context
  })

  assertNoDuplicateIdentities(items, definition)

  const existingRows = existing?.[definition.itemsKey] ?? []

  assertReplaceAllowed({ replace, existingRows, definition, context })

  const ids = assignIds({
    items,
    existing: existingRows,
    replace,
    definition
  })
  const byId = new Map(existingRows.map((row) => [row.id, row]))

  const identityId = (item) => ids.get(definition.identityOf(item))
  const batchTable = new Map(
    items.flatMap((item) => {
      const id = identityId(item)
      return [
        [id, id],
        [definition.slugOf(item), id]
      ]
    })
  )
  const tables = { batch: batchTable, ...definition.referenceTables(context) }

  const dropped = findDropped({ existingRows, items, definition })
  assertNoDroppedRulings({ dropped, dir, definition, context })

  const built = buildRows({
    items,
    ids,
    byId,
    replace,
    profile,
    definition,
    context,
    tables
  })
  assertNoFrozenChanges(frozenChanges(built, definition), definition)
  assertNoRegroups(regroupedRows(built, definition, context), definition)

  const rows = built.map(({ row }) => row)

  assertVerified({ items, byId, ids, replace, definition, profile })
  assertNoCycle(rows, definition)

  definition.checkRows({ rows, context, profile })

  const header = definition.header({
    existing,
    profile,
    workspaceRoot,
    options: { target }
  })
  const backlog = {
    ...(existing ?? {}),
    ...header,
    [definition.itemsKey]: rows.map((row, index) =>
      definition.parseItem(row, index)
    )
  }

  // A rebuild has no history to be new against: every row in it was written
  // by this run, whatever number it happens to carry.
  const isNew = (item) =>
    replace || !byId.has(ids.get(definition.identityOf(item)))

  const resultStub = {
    path: backlogPath,
    collection: definition.collection,
    total: items.length,
    new: items.filter(isNew).length,
    refreshed: items.filter((item) => !isNew(item)).length,
    dropped: dropped.map((row) => row.id),
    assignment: items.map((item) => ({
      id: ids.get(definition.identityOf(item)),
      key: definition.identityOf(item),
      file: item.file,
      slice: item.slice,
      isNew: isNew(item)
    })),
    ...definition.summary({ items, profile, dir, context, rows })
  }

  if (dryRun) {
    return { ...resultStub, written: false, sha256: null, notes: [] }
  }

  const body = `${JSON.stringify(backlog, null, 2)}\n`
  const expectedSha = expectSha ?? versioned.sha256

  const commit = commitWrite({
    path: backlogPath,
    body,
    format: 'json',
    validate: (parsed) => definition.parseBacklog(parsed),
    expectedSha,
    command: resolvedCommand,
    opId,
    fingerprint,
    opsLogPath,
    result: { ...resultStub, written: true },
    retryDelaysMs
  })

  if (commit.replayed) return commit.result

  return {
    ...resultStub,
    written: true,
    sha256: commit.sha256,
    notes: commit.notes
  }
}
