/**
 * Which backlog a row's dependency names.
 *
 * A row id is unique within one backlog, but two backlogs can carry the same
 * one: the split-off themes numbered their new rows from a sequence the parent
 * backlog was already using. A dependency inside one backlog is read in that
 * backlog, which always lands on the row that was meant. A dependency on
 * another theme's row is different: the backlog records it as an
 * `externalDependsOn` entry naming both the row and the workarea it lives in,
 * so there is nothing to guess even when the id is shared.
 *
 * This turns those two shapes into one list of {id, backlog} pairs, where
 * `backlog` is the same workarea-relative path the generators record on each
 * row as `from`, or null when the row does not say. Resolving a dependency
 * therefore looks in the backlog it names first, then in the depending row's
 * own, and only throws when neither settles it.
 */

import fs from 'node:fs'
import path from 'node:path'

/** Every backlog in a programme workarea: the root one, then one per split-off theme. */
export function backlogFiles(workarea) {
  const files = [path.join(workarea, 'backlog.json')]
  const themesDir = path.join(workarea, 'themes')
  if (!fs.existsSync(themesDir)) return files
  for (const entry of fs.readdirSync(themesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const file = path.join(themesDir, entry.name, 'backlog.json')
    if (fs.existsSync(file)) files.push(file)
  }
  return files
}

/**
 * The workarea-relative backlog path an `externalDependsOn` workarea names, in
 * the same spelling a row's `from` carries. Returns null for a workarea outside
 * this programme, which no generator can resolve anyway.
 *
 * An entry's workarea is recorded from the `workareas/` directory down
 * ("shared/design-release-2-1/themes/arrival-and-transit"), so the programme's
 * own prefix comes off and "backlog.json" goes on.
 */
export function backlogNamed(workarea, declared) {
  if (!declared) return null
  const within = path.relative(programmeKey(workarea), declared)
  if (within.startsWith('..')) return null
  return path.join(within, 'backlog.json')
}

/**
 * How a workarea spells itself in the backlogs: its path from the `workareas/`
 * directory down, which is how every `workarea` field records one. Read from
 * the path rather than assumed to be two segments, so a workarea nested any
 * deeper still matches.
 */
function programmeKey(workarea) {
  const parts = path.resolve(workarea).split(path.sep)
  const root = parts.lastIndexOf('workareas')
  if (root === -1) throw new Error(workarea + ' is not under a workareas directory')
  return parts.slice(root + 1).join('/')
}

/**
 * Everything a row waits on, whichever field records it, each paired with the
 * backlog it names where the row says so.
 */
export function declaredDependencies(workarea, row) {
  const named = new Map()
  for (const id of row.dependsOn || []) {
    if (!named.has(id)) named.set(id, null)
  }
  for (const dep of row.externalDependsOn || []) {
    const backlog = backlogNamed(workarea, dep.workarea)
    if (backlog || !named.has(dep.id)) named.set(dep.id, backlog)
  }
  return [...named].map(([id, backlog]) => ({ id, backlog }))
}
