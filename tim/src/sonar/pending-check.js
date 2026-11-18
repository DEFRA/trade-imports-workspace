import {
  dropPendingCheck,
  isPendingCheckExpired,
  listPendingChecks,
  markCheckSeen
} from './pending-store.js'

const issueLine = ({ severity, file, line, rule, message }) =>
  `  [${severity}] ${file}:${line ?? '?'} ${rule} — ${message}`

const analysedPullRequestKey = (pullRequests, { branch, sha }) =>
  pullRequests.find(
    (pullRequest) => pullRequest.branch === branch && pullRequest.sha === sha
  )?.key

const pullRequestsOf = async (client, project) => {
  try {
    return (await client.listPullRequests(project)).pullRequests
  } catch {
    return []
  }
}

const blockingIssueLines = async (client, project, pullRequest) => {
  try {
    const { issues } = await client.listIssues(project, {
      pullRequest,
      severities: ['BLOCKER', 'CRITICAL']
    })
    return issues.map(issueLine)
  } catch {
    return []
  }
}

const reportSection = (project, pullRequest, lines) =>
  `${project} (PR #${pullRequest}):\n${lines.join('\n')}\n`

const hookOutput = (event, sections) => {
  const context = `New BLOCKER/CRITICAL SonarCloud issues on your pushed PR(s) — fix before merge:\n${sections.join('')}`
  const output = {
    hookSpecificOutput: { hookEventName: event, additionalContext: context }
  }
  return `${JSON.stringify(output, null, 2)}\n`
}

/**
 * Settles every pending check in the folder with one look at SonarCloud
 * each. A check whose pushed commit SonarCloud has analysed on its pull
 * request is marked seen, and its open BLOCKER and CRITICAL issues are
 * reported. A check not analysed yet stays, unless it has waited 45
 * minutes, when it is dropped. A failed SonarCloud call counts as no pull
 * request found when listing, and as no issues when searching.
 *
 * @param {object} opts
 * @param {string} opts.folder - the checks folder
 * @param {string} opts.event - the hook event the output is attributed to
 * @param {{listPullRequests: Function, listIssues: Function}} opts.client - a sonar client
 * @param {number} opts.nowSeconds - epoch seconds
 * @returns {Promise<string>} the hook's JSON output with a final newline, or '' when there is nothing to report
 */
export const settlePendingChecks = async ({
  folder,
  event,
  client,
  nowSeconds
}) => {
  const pullRequestsByProject = new Map()
  const sections = []
  for (const check of listPendingChecks(folder)) {
    if (!pullRequestsByProject.has(check.project)) {
      pullRequestsByProject.set(
        check.project,
        await pullRequestsOf(client, check.project)
      )
    }
    const pullRequest = analysedPullRequestKey(
      pullRequestsByProject.get(check.project),
      check
    )
    if (pullRequest === undefined) {
      if (isPendingCheckExpired(check, nowSeconds)) {
        dropPendingCheck(folder, check)
      }
      continue
    }
    const lines = await blockingIssueLines(client, check.project, pullRequest)
    if (lines.length > 0) {
      sections.push(reportSection(check.project, pullRequest, lines))
    }
    markCheckSeen(folder, check)
  }
  return sections.length > 0 ? hookOutput(event, sections) : ''
}
