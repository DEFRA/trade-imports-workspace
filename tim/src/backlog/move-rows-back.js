import { posix } from 'node:path'
import { TimError } from '../errors.js'
import { relinkOf } from './move-rows.js'
import { movedBackOf, movedOutOf } from './split-off.js'
import { UNBUILT_STATUSES } from './themes.js'

const BACKLOG_FILE = 'backlog.json'

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const asList = (value) => {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

const rowsOf = (backlog) =>
  Array.isArray(backlog?.increments) ? backlog.increments : []

const unique = (values) => [...new Set(values)]

const withoutField = (object, field) =>
  Object.fromEntries(Object.entries(object).filter(([key]) => key !== field))

const withExternalDependsOn = (row, entries) =>
  entries.length
    ? { ...row, externalDependsOn: entries }
    : withoutField(row, 'externalDependsOn')

const withoutPointerFor = (backlog, theme) => {
  const kept = movedOutOf(backlog).filter((pointer) => pointer.theme !== theme)
  return kept.length
    ? { ...backlog, movedOut: kept }
    : withoutField(backlog, 'movedOut')
}

const refuseWithoutPointer = (home, fromTheme) => {
  const named = movedOutOf(home).map((pointer) => `"${pointer.theme}"`)
  throw new TimError(
    'USAGE',
    `This backlog moved no rows to theme "${fromTheme}", so there are none to move back. Its "movedOut" names ${named.join(', ') || 'no theme'}.`
  )
}

const refuseRowsItCannotMoveBack = ({ pointer, source, rowIds, fromTheme }) => {
  const moved = new Set(asList(pointer.increments))
  const strangers = rowIds.filter((id) => !moved.has(id))
  if (strangers.length) {
    throw new TimError(
      'USAGE',
      `${strangers.join(', ')} did not move to theme "${fromTheme}", so nothing was moved back.`
    )
  }
  const rows = new Map(rowsOf(source).map((row) => [row.id, row]))
  const missing = rowIds.filter((id) => !rows.has(id))
  if (missing.length) {
    throw new TimError(
      'USAGE',
      `${pointer.workarea} has no ${missing.join(', ')}, so nothing was moved back.`
    )
  }
  const built = rowIds.filter(
    (id) => !UNBUILT_STATUSES.has(rows.get(id).status)
  )
  if (built.length) {
    throw new TimError(
      'USAGE',
      `${built.map((id) => `${id} is ${rows.get(id).status}`).join(', ')}. Only a todo or blocked row moves back: a row built or set aside stays where it was built.`
    )
  }
}

const returningRowOf = ({ row, moving, home, source }) => {
  const external = asList(row.externalDependsOn)
  const fromHome = external
    .filter((entry) => entry?.workarea === home.workarea)
    .map((entry) => entry.id)
  const dependsOn = asList(row.dependsOn)
  const stillAway = dependsOn
    .filter((id) => !moving.has(id))
    .map((id) => ({ workarea: source.workarea, id }))
  return withExternalDependsOn(
    {
      ...row,
      ...(row.theme === undefined ? {} : { theme: home.theme }),
      dependsOn: unique([
        ...dependsOn.filter((id) => moving.has(id)),
        ...fromHome
      ])
    },
    [
      ...external.filter((entry) => entry?.workarea !== home.workarea),
      ...stillAway
    ]
  )
}

const homeRowOf = ({ row, isReturning }) => {
  const external = asList(row.externalDependsOn)
  const returning = external.filter(isReturning)
  if (!returning.length) return row
  return withExternalDependsOn(
    {
      ...row,
      dependsOn: unique([
        ...asList(row.dependsOn),
        ...returning.map((entry) => entry.id)
      ])
    },
    external.filter((entry) => !isReturning(entry))
  )
}

const leftAwayRowOf = ({ row, moving, home }) => {
  const dependsOn = asList(row.dependsOn)
  const crossing = dependsOn.filter((id) => moving.has(id))
  if (!crossing.length) return row
  return {
    ...row,
    dependsOn: dependsOn.filter((id) => !moving.has(id)),
    externalDependsOn: [
      ...asList(row.externalDependsOn),
      ...crossing.map((id) => ({ workarea: home.workarea, id }))
    ]
  }
}

const withReturningRows = (homeRows, returningRows, moving) => {
  const firstWaiting = homeRows.findIndex((row) =>
    asList(row.dependsOn).some((id) => moving.has(id))
  )
  const at = firstWaiting === -1 ? homeRows.length : firstWaiting
  return [...homeRows.slice(0, at), ...returningRows, ...homeRows.slice(at)]
}

const homeBacklogOf = ({ home, pointer, rows, stillAway }) => {
  const without = withoutPointerFor(home.backlog, pointer.theme)
  if (!stillAway.length) return { ...without, increments: rows }
  const heldAway = new Set(stillAway.flatMap((row) => asList(row.requirements)))
  const keptIds = new Set(stillAway.map((row) => row.id))
  const kept = {
    ...pointer,
    increments: asList(pointer.increments).filter((id) => keptIds.has(id)),
    requirements: asList(pointer.requirements).filter((id) => heldAway.has(id))
  }
  return {
    ...home.backlog,
    movedOut: movedOutOf(home.backlog).map((candidate) =>
      candidate.theme === pointer.theme ? kept : candidate
    ),
    increments: rows
  }
}

const sourceBacklogOf = ({ source, movedBack, rows }) => ({
  ...withoutField(withoutField(source.backlog, 'increments'), 'movedBack'),
  movedBack: [...movedBackOf(source.backlog), movedBack],
  increments: rows
})

const waitsOn = ({ rows, isCrossing, workarea }) =>
  rows.flatMap((row) =>
    asList(row.dependsOn)
      .filter(isCrossing)
      .map((id) => ({ id: row.id, dependsOn: id, workarea }))
  )

/**
 * Plan moving rows back into the split backlog they were moved out of with
 * `tim backlog split --rows --to`, so the backlog's own machine builds them
 * after all. Writes nothing.
 *
 * Each row comes back with every field it has, its status unchanged and its
 * theme the home backlog's again, placed before the first home row that waits
 * for it. A dependency on a home row that was an `externalDependsOn` becomes a
 * `dependsOn` again, both ways; a dependency on a row that stays away becomes
 * an `externalDependsOn` on the backlog it stays in. The home backlog's
 * `movedOut` pointer loses the rows, and is dropped once it holds none, with
 * `movedOut` itself once it is empty. The backlog they leave keeps a pointer
 * to them in `movedBack`, so neither machine builds them twice. Every other
 * backlog given that waits for a returning row is pointed at the home
 * workarea.
 *
 * @param {object} args
 * @param {object} args.backlog - The home split backlog, with `theme` and `movedOut`
 * @param {string} args.workarea - Its workarea, normalised
 * @param {string[]} args.rowIds - The rows to move back, each todo or blocked
 * @param {string} args.fromTheme - The theme the rows moved to
 * @param {(workarea: string) => object|null} args.readWorkareaBacklog - Reads any backlog on disk
 * @param {string[]} args.otherWorkareas - The programme's other backlogs, to point at the rows' home
 * @param {string} args.at - When the rows moved back, as an ISO 8601 time
 * @returns {{workarea: string, backlog: object, sourceBacklog: object, pointer: object, relinks: object[], rewired: {home: object[], away: object[], relinked: object[]}}}
 * @throws {TimError} USAGE when the backlog moved no rows to that theme, its backlog is not there, or a row did not move there, is not there or is not todo or blocked
 */
export const planMoveRowsBack = ({
  backlog,
  workarea,
  rowIds,
  fromTheme,
  readWorkareaBacklog,
  otherWorkareas,
  at
}) => {
  const pointer = movedOutOf(backlog).find(
    (candidate) => candidate.theme === fromTheme
  )
  if (!pointer) refuseWithoutPointer(backlog, fromTheme)
  const sourceBacklog = readWorkareaBacklog(pointer.workarea)
  if (!sourceBacklog) {
    throw new TimError(
      'USAGE',
      `${pointer.workarea} has no backlog.json, so nothing was moved back.`
    )
  }
  refuseRowsItCannotMoveBack({
    pointer,
    source: sourceBacklog,
    rowIds,
    fromTheme
  })

  const home = { workarea, theme: backlog.theme, backlog }
  const source = { workarea: pointer.workarea, backlog: sourceBacklog }
  const moving = new Set(rowIds)
  const sourceRows = rowsOf(sourceBacklog)
  const returning = sourceRows.filter((row) => moving.has(row.id))
  const stayingAway = sourceRows.filter((row) => !moving.has(row.id))
  const isReturning = (entry) =>
    entry?.workarea === source.workarea && moving.has(entry.id)
  const homeRows = rowsOf(backlog).map((row) => homeRowOf({ row, isReturning }))
  const movedBack = {
    theme: home.theme,
    workarea,
    backlog: posix.join(
      posix.relative(source.workarea, workarea),
      BACKLOG_FILE
    ),
    increments: returning.map((row) => row.id),
    at
  }
  const relinks = unique(otherWorkareas)
    .filter((other) => other !== workarea && other !== source.workarea)
    .flatMap((other) => {
      const otherBacklog = readWorkareaBacklog(other)
      return otherBacklog
        ? relinkOf({
            workarea: other,
            backlog: otherBacklog,
            isStale: isReturning,
            target: workarea
          })
        : []
    })
  const stillAwayInPointer = stayingAway.filter((row) =>
    asList(pointer.increments).includes(row.id)
  )
  return {
    workarea: source.workarea,
    backlog: homeBacklogOf({
      home,
      pointer,
      rows: withReturningRows(
        homeRows,
        returning.map((row) => returningRowOf({ row, moving, home, source })),
        moving
      ),
      stillAway: stillAwayInPointer
    }),
    sourceBacklog: sourceBacklogOf({
      source,
      movedBack,
      rows: stayingAway.map((row) => leftAwayRowOf({ row, moving, home }))
    }),
    pointer: movedBack,
    relinks,
    rewired: {
      home: rowsOf(backlog).flatMap((row) =>
        asList(row.externalDependsOn)
          .filter(isReturning)
          .map((entry) => ({ id: row.id, dependsOn: entry.id, workarea }))
      ),
      away: waitsOn({
        rows: stayingAway,
        isCrossing: (id) => moving.has(id),
        workarea
      }),
      relinked: relinks.flatMap((relink) => relink.relinked)
    }
  }
}

const relinkIndexEnd = ({ end, moving, from, toTheme, target }) =>
  isPlainObject(end) && end.workarea === from && moving.has(end.id)
    ? { ...end, theme: toTheme, workarea: target }
    : end

const rowCountOf = (entry, counts) =>
  counts.has(entry?.id) ? { ...entry, rows: counts.get(entry.id) } : entry

/**
 * The themes index after rows moved back from one split theme to the one they
 * came from: both entries' row counts, and every cross-theme dependency on a
 * returning row pointed at its home workarea. A theme left with no rows leaves
 * the landing order, and its entry says `movedBackTo`, so nothing builds it.
 *
 * @param {object} args
 * @param {object} args.index - The themes.json on disk
 * @param {{theme: string, workarea: string, rows: number}} args.home
 * @param {{theme: string, workarea: string, rows: number}} args.source
 * @param {string[]} args.rowIds - The rows that moved back
 * @returns {object}
 */
export const indexWithRowsMovedBack = ({ index, home, source, rowIds }) => {
  const moving = new Set(rowIds)
  const emptied = source.rows === 0
  const counts = new Map([
    [home.theme, home.rows],
    [source.theme, source.rows]
  ])
  const relinkEnd = (end) =>
    relinkIndexEnd({
      end,
      moving,
      from: source.workarea,
      toTheme: home.theme,
      target: home.workarea
    })
  return {
    ...index,
    landingOrder: asList(index.landingOrder).map((wave) =>
      emptied && asList(wave?.themes).includes(source.theme)
        ? { ...wave, themes: wave.themes.filter((id) => id !== source.theme) }
        : wave
    ),
    themes: asList(index.themes).map((entry) => {
      const counted = rowCountOf(entry, counts)
      return emptied && entry?.id === source.theme
        ? { ...counted, movedBackTo: home.theme }
        : counted
    }),
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
