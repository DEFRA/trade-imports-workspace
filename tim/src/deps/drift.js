import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import semver from 'semver'
import { fetchOrigin } from '../commands/workspace/repo-state.js'
import { run } from '../exec/exec.js'
import { runNcu } from '../npm-upgrade/ncu.js'
import { depsCheckoutPath } from './checkout.js'
import {
  assertReposInScope,
  loadDependencySets,
  reposInScope
} from './dependency-sets.js'
import { setOfPackage } from './policy.js'

const JUMPS = ['major', 'minor', 'patch']

/**
 * How far a move from one declared range to another goes: `major`,
 * `minor` or `patch`, judged on the lowest version each range allows.
 * Null when either range names no version.
 *
 * @param {string} current
 * @param {string} proposed
 * @returns {'major' | 'minor' | 'patch' | null}
 */
export const jumpBetween = (current, proposed) => {
  if (!semver.validRange(current) || !semver.validRange(proposed)) return null
  const from = semver.minVersion(current)
  const to = semver.minVersion(proposed)
  if (from.major !== to.major) return 'major'
  if (from.minor !== to.minor) return 'minor'
  return 'patch'
}

const declaredRanges = ({ dependencies = {}, devDependencies = {} }) => ({
  ...devDependencies,
  ...dependencies
})

const isHeldFor = (holds, repo, packageName) =>
  holds.some(
    (hold) => hold.package === packageName && hold.repos.includes(repo)
  )

const packageDrift =
  ({ sets, holds, repo, declared }) =>
  ([name, proposed]) => ({
    package: name,
    current: declared[name],
    proposed,
    jump: jumpBetween(declared[name], proposed),
    set: setOfPackage(sets, name)?.name ?? null,
    held: isHeldFor(holds, repo, name)
  })

const countsOf = (packages) =>
  Object.fromEntries(
    JUMPS.map((jump) => [
      jump,
      packages.filter((entry) => entry.jump === jump).length
    ])
  )

const packageJsonAt = async (folder, ref) => {
  const result = await run('git', ['show', `${ref}:./package.json`], {
    cwd: folder
  })
  return result.exitCode === 0 ? result.stdout : null
}

const ncuUpgradesOf = async (packageJsonText) => {
  const folder = mkdtempSync(join(tmpdir(), 'tim-deps-drift-'))
  try {
    writeFileSync(join(folder, 'package.json'), packageJsonText)
    return await runNcu({ cwd: folder, target: 'latest' })
  } finally {
    rmSync(folder, { recursive: true, force: true })
  }
}

/**
 * The packages one repo's `package.json` at a ref could move to their
 * latest release, as npm-check-updates proposes them, each with its
 * jump, its set and whether a hold covers it in this repo.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.repo - A repo in scope for the dependency sets, or `tim`
 * @param {string} args.ref - The git ref to read `package.json` at, such as `origin/main`
 * @param {object[]} args.sets - `sets` from `loadDependencySets`
 * @param {object[]} args.holds - `holds` from `loadDependencySets`
 * @param {boolean} [args.fetch] - Fetch origin in the checkout before reading the ref
 * @returns {Promise<{repo: string, read: boolean, fetched?: boolean, packages: object[], counts: {major: number, minor: number, patch: number}}>} `read` is false when the repo has no checkout or no `package.json` at the ref. `fetched` is there only with `fetch`, and is false when there is no checkout or the fetch failed
 */
export const repoDrift = async ({
  workspaceRoot,
  repo,
  ref,
  sets,
  holds,
  fetch = false
}) => {
  const folder = depsCheckoutPath(workspaceRoot, repo)
  const cloned = existsSync(folder)
  const fetchedEntry = fetch
    ? { fetched: cloned && (await fetchOrigin(folder)) }
    : {}
  const text = cloned ? await packageJsonAt(folder, ref) : null
  if (text === null) {
    return {
      repo,
      read: false,
      ...fetchedEntry,
      packages: [],
      counts: countsOf([])
    }
  }
  const declared = declaredRanges(JSON.parse(text))
  const upgrades = await ncuUpgradesOf(text)
  const packages = Object.entries(upgrades)
    .map(packageDrift({ sets, holds, repo, declared }))
    .sort((left, right) => left.package.localeCompare(right.package))
  return {
    repo,
    read: true,
    ...fetchedEntry,
    packages,
    counts: countsOf(packages)
  }
}

const behindInSet = (setName) => (repoResult) =>
  repoResult.packages
    .filter((entry) => entry.set === setName)
    .map(({ package: packageName, current, proposed, held }) => ({
      repo: repoResult.repo,
      package: packageName,
      current,
      proposed,
      held
    }))

/**
 * Each cross-repo set with a newer release that at least one repo has not
 * taken yet: the repos behind, and the package, range and proposed range
 * in each.
 *
 * @param {object[]} sets - `sets` from `loadDependencySets`
 * @param {object[]} repoResults - From {@link repoDrift}
 * @returns {{set: string, behind: object[]}[]}
 */
export const crossRepoSetsBehind = (sets, repoResults) =>
  sets
    .filter((set) => set.scope === 'cross-repo' && set.members.length > 0)
    .map((set) => ({
      set: set.name,
      behind: repoResults.flatMap(behindInSet(set.name))
    }))
    .filter(({ behind }) => behind.length > 0)

const driftOfEach = async (repos, request) => {
  const results = []
  for (const repo of repos) {
    results.push(await repoDrift({ ...request, repo }))
  }
  return results
}

/**
 * Each repo's drift at the ref, read one repo at a time, and the
 * cross-repo sets some repo has not caught up with. With `fetch`, each
 * repo fetches origin first; a repo whose fetch fails is still read, from
 * its local ref, and marked `fetched: false`.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string[]} [args.repos] - Defaults to every repo in scope for the dependency sets
 * @param {string} args.ref
 * @param {boolean} [args.fetch] - Fetch origin in each checkout before reading the ref
 * @returns {Promise<{ref: string, repos: object[], setsBehind: object[]}>}
 * @throws {TimError} USAGE naming each repo given that is not in scope
 */
export const dependencyDrift = async ({
  workspaceRoot,
  repos,
  ref,
  fetch = false
}) => {
  const { sets, holds, ...dependencySets } = loadDependencySets(workspaceRoot)
  const inScope = reposInScope(workspaceRoot, dependencySets)
  if (repos) assertReposInScope(repos, inScope)
  const results = await driftOfEach(repos ?? inScope, {
    workspaceRoot,
    ref,
    sets,
    holds,
    fetch
  })
  return { ref, repos: results, setsBehind: crossRepoSetsBehind(sets, results) }
}
