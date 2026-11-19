import { TimError } from '../../errors.js'

export const NO_JIRA = 'NO_JIRA'

const RUN_ID_SHAPE = /^([A-Z]+-\d+|NO_JIRA)(-.+)?$/
const BRANCH_TYPE_PREFIX = /^(chore|fix|feat)\//

/**
 * Whether a run id is a ticket key or NO_JIRA, optionally followed by a
 * slug, as an unattended run's id is.
 *
 * @param {string} runId
 * @returns {boolean}
 */
export const looksLikeRunId = (runId) => RUN_ID_SHAPE.test(runId)

/**
 * Refuses the allowlist options, since an unattended run never allowlists
 * an advisory.
 *
 * @param {{allowlistOwner?: string, expiryDays?: string}} options
 * @throws {TimError} USAGE when either option is given
 */
export const refuseUnattendedAllowlist = ({ allowlistOwner, expiryDays }) => {
  if (allowlistOwner || expiryDays) {
    throw new TimError(
      'USAGE',
      '--unattended never allowlists an advisory, so a new advisory needs a person. Remove --allowlist-owner and --expiry-days.'
    )
  }
}

const isBranchForTicket = (ticket, branch) =>
  new RegExp(`^(chore|fix|feat)/${ticket}-[a-z0-9][a-z0-9.-]*$`).test(branch)

/**
 * The run id of an unattended run: its branch without the chore/, fix/ or
 * feat/ in front, so each nightly run keeps its own state.
 *
 * @param {object} args
 * @param {string} args.ticket - A ticket key or NO_JIRA
 * @param {string} [args.branch]
 * @param {string} [args.allowlistOwner]
 * @param {string} [args.expiryDays]
 * @returns {string}
 * @throws {TimError} USAGE when the branch is missing or does not name the ticket, or an allowlist option is given
 */
export const unattendedRunIdOf = ({
  ticket,
  branch,
  allowlistOwner,
  expiryDays
}) => {
  if (!branch) {
    throw new TimError(
      'USAGE',
      `--unattended needs --branch chore/${ticket}-<slug>: the same branch name in every repo.`
    )
  }
  if (!isBranchForTicket(ticket, branch)) {
    throw new TimError(
      'USAGE',
      `--branch must be chore/, fix/ or feat/ followed by ${ticket}-<slug>, with the slug in lower case. You gave ${branch}.`
    )
  }
  refuseUnattendedAllowlist({ allowlistOwner, expiryDays })
  return branch.replace(BRANCH_TYPE_PREFIX, '')
}
