import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { run } from '../exec/exec.js'
import {
  hasSeenCheck,
  recordPendingCheck,
  sonarChecksFolder
} from './pending-store.js'

const SONAR_PROJECT_BY_REPO = {
  'trade-imports-animals-frontend': 'DEFRA_trade-imports-animals-frontend',
  'trade-imports-animals-admin': 'DEFRA_trade-imports-animals-admin',
  'trade-imports-animals-backend': 'DEFRA_trade-imports-animals-backend',
  'trade-imports-dynamics-gateway': 'DEFRA_trade-imports-dynamics-gateway'
}

const gitOutput = async (repoFolder, args) => {
  const { stdout, exitCode } = await run('git', ['-C', repoFolder, ...args])
  return exitCode === 0 ? stdout : null
}

const pushedFeatureCommit = async (repoFolder) => {
  if (!existsSync(join(repoFolder, '.git'))) return null
  const branch = await gitOutput(repoFolder, [
    'symbolic-ref',
    '--short',
    '-q',
    'HEAD'
  ])
  if (!branch || branch === 'main' || branch === 'master') return null
  const sha = await gitOutput(repoFolder, ['rev-parse', 'HEAD'])
  const upstreamSha = await gitOutput(repoFolder, ['rev-parse', '@{upstream}'])
  if (sha === null || sha !== upstreamSha) return null
  return { branch, sha }
}

/**
 * Records a pending SonarCloud check for each sonar repo under `repos/`
 * whose feature branch has its HEAD pushed, unless that commit is already
 * seen. Repos on main or master, on a detached HEAD, or with unpushed
 * commits are left out. Creates the checks folder even when nothing is
 * recorded.
 *
 * @param {object} opts
 * @param {string} opts.workspaceRoot
 * @param {number} opts.nowSeconds - epoch seconds, stored as the push time
 * @returns {Promise<Array<{project: string, sha: string, branch: string, pushedAt: number}>>} the checks recorded
 */
export const recordPushedCommits = async ({ workspaceRoot, nowSeconds }) => {
  const folder = sonarChecksFolder(workspaceRoot)
  mkdirSync(folder, { recursive: true })
  const recorded = []
  for (const [repoName, project] of Object.entries(SONAR_PROJECT_BY_REPO)) {
    const commit = await pushedFeatureCommit(
      join(workspaceRoot, 'repos', repoName)
    )
    if (commit === null || hasSeenCheck(folder, { project, ...commit })) {
      continue
    }
    const check = { project, ...commit, pushedAt: nowSeconds }
    recordPendingCheck(folder, check)
    recorded.push(check)
  }
  return recorded
}
