import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../errors.js'
import { withTrailers } from '../git/commit-message.js'
import { AUDIT_CONFIG_FILE, jqText } from './audit-rules.js'
import { auditBaselineToLog } from './audit-to-log.js'
import {
  hasTrackedChanges,
  lastLinesOf,
  repoCommands
} from './repo-commands.js'
import { isFolder, runFolder } from './state.js'

const TESTS_REPO = 'trade-imports-ins-tests'
const AUDIT_COULD_NOT_RUN = 2
const EVIDENCE_LINES = 15
const EVIDENCE_WIDTH = 200
const SEVERITY_RANK = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 }
const NO_THRESHOLD = 99

export const RESET_USAGE =
  'Usage: tim npm reset-overrides --run-id TICKET --repo REPO [--repo-path PATH]'

/** The reset stopped for the reason it gives, leaving the worktree. */
class ResetStopped extends Error {
  constructor(reason) {
    super(reason)
    this.reason = reason
  }
}

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const leafPathsOf = (value, prefix = []) =>
  Object.entries(value).flatMap(([key, child]) =>
    isPlainObject(child) || Array.isArray(child)
      ? leafPathsOf(child, [...prefix, key])
      : [{ keyPath: [...prefix, key], value: child }]
  )

const overrideRowsOf = (packageJson) =>
  leafPathsOf(packageJson.overrides ?? {}).map(({ keyPath, value }) => ({
    path: keyPath.join('/'),
    key_path: keyPath,
    value,
    status: 'pending',
    reason: null,
    evidence: null
  }))

const pinnedPackageOf = ({ key_path: keyPath }) =>
  keyPath.at(-1) === '.' ? keyPath.at(-2) : keyPath.at(-1)

const setAtPath = (target, keyPath, value) => {
  const [key, ...rest] = keyPath
  if (rest.length === 0) return { ...target, [key]: value }
  const child = isPlainObject(target[key]) ? target[key] : {}
  return { ...target, [key]: setAtPath(child, rest, value) }
}

const packageJsonKeeping = (original, keep) => {
  if (keep.length === 0) {
    const { overrides: _removed, ...rest } = original
    return rest
  }
  return {
    ...original,
    overrides: keep.reduce(
      (overrides, row) => setAtPath(overrides, row.key_path, row.value),
      {}
    )
  }
}

const isKept = (keep, row) => keep.some((kept) => kept.path === row.path)

const keepingText = (keep) =>
  keep.length === 0 ? 'no overrides' : keep.map((row) => row.path).join(', ')

const hasScript = (packageJson, script) => packageJson.scripts?.[script] != null

const reachedPackages = (vulnerabilities, seen) => {
  const next = [
    ...new Set(seen.flatMap((name) => vulnerabilities[name]?.effects ?? []))
  ]
  const added = next.filter((name) => !seen.includes(name))
  return added.length === 0
    ? seen
    : reachedPackages(vulnerabilities, [...new Set([...seen, ...added])])
}

const failingAdvisoriesOf = (summary) => {
  const report = JSON.parse(readFileSync(summary.snapshot, 'utf8'))
  const vulnerabilities = report.vulnerabilities ?? {}
  return summary.advisories
    .filter((advisory) => summary.failing.includes(advisory.ghsa))
    .map((advisory) => ({
      ...advisory,
      affected: reachedPackages(vulnerabilities, [advisory.package])
    }))
}

const excerptOf = (log) =>
  lastLinesOf(readFileSync(log, 'utf8'), EVIDENCE_LINES)
    .split('\n')
    .map((line) => [...line].slice(0, EVIDENCE_WIDTH).join(''))
    .join('\n')
    .replace(/\n+$/, '')

const auditKeepsFor = (advisories, rows, keep, evidence) => {
  const candidates = advisories.flatMap((advisory) =>
    rows
      .filter((row) => !isKept(keep, row))
      .filter((row) => advisory.affected.includes(pinnedPackageOf(row)))
      .map((row) => {
        const pinned = pinnedPackageOf(row)
        const isDirect = pinned === advisory.package
        return {
          ...row,
          kept_for: isDirect ? 'audit-direct' : 'audit-path',
          reason:
            `${advisory.ghsa} (${advisory.package}, ${advisory.severity}) fails the audit without it` +
            (isDirect
              ? ''
              : `; this override pins ${pinned}, which depends on it`),
          evidence
        }
      })
  )
  const paths = [...new Set(candidates.map((row) => row.path))].sort()
  return paths.map((path) => {
    const group = candidates.filter((row) => row.path === path)
    return {
      ...group[0],
      kept_for: group.some((row) => row.kept_for === 'audit-direct')
        ? 'audit-direct'
        : 'audit-path',
      reason: [...new Set(group.map((row) => row.reason))].sort().join(' / ')
    }
  })
}

const unreachedAdvisoriesOf = (advisories, rows, keep) =>
  advisories
    .filter(
      (advisory) =>
        !rows.some(
          (row) =>
            !isKept(keep, row) &&
            advisory.affected.includes(pinnedPackageOf(row))
        )
    )
    .map((advisory) => advisory.ghsa)
    .join(', ')

const thresholdOf = (config) =>
  Math.min(
    NO_THRESHOLD,
    ...['low', 'moderate', 'high', 'critical']
      .filter((level) => config[level] === true)
      .map((level) => SEVERITY_RANK[level])
  )

const rankOf = (severity) => SEVERITY_RANK[severity] ?? 0

const belowThresholdOf = (snapshot, threshold) => {
  const report = JSON.parse(readFileSync(snapshot, 'utf8'))
  const rows = Object.values(report.vulnerabilities ?? {}).flatMap(
    (vulnerability) =>
      vulnerability.via.filter(isPlainObject).map((via) => ({
        ghsa: via.url.split('/').at(-1),
        package: via.name,
        severity: via.severity,
        title: via.title
      }))
  )
  const ghsas = [...new Set(rows.map((row) => row.ghsa))].sort()
  return ghsas
    .map((ghsa) => {
      const group = rows.filter((row) => row.ghsa === ghsa)
      const rank = Math.max(...group.map((row) => rankOf(row.severity)))
      return {
        ghsa,
        package: group[0].package,
        severity: group.findLast((row) => rankOf(row.severity) === rank)
          .severity,
        rank,
        title: group[0].title
      }
    })
    .filter((row) => row.rank < threshold)
    .map(({ ghsa, package: name, severity, title }) => ({
      ghsa,
      package: name,
      severity,
      title
    }))
}

const resultOf = (
  context,
  status,
  { commit = '', reason = '', below = [] } = {}
) => {
  const rows = context.readRows()
  return {
    repo: context.repo,
    status,
    commit: commit === '' ? null : commit,
    kept: rows
      .filter((row) => row.status === 'kept')
      .map(({ path, value, kept_for: keptFor, reason: why }) => ({
        path,
        value,
        kept_for: keptFor,
        reason: why
      })),
    removed: rows
      .filter((row) => row.status === 'removed')
      .map((row) => row.path),
    below_threshold: below,
    reason: reason === '' ? null : reason,
    worktree: status === 'stopped' ? context.worktree : null
  }
}

const trialContextOf = (context) => {
  const trial = {
    number: 0,
    failedCheck: '',
    log: '',
    failing: [],
    snapshot: ''
  }

  const npmStep = async (title, args) => {
    appendFileSync(trial.log, `== ${title}\n`)
    const result = await context.commands.npmToLog(args, {
      cwd: context.worktree,
      logPath: trial.log,
      append: true
    })
    if (result.exitCode !== 0) trial.failedCheck = title
    return result.exitCode === 0
  }

  const auditStep = async () => {
    if (!existsSync(join(context.worktree, AUDIT_CONFIG_FILE))) return true
    appendFileSync(trial.log, '== tim npm audit baseline\n')
    const { exitCode, summary } = await auditBaselineToLog(
      {
        workspaceRoot: context.workspaceRoot,
        runId: context.runId,
        repo: context.repo,
        repoPath: context.worktree,
        label: `override-trial-${trial.number}`
      },
      { logPath: trial.log, append: true }
    )
    if (exitCode === AUDIT_COULD_NOT_RUN) {
      appendFileSync(trial.log, '\n')
      trial.failedCheck = 'audit (could not run)'
      throw new ResetStopped(
        `the audit could not run in trial ${trial.number} (registry offline, or audit-ci not installed?); see ${trial.log}, then run again`
      )
    }
    trial.snapshot = summary.snapshot
    trial.failing = failingAdvisoriesOf(summary)
    if (trial.failing.length === 0) return true
    trial.failedCheck = 'audit'
    return false
  }

  const scriptChecks = async () => {
    for (const check of ['build:frontend', 'test', 'lint']) {
      const skipped =
        (check === 'test' && context.repo === TESTS_REPO) ||
        !hasScript(context.original, check)
      if (!skipped && !(await npmStep(`npm run ${check}`, ['run', check]))) {
        return false
      }
    }
    return true
  }

  const run = async (keep) => {
    trial.number += 1
    trial.log = join(context.logFolder, `trial-${trial.number}.log`)
    trial.failing = []
    trial.failedCheck = ''
    writeFileSync(trial.log, '')
    await context.warn(`Trial ${trial.number}: keeping ${keepingText(keep)}`)
    writeFileSync(
      join(context.worktree, 'package.json'),
      jqText(packageJsonKeeping(context.original, keep))
    )
    return (
      (await npmStep('npm install', ['install'])) &&
      (await npmStep('npm update', ['update'])) &&
      (await auditStep()) &&
      (await scriptChecks())
    )
  }

  return { trial, run }
}

const putBackForAdvisories = async (context, trials, kept, round = 1) => {
  const { trial, run } = trials
  if (trial.failedCheck !== 'audit') return { kept, passed: false }
  if (round > context.rows.length) {
    throw new ResetStopped(
      'audit still red after putting back every override that reaches a failing advisory'
    )
  }
  const evidence = excerptOf(trial.log)
  const unreached = unreachedAdvisoriesOf(trial.failing, context.rows, kept)
  if (unreached) {
    throw new ResetStopped(
      `audit red on ${unreached} with no override left that reaches it; fix or allowlist it, then run again`
    )
  }
  const extended = [
    ...kept,
    ...auditKeepsFor(trial.failing, context.rows, kept, evidence)
  ]
  if (await run(extended)) return { kept: extended, passed: true }
  return putBackForAdvisories(context, trials, extended, round + 1)
}

const putBackForChecks = async (context, trials, kept) => {
  const { trial, run } = trials
  if (trial.failedCheck === 'audit') {
    throw new ResetStopped(
      `audit went red while putting overrides back for a failing check; see ${trial.log}`
    )
  }
  const { failedCheck } = trial
  const evidence = excerptOf(trial.log)
  const next = context.rows.find((row) => !isKept(kept, row))
  if (!next) {
    throw new ResetStopped(
      `${failedCheck} still fails with every override back; not an override problem (see ${trial.log})`
    )
  }
  const extended = [
    ...kept,
    {
      ...next,
      kept_for: 'check',
      reason: `${failedCheck} fails without it`,
      evidence
    }
  ]
  return (await run(extended))
    ? extended
    : putBackForChecks(context, trials, extended)
}

const minimise = async (trials, keep) => {
  const { trial, run } = trials
  const lastForCheck =
    keep.filter((row) => row.kept_for === 'check').at(-1)?.path ?? ''
  const retried = keep
    .filter(
      (row) =>
        (row.kept_for === 'audit-path' || row.kept_for === 'check') &&
        row.path !== lastForCheck
    )
    .reverse()
    .map((row) => row.path)
  let kept = keep
  let worktreeOnKept = true
  for (const path of retried) {
    const without = kept.filter((row) => row.path !== path)
    worktreeOnKept = await run(without)
    if (worktreeOnKept) kept = without
  }
  if (!worktreeOnKept && !(await run(kept))) {
    throw new ResetStopped(
      `the final set of overrides no longer passes (${trial.failedCheck}); see ${trial.log}`
    )
  }
  return kept
}

const findKeptOverrides = async (context, trials) => {
  const firstPassed = await trials.run([])
  if (firstPassed) return []
  const afterAudit = await putBackForAdvisories(context, trials, [])
  const kept = afterAudit.passed
    ? afterAudit.kept
    : await putBackForChecks(context, trials, afterAudit.kept)
  return minimise(trials, kept)
}

const recordDecisions = (context, keep) =>
  context.writeRows(
    context.readRows().map((row) => {
      const kept = keep.find((candidate) => candidate.path === row.path)
      return kept
        ? {
            ...row,
            status: 'kept',
            reason: kept.reason,
            evidence: kept.evidence,
            kept_for: kept.kept_for
          }
        : { ...row, status: 'removed' }
    })
  )

const belowThresholdInFinalTree = (context, trial) => {
  const configPath = join(context.worktree, AUDIT_CONFIG_FILE)
  if (!existsSync(configPath)) return []
  const snapshot = join(
    context.stateFolder,
    `audit.${context.repo}.override-trial-${trial.number}.json`
  )
  if (!existsSync(snapshot)) return []
  return belowThresholdOf(
    snapshot,
    thresholdOf(JSON.parse(readFileSync(configPath, 'utf8')))
  )
}

const keptTableOf = (rows) => {
  const kept = rows.filter((row) => row.status === 'kept')
  if (kept.length === 0) return 'No override is still needed.'
  return [
    'Kept overrides:',
    '',
    '| Override | Value | Reason |',
    '|---|---|---|',
    ...kept.map(
      (row) => `| ${row.path} | ${row.value} | ${row.reason ?? 'kept'} |`
    )
  ].join('\n')
}

const removedListOf = (rows) => {
  const removed = rows
    .filter((row) => row.status === 'removed')
    .map((row) => row.path)
  return removed.length === 0 ? 'none' : removed.join(', ')
}

const restoreRepo = async ({ commands, checkout }) => {
  await commands.mustGit(checkout, [
    'checkout',
    'HEAD',
    '--',
    'package.json',
    'package-lock.json'
  ])
  await commands.npm(['install'], { cwd: checkout })
}

const removeWorktree = ({ commands, checkout, worktree }) =>
  commands.git(checkout, ['worktree', 'remove', '--force', worktree])

const copyBackAndCommit = async (context, below) => {
  const { commands, checkout, worktree, logFolder } = context
  copyFileSync(join(worktree, 'package.json'), join(checkout, 'package.json'))
  copyFileSync(
    join(worktree, 'package-lock.json'),
    join(checkout, 'package-lock.json')
  )
  const diff = await commands.git(checkout, [
    'diff',
    '--quiet',
    '--',
    'package.json',
    'package-lock.json'
  ])
  if (diff.exitCode === 0) {
    await removeWorktree(context)
    return resultOf(context, 'unchanged', { below })
  }
  const installLog = join(logFolder, 'copy-back-install.log')
  const install = await commands.npmToLog(['install'], {
    cwd: checkout,
    logPath: installLog
  })
  if (install.exitCode !== 0) {
    await restoreRepo(context)
    throw new ResetStopped(
      `npm install in the repo failed after copying the trial back; see ${installLog}`
    )
  }
  const rows = context.readRows()
  await commands.mustGit(checkout, ['add', 'package.json', 'package-lock.json'])
  const commitLog = join(logFolder, 'commit.log')
  const commit = await commands.gitToLog(
    checkout,
    [
      'commit',
      '-m',
      withTrailers(
        `Remove overrides\n\nRemoved: ${removedListOf(rows)}\n\n${keptTableOf(rows)}`,
        context.trailers
      )
    ],
    { logPath: commitLog }
  )
  if (commit.exitCode !== 0) {
    await restoreRepo(context)
    throw new ResetStopped(`commit refused (pre-commit hook); see ${commitLog}`)
  }
  await removeWorktree(context)
  const sha = (
    await commands.mustGit(checkout, ['rev-parse', '--short', 'HEAD'])
  ).stdout
  return resultOf(context, 'committed', { commit: sha, below })
}

const addWorktree = async (context) => {
  const { commands, checkout, worktree, logFolder } = context
  if (existsSync(worktree)) {
    await commands.git(checkout, ['worktree', 'remove', '--force', worktree])
  }
  await commands.git(checkout, ['worktree', 'prune'])
  const worktreeLog = join(logFolder, 'worktree.log')
  const added = await commands.gitToLog(
    checkout,
    ['worktree', 'add', '--detach', worktree, 'HEAD'],
    { logPath: worktreeLog }
  )
  if (added.exitCode !== 0) {
    throw new TimError(
      'USAGE',
      `Could not create the trial worktree at ${worktree}; see ${worktreeLog}`
    )
  }
  return realpathSync(worktree)
}

const markUndecided = (context) =>
  context.writeRows(
    context
      .readRows()
      .map((row) =>
        row.status === 'pending' ? { ...row, status: 'undecided' } : row
      )
  )

const resetContextOf = async ({
  workspaceRoot,
  runId,
  repo,
  repoPath,
  env,
  warn,
  trailers = []
}) => {
  if (!runId || !repo) throw new TimError('USAGE', RESET_USAGE)
  const path = repoPath || join(workspaceRoot, 'repos', repo)
  if (!isFolder(path)) throw new TimError('USAGE', `Repo not found: ${path}`)
  const checkout = realpathSync(path)
  const stateFolder = join(runFolder(workspaceRoot, runId), repo)
  const logFolder = join(stateFolder, 'override-trial-logs')
  mkdirSync(logFolder, { recursive: true })
  const commands = repoCommands({ env })
  if (await hasTrackedChanges(commands, checkout)) {
    throw new TimError(
      'USAGE',
      `Uncommitted changes in ${checkout}. Commit or stash first.`
    )
  }
  const stateFile = join(stateFolder, `overrides.${repo}.json`)
  const original = JSON.parse(
    (await commands.mustGit(checkout, ['show', 'HEAD:package.json'])).stdout
  )
  return {
    workspaceRoot,
    runId,
    repo,
    checkout,
    stateFolder,
    logFolder,
    commands,
    warn,
    trailers,
    original,
    worktree: join(stateFolder, 'override-trial'),
    readRows: () => JSON.parse(readFileSync(stateFile, 'utf8')),
    writeRows: (rows) => writeFileSync(stateFile, jqText(rows))
  }
}

/**
 * Phase 4 for one repo: removes every npm override, then puts back only
 * the ones a failing audit, test, lint or build proves are still needed.
 * Every trial runs in a throwaway git worktree under the run's repo
 * folder; the result is copied back and committed as "Remove overrides".
 * The decisions go to `overrides.<repo>.json` in that folder.
 *
 * @param {object} request
 * @param {string} request.workspaceRoot
 * @param {string} request.runId
 * @param {string} request.repo
 * @param {string} [request.repoPath] - Reset this checkout instead of `repos/<repo>`
 * @param {Record<string, string | undefined>} [request.env]
 * @param {(line: string) => Promise<void>} request.warn - Writes a progress line to stderr
 * @param {string[]} [request.trailers=[]] - Lines for the end of the commit message
 * @returns {Promise<{exitCode: number, result: object}>} exitCode 0 committed, no overrides or unchanged, 1 stopped (the worktree stays for inspection)
 * @throws {TimError} USAGE for a missing option or repo, a repo with uncommitted changes, or a worktree git cannot add
 * @throws {StepFailed} when a git step that has to work fails
 */
export const resetOverrides = async (request) => {
  const context = await resetContextOf(request)
  const rows = overrideRowsOf(context.original)
  context.writeRows(rows)
  if (rows.length === 0) {
    return { exitCode: 0, result: resultOf(context, 'no_overrides') }
  }
  context.worktree = await addWorktree(context)
  const trials = trialContextOf({ ...context, rows })
  try {
    const keep = await findKeptOverrides({ ...context, rows }, trials)
    recordDecisions(context, keep)
    const below = belowThresholdInFinalTree(context, trials.trial)
    return { exitCode: 0, result: await copyBackAndCommit(context, below) }
  } catch (error) {
    if (!(error instanceof ResetStopped)) throw error
    markUndecided(context)
    return {
      exitCode: 1,
      result: resultOf(context, 'stopped', { reason: error.reason })
    }
  }
}
