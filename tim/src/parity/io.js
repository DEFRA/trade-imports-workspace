import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join, basename } from 'node:path'
import { TimError } from '../errors.js'

/**
 * Read and parse a JSON file, naming the file when it will not parse.
 *
 * @param {string} path
 * @returns {any}
 * @throws {TimError} NOT_FOUND or PARSE
 */
export const readJsonFile = (path) => {
  if (!existsSync(path)) {
    throw new TimError('NOT_FOUND', `Can't find ${path}.`)
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new TimError('PARSE', `${path} is not valid JSON: ${error.message}`)
  }
}

/**
 * Write JSON through a sibling temp file and a rename, the same model as
 * rule-decision.sh. A half-written backlog is worse than an unwritten one:
 * the file is the canonical record of a body of work, and the build loop
 * reads it between every increment.
 *
 * @param {string} path
 * @param {any} value
 * @returns {{sha256: string, bytes: number}}
 */
export const writeJsonAtomic = (path, value) => {
  const body = `${JSON.stringify(value, null, 2)}\n`
  const tmp = join(dirname(path), `.${basename(path)}.tmp`)
  writeFileSync(tmp, body, 'utf8')
  renameSync(tmp, path)
  return {
    sha256: createHash('sha256').update(body).digest('hex'),
    bytes: Buffer.byteLength(body)
  }
}

/**
 * Hash a file's bytes. Used for the backlog stamp in the report footer and for
 * the content-addressed curation check on images.
 *
 * @param {string} path
 * @returns {string} hex sha256
 */
export const sha256File = (path) =>
  createHash('sha256').update(readFileSync(path)).digest('hex')
