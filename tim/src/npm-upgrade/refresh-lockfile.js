import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../errors.js'
import { AUDIT_CONFIG_FILE } from './audit-rules.js'
import { auditBaselineToLog } from './audit-to-log.js'
import { hasTrackedChanges, repoCommands } from './repo-commands.js'
import { isFolder, runFolder } from './state.js'

const TESTS_REPO = 'trade-imports-ins-tests'

export const REFRESH_USAGE =
  'Usage: tim npm refresh-lockfile --run-id TICKET --repo REPO [--repo-path PATH]'

const COMMIT_MESSAGE =
  'Refresh transitive dependencies\n\nnpm update within the existing package.json ranges.'

/** The refresh stopped and rolled back, for the reason it gives. */
class RolledBack extends Error {
  constructor(reason) {
    super(reason)
    this.reason = reason
  }
}

const resultOf = (context, status, { commit = '', reason = '' } = {}) => ({
  repo: context.repo,
  status,
  commit: commit === '' ? null : commit,
  reason: reason === '' ? null : reason,
  log: context.log
})

const hasScript = (checkout, script) =>
  JSON.parse(readFileSync(join(checkout, 'package.json'), 'utf8')).scripts?.[
    script
  ] != null

const npmInRepo = async ({ commands, checkout, log }, args) =>
  (await commands.npmToLog(args, { cwd: checkout, logPath: log, append: true }))
    .exitCode === 0

const heading = ({ log }, title) => appendFileSync(log, `== ${title}\n`)

const rollBack = async (context) => {
  await context.commands.mustGit(context.checkout, [
    'checkout',
    'HEAD',
    '--',
    'package.json',
    'package-lock.json'
  ])
  await npmInRepo(context, ['install'])
}

const requireStep = (passed, reason) => {
  if (!passed) throw new RolledBack(reason)
}

const isUnchanged = async ({ commands, checkout }, file) =>
  (await commands.git(checkout, ['diff', '--quiet', '--', file])).exitCode === 0

const checkRefreshedRepo = async (context) => {
  const { checkout, repo } = context
  if (repo !== TESTS_REPO && hasScript(checkout, 'test')) {
    heading(context, 'npm test')
    requireStep(
      await npmInRepo(context, ['test']),
      'npm test failed after npm update'
    )
  }
  if (hasScript(checkout, 'lint')) {
    heading(context, 'npm run lint')
    requireStep(
      await npmInRepo(context, ['run', 'lint']),
      'npm run lint failed after npm update'
    )
  }
  if (existsSync(join(checkout, AUDIT_CONFIG_FILE))) {
    heading(context, 'tim npm audit baseline')
    const { exitCode } = await auditBaselineToLog(
      {
        workspaceRoot: context.workspaceRoot,
        runId: context.runId,
        repo,
        repoPath: checkout,
        label: 'refresh-lockfile'
      },
      { logPath: context.log, append: true }
    )
    requireStep(
      exitCode === 0,
      `audit red after npm update (see ${join(context.stateFolder, `audit.${repo}.refresh-lockfile.summary.json`)})`
    )
  }
}

const refreshSteps = async (context) => {
  const { commands, checkout } = context
  heading(context, 'npm update')
  requireStep(await npmInRepo(context, ['update']), 'npm update failed')
  requireStep(
    await isUnchanged(context, 'package.json'),
    'npm update changed package.json; expected a lockfile-only change'
  )
  if (await isUnchanged(context, 'package-lock.json')) {
    return resultOf(context, 'no_change')
  }
  await checkRefreshedRepo(context)
  await commands.mustGit(checkout, ['add', 'package-lock.json'])
  heading(context, 'git commit')
  const commit = await commands.gitToLog(
    checkout,
    ['commit', '-m', COMMIT_MESSAGE],
    {
      logPath: context.log,
      append: true
    }
  )
  requireStep(
    commit.exitCode === 0,
    'commit refused (pre-commit hook); see the log'
  )
  const sha = (
    await commands.mustGit(checkout, ['rev-parse', '--short', 'HEAD'])
  ).stdout
  return resultOf(context, 'committed', { commit: sha })
}

/**
 * Runs `npm update` in one repo, which moves transitive dependencies within
 * their existing ranges, checks the repo still passes its tests, lint and
 * audit, and commits the new lockfile. Any failure restores package.json
 * and package-lock.json from HEAD and reinstalls. Everything the commands
 * print goes to `refresh-lockfile.<repo>.log` in the run's repo folder.
 *
 * @param {object} request
 * @param {string} request.workspaceRoot
 * @param {string} request.runId
 * @param {string} request.repo
 * @param {string} [request.repoPath] - Refresh this checkout instead of `repos/<repo>`
 * @param {Record<string, string | undefined>} [request.env]
 * @returns {Promise<{exitCode: number, result: {repo: string, status: 'committed' | 'no_change' | 'rolled_back', commit: string | null, reason: string | null, log: string}}>} exitCode 0 committed or nothing to refresh, 1 rolled back
 * @throws {TimError} USAGE for a missing option or repo, or a repo with uncommitted changes
 * @throws {StepFailed} when a git step that has to work fails
 */
export const refreshLockfile = async ({
  workspaceRoot,
  runId,
  repo,
  repoPath,
  env
}) => {
  if (!runId || !repo) throw new TimError('USAGE', REFRESH_USAGE)
  const path = repoPath || join(workspaceRoot, 'repos', repo)
  if (!isFolder(path)) throw new TimError('USAGE', `Repo not found: ${path}`)
  const checkout = realpathSync(path)
  const stateFolder = join(runFolder(workspaceRoot, runId), repo)
  mkdirSync(stateFolder, { recursive: true })
  const log = join(stateFolder, `refresh-lockfile.${repo}.log`)
  writeFileSync(log, '')
  const commands = repoCommands({ env })
  const context = {
    workspaceRoot,
    runId,
    repo,
    checkout,
    stateFolder,
    log,
    commands
  }
  if (await hasTrackedChanges(commands, checkout)) {
    throw new TimError(
      'USAGE',
      `Uncommitted changes in ${checkout}. Commit or stash first.`
    )
  }
  try {
    return { exitCode: 0, result: await refreshSteps(context) }
  } catch (error) {
    if (!(error instanceof RolledBack)) throw error
    await rollBack(context)
    return {
      exitCode: 1,
      result: resultOf(context, 'rolled_back', { reason: error.reason })
    }
  }
}
