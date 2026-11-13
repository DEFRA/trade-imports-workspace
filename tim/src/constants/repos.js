import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { TimError } from '../errors.js'

const MANIFEST_FILE = 'repos.json'

const bundledManifestPath = () =>
  fileURLToPath(new URL(`../../../${MANIFEST_FILE}`, import.meta.url))

const manifestPathFor = (workspaceRoot) => {
  const candidates = [join(workspaceRoot, MANIFEST_FILE), bundledManifestPath()]
  const path = candidates.find((candidate) => existsSync(candidate))
  if (!path) {
    throw new TimError(
      'USAGE',
      `Cannot find the repo roster ${MANIFEST_FILE}. Looked in: ${candidates.join(', ')}.`
    )
  }
  return path
}

/**
 * Validate every manifest entry's optional `upstream` field: a non-empty
 * string naming a different repo already in the roster.
 *
 * @throws {TimError} USAGE when any entry's `upstream` is malformed
 */
export const assertValidUpstreams = (manifest) => {
  const names = new Set(manifest.repos.map((repo) => repo.name))
  for (const repo of manifest.repos) {
    if (repo.upstream === undefined) continue
    if (typeof repo.upstream !== 'string' || repo.upstream.trim() === '') {
      throw new TimError(
        'USAGE',
        `${MANIFEST_FILE}: "${repo.name}".upstream must be a non-empty string.`
      )
    }
    if (repo.upstream === repo.name) {
      throw new TimError(
        'USAGE',
        `${MANIFEST_FILE}: "${repo.name}".upstream cannot name itself.`
      )
    }
    if (!names.has(repo.upstream)) {
      throw new TimError(
        'USAGE',
        `${MANIFEST_FILE}: "${repo.name}".upstream "${repo.upstream}" is not a repo in the roster.`
      )
    }
  }
}

const namesWhere = (manifest, predicate) =>
  Object.freeze(manifest.repos.filter(predicate).map((repo) => repo.name))

const rosterFrom = (manifest) => {
  const nodeRepos = namesWhere(manifest, (repo) => repo.stack === 'node')
  const javaRepos = namesWhere(manifest, (repo) => repo.stack === 'java')
  return Object.freeze({
    reposDir: manifest.reposDir,
    githubOrg: manifest.githubOrg,
    nodeRepos,
    javaRepos,
    repos: Object.freeze([...nodeRepos, ...javaRepos]),
    unitTestExemptRepos: namesWhere(manifest, (repo) => repo.unitTestExempt),
    upstreamRepos: Object.freeze(
      Object.fromEntries(
        manifest.repos
          .filter((repo) => repo.upstream !== undefined)
          .map((repo) => [repo.name, repo.upstream])
      )
    ),
    unsyncedRepos: namesWhere(
      manifest,
      (repo) => repo.workspaceBranchSync === false
    )
  })
}

const rostersByManifestPath = new Map()

/**
 * The repo roster a workspace declares in its own `repos.json`. A root with
 * no `repos.json` gets the roster beside this copy of tim's code. Read once
 * per manifest file, on first use.
 *
 * @param {string} workspaceRoot
 * @returns {{reposDir: string, githubOrg: string, repos: string[],
 *   nodeRepos: string[], javaRepos: string[], unitTestExemptRepos: string[],
 *   upstreamRepos: Record<string, string>, unsyncedRepos: string[]}}
 * @throws {TimError} USAGE when no roster is found, or an `upstream` is malformed
 */
export const rosterOf = (workspaceRoot) => {
  const path = resolve(manifestPathFor(workspaceRoot))
  if (!rostersByManifestPath.has(path)) {
    const manifest = JSON.parse(readFileSync(path, 'utf8'))
    assertValidUpstreams(manifest)
    rostersByManifestPath.set(path, rosterFrom(manifest))
  }
  return rostersByManifestPath.get(path)
}

export const repoPath = (workspaceRoot, repoName) =>
  join(workspaceRoot, rosterOf(workspaceRoot).reposDir, repoName)

/**
 * Repo path with every symlink resolved. `npm --prefix` walks up from the
 * path it is given, so a path through a symlink lands npm on the wrong
 * package root and it rejects the lockfile. Falls back to the plain path
 * when the repo is not cloned yet.
 */
export const realRepoPath = (workspaceRoot, repoName) => {
  const path = repoPath(workspaceRoot, repoName)
  return existsSync(path) ? realpathSync(path) : path
}

/**
 * @param {string} workspaceRoot
 * @param {string} repoName
 * @returns {string | null} The declared upstream repo name, or null when
 *   the manifest sets none for this repo.
 */
export const upstreamOf = (workspaceRoot, repoName) =>
  rosterOf(workspaceRoot).upstreamRepos[repoName] ?? null

/**
 * Whether `tim workspace reset|branch|update` should touch this repo by
 * default. A repo opts out with `"workspaceBranchSync": false` in
 * `repos.json`. Defaults to true for every other repo.
 *
 * @param {string} workspaceRoot
 * @param {string} repoName
 * @returns {boolean}
 */
export const isWorkspaceBranchSynced = (workspaceRoot, repoName) =>
  !rosterOf(workspaceRoot).unsyncedRepos.includes(repoName)

/**
 * Split the roster into the repos a sync run touches and the ones it leaves
 * alone. A repo that opts out of branch sync is touched only when `include`
 * names it.
 *
 * @param {string} workspaceRoot
 * @param {string[]} [include]
 * @returns {{targets: string[], skipped: string[]}}
 */
export const partitionSyncTargets = (workspaceRoot, include = []) => {
  const included = new Set(include)
  const isTarget = (repo) =>
    isWorkspaceBranchSynced(workspaceRoot, repo) || included.has(repo)
  const { repos } = rosterOf(workspaceRoot)
  return {
    targets: repos.filter(isTarget),
    skipped: repos.filter((repo) => !isTarget(repo))
  }
}

/**
 * The plain-English line printed for a repo that `partitionSyncTargets`
 * skips, shared so `reset`, `branch` and `update` report it identically.
 *
 * @param {string} repoName
 * @returns {string}
 */
export const workspaceSyncSkipLine = (repoName) =>
  `Skipped ${repoName}: designers' work lives there. Add --include ${repoName} to include it.`

/**
 * Clone URL for a repo. `TIM_GITHUB_BASE_URL` overrides the GitHub prefix,
 * read at call time.
 *
 * @param {string} workspaceRoot
 * @param {string} repoName
 * @returns {string}
 */
export const repoUrl = (workspaceRoot, repoName) =>
  `${process.env.TIM_GITHUB_BASE_URL ?? `https://github.com/${rosterOf(workspaceRoot).githubOrg}`}/${repoName}.git`
