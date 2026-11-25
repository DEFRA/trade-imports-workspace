import { TimError } from '../../errors.js'
import { countPatternHits } from './count.js'
import { EVIDENCE_OUTCOMES, hitsPhrase } from './row.js'

const refuse = (message) => {
  throw new TimError('USAGE', message)
}

const assertAcceptanceFits = ({ outcome, pattern, reason, acceptedBy }) => {
  if (outcome !== 'applied') {
    refuse(
      'Only an applied row can name who accepted it. Leave out --accepted-by.'
    )
  }
  if (pattern) {
    refuse(
      'An applied row a person accepted has no pattern: give --accepted-by or --pattern, not both.'
    )
  }
  if (reason.trim() === '') {
    refuse(
      `An applied row ${acceptedBy} accepted needs a reason: what they accepted.`
    )
  }
}

const assertPatternFits = ({ outcome, pattern, hitsBefore }) => {
  if (outcome === 'applied' && !pattern) {
    refuse(
      'An applied row needs a pattern: the old form the change removes. For a change a person accepted with no code change, give who accepted it instead.'
    )
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
}

const assertReasonFits = ({ outcome, reason }) => {
  if (outcome === 'applied' || reason.trim() !== '') return
  refuse(
    outcome === 'needs-a-person'
      ? 'A needs-a-person row needs a reason: what the person has to decide.'
      : 'A not-applicable row needs a reason: why the repo is not affected.'
  )
}

const assertOutcomeFits = (row) => {
  if (!EVIDENCE_OUTCOMES.includes(row.outcome)) {
    refuse(
      `The outcome must be one of ${EVIDENCE_OUTCOMES.join(', ')}. You gave "${row.outcome}".`
    )
  }
  if (row.acceptedBy) {
    assertAcceptanceFits(row)
    return
  }
  assertPatternFits(row)
  assertReasonFits(row)
}

const hitsBeforeOf = async (repoPath, pattern, countedBefore) => {
  if (!pattern) return null
  return countedBefore ?? countPatternHits(repoPath, pattern)
}

const acceptanceOf = ({ acceptedBy, acceptedOn }) =>
  acceptedBy ? { acceptedBy, acceptedOn } : {}

/**
 * A new evidence row for one changelog item, with the pattern's hits in
 * the checkout now as `hitsBefore`, unless `countedBefore` gives them.
 * Refuses an applied row whose pattern has no hits, a not-applicable row
 * whose pattern has some, and a not-applicable or needs-a-person row with no
 * reason. An applied row with no pattern must name who accepted it, when,
 * and, as its reason, what they accepted.
 *
 * @param {object} args
 * @param {string} args.repoPath
 * @param {string} args.item
 * @param {'applied'|'not-applicable'|'needs-a-person'} args.outcome
 * @param {string} [args.pattern] - A fixed string; required when applied, unless `acceptedBy` is given
 * @param {string} [args.reason='']
 * @param {string} [args.acceptedBy] - Who accepted an applied row with no code change
 * @param {string} [args.acceptedOn] - YYYY-MM-DD; required with `acceptedBy`
 * @param {number|null} [args.countedBefore] - The pattern's hits counted before the change, to keep instead of counting now
 * @returns {Promise<{item: string, pattern: string|null, hitsBefore: number|null, hitsAfter: null, outcome: string, reason: string, acceptedBy?: string, acceptedOn?: string}>}
 * @throws {TimError} USAGE when the outcome does not fit the pattern's hits, the acceptance or the reason
 */
export const recordEvidenceRow = async ({
  repoPath,
  item,
  outcome,
  pattern,
  reason = '',
  acceptedBy,
  acceptedOn,
  countedBefore
}) => {
  if (!item) refuse('Say which changelog item the row covers.')
  if (acceptedBy && !acceptedOn) refuse('Say when the person accepted it.')
  const hitsBefore = await hitsBeforeOf(repoPath, pattern, countedBefore)
  assertOutcomeFits({ outcome, pattern, reason, hitsBefore, acceptedBy })
  return {
    item,
    pattern: pattern || null,
    hitsBefore,
    hitsAfter: null,
    outcome,
    reason,
    ...acceptanceOf({ acceptedBy, acceptedOn })
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
