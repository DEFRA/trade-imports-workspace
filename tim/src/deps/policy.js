import semver from 'semver'
import { TimError } from '../errors.js'

const CHANGELOG_DRIVEN = 'changelog-driven'
const CI_IS_ENOUGH = 'ci-is-enough'
const HELD = 'held'

const memberMatcher = (member) => {
  const escaped = member.replace(/[.+?^${}()|[\]\\/]/g, '\\$&')
  return new RegExp(`^${escaped.replaceAll('*', '.*')}$`)
}

/**
 * The first set with a member matching the package name, where `*` in a
 * member matches any run of characters, slashes included.
 *
 * @param {object[]} sets - `sets` from `loadDependencySets`
 * @param {string} packageName
 * @returns {object|undefined}
 */
export const setOfPackage = (sets, packageName) =>
  sets.find(({ members }) =>
    members.some((member) => memberMatcher(member).test(packageName))
  )

const exactVersion = (label, version) => {
  const cleaned = semver.clean(version ?? '')
  if (!cleaned) {
    throw new TimError(
      'USAGE',
      `${label} must be an exact version, such as 4.2.0. You gave "${version}".`
    )
  }
  return cleaned
}

const jumpOf = (from, to) => {
  if (semver.prerelease(to)) return 'prerelease'
  if (semver.major(from) !== semver.major(to)) return 'major'
  if (semver.minor(from) !== semver.minor(to)) return 'minor'
  return 'patch'
}

const holdOn = ({ holds, packageName, version, repo }) =>
  holds.find(
    (hold) =>
      hold.package === packageName &&
      (repo === undefined || hold.repos.includes(repo)) &&
      semver.satisfies(version, hold.versions)
  )

const heldPolicy = ({ package: packageName, versions, since, reason }, to) => ({
  policy: HELD,
  reason: `${packageName} ${to} is in the range ${versions} held since ${since}. ${reason} Run tim deps holds to see the hold.`
})

const isZeroMinor = (from, jump) => jump === 'minor' && semver.major(from) === 0

const policyOfJump = ({ packageName, from, to, jump, set, majorPolicy }) => {
  if (jump === 'prerelease') {
    return {
      policy: CHANGELOG_DRIVEN,
      reason: `${to} is a prerelease, so read its changelog before you merge it.`
    }
  }
  if (jump === 'major') {
    return {
      policy: majorPolicy,
      reason: `${from} to ${to} is a major upgrade, which takes the policy for majors in config/dependency-sets.json.`
    }
  }
  if (isZeroMinor(from, jump)) {
    return {
      policy: CHANGELOG_DRIVEN,
      reason: `${from} to ${to} moves the minor version of a 0.x package, which can break things like a major.`
    }
  }
  if (set) {
    return {
      policy: set.policy,
      reason: `${packageName} is in the ${set.name} set. ${set.reason}`
    }
  }
  return {
    policy: CI_IS_ENOUGH,
    reason: `${packageName} is in no set, and a ${jump} upgrade needs only green CI.`
  }
}

/**
 * The merge policy for moving one package from one version to another.
 * A target in a hold's `versions` range is `held`. Otherwise a prerelease
 * target and a 0.x minor are `changelog-driven`, a major takes
 * `defaults.majorPolicy`, anything else takes its set's policy, and a
 * package in no set is `ci-is-enough`.
 *
 * @param {object} args
 * @param {{defaults: {majorPolicy: string}, sets: object[], holds: object[]}} args.dependencySets - From `loadDependencySets`
 * @param {string} args.packageName
 * @param {string} args.from - An exact version, with or without a leading v
 * @param {string} args.to - An exact version later than `from`
 * @param {string} [args.repo] - Only the holds covering this repo count; every hold counts when it is left out
 * @returns {{package: string, from: string, to: string, jump: 'major'|'minor'|'patch'|'prerelease', set: string|null, scope: string|null, hold: object|null, policy: 'ci-is-enough'|'changelog-driven'|'held', reason: string}}
 * @throws {TimError} USAGE when a version is not exact, or `to` is not later than `from`
 */
export const mergePolicyFor = ({
  dependencySets,
  packageName,
  from,
  to,
  repo
}) => {
  const fromVersion = exactVersion('--from', from)
  const toVersion = exactVersion('--to', to)
  if (!semver.gt(toVersion, fromVersion)) {
    throw new TimError(
      'USAGE',
      `--to must be a later version than --from. You gave ${fromVersion} to ${toVersion}.`
    )
  }
  const jump = jumpOf(fromVersion, toVersion)
  const set = setOfPackage(dependencySets.sets, packageName)
  const hold = holdOn({
    holds: dependencySets.holds,
    packageName,
    version: toVersion,
    repo
  })
  const { policy, reason } = hold
    ? heldPolicy(hold, toVersion)
    : policyOfJump({
        packageName,
        from: fromVersion,
        to: toVersion,
        jump,
        set,
        majorPolicy: dependencySets.defaults.majorPolicy
      })
  return {
    package: packageName,
    from: fromVersion,
    to: toVersion,
    jump,
    set: set?.name ?? null,
    scope: set?.scope ?? null,
    hold: hold ?? null,
    policy,
    reason
  }
}
