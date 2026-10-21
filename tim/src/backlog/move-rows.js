import { posix } from 'node:path'
import { TimError } from '../errors.js'
import { movedOutOf } from './split-off.js'
import { UNBUILT_STATUSES, themeWorkareaOf } from './themes.js'

const BACKLOG_FILE = 'backlog.json'

const isText = (value) => typeof value === 'string' && value.trim() !== ''

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const asList = (value) => {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

const rowsOf = (backlog) =>
  Array.isArray(backlog?.increments) ? backlog.increments : []

const optional = (field, value) =>
  value === undefined ? {} : { [field]: value }

const withThemeSuffix = (text, fromTheme, toTheme) => {
  const suffix = `-${fromTheme}`
  return text.endsWith(suffix)
    ? `${text.slice(0, -suffix.length)}-${toTheme}`
    : `${text}-${toTheme}`
}

/**
 * The branch rows moved out of a split backlog build on when nobody gives
 * one: the split backlog's own branch with its theme id swapped for the new
 * theme's, or with the new theme's id added when it does not end in it.
 *
 * @param {{theme: string, branch: string}} backlog - A split backlog
 * @param {string} toTheme
 * @returns {string}
 */
export const defaultMovedBranch = (backlog, toTheme) =>
  withThemeSuffix(backlog.branch, backlog.theme, toTheme)

const refuseRowsItCannotMove = ({ backlog, rowIds, toTheme, target }) => {
  if (toTheme === backlog.theme) {
    throw new TimError(
      'USAGE',
      `--to names this backlog's own theme, "${toTheme}". Give the new theme's id.`
    )
  }
  if (target.exists) {
    throw new TimError(
      'USAGE',
      `${target.workarea} already has a backlog. Give --to a theme id no backlog uses yet.`
    )
  }
  const rows = new Map(rowsOf(backlog).map((row) => [row.id, row]))
  const missing = rowIds.filter((id) => !rows.has(id))
  if (missing.length) {
    throw new TimError(
      'USAGE',
      `The backlog has no ${missing.join(', ')}, so nothing was moved.`
    )
  }
  const built = rowIds.filter(
    (id) => !UNBUILT_STATUSES.has(rows.get(id).status)
  )
  if (built.length) {
    throw new TimError(
      'USAGE',
      `${built.map((id) => `${id} is ${rows.get(id).status}`).join(', ')}. Only a todo or blocked row moves: a row built or set aside stays where it was built.`
    )
  }
}

const doneIdsOf = (backlog) =>
  new Set(
    rowsOf(backlog)
      .filter((row) => row.status === 'done')
      .map((row) => row.id)
  )

const movedRowOf = ({ row, moving, done, workarea, toTheme }) => {
  const dependsOn = asList(row.dependsOn)
  const waiting = dependsOn.filter((id) => !moving.has(id) && !done.has(id))
  const externalDependsOn = [
    ...asList(row.externalDependsOn),
    ...waiting.map((id) => ({ workarea, id }))
  ]
  return {
    ...row,
    ...(row.theme === undefined ? {} : { theme: toTheme }),
    dependsOn: dependsOn.filter((id) => moving.has(id)),
    ...(externalDependsOn.length ? { externalDependsOn } : {})
  }
}

const leftRowOf = ({ row, moving, target }) => {
  const dependsOn = asList(row.dependsOn)
  const crossing = dependsOn.filter((id) => moving.has(id))
  if (!crossing.length) return row
  return {
    ...row,
    dependsOn: dependsOn.filter((id) => !moving.has(id)),
    externalDependsOn: [
      ...asList(row.externalDependsOn),
      ...crossing.map((id) => ({ workarea: target, id }))
    ]
  }
}

const reposUsed = (backlog, rows) => {
  if (!isPlainObject(backlog.repos)) return undefined
  const everyRepo = rows.some((row) => !Array.isArray(row.repos))
  const used = new Set(rows.flatMap((row) => asList(row.repos)))
  return Object.fromEntries(
    Object.keys(backlog.repos)
      .filter((key) => everyRepo || used.has(key))
      .map((key) => [key, backlog.repos[key]])
  )
}

const newBacklogOf = ({ backlog, toTheme, branch, rows }) => ({
  ...optional(
    'programme',
    isText(backlog.programme)
      ? withThemeSuffix(backlog.programme, backlog.theme, toTheme)
      : undefined
  ),
  ...optional('generatedFrom', backlog.generatedFrom),
  ...optional('invariants', backlog.invariants),
  ...optional('repos', reposUsed(backlog, rows)),
  theme: toTheme,
  branch,
  parent: backlog.parent,
  ...optional('touches', backlog.touches),
  increments: rows
})

const pointerOf = ({ toTheme, branch, workarea, target, rows, at }) => ({
  theme: toTheme,
  branch,
  workarea: target,
  backlog: posix.join(posix.relative(workarea, target), BACKLOG_FILE),
  increments: rows.map((row) => row.id),
  requirements: [
    ...new Set(rows.flatMap((row) => asList(row.requirements).filter(isText)))
  ],
  at
})

const sourceBacklogOf = ({ backlog, pointer, rows }) => {
  const { increments, movedOut, ...envelope } = backlog
  return {
    ...envelope,
    movedOut: [...movedOutOf(backlog), pointer],
    increments: rows
  }
}

/**
 * One other backlog's rows repointed: every `externalDependsOn` entry that
 * `isStale` matches now names `target` as its workarea.
 *
 * @param {object} args
 * @param {string} args.workarea - The other backlog's workarea
 * @param {object} args.backlog - The other backlog
 * @param {(entry: object) => boolean} args.isStale
 * @param {string} args.target - The workarea the matched entries now name
 * @returns {{workarea: string, relinked: object[], backlog: object}[]} One entry when anything changed, none otherwise
 */
export const relinkOf = ({ workarea, backlog, isStale, target }) => {
  const relinked = rowsOf(backlog).flatMap((row) =>
    asList(row.externalDependsOn)
      .filter(isStale)
      .map((entry) => ({ id: row.id, dependsOn: entry.id, workarea: target }))
  )
  if (!relinked.length) return []
  const relinkEntry = (entry) =>
    isStale(entry) ? { ...entry, workarea: target } : entry
  return [
    {
      workarea,
      relinked,
      backlog: {
        ...backlog,
        increments: rowsOf(backlog).map((row) =>
          row.externalDependsOn === undefined
            ? row
            : {
                ...row,
                externalDependsOn: asList(row.externalDependsOn).map(
                  relinkEntry
                )
              }
        )
      }
    }
  ]
}

const waitsOn = ({ rows, isCrossing, workareaOf }) =>
  rows.flatMap((row) =>
    asList(row.dependsOn)
      .filter((id) => isCrossing(id))
      .map((id) => ({ id: row.id, dependsOn: id, workarea: workareaOf(id) }))
  )

/**
 * Plan moving some rows of a split backlog into a new split backlog of their
 * own, so a second machine builds them on their own branch. Writes nothing.
 *
 * The new backlog sits beside the old one, at `<parent>/themes/<toTheme>`. It
 * carries the old envelope (its programme and theme renamed), the repos the
 * moved rows use, the given branch, the same `parent` and `touches`, and the
 * moved rows, each now in theme `toTheme`. The old backlog loses the rows and
 * keeps a pointer to them in `movedOut`, so nothing drafts them again.
 *
 * A moved row's dependsOn on a row left behind that is done is dropped: the
 * new branch is cut from the old one, so it already has that row. One on a
 * row left behind that is not done becomes an `externalDependsOn` on the old
 * workarea, and a row left behind that depended on a moved row gets one on
 * the new workarea. Every other backlog given whose `externalDependsOn` names
 * a moved row in the old workarea is pointed at the new one.
 *
 * @param {object} args
 * @param {object} args.backlog - The split backlog, already checked, with `theme`
 * @param {string} args.workarea - Its workarea, normalised
 * @param {string[]} args.rowIds - The rows to move, each todo or blocked
 * @param {string} args.toTheme - The new theme's id
 * @param {string} args.branch - The branch the new theme builds on
 * @param {(workarea: string) => object|null} args.readWorkareaBacklog - Reads any backlog on disk
 * @param {string[]} args.otherWorkareas - The programme's other backlogs, to point at the rows' new home
 * @param {string} args.at - When the rows moved, as an ISO 8601 time
 * @returns {{workarea: string, backlog: object, newBacklog: object, pointer: object, relinks: object[], rewired: {left: object[], moved: object[], dropped: object[], relinked: object[]}}}
 * @throws {TimError} USAGE when a row is not there or not todo or blocked, the theme is the backlog's own, or its workarea already has a backlog
 */
export const planMoveRows = ({
  backlog,
  workarea,
  rowIds,
  toTheme,
  branch,
  readWorkareaBacklog,
  otherWorkareas,
  at
}) => {
  const targetWorkarea = themeWorkareaOf(backlog.parent.workarea, toTheme)
  refuseRowsItCannotMove({
    backlog,
    rowIds,
    toTheme,
    target: {
      workarea: targetWorkarea,
      exists: Boolean(readWorkareaBacklog(targetWorkarea))
    }
  })
  const moving = new Set(rowIds)
  const done = doneIdsOf(backlog)
  const rows = rowsOf(backlog)
  const movedRows = rows
    .filter((row) => moving.has(row.id))
    .map((row) => movedRowOf({ row, moving, done, workarea, toTheme }))
  const leftRows = rows.filter((row) => !moving.has(row.id))
  const pointer = pointerOf({
    toTheme,
    branch,
    workarea,
    target: targetWorkarea,
    rows: movedRows,
    at
  })
  const isStale = (entry) =>
    entry?.workarea === workarea && moving.has(entry.id)
  const relinks = [...new Set(otherWorkareas)]
    .filter((other) => other !== workarea && other !== targetWorkarea)
    .flatMap((other) => {
      const otherBacklog = readWorkareaBacklog(other)
      return otherBacklog
        ? relinkOf({
            workarea: other,
            backlog: otherBacklog,
            isStale,
            target: targetWorkarea
          })
        : []
    })
  const originalMoved = rows.filter((row) => moving.has(row.id))
  return {
    workarea: targetWorkarea,
    backlog: sourceBacklogOf({
      backlog,
      pointer,
      rows: leftRows.map((row) =>
        leftRowOf({ row, moving, target: targetWorkarea })
      )
    }),
    newBacklog: newBacklogOf({ backlog, toTheme, branch, rows: movedRows }),
    pointer,
    relinks,
    rewired: {
      left: waitsOn({
        rows: leftRows,
        isCrossing: (id) => moving.has(id),
        workareaOf: () => targetWorkarea
      }),
      moved: waitsOn({
        rows: originalMoved,
        isCrossing: (id) => !moving.has(id) && !done.has(id),
        workareaOf: () => workarea
      }),
      dropped: waitsOn({
        rows: originalMoved,
        isCrossing: (id) => !moving.has(id) && done.has(id),
        workareaOf: () => workarea
      }).map(({ id, dependsOn }) => ({ id, dependsOn })),
      relinked: relinks.flatMap((relink) => relink.relinked)
    }
  }
}

const relinkIndexEnd = ({ end, moving, from, toTheme, target }) =>
  isPlainObject(end) && end.workarea === from && moving.has(end.id)
    ? { ...end, theme: toTheme, workarea: target }
    : end

/**
 * The themes index after rows moved from one split theme to a new one: the
 * new theme's entry beside the old one, in the old one's wave, the old
 * entry's row count, and every cross-theme dependency on a moved row pointed
 * at its new workarea.
 *
 * @param {object} args
 * @param {object} args.index - The themes.json on disk
 * @param {string} args.fromTheme
 * @param {string} args.fromWorkarea
 * @param {number} args.rowsLeft - The rows the old backlog keeps
 * @param {object} args.newBacklog - The new split backlog
 * @param {string} args.title - The new theme's title
 * @returns {object}
 */
export const indexWithMovedRows = ({
  index,
  fromTheme,
  fromWorkarea,
  rowsLeft,
  newBacklog,
  title
}) => {
  const toTheme = newBacklog.theme
  const target = themeWorkareaOf(newBacklog.parent.workarea, toTheme)
  const moving = new Set(rowsOf(newBacklog).map((row) => row.id))
  const themes = asList(index.themes)
  const fromEntry = themes.find((entry) => entry?.id === fromTheme)
  const entry = {
    id: toTheme,
    title,
    workarea: target,
    branch: newBacklog.branch,
    wave: newBacklog.parent.wave,
    rows: moving.size,
    dependsOn: asList(newBacklog.parent.landsAfter),
    ...optional('touches', newBacklog.touches),
    movedFrom: fromTheme
  }
  const relinkEnd = (end) =>
    relinkIndexEnd({ end, moving, from: fromWorkarea, toTheme, target })
  return {
    ...index,
    landingOrder: asList(index.landingOrder).map((wave) =>
      asList(wave?.themes).includes(fromTheme)
        ? { ...wave, themes: [...wave.themes, toTheme] }
        : wave
    ),
    themes: [
      ...themes.map((candidate) =>
        candidate === fromEntry ? { ...candidate, rows: rowsLeft } : candidate
      ),
      entry
    ],
    crossThemeDependencies: asList(index.crossThemeDependencies).map(
      (dependency) =>
        isPlainObject(dependency)
          ? {
              ...dependency,
              from: relinkEnd(dependency.from),
              to: relinkEnd(dependency.to)
            }
          : dependency
    )
  }
}
