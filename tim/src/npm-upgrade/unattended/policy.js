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
  policy: z.enum(['ci-is-enough', 'changelog-driven']),
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
 * The merge policy fields for one package row, from its current and target
 * versions. A row whose versions are not exact, or do not go up, is
 * `changelog-driven`.
 *
 * @param {{defaults: {majorPolicy: string}, sets: object[]}} dependencySets - From `loadDependencySets`
 * @param {{package: string, current: string, target: string}} row
 * @returns {{policy: string, set: string|null, set_scope: string|null, policy_reason: string}}
 */
export const packagePolicyOf = (dependencySets, row) => {
  try {
    const { policy, set, scope, reason } = mergePolicyFor({
      dependencySets,
      packageName: row.package,
      from: row.current,
      to: row.target
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
    ...packagePolicyOf(dependencySets, row)
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
