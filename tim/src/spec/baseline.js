import { join } from 'node:path'
import { writeJsonAtomic } from '../backlog/io.js'
import { repoPath } from '../constants/repos.js'
import { run as runProcess } from '../exec/exec.js'
import { loadBaseline, headSha, BASELINE_PATH } from './status.js'

const today = () => new Date().toISOString().slice(0, 10)

/**
 * The current baseline, unchanged. The bare `tim spec baseline` form.
 *
 * @param {string} workspaceRoot
 * @returns {{verifiedAt: string, verifiedBy: string, repos: Record<string, string>}}
 * @throws {TimError} NOT_FOUND when openspec/baseline.json is missing
 */
export const printBaseline = (workspaceRoot) => loadBaseline(workspaceRoot)

/**
 * Move every repo in the baseline to its current HEAD, and rewrite
 * `verifiedAt`/`verifiedBy`. Only a person runs this — the sweep only
 * prints the command, and never calls it itself, so a range marked
 * verified is always one a human reviewed. Idempotent: running it twice
 * with nothing landed in between writes the same content both times.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {Function} [args.run]
 * @returns {Promise<{before: object, after: object, path: string}>}
 * @throws {TimError} NOT_FOUND when openspec/baseline.json is missing
 */
export const advanceBaseline = async ({ workspaceRoot, run = runProcess }) => {
  const before = loadBaseline(workspaceRoot)
  const workspaceHead = await headSha(workspaceRoot, run)

  const repos = Object.fromEntries(
    await Promise.all(
      Object.keys(before.repos).map(async (repo) => [
        repo,
        (await headSha(repoPath(workspaceRoot, repo), run)) ??
          before.repos[repo]
      ])
    )
  )

  const after = {
    verifiedAt: today(),
    verifiedBy: workspaceHead?.slice(0, 8) ?? before.verifiedBy,
    repos
  }

  const path = join(workspaceRoot, BASELINE_PATH)
  writeJsonAtomic(path, after)

  return { before, after, path }
}
