import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { findProgramme } from './registry.js'
import { profileFor, DEFAULT_PROFILE_KEY } from './profiles/index.js'
import { loadCorpusProfile } from '../parity/corpus-profile.js'
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
 * A `parity-v1` entry delegates to `loadCorpusProfile`, which already knows
 * how to build a corpus's full path set — req-009 ac-1's promise that the
 * same command line works for both profiles rests on this. Any other
 * profile builds its paths from the registry entry alone: `workarea`,
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

  if (definition.key === DEFAULT_PROFILE_KEY) {
    return {
      ...loadCorpusProfile({ workspaceRoot, explicit: key }),
      profileKey: definition.key
    }
  }

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
      // Where a recorded build attempt lives. Read-only here: inc-006 owns
      // writing it, the lock and every other field.
      state: join(workarea, 'build', 'state.json')
    }
  }
}
