import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../errors.js'
import { run } from '../exec/exec.js'

export const INS_TESTS_FOLDER = join('repos', 'trade-imports-ins-tests')

const PLAYWRIGHT_LIST_ARGS = [
  '--no-install',
  'playwright',
  'test',
  '--list',
  '--reporter=json',
  '--config=playwright.docker-compose.config.ts'
]

/**
 * The ins-tests clone inside a workspace.
 *
 * @param {string} workspaceRoot
 * @returns {string}
 * @throws {TimError} MISSING_DEP when the clone is not there
 */
export const insTestsClone = (workspaceRoot) => {
  const tests = join(workspaceRoot, INS_TESTS_FOLDER)
  if (!existsSync(tests)) {
    throw new TimError('MISSING_DEP', `No ins-tests clone at ${tests}`)
  }
  return tests
}

/**
 * Playwright's JSON list of every test, run from inside the clone with a
 * relative config, as `npm run lint` does, so each spec's `file` is
 * relative to tests/. A run that fails but still prints a readable report
 * gives that report.
 *
 * @param {string} tests - The ins-tests clone
 * @returns {Promise<object>}
 * @throws {TimError} PARSE when Playwright prints no readable report
 */
export const listPlaywrightTests = async (tests) => {
  const listing = await run('npx', PLAYWRIGHT_LIST_ARGS, { cwd: tests })
  try {
    return JSON.parse(listing.stdout)
  } catch (error) {
    throw new TimError(
      'PARSE',
      `Playwright did not list the tests in ${tests} (exit ${listing.exitCode}): ${listing.stderr.trim()}`,
      error
    )
  }
}

const specsIn = (node) => {
  if (Array.isArray(node)) return node.flatMap(specsIn)
  if (node === null || typeof node !== 'object') return []
  const own = Object.hasOwn(node, 'specs') ? node.specs : []
  return [...own, ...Object.values(node).flatMap(specsIn)]
}

const withOneAt = (tag) => `@${tag.startsWith('@') ? tag.slice(1) : tag}`

const matches =
  ({ domain, type, tag }) =>
  (spec) =>
    (!domain || spec.file.startsWith(`${domain}/`)) &&
    (!type || spec.file.split('/')[1] === type) &&
    (!tag || spec.tags.includes(tag))

/**
 * Every spec in a Playwright list report, at any depth of nesting, with
 * its tags carrying one leading @, filtered by domain (the first folder of
 * `file`), test type (the second) and tag. An empty filter keeps every spec.
 *
 * @param {object} report - Playwright's `--list --reporter=json` output
 * @param {{domain?: string, type?: string, tag?: string}} [filters]
 * @returns {{file: string, line: number, title: string, tags: string[]}[]}
 */
export const specsFromReport = (report, filters = {}) =>
  specsIn(report)
    .map(({ file, line, title, tags }) => ({
      file,
      line,
      title,
      tags: (tags ?? []).map(withOneAt)
    }))
    .filter(matches(filters))

/**
 * The specs in the workspace's ins-tests clone with the tags each carries.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {{domain?: string, type?: string, tag?: string}} [args.filters]
 * @param {(tests: string) => Promise<object>} [args.listTests] - Gives Playwright's list report
 * @returns {Promise<{file: string, line: number, title: string, tags: string[]}[]>}
 */
export const listSpecs = async ({
  workspaceRoot,
  filters = {},
  listTests = listPlaywrightTests
}) => specsFromReport(await listTests(insTestsClone(workspaceRoot)), filters)
