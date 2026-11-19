import { existsSync, mkdirSync } from 'node:fs'
import { bakeBestPractices } from '../best-practices.js'
import { checkDiscoverOptions, discoverUpgrades } from '../discover.js'
import { ncuVersion, runNcu } from '../ncu.js'
import { prebakeContext } from '../prebake.js'
import { packagesPath, readJson, runFolder } from '../state.js'
import {
  heldPackageLines,
  recordPackagePolicies,
  removeHeldPackages,
  renderPoliciesText
} from '../unattended/policy.js'
import { requireGreenPhase0 } from './audit-phase.js'
import { checkoutOf, PhaseStopped } from './run-repos.js'

const ignoreLine = () => undefined

const stopWithError = async (warn, error) => {
  const message = `Error: ${error.message}`
  await warn(message)
  throw new PhaseStopped(message)
}

const discoverOne = async ({
  workspaceRoot,
  runId,
  repo,
  strategy,
  packages = [],
  warn
}) => {
  const request = {
    workspaceRoot,
    runId,
    repoPath: checkoutOf(workspaceRoot, repo),
    strategy,
    packages
  }
  try {
    checkDiscoverOptions({ ...request, warn })
    await discoverUpgrades({
      ...request,
      runNcu,
      ncuVersion: ncuVersion(),
      log: ignoreLine
    })
  } catch (error) {
    await stopWithError(warn, error)
  }
}

const recordPoliciesOf = async ({ workspaceRoot, runId, repo, warn }) => {
  try {
    await warn(
      renderPoliciesText(recordPackagePolicies({ workspaceRoot, runId, repo }))
    )
    const held = removeHeldPackages({ workspaceRoot, runId, repo })
    for (const line of heldPackageLines(held)) await warn(line)
  } catch (error) {
    await stopWithError(warn, error)
  }
}

const unclassifiedRowsOf = (workspaceRoot, runId, repo) => {
  const path = packagesPath(runFolder(workspaceRoot, runId), repo)
  if (!existsSync(path)) return []
  return (readJson(path).packages ?? []).filter(
    (row) => row.classification === null || row.classification === undefined
  )
}

const prebakeRepo = async ({ workspaceRoot, runId, repo }) => {
  for (const row of unclassifiedRowsOf(workspaceRoot, runId, repo)) {
    await prebakeContext({
      workspaceRoot,
      runId,
      repo,
      packageName: row.package
    })
  }
}

const unattendedFieldsOf = (row) => ({
  mode: 'unattended',
  policy: row.policy ?? null,
  set: row.set ?? null
})

const plannerTaskOf =
  (runId, repo, { unattended }) =>
  (row) => ({
    ticket: runId,
    repo,
    package: row.package ?? null,
    current: row.current ?? null,
    target: row.target ?? null,
    upgrade_type: row.upgrade_type ?? null,
    dependency_type: row.dependency_type ?? null,
    context_baked: row.context_baked ?? null,
    context_missing: row.context_missing ?? null,
    ...(unattended && unattendedFieldsOf(row))
  })

/**
 * Phase 1: once a green phase 0 covers every repo, discover each repo's
 * outdated packages, bake its best-practice bundle and pre-bake each
 * unclassified package's context. The result is one PACKAGE_PLANNER task
 * per unclassified package. An unattended run also records each package's
 * merge policy, takes out each package a hold covers with a line naming
 * the hold, and gives each task its mode, policy and set.
 *
 * @param {object} request
 * @param {string} request.workspaceRoot
 * @param {string} request.runId
 * @param {string[]} request.repos
 * @param {string} request.strategy - latest, minor or patch
 * @param {string[]} [request.packages] - Only these packages, with * as a wildcard
 * @param {boolean} [request.unattended]
 * @param {(line: string) => Promise<void>} request.warn
 * @returns {Promise<{exitCode: number, result: object[], text: string}>}
 * @throws {PhaseStopped} when the phase 0 gate refuses, a discovery fails or a policy cannot be recorded
 */
export const discoverPhase = async (request) => {
  const { workspaceRoot, runId, repos, unattended = false, warn } = request
  await requireGreenPhase0(request)
  mkdirSync(runFolder(workspaceRoot, runId), { recursive: true })
  for (const repo of repos) {
    await warn(`Discovering ${repo}...`)
    await discoverOne({ ...request, repo })
    if (unattended) await recordPoliciesOf({ ...request, repo })
  }
  for (const repo of repos) bakeBestPractices({ workspaceRoot, runId, repo })
  await warn('Pre-baking per-package context...')
  for (const repo of repos) await prebakeRepo({ workspaceRoot, runId, repo })
  const tasks = repos.flatMap((repo) =>
    unclassifiedRowsOf(workspaceRoot, runId, repo).map(
      plannerTaskOf(runId, repo, { unattended })
    )
  )
  await warn('')
  await warn(
    'Phase 1 setup complete. Spawn one PACKAGE_PLANNER per MANIFEST entry,'
  )
  await warn(`then run: tim npm packages verify --run-id ${runId}`)
  return {
    exitCode: 0,
    result: tasks,
    text: [
      'MANIFEST_BEGIN',
      ...tasks.map((task) => JSON.stringify(task)),
      'MANIFEST_END'
    ].join('\n')
  }
}
