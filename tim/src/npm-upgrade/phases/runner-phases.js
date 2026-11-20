import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { isTimError } from '../../errors.js'
import { jqText } from '../audit-rules.js'
import { StepFailed, lastLinesOf } from '../repo-commands.js'
import { resetOverrides } from '../reset-overrides.js'
import { runAutomatedUpgrades } from '../run-automated.js'
import { packagesPath, runFolder } from '../state.js'
import { aggregateClassifications, renderAggregateText } from '../writers.js'

const CASCADE = 1
const REPO_STOP = 3
const USAGE_EXIT = 2
const STDERR_TAIL_LINES = 5

/**
 * Folds any classification fragments left over into the packages files,
 * writing what that did, or why it could not, to stderr.
 *
 * @param {{workspaceRoot: string, runId: string, warn: (line: string) => Promise<void>}} request
 */
export const foldLeftoverClassifications = async ({
  workspaceRoot,
  runId,
  warn
}) => {
  try {
    await warn(
      renderAggregateText(aggregateClassifications({ workspaceRoot, runId }))
    )
  } catch (error) {
    if (!isTimError(error)) throw error
    await warn(error.message)
  }
}

const lineCollector = () => {
  const lines = []
  const collect = async (line) => {
    lines.push(`${line}\n`)
  }
  return { collect, text: () => lines.join('') }
}

const exitCodeOfFailure = (error, exitCodeOnUsage) => {
  if (error instanceof StepFailed) return error.exitCode
  return isTimError(error) && error.code === 'USAGE' ? exitCodeOnUsage : 1
}

const runRepoBatch = async (request, repo) => {
  const log = lineCollector()
  const exitCode = await runAutomatedUpgrades({
    workspaceRoot: request.workspaceRoot,
    runId: request.runId,
    repo,
    allowlistOwner: request.allowlistOwner ?? '',
    expiryDays: request.expiryDays ?? '',
    unattended: request.unattended ?? false,
    trailers: request.trailers,
    say: log.collect,
    warn: log.collect
  }).catch(async (error) => {
    await log.collect(error.message)
    return exitCodeOfFailure(error, 1)
  })
  return { repo, exitCode, logText: log.text() }
}

const statusOfBatches = ({ cascade, stopped, failed }) => {
  if (cascade.length > 0) return 'cascade_failure'
  if (stopped.length > 0) return 'stopped'
  if (failed.length > 0) return 'failed'
  return 'ok'
}

const keepBatchLog = (workspaceRoot, runId, { repo, logText }) => {
  const folder = join(runFolder(workspaceRoot, runId), repo)
  mkdirSync(folder, { recursive: true })
  const path = join(folder, 'phase2.log')
  writeFileSync(path, logText)
  return path
}

const reposOf = (batches, predicate) =>
  batches.filter(predicate).map(({ repo }) => repo)

/**
 * Phase 2: run `tim npm run-auto` for every repo phase 1 discovered, all
 * at once, and keep each one's output as `<repo>/phase2.log`.
 *
 * @param {object} request
 * @param {string} request.workspaceRoot
 * @param {string} request.runId
 * @param {string[]} request.repos
 * @param {string} [request.allowlistOwner]
 * @param {string} [request.expiryDays]
 * @param {boolean} [request.unattended] - Each repo's batch skips the end-of-batch E2E gate
 * @param {string[]} [request.trailers] - Lines for the end of each commit message
 * @param {(line: string) => Promise<void>} request.warn
 * @returns {Promise<{exitCode: number, result: object, text: string}>} exitCode 1 unless every repo's batch exited 0
 */
export const automatedPhase = async (request) => {
  const { workspaceRoot, runId, repos } = request
  await foldLeftoverClassifications(request)
  const discovered = repos.filter((repo) =>
    existsSync(packagesPath(runFolder(workspaceRoot, runId), repo))
  )
  const batches = await Promise.all(
    discovered.map((repo) => runRepoBatch(request, repo))
  )
  const perRepo = batches.map((batch) => ({
    repo: batch.repo,
    exit_code: batch.exitCode,
    log: keepBatchLog(workspaceRoot, runId, batch)
  }))
  const outcome = {
    cascade: reposOf(batches, ({ exitCode }) => exitCode === CASCADE),
    stopped: reposOf(batches, ({ exitCode }) => exitCode === REPO_STOP),
    failed: reposOf(
      batches,
      ({ exitCode }) => ![0, CASCADE, REPO_STOP].includes(exitCode)
    )
  }
  const status = statusOfBatches(outcome)
  const result = {
    status,
    cascade_failures: outcome.cascade,
    stopped: outcome.stopped,
    failed: outcome.failed,
    per_repo: perRepo
  }
  return {
    exitCode: status === 'ok' ? 0 : 1,
    result,
    text: JSON.stringify(result)
  }
}

const resetRepo = async (request, repo) => {
  const errors = lineCollector()
  try {
    const { exitCode, result } = await resetOverrides({
      workspaceRoot: request.workspaceRoot,
      runId: request.runId,
      repo,
      trailers: request.trailers,
      warn: errors.collect
    })
    return { repo, exit_code: exitCode, ...result }
  } catch (error) {
    await errors.collect(error.message)
    return {
      repo,
      exit_code: exitCodeOfFailure(error, USAGE_EXIT),
      error: lastLinesOf(errors.text(), STDERR_TAIL_LINES).trimEnd()
    }
  }
}

/**
 * Phase 4: run `tim npm reset-overrides` for every repo, all at once.
 *
 * @param {object} request
 * @param {string} request.workspaceRoot
 * @param {string} request.runId
 * @param {string[]} request.repos
 * @param {string[]} [request.trailers] - Lines for the end of each commit message
 * @param {(line: string) => Promise<void>} request.warn
 * @returns {Promise<{exitCode: number, result: object, text: string}>} exitCode 1 when any repo stopped for a decision
 */
export const resetOverridesPhase = async (request) => {
  const { workspaceRoot, runId, repos, warn } = request
  mkdirSync(runFolder(workspaceRoot, runId), { recursive: true })
  for (const repo of repos) await warn(`Resetting overrides in ${repo}...`)
  const perRepo = await Promise.all(
    repos.map((repo) => resetRepo(request, repo))
  )
  const stopped = reposOf(perRepo, ({ exit_code: exitCode }) => exitCode !== 0)
  const result = {
    status: stopped.length === 0 ? 'ok' : 'stopped',
    stopped,
    per_repo: perRepo
  }
  return {
    exitCode: stopped.length > 0 ? 1 : 0,
    result,
    text: jqText(result).trimEnd()
  }
}
