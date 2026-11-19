import { TimError } from '../errors.js'

export const SCOPE_PATH = 'config/e2e-tests-pr-scope.json'

const SUITE_PATTERN = /^tests\/[A-Za-z0-9._/-]+$/
const TAG_PATTERN = /^@[A-Za-z0-9_-]+$/

const invalid = (message) => new TimError('PARSE', message)

// The Bash split a list on commas and on the shell's default IFS (space,
// tab and newline), so these do the same and nothing more.
const entriesOf = (list) =>
  list
    .replaceAll(',', ' ')
    .split(/[ \t\n]+/)
    .filter(Boolean)

const unique = (entries) => [...new Set(entries)]

/**
 * A space- or comma-separated list as single-space-separated words. Only
 * the first line counts: the Bash read the list with `read`, which stops
 * at a newline.
 *
 * @param {string} list
 * @returns {string}
 */
export const scopeWords = (list) => entriesOf(list.split('\n')[0]).join(' ')

const configKeyFor = (scopeConfig, repo) =>
  Object.hasOwn(scopeConfig, repo) ? repo : 'default'

const listIn = (entry, field, key) => {
  const value = entry[field]
  if (value === undefined || value === null || value === false) return ''
  const isStringList =
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  if (!isStringList) {
    throw invalid(
      `The ${key} entry in ${SCOPE_PATH} has a ${field} value that is not a list of strings.`
    )
  }
  return value.join(' ')
}

const scopeFromConfig = ({ repository, scopeConfig }) => {
  const isObject =
    scopeConfig !== null &&
    typeof scopeConfig === 'object' &&
    !Array.isArray(scopeConfig)
  if (!isObject) {
    throw invalid(`${SCOPE_PATH} must hold one object, keyed by repo name.`)
  }
  const repo = repository.replace(/^[^/]*\//, '')
  const key = configKeyFor(scopeConfig, repo)
  const entry = scopeConfig[key]
  if (entry === undefined || entry === null || entry === false) {
    throw invalid(
      `No scope for ${repo} in ${SCOPE_PATH}, and no default entry.`
    )
  }
  return {
    where: `the ${key} entry in ${SCOPE_PATH}`,
    suites: scopeWords(listIn(entry, 'suites', key)),
    tags: scopeWords(listIn(entry, 'tags', key))
  }
}

const checkScope = ({ where, suites, tags }) => {
  if (`${suites}${tags}` === '') {
    throw invalid(
      `Neither suites nor tags are set in ${where}. Use "all" to run everything.`
    )
  }
  if (!suites.split(' ').includes('all')) return
  if (suites !== 'all') {
    throw invalid(`"all" must be the only suite in ${where}.`)
  }
  if (tags !== '') {
    throw invalid(
      `${where} has tags as well as "all", which already runs every test.`
    )
  }
}

/**
 * Which suites and tags an e2e run covers. A direct manual run takes the
 * workflow's inputs; any other run takes the calling repo's entry in the
 * scope file, or its `default` entry when the repo has none. Suites come
 * back as `all`, a space-separated list, or empty when only tags run.
 *
 * @param {object} args
 * @param {string} args.repository - owner/name of the calling repo
 * @param {boolean} args.manual
 * @param {string} [args.suites] - The workflow input, read only when manual
 * @param {string} [args.tags] - The workflow input, read only when manual
 * @param {() => unknown} args.readScopeConfig - The parsed scope file, read only when not manual
 * @returns {{where: string, suites: string, tags: string}}
 * @throws {TimError} PARSE when the scope is empty, mixes `all` with anything, or the scope file has no usable entry
 */
export const resolveScope = ({
  repository,
  manual,
  suites,
  tags,
  readScopeConfig
}) => {
  const scope = manual
    ? {
        where: 'the workflow inputs',
        suites: scopeWords(suites),
        tags: scopeWords(tags)
      }
    : scopeFromConfig({ repository, scopeConfig: readScopeConfig() })
  checkScope(scope)
  return scope
}

/**
 * The note a resolved scope prints to stderr.
 *
 * @param {{where: string, suites: string, tags: string}} scope
 * @returns {string}
 */
export const scopeNote = ({ where, suites, tags }) =>
  `Test scope from ${where}: suites=${suites || 'none'} tags=${tags || 'none'}`

/**
 * The `suites=` and `tags=` lines for `$GITHUB_OUTPUT`.
 *
 * @param {{suites: string, tags: string}} scope
 * @returns {string}
 */
export const scopeOutputLines = ({ suites, tags }) =>
  `suites=${suites}\ntags=${tags}`

/**
 * Suite paths as Playwright path arguments. A directory gets a trailing
 * slash, so `tests/animals` cannot also select `tests/animals-admin/`; a
 * spec file is left alone. Repeats are dropped.
 *
 * @param {string} list - Space- and/or comma-separated paths under tests/
 * @returns {string[]}
 * @throws {TimError} PARSE when a path is outside tests/, contains `..` or uses other characters: the value reaches `docker run`
 */
export const normaliseSuites = (list) =>
  unique(
    entriesOf(list).map((entry) => {
      if (!SUITE_PATTERN.test(entry) || entry.includes('..')) {
        throw invalid(
          `Invalid suite '${entry}'. Use a path under tests/ with only letters, digits, '.', '_', '-' and '/' (for example tests/animals/).`
        )
      }
      const last = entry.slice(entry.lastIndexOf('/') + 1)
      return last !== '' && !last.includes('.') ? `${entry}/` : entry
    })
  )

/**
 * Tags as one Playwright `--grep` pattern, joined by `|`. Repeats are
 * dropped; no tags gives an empty pattern.
 *
 * @param {string} list - Space- and/or comma-separated tags
 * @returns {{tags: string[], pattern: string}}
 * @throws {TimError} PARSE when a tag is not @ followed by letters, digits, '_' or '-': the value reaches `docker run` as a regex
 */
export const normaliseTags = (list) => {
  const tags = unique(
    entriesOf(list).map((entry) => {
      if (!TAG_PATTERN.test(entry)) {
        throw invalid(
          `Invalid tag '${entry}'. Use @ followed by letters, digits, '_' or '-' (for example @ins-backend).`
        )
      }
      return entry
    })
  )
  return { tags, pattern: tags.join('|') }
}
