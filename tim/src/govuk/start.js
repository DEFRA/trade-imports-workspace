import { auditRepos, preflightLines } from './audit-preflight.js'
import { runMetaLines, writeRunMeta } from './discover-repos.js'
import { discoverVersions } from './discover-versions.js'
import { ensureBranch } from './ensure-branch.js'
import { listPlans, renderPlansText } from './plans.js'
import { runOf } from './run-id.js'

const silent = () => undefined

const headerLines = ({ runId, branch, target }) => [
  'PHASE: 1',
  `Run ID: ${runId}`,
  `Branch: ${branch}`,
  ...(target ? [`Target: ${target}`] : []),
  ''
]

const eachInTurn = async (repos, step) => {
  const results = []
  for (const repo of repos) {
    results.push(await step(repo))
  }
  return results
}

/**
 * Starts a govuk-frontend upgrade run: writes `.run-meta.json` naming every
 * repo that depends on govuk-frontend, puts each on the run's branch,
 * seeds each repo's state and changelog sections, prints the run's plans
 * and reports each repo's critical and high npm advisories.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.ticket] - Gives the branch `chore/<ticket>`
 * @param {string} [args.branch] - Used as it is
 * @param {string} [args.target] - Defaults to the registry's latest
 * @param {boolean} [args.force=false]
 * @param {object} args.registry - From `createNpmRegistryClient`
 * @param {object} args.changelogs - From `createGovukChangelogClient`
 * @param {(line: string) => void | Promise<void>} [args.say]
 * @param {(line: string) => void | Promise<void>} [args.warn]
 * @returns {Promise<{run_id: string, branch: string, target: string|null, repos: string[], branches: object[], discoveries: object[], preflight: object[]}>}
 * @throws {TimError} USAGE for a bad ticket or branch choice; whatever a step throws, which stops the run there
 */
export const startUpgrade = async ({
  workspaceRoot,
  ticket,
  branch: givenBranch,
  target,
  force = false,
  registry,
  changelogs,
  say = silent,
  warn = silent
}) => {
  const { runId, branch } = runOf({ ticket, branch: givenBranch })
  await say(headerLines({ runId, branch, target }).join('\n'))

  const written = writeRunMeta({ workspaceRoot, runId, branch, target })
  await say(runMetaLines(written).join('\n'))
  const { repos } = written.meta
  const started = { run_id: runId, branch, target: target ?? null, repos }
  if (repos.length === 0) {
    await warn('No repos depend on govuk-frontend — nothing to do.')
    return { ...started, branches: [], discoveries: [], preflight: [] }
  }

  await say(`\nSetting up branch ${branch} on ${repos.length} repo(s)...`)
  const branches = await eachInTurn(repos, (repo) =>
    ensureBranch({ workspaceRoot, repo, branch, say, warn })
  )

  await say('\nDiscovering versions per repo...')
  const discoveries = await eachInTurn(repos, (repo) =>
    discoverVersions({
      workspaceRoot,
      runId,
      repo,
      target,
      force,
      registry,
      changelogs,
      say,
      warn
    })
  )

  await say('\n=== START COMPLETE ===')
  await say(renderPlansText(listPlans({ workspaceRoot, runId })))

  const preflight = await auditRepos({ workspaceRoot, repos })
  await say(preflightLines(preflight).join('\n'))
  await say(
    '\nNext: Phase 2 — spawn VERSION_PLANNER per unplanned version (see PHASE_2_MANAGER.md).'
  )
  return { ...started, branches, discoveries, preflight }
}
