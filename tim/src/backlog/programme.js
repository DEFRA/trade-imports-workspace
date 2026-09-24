import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { findProgramme } from './registry.js'
import { profileFor } from './profiles/index.js'
import { TimError } from '../errors.js'

const expandHome = (path) =>
  path.startsWith('~/') ? join(homedir(), path.slice(2)) : path

const absolutise = (workspaceRoot, path) => {
  if (!path) return null
  return path.startsWith('~/') || path.startsWith('/')
    ? resolve(expandHome(path))
    : join(workspaceRoot, path)
}

/**
 * Load one registered programme, resolved through whichever profile it
 * declares.
 *
 * A programme builds its paths from its registry entry alone: `workarea`,
 * absolutised, and `backlog` at the entry's own path or, when it names
 * none, `<workarea>/backlog.json`.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.key - A registry key, never a path
 * @returns {object} A profile object that `runIngest` and the backlog
 *   commands can read paths from, including `paths.state` — where a
 *   recorded build attempt lives
 * @throws {TimError} NOT_FOUND for an unknown key, USAGE for an unknown
 *   profile or a registry entry missing `workarea`
 */
export const loadProgramme = ({ workspaceRoot, key }) => {
  const entry = findProgramme({ workspaceRoot, key })
  const definition = profileFor(entry.profileKey)

  if (!entry.workarea) {
    throw new TimError(
      'USAGE',
      `"${key}" in tools/backlog/registry.json names no "workarea".`
    )
  }

  const workarea = absolutise(workspaceRoot, entry.workarea)
  return {
    id: key,
    profileKey: definition.key,
    workspaceRoot,
    paths: {
      workarea,
      backlog: entry.backlog
        ? absolutise(workspaceRoot, entry.backlog)
        : join(workarea, 'backlog.json'),
      // Where a recorded build attempt lives, guarded by `build/.state.lock`.
      state: join(workarea, 'build', 'state.json'),
      // The idempotency ledger every write in this programme shares
      // (backlog, state, journal alike), guarded by each write's own lock.
      opsLog: join(workarea, '.backlog-ops.jsonl'),
      // The append-only journal `state note` writes to, guarded by
      // `build/.journal.lock`.
      journal: join(workarea, 'build', 'journal.jsonl')
    }
  }
}
