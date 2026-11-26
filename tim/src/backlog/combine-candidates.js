import { isBuilt, isToBuild } from '../distil/files.js'

const splitTouch = (touch) => {
  const separator = touch.indexOf(':')
  return {
    repoKey: touch.slice(0, separator),
    path: touch.slice(separator + 1)
  }
}

const isInside = (path, outerPath) => {
  const wholeRepoPath = '.'
  return (
    outerPath === wholeRepoPath ||
    path === outerPath ||
    path.startsWith(`${outerPath.replace(/\/+$/, '')}/`)
  )
}

const sharedTouchOf = (touch, otherTouch) => {
  const first = splitTouch(touch)
  const second = splitTouch(otherTouch)
  if (first.repoKey !== second.repoKey) return null
  if (isInside(first.path, second.path)) return touch
  return isInside(second.path, first.path) ? otherTouch : null
}

const sharedTouchesOf = (row, otherRow) => [
  ...new Set(
    (row.touches ?? []).flatMap((touch) =>
      (otherRow.touches ?? [])
        .map((otherTouch) => sharedTouchOf(touch, otherTouch))
        .filter(Boolean)
    )
  )
]

const pendingDependencies = (row, doneIds) =>
  (row.dependsOn ?? []).filter((id) => !doneIds.has(id))

const waitsOnlyOn = (row, otherRow, doneIds) => {
  const pending = pendingDependencies(row, doneIds)
  const hasNoExternalDependencies = (row.externalDependsOn ?? []).length === 0
  return (
    hasNoExternalDependencies &&
    pending.length === 1 &&
    pending[0] === otherRow.id
  )
}

const waitingRowOf = (earlier, later, doneIds) => {
  if (waitsOnlyOn(later, earlier, doneIds)) return later.id
  return waitsOnlyOn(earlier, later, doneIds) ? earlier.id : null
}

const reasonOf = (earlier, later, sharedTouches, waitingRow) =>
  [
    ...(sharedTouches.length ? [`share ${sharedTouches.join(', ')}`] : []),
    ...(waitingRow
      ? [
          `${waitingRow} waits only on ${waitingRow === later ? earlier : later}`
        ]
      : [])
  ].join('; ')

/**
 * The rows still to build that suit combining, each pair once in file order.
 * A pair shares code when a touch of one is the same as, or inside, a touch
 * of the other in the same repo. A pair waits only on each other when one
 * row's only dependency that is not done is the other, and it has no
 * `externalDependsOn`. Only `todo` rows are paired: a `blocked` row carries
 * an open question of its own.
 *
 * @param {{increments?: object[]}} backlog
 * @returns {{rowsToBuild: number, withoutTouches: string[], candidates: Array<{rows: [string, string], sharedTouches: string[], waitingRow: string|null, reason: string}>}} `waitingRow` is the row of the pair that waits only on the other, null when neither does; `reason` says why the pair is listed
 */
export const combineCandidatesIn = (backlog) => {
  const rows = backlog.increments ?? []
  const doneIds = new Set(rows.filter(isBuilt).map((row) => row.id))
  const rowsToBuild = rows.filter(isToBuild)
  const candidates = rowsToBuild.flatMap((earlier, position) =>
    rowsToBuild.slice(position + 1).flatMap((later) => {
      const sharedTouches = sharedTouchesOf(earlier, later)
      const waitingRow = waitingRowOf(earlier, later, doneIds)
      return sharedTouches.length > 0 || waitingRow
        ? [
            {
              rows: [earlier.id, later.id],
              sharedTouches,
              waitingRow,
              reason: reasonOf(earlier.id, later.id, sharedTouches, waitingRow)
            }
          ]
        : []
    })
  )
  return {
    rowsToBuild: rowsToBuild.length,
    withoutTouches: rowsToBuild
      .filter((row) => (row.touches ?? []).length === 0)
      .map((row) => row.id),
    candidates
  }
}
