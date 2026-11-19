import { z } from 'zod'
import { loadDependencySets } from '../../deps/dependency-sets.js'
import { mergePolicyFor, setOfPackage } from '../../deps/policy.js'
import { isTimError } from '../../errors.js'
import { writeJsonAtomic } from '../../review/store.js'
import { packagesPath, readPackagesFile, runFolder } from '../state.js'

/**
 * The merge policy fields a package row of `packages.<repo>.json` holds
 * once its policy is recorded.
 */
export const packagePolicySchema = z.object({
  policy: z.enum(['ci-is-enough', 'changelog-driven', 'held']),
  set: z.string().min(1).nullable(),
  set_scope: z.enum(['repo', 'cross-repo']).nullable(),
  policy_reason: z.string().min(1)
})

const isUsageError = (error) => isTimError(error) && error.code === 'USAGE'

const policyForUnreadableVersions = (dependencySets, row) => {
  const set = setOfPackage(dependencySets.sets, row.package)
  return {
    policy: 'changelog-driven',
    set: set?.name ?? null,
    set_scope: set?.scope ?? null,
    policy_reason: `tim cannot compare ${row.current} with ${row.target}, so read the changelog before you merge it.`
  }
}

/**
 * The merge policy fields for one package row of a repo, from its current
 * and target versions. A target a hold on the repo covers is `held`. A row
 * whose versions are not exact, or do not go up, is `changelog-driven`.
 *
 * @param {{defaults: {majorPolicy: string}, sets: object[], holds: object[]}} dependencySets - From `loadDependencySets`
 * @param {{package: string, current: string, target: string}} row
 * @param {string} repo
 * @returns {{policy: string, set: string|null, set_scope: string|null, policy_reason: string}}
 */
export const packagePolicyOf = (dependencySets, row, repo) => {
  try {
    const { policy, set, scope, reason } = mergePolicyFor({
      dependencySets,
      packageName: row.package,
      from: row.current,
      to: row.target,
      repo
    })
    return packagePolicySchema.parse({
      policy,
      set,
      set_scope: scope,
      policy_reason: reason
    })
  } catch (error) {
    if (!isUsageError(error)) throw error
    return policyForUnreadableVersions(dependencySets, row)
  }
}

/**
 * The recorded merge policy of a package row, or null when the row has no
 * valid policy fields.
 *
 * @param {object} row - A row of `packages.<repo>.json`
 * @returns {{policy: string, set: string|null, set_scope: string|null, policy_reason: string} | null}
 */
export const recordedPolicyOf = (row) => {
  const parsed = packagePolicySchema.safeParse(row)
  return parsed.success ? parsed.data : null
}

/**
 * Records the merge policy of every package in one repo's
 * `packages.<repo>.json`, read from `config/dependency-sets.json`.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.runId
 * @param {string} args.repo
 * @returns {{path: string, packages: {package: string, policy: string, set: string|null, set_scope: string|null, policy_reason: string}[]}}
 * @throws {TimError} NOT_FOUND when the packages file or the dependency sets are missing; PARSE when the dependency sets are malformed
 */
export const recordPackagePolicies = ({ workspaceRoot, runId, repo }) => {
  const dependencySets = loadDependencySets(workspaceRoot)
  const path = packagesPath(runFolder(workspaceRoot, runId), repo)
  const packagesFile = readPackagesFile(path)
  const rows = (packagesFile.packages ?? []).map((row) => ({
    ...row,
    ...packagePolicyOf(dependencySets, row, repo)
  }))
  writeJsonAtomic(path, { ...packagesFile, packages: rows })
  return {
    path,
    packages: rows.map((row) => ({
      package: row.package,
      ...recordedPolicyOf(row)
    }))
  }
}

const isHeld = (row) => row.policy === 'held'

/**
 * Takes every row whose recorded policy is `held` out of one repo's
 * `packages.<repo>.json`, so the run leaves those packages where they are.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.runId
 * @param {string} args.repo
 * @returns {{package: string, target: string, policy_reason: string}[]} The rows taken out, in file order
 * @throws {TimError} NOT_FOUND when the packages file is missing
 */
export const removeHeldPackages = ({ workspaceRoot, runId, repo }) => {
  const path = packagesPath(runFolder(workspaceRoot, runId), repo)
  const packagesFile = readPackagesFile(path)
  const rows = packagesFile.packages ?? []
  const held = rows.filter(isHeld)
  if (held.length > 0) {
    writeJsonAtomic(path, {
      ...packagesFile,
      packages: rows.filter((row) => !isHeld(row))
    })
  }
  return held.map(
    ({ package: packageName, target, policy_reason: reason }) => ({
      package: packageName,
      target,
      policy_reason: reason
    })
  )
}

/**
 * @param {ReturnType<typeof removeHeldPackages>} held
 * @returns {string[]} One line per package the run leaves where it is, with the hold's reason
 */
export const heldPackageLines = (held) =>
  held.map(
    ({ package: packageName, target, policy_reason: reason }) =>
      `Skipping ${packageName} ${target}: ${reason}`
  )

const policyLine = ({ package: packageName, policy, set, set_scope: scope }) =>
  set
    ? `${packageName}: ${policy} (set ${set}, ${scope})`
    : `${packageName}: ${policy}`

/**
 * @param {ReturnType<typeof recordPackagePolicies>} recorded
 * @returns {string} One line per package: its name, policy and set
 */
export const renderPoliciesText = ({ packages }) =>
  packages.length === 0
    ? 'The packages file lists no packages.'
    : packages.map(policyLine).join('\n')
