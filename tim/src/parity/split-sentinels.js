import { existsSync } from 'node:fs'
import { readJsonFile, writeJsonAtomic } from './io.js'
import { parseBacklog } from './schema.js'
import { splitSentinels } from './load.js'
import { isWithdrawn } from './counts.js'

/**
 * Fill `finding.correction` and `finding.falsifiedBy` from the sentinels in the
 * frozen `detail`.
 *
 * This is a join, not a rewrite. build-increments.js flattened three fields
 * into one string with sentinel markers; this splits them back out verbatim,
 * with the `[[cN]]` markers already substituted. Nobody should be asked to move
 * 97 falsifiers by hand when the boundary is a literal string.
 *
 * The body — the part that has to be assigned across the two side columns — is
 * deliberately not touched. That is judgement and it stays with a person.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {boolean} [args.write]
 * @returns {object}
 */
export const runSplitSentinels = ({ profile, write }) => {
  const backlog = parseBacklog(readJsonFile(profile.paths.backlog))
  const evidence = existsSync(profile.paths.evidence)
    ? readJsonFile(profile.paths.evidence)
    : { increments: {} }

  const filled = { correction: 0, falsifiedBy: 0 }
  const skipped = []

  const increments = backlog.increments.map((increment) => {
    if (isWithdrawn(increment)) return increment
    const marked = evidence.increments?.[increment.id]?.prose?.detail
    const parts = splitSentinels(marked ?? increment.detail)
    const finding = { ...(increment.finding ?? {}) }

    if (parts.correction && !finding.correction) {
      finding.correction = parts.correction
      filled.correction += 1
    }
    if (parts.falsifiedBy && !finding.falsifiedBy) {
      finding.falsifiedBy = parts.falsifiedBy
      filled.falsifiedBy += 1
    }
    if (!parts.falsifiedBy) skipped.push(increment.id)

    return Object.keys(finding).length ? { ...increment, finding } : increment
  })

  if (write) writeJsonAtomic(profile.paths.backlog, { ...backlog, increments })

  return {
    filled,
    withoutFalsifier: skipped,
    written: Boolean(write),
    path: profile.paths.backlog
  }
}
