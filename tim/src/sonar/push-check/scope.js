const newestFirst = (left, right) => Number(right.key) - Number(left.key)

/**
 * The pull request SonarCloud knows for a branch, the newest when it knows
 * several. Null when it knows none, or when SonarCloud cannot be asked:
 * that reason goes to `writeError` and the check runs on the branch.
 *
 * @param {object} args
 * @param {{listPullRequests: Function}} args.sonarClient
 * @param {string} args.project
 * @param {string} args.branch
 * @param {(text: string) => void} args.writeError
 * @returns {Promise<{key: string, base: string} | null>}
 */
export const sonarPullRequestFor = async ({
  sonarClient,
  project,
  branch,
  writeError
}) => {
  try {
    const { pullRequests } = await sonarClient.listPullRequests(project)
    const forBranch = pullRequests
      .filter((pullRequest) => pullRequest.branch === branch)
      .sort(newestFirst)
    return forBranch[0] ?? null
  } catch (error) {
    writeError(
      `Can't ask SonarCloud for this branch's pull request (${error.message}). Checking the branch instead.\n`
    )
    return null
  }
}

/**
 * What the analysis is recorded against: the pull request given, else the
 * one `findPullRequest` finds for the branch, else the branch. Null on a
 * detached HEAD with no pull request, since an analysis with neither is
 * recorded against main.
 *
 * @param {object} args
 * @param {string} args.branch - '' on a detached HEAD
 * @param {string} [args.pullRequest]
 * @param {string} [args.base]
 * @param {(branch: string) => Promise<{key: string, base: string} | null>} args.findPullRequest
 * @returns {Promise<{pullRequest: {key: string, base: string, branch: string}} | {branch: string} | null>}
 */
export const analysisScope = async ({
  branch,
  pullRequest,
  base,
  findPullRequest
}) => {
  if (pullRequest !== undefined) {
    return { pullRequest: { key: pullRequest, base, branch } }
  }
  const found = branch ? await findPullRequest(branch) : null
  if (found) {
    return { pullRequest: { key: found.key, base: found.base, branch } }
  }
  return branch ? { branch } : null
}

/**
 * The scanner properties that record an analysis against its scope.
 *
 * @param {{pullRequest: {key: string, base: string, branch: string}} | {branch: string}} scope
 * @returns {string[]}
 */
export const scopeArguments = (scope) =>
  scope.pullRequest
    ? [
        `-Dsonar.pullrequest.key=${scope.pullRequest.key}`,
        `-Dsonar.pullrequest.branch=${scope.pullRequest.branch}`,
        `-Dsonar.pullrequest.base=${scope.pullRequest.base}`
      ]
    : [`-Dsonar.branch.name=${scope.branch}`]
