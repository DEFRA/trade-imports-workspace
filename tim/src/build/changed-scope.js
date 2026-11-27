import { DEFAULT_BASE } from './duplication.js'

const PASS_WITH_NO_TESTS = '--pass-with-no-tests'

const SPEC_FILE = /(^|\/)[^/]+\.spec\.[cm]?[jt]sx?$/

export { DEFAULT_BASE }

/**
 * Whether Playwright would collect this path as a spec. Imports are never
 * followed, so a page object, fixture or flow is not one: see "Choosing e2e" in
 * .claude/skills/requirements-pipeline/references/BUILD.md.
 *
 * @param {string} path Repo-relative
 * @returns {boolean}
 */
export const isSpecFile = (path) => SPEC_FILE.test(path)

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
