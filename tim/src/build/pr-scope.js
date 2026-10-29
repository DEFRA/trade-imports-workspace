import { join } from 'node:path'
import { readJsonFile } from '../backlog/io.js'

export const PR_SCOPE_PATH = join('config', 'e2e-tests-pr-scope.json')

const EVERY_SUITE = 'all'
const DEFAULT_KEY = 'default'

/**
 * The Playwright arguments that run what the pull requests of these repos run:
 * every repo's suites as path filters, and their tags as one alternated
 * `--grep`. An empty list runs every spec, which is what a repo whose entry
 * says `all` asks for.
 *
 * @param {object} scope The parsed e2e-tests-pr-scope.json
 * @param {string[]} folders Repo folder names to scope from
 * @returns {string[]} Arguments to pass after `--`, possibly empty
 */
export const prScopeArgs = (scope, folders) => {
  if (folders.length === 0) return []
  const entries = folders.map((folder) => scope[folder] ?? scope[DEFAULT_KEY])
  const runsEverySuite = entries.some((entry) =>
    (entry?.suites ?? [EVERY_SUITE]).includes(EVERY_SUITE)
  )
  if (runsEverySuite) return []
  const suites = [...new Set(entries.flatMap((entry) => entry.suites))]
  const tags = [...new Set(entries.flatMap((entry) => entry.tags ?? []))]
  return tags.length === 0 ? suites : [...suites, '--grep', tags.join('|')]
}

/**
 * @param {string} workspaceRoot
 * @returns {object} The parsed e2e-tests-pr-scope.json
 * @throws {TimError} NOT_FOUND or PARSE
 */
export const loadPrScope = (workspaceRoot) =>
  readJsonFile(join(workspaceRoot, PR_SCOPE_PATH))
