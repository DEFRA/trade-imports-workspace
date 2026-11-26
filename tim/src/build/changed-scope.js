import {
  DEFAULT_BASE,
  assertBaseExists,
  changedFilesSince
} from './duplication.js'

const PASS_WITH_NO_TESTS = '--pass-with-no-tests'

const SPEC_FILE = /(^|\/)[^/]+\.spec\.[cm]?[jt]sx?$/

export { DEFAULT_BASE }

/**
 * @param {string} path
 * @returns {boolean} Whether Playwright would collect this path as a spec
 */
export const isSpecFile = (path) => SPEC_FILE.test(path)

/**
 * The spec files a repo has changed since it left the base, its uncommitted
 * work included. Imports are never followed, so a changed page object, fixture
 * or flow yields no spec: see "Choosing e2e" in
 * .claude/skills/requirements-pipeline/references/BUILD.md.
 *
 * @param {string} repoPath Absolute path to the repo
 * @param {string} base The ref the branch left, such as origin/main
 * @returns {Promise<string[]>} Repo-relative spec paths, sorted, deletions left out
 * @throws {TimError} NOT_FOUND when the base is not in the repo
 */
export const changedSpecPaths = async (repoPath, base = DEFAULT_BASE) => {
  await assertBaseExists(repoPath, base)
  return (await changedFilesSince(repoPath, base)).filter(isSpecFile)
}

/**
 * The Playwright run that covers a change, rather than its repos' whole suites.
 * Passes with no tests, so a covered spec that no longer exists does not fail
 * the rung. No specs at all plans no run at all.
 *
 * @param {object} args
 * @param {string[]} [args.specs] Spec paths the branch changed
 * @param {string[]} [args.coveredSpecs] Spec paths its scenarios are proved by
 * @returns {{suffix: string, args: string[]}[]} One run, or none
 */
export const changedScopeRuns = ({ specs = [], coveredSpecs = [] }) => {
  const everySpec = [...new Set([...specs, ...coveredSpecs])]
  if (everySpec.length === 0) return []
  return [{ suffix: '', args: [...everySpec, PASS_WITH_NO_TESTS] }]
}
