import { TimError } from '../errors.js'

const DEFAULT_PROJECT_KEY = 'EUDPA'

const escapeForRegExp = (text) => text.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')

const slugOf = (branch) =>
  branch.replaceAll('/', '_').replaceAll(/[^A-Za-z0-9_-]/g, '_')

/**
 * The run id and branch a govuk-frontend upgrade run uses. A ticket gives
 * the branch `chore/<ticket>` and is the run id. A branch is used as it
 * is; its run id is the first ticket key in it, else the branch with `/`
 * and every character outside letters, digits, `_` and `-` as `_`.
 *
 * @param {object} args
 * @param {string} [args.ticket]
 * @param {string} [args.branch]
 * @param {string} [args.projectKey] - Defaults to JIRA_PROJECT_KEY, else EUDPA
 * @returns {{runId: string, branch: string}}
 * @throws {TimError} USAGE when both or neither are given, or the ticket is not a key of the project
 */
export const runOf = ({
  ticket,
  branch,
  projectKey = process.env.JIRA_PROJECT_KEY || DEFAULT_PROJECT_KEY
}) => {
  if (ticket && branch) {
    throw new TimError('USAGE', 'Pass --ticket OR --branch, not both')
  }
  if (!ticket && !branch) {
    throw new TimError('USAGE', 'One of --ticket or --branch is required')
  }
  const key = escapeForRegExp(projectKey)
  if (ticket) {
    if (!new RegExp(`^${key}-[0-9]+$`).test(ticket)) {
      throw new TimError(
        'USAGE',
        `--ticket must match ${projectKey}-NNNN (got: ${ticket})`
      )
    }
    return { runId: ticket, branch: `chore/${ticket}` }
  }
  const embedded = branch.match(new RegExp(`${key}-[0-9]+`))
  return { runId: embedded ? embedded[0] : slugOf(branch), branch }
}

/**
 * Checks the ticket an unattended run is given: a key of the project or
 * `NO_JIRA`, and no branch, since the run names its own.
 *
 * @param {object} args
 * @param {string} [args.ticket]
 * @param {string} [args.branch]
 * @param {string} [args.projectKey] - Defaults to JIRA_PROJECT_KEY, else EUDPA
 * @returns {string} The ticket
 * @throws {TimError} USAGE for a branch, or a ticket that is neither a key of the project nor NO_JIRA
 */
export const unattendedTicketOf = ({
  ticket,
  branch,
  projectKey = process.env.JIRA_PROJECT_KEY || DEFAULT_PROJECT_KEY
}) => {
  if (branch || !ticket) {
    throw new TimError(
      'USAGE',
      `--unattended names its own branch: pass --ticket ${projectKey}-NNNN or --ticket NO_JIRA, not --branch`
    )
  }
  const key = escapeForRegExp(projectKey)
  if (!new RegExp(`^(${key}-[0-9]+|NO_JIRA)$`).test(ticket)) {
    throw new TimError(
      'USAGE',
      `--ticket must match ${projectKey}-NNNN or be NO_JIRA (got: ${ticket})`
    )
  }
  return ticket
}

/**
 * The run id and branch of an unattended run: the run id is
 * `<ticket>-govuk-frontend-<target>` and the branch `chore/<run id>`.
 *
 * @param {object} args
 * @param {string} args.ticket - From {@link unattendedTicketOf}
 * @param {string} args.target - A stable version, such as 6.6.0
 * @returns {{runId: string, branch: string}}
 * @throws {TimError} USAGE when the target is not a stable X.Y.Z version
 */
export const unattendedRunOf = ({ ticket, target }) => {
  if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(target)) {
    throw new TimError(
      'USAGE',
      `--target must be X.Y.Z in unattended mode (got: ${target})`
    )
  }
  const runId = `${ticket}-govuk-frontend-${target}`
  return { runId, branch: `chore/${runId}` }
}
