import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { isTimError } from '../../errors.js'
import { runAuditBaseline } from '../audit.js'
import { baselineExitCodeOf, jqText } from '../audit-rules.js'
import { readJson, runFolder } from '../state.js'
import { checkoutOf, headOf, PhaseStopped } from './run-repos.js'

const COULD_NOT_RUN = 2

/**
 * @param {string} workspaceRoot
 * @param {string} runId
 * @returns {string} The run's `phase0.json`, which keeps every phase 0 run
 */
export const phase0Path = (workspaceRoot, runId) =>
  join(runFolder(workspaceRoot, runId), 'phase0.json')

const isoSecondOf = (now) => now.toISOString().replace(/\.\d{3}Z$/, 'Z')

const compactStampOf = (now) => isoSecondOf(now).replaceAll(/[-:]/g, '')

const couldNotRunSummaryOf = (repo) => ({
  repo,
  green: false,
  error: 'tim npm audit baseline could not run the audit'
})

const auditOne = async ({ workspaceRoot, runId, repo, label, warn }) => {
  try {
    const summary = await runAuditBaseline({
      workspaceRoot,
      runId,
      repo,
      label,
      warn
    })
    return { summary, exitCode: baselineExitCodeOf(summary) }
  } catch (error) {
    await warn(error.message)
    const exitCode =
      isTimError(error) && error.code === 'REFUSED' ? 1 : COULD_NOT_RUN
    return { summary: couldNotRunSummaryOf(repo), exitCode }
  }
}

const appendRun = (path, record) => {
  const history = existsSync(path) ? readJson(path) : { runs: [] }
  writeFileSync(path, jqText({ ...history, runs: [...history.runs, record] }))
}

/**
 * Phase 0: audit every repo with `tim npm audit baseline` and add the run
 * to the run's `phase0.json`. A repo whose audit is red, has an
 * allowlisted advisory that now has a fix, or cannot run is red.
 *
 * @param {object} request
 * @param {string} request.workspaceRoot
 * @param {string} request.runId
 * @param {string[]} request.repos
 * @param {string} request.branch
 * @param {Date} [request.now]
 * @param {(line: string) => Promise<void>} request.warn
 * @returns {Promise<{exitCode: number, result: object, text: string}>} exitCode 1 when any repo is red
 */
export const auditPhase = async ({
  workspaceRoot,
  runId,
  repos,
  branch,
  now = new Date(),
  warn
}) => {
  mkdirSync(runFolder(workspaceRoot, runId), { recursive: true })
  const label = `phase0-${compactStampOf(now)}`
  const perRepo = []
  for (const repo of repos) {
    await warn(`Auditing ${repo}...`)
    const { summary, exitCode } = await auditOne({
      workspaceRoot,
      runId,
      repo,
      label,
      warn
    })
    const head = await headOf(checkoutOf(workspaceRoot, repo))
    perRepo.push({ ...summary, head, exit_code: exitCode })
  }
  const red = perRepo
    .filter(({ exit_code: exitCode }) => exitCode !== 0)
    .map(({ repo }) => repo)
  const record = {
    ran_at: isoSecondOf(now),
    label,
    branch,
    green: red.length === 0,
    red,
    repos: perRepo.map(({ repo }) => repo),
    per_repo: perRepo
  }
  appendRun(phase0Path(workspaceRoot, runId), record)
  if (red.length > 0) {
    await warn(
      `Phase 0 RED: ${red.join(' ')}. Clear the failing or fixable_allowlisted advisories first.`
    )
  } else {
    await warn(`Phase 0 green for ${repos.length} repo(s).`)
  }
  return {
    exitCode: red.length > 0 ? 1 : 0,
    result: record,
    text: jqText(record).trimEnd()
  }
}

const gateProblemOf = async (lastRun, workspaceRoot, repo) => {
  const row = lastRun?.per_repo?.find((candidate) => candidate.repo === repo)
  if (!row) return `${repo}: not in the last phase 0 run`
  if (row.exit_code !== 0) return `${repo}: red in the last phase 0 run`
  const head = await headOf(checkoutOf(workspaceRoot, repo))
  return row.head === head
    ? null
    : `${repo}: HEAD has moved since the last phase 0 run`
}

/**
 * @param {object} request
 * @param {string} request.workspaceRoot
 * @param {string} request.runId
 * @param {string[]} request.repos
 * @param {(line: string) => Promise<void>} request.warn
 * @throws {PhaseStopped} unless the last phase 0 run covered every repo, at its current HEAD, and was green for it
 */
export const requireGreenPhase0 = async ({
  workspaceRoot,
  runId,
  repos,
  warn
}) => {
  const path = phase0Path(workspaceRoot, runId)
  if (!existsSync(path)) {
    const message = `Refusing phase 1: no phase 0 run for ${runId}. Run --phase 0 first.`
    await warn(message)
    throw new PhaseStopped(message)
  }
  const lastRun = readJson(path).runs?.at(-1)
  const problems = []
  for (const repo of repos) {
    const problem = await gateProblemOf(lastRun, workspaceRoot, repo)
    if (problem) problems.push(problem)
  }
  if (problems.length === 0) return
  const message = [
    'Refusing phase 1 until a green phase 0 run covers these repos:',
    ...problems.map((problem) => `  ${problem}`)
  ].join('\n')
  await warn(message)
  throw new PhaseStopped(message)
}
