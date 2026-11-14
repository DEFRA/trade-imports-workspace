import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { realRepoPath, repoPath } from '../constants/repos.js'
import { TimError } from '../errors.js'
import { run, runToLog } from '../exec/exec.js'
import { findVersion, isDirectory, isUnset, requireOptions } from './state.js'
import {
  markVersionDone,
  markVersionFailed,
  stateTimestamp
} from './transitions.js'

const PACKAGE = 'govuk-frontend'

const hasPackage = (dependencies) => Object.hasOwn(dependencies ?? {}, PACKAGE)

const withConstraint = (manifest, constraint) => {
  const field = ['dependencies', 'devDependencies'].find((name) =>
    hasPackage(manifest[name])
  )
  if (!field) return manifest
  return {
    ...manifest,
    [field]: { ...manifest[field], [PACKAGE]: constraint }
  }
}

const setConstraint = (packagePath, constraint) => {
  const manifest = JSON.parse(readFileSync(packagePath, 'utf8'))
  writeFileSync(
    packagePath,
    `${JSON.stringify(withConstraint(manifest, constraint), null, 2)}\n`
  )
}

const checkedRepoPath = (workspaceRoot, repo) => {
  const path = repoPath(workspaceRoot, repo)
  if (!isDirectory(join(path, '.git'))) {
    throw new TimError('NOT_FOUND', `Not a git repo: ${path}`)
  }
  return path
}

const checkPlanned = (entry, version) => {
  if (isUnset(entry.classification)) {
    throw new TimError(
      'NOT_FOUND',
      `Version ${version} is unplanned (classification null) — run Phase 2 first.`
    )
  }
}

const npmStep = async ({ step, repo, version, stamp, npmPrefix }) => {
  const logPath = `/tmp/govuk-${step}-${repo}-${version}-${stamp}.txt`
  const { exitCode } = await runToLog('npm', ['--prefix', npmPrefix, step], {
    logPath,
    commandHeader: false
  })
  return { ok: exitCode === 0, logPath }
}

const commitAll = async (repoDir, message, { say, warn }) => {
  await run('git', ['-C', repoDir, 'add', '-A'])
  const commit = await run('git', ['-C', repoDir, 'commit', '-m', message])
  if (commit.stdout) await say(commit.stdout)
  if (commit.stderr) await warn(commit.stderr)
  if (commit.exitCode !== 0) {
    throw new TimError('UNKNOWN', `Cannot commit in ${repoDir}`)
  }
  const head = await run('git', ['-C', repoDir, 'rev-parse', 'HEAD'])
  return head.stdout.trim()
}

const appliedLines = ({ version, repo, commit, constraint, final, prefix }) => [
  '',
  `=== APPLIED v${version} (${repo}) ===`,
  `Commit: ${commit}`,
  `Constraint: ${constraint}`,
  ...(final ? [`(final target — restored prefix '${prefix}')`] : [])
]

const silent = () => undefined

/**
 * Applies one version of a govuk-frontend upgrade to a repo: sets the
 * govuk-frontend constraint in package.json, runs `npm install` and
 * `npm test` with their output in `/tmp/govuk-{install,test}-<repo>-<version>-<stamp>.txt`,
 * commits everything in the repo and marks the version done. A failed npm
 * step marks the version failed instead. An intermediate noop version is
 * only marked done. The target version, or one given as `final`, gets the
 * run's original constraint prefix.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.runId]
 * @param {string} [args.repo]
 * @param {string} [args.version]
 * @param {boolean} [args.final=false]
 * @param {(line: string) => void | Promise<void>} [args.say] - Takes each progress line as it happens
 * @param {(line: string) => void | Promise<void>} [args.warn] - Takes each warning line as it happens
 * @returns {Promise<{outcome: 'applied'|'noop'|'already-done'|'failed', repo: string, version: string, commit?: string, constraint?: string, final?: boolean, installLog?: string, testLog?: string, reason?: string}>}
 * @throws {TimError} USAGE for a missing option or an unplanned version, NOT_FOUND when the repo, the state file, the version or package.json is missing, UNKNOWN when git cannot commit
 */
export const applyVersion = async ({
  workspaceRoot,
  runId,
  repo,
  version,
  final = false,
  say = silent,
  warn = silent
}) => {
  requireOptions({ 'run-id': runId, repo, 'govuk-version': version })
  const repoDir = checkedRepoPath(workspaceRoot, repo)
  const { state, entry } = findVersion({ workspaceRoot, runId, repo, version })
  checkPlanned(entry, version)
  const ids = { workspaceRoot, runId, repo, version }

  if (entry.implementation_status === 'done') {
    await warn(`Version ${version} already done.`)
    return { outcome: 'already-done', repo, version }
  }

  const isFinal = final || version === state.target_version
  if (entry.classification === 'noop' && !isFinal) {
    await say(
      `Version ${version} classified as noop — recording completion without commit.`
    )
    await say(markVersionDone(ids).message)
    return { outcome: 'noop', repo, version }
  }

  const packagePath = join(repoDir, 'package.json')
  if (!existsSync(packagePath)) {
    throw new TimError('NOT_FOUND', `No package.json at ${packagePath}`)
  }
  const prefix = state.original_constraint_prefix || ''
  const constraint = isFinal ? `${prefix}${version}` : version
  await say(`Setting govuk-frontend = "${constraint}" in ${repo}/package.json`)
  setConstraint(packagePath, constraint)

  const stamp = stateTimestamp().replaceAll(/[-:]/g, '')
  const stepIds = {
    repo,
    version,
    stamp,
    npmPrefix: realRepoPath(workspaceRoot, repo)
  }
  const failStep = async (step, logPath, logs) => {
    const reason = `npm ${step} failed — see ${logPath}`
    await say(markVersionFailed({ ...ids, reason }).message)
    return { outcome: 'failed', repo, version, reason, ...logs }
  }

  await say('Running npm install...')
  const install = await npmStep({ step: 'install', ...stepIds })
  if (!install.ok) {
    return failStep('install', install.logPath, {
      installLog: install.logPath
    })
  }
  await say(`  install log: ${install.logPath}`)

  await say('Running npm test...')
  const tests = await npmStep({ step: 'test', ...stepIds })
  if (!tests.ok) {
    return failStep('test', tests.logPath, {
      installLog: install.logPath,
      testLog: tests.logPath
    })
  }
  await say(`  test log: ${tests.logPath}`)

  const commit = await commitAll(
    repoDir,
    `chore(${runId}): upgrade govuk-frontend to ${version}`,
    { say, warn }
  )
  await say(markVersionDone({ ...ids, commit }).message)
  await say(
    appliedLines({
      version,
      repo,
      commit,
      constraint,
      final: isFinal,
      prefix
    }).join('\n')
  )
  return {
    outcome: 'applied',
    repo,
    version,
    commit,
    constraint,
    final: isFinal,
    installLog: install.logPath,
    testLog: tests.logPath
  }
}
