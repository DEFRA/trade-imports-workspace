import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile, writeJsonAtomic } from './io.js'
import { TimError } from '../errors.js'
import { profileFor, DEFAULT_PROFILE_KEY } from './profiles/index.js'

const fail = (file, message) => {
  throw new TimError('PARSE', `${file}: ${message}`)
}

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
 * @param {Map<string, string>} args.slugs - Every slug in the run, to its id
 * @param {object} args.definition
 * @returns {object} The item, with every declared reference field resolved
 * @throws {TimError} PARSE, naming the file and the field
 */
const resolveReferences = ({ item, id, slugs, definition }) => {
  const resolved = { ...item }
  for (const { field, shape } of definition.references) {
    const raw = item[field]
    if (!raw) continue
    resolved[field] = raw.map((entry) => {
      const named = shape === 'object' ? entry?.id : entry
      if (typeof named !== 'string' || named.trim() === '') {
        fail(item.file, definition.messages.referenceNoId(field))
      }
      const trimmed = named.trim()
      const resolvedId = looksResolved(trimmed, definition.idPrefix)
        ? trimmed
        : slugs.get(trimmed)
      if (!resolvedId) {
        fail(item.file, definition.messages.referenceUnknown(field, trimmed))
      }
      if (resolvedId === id) {
        fail(item.file, definition.messages.referenceSelf(field, trimmed))
      }
      return shape === 'object' ? { ...entry, id: resolvedId } : resolvedId
    })
  }
  return resolved
}

const born = ({ item, id, profile, definition }) => ({
  ...definition.rowFrom({ item, id, profile }),
  [definition.frozen.field]: definition.frozen.compose(item),
  ...definition.bornExtras({ item, id, profile }),
  status: definition.bornStatus({ item, profile })
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
const refreshed = ({ row, item, id, profile, definition }) => {
  const authored = definition.rowFrom({ item, id, profile })
  const composed = definition.frozen.compose(item)
  return {
    ...row,
    ...authored,
    [definition.frozen.field]: row[definition.frozen.field] || composed,
    ...definition.foldOnto({ row, item, id, profile, authored })
  }
}

const ruled = (rows, definition) =>
  rows.filter((row) => definition.isRuled(row))

const readExisting = (path, definition) =>
  existsSync(path) ? definition.parseBacklog(readJsonFile(path)) : null

/**
 * Assemble a programme's backlog.json from the item files an agent
 * authored, through the profile registered for it.
 *
 * One writer core serves every registered programme: it names no finding, no
 * screen, no band and no atom. Everything profile-shaped is a hook on the
 * definition resolved from `profile.profileKey` — see
 * `tim/src/backlog/profiles/index.js` for the profiles this core knows, and
 * `tim/src/parity/profile-v1.js` / `tim/src/backlog/profiles/requirements-v2.js`
 * for what each hook does for its own programme kind.
 *
 * @param {object} args
 * @param {object} args.profile - A loaded programme or corpus profile
 * @param {string} args.workspaceRoot
 * @param {boolean} [args.replace] - Rebuild from scratch rather than merging
 * @param {boolean} [args.dryRun] - Report and write nothing
 * @param {string} [args.target] - Override the build-loop target (parity-v1 only)
 * @returns {object} A summary of what was written
 * @throws {TimError} NOT_FOUND when the item directory is missing, PARSE for
 *   a bad item file, USAGE for an unknown profile, a destructive rebuild, a
 *   dropped ruling, a frozen-field change, or missing verification
 */
export const runIngest = ({
  profile,
  workspaceRoot,
  replace = false,
  dryRun = false,
  target
}) => {
  const definition = profileFor(profile.profileKey ?? DEFAULT_PROFILE_KEY)
  const context = definition.context(profile)
  const dir = definition.itemsDir(profile)
  const items = readItems({ dir, profile, definition, context })

  const backlogPath = profile.paths.backlog
  const existing = readExisting(backlogPath, definition)
  const existingRows = existing?.[definition.itemsKey] ?? []

  if (replace && existingRows.length) {
    const blocked = ruled(existingRows, definition)
    if (blocked.length) {
      throw new TimError(
        'USAGE',
        definition.messages.replaceBlocked(blocked.map((row) => row.id))
      )
    }
  }

  const ids = assignIds({
    items,
    existing: existingRows,
    replace,
    definition
  })
  const byId = new Map(existingRows.map((row) => [row.id, row]))
  const slugs = new Map(
    items.map((item) => [
      definition.slugOf(item),
      ids.get(definition.identityOf(item))
    ])
  )

  // An item whose file has gone leaves the backlog with it — striking one is
  // a deliberate act. Striking one somebody has already ruled on or built is
  // not, so that stops the run and says which file to put back.
  const present = new Set(items.map(definition.identityOf))
  const dropped = existingRows.filter(
    (row) =>
      row[definition.identityField] &&
      !present.has(row[definition.identityField])
  )
  const droppedRulings = ruled(dropped, definition)
  if (droppedRulings.length) {
    throw new TimError(
      'USAGE',
      definition.messages.droppedRuling({ dir, rows: droppedRulings })
    )
  }

  const frozenList = []
  const rows = items.map((authored) => {
    const id = ids.get(definition.identityOf(authored))
    const item = resolveReferences({ item: authored, id, slugs, definition })
    const previous = replace ? undefined : byId.get(id)
    if (!previous) return born({ item, id, profile, definition })
    const wouldBe = definition.frozen.compose(item)
    const currentFrozen = previous[definition.frozen.field]
    if (currentFrozen && currentFrozen !== wouldBe) {
      frozenList.push(`${id} (${definition.identityOf(item)})`)
    }
    return refreshed({ row: previous, item, id, profile, definition })
  })

  if (frozenList.length) {
    throw new TimError('USAGE', definition.messages.frozenChanged(frozenList))
  }

  // The verify-before-ingest gate. A profile that does not declare
  // requireVerification is untouched: re-ingesting a programme that predates
  // the flag has to stay a no-op.
  if (definition.requireVerification(profile)) {
    const unverified = items
      .filter(
        (item) => !byId.has(ids.get(definition.identityOf(item))) || replace
      )
      .filter((item) => !item.verification)
      .map((item) => definition.identityOf(item))
    if (unverified.length) {
      throw new TimError(
        'USAGE',
        definition.messages.unverified(unverified, profile)
      )
    }
  }

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

  const write = dryRun ? null : writeJsonAtomic(backlogPath, backlog)

  // A rebuild has no history to be new against: every row in it was written
  // by this run, whatever number it happens to carry.
  const isNew = (item) =>
    replace || !byId.has(ids.get(definition.identityOf(item)))

  return {
    path: backlogPath,
    written: Boolean(write),
    total: items.length,
    new: items.filter(isNew).length,
    refreshed: items.filter((item) => !isNew(item)).length,
    dropped: dropped.map((row) => row.id),
    assignment: items.map((item) => ({
      id: ids.get(definition.identityOf(item)),
      file: item.file,
      slice: item.slice,
      isNew: isNew(item)
    })),
    ...definition.summary({ items, profile, dir, context })
  }
}
