import { realRepoPath } from '../constants/repos.js'
import { run } from '../exec/exec.js'

const vulnerabilityCounts = (auditOutput) => {
  try {
    const vulnerabilities = JSON.parse(auditOutput)?.metadata?.vulnerabilities
    return {
      critical: vulnerabilities?.critical ?? 0,
      high: vulnerabilities?.high ?? 0
    }
  } catch {
    return { critical: 0, high: 0 }
  }
}

const auditRepo = async (workspaceRoot, repo) => {
  const { stdout } = await run('npm', [
    '--prefix',
    realRepoPath(workspaceRoot, repo),
    'audit',
    '--json'
  ])
  const counts = vulnerabilityCounts(stdout)
  return { repo, ...counts, flagged: counts.critical > 0 || counts.high > 0 }
}

const auditLine = ({ repo, critical, high, flagged }) =>
  flagged
    ? `  [WARN] ${repo}: ${critical} critical, ${high} high — resolve before/alongside the upgrade`
    : `  [ok]   ${repo}: no high/critical advisories`

/**
 * Runs `npm audit --json` in each repo and counts its critical and high
 * advisories. Output that is not an audit report counts as none. Only
 * reports: it changes nothing.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string[]} args.repos
 * @returns {Promise<{repo: string, critical: number, high: number, flagged: boolean}[]>}
 */
export const auditRepos = async ({ workspaceRoot, repos }) => {
  const audits = []
  for (const repo of repos) {
    audits.push(await auditRepo(workspaceRoot, repo))
  }
  return audits
}

/**
 * @param {Awaited<ReturnType<typeof auditRepos>>} audits
 * @returns {string[]} The pre-flight section, heading first
 */
export const preflightLines = (audits) => [
  '',
  '=== SECURITY PRE-FLIGHT (npm audit, HIGH/CRITICAL) ===',
  ...audits.map(auditLine),
  ...(audits.some(({ flagged }) => flagged)
    ? [
        '',
        '  Clear flagged advisories before Phase 3 (direct-dep bump or an',
        "  'overrides' entry — see the npm-upgrade skill), or proceed knowing",
        "  the upgrade commit may be blocked by a repo's pre-commit audit."
      ]
    : [])
]
