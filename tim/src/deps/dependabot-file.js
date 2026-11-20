import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { TimError } from '../errors.js'
import {
  assertHoldsInScope,
  assertReposInScope,
  loadDependencySets,
  reposInScope
} from './dependency-sets.js'
import { renderDependabotConfig } from './dependabot.js'
import { WORKSPACE_NPM_PROJECT, depsCheckoutPath } from './checkout.js'

export const DEPENDABOT_MODES = ['print', 'write', 'check']

const dependabotTargetOf = (repo) => {
  if (repo === WORKSPACE_NPM_PROJECT) {
    return {
      path: join('.github', 'dependabot.yml'),
      directories: {
        npm: `/${WORKSPACE_NPM_PROJECT}`,
        actions: ['/', '/.github/actions/*']
      }
    }
  }
  return {
    path: join('repos', repo, '.github', 'dependabot.yml'),
    directories: { npm: '/', actions: ['/'] }
  }
}

const assertRepoCanTakeConfig = (workspaceRoot, repo, inScope) => {
  assertReposInScope([repo], inScope)
  const checkout = depsCheckoutPath(workspaceRoot, repo)
  if (!existsSync(checkout)) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find ${repo} at ${checkout}. This command writes Dependabot config for repos cloned under repos/, and for the workspace's own tim folder.`
    )
  }
}

const readCurrent = (path) =>
  existsSync(path) ? readFileSync(path, 'utf8') : null

/**
 * Generate a repo's `.github/dependabot.yml` from the workspace's coupled
 * package sets, then print it, write it or compare it with the file. For
 * `tim` the file is the workspace's own, at its root, with npm updates for
 * the `tim` folder and GitHub Actions updates for its workflows and
 * composite actions.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.repo - A repo in scope for the sets, cloned under `repos/`, or `tim`
 * @param {'print'|'write'|'check'} args.mode
 * @returns {{repo: string, path: string, mode: string, upToDate: boolean, written: boolean, content: string}}
 *   `path` is relative to the workspace root. `upToDate` says whether the
 *   file matched the generated text before anything was written.
 * @throws {TimError} USAGE when the repo, or a repo a hold covers, is not in scope; NOT_FOUND when the repo is not cloned
 */
export const syncDependabotConfig = ({ workspaceRoot, repo, mode }) => {
  const dependencySets = loadDependencySets(workspaceRoot)
  const inScope = reposInScope(workspaceRoot, dependencySets)
  assertHoldsInScope(dependencySets.holds, inScope)
  assertRepoCanTakeConfig(workspaceRoot, repo, inScope)
  const { path, directories } = dependabotTargetOf(repo)
  const absolutePath = join(workspaceRoot, path)
  const content = renderDependabotConfig({
    repo,
    dependencySets,
    directories
  })
  const upToDate = readCurrent(absolutePath) === content
  const written = mode === 'write' && !upToDate
  if (written) {
    mkdirSync(dirname(absolutePath), { recursive: true })
    writeFileSync(absolutePath, content)
  }
  return { repo, path, mode, upToDate, written, content }
}
