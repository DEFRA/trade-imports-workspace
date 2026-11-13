import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { TimError } from '../errors.js'
import { loadDependencySets, reposInScope } from './dependency-sets.js'
import { renderDependabotConfig } from './dependabot.js'

export const DEPENDABOT_MODES = ['print', 'write', 'check']

const assertRepoCanTakeConfig = (workspaceRoot, repo, inScope) => {
  if (!inScope.includes(repo)) {
    throw new TimError(
      'USAGE',
      `${repo} is not in scope for the dependency sets. Repos in scope: ${inScope.join(', ')}.`
    )
  }
  if (!existsSync(join(workspaceRoot, 'repos', repo))) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find ${repo} under repos/. This command writes Dependabot config for repos cloned there.`
    )
  }
}

const readCurrent = (path) =>
  existsSync(path) ? readFileSync(path, 'utf8') : null

/**
 * Generate a repo's `.github/dependabot.yml` from the workspace's coupled
 * package sets, then print it, write it or compare it with the file.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.repo - A repo in scope for the sets, cloned under `repos/`
 * @param {'print'|'write'|'check'} args.mode
 * @returns {{repo: string, path: string, mode: string, upToDate: boolean, written: boolean, content: string}}
 *   `path` is relative to the workspace root. `upToDate` says whether the
 *   file matched the generated text before anything was written.
 * @throws {TimError} USAGE when the repo is not in scope, NOT_FOUND when it is not cloned
 */
export const syncDependabotConfig = ({ workspaceRoot, repo, mode }) => {
  const dependencySets = loadDependencySets(workspaceRoot)
  assertRepoCanTakeConfig(
    workspaceRoot,
    repo,
    reposInScope(workspaceRoot, dependencySets)
  )
  const path = join('repos', repo, '.github', 'dependabot.yml')
  const absolutePath = join(workspaceRoot, path)
  const content = renderDependabotConfig({ repo, dependencySets })
  const upToDate = readCurrent(absolutePath) === content
  const written = mode === 'write' && !upToDate
  if (written) {
    mkdirSync(dirname(absolutePath), { recursive: true })
    writeFileSync(absolutePath, content)
  }
  return { repo, path, mode, upToDate, written, content }
}
