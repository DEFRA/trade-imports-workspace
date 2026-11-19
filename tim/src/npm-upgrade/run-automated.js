import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../errors.js'
import { runToLog } from '../exec/exec.js'
import { countPackages, listPackages, renderCountsText } from './queries.js'
import { refreshLockfile } from './refresh-lockfile.js'
import { StepFailed, repoCommands } from './repo-commands.js'
import { isFolder, packagesPath, runFolder } from './state.js'
import { looksLikeRunId } from './unattended/run.js'
import { upgradePackage } from './upgrade-package.js'

const TESTS_REPO = 'trade-imports-ins-tests'
const RULE = '==========================================='
const CASCADE = 1
const REPO_STOP = 3

const requireRunnerOptions = async ({ workspaceRoot, runId, repo, warn }) => {
  if (!repo) throw new TimError('USAGE', 'Missing repo-name')
  if (!runId) throw new TimError('USAGE', '--run-id required')
  if (!looksLikeRunId(runId)) {
    await warn(`Warning: --run-id '${runId}' does not match Jira-ticket format`)
  }
  const packagesFile = packagesPath(runFolder(workspaceRoot, runId), repo)
  if (!existsSync(packagesFile)) {
    throw new TimError('USAGE', `Packages file not found: ${packagesFile}`)
  }
  const checkout = join(workspaceRoot, 'repos', repo)
  if (!isFolder(checkout)) {
    throw new TimError('USAGE', `Repo not found: ${checkout}`)
  }
  return checkout
}

const pendingAutoPackages = ({ workspaceRoot, runId, repo }) =>
  listPackages({
    workspaceRoot,
    runId,
    repo,
    classification: 'auto',
    status: 'pending',
    emptyWhenRunMissing: true
  })

const statusOf = ({ workspaceRoot, runId, repo }, packageName) =>
  listPackages({
    workspaceRoot,
    runId,
    repo,
    packageName,
    emptyWhenRunMissing: true
  })[0]?.implementation_status

const sayCounts = (context) =>
  context.say(
    renderCountsText(countPackages(context), {
      runId: context.runId,
      repo: context.repo
    })
  )

const refuseDirtyTree = async ({ checkout, warn }) => {
  const commands = repoCommands()
  const status = await commands.git(checkout, ['status', '--porcelain', '-uno'])
  if (status.stdout === '') return
  const short = await commands.git(checkout, ['status', '--short', '-uno'])
  await warn('Error: Repository has uncommitted changes')
  await warn(short.stdout)
  await warn('Commit or stash before running automated upgrades.')
  throw new RunnerStopped(1)
}

/** The runner stops with this exit code. */
class RunnerStopped extends Error {
  constructor(exitCode) {
    super(`Runner stopped with exit ${exitCode}`)
    this.exitCode = exitCode
  }
}

const upgradeExitCodeOf = async (context, packageName) => {
  const exitCode = await upgradePackage({
    mode: 'auto',
    workspaceRoot: context.workspaceRoot,
    runId: context.runId,
    repo: context.repo,
    packageName,
    allowlistOwner: context.allowlistOwner,
    expiryDays: context.expiryDays,
    env: context.env,
    say: context.say,
    warn: context.warn
  }).catch(async (error) => {
    if (!(error instanceof TimError)) throw error
    await context.warn(error.message)
    return 2
  })
  return exitCode
}

const upgradeEachPending = async (context) => {
  const { say } = context
  const total = pendingAutoPackages(context).length
  await say(
    total === 0
      ? `No auto-classified packages awaiting upgrade in ${context.repo}.`
      : `Processing ${total} package(s) sequentially...`
  )
  await say('')
  const tally = { processed: 0, success: 0, failed: 0 }
  return total === 0 ? tally : upgradeNextPending(context, total, tally)
}

const upgradeNextPending = async (context, total, tally) => {
  const next = pendingAutoPackages(context)[0]?.package
  if (!next) return tally
  const processed = tally.processed + 1
  await context.say(`=== Package ${processed}/${total} ===`)
  const exitCode = await upgradeExitCodeOf(context, next)
  const outcome = await tallyUpgrade(context, next, exitCode)
  await context.say('')
  return upgradeNextPending(context, total, {
    processed,
    success: tally.success + outcome.success,
    failed: tally.failed + outcome.failed
  })
}

const tallyUpgrade = async (context, packageName, exitCode) => {
  const { say, warn } = context
  if (exitCode === CASCADE) {
    await warn('✗ CRITICAL: Cascade failure — stopping')
    throw new RunnerStopped(CASCADE)
  }
  if (exitCode === REPO_STOP) {
    await warn(
      `✗ Repo-level stop: the audit is red or could not run (see ${packageName}'s failure_reason). Fix the repo, then rerun phase 2.`
    )
    await sayCounts(context)
    throw new RunnerStopped(REPO_STOP)
  }
  if (exitCode !== 0) {
    await say(`✗ Failed (unexpected exit ${exitCode})`)
    return { success: 0, failed: 1 }
  }
  if (statusOf(context, packageName) === 'done') {
    await say('✓ Success')
    return { success: 1, failed: 0 }
  }
  await say('✗ Failed (demoted to manual)')
  return { success: 0, failed: 1 }
}

const refreshAtEndOfBatch = async (context) => {
  const { say } = context
  await say(RULE)
  await say('End-of-batch lockfile refresh')
  await say(RULE)
  const outcome = await refreshLockfile({
    workspaceRoot: context.workspaceRoot,
    runId: context.runId,
    repo: context.repo,
    env: context.env
  }).catch(async (error) => {
    if (!(error instanceof TimError) && !(error instanceof StepFailed)) {
      throw error
    }
    if (error instanceof TimError) await context.warn(error.message)
    return { result: null }
  })
  await say(outcome.result ? JSON.stringify(outcome.result) : '')
  await say('')
  return outcome.result?.status ?? ''
}

const timestampOf = (now) => {
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

const runEndToEndGate = async (context, success) => {
  const { say, warn, checkout } = context
  await say(RULE)
  await say('End-of-batch E2E gate (npm run test:docker-compose)')
  await say(RULE)
  const logPath = join(
    context.tmpFolder,
    `test-docker-compose-${timestampOf(new Date())}.log`
  )
  const result = await runToLog(
    'npm',
    ['--prefix', checkout, 'run', 'test:docker-compose'],
    { logPath, commandHeader: false }
  )
  if (result.exitCode === 0) {
    await say(
      `✓ test:docker-compose pass — ${success} upgrade(s) integration-verified`
    )
  } else {
    await warn(`✗ test:docker-compose FAILED after ${success} upgrade(s)`)
    await warn(`  Log: ${logPath}`)
    await warn(
      `  Read structured failures: ${checkout}/test-results/*/error-context.md`
    )
    await warn(
      '  Upgrades are committed — operator must investigate which one caused the regression.'
    )
  }
  await say('')
}

const sayNextSteps = async (
  { say, runId, repo, checkout },
  { success, failed }
) => {
  await say('')
  await say(RULE)
  await say('Next Steps')
  await say(RULE)
  await say('')
  if (success > 0) {
    await say('✅ Review successful upgrades:')
    await say(`   git -C ${checkout} log --oneline -${success}`)
    await say(`   npm --prefix ${checkout} test`)
    await say('')
  }
  if (failed > 0) {
    await say('❌ Failed packages auto-demoted to classification=manual:')
    await say(
      `   tim npm packages list --run-id ${runId} --repo ${repo} --status failed`
    )
    await say('')
  }
  if (success > 0) {
    await say('🚀 Push when ready:')
    await say(`   git -C ${checkout} push origin <branch-name>`)
    await say('')
  }
  await say('📊 Overall status:')
  await say(`   tim npm packages counts --run-id ${runId}`)
}

const runnerSteps = async (context) => {
  const { say, repo } = context
  await say(RULE)
  await say(`Automated NPM Upgrades — ${repo}`)
  await say(RULE)
  await refuseDirtyTree(context)
  await say('✓ Git status clean')
  await say('')
  const tally = await upgradeEachPending(context)
  const refreshStatus = await refreshAtEndOfBatch(context)
  await say(RULE)
  await say(`Automated upgrades complete for ${repo}`)
  await say(RULE)
  await say('')
  await say(`  Processed: ${tally.processed}`)
  await say(`  ✅ Success: ${tally.success}`)
  await say(`  ❌ Failed:  ${tally.failed}`)
  await say(`  Lockfile refresh: ${refreshStatus}`)
  await say('')
  const landedAnything = tally.success > 0 || refreshStatus === 'committed'
  if (repo === TESTS_REPO && context.unattended) {
    await context.warn(
      'Skipped npm run test:docker-compose: an unattended run never starts the Docker stack, so CI\'s "E2E Tests" check is the end-to-end proof.'
    )
  } else if (repo === TESTS_REPO && landedAnything) {
    await runEndToEndGate(context, tally.success)
  }
  await sayCounts(context)
  await sayNextSteps(context, tally)
}

/**
 * Phase 2 for one repo: upgrades every automatic package still pending,
 * one at a time, re-reading the packages file after each, then refreshes
 * the lockfile. In trade-imports-ins-tests it then runs
 * `npm run test:docker-compose` once when anything landed. An unattended
 * run skips that, and says so on `warn`.
 *
 * @param {object} request
 * @param {string} request.workspaceRoot
 * @param {string} request.runId
 * @param {string} request.repo
 * @param {string} [request.allowlistOwner]
 * @param {string} [request.expiryDays]
 * @param {boolean} [request.unattended] - Skip the end-of-batch E2E gate
 * @param {string} [request.tmpFolder='/tmp'] - Where the end-of-batch E2E log goes
 * @param {Record<string, string | undefined>} [request.env]
 * @param {(line: string) => Promise<void>} request.say
 * @param {(line: string) => Promise<void>} request.warn
 * @returns {Promise<number>} 0 done, 1 a cascade or a dirty tree, 3 an audit red or not run before an install
 * @throws {TimError} USAGE for a missing repo, run id, packages file or checkout
 */
export const runAutomatedUpgrades = async ({
  tmpFolder = '/tmp',
  ...request
}) => {
  const checkout = await requireRunnerOptions(request)
  const context = { ...request, tmpFolder, checkout }
  try {
    await runnerSteps(context)
    return 0
  } catch (error) {
    if (error instanceof RunnerStopped) return error.exitCode
    throw error
  }
}
