import { join } from 'node:path'
import { writeJsonAtomic } from '../backlog/io.js'
import { repoPath } from '../constants/repos.js'
import { run as runProcess } from '../exec/exec.js'
import { loadBaseline, headSha, BASELINE_PATH } from './status.js'
import { assertRunRuled } from './findings.js'

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
 * `verifiedAt`/`verifiedBy`. The catch-up skill may call this after a
 * finished walk when `--require-ruled` is set; bare `--advance` stays
 * available for a person who has already verified by hand.
 * Idempotent: running it twice with nothing landed in between writes
 * the same content both times.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {boolean} [args.requireRuled] - Refuse unless the latest catch-up run is fully ruled and applied
 * @param {string} [args.runDate] - Catch-up run date when requireRuled is set
 * @param {Function} [args.run] - git runner
 * @returns {Promise<{before: object, after: object, path: string, ruledRun?: string}>}
 * @throws {TimError} NOT_FOUND when openspec/baseline.json is missing
 * @throws {TimError} USAGE when requireRuled and the catch-up run is not settled
 */
export const advanceBaseline = async ({
  workspaceRoot,
  requireRuled = false,
  runDate,
  run = runProcess
}) => {
  let ruledRun
  if (requireRuled) {
    const asserted = assertRunRuled({
      workspaceRoot,
      skill: 'catchup',
      run: runDate
    })
    ruledRun = asserted.runDir
  }

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

  return { before, after, path, ...(ruledRun ? { ruledRun } : {}) }
}
