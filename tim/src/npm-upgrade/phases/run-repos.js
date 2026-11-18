import { statSync } from 'node:fs'
import { join } from 'node:path'
import { rosterOf } from '../../constants/repos.js'
import { TimError } from '../../errors.js'
import { run } from '../../exec/exec.js'
import { isFolder } from '../state.js'

/**
 * A phase stopped and has already written why to stderr. It exits with
 * `exitCode`; in `--json` mode its message goes in the error envelope.
 */
export class PhaseStopped extends TimError {
  constructor(message, exitCode = 1) {
    super('REFUSED', message)
    this.exitCode = exitCode
  }
}

export const UPGRADE_USAGE = [
  'Usage: tim npm upgrade EUDPA-XXXXX --phase 0|1|2|3|4 [--repo R [--repo R ...]] [--strategy latest|minor|patch]',
  '          [--branch NAME] [--allowlist-owner NAME --expiry-days N]',
  '',
  'Without --repo, runs against every repo flagged npmUpgradeDefault in the',
  'workspace roster, repos.json. With --branch, refuses to run unless every',
  'repo is checked out on that branch. --allowlist-owner and --expiry-days',
  'let phase 2 allowlist a new advisory that has no fixed version.'
].join('\n')

/**
 * @param {string} workspaceRoot
 * @param {string} repo
 * @returns {string} The repo's checkout under `repos/`
 */
export const checkoutOf = (workspaceRoot, repo) =>
  join(workspaceRoot, 'repos', repo)

const isFile = (path) =>
  statSync(path, { throwIfNoEntry: false })?.isFile() ?? false

const npmRepoProblemOf = (workspaceRoot, repo) => {
  const checkout = checkoutOf(workspaceRoot, repo)
  if (!isFolder(checkout)) return `Repo dir missing, skipping: ${checkout}`
  if (!isFile(join(checkout, 'package.json'))) {
    return `No package.json in ${repo}, skipping (not an npm repo)`
  }
  return null
}

/**
 * The repos a phase runs on: those asked for, else every roster repo
 * flagged `npmUpgradeDefault`, less any with no checkout or no
 * `package.json`, each of which is warned about.
 *
 * @param {object} request
 * @param {string} request.workspaceRoot
 * @param {string[]} request.requested - The `--repo` names, in order
 * @param {(line: string) => Promise<void>} request.warn
 * @returns {Promise<string[]>}
 */
export const selectNpmRepos = async ({ workspaceRoot, requested, warn }) => {
  const candidates =
    requested.length > 0
      ? requested
      : rosterOf(workspaceRoot).npmUpgradeDefaultRepos
  const kept = []
  for (const repo of candidates) {
    const problem = npmRepoProblemOf(workspaceRoot, repo)
    if (problem) await warn(problem)
    else kept.push(repo)
  }
  return kept
}

const gitLine = async (checkout, args) =>
  (await run('git', ['-C', checkout, ...args])).stdout.trim()

/**
 * @param {string} checkout
 * @returns {Promise<string>} The commit the checkout has checked out
 */
export const headOf = (checkout) => gitLine(checkout, ['rev-parse', 'HEAD'])

/**
 * @param {object} request
 * @param {string} request.workspaceRoot
 * @param {string[]} request.repos
 * @param {string} request.branch - Empty to check nothing
 * @param {(line: string) => Promise<void>} request.warn
 * @throws {PhaseStopped} when any repo is checked out on another branch
 */
export const refuseReposOffBranch = async ({
  workspaceRoot,
  repos,
  branch,
  warn
}) => {
  if (!branch) return
  const offBranch = []
  for (const repo of repos) {
    const current = await gitLine(checkoutOf(workspaceRoot, repo), [
      'branch',
      '--show-current'
    ])
    if (current !== branch) {
      offBranch.push(`${repo} (on '${current || 'detached HEAD'}')`)
    }
  }
  if (offBranch.length === 0) return
  const message = [
    `Refusing to run: these repos are not on ${branch}:`,
    ...offBranch.map((line) => `  ${line}`)
  ].join('\n')
  await warn(message)
  throw new PhaseStopped(message)
}
