import { posix } from 'node:path'
import { TimError } from '../errors.js'
import { pointerOf, splitOffOf } from './split-off.js'
import {
  THEMES_FOLDER,
  UNBUILT_STATUSES,
  crossThemeDependencies,
  landingWaves,
  themeWorkareaOf
} from './themes.js'

export { THEMES_FOLDER, themeWorkareaOf }

/** The file, in that folder, that indexes the split and its landing order. */
export const THEMES_INDEX = 'themes.json'

/**
 * The fields the build loop writes on a row through `tim backlog set`. A
 * re-split keeps them from the split copy, where the loop wrote them.
 */
const LOOP_FIELDS = ['ticket', 'branch', 'commit', 'prs']

/** The list fields the loop appends to. A re-split keeps what it appended. */
const APPENDED_FIELDS = ['notes', 'openQuestions']

const THEME_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/

const BACKLOG_FILE = 'backlog.json'

/**
 * The part of each theme's branch before its theme id, when nobody gives
 * one: `feat/NO_JIRA-<programme>`, the programme taken from the envelope, or
 * from the workarea's last folder when the envelope has none.
 *
 * @param {object} backlog
 * @param {string} workarea
 * @returns {string}
 */
export const defaultBranchPrefix = (backlog, workarea) =>
  `feat/NO_JIRA-${programmeOf(backlog, workarea)}`

const programmeOf = (backlog, workarea) =>
  typeof backlog.programme === 'string' && backlog.programme.trim()
    ? backlog.programme.trim()
    : posix.basename(workarea)

const asList = (value) => {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

const rowsOf = (backlog) =>
  Array.isArray(backlog?.increments) ? backlog.increments : []

const themeOfRowMap = (backlog) =>
  new Map(rowsOf(backlog).map((row) => [row.id, row.theme]))

const dependencyTarget = ({ workarea, themeOfRow, id }) => {
  const theme = themeOfRow.get(id)
  return {
    workarea: theme ? themeWorkareaOf(workarea, theme) : workarea,
    id
  }
}

/**
 * One parent row as its theme's split carries it: a dependsOn in the same
 * theme stays, and a dependsOn in another theme, or in no theme, becomes an
 * `externalDependsOn` on the workarea `targetOf` gives for it.
 */
const splitRowOf = ({ row, themeOfRow, targetOf }) => {
  const dependsOn = asList(row.dependsOn)
  const crossing = dependsOn
    .filter((id) => themeOfRow.get(id) !== row.theme)
    .map(targetOf)
  const externalDependsOn = [...asList(row.externalDependsOn), ...crossing]
  return {
    ...row,
    dependsOn: dependsOn.filter((id) => themeOfRow.get(id) === row.theme),
    ...(externalDependsOn.length ? { externalDependsOn } : {})
  }
}

const appendedUnion = (fresh, existing) => {
  const extras = asList(existing).filter(
    (entry) => !asList(fresh).includes(entry)
  )
  return extras.length ? [...asList(fresh), ...extras] : fresh
}

/**
 * A todo or blocked row refreshed from the parent, keeping what the build
 * loop wrote on the split copy: its ticket, branch, commit and pull requests,
 * and any note or open question it added.
 */
const refreshedRow = (fresh, existing) => {
  const carried = Object.fromEntries(
    LOOP_FIELDS.filter((field) => existing[field] !== undefined).map(
      (field) => [field, existing[field]]
    )
  )
  const appended = Object.fromEntries(
    APPENDED_FIELDS.map((field) => [
      field,
      appendedUnion(fresh[field], existing[field])
    ]).filter(([, value]) => value !== undefined)
  )
  return { ...fresh, ...carried, ...appended }
}

const isBuiltOrSetAside = (row) => !UNBUILT_STATUSES.has(row.status)

const mergedRowOf = (fresh, existingRows) => {
  const existing = existingRows.get(fresh.id)
  if (!existing) return { row: fresh, kept: false }
  if (isBuiltOrSetAside(existing)) return { row: existing, kept: true }
  return { row: refreshedRow(fresh, existing), kept: false }
}

const reposUsed = (backlog, rows) => {
  if (!backlog.repos || typeof backlog.repos !== 'object') return undefined
  const keys = Object.keys(backlog.repos)
  const everyRepo = rows.some((row) => !Array.isArray(row.repos))
  const used = new Set(rows.flatMap((row) => asList(row.repos)))
  return Object.fromEntries(
    keys
      .filter((key) => everyRepo || used.has(key))
      .map((key) => [key, backlog.repos[key]])
  )
}

const optional = (field, value) =>
  value === undefined ? {} : { [field]: value }

const splitEnvelopeOf = ({ backlog, workarea, theme, branch, wave, rows }) => ({
  programme: `${programmeOf(backlog, workarea)}-${theme.id}`,
  ...optional('generatedFrom', backlog.generatedFrom),
  ...optional('invariants', backlog.invariants),
  ...optional('repos', reposUsed(backlog, rows)),
  theme: theme.id,
  branch,
  parent: { workarea, wave, landsAfter: asList(theme.dependsOn) },
  touches: theme.touches,
  increments: rows
})

const describeNewHome = (theme) =>
  theme ? `puts it in theme "${theme}"` : 'puts it in no theme'

/**
 * Every row a split copy has built or set aside that the parent now puts in
 * another theme, in none, or no longer has. A re-split never moves or loses
 * such a row.
 */
const movedBuiltRowProblems = ({
  backlog,
  workarea,
  themeIds,
  readWorkareaBacklog
}) => {
  const parentRows = new Map(rowsOf(backlog).map((row) => [row.id, row]))
  return themeIds.flatMap((themeId) => {
    const splitWorkarea = themeWorkareaOf(workarea, themeId)
    return rowsOf(readWorkareaBacklog(splitWorkarea))
      .filter(isBuiltOrSetAside)
      .filter((row) => parentRows.get(row.id)?.theme !== themeId)
      .map((row) => {
        const parentRow = parentRows.get(row.id)
        const where = parentRow
          ? `the backlog now ${describeNewHome(parentRow.theme)}`
          : 'the backlog no longer has it'
        return `${row.id} is ${row.status} in ${splitWorkarea}, but ${where}. A row built or set aside keeps its theme: put it back in theme "${themeId}".`
      })
  })
}

const splitOf = ({
  backlog,
  workarea,
  theme,
  branchPrefix,
  waveOf,
  themeOfRow,
  targetOf,
  readWorkareaBacklog
}) => {
  const splitWorkarea = themeWorkareaOf(workarea, theme.id)
  const existingRows = new Map(
    rowsOf(readWorkareaBacklog(splitWorkarea)).map((row) => [row.id, row])
  )
  const merged = rowsOf(backlog)
    .filter((row) => row.theme === theme.id)
    .map((row) => splitRowOf({ row, themeOfRow, targetOf }))
    .map((fresh) => mergedRowOf(fresh, existingRows))
  const rows = merged.map(({ row }) => row)
  const ids = new Set(rows.map((row) => row.id))
  return {
    theme: theme.id,
    workarea: splitWorkarea,
    kept: merged.filter(({ kept }) => kept).map(({ row }) => row.id),
    removed: [...existingRows.keys()].filter((id) => !ids.has(id)),
    backlog: splitEnvelopeOf({
      backlog,
      workarea,
      theme,
      branch: `${branchPrefix}-${theme.id}`,
      wave: waveOf.get(theme.id),
      rows
    })
  }
}

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

/**
 * The themes a landing order is worked out over: the backlog's own, and every
 * theme split off it early, which still lands in its wave.
 */
const everyTheme = (backlog) => [
  ...backlog.themes,
  ...splitOffOf(backlog).map((pointer) => ({
    id: pointer.theme,
    dependsOn: asList(pointer.dependsOn)
  }))
]

const waveMapOf = (waves) =>
  new Map(waves.flatMap(({ wave, themes }) => themes.map((id) => [id, wave])))

const splitOffIdsOf = (backlog) =>
  new Set(splitOffOf(backlog).map((pointer) => pointer.theme))

const indexEntryOf = (theme, split) => ({
  id: theme.id,
  title: theme.title,
  workarea: split.workarea,
  branch: split.backlog.branch,
  wave: split.backlog.parent.wave,
  rows: split.backlog.increments.length,
  dependsOn: asList(theme.dependsOn),
  touches: theme.touches
})

const splitOffEntryOf = (pointer, waveOf) => ({
  id: pointer.theme,
  title: pointer.title,
  workarea: pointer.workarea,
  branch: pointer.branch,
  wave: waveOf.get(pointer.theme),
  rows: asList(pointer.increments).length,
  dependsOn: asList(pointer.dependsOn),
  touches: pointer.touches,
  splitOff: true
})

const indexedCrossThemeDependencies = (backlog, workarea) => {
  const workareaOfTheme = (theme) =>
    theme ? themeWorkareaOf(workarea, theme) : workarea
  return crossThemeDependencies(backlog).map(({ from, to }) => ({
    from: { ...from, workarea: workareaOfTheme(from.theme) },
    to: { ...to, workarea: workareaOfTheme(to.theme) }
  }))
}

const previousCrossThemeDependencies = (previousIndex) =>
  asList(previousIndex?.crossThemeDependencies).filter(
    (entry) => isPlainObject(entry?.from) && isPlainObject(entry?.to)
  )

const involvesAny = (themeIds) => (entry) =>
  themeIds.has(entry.from.theme) || themeIds.has(entry.to.theme)

const unthemedRowIds = (backlog) =>
  rowsOf(backlog)
    .filter((row) => row.theme === undefined)
    .map((row) => row.id)

const indexOf = ({ backlog, workarea, splits, waves, previousIndex }) => {
  const splitByTheme = new Map(splits.map((split) => [split.theme, split]))
  const waveOf = waveMapOf(waves)
  return {
    programme: programmeOf(backlog, workarea),
    workarea,
    landingOrder: waves,
    themes: [
      ...backlog.themes.map((theme) =>
        indexEntryOf(theme, splitByTheme.get(theme.id))
      ),
      ...splitOffOf(backlog).map((pointer) => splitOffEntryOf(pointer, waveOf))
    ],
    crossThemeDependencies: [
      ...indexedCrossThemeDependencies(backlog, workarea),
      ...previousCrossThemeDependencies(previousIndex).filter(
        involvesAny(splitOffIdsOf(backlog))
      )
    ],
    unthemed: unthemedRowIds(backlog)
  }
}

/**
 * Plan the split of a themed backlog into one backlog per theme, plus the
 * index of themes and their landing order. Writes nothing.
 *
 * Each split backlog carries the parent's envelope (its programme suffixed
 * with the theme id), the repos its rows use, its theme, branch, parent and
 * touches, and the theme's rows. A dependsOn on a row in another theme, or in
 * none, becomes an `externalDependsOn` on that row's workarea.
 *
 * Re-splitting is safe: a split row the build loop has built or set aside
 * (any status but todo or blocked) is kept exactly as the split copy has it;
 * a todo or blocked row is refreshed from the parent, keeping the ticket,
 * branch, commit, pull requests, notes and open questions the loop wrote. A
 * built or set-aside row the parent now puts in another theme, or in none, is
 * a problem, and nothing should be written.
 *
 * A theme already split off early (the parent's `splitOff`) is left alone:
 * its backlog lives on its own branch. It keeps its entry in the index and
 * its place in the landing order.
 *
 * @param {object} args
 * @param {object} args.backlog - The parent backlog, already checked, with `themes`
 * @param {string} args.workarea - The parent workarea, normalised
 * @param {string} args.branchPrefix - The part of each branch before the theme id
 * @param {(workarea: string) => object|null} args.readWorkareaBacklog - Reads a split backlog already on disk
 * @param {object|null} args.previousIndex - The themes.json already on disk, if any
 * @returns {{splits: {theme: string, workarea: string, kept: string[], removed: string[], backlog: object}[], index: object, problems: string[]}}
 */
export const planSplit = ({
  backlog,
  workarea,
  branchPrefix,
  readWorkareaBacklog,
  previousIndex
}) => {
  const waves = landingWaves(everyTheme(backlog))
  const waveOf = waveMapOf(waves)
  const themeOfRow = themeOfRowMap(backlog)
  const splits = backlog.themes.map((theme) =>
    splitOf({
      backlog,
      workarea,
      theme,
      branchPrefix,
      waveOf,
      themeOfRow,
      targetOf: (id) => dependencyTarget({ workarea, themeOfRow, id }),
      readWorkareaBacklog
    })
  )
  const splitOffIds = splitOffIdsOf(backlog)
  const themeIds = [
    ...new Set([
      ...backlog.themes.map((theme) => theme.id),
      ...asList(previousIndex?.themes).map((theme) => theme?.id)
    ])
  ]
    .filter((id) => typeof id === 'string' && THEME_ID.test(id))
    .filter((id) => !splitOffIds.has(id))
  return {
    splits,
    index: indexOf({ backlog, workarea, splits, waves, previousIndex }),
    problems: movedBuiltRowProblems({
      backlog,
      workarea,
      themeIds,
      readWorkareaBacklog
    })
  }
}

const refuseThemesItCannotSplitOff = (backlog, themeIds) => {
  const pointers = new Map(
    splitOffOf(backlog).map((pointer) => [pointer.theme, pointer])
  )
  const already = themeIds.find((id) => pointers.has(id))
  if (already) {
    const pointer = pointers.get(already)
    throw new TimError(
      'USAGE',
      `Theme "${already}" is already split off, to ${pointer.branch}. Its rows live in ${pointer.workarea}: build it there.`
    )
  }
  const known = backlog.themes.map((theme) => theme.id)
  const unknown = themeIds.find((id) => !known.includes(id))
  if (unknown) {
    throw new TimError(
      'USAGE',
      `The backlog has no theme "${unknown}". Its themes are ${known.join(', ') || 'none'}.`
    )
  }
}

const dependenciesWhere = ({ rows, isCrossing, targetOf }) =>
  rows.flatMap((row) =>
    asList(row.dependsOn)
      .filter((id) => isCrossing(row, id))
      .map((id) => ({
        id: row.id,
        dependsOn: id,
        workarea: targetOf(id).workarea
      }))
  )

const rewiredRowOf = ({ row, isMoved, targetOf }) => {
  const dependsOn = asList(row.dependsOn)
  const crossing = dependsOn.filter(isMoved)
  if (!crossing.length) return row
  return {
    ...row,
    dependsOn: dependsOn.filter((id) => !isMoved(id)),
    externalDependsOn: [
      ...asList(row.externalDependsOn),
      ...crossing.map(targetOf)
    ]
  }
}

const mergedIndexOf = ({
  original,
  remaining,
  workarea,
  entries,
  waves,
  previousIndex,
  moving
}) => {
  const waveOf = waveMapOf(waves)
  const kept = asList(previousIndex?.themes)
    .filter((entry) => isPlainObject(entry) && typeof entry.id === 'string')
    .filter((entry) => !moving.has(entry.id))
    .map((entry) =>
      waveOf.has(entry.id) ? { ...entry, wave: waveOf.get(entry.id) } : entry
    )
  return {
    programme: programmeOf(original, workarea),
    workarea,
    landingOrder: waves,
    themes: [...kept, ...entries],
    crossThemeDependencies: [
      ...previousCrossThemeDependencies(previousIndex).filter(
        (entry) => !involvesAny(moving)(entry)
      ),
      ...indexedCrossThemeDependencies(original, workarea).filter(
        involvesAny(moving)
      )
    ],
    unthemed: unthemedRowIds(remaining)
  }
}

/**
 * Plan splitting one or more themes off a themed backlog early, while the
 * rest of it is still being ruled on and distilled. Writes nothing.
 *
 * Each theme's backlog is the one the full split would write. Unlike the full
 * split, the theme and its rows then leave the parent altogether: the parent
 * keeps only a pointer in `splitOff`, naming the theme, its branch and
 * backlog, the rows that moved and the requirements they covered, so a
 * re-distil never drafts them again. The index keeps every other theme's
 * entry.
 *
 * A row left in the parent that depended on a moved row gets an
 * `externalDependsOn` on that theme's split workarea. A moved row that
 * depended on a row still in the parent gets one on the parent's workarea:
 * `tim backlog next` follows it to that row's theme split once there is one.
 *
 * @param {object} args
 * @param {object} args.backlog - The parent backlog, already checked, with `themes`
 * @param {string} args.workarea - The parent workarea, normalised
 * @param {string[]} args.themeIds - The themes to split off
 * @param {string} args.branchPrefix - The part of each branch before the theme id
 * @param {(workarea: string) => object|null} args.readWorkareaBacklog - Reads a split backlog already on disk
 * @param {object|null} args.previousIndex - The themes.json already on disk, if any
 * @param {Record<string, string>|null} args.fingerprints - Each requirement's fingerprint, or null with no requirements.json
 * @param {string} args.at - When the themes are split off, as an ISO 8601 time
 * @returns {{splits: object[], backlog: object, pointers: object[], index: object, rewired: {left: {id: string, dependsOn: string, workarea: string}[], moved: {id: string, dependsOn: string, workarea: string}[]}, problems: string[]}}
 * @throws {TimError} USAGE when a theme is not in the backlog, or is already split off
 */
export const planSplitOff = ({
  backlog,
  workarea,
  themeIds,
  branchPrefix,
  readWorkareaBacklog,
  previousIndex,
  fingerprints,
  at
}) => {
  refuseThemesItCannotSplitOff(backlog, themeIds)
  const moving = new Set(themeIds)
  const themeOfRow = themeOfRowMap(backlog)
  const isMoved = (id) => moving.has(themeOfRow.get(id))
  const targetOf = (id) => ({
    workarea: isMoved(id)
      ? themeWorkareaOf(workarea, themeOfRow.get(id))
      : workarea,
    id
  })
  const waves = landingWaves(everyTheme(backlog))
  const chosen = backlog.themes.filter((theme) => moving.has(theme.id))
  const splits = chosen.map((theme) =>
    splitOf({
      backlog,
      workarea,
      theme,
      branchPrefix,
      waveOf: waveMapOf(waves),
      themeOfRow,
      targetOf,
      readWorkareaBacklog
    })
  )
  const pointers = chosen.map((theme, position) =>
    pointerOf({
      theme,
      branch: splits[position].backlog.branch,
      workarea: splits[position].workarea,
      backlogPath: posix.join(THEMES_FOLDER, theme.id, BACKLOG_FILE),
      rows: splits[position].backlog.increments,
      fingerprints,
      at
    })
  )
  const rows = rowsOf(backlog)
  const left = rows.filter((row) => !moving.has(row.theme))
  const { increments, splitOff, ...envelope } = backlog
  const remaining = {
    ...envelope,
    themes: backlog.themes.filter((theme) => !moving.has(theme.id)),
    splitOff: [...splitOffOf(backlog), ...pointers],
    increments: left.map((row) => rewiredRowOf({ row, isMoved, targetOf }))
  }
  return {
    splits,
    backlog: remaining,
    pointers,
    index: mergedIndexOf({
      original: backlog,
      remaining,
      workarea,
      entries: chosen.map((theme, position) => ({
        ...indexEntryOf(theme, splits[position]),
        splitOff: true
      })),
      waves,
      previousIndex,
      moving
    }),
    rewired: {
      left: dependenciesWhere({
        rows: left,
        isCrossing: (row, id) => isMoved(id),
        targetOf
      }),
      moved: dependenciesWhere({
        rows: rows.filter((row) => moving.has(row.theme)),
        isCrossing: (row, id) => themeOfRow.get(id) !== row.theme,
        targetOf
      })
    },
    problems: movedBuiltRowProblems({
      backlog,
      workarea,
      themeIds,
      readWorkareaBacklog
    })
  }
}
