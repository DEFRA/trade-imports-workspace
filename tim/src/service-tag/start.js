import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PR_SCOPE_PATH } from '../build/pr-scope.js'
import { TimError } from '../errors.js'
import { run } from '../exec/exec.js'
import { insTestsClone } from './specs.js'

const SERVICE_PREFIX = 'trade-imports-'
const DEFAULT_KEY = 'default'
const COMPOSE_FOLDER = join('docker', 'stack')
const COMPOSE_SUFFIX = '.compose.yml'

const withoutServicePrefix = (name) =>
  name.startsWith(SERVICE_PREFIX) ? name.slice(SERVICE_PREFIX.length) : name

const byCodePoint = (left, right) => (left < right ? -1 : left > right ? 1 : 0)

const sortedUnique = (values) => [...new Set(values)].sort(byCodePoint)

/**
 * A repo's branch and its `git status --porcelain` lines, kept as git
 * prints them. A folder git cannot read gives no branch and no lines.
 *
 * @param {{name: string, path: string}} repo
 * @returns {Promise<{name: string, path: string, branch: string, uncommitted: string[]}>}
 */
export const repoState = async ({ name, path }) => {
  const branch = await run('git', ['-C', path, 'branch', '--show-current'])
  const status = await run('git', ['-C', path, 'status', '--porcelain'])
  return {
    name,
    path,
    branch: branch.exitCode === 0 ? branch.stdout : '',
    uncommitted:
      status.exitCode === 0 && status.stdout !== ''
        ? status.stdout.split('\n')
        : []
  }
}

/**
 * SERVICE_TAG_DOMAINS from the clone's config/service-tags.ts, the map the
 * ins-tests lint reads, imported through the clone's own tsx.
 *
 * @param {string} tests - The ins-tests clone
 * @returns {Promise<Record<string, string[]>>}
 * @throws {TimError} PARSE when tsx prints no readable map
 */
export const loadServiceTagMap = async (tests) => {
  const importMap = `import { SERVICE_TAG_DOMAINS } from '${tests}/config/service-tags'; console.log(JSON.stringify(SERVICE_TAG_DOMAINS));`
  const printed = await run(
    'npm',
    ['--prefix', tests, 'exec', '--no', '--', 'tsx', '-e', importMap],
    { cwd: tests }
  )
  try {
    return JSON.parse(printed.stdout)
  } catch (error) {
    throw new TimError(
      'PARSE',
      `Cannot read SERVICE_TAG_DOMAINS from ${tests}/config/service-tags.ts (exit ${printed.exitCode}): ${printed.stderr.trim()}`,
      error
    )
  }
}

const SERVICE_KEY_LINE = /^ {2}[a-z0-9-]+:[ ]*$/
const LIST_FORM_URL_LINE = /^[ ]+- TRADE_IMPORTS_[A-Z_]+_URL=/

const calledServiceOf = (line) => {
  const variable = line.trim().split(/\s+/)[1].replace(/=.*/, '')
  if (variable.endsWith('_BASE_URL')) return null
  const name = variable.replace(/^TRADE_IMPORTS_/, '').replace(/_URL$/, '')
  return `${SERVICE_PREFIX}${name.toLowerCase().replaceAll('_', '-')}`
}

const edgesInLines = (lines) =>
  lines.reduce(
    ({ service, edges }, line) => {
      if (SERVICE_KEY_LINE.test(line)) {
        return { service: line.trim().replace(/:$/, ''), edges }
      }
      if (service === '' || !LIST_FORM_URL_LINE.test(line)) {
        return { service, edges }
      }
      const called = calledServiceOf(line)
      return called === null
        ? { service, edges }
        : { service, edges: [...edges, { from: service, to: called }] }
    },
    { service: '', edges: [] }
  ).edges

const edgeKey = ({ from, to }) => `${from}\u0000${to}`

const byEdge = (left, right) =>
  byCodePoint(left.from, right.from) || byCodePoint(left.to, right.to)

/**
 * The direct calls between services in compose files read in order as one
 * stream: a list-form `- TRADE_IMPORTS_<NAME>_URL=` environment entry under
 * a two-space service key names the service it calls. `_BASE_URL` entries
 * and map-form `KEY: value` entries are not calls.
 *
 * @param {string[]} composeTexts - Each file's text, in file name order
 * @returns {{from: string, to: string}[]} Unique, sorted by caller then callee
 */
export const composeEdges = (composeTexts) => {
  const lines = composeTexts.flatMap((text) => text.split('\n'))
  const unique = new Map(
    edgesInLines(lines).map((edge) => [edgeKey(edge), edge])
  )
  return [...unique.values()].sort(byEdge)
}

const readComposeTexts = (workspaceRoot) => {
  const folder = join(workspaceRoot, COMPOSE_FOLDER)
  if (!existsSync(folder)) return []
  return readdirSync(folder)
    .filter((name) => !name.startsWith('.') && name.endsWith(COMPOSE_SUFFIX))
    .sort(byCodePoint)
    .map((name) => readFileSync(join(folder, name), 'utf8'))
}

const suitesOf = (entry) => entry?.suites ?? []

const testSuitesOf = (entry) =>
  suitesOf(entry).filter((suite) => suite.startsWith('tests/'))

const domainsRunByPath = (entry) =>
  sortedUnique(testSuitesOf(entry).map((suite) => suite.split('/')[1]))

const nestedSuites = (entry) =>
  testSuitesOf(entry).filter((suite) => suite.split('/').length > 3)

const expectedTagOf = (service) => `@${withoutServicePrefix(service)}`

const dependentsOf = (service, edges, scope) =>
  sortedUnique(
    edges.filter(({ to }) => to === service).map(({ from }) => from)
  ).map((dependent) => ({
    service: dependent,
    domains: domainsRunByPath(scope[dependent] ?? {})
  }))

const describeEntry = ([service, entry], edges, scope) => ({
  service,
  expected_tag: expectedTagOf(service),
  suites: suitesOf(entry),
  tags: entry?.tags ?? [],
  domains_run_by_path: domainsRunByPath(entry),
  dependents: dependentsOf(service, edges, scope)
})

const sameList = (left, right) => JSON.stringify(left) === JSON.stringify(right)

const entryAlignment = ([service, entry], tagMap) => {
  const expected = expectedTagOf(service)
  const tags = entry?.tags ?? []
  const domains = domainsRunByPath(entry)
  const nested = nestedSuites(entry)
  const inMap = (tag) => Object.hasOwn(tagMap, tag) && tagMap[tag] !== null
  return [
    ...tags
      .filter((tag) => tag !== expected)
      .map((tag) => ({
        service,
        kind: 'unexpected-tag-name',
        detail: `scope entry lists ${tag}, expected ${expected}`
      })),
    ...tags
      .filter((tag) => !inMap(tag))
      .map((tag) => ({
        service,
        kind: 'tag-missing-from-map',
        detail: `${tag} is in the scope file but not in SERVICE_TAG_DOMAINS`
      })),
    ...tags
      .filter(
        (tag) => inMap(tag) && !sameList([...tagMap[tag]].sort(), domains)
      )
      .map((tag) => ({
        service,
        kind: 'domains-differ',
        detail: `${tag} map domains ${JSON.stringify(tagMap[tag])} differ from the domains the entry runs by path ${JSON.stringify(domains)}`
      })),
    ...(nested.length > 0
      ? [
          {
            service,
            kind: 'nested-suite',
            detail: `suite below a domain ${JSON.stringify(nested)}; the lint matches by domain`
          }
        ]
      : [])
  ]
}

const mapTagsWithoutEntry = (tagMap, scope) => {
  const scopeTags = Object.keys(scope)
    .filter((service) => service !== DEFAULT_KEY)
    .map(expectedTagOf)
  return Object.keys(tagMap)
    .sort(byCodePoint)
    .filter((tag) => !scopeTags.includes(tag))
    .map((tag) => ({
      service: null,
      kind: 'map-tag-without-entry',
      detail: `${tag} is in SERVICE_TAG_DOMAINS but no scope entry matches it`
    }))
}

/**
 * The scope entries a service-tag run covers, each with the services that
 * call it directly, and where the scope file and the tag map disagree.
 *
 * @param {object} args
 * @param {object} args.scope - The parsed e2e-tests-pr-scope.json
 * @param {Record<string, string[]>} args.tagMap - SERVICE_TAG_DOMAINS
 * @param {{from: string, to: string}[]} args.edges - From {@link composeEdges}
 * @param {string} [args.service] - Short or full service name; empty covers every entry but `default`
 * @returns {{entries: object[], alignment: object[]}}
 */
export const serviceTagScope = ({ scope, tagMap, edges, service = '' }) => {
  const short = withoutServicePrefix(service)
  const covered = Object.entries(scope)
    .filter(([key]) => key !== DEFAULT_KEY)
    .filter(([key]) => short === '' || withoutServicePrefix(key) === short)
  return {
    entries: covered.map((entry) => describeEntry(entry, edges, scope)),
    alignment: [
      ...covered.flatMap((entry) => entryAlignment(entry, tagMap)),
      ...(short === '' ? mapTagsWithoutEntry(tagMap, scope) : [])
    ]
  }
}

const readScope = (scopeFile) => {
  try {
    return JSON.parse(readFileSync(scopeFile, 'utf8'))
  } catch (error) {
    throw new TimError(
      'PARSE',
      `Cannot read ${scopeFile}: ${error.message}`,
      error
    )
  }
}

/**
 * Everything the service-tag skill reads before it changes a file: the
 * workspace's and the ins-tests clone's branch and uncommitted lines, the
 * scope entries with their direct dependents, the tag map and the
 * alignment findings. Reads only.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.service] - Short or full service name
 * @param {(tests: string) => Promise<Record<string, string[]>>} [args.loadTagMap]
 * @returns {Promise<{scope_path: string, repos: object[], entries: object[], tag_map: object, alignment: object[]}>}
 * @throws {TimError} MISSING_DEP when the scope file or the ins-tests clone is missing
 */
export const startServiceTag = async ({
  workspaceRoot,
  service = '',
  loadTagMap = loadServiceTagMap
}) => {
  const scopeFile = join(workspaceRoot, PR_SCOPE_PATH)
  if (!existsSync(scopeFile)) {
    throw new TimError('MISSING_DEP', `No scope file at ${scopeFile}`)
  }
  const tests = insTestsClone(workspaceRoot)
  const repos = [
    await repoState({ name: 'workspace', path: workspaceRoot }),
    await repoState({ name: 'ins-tests', path: tests })
  ]
  const tagMap = await loadTagMap(tests)
  const { entries, alignment } = serviceTagScope({
    scope: readScope(scopeFile),
    tagMap,
    edges: composeEdges(readComposeTexts(workspaceRoot)),
    service
  })
  return {
    scope_path: PR_SCOPE_PATH,
    repos,
    entries,
    tag_map: tagMap,
    alignment
  }
}
