import { TimError } from '../errors.js'
import { writeJsonAtomic } from '../backlog/io.js'
import { claimsHashOf, extractPathOf, verifyPathOf } from './files.js'
import { inspectSources, readSources } from './checks.js'
import { problemsError } from './problems.js'
import { stampScopeHash } from './stamp.js'

const entryOf = ({ layout, schemas, workarea, sourceId }) => {
  const sources = readSources(layout, schemas.sources)
  const entry = inspectSources({ layout, schemas, sources, workarea }).find(
    (candidate) => candidate.source.id === sourceId
  )
  if (!entry) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find source ${sourceId} in ${layout.sources}.`
    )
  }
  return entry
}

const refusals = (entry, workarea) => {
  const { id, slug } = entry.report
  if (!entry.report.extract.exists) {
    return [
      `distil/extract/${slug}.json does not exist, so there is nothing to adopt.`
    ]
  }
  const verifyRead = entry.report.verify
  return [
    ...entry.problems.extract,
    ...(entry.report.extract.scopeHash &&
    entry.report.extract.scopeHash !== entry.report.scopeHash
      ? [
          `distil/extract/${slug}.json was extracted for a different scope. Extract it again, or, if the change does not touch what it holds, run: tim distil stamp ${workarea} --source ${id}`
        ]
      : []),
    ...(verifyRead.exists ? entry.problems.verify : []),
    ...(verifyRead.extractHash === 'changed' ? [entry.problems.verifyHash] : [])
  ]
}

const recordExtractHash = (path, { source, verdicts, missed }, extractHash) =>
  writeJsonAtomic(path, { source, extractHash, verdicts, missed })

/**
 * Take on a source distilled before scope and extract hashes existed: record
 * the source's scope hash in its extract, and the extract's hash in its
 * verification, so status counts it as done and a launch skips it. Refuses,
 * writing nothing, unless the extract is in shape, it was not made for a
 * different scope, and any verification is in shape and judged no other
 * extract. Only the main session runs it, for a source it knows is current:
 * an agent that has just extracted again must verify again instead.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.schemas - From `loadDistilSchemas`
 * @param {string} args.workarea
 * @param {string} args.sourceId
 * @returns {{source: string, state: string, extract: {path: string, stamped: boolean}, verify: {path: string, exists: boolean, stamped: boolean}}}
 * @throws {TimError} NOT_FOUND for an unknown source, LINT with every reason it cannot be adopted
 */
export const adoptSource = ({ layout, schemas, workarea, sourceId }) => {
  const entry = entryOf({ layout, schemas, workarea, sourceId })
  const problems = refusals(entry, workarea)
  if (problems.length) {
    throw problemsError(problems, `adopting ${sourceId}. Nothing was written`)
  }
  const stamp = stampScopeHash({ layout, schemas, sourceId })
  const verifyPath = verifyPathOf(layout, entry.report.slug)
  const needsHash =
    entry.report.verify.exists && entry.report.verify.extractHash === 'missing'
  if (needsHash) {
    recordExtractHash(
      verifyPath,
      entry.raw.verify,
      claimsHashOf(entry.raw.extract.claims)
    )
  }
  return {
    source: sourceId,
    state: entryOf({ layout, schemas, workarea, sourceId }).report.state,
    extract: {
      path: extractPathOf(layout, entry.report.slug),
      stamped: stamp.changed
    },
    verify: {
      path: verifyPath,
      exists: entry.report.verify.exists,
      stamped: needsHash
    }
  }
}
