import { existsSync } from 'node:fs'
import { TimError } from '../errors.js'
import { readJsonFile } from '../backlog/io.js'
import { writeJsonAtomic } from '../review/store.js'
import { countCheck } from './counts.js'
import { checkFilePaths, checkFolder } from './paths.js'

const HIGH_RISK_FAILS = 3
const NEEDS_REVIEW_PARTIALS = 3

const highRiskReason = ({ FAIL, security_fails: securityFails }) =>
  securityFails >= 1
    ? `security-category FAIL (${securityFails})`
    : `FAIL count >= ${HIGH_RISK_FAILS} (${FAIL})`

const needsReviewReason = ({ FAIL, PARTIAL }) =>
  FAIL >= 1
    ? `FAIL count ${FAIL}`
    : `PARTIAL count ${PARTIAL} (>= ${NEEDS_REVIEW_PARTIALS})`

/**
 * The verdict the counting rule gives, first match wins: high-risk (exit
 * 2), needs-review on FAIL or PARTIAL counts (exit 1), needs-review on
 * coverage gaps (exit 1), else pass (exit 0).
 *
 * @param {{FAIL: number, PARTIAL: number, security_fails: number, coverage_gaps: number}} counts
 * @returns {{verdict: 'pass' | 'needs-review' | 'high-risk', exit: 0 | 1 | 2, reason: string}}
 */
export const verdictFor = (counts) => {
  if (counts.FAIL >= HIGH_RISK_FAILS || counts.security_fails >= 1) {
    return { verdict: 'high-risk', exit: 2, reason: highRiskReason(counts) }
  }
  if (counts.FAIL >= 1 || counts.PARTIAL >= NEEDS_REVIEW_PARTIALS) {
    return {
      verdict: 'needs-review',
      exit: 1,
      reason: needsReviewReason(counts)
    }
  }
  if (counts.coverage_gaps >= 1) {
    return {
      verdict: 'needs-review',
      exit: 1,
      reason: `coverage gaps (${counts.coverage_gaps})`
    }
  }
  return {
    verdict: 'pass',
    exit: 0,
    reason: 'no FAIL/PARTIAL threshold, no coverage gaps'
  }
}

/**
 * Applies the counting rule to a ticket's check and stamps the verdict,
 * its reason, exit code, completion time and counts onto
 * `.interview-meta.json`.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.ticket
 * @param {string} args.now - Second-precision UTC timestamp
 * @returns {{verdict: string, exit: number, reason: string, meta_path: string}}
 * @throws {TimError} NOT_FOUND naming the first state file missing, PARSE as `countVerdicts`
 */
export const finalizeVerdict = ({ workspaceRoot, ticket, now }) => {
  const { meta: metaPath } = checkFilePaths(checkFolder(workspaceRoot, ticket))
  if (!existsSync(metaPath)) {
    throw new TimError('NOT_FOUND', `Error: ${metaPath} not found`)
  }
  const counts = countCheck({ workspaceRoot, ticket })
  const { verdict, exit, reason } = verdictFor(counts)
  writeJsonAtomic(metaPath, {
    ...readJsonFile(metaPath),
    verdict,
    verdict_reason: reason,
    exit_code: exit,
    completed_at: now,
    counts
  })
  return { verdict, exit, reason, meta_path: metaPath }
}

/**
 * @param {string} ticket
 * @param {ReturnType<typeof finalizeVerdict>} finalized
 * @returns {string}
 */
export const finalizeText = (
  ticket,
  { verdict, exit, reason, meta_path: metaPath }
) =>
  [
    `Verdict for ${ticket}: ${verdict} (exit ${exit})`,
    `Reason: ${reason}`,
    `Meta:   ${metaPath}`
  ].join('\n')
