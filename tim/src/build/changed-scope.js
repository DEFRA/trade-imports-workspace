const PASS_WITH_NO_TESTS = '--pass-with-no-tests'
const COVERED_SUFFIX = '-covered'

/**
 * The Playwright runs that cover a branch's own change, rather than its repos'
 * whole suites: the specs the change reaches through the import graph, then the
 * specs the Behaviour Spec links to the scenarios the change touches.
 *
 * Playwright intersects a path filter with `--only-changed`, so a covered spec
 * that the import graph does not reach would be filtered out of a single run.
 * They are therefore two runs, as a pr-scope suite run and tag run are, and a
 * run's `suffix` is added to the rung's name.
 *
 * Both runs pass with no tests. A row that changes no spec and no page object
 * has nothing for the import graph to reach, and a rung that fails because the
 * change was narrow would say the opposite of what it means.
 *
 * @param {object} args
 * @param {string} args.base The ref the branch is compared against, such as origin/main
 * @param {string[]} [args.specs] Spec paths the change's scenarios are proved by
 * @returns {{suffix: string, args: string[]}[]} A changed run, then a covered run where there are specs
 */
export const changedScopeRuns = ({ base, specs = [] }) => {
  const changed = {
    suffix: '',
    args: [`--only-changed=${base}`, PASS_WITH_NO_TESTS]
  }
  if (specs.length === 0) return [changed]
  return [
    changed,
    { suffix: COVERED_SUFFIX, args: [...specs, PASS_WITH_NO_TESTS] }
  ]
}
