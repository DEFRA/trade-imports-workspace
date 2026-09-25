import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { CANONICAL_WORKSPACE_PATH } from '../env/workspace-root.js'
import { TimError } from '../errors.js'

const MANIFEST_FILE = 'repos.json'

/**
 * Where the repo roster can live, in precedence order. The first entry is the
 * manifest sitting beside this checkout's `tim/`, which is what a workspace
 * clone (or `npm link`) resolves. `npm i -g .` copies `tim/` alone, so a
 * globally installed tim falls back to `TIM_WORKSPACE` and then to the
 * canonical path CLAUDE.md rule 1 mandates.
 */
const manifestCandidates = () => [
  fileURLToPath(new URL(`../../../${MANIFEST_FILE}`, import.meta.url)),
  ...(process.env.TIM_WORKSPACE
    ? [join(process.env.TIM_WORKSPACE, MANIFEST_FILE)]
    : []),
  join(CANONICAL_WORKSPACE_PATH, MANIFEST_FILE)
]

/**
 * Validate every manifest entry's optional `upstream` field: a non-empty
 * string naming a different repo already in the roster. Exported so
 * this shape can be unit-tested directly against fabricated manifests,
 * without reloading the module against a fixture file on disk.
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

const readManifest = () => {
  const candidates = manifestCandidates()
  const path = candidates.find((candidate) => existsSync(candidate))
  if (!path) {
    throw new TimError(
      'USAGE',
      `Cannot find the repo roster ${MANIFEST_FILE}. Looked in: ${candidates.join(', ')}.`
    )
  }
  const parsed = JSON.parse(readFileSync(path, 'utf8'))
  assertValidUpstreams(parsed)
  return parsed
}

const manifest = readManifest()

const namesWithStack = (stack) =>
  manifest.repos.filter((repo) => repo.stack === stack).map((repo) => repo.name)

export const REPOS_DIR = manifest.reposDir

export const NODE_REPOS = Object.freeze(namesWithStack('node'))

export const JAVA_REPOS = Object.freeze(namesWithStack('java'))

export const REPOS = Object.freeze([...NODE_REPOS, ...JAVA_REPOS])

export const UNIT_TEST_EXEMPT_REPOS = Object.freeze(
  manifest.repos.filter((repo) => repo.unitTestExempt).map((repo) => repo.name)
)

export const repoPath = (workspaceRoot, repoName) =>
  join(workspaceRoot, REPOS_DIR, repoName)

/**
 * Repo path with every symlink resolved. `npm --prefix` walks up from the
 * path it is given, so a path through a symlink lands npm on the wrong
 * package root and it rejects the lockfile. The workspace is mandated to
 * live behind a symlink, so npm invocations must use this, not `repoPath`.
 * Falls back to the plain path when the repo is not cloned yet.
 */
export const realRepoPath = (workspaceRoot, repoName) => {
  const path = repoPath(workspaceRoot, repoName)
  return existsSync(path) ? realpathSync(path) : path
}

/**
 * Repo name -> declared upstream repo name, for the repos that carry an
 * optional `"upstream"` manifest field (e.g. a designer prototype that
 * regularly takes changes from its real-service twin).
 */
export const UPSTREAM_REPOS = Object.freeze(
  Object.fromEntries(
    manifest.repos
      .filter((repo) => repo.upstream !== undefined)
      .map((repo) => [repo.name, repo.upstream])
  )
)

/**
 * @param {string} repoName
 * @returns {string | null} The declared upstream repo name, or null when
 *   the manifest sets none for this repo.
 */
export const upstreamOf = (repoName) => UPSTREAM_REPOS[repoName] ?? null

export const isNodeRepo = (repoName) => NODE_REPOS.includes(repoName)

export const isJavaRepo = (repoName) => JAVA_REPOS.includes(repoName)

export const GITHUB_ORG = manifest.githubOrg

/**
 * Clone URL for a repo. `TIM_GITHUB_BASE_URL` overrides the GitHub
 * prefix so tests can clone from local bare fixtures; read at call
 * time so spawned-CLI tests only need to set the env var.
 */
export const repoUrl = (repoName) =>
  `${process.env.TIM_GITHUB_BASE_URL ?? `https://github.com/${GITHUB_ORG}`}/${repoName}.git`
