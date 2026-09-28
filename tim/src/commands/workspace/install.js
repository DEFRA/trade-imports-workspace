import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  NODE_REPOS,
  JAVA_REPOS,
  repoPath,
  realRepoPath
} from '../../constants/repos.js'
import { run } from '../../exec/exec.js'
import { runAcross } from '../../exec/parallel.js'
import { makeTaskAction, toResultRecord } from './_task-output.js'

const collect = (value, previous) => previous.concat([value])

const PINNED_NPM_PATTERN = /^npm@([^+\s]+)/

/**
 * The exact npm version a repo's package.json pins via Corepack's
 * `packageManager` field (e.g. `"npm@11.6.2"`), or null when it pins
 * nothing or pins a different package manager.
 *
 * @param {string|null|undefined} packageManager
 * @returns {string|null}
 */
export const parsePinnedNpmVersion = (packageManager) => {
  const match = PINNED_NPM_PATTERN.exec(packageManager ?? '')
  return match ? match[1] : null
}

/**
 * Build the command that installs a repo's Node.js dependencies. When the
 * repo pins an npm version and the npm on PATH is a different version, run
 * that exact npm through `npm exec` rather than whatever `npm ci` on PATH
 * would resolve to. Otherwise, plain `npm --prefix <dir> ci`.
 *
 * @param {object} params
 * @param {string} params.dir - Absolute path to the repo (the npm --prefix target)
 * @param {string|null} [params.packageManager] - The repo's package.json `packageManager` field
 * @param {string|null} [params.runningNpmVersion] - The npm version currently on PATH
 * @returns {{command: string, args: string[]}}
 */
export const buildNpmInstallCommand = ({
  dir,
  packageManager,
  runningNpmVersion
}) => {
  const pinned = parsePinnedNpmVersion(packageManager)
  if (!pinned || pinned === runningNpmVersion) {
    return { command: 'npm', args: ['--prefix', dir, 'ci'] }
  }
  return {
    command: 'npm',
    args: ['exec', '--yes', `npm@${pinned}`, '--', 'ci', '--prefix', dir]
  }
}

const readPackageManager = (dir) => {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    return pkg.packageManager ?? null
  } catch {
    return null
  }
}

const detectRunningNpmVersion = async () => {
  const result = await run('npm', ['--version'])
  return result.exitCode === 0 ? result.stdout.trim() : null
}

const buildNodeTask = (dir, repo) => {
  const packageManager = readPackageManager(dir)
  const task = { id: repo, repo, label: `${repo} — npm ci` }
  task.run = async () => {
    const pinned = parsePinnedNpmVersion(packageManager)
    const runningNpmVersion = pinned ? await detectRunningNpmVersion() : null
    const { command, args } = buildNpmInstallCommand({
      dir,
      packageManager,
      runningNpmVersion
    })
    task.label = `${repo} — ${[command, ...args].join(' ')}`
    return toResultRecord(task, await run(command, args))
  }
  return task
}

const buildJavaTask = (dir, repo) => {
  const task = { id: repo, repo, label: `${repo} — mvn install -DskipTests` }
  task.run = async () =>
    toResultRecord(
      task,
      await run('mvn', ['-f', join(dir, 'pom.xml'), 'install', '-DskipTests'])
    )
  return task
}

export const buildInstallTasks = (
  workspaceRoot,
  { nodeOnly = false, javaOnly = false, repo = [] } = {}
) => {
  const wanted = repo.length > 0 ? new Set(repo) : null
  const tasks = []
  if (!javaOnly) {
    for (const nodeRepo of NODE_REPOS) {
      if (wanted && !wanted.has(nodeRepo)) continue
      const dir = realRepoPath(workspaceRoot, nodeRepo)
      if (!existsSync(dir)) continue
      tasks.push(buildNodeTask(dir, nodeRepo))
    }
  }
  if (!nodeOnly) {
    for (const javaRepo of JAVA_REPOS) {
      if (wanted && !wanted.has(javaRepo)) continue
      const dir = repoPath(workspaceRoot, javaRepo)
      if (!existsSync(join(dir, 'pom.xml'))) continue
      tasks.push(buildJavaTask(dir, javaRepo))
    }
  }
  return tasks
}

export const installAll = (workspaceRoot, opts = {}) =>
  runAcross(buildInstallTasks(workspaceRoot, opts), (task) => task.run())

export const register = (parent, { timVersion }) => {
  parent
    .command('install')
    .description(
      'Install dependencies in every repo (npm ci; mvn install -DskipTests). A repo that pins an npm version installs through that exact version.'
    )
    .option('--node-only', 'Skip Java repos')
    .option('--java-only', 'Skip Node.js repos')
    .option('--repo <name>', 'Only install this repo. Repeatable.', collect, [])
    .action(makeTaskAction({ runTasks: installAll, timVersion }))
}
