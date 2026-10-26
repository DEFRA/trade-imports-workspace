import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runToLog } from '../exec/exec.js'

const PLAYWRIGHT_TEST = '@playwright/test'

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

const declaredNames = (manifest) => [
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.devDependencies ?? {})
]

const installedVersion = (path, name) =>
  readJson(join(path, 'node_modules', name, 'package.json'))?.version ?? null

/**
 * The direct dependencies whose installed version in `node_modules` is not
 * the one `package-lock.json` locks, including ones not installed at all. A
 * folder with no package.json or no package-lock.json has none.
 *
 * @param {string} path - The folder holding package.json
 * @returns {{name: string, locked: string, installed: string|null}[]}
 */
export const staleDependencies = (path) => {
  const manifest = readJson(join(path, 'package.json'))
  const lock = readJson(join(path, 'package-lock.json'))
  if (!manifest || !lock?.packages) return []
  return declaredNames(manifest)
    .map((name) => ({
      name,
      locked: lock.packages[`node_modules/${name}`]?.version,
      installed: installedVersion(path, name)
    }))
    .filter(({ locked, installed }) => locked && locked !== installed)
}

const declaresPlaywright = (path) =>
  declaredNames(readJson(join(path, 'package.json')) ?? {}).includes(
    PLAYWRIGHT_TEST
  )

const logPath = (logsDir, repo, name) =>
  join(logsDir, `gate-${repo}-${name}.log`)

const describeStale = (stale) =>
  stale
    .map(
      ({ name, locked, installed }) =>
        `${name} ${installed ?? 'missing'} (locked ${locked})`
    )
    .join(', ')

const runStep = async (step, { path, repo, logsDir, env }) => {
  const { exitCode, log } = await runToLog(step.command, step.args, {
    cwd: path,
    env,
    logPath: logPath(logsDir, repo, step.name)
  })
  return exitCode === 0
    ? null
    : `${step.command} ${step.args.join(' ')} exited ${exitCode} in ${repo}. Read ${log}.`
}

const installSteps = (path) => [
  { name: 'install', command: 'npm', args: ['ci'] },
  ...(declaresPlaywright(path)
    ? [
        {
          name: 'browsers',
          command: 'npm',
          args: [
            'exec',
            '--',
            'playwright',
            'install',
            'chromium',
            'chromium-headless-shell'
          ]
        }
      ]
    : [])
]

const runSteps = async (steps, context) => {
  for (const step of steps) {
    const failure = await runStep(step, context)
    if (failure) return failure
  }
  return null
}

/**
 * Bring a folder's `node_modules` in line with its lockfile when any direct
 * dependency differs: `npm ci`, then, when it uses Playwright, the browsers
 * that Playwright version needs. A folder whose dependencies already match
 * is left alone.
 *
 * @param {object} args
 * @param {string} args.repo
 * @param {string} args.path - The folder holding package.json
 * @param {string} args.logsDir
 * @param {object} [args.env]
 * @returns {Promise<{repo: string, path: string, stale: string|null, installed: boolean, reason: string|null}>}
 */
export const installStaleDependencies = async ({
  repo,
  path,
  logsDir,
  env
}) => {
  const stale = existsSync(path) ? staleDependencies(path) : []
  if (stale.length === 0) {
    return { repo, path, stale: null, installed: false, reason: null }
  }
  const failure = await runSteps(installSteps(path), {
    path,
    repo,
    logsDir,
    env
  })
  return {
    repo,
    path,
    stale: describeStale(stale),
    installed: failure === null,
    reason: failure
  }
}
