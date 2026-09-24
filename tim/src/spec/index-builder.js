import { relative, resolve, sep } from 'node:path'
import { run as runProcess } from '../exec/exec.js'
import { TimError } from '../errors.js'

const toPosixRelative = (root, path) =>
  relative(root, path).split(sep).join('/')

const bracketPositions = (text) =>
  [...text.matchAll(/[{[]/g)].map((match) => match.index).sort((a, b) => a - b)

// npm prints script banners before the JSON, and a fit repo's test:fit
// script runs webpack first — whose own log lines (e.g.
// "[webpack-cli] Compiler starting...") can contain an earlier, unrelated
// `[` or `{`. So try every bracket position in order and keep the first
// one that parses as a *complete* JSON document, rather than trusting the
// first bracket in the text is where the JSON starts.
const firstJsonValue = (text) => {
  for (const start of bracketPositions(text)) {
    try {
      return JSON.parse(text.slice(start))
    } catch {
      // Not the real start — a log line's stray bracket, or the JSON
      // continues past this point. Try the next candidate.
    }
  }
  throw new TimError('PARSE', "Expected JSON but the runner's stdout had none.")
}

const leafOf = (title) => title.split(' > ').at(-1)

/**
 * Normalise Vitest's flat `list --json` array into `{file, title,
 * fullTitle}` rows. `name` is the full describe-chain title joined by
 * " > "; coverage.json records the leaf, so both are kept and either is
 * accepted at resolve time.
 *
 * @param {{name: string, file: string}[]} entries
 * @param {string} repoPath
 * @returns {{file: string, title: string, fullTitle: string}[]}
 */
const normaliseVitest = (entries, repoPath) =>
  entries.map((entry) => ({
    file: toPosixRelative(repoPath, entry.file),
    title: leafOf(entry.name),
    fullTitle: entry.name
  }))

const walkPlaywrightSuites = (suites = []) =>
  suites.flatMap((suite) => [
    ...(suite.specs ?? []),
    ...walkPlaywrightSuites(suite.suites)
  ])

/**
 * Normalise Playwright's nested `suites[]` tree from `--list
 * --reporter=json`. A spec's `file` is testDir-relative and may start
 * `../` — resolve it against `config.rootDir`, then make it repo-relative.
 * `endsWith` is not sufficient here: it silently missed 5 of 319 animals
 * fit links.
 *
 * @param {{config: {rootDir: string}, suites: object[]}} parsed
 * @param {string} repoPath
 * @returns {{file: string, title: string, fullTitle: string}[]}
 */
const normalisePlaywright = (parsed, repoPath) => {
  const rootDir = parsed.config.rootDir
  return walkPlaywrightSuites(parsed.suites).map((spec) => ({
    file: toPosixRelative(repoPath, resolve(rootDir, spec.file)),
    title: spec.title,
    fullTitle: spec.title
  }))
}

const runList = async ({ repoPath, command, args, run }) => {
  const result = await run(command, args, { cwd: repoPath })
  return firstJsonValue(result.stdout)
}

/**
 * The unit-test title index for one repo. Bare `npx vitest list --json`
 * — Vitest auto-discovers its own config from the cwd, and list mode runs
 * nothing.
 *
 * @param {object} args
 * @param {string} args.repoPath
 * @param {Function} [args.run] - The subprocess seam; defaults to tim's exec.run
 * @returns {Promise<{file: string, title: string, fullTitle: string}[]>}
 */
export const buildUnitIndex = async ({ repoPath, run = runProcess }) =>
  normaliseVitest(
    await runList({
      repoPath,
      command: 'npx',
      args: ['vitest', 'list', '--json'],
      run
    }),
    repoPath
  )

/**
 * The fit-suite title index for one repo, via its own `test:fit` script —
 * not `test:fit:ci`, whose CI-only flags (retries, extra reporters) land
 * before ours on the command line and would collide with
 * `--reporter=json`. `--list` runs nothing.
 *
 * @param {object} args
 * @param {string} args.repoPath
 * @param {Function} [args.run]
 * @returns {Promise<{file: string, title: string, fullTitle: string}[]>}
 */
export const buildFitIndex = async ({ repoPath, run = runProcess }) =>
  normalisePlaywright(
    await runList({
      repoPath,
      command: 'npm',
      args: ['run', 'test:fit', '--', '--list', '--reporter=json'],
      run
    }),
    repoPath
  )

/**
 * The e2e title index for the tests repo, covering all four Playwright
 * projects in one call. `_test_docker_compose`, not `test:docker-compose`
 * — the latter's `--grep-invert '@a11y|@active'` would omit those specs,
 * making their links read unresolved. `--list` needs no running stack.
 *
 * @param {object} args
 * @param {string} args.repoPath
 * @param {Function} [args.run]
 * @returns {Promise<{file: string, title: string, fullTitle: string}[]>}
 */
export const buildE2eIndex = async ({ repoPath, run = runProcess }) =>
  normalisePlaywright(
    await runList({
      repoPath,
      command: 'npm',
      args: ['run', '_test_docker_compose', '--', '--list', '--reporter=json'],
      run
    }),
    repoPath
  )
