import { TimError } from '../errors.js'

/**
 * Join the canonical increments to the upstream findings file.
 *
 * The plan called for an ordinal join with title equality as a checksum,
 * on the reading that build-increments.js preserved order. It did not: the
 * canonical file is sorted by domain and milestone, so increment 1 is
 * finding 2 and not one of the 97 ordinals lines up. Title is exact instead —
 * both sides carry 97 unique titles and the two sets are identical — so the
 * join is by title, and the checksum is that every title on each side finds
 * exactly one partner on the other.
 *
 * @param {object[]} increments - From the canonical backlog
 * @param {object} findings - The parsed upstream findings file
 * @returns {{byId: Map<string, object>, report: object}}
 * @throws {TimError} PARSE when the join is not a bijection
 */
export const joinFindings = (increments, findings) => {
  const survived = findings.survived ?? []
  const byTitle = new Map()
  for (const finding of survived) {
    if (byTitle.has(finding.title)) {
      throw new TimError(
        'PARSE',
        `The findings file has two entries titled "${finding.title.slice(0, 60)}…". Title cannot be the join key while that is true.`
      )
    }
    byTitle.set(finding.title, finding)
  }

  const byId = new Map()
  const unmatchedIncrements = []
  for (const increment of increments) {
    const finding = byTitle.get(increment.title)
    if (!finding) {
      unmatchedIncrements.push(increment.id)
      continue
    }
    byId.set(increment.id, finding)
  }

  const matchedTitles = new Set(
    increments.map((increment) => increment.title).filter((t) => byTitle.has(t))
  )
  const unmatchedFindings = survived
    .filter((finding) => !matchedTitles.has(finding.title))
    .map((finding) => finding.title)

  return {
    byId,
    report: {
      increments: increments.length,
      findings: survived.length,
      matched: byId.size,
      unmatchedIncrements,
      unmatchedFindings,
      // Ordinal was the plan's key. Kept as a reported fact so the next reader
      // does not have to rediscover that it is wrong.
      ordinalAgreement: increments.filter(
        (increment, i) => survived[i]?.title === increment.title
      ).length
    }
  }
}

/**
 * Halt on a partial join. A findings file that half-matches means one of the
 * two files has been regenerated out from under the other, and every downstream
 * invariant is measuring the wrong baseline.
 *
 * @param {object} report - From joinFindings
 * @throws {TimError} PARSE
 */
export const assertCompleteJoin = (report) => {
  if (report.unmatchedIncrements.length || report.unmatchedFindings.length) {
    throw new TimError(
      'PARSE',
      [
        `The findings join is incomplete: ${report.matched} of ${report.increments} increments matched.`,
        report.unmatchedIncrements.length
          ? `Increments with no finding: ${report.unmatchedIncrements.join(', ')}.`
          : '',
        report.unmatchedFindings.length
          ? `Findings with no increment: ${report.unmatchedFindings.length}.`
          : ''
      ]
        .filter(Boolean)
        .join(' ')
    )
  }
}
