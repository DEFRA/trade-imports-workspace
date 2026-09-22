import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile } from './io.js'
import { TimError } from '../errors.js'
import { DEFAULT_PROFILE_KEY, PROFILE_KEYS } from './profiles/index.js'

/** Non-parity programmes: workarea, backlog path and profile. */
export const REGISTRY_FILE = 'tools/backlog/registry.json'

/** The parity corpora file. */
export const CORPORA_FILE = 'tools/parity/corpora.json'

const readJsonIfPresent = (path) =>
  existsSync(path) ? readJsonFile(path) : null

/**
 * Read `tools/parity/corpora.json`. Required — every command that resolves
 * a corpus has always needed this file, and D9 keeps that byte-for-byte.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @returns {object}
 * @throws {TimError} NOT_FOUND naming the exact relative path, PARSE on bad JSON
 */
export const readCorporaFile = ({ workspaceRoot }) => {
  const path = join(workspaceRoot, CORPORA_FILE)
  if (!existsSync(path)) {
    throw new TimError('NOT_FOUND', `Can't find ${CORPORA_FILE}.`)
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new TimError('PARSE', `Can't read ${path}: ${error.message}`)
  }
}

/**
 * Every programme this workspace knows, merged from the requirements
 * registry and the parity corpora file.
 *
 * `tools/backlog/registry.json` is optional — a workspace with no
 * non-parity programme yet has none, and that contributes nothing rather
 * than failing. `tools/parity/corpora.json` is not: every corpus command
 * has always required it, and this keeps that requirement (D9).
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @returns {{entries: Map<string, object>, default: string}}
 * @throws {TimError} USAGE when a key is declared in both files, or a
 *   `${REGISTRY_FILE}` entry names no profile
 */
export const loadRegistry = ({ workspaceRoot }) => {
  const registryRaw = readJsonIfPresent(join(workspaceRoot, REGISTRY_FILE))
  const corpora = readCorporaFile({ workspaceRoot })

  const programmes = registryRaw?.programmes ?? {}
  const corporaEntries = corpora.corpora ?? {}

  const overlap = Object.keys(programmes).filter((key) => key in corporaEntries)
  if (overlap.length) {
    throw new TimError(
      'USAGE',
      `${overlap.join(', ')} ${overlap.length === 1 ? 'is' : 'are'} registered in both ${REGISTRY_FILE} and ${CORPORA_FILE}. Remove it from one.`
    )
  }

  const missingProfile = Object.keys(programmes).filter(
    (key) => !programmes[key].profile
  )
  if (missingProfile.length) {
    throw new TimError(
      'USAGE',
      `${missingProfile.join(', ')} in ${REGISTRY_FILE} ${missingProfile.length === 1 ? 'names' : 'name'} no "profile". Known profiles: ${PROFILE_KEYS.join(', ')}.`
    )
  }

  const entries = new Map([
    ...Object.entries(programmes).map(([key, entry]) => [
      key,
      { ...entry, key, profileKey: entry.profile }
    ]),
    ...Object.entries(corporaEntries).map(([key, entry]) => [
      key,
      { ...entry, key, profileKey: entry.profile ?? DEFAULT_PROFILE_KEY }
    ])
  ])

  return { entries, default: corpora.default }
}

/**
 * One programme by its registry key, whether it lives in the requirements
 * registry or the parity corpora file.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.key
 * @returns {object} The merged entry, with `key` and `profileKey`
 * @throws {TimError} NOT_FOUND, naming the known keys
 */
export const findProgramme = ({ workspaceRoot, key }) => {
  const { entries } = loadRegistry({ workspaceRoot })
  const entry = entries.get(key)
  if (!entry) {
    const known = [...entries.keys()].sort().join(', ')
    throw new TimError(
      'NOT_FOUND',
      `No programme registered under "${key}". Known: ${known}.`
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
