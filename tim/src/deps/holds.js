import { TimError } from '../errors.js'
import {
  assertHoldReposInScope,
  holdSchema,
  holdScopesOf,
  loadDependencySets,
  writeHolds
} from './dependency-sets.js'

const assertValidHold = (hold) => {
  const parsed = holdSchema.safeParse(hold)
  if (!parsed.success) {
    const [issue] = parsed.error.issues
    throw new TimError(
      'USAGE',
      `The hold's ${issue.path.join('.')} ${issue.message}.`
    )
  }
}

const sortedUnique = (repos) => [...new Set(repos)].sort()

const holdOf = (
  {
    package: packageName,
    versions,
    repos,
    reason,
    failingTest,
    clashesWith,
    link
  },
  today
) => ({
  package: packageName,
  versions,
  repos: sortedUnique(repos),
  reason,
  failingTest,
  ...(clashesWith ? { clashesWith } : {}),
  ...(link ? { link } : {}),
  since: today
})

const holdsWith = (holds, hold) =>
  holds.some((existing) => existing.package === hold.package)
    ? holds.map((existing) =>
        existing.package === hold.package ? hold : existing
      )
    : [...holds, hold]

/**
 * The local calendar date of a moment, as YYYY-MM-DD.
 *
 * @param {Date} moment
 * @returns {string}
 */
export const localDateOf = (moment) =>
  [
    moment.getFullYear(),
    String(moment.getMonth() + 1).padStart(2, '0'),
    String(moment.getDate()).padStart(2, '0')
  ].join('-')

/**
 * Add the hold for a package to `config/dependency-sets.json`, or replace
 * the one it has. The package is an npm name, held in repos in scope for
 * the sets, or a Maven `groupId:artifactId`, held in repos whose Maven
 * updates are generated.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {{package: string, versions: string, repos: string[], reason: string, failingTest: string, clashesWith?: string, link?: string}} args.request
 * @param {string} args.today - YYYY-MM-DD, recorded as the hold's `since`
 * @returns {{hold: object, replaced: object|null, regenerate: string[]}}
 *   `regenerate` lists the repos, sorted, whose Dependabot config the change
 *   moves: those the new hold covers and those the replaced one covered.
 * @throws {TimError} USAGE when the hold is malformed or names a repo out of scope
 */
export const holdPackage = ({ workspaceRoot, request, today }) => {
  const hold = holdOf(request, today)
  assertValidHold(hold)
  const dependencySets = loadDependencySets(workspaceRoot)
  assertHoldReposInScope(hold, holdScopesOf(workspaceRoot, dependencySets))
  const replaced =
    dependencySets.holds.find(
      (existing) => existing.package === hold.package
    ) ?? null
  writeHolds(workspaceRoot, holdsWith(dependencySets.holds, hold))
  return {
    hold,
    replaced,
    regenerate: sortedUnique([...hold.repos, ...(replaced?.repos ?? [])])
  }
}

/**
 * Remove the hold for a package from `config/dependency-sets.json`.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.packageName
 * @returns {{lifted: object, regenerate: string[]}} `regenerate` lists the repos the hold covered, sorted
 * @throws {TimError} NOT_FOUND when the package is not held
 */
export const liftHold = ({ workspaceRoot, packageName }) => {
  const { holds } = loadDependencySets(workspaceRoot)
  const lifted = holds.find((hold) => hold.package === packageName)
  if (!lifted) {
    throw new TimError(
      'NOT_FOUND',
      `${packageName} is not held. Run tim deps holds to see the held packages.`
    )
  }
  writeHolds(
    workspaceRoot,
    holds.filter((hold) => hold !== lifted)
  )
  return { lifted, regenerate: sortedUnique(lifted.repos) }
}
