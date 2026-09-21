import { existsSync } from 'node:fs'
import { readJsonFile } from './io.js'

const isStarted = (row) => {
  const attempts = row?.attempts
  if (Array.isArray(attempts)) return attempts.length > 0
  if (typeof attempts === 'number') return attempts >= 1
  return false
}

/**
 * Returns the ids of every increment that `build/state.json` records at
 * least one build attempt against.
 *
 * Reads the one field this increment pins — `increments[<id>].attempts`, an
 * array or a number — and nothing else. Writing state, the lock and every
 * other field belongs to inc-006, which must keep this field readable.
 *
 * @param {string} statePath
 * @returns {Set<string>}
 * @throws {TimError} PARSE, naming the path, when the file is not valid JSON
 */
export const startedIncrementIds = (statePath) => {
  if (!existsSync(statePath)) return new Set()
  const state = readJsonFile(statePath)
  const increments = state.increments ?? {}
  return new Set(
    Object.entries(increments)
      .filter(([, row]) => isStarted(row))
      .map(([id]) => id)
  )
}
