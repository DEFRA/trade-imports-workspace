import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile } from './io.js'
import { TimError } from '../errors.js'
import { PROFILE_KEYS } from './profiles/index.js'

/** Every programme: a workarea, a profile and, optionally, a backlog path. */
export const REGISTRY_FILE = 'tools/backlog/registry.json'

/**
 * Every programme this workspace knows.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @returns {{entries: Map<string, object>}}
 * @throws {TimError} NOT_FOUND when the file is missing, PARSE on bad JSON,
 *   USAGE when an entry names no profile
 */
export const loadRegistry = ({ workspaceRoot }) => {
  const path = join(workspaceRoot, REGISTRY_FILE)
  if (!existsSync(path)) {
    throw new TimError('NOT_FOUND', `Can't find ${REGISTRY_FILE}.`)
  }

  const programmes = readJsonFile(path).programmes ?? {}

  const missingProfile = Object.keys(programmes).filter(
    (key) => !programmes[key].profile
  )
  if (missingProfile.length) {
    throw new TimError(
      'USAGE',
      `${missingProfile.join(', ')} in ${REGISTRY_FILE} ${missingProfile.length === 1 ? 'names' : 'name'} no "profile". Known profiles: ${PROFILE_KEYS.join(', ')}.`
    )
  }

  const entries = new Map(
    Object.entries(programmes).map(([key, entry]) => [
      key,
      { ...entry, key, profileKey: entry.profile }
    ])
  )

  return { entries }
}

/**
 * One programme by its registry key.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.key
 * @returns {object} The entry, with `key` and `profileKey`
 * @throws {TimError} NOT_FOUND, naming the known keys
 */
export const findProgramme = ({ workspaceRoot, key }) => {
  const { entries } = loadRegistry({ workspaceRoot })
  const entry = entries.get(key)
  if (!entry) {
    const known = [...entries.keys()].sort().join(', ')
    throw new TimError(
      'NOT_FOUND',
      known
        ? `No programme registered under "${key}". Known: ${known}.`
        : `No programme registered under "${key}". ${REGISTRY_FILE} registers none at all.`
    )
  }
  return entry
}

/**
 * Every registered programme, sorted by key.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @returns {object[]}
 */
export const listProgrammes = ({ workspaceRoot }) => {
  const { entries } = loadRegistry({ workspaceRoot })
  return [...entries.values()].sort((a, b) => a.key.localeCompare(b.key))
}
