import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DOMAIN_NAMES, servicesForDomains } from '../stack/definition.js'
import { WORKSPACE_FOLDER } from './envelope-repos.js'
import { PR_SCOPE_PATH } from './pr-scope.js'

/** The test suite's repo folder. It holds every domain's specs, so it says nothing about which one a row is for. */
export const TESTS_FOLDER = 'trade-imports-ins-tests'

/** The performance suite's repo folder. Its k6 scenarios address every service by port, so it needs the whole stack. */
export const PERF_FOLDER = 'trade-imports-performance-tests'

const EVERY_SUITE = 'all'

/**
 * Repos that tell you nothing about which domain a row is for. The workspace
 * holds the stack and the behaviour spec, and the tests repo holds every
 * domain's specs, so both appear in nearly every row.
 */
const SAYS_NOTHING = new Set([WORKSPACE_FOLDER, TESTS_FOLDER])

const domainOfSuite = (suite) => {
  const [, domain] = /^tests\/([^/]+)/.exec(suite) ?? []
  return DOMAIN_NAMES.includes(domain) ? domain : null
}

const sorted = (domains) => [...new Set(domains)].sort()

const everyDomain = (reason) => ({
  domains: [...DOMAIN_NAMES],
  everyDomain: true,
  reason
})

/** The `--e2e` mode whose gate runs only the specs a row changed. */
const CHANGED_SPECS_ONLY = 'targeted'

const narrowedToOwnSuites = ({ signalling, fromSuites, tags, tagDomains }) => {
  const leftToPullRequest = sorted(
    tags.flatMap((tag) => tagDomains[tag] ?? [])
  ).filter((domain) => !fromSuites.includes(domain))
  const runs = `${signalling.join(', ')} runs ${fromSuites.join(', ')}`
  return {
    domains: fromSuites,
    everyDomain: fromSuites.length === DOMAIN_NAMES.length,
    reason:
      leftToPullRequest.length === 0
        ? runs
        : `${runs}; tagged specs in ${leftToPullRequest.join(', ')} run on the pull request`
  }
}

/**
 * Which test domains a row's repos put in play, and so which services its
 * stack needs.
 *
 * A repo's `suites` in the scope file name its own domains. Its `tags` name
 * specs in *other* domains that its pull request also runs, and where those
 * live can only be found by looking, so `tagDomains` carries the answer from
 * {@link tagDomainsIn}. A tag with no entry there is taken as reaching every
 * domain, because an unknown reach is not a safe one to narrow on.
 *
 * Under `e2e: 'targeted'` the tags name nothing the local gate will run: its
 * E2E rung runs only the specs the row changed, and the tagged specs in other
 * domains are the pull request's to run. So the domains are the repos' own
 * suites alone, and the reason says which domains were left to the pull
 * request. A row that changes a spec in some other domain is the case this
 * does not see, because the tests repo signals no domain of its own; that
 * row's rung goes red against a stack missing those services rather than
 * passing unproven.
 *
 * @param {object} opts
 * @param {object} opts.scope - The parsed e2e-tests-pr-scope.json
 * @param {string[]} opts.folders - The row's repo folder names
 * @param {Record<string, string[]>} [opts.tagDomains] - Which domains carry each service tag
 * @param {'local'|'targeted'|'ci'} [opts.e2e] - The run's `--e2e` mode
 * @returns {{domains: string[], everyDomain: boolean, reason: string}} No domains means the row needs no stack
 */
export const domainsForFolders = ({
  scope,
  folders,
  tagDomains = {},
  e2e = 'local'
}) => {
  const signalling = folders.filter((folder) => !SAYS_NOTHING.has(folder))
  if (signalling.length === 0) {
    return {
      domains: [],
      everyDomain: false,
      reason: 'it changes no service repo'
    }
  }
  if (signalling.includes(PERF_FOLDER)) {
    return everyDomain(
      'the performance suite addresses every service by port, so it needs the whole stack'
    )
  }
  const unscoped = signalling.filter((folder) => !scope[folder])
  if (unscoped.length > 0) {
    return everyDomain(
      `${unscoped.join(', ')} has no entry in ${PR_SCOPE_PATH}, so any domain may use it`
    )
  }
  const entries = signalling.map((folder) => scope[folder])
  const suites = entries.flatMap((entry) => entry.suites ?? [])
  if (suites.includes(EVERY_SUITE)) {
    return everyDomain(
      `${signalling.join(', ')} runs every suite in ${PR_SCOPE_PATH}`
    )
  }
  const tags = sorted(entries.flatMap((entry) => entry.tags ?? []))
  const fromSuites = sorted(suites.map(domainOfSuite).filter(Boolean))
  if (e2e === CHANGED_SPECS_ONLY) {
    return narrowedToOwnSuites({ signalling, fromSuites, tags, tagDomains })
  }
  const unknownTags = tags.filter((tag) => !tagDomains[tag])
  if (unknownTags.length > 0) {
    return everyDomain(
      `${unknownTags.join(', ')} marks specs in no domain this could find, so its reach is unknown`
    )
  }
  const fromTags = tags.flatMap((tag) => tagDomains[tag])
  const domains = sorted([...fromSuites, ...fromTags])
  return {
    domains,
    everyDomain: domains.length === DOMAIN_NAMES.length,
    reason: `${signalling.join(', ')} runs ${domains.join(', ')}`
  }
}

const filesUnder = (dir) => {
  try {
    return readdirSync(dir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath ?? entry.path, entry.name))
  } catch {
    return []
  }
}

/**
 * Which domains carry each service tag, read from the test suite in this
 * workspace. A tag marks specs in domains other than the service's own, and
 * running them needs those domains' services.
 *
 * @param {string} workspaceRoot
 * @param {string[]} tags - The service tags to look for, such as ['@address-book']
 * @returns {Record<string, string[]>} Each tag found, with the domains holding it
 */
export const tagDomainsIn = (workspaceRoot, tags) => {
  const testsDir = join(workspaceRoot, 'repos', TESTS_FOLDER, 'tests')
  const found = {}
  for (const domain of DOMAIN_NAMES) {
    for (const file of filesUnder(join(testsDir, domain))) {
      let text
      try {
        text = readFileSync(file, 'utf8')
      } catch {
        continue
      }
      for (const tag of tags) {
        if (!text.includes(tag)) continue
        found[tag] = sorted([...(found[tag] ?? []), domain])
      }
    }
  }
  return found
}

/** Every service tag any entry in the scope file names. */
export const tagsIn = (scope) =>
  sorted(Object.values(scope).flatMap((entry) => entry?.tags ?? []))

/**
 * What stack a build run needs: the domains its rows put in play, unioned,
 * and the services that starts. The loop holds one stack for a whole run, so
 * this is read once at launch and not per row.
 *
 * @param {object} opts
 * @param {{id: string, title?: string, repos?: string[]}[]} opts.rows - The rows the run will build
 * @param {Record<string, string>} opts.folderOfKey - Each envelope repo key mapped to its folder name
 * @param {object} opts.scope - The parsed e2e-tests-pr-scope.json
 * @param {Record<string, string[]>} [opts.tagDomains] - From {@link tagDomainsIn}
 * @param {'local'|'targeted'|'ci'} [opts.e2e] - The run's `--e2e` mode
 * @returns {{needsStack: boolean, everyDomain: boolean, domains: string[], services: string[], wholeStack: string[], rows: object[]}}
 */
export const stackPlanFor = ({
  rows,
  folderOfKey,
  scope,
  tagDomains = {},
  e2e = 'local'
}) => {
  const perRow = rows.map((row) => {
    const folders = (row.repos ?? Object.keys(folderOfKey))
      .map((key) => folderOfKey[key])
      .filter(Boolean)
    return {
      id: row.id,
      title: row.title,
      folders,
      ...domainsForFolders({ scope, folders, tagDomains, e2e })
    }
  })
  const domains = sorted(perRow.flatMap(({ domains: own }) => own))
  return {
    needsStack: domains.length > 0,
    everyDomain: domains.length === DOMAIN_NAMES.length,
    domains,
    services: servicesForDomains(domains),
    wholeStack: servicesForDomains(DOMAIN_NAMES),
    rows: perRow
  }
}

/**
 * The lines a stack plan prints, for a person choosing between the whole
 * stack and a narrowed one before a run starts.
 *
 * @param {object} plan - What {@link stackPlanFor} returned
 * @returns {string[]}
 */
export const stackPlanLines = (plan) => {
  const whole = plan.wholeStack.length
  if (!plan.needsStack) {
    return [
      'No row changes a service repo, so no row runs an end-to-end suite.',
      `This run needs no stack at all, against ${whole} services for the whole stack.`,
      ...plan.rows.map(({ id, reason }) => `  ${id}: ${reason}`)
    ]
  }
  return [
    plan.everyDomain
      ? `Every domain is in play, so a narrowed stack would be the whole ${whole} services.`
      : `Narrowed: ${plan.services.length} of ${whole} services, for ${plan.domains.join(', ')}.`,
    ...plan.rows.map(
      ({ id, domains, reason }) =>
        `  ${id}: ${domains.length === 0 ? 'no stack' : domains.join(', ')} — ${reason}`
    )
  ]
}
