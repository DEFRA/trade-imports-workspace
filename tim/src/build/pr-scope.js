import { join } from 'node:path'
import { readJsonFile } from '../backlog/io.js'

export const PR_SCOPE_PATH = join('config', 'e2e-tests-pr-scope.json')

const EVERY_SUITE = 'all'
const DEFAULT_KEY = 'default'
const TAGGED_SUFFIX = '-tagged'
const EVERY_SPEC = [{ suffix: '', args: [] }]

/**
 * The Playwright runs that cover what the pull requests of these repos run,
 * as the e2e workflow runs them: every repo's suites as path filters in one
 * run, then their tags as one alternated `--grep` in a second run over every
 * domain. A run's `suffix` is added to the rung's name. Empty `args` runs
 * every spec, which is what a repo whose entry says `all` asks for.
 *
 * @param {object} scope The parsed e2e-tests-pr-scope.json
 * @param {string[]} folders Repo folder names to scope from
 * @returns {{suffix: string, args: string[]}[]} One run, or a suite run then a tagged run
 */
export const prScopeRuns = (scope, folders) => {
  if (folders.length === 0) return EVERY_SPEC
  const entries = folders.map((folder) => scope[folder] ?? scope[DEFAULT_KEY])
  const runsEverySuite = entries.some((entry) =>
    (entry?.suites ?? [EVERY_SUITE]).includes(EVERY_SUITE)
  )
  if (runsEverySuite) return EVERY_SPEC
  const suites = [...new Set(entries.flatMap((entry) => entry.suites ?? []))]
  const tags = [...new Set(entries.flatMap((entry) => entry.tags ?? []))]
  const taggedArgs = ['--grep', tags.join('|')]
  if (tags.length === 0) return [{ suffix: '', args: suites }]
  if (suites.length === 0) return [{ suffix: '', args: taggedArgs }]
  return [
    { suffix: '', args: suites },
    { suffix: TAGGED_SUFFIX, args: taggedArgs }
  ]
}

/**
 * @param {string} workspaceRoot
 * @returns {object} The parsed e2e-tests-pr-scope.json
 * @throws {TimError} NOT_FOUND or PARSE
 */
export const loadPrScope = (workspaceRoot) =>
  readJsonFile(join(workspaceRoot, PR_SCOPE_PATH))
