import { existsSync, readFileSync, appendFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { TimError } from '../errors.js'
import { nonBlankLines } from './lines.js'

const sortedClone = (value) => {
  if (Array.isArray(value)) return value.map(sortedClone)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortedClone(value[key])])
    )
  }
  return value
}

/**
 * A stable hash of a command's shape (the verb and the arguments that
 * identify what it did), checked against a reused `--op-id` so a
 * mis-assigned id cannot silently swallow a different write.
 *
 * Object keys are sorted (recursively) before hashing, so two calls that
 * build the same shape with keys in a different insertion order — a
 * resumed workflow rebuilding `heads` fresh, say — still fingerprint the
 * same.
 *
 * @param {object} shape
 * @returns {string} hex sha256
 */
export const fingerprintOf = (shape) =>
  createHash('sha256')
    .update(JSON.stringify(sortedClone(shape)))
    .digest('hex')

/**
 * The recorded entry for one operation id, or `null` when it has not run
 * before. Every line up to and including a match is parsed — a line that
 * will not parse throws rather than being skipped silently, because a
 * malformed entry is exactly the kind of corruption this log exists to
 * make loud.
 *
 * @param {object} args
 * @param {string} [args.opsLogPath]
 * @param {string} [args.opId]
 * @param {string} [args.fingerprint]
 * @returns {object|null}
 * @throws {TimError} USAGE when `opId` is recorded against a different
 *   fingerprint (a reused id), PARSE when a line will not parse
 */
export const findOperation = ({ opsLogPath, opId, fingerprint }) => {
  if (!opId) return null
  if (!opsLogPath || !existsSync(opsLogPath)) return null

  const lines = nonBlankLines(readFileSync(opsLogPath, 'utf8'))
  for (const { lineNumber, text } of lines) {
    let entry
    try {
      entry = JSON.parse(text)
    } catch (error) {
      throw new TimError(
        'PARSE',
        `${opsLogPath}:${lineNumber} is not valid JSON: ${error.message}`
      )
    }
    if (entry.opId !== opId) continue
    if (entry.fingerprint !== fingerprint) {
      throw new TimError(
        'USAGE',
        `You already used operation id "${opId}" for a different write (${entry.command}). Use a new operation id.`
      )
    }
    return entry
  }
  return null
}

/**
 * Append one operation to the log. Called while holding the target's lock,
 * so two writers targeting the same file never interleave a partial line —
 * a local regular file's `O_APPEND` keeps one process's write whole, not a
 * size limit on the entry (an ingest result can carry a full assignment
 * list and run well past a few hundred bytes). The log itself is shared
 * across every target a programme has, so a lock on one target does not
 * serialise writes from another.
 *
 * @param {object} args
 * @param {string} args.opsLogPath
 * @param {object} args.entry
 */
export const recordOperation = ({ opsLogPath, entry }) =>
  appendFileSync(opsLogPath, `${JSON.stringify(entry)}\n`, 'utf8')
