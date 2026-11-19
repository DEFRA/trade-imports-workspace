import { TimError } from '../../errors.js'
import { countPatternHits } from './count.js'
import { EVIDENCE_OUTCOMES, hitsPhrase } from './row.js'

const refuse = (message) => {
  throw new TimError('USAGE', message)
}

const assertOutcomeFits = ({ outcome, pattern, reason, hitsBefore }) => {
  if (!EVIDENCE_OUTCOMES.includes(outcome)) {
    refuse(
      `The outcome must be one of ${EVIDENCE_OUTCOMES.join(', ')}. You gave "${outcome}".`
    )
  }
  if (outcome === 'applied' && !pattern) {
    refuse('An applied row needs a pattern: the old form the change removes.')
  }
  if (outcome === 'applied' && hitsBefore === 0) {
    refuse(
      `The pattern "${pattern}" has no hits, so there is nothing to apply. Record the item as not-applicable.`
    )
  }
  if (outcome === 'not-applicable' && hitsBefore > 0) {
    refuse(
      `The pattern "${pattern}" has ${hitsPhrase(hitsBefore)}. Record the item as applied or needs-a-person.`
    )
  }
  if (outcome !== 'applied' && reason.trim() === '') {
    refuse(
      outcome === 'needs-a-person'
        ? 'A needs-a-person row needs a reason: what the person has to decide.'
        : 'A not-applicable row needs a reason: why the repo is not affected.'
    )
  }
}

/**
 * A new evidence row for one changelog item, with the pattern's hits in
 * the checkout now as `hitsBefore`. Refuses an applied row whose pattern
 * has no hits, a not-applicable row whose pattern has some, and a
 * not-applicable or needs-a-person row with no reason.
 *
 * @param {object} args
 * @param {string} args.repoPath
 * @param {string} args.item
 * @param {'applied'|'not-applicable'|'needs-a-person'} args.outcome
 * @param {string} [args.pattern] - A fixed string; required when applied
 * @param {string} [args.reason='']
 * @returns {Promise<{item: string, pattern: string|null, hitsBefore: number|null, hitsAfter: null, outcome: string, reason: string}>}
 * @throws {TimError} USAGE when the outcome does not fit the pattern's hits or the reason is missing
 */
export const recordEvidenceRow = async ({
  repoPath,
  item,
  outcome,
  pattern,
  reason = ''
}) => {
  if (!item) refuse('Say which changelog item the row covers.')
  const hitsBefore = pattern ? await countPatternHits(repoPath, pattern) : null
  assertOutcomeFits({ outcome, pattern, reason, hitsBefore })
  return {
    item,
    pattern: pattern || null,
    hitsBefore,
    hitsAfter: null,
    outcome,
    reason
  }
}

/**
 * The rows with each pattern counted again in the checkout as `hitsAfter`.
 * A row with no pattern keeps a null `hitsAfter`.
 *
 * @param {string} repoPath
 * @param {object[]} rows
 * @returns {Promise<object[]>}
 */
export const recountEvidenceRows = (repoPath, rows) =>
  Promise.all(
    rows.map(async (row) => ({
      ...row,
      hitsAfter: row.pattern
        ? await countPatternHits(repoPath, row.pattern)
        : null
    }))
  )
