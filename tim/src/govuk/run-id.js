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
