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

const readManifest = () => {
  const candidates = manifestCandidates()
  const path = candidates.find((candidate) => existsSync(candidate))
  if (!path) {
    throw new TimError(
      'USAGE',
      `Cannot find the repo roster ${MANIFEST_FILE}. Looked in: ${candidates.join(', ')}.`
    )
  }
  return JSON.parse(readFileSync(path, 'utf8'))
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
