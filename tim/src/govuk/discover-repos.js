import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { writeJsonAtomic } from '../backlog/io.js'
import { rosterOf } from '../constants/repos.js'
import { TimError } from '../errors.js'
import { runFolder } from './state.js'
import { stateTimestamp } from './transitions.js'

const PACKAGE = 'govuk-frontend'

const dependsOnGovuk = (packagePath) => {
  const manifest = JSON.parse(readFileSync(packagePath, 'utf8'))
  return Object.hasOwn(
    { ...manifest.dependencies, ...manifest.devDependencies },
    PACKAGE
  )
}

const byPackagePath = (left, right) => {
  const leftPath = `${left}/package.json`
  const rightPath = `${right}/package.json`
  if (leftPath === rightPath) return 0
  return leftPath < rightPath ? -1 : 1
}

/**
 * The repos under the workspace's repos folder whose own package.json
 * lists govuk-frontend in dependencies or devDependencies. Only real
 * folders count, not symlinks.
 *
 * @param {string} workspaceRoot
 * @returns {string[]} Repo names in package.json path order
 * @throws {TimError} NOT_FOUND when the repos folder is missing
 */
export const reposUsingGovuk = (workspaceRoot) => {
  const reposDir = join(workspaceRoot, rosterOf(workspaceRoot).reposDir)
  if (!existsSync(reposDir)) {
    throw new TimError('NOT_FOUND', `Repos dir not found: ${reposDir}`)
  }
  return readdirSync(reposDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((repo) => existsSync(join(reposDir, repo, 'package.json')))
    .toSorted(byPackagePath)
    .filter((repo) => dependsOnGovuk(join(reposDir, repo, 'package.json')))
}

/**
 * Finds the repos a govuk-frontend upgrade run covers and writes the run's
 * `.run-meta.json`.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.runId
 * @param {string} [args.branch]
 * @param {string} [args.target] - As given, prefix and all
 * @returns {{path: string, meta: {ticket: string, branch: string|null, target_version: string|null, repos: string[], discovered_at: string}}}
 * @throws {TimError} NOT_FOUND when the repos folder is missing
 */
export const writeRunMeta = ({ workspaceRoot, runId, branch, target }) => {
  const meta = {
    ticket: runId,
    branch: branch || null,
    target_version: target || null,
    repos: reposUsingGovuk(workspaceRoot),
    discovered_at: stateTimestamp()
  }
  const path = join(runFolder(workspaceRoot, runId), '.run-meta.json')
  writeJsonAtomic(path, meta)
  return { path, meta }
}

/**
 * @param {ReturnType<typeof writeRunMeta>} written
 * @returns {string[]}
 */
export const runMetaLines = ({ path, meta: { repos } }) => [
  `Discovered ${repos.length} repo(s) consuming govuk-frontend:`,
  ...repos.map((repo) => `  ${repo}`),
  '',
  `Wrote: ${path}`
]
