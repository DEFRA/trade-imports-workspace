/**
 * A theme split off early leaves its parent backlog altogether: its rows live
 * only in its own backlog, on its own branch. The parent keeps one pointer
 * per such theme, in its envelope's `splitOff`, so a re-distil knows which
 * requirements went with it and never drafts rows for them again
 * (requirements-pipeline SHAPE.md, "A theme split off early").
 */

/**
 * The statuses whose rows cover their requirements: built, being built or
 * still to build. A dropped, rejected or merged-into row covers nothing.
 */
export const COVERING_STATUSES = new Set([
  'todo',
  'blocked',
  'done',
  'deferred'
])

const isCovering = (row) => COVERING_STATUSES.has(row.status ?? 'todo')

const isText = (value) => typeof value === 'string' && value.trim() !== ''

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const textsIn = (list) => (Array.isArray(list) ? list.filter(isText) : [])

const rowsOf = (backlog) =>
  Array.isArray(backlog?.increments)
    ? backlog.increments.filter(isPlainObject)
    : []

/**
 * The backlog's split-off pointers that name a theme.
 *
 * @param {object} backlog
 * @returns {object[]}
 */
export const splitOffOf = (backlog) =>
  Array.isArray(backlog?.splitOff)
    ? backlog.splitOff.filter(
        (pointer) => isPlainObject(pointer) && isText(pointer.theme)
      )
    : []

/**
 * The ids of every theme split off the backlog.
 *
 * @param {object} backlog
 * @returns {Set<string>}
 */
export const splitOffThemeIds = (backlog) =>
  new Set(splitOffOf(backlog).map((pointer) => pointer.theme))

/**
 * Every requirement a split-off theme holds: the ones its rows covered when
 * it left, and the ones a later re-distil handed it to pick up.
 *
 * @param {object} pointer
 * @returns {string[]}
 */
export const requirementsOfPointer = (pointer) => [
  ...new Set([...textsIn(pointer.requirements), ...textsIn(pointer.pickUp)])
]

/**
 * Each requirement a split-off theme holds, mapped to its pointer.
 *
 * @param {object} backlog
 * @returns {Map<string, object>}
 */
export const splitOffRequirements = (backlog) =>
  new Map(
    splitOffOf(backlog).flatMap((pointer) =>
      requirementsOfPointer(pointer).map((id) => [id, pointer])
    )
  )

/**
 * The pointer a backlog keeps for a theme it split off.
 *
 * @param {object} args
 * @param {object} args.theme - The theme's entry in the parent's `themes`
 * @param {string} args.branch
 * @param {string} args.workarea - The theme's split workarea
 * @param {string} args.backlogPath - The split backlog, relative to the parent's folder
 * @param {object[]} args.rows - Every row that moved, as the parent had them; only the covering ones give requirements
 * @param {Record<string, string>|null} args.fingerprints - Each requirement's fingerprint now, or null with no requirements.json
 * @param {string} args.at - When it was split off, as an ISO 8601 time
 * @returns {object}
 */
export const pointerOf = ({
  theme,
  branch,
  workarea,
  backlogPath,
  rows,
  fingerprints,
  at
}) => {
  const requirements = [
    ...new Set(
      rows.filter(isCovering).flatMap((row) => textsIn(row.requirements))
    )
  ]
  const known = requirements.filter((id) => isText(fingerprints?.[id]))
  return {
    theme: theme.id,
    title: theme.title,
    why: theme.why,
    touches: theme.touches,
    dependsOn: textsIn(theme.dependsOn),
    branch,
    workarea,
    backlog: backlogPath,
    increments: rows.map((row) => row.id),
    requirements,
    ...(known.length
      ? {
          fingerprints: Object.fromEntries(
            known.map((id) => [id, fingerprints[id]])
          )
        }
      : {}),
    at
  }
}

const duplicatesIn = (values) => [
  ...new Set(values.filter((value, at) => values.indexOf(value) !== at))
]

const pointerCollisionProblems = (pointers, themeIds) => [
  ...duplicatesIn(pointers.map((pointer) => pointer.theme)).map(
    (id) => `Theme "${id}" is split off more than once in "splitOff".`
  ),
  ...pointers
    .filter((pointer) => themeIds.has(pointer.theme))
    .map(
      (pointer) =>
        `Theme "${pointer.theme}" is in both "themes" and "splitOff". A theme split off lives only on its branch, ${pointer.branch}: take it out of "themes".`
    )
]

const rowProblems = (rows, pointers) => {
  const pointerOfTheme = new Map(
    pointers.map((pointer) => [pointer.theme, pointer])
  )
  const pointerOfRow = new Map(
    pointers.flatMap((pointer) =>
      textsIn(pointer.increments).map((id) => [id, pointer])
    )
  )
  return rows
    .filter((row) => isText(row.id))
    .flatMap((row) => [
      ...(pointerOfTheme.has(row.theme)
        ? [
            `${row.id} is in theme "${row.theme}", which was split off to ${pointerOfTheme.get(row.theme).branch}. Its rows live in ${pointerOfTheme.get(row.theme).workarea}: give this row another theme, or add it there.`
          ]
        : []),
      ...(pointerOfRow.has(row.id)
        ? [
            `${row.id} moved to ${pointerOfRow.get(row.id).workarea} when theme "${pointerOfRow.get(row.id).theme}" was split off. Give this row a new id.`
          ]
        : [])
    ])
}

const sharedRequirementProblems = (pointers) => {
  const holders = new Map()
  pointers.forEach((pointer) =>
    requirementsOfPointer(pointer).forEach((id) =>
      holders.set(id, [...(holders.get(id) ?? []), pointer.theme])
    )
  )
  return [...holders]
    .filter(([, themes]) => themes.length > 1)
    .map(
      ([id, themes]) =>
        `${id} is held by more than one split-off theme: ${themes.join(', ')}. Each requirement sits in one.`
    )
}

// A pointer is fixed once written, so a theme it depends on must keep its id:
// renamed or removed, the split-off theme drops out of the landing order.
const pointerDependencyProblems = (pointers, themeIds) => {
  const known = new Set([
    ...themeIds,
    ...pointers.map((pointer) => pointer.theme)
  ])
  return pointers.flatMap((pointer) =>
    textsIn(pointer.dependsOn)
      .filter((target) => !known.has(target))
      .map(
        (target) =>
          `Theme "${pointer.theme}", split off to ${pointer.branch}, depends on theme "${target}", which neither "themes" nor "splitOff" names. Keep that theme's id: put it back in "themes" as "${target}".`
      )
  )
}

/**
 * The backlog's moved-out pointers that name a theme: one per
 * `tim backlog split <workarea> --rows … --to <theme>` run on this split
 * backlog.
 *
 * @param {object} backlog
 * @returns {object[]}
 */
export const movedOutOf = (backlog) =>
  Array.isArray(backlog?.movedOut)
    ? backlog.movedOut.filter(
        (pointer) => isPlainObject(pointer) && isText(pointer.theme)
      )
    : []

/**
 * The moved-out rules a schema cannot check, for a split backlog: rows move
 * to a theme other than its own, each theme once, and no row here reuses the
 * id of a row that moved.
 *
 * @param {object} backlog - A split backlog, with `theme`
 * @returns {string[]}
 */
export const movedOutProblems = (backlog) => {
  const pointers = movedOutOf(backlog)
  const pointerOfRow = new Map(
    pointers.flatMap((pointer) =>
      textsIn(pointer.increments).map((id) => [id, pointer])
    )
  )
  return [
    ...duplicatesIn(pointers.map((pointer) => pointer.theme)).map(
      (id) => `Rows moved to theme "${id}" more than once in "movedOut".`
    ),
    ...pointers
      .filter((pointer) => pointer.theme === backlog.theme)
      .map(
        (pointer) =>
          `"movedOut" names this backlog's own theme, "${pointer.theme}". Rows move to another theme's backlog.`
      ),
    ...rowsOf(backlog)
      .filter((row) => isText(row.id) && pointerOfRow.has(row.id))
      .map(
        (row) =>
          `${row.id} moved to ${pointerOfRow.get(row.id).workarea}, to build on ${pointerOfRow.get(row.id).branch}. Give this row a new id, or build it there.`
      )
  ]
}

/**
 * The backlog's moved-back pointers that name a theme: one per
 * `tim backlog split <home workarea> --rows … --back-from <this theme>` run,
 * each naming the rows that went back to the backlog they first moved out of.
 *
 * @param {object} backlog
 * @returns {object[]}
 */
export const movedBackOf = (backlog) =>
  Array.isArray(backlog?.movedBack)
    ? backlog.movedBack.filter(
        (pointer) => isPlainObject(pointer) && isText(pointer.theme)
      )
    : []

/**
 * The moved-back rule a schema cannot check, for a split backlog: no row here
 * reuses the id of a row that moved back, so no machine builds it twice.
 *
 * @param {object} backlog - A split backlog, with `theme`
 * @returns {string[]}
 */
export const movedBackProblems = (backlog) => {
  const pointerOfRow = new Map(
    movedBackOf(backlog).flatMap((pointer) =>
      textsIn(pointer.increments).map((id) => [id, pointer])
    )
  )
  return rowsOf(backlog)
    .filter((row) => isText(row.id) && pointerOfRow.has(row.id))
    .map(
      (row) =>
        `${row.id} moved back to ${pointerOfRow.get(row.id).workarea}, theme "${pointerOfRow.get(row.id).theme}", which builds it. Give this row a new id, or build it there.`
    )
}

/**
 * The split-off rules a schema cannot check, for a backlog with `themes`:
 * a theme is split off once, never also in `themes`; every theme a pointer
 * depends on is still named; no row here is in a split-off theme or reuses
 * the id of a row that moved; and no requirement is held by two split-off
 * themes.
 *
 * @param {object} backlog
 * @param {Set<string>} themeIds - The ids in the backlog's `themes`
 * @returns {string[]}
 */
export const splitOffProblems = (backlog, themeIds) => {
  const pointers = splitOffOf(backlog)
  return [
    ...pointerCollisionProblems(pointers, themeIds),
    ...pointerDependencyProblems(pointers, themeIds),
    ...rowProblems(rowsOf(backlog), pointers),
    ...sharedRequirementProblems(pointers)
  ]
}
