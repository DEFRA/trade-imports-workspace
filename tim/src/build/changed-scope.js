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
 * work included: the ladder runs before the land stage, so a spec the row has
 * just written is untracked and a spec it has just edited is unstaged.
 *
 * Playwright's own `--only-changed` is not used, and cannot be: every spec in
 * the tests repo imports the `@fixtures` barrel, which imports the
 * `@page-objects` barrel and every domain's journey flows, so one page-object
 * edit makes every spec a dependent. Measured on 26 November 2026: one changed
 * animals page object selected 871 tests in 173 files, plants visual specs
 * included. The dependency graph says everything depends on everything, which
 * is true and useless. A page object, fixture or flow therefore selects no spec
 * of its own here, and the pull request's whole-suite run is its only proof.
 *
 * @param {string} repoPath Absolute path to the repo
 * @param {string} base The ref the branch left, such as origin/main
 * @returns {Promise<string[]>} Repo-relative spec paths, sorted
 * @throws {TimError} NOT_FOUND when the base is not in the repo
 */
export const changedSpecPaths = async (repoPath, base = DEFAULT_BASE) => {
  await assertBaseExists(repoPath, base)
  return (await changedFilesSince(repoPath, base)).filter(isSpecFile)
}

/**
 * The Playwright run that covers a change, rather than its repos' whole suites:
 * the spec files the branch changed, plus the specs the Behaviour Spec links to
 * the scenarios it touches.
 *
 * It passes with no tests, so a named covered spec the change deleted does not
 * fail the rung. No specs at all plans no run: a change that touches no spec
 * has nothing to prove against the stack, and the pull request runs the whole
 * suite either way.
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
