import { existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../errors.js'
import { withTrailers } from '../git/commit-message.js'
import { forgetAllowlistEntries, runUpgradeGate } from './audit.js'
import { AUDIT_CONFIG_FILE } from './audit-rules.js'
import { auditBaselineToLog } from './audit-to-log.js'
import {
  StepFailed,
  hasTrackedChanges,
  lastLinesOf,
  repoCommands
} from './repo-commands.js'
import { isFolder, packagesPath, runFolder } from './state.js'
import { setPackageClassification, setPackageStatus } from './writers.js'

const TESTS_REPO = 'trade-imports-ins-tests'
const RULE = '========================================='
const GATE_EXIT_CODES = { green: 0, red: 1, not_run: 2 }
const REPO_STOP = 3
const CASCADE = 1

/** What the automatic and the manual upgrade say and do differently. */
const MODES = {
  auto: {
    header: ({ packageName, current, target, classification }) =>
      `Package: ${packageName} | ${current} → ${target} | classification: ${classification}`,
    testsRepoNote:
      '(tests repo — npm test gating skipped; test:docker-compose runs at end of batch)',
    logSuffix: '',
    tmpLogSuffix: '',
    reportsNvm: true,
    checksCleanTree: false,
    baselineTestsFailed: {
      line: 'ERROR: Baseline tests failed (repo issue, not upgrade)',
      reason:
        'Baseline tests failed before upgrade; repo issue, not package-specific'
    },
    baselineAudit: {
      redLine: 'ERROR: Baseline audit red (repo issue, not upgrade)',
      redReason: (log) =>
        `Audit red at baseline, before upgrade; repo issue, not package-specific. See ${log}`,
      notRunReason: (log) =>
        `Audit could not run before upgrade (registry offline, or audit-ci not installed?); repo or environment issue, not package-specific. See ${log}`,
      exitCode: REPO_STOP
    },
    installing: () => 'Upgrading...',
    installFailed: {
      demoteReason: 'npm install failed — likely peer dependency conflict',
      reason: ({ packageName, target }) =>
        `npm install ${packageName}@${target} failed (peer conflict likely)`
    },
    testing: 'Testing upgraded package...',
    testsFailed: {
      line: 'ERROR: Tests failed after upgrade — rolling back',
      demoteReason: 'Tests fail after upgrade; requires investigation',
      reason: ({ target }) =>
        `Tests failed after upgrade to ${target}; rolled back; demoted to manual`
    },
    gateFailed: (gate, reason) =>
      gate === 'not_run'
        ? {
            line: `ERROR: ${reason} — rolling back (not demoted)`,
            demoteReason: '',
            reason: `${reason}; rolled back; environment issue, not demoted`,
            exitCode: REPO_STOP
          }
        : {
            line: `ERROR: ${reason} — rolling back`,
            demoteReason: reason,
            reason: `${reason}; rolled back; demoted to manual`,
            exitCode: 0
          },
    alreadyAtTarget: ({ packageName, target }) =>
      `SUCCESS: ${packageName} already at ${target} (no commit needed)`,
    commitRefused: (hookOutput, { target }) => ({
      demoteReason: "Commit refused by the repo's pre-commit hook",
      reason: `Commit refused after upgrade to ${target} (pre-commit hook): ${hookOutput}; rolled back; demoted to manual`
    }),
    rollback: {
      verifyingLine: 'Verifying rollback...',
      cascadeLine:
        '✗ CRITICAL: Tests still failing after rollback — cascade failure',
      cascadeReason:
        'CASCADE: tests still failing after rollback. Previous upgrade may have broken something. Manual intervention required.',
      doneLine: '✓ Rollback successful'
    }
  },
  manual: {
    header: ({ packageName, current, target, repo }) =>
      `Manual upgrade: ${packageName} | ${current} → ${target} (repo: ${repo})`,
    testsRepoNote:
      '(tests repo — npm test gating skipped; walker runs test:docker-compose at end of batch)',
    logSuffix: '-manual',
    tmpLogSuffix: '-manual',
    reportsNvm: false,
    checksCleanTree: true,
    baselineTestsFailed: {
      line: 'ERROR: Baseline tests failed (repo issue)',
      reason: 'Baseline tests failed before upgrade; repo issue'
    },
    baselineAudit: {
      redLine: 'ERROR: Baseline audit red (repo issue)',
      redReason: (log) =>
        `Audit red at baseline, before upgrade; repo issue. See ${log}`,
      notRunReason: (log) =>
        `Audit could not run before upgrade (registry offline, or audit-ci not installed?); repo or environment issue. See ${log}`,
      exitCode: 0
    },
    installing: ({ packageName, target }) =>
      `Installing ${packageName}@${target}...`,
    installFailed: {
      demoteReason: '',
      reason: ({ packageName, target }) =>
        `npm install ${packageName}@${target} failed`
    },
    testing: 'Testing...',
    testsFailed: {
      line: 'ERROR: Tests failed — rolling back (manual code changes needed: spawn MANUAL_UPGRADE_IMPLEMENTOR)',
      demoteReason: '',
      reason: () =>
        'Install succeeded but tests fail — manual code changes required'
    },
    gateFailed: (_gate, reason) => ({
      line: `ERROR: ${reason} — rolling back`,
      demoteReason: '',
      reason: `${reason}; rolled back`,
      exitCode: 0
    }),
    alreadyAtTarget: ({ packageName, target }) =>
      `SUCCESS: ${packageName} already at ${target}`,
    commitRefused: (hookOutput, { target }) => ({
      demoteReason: '',
      reason: `Commit refused after upgrade to ${target} (pre-commit hook): ${hookOutput}`
    }),
    rollback: {
      verifyingLine: null,
      cascadeLine: '✗ CASCADE: rollback also failed',
      cascadeReason:
        'CASCADE: rollback failed after manual upgrade; manual intervention required',
      doneLine: '✓ Rollback OK'
    }
  }
}

/** Ends an upgrade early with the exit code it gives. */
class UpgradeEnded extends Error {
  constructor(exitCode) {
    super(`Upgrade ended with exit ${exitCode}`)
    this.exitCode = exitCode
  }
}

const textOf = (value) => {
  if (value === null || value === undefined) return 'null'
  return typeof value === 'string' ? value : JSON.stringify(value)
}

const fileSafe = (name) => name.replace(/[^A-Za-z0-9._-]/g, '_')

const requireUpgradeOptions = ({ runId, repo, packageName }) => {
  if (!runId) throw new TimError('USAGE', '--run-id required')
  if (!repo) throw new TimError('USAGE', '--repo required')
  if (!packageName) throw new TimError('USAGE', '--package required')
}

const packageRowOf = (path, packageName) => {
  if (!existsSync(path)) {
    throw new TimError('USAGE', `Packages file not found: ${path}`)
  }
  const row = (JSON.parse(readFileSync(path, 'utf8')).packages ?? []).find(
    (candidate) => candidate.package === packageName
  )
  if (!row) throw new TimError('USAGE', `Package ${packageName} not in ${path}`)
  return row
}

const checkoutOf = ({ workspaceRoot, repo, repoPath }) => {
  const path = repoPath || join(workspaceRoot, 'repos', repo)
  if (!isFolder(path)) throw new TimError('USAGE', `Repo not found: ${path}`)
  return realpathSync(path)
}

const rollbackFilesOf = async (commands, checkout) => {
  const tracked = await commands.git(checkout, [
    'ls-files',
    '--error-unmatch',
    AUDIT_CONFIG_FILE
  ])
  return [
    'package.json',
    'package-lock.json',
    ...(tracked.exitCode === 0 ? [AUDIT_CONFIG_FILE] : [])
  ]
}

const upgradeContextOf = async (request) => {
  const { workspaceRoot, runId, repo, packageName, mode } = request
  requireUpgradeOptions(request)
  const row = packageRowOf(
    packagesPath(runFolder(workspaceRoot, runId), repo),
    packageName
  )
  const checkout = checkoutOf(request)
  const commands = repoCommands({ env: request.env })
  const target = textOf(row.target)
  const logDir = join(runFolder(workspaceRoot, runId), repo, 'logs')
  mkdirSync(logDir, { recursive: true })
  const texts = MODES[mode]
  const logStem = `${fileSafe(packageName)}-${target}`
  return {
    ...request,
    texts,
    commands,
    checkout,
    current: textOf(row.current),
    target,
    classification: textOf(row.classification ?? null),
    skipsTests: repo === TESTS_REPO,
    hasAudit: existsSync(join(checkout, AUDIT_CONFIG_FILE)),
    rollbackFiles: await rollbackFilesOf(commands, checkout),
    packageSafe: fileSafe(packageName),
    baselineAuditLog: join(
      logDir,
      `baseline-audit${texts.logSuffix}.${logStem}.log`
    ),
    commitLog: join(logDir, `commit${texts.logSuffix}.${logStem}.log`),
    tmpLog: (name) =>
      join(request.tmpFolder, `${name}${texts.tmpLogSuffix}.log`),
    allowlisted: []
  }
}

const setStatus = (context, status, fields = {}) =>
  setPackageStatus({
    workspaceRoot: context.workspaceRoot,
    runId: context.runId,
    repo: context.repo,
    packageName: context.packageName,
    status,
    ...fields
  })

const demoteToManual = (context, reason) =>
  setPackageClassification({
    workspaceRoot: context.workspaceRoot,
    runId: context.runId,
    repo: context.repo,
    packageName: context.packageName,
    classification: 'manual',
    risk: 'MEDIUM',
    safeForAutomation: 'false',
    rationale: `Auto-demoted: ${reason}`,
    demotedFromAuto: 'true'
  })

const failWith = (context, { demoteReason = '', reason, exitCode = 0 }) => {
  if (demoteReason) demoteToManual(context, demoteReason)
  setStatus(context, 'failed', { failureReason: reason })
  throw new UpgradeEnded(exitCode)
}

const npmPasses = async (context, args, tmpLogName) => {
  const result = await context.commands.npmToLog(
    ['--prefix', context.checkout, ...args],
    { cwd: context.checkout, logPath: context.tmpLog(tmpLogName) }
  )
  return result.exitCode === 0
}

const reinstall = async ({ commands, checkout }) => {
  const result = await commands.npm(['--prefix', checkout, 'install'], {
    cwd: checkout
  })
  if (result.exitCode !== 0) {
    throw new StepFailed(result.exitCode, 'npm install')
  }
}

const forgetAllowlisted = (context) => {
  if (context.allowlisted.length === 0) return
  forgetAllowlistEntries({
    workspaceRoot: context.workspaceRoot,
    runId: context.runId,
    repo: context.repo,
    ghsas: context.allowlisted
  })
}

const rollBackAndFail = async (context, failure) => {
  const { commands, checkout, texts, say } = context
  await commands.mustGit(checkout, [
    'checkout',
    'HEAD',
    '--',
    ...context.rollbackFiles
  ])
  await reinstall(context)
  forgetAllowlisted(context)
  if (!context.skipsTests) {
    if (texts.rollback.verifyingLine) await say(texts.rollback.verifyingLine)
    if (!(await npmPasses(context, ['test'], 'rollback-verify'))) {
      await say(texts.rollback.cascadeLine)
      failWith(context, {
        reason: texts.rollback.cascadeReason,
        exitCode: CASCADE
      })
    }
  }
  await say(texts.rollback.doneLine)
  failWith(context, failure)
}

const sayHeader = async (context) => {
  const { say, texts } = context
  await say(RULE)
  await say(texts.header(context))
  if (context.skipsTests) await say(texts.testsRepoNote)
  await say(RULE)
}

const refuseDirtyTree = async (context) => {
  if (!(await hasTrackedChanges(context.commands, context.checkout))) return
  await context.warn(`ERROR: uncommitted changes in ${context.checkout}`)
  failWith(context, {
    reason: 'Pre-flight: repository had uncommitted changes',
    exitCode: 2
  })
}

const runBaselineTests = async (context) => {
  if (context.skipsTests) return
  const { say, texts } = context
  await say('Running baseline tests...')
  if (!(await npmPasses(context, ['test'], 'baseline'))) {
    await say(texts.baselineTestsFailed.line)
    failWith(context, { reason: texts.baselineTestsFailed.reason })
  }
  await say('✓ Baseline pass')
}

const runBaselineAudit = async (context) => {
  if (!context.hasAudit) return
  const { say, texts, baselineAuditLog } = context
  await say('Running baseline audit...')
  const { exitCode } = await auditBaselineToLog(
    {
      workspaceRoot: context.workspaceRoot,
      runId: context.runId,
      repo: context.repo,
      repoPath: context.checkout,
      label: `before-${context.packageSafe}-${context.target}`
    },
    { logPath: baselineAuditLog }
  )
  if (exitCode === 1) {
    await say(texts.baselineAudit.redLine)
    failWith(context, {
      reason: texts.baselineAudit.redReason(baselineAuditLog),
      exitCode: texts.baselineAudit.exitCode
    })
  }
  if (exitCode !== 0) {
    await say('ERROR: Baseline audit could not run (repo or environment issue)')
    failWith(context, {
      reason: texts.baselineAudit.notRunReason(baselineAuditLog),
      exitCode: texts.baselineAudit.exitCode
    })
  }
  await say('✓ Baseline audit green')
}

const installTarget = async (context) => {
  const { say, texts, packageName, target } = context
  await say(texts.installing(context))
  if (
    !(await npmPasses(
      context,
      ['install', `${packageName}@${target}`],
      'install'
    ))
  ) {
    await say('ERROR: npm install failed')
    failWith(context, {
      demoteReason: texts.installFailed.demoteReason,
      reason: texts.installFailed.reason(context)
    })
  }
  await say('✓ Installed')
}

const testUpgrade = async (context) => {
  if (context.skipsTests) return
  const { say, texts } = context
  await say(texts.testing)
  if (!(await npmPasses(context, ['test'], 'upgrade'))) {
    await say(texts.testsFailed.line)
    await rollBackAndFail(context, {
      demoteReason: texts.testsFailed.demoteReason,
      reason: texts.testsFailed.reason(context)
    })
  }
  await say('✓ Tests pass')
}

const gateOf = async (context) => {
  const { packageName, target } = context
  const result = await runUpgradeGate({
    workspaceRoot: context.workspaceRoot,
    runId: context.runId,
    repo: context.repo,
    packageName,
    target,
    allowlistOwner: context.allowlistOwner,
    expiryDays: context.expiryDays,
    repoPath: context.checkout,
    warn: (line) => context.warn(line)
  }).catch(async (error) => {
    await context.warn(error.message)
    return { status: 'not_run', reason: null, allowlisted: [] }
  })
  return {
    status: result.status,
    reason:
      result.reason ??
      `audit could not run after upgrading ${packageName} to ${target}`,
    allowlisted: result.allowlisted
  }
}

const auditUpgrade = async (context) => {
  if (!context.hasAudit) return
  const { say, texts } = context
  await say('Auditing upgraded tree...')
  const gate = await gateOf(context)
  context.allowlisted = gate.allowlisted
  if (GATE_EXIT_CODES[gate.status] !== 0) {
    const failure = texts.gateFailed(gate.status, gate.reason)
    await say(failure.line)
    await rollBackAndFail(context, failure)
  }
  await say(
    context.allowlisted.length > 0
      ? `✓ Audit green after allowlisting ${context.allowlisted.join(' ')} (no fixed version)`
      : '✓ Audit green'
  )
}

const commitMessageOf = ({
  packageName,
  current,
  target,
  allowlisted,
  trailers
}) => {
  const subject = `Upgrade ${packageName} ${current} → ${target}`
  const message =
    allowlisted.length > 0
      ? `${subject}\n\nAllowlist ${allowlisted.join(' ')} in ${AUDIT_CONFIG_FILE}: no fixed version yet.`
      : subject
  return withTrailers(message, trailers)
}

const hookOutputOf = (commitLog) =>
  `${lastLinesOf(readFileSync(commitLog, 'utf8'), 5).replaceAll('\n', ' ')}(full output: ${commitLog})`

const commitUpgrade = async (context) => {
  const { commands, checkout, say, texts } = context
  await commands.mustGit(checkout, ['add', 'package.json', 'package-lock.json'])
  if (context.allowlisted.length > 0) {
    await commands.git(checkout, ['add', AUDIT_CONFIG_FILE])
  }
  const staged = await commands.git(checkout, ['diff', '--cached', '--quiet'])
  if (staged.exitCode === 0) {
    await say('⚠ No changes — package already at target version')
    setStatus(context, 'done', { commitSha: '' })
    await say(texts.alreadyAtTarget(context))
    return
  }
  const commit = await commands.gitToLog(
    checkout,
    ['commit', '-m', commitMessageOf(context)],
    { logPath: context.commitLog }
  )
  if (commit.exitCode !== 0) {
    await say('ERROR: commit refused — rolling back')
    await rollBackAndFail(
      context,
      texts.commitRefused(hookOutputOf(context.commitLog), context)
    )
  }
  const sha = (
    await commands.mustGit(checkout, ['rev-parse', '--short', 'HEAD'])
  ).stdout
  await say(`✓ Committed: ${sha}`)
  setStatus(context, 'done', { commitSha: sha })
  await say(RULE)
  await say(
    `SUCCESS: ${context.packageName} ${context.current} → ${context.target} (${sha})`
  )
  await say(RULE)
}

const upgradeSteps = async (context) => {
  await sayHeader(context)
  setStatus(context, 'inprogress')
  if (context.texts.checksCleanTree) await refuseDirtyTree(context)
  if (context.texts.reportsNvm) await context.say('✓ nvm use OK')
  await runBaselineTests(context)
  await runBaselineAudit(context)
  await installTarget(context)
  await testUpgrade(context)
  await auditUpgrade(context)
  await commitUpgrade(context)
}

/**
 * Upgrades one package of an npm upgrade run in its repo: baseline tests
 * and audit, install, tests, the audit gate, then a commit. A failure
 * after the install restores package.json, package-lock.json and
 * audit-ci.jsonc from HEAD. The automatic mode demotes a failed package
 * to manual; the manual mode only marks it failed.
 *
 * @param {object} request
 * @param {'auto' | 'manual'} request.mode
 * @param {string} request.workspaceRoot
 * @param {string} request.runId
 * @param {string} request.repo
 * @param {string} request.packageName
 * @param {string} [request.allowlistOwner]
 * @param {string} [request.expiryDays]
 * @param {string} [request.repoPath] - Upgrade this checkout instead of `repos/<repo>`
 * @param {string} [request.tmpFolder='/tmp'] - Where the npm test and install logs go
 * @param {Record<string, string | undefined>} [request.env]
 * @param {(line: string) => Promise<void>} request.say - Writes a progress line to stdout
 * @param {(line: string) => Promise<void>} request.warn - Writes a line to stderr
 * @param {string[]} [request.trailers=[]] - Lines for the end of the commit message
 * @returns {Promise<number>} 0 done or a controlled failure, 1 a cascade, 2 a dirty tree (manual), 3 an audit red or not run before the install (auto) or after it, a step's own exit code when git or the reinstall fails
 * @throws {TimError} USAGE for a missing option, packages file, package or repo
 */
export const upgradePackage = async ({
  tmpFolder = '/tmp',
  trailers = [],
  ...request
}) => {
  const context = await upgradeContextOf({ ...request, tmpFolder, trailers })
  try {
    await upgradeSteps(context)
    return 0
  } catch (error) {
    if (error instanceof UpgradeEnded || error instanceof StepFailed) {
      return error.exitCode
    }
    throw error
  }
}
