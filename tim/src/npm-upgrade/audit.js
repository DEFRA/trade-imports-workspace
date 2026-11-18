import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../errors.js'
import { run } from '../exec/exec.js'
import {
  AUDIT_CONFIG_FILE,
  BLOCKED_MARKER,
  advisoriesOf,
  allowlistNotesOf,
  allowlistOf,
  baselineExitCodeOf,
  checkFixes,
  classifyAudit,
  isGhsaId,
  jqText,
  summariseAudit,
  thresholdOf,
  utcDayAfterDays,
  utcDayAfterMonths,
  utcDayOf,
  utcStampOf,
  withAllowlistEntry,
  withAllowlistRecord,
  withoutAllowlistRecords
} from './audit-rules.js'
import { isFolder, runFolder } from './state.js'

const BASELINE_USAGE =
  'Usage: tim npm audit baseline --run-id TICKET --repo REPO [--label LABEL] [--repo-path PATH]'
const ALLOW_USAGE =
  'Usage: tim npm audit allow --run-id TICKET --repo REPO --ghsa GHSA-xxxx-xxxx-xxxx --reason "..." --owner "Name" --expiry-days N [--blocked-by "parent pins the vulnerable range"] [--stage N] [--repo-path PATH]'
const FORGET_USAGE =
  'Usage: tim npm audit forget --run-id TICKET --repo REPO --ghsa GHSA [--ghsa GHSA ...]'

/**
 * @param {string} workspaceRoot
 * @param {string} runId
 * @param {string} repo
 * @returns {string} The folder a run keeps one repo's audit state in
 */
export const auditStateFolder = (workspaceRoot, runId, repo) =>
  join(runFolder(workspaceRoot, runId), repo)

/**
 * The repo checkout with every symlink resolved: `repoPath` when given,
 * else `repos/<repo>`.
 *
 * @param {{workspaceRoot: string, repo: string, repoPath?: string}} target
 * @returns {string}
 * @throws {TimError} USAGE when the checkout is not a folder
 */
export const resolveRepoCheckout = ({ workspaceRoot, repo, repoPath }) => {
  const path = repoPath || join(workspaceRoot, 'repos', repo)
  if (!isFolder(path)) throw new TimError('USAGE', `Repo not found: ${path}`)
  return realpathSync(path)
}

const readAuditConfig = (checkout) => {
  const path = join(checkout, AUDIT_CONFIG_FILE)
  if (!existsSync(path)) {
    throw new TimError(
      'USAGE',
      `No ${AUDIT_CONFIG_FILE} in ${checkout}. Adopt audit-ci first.`
    )
  }
  const unreadable = new TimError(
    'USAGE',
    `${path} is not comment-free JSON with an allowlist array. Remove any comments so jq can read it.`
  )
  try {
    const config = JSON.parse(readFileSync(path, 'utf8'))
    if (!Array.isArray(config?.allowlist)) throw unreadable
    return { path, config }
  } catch {
    throw unreadable
  }
}

const parsedReportOf = (text) => {
  try {
    const report = JSON.parse(text)
    const { vulnerabilities } = report ?? {}
    const isReport =
      typeof vulnerabilities === 'object' &&
      vulnerabilities !== null &&
      !Array.isArray(vulnerabilities)
    return isReport ? report : null
  } catch {
    return null
  }
}

const readLockfile = (checkout) => {
  const path = join(checkout, 'package-lock.json')
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {}
}

const registryReader =
  ({ checkout, runCommand, warn }) =>
  async (packageName) => {
    const result = await runCommand(
      'npm',
      ['view', packageName, 'versions', '--json'],
      { cwd: checkout }
    )
    if (result.exitCode !== 0) {
      if (result.stderr) warn(result.stderr)
      throw new Error(`npm view ${packageName} failed`)
    }
    const versions = JSON.parse(result.stdout)
    return Array.isArray(versions) ? versions : [versions]
  }

const checkFixesInRegistry = async (advisories, context, failureMessage) => {
  try {
    return await checkFixes(advisories, {
      lock: readLockfile(context.checkout),
      publishedVersionsOf: registryReader(context)
    })
  } catch (error) {
    throw new TimError('NETWORK', failureMessage, error)
  }
}

const firstLinesOf = (text, count) =>
  text.split('\n').slice(0, count).join('\n').replace(/\n$/, '')

const noReportError = ({ repo, exitCode, errorLog, stderr }) =>
  new TimError(
    'NETWORK',
    [
      `audit-ci did not produce an npm audit report for ${repo} (exit ${exitCode}).`,
      `Is audit-ci installed (npm ci) and the registry reachable? stderr: ${errorLog}`,
      ...(stderr ? [firstLinesOf(stderr, 20)] : [])
    ].join('\n')
  )

const runAuditCi = (checkout, runCommand) =>
  runCommand(
    'npx',
    [
      '--no-install',
      'audit-ci',
      '--config',
      AUDIT_CONFIG_FILE,
      '--report-type',
      'full',
      '--output-format',
      'json'
    ],
    { cwd: checkout, stripFinalNewline: false }
  )

const fileSafeLabelOf = (label) => label.replace(/[^A-Za-z0-9._-]/g, '_')

const ignoreLine = () => undefined

/**
 * Runs the repo's audit-ci check (`npx --no-install audit-ci` with its
 * audit-ci.jsonc), saves the npm audit report, its stderr and a summary
 * under the run's state folder, and asks the registry whether each
 * advisory at the threshold has a fixed version.
 *
 * @param {object} request
 * @param {string} request.workspaceRoot
 * @param {string} request.runId
 * @param {string} request.repo
 * @param {string} [request.label='baseline'] - Names the saved files; anything outside `[A-Za-z0-9._-]` becomes `_`
 * @param {string} [request.repoPath] - Audit this checkout instead of `repos/<repo>`
 * @param {Date} [request.now]
 * @param {typeof run} [request.runCommand]
 * @param {(line: string) => void} [request.warn]
 * @returns {Promise<object>} The summary, from `summariseAudit`
 * @throws {TimError} USAGE for a missing option, repo or config; NETWORK when audit-ci gives no report or the registry cannot be asked
 */
export const runAuditBaseline = async ({
  workspaceRoot,
  runId,
  repo,
  label = 'baseline',
  repoPath,
  now = new Date(),
  runCommand = run,
  warn = ignoreLine
}) => {
  const safeLabel = fileSafeLabelOf(label ?? '')
  if (!runId || !repo || !safeLabel) throw new TimError('USAGE', BASELINE_USAGE)
  const checkout = resolveRepoCheckout({ workspaceRoot, repo, repoPath })
  const { config } = readAuditConfig(checkout)
  const stateFolder = auditStateFolder(workspaceRoot, runId, repo)
  mkdirSync(stateFolder, { recursive: true })
  const fileStem = join(stateFolder, `audit.${repo}.${safeLabel}`)
  const snapshot = `${fileStem}.json`
  const errorLog = `${fileStem}.stderr.log`

  const auditCi = await runAuditCi(checkout, runCommand)
  writeFileSync(snapshot, auditCi.stdout)
  writeFileSync(errorLog, auditCi.stderr)
  const report = parsedReportOf(auditCi.stdout)
  if (!report) {
    throw noReportError({
      repo,
      exitCode: auditCi.exitCode,
      errorLog,
      stderr: auditCi.stderr
    })
  }

  const allowlist = allowlistOf(config, utcDayOf(now))
  const classified = classifyAudit({
    advisories: advisoriesOf(report),
    allowlist,
    threshold: thresholdOf(config)
  })
  const toCheck = classified.advisories.map(
    ({ ghsa, package: name, ranges }) => ({
      ghsa,
      package: name,
      ranges
    })
  )
  const fixRows =
    toCheck.length === 0
      ? []
      : await checkFixesInRegistry(
          toCheck,
          { checkout, runCommand, warn },
          'Could not check the registry for fixed versions (npm view failed).'
        )
  const summary = summariseAudit({
    repo,
    label: safeLabel,
    green: auditCi.exitCode === 0,
    classified,
    fixRows,
    allowlist,
    snapshot
  })
  writeFileSync(`${fileStem}.summary.json`, jqText(summary))

  const failingCount = summary.failing.length
  if ((auditCi.exitCode === 0) !== (failingCount === 0)) {
    warn(
      `Warning: audit-ci exit ${auditCi.exitCode} disagrees with ${failingCount} failing advisories found here. Check ${errorLog}.`
    )
  }
  return summary
}

const ALLOW_REQUIRED = [
  ['run-id', 'runId'],
  ['repo', 'repo'],
  ['ghsa', 'ghsa'],
  ['reason', 'reason'],
  ['owner', 'owner'],
  ['expiry-days', 'expiryDays']
]

const checkAllowOptions = (request) => {
  const missing = ALLOW_REQUIRED.find(([, key]) => !request[key])
  if (missing) {
    throw new TimError('USAGE', `Missing --${missing[0]}\n${ALLOW_USAGE}`)
  }
  const { ghsa, expiryDays, stage = '', reason } = request
  if (!isGhsaId(ghsa)) {
    throw new TimError(
      'USAGE',
      `--ghsa must look like GHSA-xxxx-xxxx-xxxx (lower case): ${ghsa}`
    )
  }
  if (!/^[1-9][0-9]*$/.test(expiryDays)) {
    throw new TimError(
      'USAGE',
      '--expiry-days must be a whole number of days, 1 or more'
    )
  }
  if (stage && !/^[0-9]+$/.test(stage)) {
    throw new TimError('USAGE', '--stage must be a number')
  }
  if (reason.includes('Owner:') || reason.includes(BLOCKED_MARKER)) {
    throw new TimError(
      'USAGE',
      `--reason must not contain 'Owner:' or '${BLOCKED_MARKER}'. Pass them as --owner and --blocked-by.`
    )
  }
}

const checkExpiryWithinThreeMonths = (now, expiryDays) => {
  const expiry = utcDayAfterDays(now, Number(expiryDays))
  const limit = utcDayAfterMonths(now, 3)
  if (expiry > limit) {
    throw new TimError(
      'REFUSED',
      `Refusing: expiry ${expiry} is more than 3 months away (latest allowed ${limit}). Use a smaller --expiry-days.`
    )
  }
  return expiry
}

const reportedAdvisory = async ({ checkout, repo, ghsa, runCommand }) => {
  const audit = await runCommand('npm', ['audit', '--json'], { cwd: checkout })
  const report = parsedReportOf(audit.stdout)
  if (!report) {
    throw new TimError(
      'NETWORK',
      `npm audit did not produce a report in ${checkout}. Is the registry reachable?`
    )
  }
  const advisory = advisoriesOf(report).find((row) => row.ghsa === ghsa)
  if (!advisory) {
    throw new TimError(
      'REFUSED',
      `Refusing: ${ghsa} is not in ${repo}'s current audit. Nothing to allowlist.`
    )
  }
  return advisory
}

const allowlistKindOf = ({ fix, ghsa, blockedBy, warn }) => {
  if (fix.fixed_version !== null) {
    if (!blockedBy) {
      const fixes = fix.fixes
        .map(({ installed, fixed }) => `${installed} -> ${fixed}`)
        .join(', ')
      throw new TimError(
        'REFUSED',
        `Refusing: ${ghsa} (${fix.package}) has a fixed version (${fixes}).\nTake the fix. If a parent package stops you, pass --blocked-by naming it.`
      )
    }
    return { kind: 'fix_blocked_upstream', recordedBlockedBy: blockedBy }
  }
  if (blockedBy) {
    warn(
      `Note: ${ghsa} has no fixed version, so --blocked-by is not recorded (kind no_fix).`
    )
  }
  return { kind: 'no_fix', recordedBlockedBy: '' }
}

const readAllowlistState = (path, { runId, repo }) =>
  existsSync(path)
    ? JSON.parse(readFileSync(path, 'utf8'))
    : { ticket: runId, repo, entries: [] }

/**
 * Writes or renews one allowlist entry in the repo's audit-ci.jsonc,
 * `{"GHSA-…": {"active": true, "notes": "<reason>. Owner: <owner>", "expiry": "YYYY-MM-DD"}}`,
 * and records it in the run's allowlist.<repo>.json. It refuses an expiry
 * more than 3 calendar months away, a GHSA the repo's audit does not
 * report, and an advisory with a fixed version unless `blockedBy` names
 * what stops the repo taking it.
 *
 * @param {object} request
 * @param {string} request.workspaceRoot
 * @param {string} request.runId
 * @param {string} request.repo
 * @param {string} request.ghsa
 * @param {string} request.reason
 * @param {string} request.owner
 * @param {string} request.expiryDays - Whole days, 1 or more
 * @param {string} [request.blockedBy]
 * @param {string} [request.stage] - Digits
 * @param {string} [request.repoPath]
 * @param {Date} [request.now]
 * @param {typeof run} [request.runCommand]
 * @param {(line: string) => void} [request.warn]
 * @returns {Promise<{repo: string, kind: 'no_fix' | 'fix_blocked_upstream', entry: object}>}
 * @throws {TimError} USAGE for a bad option, repo or config; REFUSED for a refusal; NETWORK when npm audit or the registry gives no answer
 */
export const allowAdvisory = async (request) => {
  const {
    workspaceRoot,
    runId,
    repo,
    ghsa,
    reason,
    owner,
    expiryDays,
    blockedBy = '',
    stage = '',
    repoPath,
    now = new Date(),
    runCommand = run,
    warn = ignoreLine
  } = request
  checkAllowOptions(request)
  const checkout = resolveRepoCheckout({ workspaceRoot, repo, repoPath })
  const { path: configPath, config } = readAuditConfig(checkout)
  const expiry = checkExpiryWithinThreeMonths(now, expiryDays)
  const advisory = await reportedAdvisory({ checkout, repo, ghsa, runCommand })
  const [fix] = await checkFixesInRegistry(
    [{ ghsa, package: advisory.package, ranges: advisory.ranges }],
    { checkout, runCommand, warn },
    `Could not check the registry for a fixed version of ${advisory.package} (npm view failed).`
  )
  const { kind, recordedBlockedBy } = allowlistKindOf({
    fix,
    ghsa,
    blockedBy,
    warn
  })
  const notes = allowlistNotesOf({
    reason,
    blockedBy: recordedBlockedBy,
    owner
  })
  const entry = { [ghsa]: { active: true, notes, expiry } }
  writeFileSync(configPath, jqText(withAllowlistEntry(config, ghsa, entry)))

  const stateFolder = auditStateFolder(workspaceRoot, runId, repo)
  mkdirSync(stateFolder, { recursive: true })
  const statePath = join(stateFolder, `allowlist.${repo}.json`)
  const state = readAllowlistState(statePath, { runId, repo })
  const recorded = withAllowlistRecord(state, {
    ghsa,
    packageName: advisory.package,
    kind,
    blockedBy: recordedBlockedBy,
    fixedVersion: fix.fixed_version ?? '',
    reason,
    owner,
    notes,
    expiry,
    stamp: utcStampOf(now),
    stage
  })
  writeFileSync(statePath, jqText(recorded))
  return { repo, kind, entry }
}

/**
 * Drops entries from the run's allowlist.<repo>.json. It leaves
 * audit-ci.jsonc alone, and an entry that is not there is not an error.
 *
 * @param {{workspaceRoot: string, runId: string, repo: string, ghsas: string[]}} request
 * @returns {{dropped: string[], state_file: string}}
 * @throws {TimError} USAGE for a missing option or a GHSA that is not one
 */
export const forgetAllowlistEntries = ({
  workspaceRoot,
  runId,
  repo,
  ghsas = []
}) => {
  if (!runId || !repo || ghsas.length === 0) {
    throw new TimError('USAGE', FORGET_USAGE)
  }
  const notGhsa = ghsas.find((ghsa) => !isGhsaId(ghsa))
  if (notGhsa !== undefined) {
    throw new TimError('USAGE', `Not a GHSA id: ${notGhsa}`)
  }
  const statePath = join(
    auditStateFolder(workspaceRoot, runId, repo),
    `allowlist.${repo}.json`
  )
  if (existsSync(statePath)) {
    const state = JSON.parse(readFileSync(statePath, 'utf8'))
    writeFileSync(statePath, jqText(withoutAllowlistRecords(state, ghsas)))
  }
  return { dropped: ghsas, state_file: statePath }
}

/**
 * @param {{dropped: string[], state_file: string}} forgotten
 * @returns {string} What `forget` tells the user
 */
export const renderForgottenText = ({ dropped, state_file: stateFile }) =>
  `Dropped ${dropped.join(' ')} from ${stateFile} (if present).`

const gateResult = (status, reason, allowlisted) => ({
  status,
  reason,
  allowlisted
})

const fixableListOf = (summary) =>
  [...summary.failing_fixable, ...summary.fixable_allowlisted]
    .map((row) => `${row.ghsa} (${row.package} ${row.fixed_version})`)
    .join(', ')

const auditOutcome = async (request) => {
  try {
    const summary = await runAuditBaseline(request)
    return { summary, exitCode: baselineExitCodeOf(summary) }
  } catch (error) {
    request.warn(error.message)
    return { summary: null, exitCode: 2 }
  }
}

const allowEachNoFixAdvisory = async (request, summary, upgrade) => {
  const allowlisted = []
  for (const { ghsa, title } of summary.failing_no_fix) {
    try {
      await allowAdvisory({
        ...request,
        ghsa,
        reason: `${title.replace(/\.$/, '')}: no fixed release; arrived with ${upgrade}`,
        owner: request.allowlistOwner,
        expiryDays: request.expiryDays
      })
      allowlisted.push(ghsa)
    } catch (error) {
      request.warn(error.message)
      return { allowlisted, failedGhsa: ghsa }
    }
  }
  return { allowlisted, failedGhsa: null }
}

/**
 * The audit gate for one package upgrade: audits the upgraded tree and,
 * when it fails only on advisories with no fixed version and an owner and
 * expiry are given, allowlists them and audits again.
 *
 * @param {object} request - As {@link runAuditBaseline}, plus:
 * @param {string} request.packageName
 * @param {string} request.target - The version upgraded to
 * @param {string} [request.allowlistOwner]
 * @param {string} [request.expiryDays]
 * @returns {Promise<{status: 'green' | 'red' | 'not_run', reason: string | null, allowlisted: string[]}>} `allowlisted` names every entry written, whose audit-ci.jsonc change belongs in the upgrade's commit, or in its rollback
 */
export const runUpgradeGate = async (request) => {
  const { runId, repo, packageName, target, allowlistOwner, expiryDays } =
    request
  const gateRequest = { warn: ignoreLine, ...request }
  if (!runId || !repo || !packageName || !target) {
    throw new TimError(
      'USAGE',
      'Usage: tim npm audit gate --run-id TICKET --repo REPO --package NAME --target VERSION [--allowlist-owner NAME --expiry-days N] [--repo-path PATH]'
    )
  }
  const upgrade = `${packageName} ${target}`
  const label = `upgrade-${fileSafeLabelOf(packageName)}-${target}`
  const audited = await auditOutcome({ ...gateRequest, label })
  if (audited.exitCode === 0) return gateResult('green', null, [])
  if (audited.exitCode !== 1) {
    return gateResult(
      'not_run',
      `audit could not run after upgrading ${packageName} to ${target}`,
      []
    )
  }
  const fixable = fixableListOf(audited.summary)
  if (fixable) {
    return gateResult(
      'red',
      `audit red after upgrading ${packageName} to ${target} on an advisory with a fix: ${fixable}`,
      []
    )
  }
  if (!allowlistOwner || !expiryDays) {
    const noFix = audited.summary.failing_no_fix
      .map((row) => row.ghsa)
      .join(' ')
    return gateResult(
      'red',
      `audit red after upgrading ${packageName} to ${target} on advisories with no fix (${noFix}); pass --allowlist-owner and --expiry-days to allowlist them`,
      []
    )
  }
  const { allowlisted, failedGhsa } = await allowEachNoFixAdvisory(
    gateRequest,
    audited.summary,
    upgrade
  )
  if (failedGhsa) {
    return gateResult(
      'red',
      `audit red after upgrading ${packageName} to ${target}; could not allowlist ${failedGhsa}`,
      allowlisted
    )
  }
  const reaudited = await auditOutcome({
    ...gateRequest,
    label: `${label}-allowlisted`
  })
  if (reaudited.exitCode !== 0) {
    return gateResult(
      'red',
      `audit still red after allowlisting ${allowlisted.join(' ')} for ${packageName} ${target}`,
      allowlisted
    )
  }
  return gateResult('green', null, allowlisted)
}
