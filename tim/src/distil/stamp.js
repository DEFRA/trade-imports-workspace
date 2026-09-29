import { TimError } from '../errors.js'
import { writeJsonAtomic } from '../backlog/io.js'
import { extractPathOf, readJsonLenient, scopeHashOf, slugOf } from './files.js'
import { readSources } from './checks.js'

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

/**
 * Record a source's current scope hash in its extract, so the extract counts
 * as made for the source as sources.json describes it today. The extract
 * agent runs this once its extract is written; the main session can run it
 * to adopt an extract written before scope hashes existed.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.schemas - From `loadDistilSchemas`
 * @param {string} args.sourceId
 * @returns {{source: string, path: string, scopeHash: string, before: string|null, changed: boolean}}
 * @throws {TimError} NOT_FOUND for an unknown source or a missing extract, PARSE when the extract is not JSON, LINT when it is not an object
 */
export const stampScopeHash = ({ layout, schemas, sourceId }) => {
  const sources = readSources(layout, schemas.sources)
  const source = sources.sources.find((candidate) => candidate.id === sourceId)
  if (!source) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find source ${sourceId} in ${layout.sources}.`
    )
  }
  const path = extractPathOf(layout, slugOf(source.id))
  const read = readJsonLenient(path)
  if (!read.exists) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find ${path}. Write the extract before stamping it.`
    )
  }
  if (read.error) throw new TimError('PARSE', `${path} ${read.error}`)
  if (!isObject(read.value)) {
    throw new TimError('LINT', `${path} must be an object.`)
  }
  const scopeHash = scopeHashOf(source)
  const before = read.value.scopeHash ?? null
  if (before === scopeHash) {
    return { source: source.id, path, scopeHash, before, changed: false }
  }
  const { claims, ...head } = read.value
  writeJsonAtomic(path, { ...head, scopeHash, claims })
  return { source: source.id, path, scopeHash, before, changed: true }
}
