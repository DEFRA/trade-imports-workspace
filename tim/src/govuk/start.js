import { TimError } from '../errors.js'
import { auditRepos, preflightLines } from './audit-preflight.js'
import { runMetaLines, writeRunMeta } from './discover-repos.js'
import { discoverVersions } from './discover-versions.js'
import { ensureBranch, reposWithUncommittedChanges } from './ensure-branch.js'
import { listPlans, renderPlansText } from './plans.js'
import { runOf, unattendedRunOf, unattendedTicketOf } from './run-id.js'

const PACKAGE = 'govuk-frontend'

const silent = () => undefined

const headerLines = ({ runId, branch, target, unattended }) => [
  'PHASE: 1',
  `Run ID: ${runId}`,
  `Branch: ${branch}`,
  ...(target ? [`Target: ${target}`] : []),
  ...(unattended ? ['Mode: unattended'] : []),
  ''
]

const eachInTurn = async (repos, step) => {
  const results = []
  for (const repo of repos) {
    results.push(await step(repo))
  }
  return results
}

const unattendedRun = async ({ ticket, branch, target, registry }) => {
  const runTicket = unattendedTicketOf({ ticket, branch })
  const runTarget = target ?? (await registry.latestVersion(PACKAGE))
  return {
    ...unattendedRunOf({ ticket: runTicket, target: runTarget }),
    ticket: runTicket,
    target: runTarget
  }
}

const attendedRun = ({ ticket, branch, target }) => ({
  ...runOf({ ticket, branch }),
  target
})

const refuseUncommittedChanges = async (workspaceRoot, repos) => {
  const dirty = await reposWithUncommittedChanges(workspaceRoot, repos)
  if (dirty.length > 0) {
    throw new TimError(
      'DIRTY_TREE',
      `Stopped before switching branches: uncommitted changes in ${dirty.join(' ')}`
    )
  }
}

const NEXT_STEP = {
  attended:
    '\nNext: Phase 2 — spawn VERSION_PLANNER per unplanned version (see PHASE_2_MANAGER.md).',
  unattended:
    '\nNext: plan one version at a time, as the govuk-upgrade skill\'s "Unattended mode" says.'
}

/**
 * Starts a govuk-frontend upgrade run: writes `.run-meta.json` naming every
 * repo that depends on govuk-frontend, puts each on the run's branch,
 * seeds each repo's state and changelog sections, prints the run's plans
 * and reports each repo's critical and high npm advisories.
 *
 * An unattended run takes a ticket key or NO_JIRA and no branch. Its target
 * is the registry's latest when not given and must be a stable X.Y.Z, its
 * run id is `<ticket>-govuk-frontend-<target>` and its branch
 * `chore/<run id>`, created from origin/main after a fetch. It stops before
 * switching any branch when a repo has uncommitted changes.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.ticket] - Gives the branch `chore/<ticket>`
 * @param {string} [args.branch] - Used as it is
 * @param {string} [args.target] - Defaults to the registry's latest
 * @param {boolean} [args.force=false]
 * @param {boolean} [args.unattended=false]
 * @param {object} args.registry - From `createNpmRegistryClient`
 * @param {object} args.changelogs - From `createGovukChangelogClient`
 * @param {(line: string) => void | Promise<void>} [args.say]
 * @param {(line: string) => void | Promise<void>} [args.warn]
 * @returns {Promise<{run_id: string, branch: string, target: string|null, repos: string[], branches: object[], discoveries: object[], preflight: object[]}>}
 * @throws {TimError} USAGE for a bad ticket, branch or unattended target; DIRTY_TREE when an unattended run finds uncommitted changes; whatever a step throws, which stops the run there
 */
export const startUpgrade = async ({
  workspaceRoot,
  ticket,
  branch: givenBranch,
  target: givenTarget,
  force = false,
  unattended = false,
  registry,
  changelogs,
  say = silent,
  warn = silent
}) => {
  const choice = { ticket, branch: givenBranch, target: givenTarget }
  const run = unattended
    ? await unattendedRun({ ...choice, registry })
    : attendedRun(choice)
  const { runId, branch, target } = run
  await say(headerLines({ runId, branch, target, unattended }).join('\n'))

  const written = writeRunMeta({
    workspaceRoot,
    runId,
    ticket: run.ticket,
    unattended,
    branch,
    target
  })
  await say(runMetaLines(written).join('\n'))
  const { repos } = written.meta
  const started = { run_id: runId, branch, target: target ?? null, repos }
  if (repos.length === 0) {
    await warn('No repos depend on govuk-frontend — nothing to do.')
    return { ...started, branches: [], discoveries: [], preflight: [] }
  }

  if (unattended) await refuseUncommittedChanges(workspaceRoot, repos)
  const startPoint = unattended ? 'origin/main' : undefined
  await say(`\nSetting up branch ${branch} on ${repos.length} repo(s)...`)
  const branches = await eachInTurn(repos, (repo) =>
    ensureBranch({ workspaceRoot, repo, branch, startPoint, say, warn })
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
  await say(unattended ? NEXT_STEP.unattended : NEXT_STEP.attended)
  return { ...started, branches, discoveries, preflight }
}
