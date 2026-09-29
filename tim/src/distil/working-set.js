import { writeJsonAtomic } from '../backlog/io.js'
import { inspectSources, readSources } from './checks.js'

const heldClaimsOf = (extract, verify) => {
  const holding = new Set(
    verify.verdicts
      .filter((verdict) => verdict.holds === true)
      .map((verdict) => verdict.id)
  )
  return extract.claims.filter((claim) => holding.has(claim.id))
}

const gatheredSource = (entry, rank) => {
  const held = heldClaimsOf(entry.extract, entry.verify)
  return {
    id: entry.source.id,
    kind: entry.source.kind,
    role: entry.source.role,
    rank,
    slug: entry.report.slug,
    held: held.length,
    refuted: entry.extract.claims.length - held.length,
    missed: entry.verify.missed.length,
    claims: [
      ...held.map((claim) => ({ ...claim, origin: 'extract' })),
      ...entry.verify.missed.map((claim) => ({ ...claim, origin: 'missed' }))
    ]
  }
}

/**
 * Gather what the reconciler works from: each verified source's claims that
 * held, then the claims its verifiers found missing. Refuted claims are left
 * out. A source that is not verified yet contributes nothing and is named in
 * `unavailable` with its state, so a failed source is reported rather than
 * silently dropped.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.schemas - From `loadDistilSchemas`
 * @param {string} args.workarea
 * @returns {{sources: object[], unavailable: {id: string, state: string, reason: string}[], total: number}}
 * @throws {TimError} when sources.json is missing or out of shape
 */
export const workingSetOf = ({ layout, schemas, workarea }) => {
  const sources = readSources(layout, schemas.sources)
  const entries = inspectSources({ layout, schemas, sources, workarea })
  const rankOf = (id) => sources.precedence.indexOf(id) + 1
  const verified = entries.filter((entry) => entry.report.state === 'verified')
  const gathered = verified.map((entry) =>
    gatheredSource(entry, rankOf(entry.source.id))
  )
  return {
    sources: gathered,
    unavailable: entries
      .filter((entry) => entry.report.state !== 'verified')
      .map(({ report }) => ({
        id: report.id,
        state: report.state,
        reason: report.reason
      })),
    total: gathered.reduce((sum, source) => sum + source.claims.length, 0)
  }
}

const withoutClaims = ({ claims, ...summary }) => summary

/**
 * Write the working set to distil/working-set.json for the reconcile agent
 * to read, and return it without the claims themselves.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.workingSet - From `workingSetOf`
 * @returns {{path: string, sources: object[], unavailable: object[], total: number}}
 */
export const writeWorkingSet = ({ layout, workingSet }) => {
  writeJsonAtomic(layout.workingSet, workingSet)
  return {
    path: layout.workingSet,
    sources: workingSet.sources.map(withoutClaims),
    unavailable: workingSet.unavailable,
    total: workingSet.total
  }
}
