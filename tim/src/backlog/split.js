import { posix } from 'node:path'
import {
  UNBUILT_STATUSES,
  crossThemeDependencies,
  landingWaves
} from './themes.js'

/** The folder, inside a workarea, that holds one split workarea per theme. */
export const THEMES_FOLDER = 'themes'

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

/**
 * The workarea a theme's split backlog lives in.
 *
 * @param {string} workarea - The parent workarea, such as `shared/hrp`
 * @param {string} themeId
 * @returns {string} Such as `shared/hrp/themes/origin-pages`
 */
export const themeWorkareaOf = (workarea, themeId) =>
  `${workarea}/${THEMES_FOLDER}/${themeId}`

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
 * `externalDependsOn` on that theme's split workarea, or on the parent's.
 */
const splitRowOf = ({ row, workarea, themeOfRow }) => {
  const dependsOn = asList(row.dependsOn)
  const crossing = dependsOn
    .filter((id) => themeOfRow.get(id) !== row.theme)
    .map((id) => dependencyTarget({ workarea, themeOfRow, id }))
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
  readWorkareaBacklog
}) => {
  const splitWorkarea = themeWorkareaOf(workarea, theme.id)
  const existingRows = new Map(
    rowsOf(readWorkareaBacklog(splitWorkarea)).map((row) => [row.id, row])
  )
  const merged = rowsOf(backlog)
    .filter((row) => row.theme === theme.id)
    .map((row) => splitRowOf({ row, workarea, themeOfRow }))
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

const indexOf = ({ backlog, workarea, splits, waves }) => {
  const splitByTheme = new Map(splits.map((split) => [split.theme, split]))
  const workareaOfTheme = (theme) =>
    theme ? themeWorkareaOf(workarea, theme) : workarea
  return {
    programme: programmeOf(backlog, workarea),
    workarea,
    landingOrder: waves,
    themes: backlog.themes.map((theme) => {
      const split = splitByTheme.get(theme.id)
      return {
        id: theme.id,
        title: theme.title,
        workarea: split.workarea,
        branch: split.backlog.branch,
        wave: split.backlog.parent.wave,
        rows: split.backlog.increments.length,
        dependsOn: asList(theme.dependsOn),
        touches: theme.touches
      }
    }),
    crossThemeDependencies: crossThemeDependencies(backlog).map(
      ({ from, to }) => ({
        from: { ...from, workarea: workareaOfTheme(from.theme) },
        to: { ...to, workarea: workareaOfTheme(to.theme) }
      })
    ),
    unthemed: rowsOf(backlog)
      .filter((row) => row.theme === undefined)
      .map((row) => row.id)
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
  const waves = landingWaves(backlog.themes)
  const waveOf = new Map(
    waves.flatMap(({ wave, themes }) => themes.map((id) => [id, wave]))
  )
  const themeOfRow = themeOfRowMap(backlog)
  const splits = backlog.themes.map((theme) =>
    splitOf({
      backlog,
      workarea,
      theme,
      branchPrefix,
      waveOf,
      themeOfRow,
      readWorkareaBacklog
    })
  )
  const themeIds = [
    ...new Set([
      ...backlog.themes.map((theme) => theme.id),
      ...asList(previousIndex?.themes).map((theme) => theme?.id)
    ])
  ].filter((id) => typeof id === 'string' && THEME_ID.test(id))
  return {
    splits,
    index: indexOf({ backlog, workarea, splits, waves }),
    problems: movedBuiltRowProblems({
      backlog,
      workarea,
      themeIds,
      readWorkareaBacklog
    })
  }
}
