import { TimError } from '../errors.js'
import { writeJsonAtomic } from '../backlog/io.js'
import { extractPathOf, readJsonLenient, scopeHashOf, slugOf } from './files.js'
import { readSources } from './checks.js'
import { extractedRepoHead } from './repo-head.js'

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

/**
 * Record a source's current scope hash in its extract, so the extract counts
 * as made for the source as sources.json describes it today. The extract
 * agent runs this once its extract is written; the main session can run it
 * to adopt an extract written before scope hashes existed.
 *
 * For a repo source it also records the commit its checkout is on, so the
 * extract is watched for the repo moving under it as well as for its scope
 * changing. Without `workspaceRoot` there is no path to read the commit
 * from, and only the scope hash is recorded.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.schemas - From `loadDistilSchemas`
 * @param {string} args.sourceId
 * @param {string} [args.workspaceRoot] - The workspace root, for the locator
 * @returns {{source: string, path: string, scopeHash: string, repoHead: string|null, before: string|null, changed: boolean}}
 * @throws {TimError} NOT_FOUND for an unknown source or a missing extract, PARSE when the extract is not JSON, LINT when it is not an object
 */
export const stampScopeHash = ({
  layout,
  schemas,
  sourceId,
  workspaceRoot
}) => {
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
  const repoHead = extractedRepoHead({ source, workspaceRoot })
  const before = read.value.scopeHash ?? null
  const stamped = { source: source.id, path, scopeHash, repoHead, before }
  if (before === scopeHash && repoHead === (read.value.repoHead ?? null)) {
    return { ...stamped, changed: false }
  }
  const { claims, ...head } = read.value
  writeJsonAtomic(path, {
    ...head,
    scopeHash,
    ...(repoHead ? { repoHead } : {}),
    claims
  })
  return { ...stamped, changed: true }
}
