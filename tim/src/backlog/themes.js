import { findCycle } from './graph.js'

/**
 * The statuses whose rows are still to build. Once a backlog has themes,
 * each of these rows must name one (requirements-pipeline SHAPE.md, "Themes").
 */
export const UNBUILT_STATUSES = new Set(['todo', 'blocked'])

const WHOLE_REPO = '.'

const isText = (value) => typeof value === 'string' && value.trim() !== ''

const isTextList = (value) => Array.isArray(value) && value.every(isText)

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const rowsOf = (backlog) =>
  Array.isArray(backlog?.increments)
    ? backlog.increments.filter(isPlainObject)
    : []

const themesOf = (backlog) =>
  Array.isArray(backlog?.themes)
    ? backlog.themes.filter((theme) => isPlainObject(theme) && isText(theme.id))
    : []

const themeDependenciesOf = (theme) =>
  isTextList(theme.dependsOn) ? theme.dependsOn : []

const rowDependenciesOf = (row) =>
  isTextList(row.dependsOn) ? row.dependsOn : []

const duplicatesIn = (values) => [
  ...new Set(values.filter((value, at) => values.indexOf(value) !== at))
]

/**
 * Parse one `touches` entry, `<repoKey>:<path prefix>`, into its repo key and
 * a path with no leading `./` and no trailing slash. A path of `.` is the
 * whole repo.
 *
 * @param {string} touch
 * @returns {{repoKey: string, path: string}|null} null when it has no colon
 */
export const parseTouch = (touch) => {
  const separatorIndex = typeof touch === 'string' ? touch.indexOf(':') : -1
  if (separatorIndex <= 0) return null
  const path = touch
    .slice(separatorIndex + 1)
    .replace(/^(\.\/)+/, '')
    .replace(/\/+$/, '')
  return {
    repoKey: touch.slice(0, separatorIndex),
    path: path === '' ? WHOLE_REPO : path
  }
}

const isWithin = (path, prefix) =>
  prefix === WHOLE_REPO || path === prefix || path.startsWith(`${prefix}/`)

/**
 * Whether two code areas overlap: the same repo, and one path the same as,
 * or inside, the other.
 *
 * @param {{repoKey: string, path: string}} first
 * @param {{repoKey: string, path: string}} second
 * @returns {boolean}
 */
export const touchesOverlap = (first, second) =>
  first.repoKey === second.repoKey &&
  (isWithin(first.path, second.path) || isWithin(second.path, first.path))

const touchesOf = (theme) =>
  (Array.isArray(theme.touches) ? theme.touches : [])
    .map((touch) => ({ touch, parsed: parseTouch(touch) }))
    .filter((entry) => entry.parsed)

/**
 * Every theme a theme lands after, directly or through another theme.
 *
 * @param {Map<string, string[]>} edges - Each theme id's dependsOn
 * @param {string} start
 * @returns {Set<string>}
 */
const reachableFrom = (edges, start) => {
  const seen = new Set()
  const pending = [...(edges.get(start) ?? [])]
  while (pending.length) {
    const next = pending.pop()
    if (seen.has(next)) continue
    seen.add(next)
    pending.push(...(edges.get(next) ?? []))
  }
  return seen
}

const themeEdges = (themes) =>
  new Map(themes.map((theme) => [theme.id, themeDependenciesOf(theme)]))

/**
 * The landing order of a set of themes: wave 1 holds every theme that waits
 * for none, and each later wave every theme whose dependencies all land in
 * earlier waves. Themes in one wave have no ordering need between them, so
 * they build in parallel. A theme in a cycle, or depending on a theme that is
 * not there, gets no wave.
 *
 * @param {{id: string, dependsOn?: string[]}[]} themes
 * @returns {{wave: number, themes: string[]}[]}
 */
export const landingWaves = (themes) => {
  const waveOf = new Map()
  const known = new Set(themes.map((theme) => theme.id))
  let placed = true
  while (placed) {
    placed = false
    for (const theme of themes) {
      if (waveOf.has(theme.id)) continue
      const dependencies = themeDependenciesOf(theme)
      if (!dependencies.every((id) => known.has(id) && waveOf.has(id))) {
        continue
      }
      waveOf.set(
        theme.id,
        1 + Math.max(0, ...dependencies.map((id) => waveOf.get(id)))
      )
      placed = true
    }
  }
  const waves = Math.max(0, ...waveOf.values())
  return Array.from({ length: waves }, (_, at) => ({
    wave: at + 1,
    themes: themes
      .filter((theme) => waveOf.get(theme.id) === at + 1)
      .map((theme) => theme.id)
  }))
}

const themeListProblems = (themes) => {
  const ids = new Set(themes.map((theme) => theme.id))
  const duplicates = duplicatesIn(themes.map((theme) => theme.id)).map(
    (id) => `Theme "${id}" appears more than once.`
  )
  const dependencies = themes.flatMap((theme) =>
    themeDependenciesOf(theme).flatMap((target) => {
      if (target === theme.id) return [`Theme "${theme.id}" depends on itself.`]
      if (ids.has(target)) return []
      return [
        `Theme "${theme.id}" depends on theme "${target}", which "themes" does not name.`
      ]
    })
  )
  const withoutSelf = new Map(
    themes.map((theme) => [
      theme.id,
      themeDependenciesOf(theme).filter((target) => target !== theme.id)
    ])
  )
  const cycle = findCycle(withoutSelf)
  return [
    ...duplicates,
    ...dependencies,
    ...(cycle ? [`A theme dependsOn cycle: ${cycle.join(' → ')}.`] : [])
  ]
}

const touchRepoProblems = (themes, repoKeys) =>
  repoKeys
    ? themes.flatMap((theme) =>
        touchesOf(theme)
          .filter(({ parsed }) => !repoKeys.includes(parsed.repoKey))
          .map(
            ({ touch, parsed }) =>
              `Theme "${theme.id}" touches ${touch}, but the backlog's "repos" does not name ${parsed.repoKey}.`
          )
      )
    : []

const overlapProblems = (themes) =>
  themes.flatMap((theme, at) =>
    themes.slice(at + 1).flatMap((other) =>
      touchesOf(theme).flatMap((mine) =>
        touchesOf(other)
          .filter((theirs) => touchesOverlap(mine.parsed, theirs.parsed))
          .map(
            (theirs) =>
              `Themes "${theme.id}" and "${other.id}" overlap: ${mine.touch} (${theme.id}) and ${theirs.touch} (${other.id}). Two themes that touch the same code raise conflicting pull requests.`
          )
      )
    )
  )

const rowThemeProblems = (rows, themeIds) =>
  rows.flatMap((row) => {
    if (!isText(row.id)) return []
    if (row.theme === undefined) {
      return UNBUILT_STATUSES.has(row.status)
        ? [
            `${row.id} has no "theme". Every todo or blocked row belongs to one theme.`
          ]
        : []
    }
    if (!isText(row.theme) || themeIds.has(row.theme)) return []
    return [
      `${row.id} is in theme "${row.theme}", which "themes" does not name.`
    ]
  })

const rowRepoProblems = (rows, themesById) =>
  rows
    .filter(
      (row) =>
        UNBUILT_STATUSES.has(row.status) &&
        themesById.has(row.theme) &&
        isTextList(row.repos)
    )
    .flatMap((row) => {
      const theme = themesById.get(row.theme)
      const touched = new Set(
        touchesOf(theme).map(({ parsed }) => parsed.repoKey)
      )
      return row.repos
        .filter((key) => !touched.has(key))
        .map(
          (key) =>
            `${row.id} builds in ${key}, which theme "${theme.id}" does not touch. Add a ${key} path to the theme's "touches", or move the row.`
        )
    })

const emptyThemeProblems = (themes, rows) => {
  const used = new Set(rows.map((row) => row.theme))
  return themes
    .filter((theme) => !used.has(theme.id))
    .map(
      (theme) => `Theme "${theme.id}" has no rows. Give it rows, or remove it.`
    )
}

const crossThemeProblems = (rows, themes) => {
  const themeById = new Map(
    rows.filter((row) => isText(row.id)).map((row) => [row.id, row.theme])
  )
  const known = new Set(themes.map((theme) => theme.id))
  const edges = themeEdges(themes)
  return rows.flatMap((row) =>
    rowDependenciesOf(row).flatMap((target) => {
      const targetTheme = themeById.get(target)
      if (!known.has(row.theme) || !known.has(targetTheme)) return []
      if (targetTheme === row.theme) return []
      if (reachableFrom(edges, row.theme).has(targetTheme)) return []
      return [
        `${row.id} (theme "${row.theme}") depends on ${target} (theme "${targetTheme}"), so theme "${row.theme}" must depend on theme "${targetTheme}".`
      ]
    })
  )
}

/**
 * Every pair of a row and a dependency in another theme, or in no theme:
 * the cross-theme ordering needs a split turns into `externalDependsOn`.
 *
 * @param {object} backlog
 * @returns {{from: {theme: string, id: string}, to: {theme: string|null, id: string}}[]}
 */
export const crossThemeDependencies = (backlog) => {
  const rows = rowsOf(backlog)
  const themeById = new Map(
    rows.filter((row) => isText(row.id)).map((row) => [row.id, row.theme])
  )
  return rows
    .filter((row) => isText(row.theme))
    .flatMap((row) =>
      rowDependenciesOf(row)
        .filter((target) => themeById.has(target))
        .filter((target) => themeById.get(target) !== row.theme)
        .map((target) => ({
          from: { theme: row.theme, id: row.id },
          to: { theme: themeById.get(target) ?? null, id: target }
        }))
    )
}

const themedBacklogProblems = (backlog, repoKeys) => {
  const themes = themesOf(backlog)
  const rows = rowsOf(backlog)
  const themesById = new Map(themes.map((theme) => [theme.id, theme]))
  return [
    ...themeListProblems(themes),
    ...touchRepoProblems(themes, repoKeys),
    ...overlapProblems(themes),
    ...emptyThemeProblems(themes, rows),
    ...rowThemeProblems(rows, new Set(themesById.keys())),
    ...rowRepoProblems(rows, themesById),
    ...crossThemeProblems(rows, themes)
  ]
}

const SPLIT_FIELDS = ['branch', 'parent']

const splitBacklogProblems = (backlog) => {
  const missing = SPLIT_FIELDS.filter((field) => backlog[field] === undefined)
  return [
    ...missing.map(
      (field) =>
        `The backlog is theme "${backlog.theme}"'s split but has no "${field}". Run tim backlog split again in its parent workarea.`
    ),
    ...(backlog.themes === undefined
      ? []
      : [
          `The backlog is theme "${backlog.theme}"'s split, so it cannot have "themes" of its own.`
        ]),
    ...rowsOf(backlog)
      .filter(
        (row) =>
          isText(row.id) && isText(row.theme) && row.theme !== backlog.theme
      )
      .map(
        (row) =>
          `${row.id} is in theme "${row.theme}", but this backlog is theme "${backlog.theme}"'s.`
      )
  ]
}

const unthemedBacklogProblems = (backlog) =>
  rowsOf(backlog)
    .filter((row) => isText(row.id) && isText(row.theme))
    .map(
      (row) =>
        `${row.id} is in theme "${row.theme}", but the backlog has no "themes".`
    )

/**
 * The theme rules a schema cannot check (requirements-pipeline SHAPE.md,
 * "Themes"). In a backlog with `themes`: ids are unique; every theme it
 * depends on exists, with no cycle; no two themes touch the same code; each
 * touched repo is one the envelope names; every theme has rows; every todo or
 * blocked row names a theme, and builds only in repos its theme touches; and
 * a row that depends on a row in another theme has its theme depend on that
 * theme, directly or through another. In a split backlog (with `theme`): it
 * has its `branch` and `parent`, no `themes`, and no row of another theme.
 *
 * @param {object} backlog - A parsed backlog with an increments list
 * @returns {string[]}
 */
export const themeProblems = (backlog) => {
  if (!isPlainObject(backlog)) return []
  const repoKeys = isPlainObject(backlog.repos)
    ? Object.keys(backlog.repos)
    : null
  if (isText(backlog.theme)) return splitBacklogProblems(backlog)
  if (Array.isArray(backlog.themes)) {
    return themedBacklogProblems(backlog, repoKeys)
  }
  return unthemedBacklogProblems(backlog)
}

const externalDependenciesOf = (row) =>
  Array.isArray(row.externalDependsOn)
    ? row.externalDependsOn.filter(
        (entry) =>
          isPlainObject(entry) && isText(entry.workarea) && isText(entry.id)
      )
    : []

/**
 * Every `externalDependsOn` that names a backlog that is not there, or a row
 * that backlog does not have.
 *
 * @param {object} backlog
 * @param {(workarea: string) => object|null} readWorkareaBacklog - The
 *   parsed backlog.json of a workarea, or null when it has none
 * @returns {string[]}
 */
export const externalDependencyProblems = (backlog, readWorkareaBacklog) =>
  rowsOf(backlog)
    .filter((row) => isText(row.id))
    .flatMap((row) =>
      externalDependenciesOf(row).flatMap(({ workarea, id }) => {
        const other = readWorkareaBacklog(workarea)
        if (!other) {
          return [
            `${row.id} depends on ${id} in ${workarea}, which has no backlog.json.`
          ]
        }
        if (rowsOf(other).some((candidate) => candidate.id === id)) return []
        return [
          `${row.id} depends on ${id} in ${workarea}, which is not in that backlog.`
        ]
      })
    )

/**
 * Whether every row a row depends on in another workarea is `done` there.
 *
 * @param {object} row
 * @param {(workarea: string) => object|null} readWorkareaBacklog
 * @returns {boolean}
 */
export const externalDependenciesDone = (row, readWorkareaBacklog) =>
  externalDependenciesOf(row).every(({ workarea, id }) =>
    rowsOf(readWorkareaBacklog(workarea)).some(
      (candidate) => candidate.id === id && candidate.status === 'done'
    )
  )
