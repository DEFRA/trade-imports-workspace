import {
  ensureBranch,
  reposWithUncommittedChanges
} from '../../govuk/ensure-branch.js'
import { isTimError } from '../../errors.js'
import { PhaseStopped } from '../phases/run-repos.js'

const stopWith = async (warn, message) => {
  await warn(message)
  throw new PhaseStopped(message)
}

const putRepoOnBranch = async ({ workspaceRoot, repo, branch, warn }) => {
  try {
    await ensureBranch({
      workspaceRoot,
      repo,
      branch,
      startPoint: 'origin/main',
      say: warn,
      warn
    })
  } catch (error) {
    if (!isTimError(error)) throw error
    await stopWith(warn, `Can't put ${repo} on ${branch}: ${error.message}`)
  }
}

/**
 * Puts every repo on the unattended run's branch. Stops before switching
 * any repo when one has uncommitted changes. A repo with no such branch,
 * locally or on origin, gets one made from origin/main after a fetch.
 *
 * @param {object} request
 * @param {string} request.workspaceRoot
 * @param {string[]} request.repos
 * @param {string} request.branch
 * @param {(line: string) => Promise<void>} request.warn - Takes git's output and one line per repo
 * @throws {PhaseStopped} when a repo has uncommitted changes, or cannot be put on the branch
 */
export const putReposOnUnattendedBranch = async ({
  workspaceRoot,
  repos,
  branch,
  warn
}) => {
  const dirty = await reposWithUncommittedChanges(workspaceRoot, repos)
  if (dirty.length > 0) {
    await stopWith(
      warn,
      `Stopped before switching branches: these repos have uncommitted changes: ${dirty.join(', ')}`
    )
  }
  for (const repo of repos) {
    await putRepoOnBranch({ workspaceRoot, repo, branch, warn })
  }
}
