import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import semver from 'semver'
import { z } from 'zod'
import { TimError } from '../errors.js'
import { prettierJson } from './json-layout.js'

export const DEPENDENCY_SETS_FILE = 'config/dependency-sets.json'

const POLICIES = ['ci-is-enough', 'changelog-driven']

const packagePattern = z
  .string()
  .regex(
    /^[@a-z0-9*][a-z0-9*./_-]*$/,
    'must be an npm package name, with * as a wildcard'
  )

const packageName = z
  .string()
  .regex(
    /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/,
    'must be an exact npm package name'
  )

/**
 * One package held at its current version in some repos: Dependabot
 * ignores the `versions` range there until the hold is lifted.
 */
export const holdSchema = z
  .object({
    package: packageName,
    versions: z
      .string()
      .regex(
        /^[^'\n]+$/,
        'must be a Dependabot version range, such as 4.14.x, with no quote marks'
      )
      .refine(
        (range) => semver.validRange(range) !== null,
        'must be a version range npm understands, such as 4.14.x'
      ),
    repos: z.array(z.string().min(1)).min(1, 'must name at least one repo'),
    reason: z.string().min(1, 'must say why the package is held'),
    failingTest: z
      .string()
      .min(1, 'must name the test or check the new version breaks'),
    clashesWith: packageName.optional(),
    link: z.url('must be a URL').optional(),
    since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
  })
  .strict()

const setSchema = z
  .object({
    name: z
      .string()
      .regex(/^[a-z0-9-]+$/, 'must be lower-case words joined by -'),
    members: z.array(packagePattern),
    pins: z.array(z.string().min(1)).optional(),
    scope: z.enum(['repo', 'cross-repo']),
    policy: z.enum(POLICIES),
    reason: z.string().min(1)
  })
  .strict()

const configSchema = z
  .object({
    description: z.string().optional(),
    defaults: z
      .object({
        cooldownDays: z.number().int().min(0).max(90),
        majorPolicy: z.enum(POLICIES),
        repos: z
          .object({
            fromReposJson: z.string().min(1),
            include: z.array(z.string().min(1)),
            exclude: z.array(z.string().min(1))
          })
          .strict(),
        dependabot: z
          .object({
            schedule: z
              .object({
                interval: z.enum(['daily', 'weekly', 'monthly']),
                time: z.string().regex(/^\d{2}:\d{2}$/, 'must be HH:MM'),
                timezone: z.string().min(1)
              })
              .strict(),
            openPullRequestsLimit: z.number().int().min(0),
            versioningStrategy: z.string().min(1)
          })
          .strict()
      })
      .strict(),
    sets: z.array(setSchema).min(1),
    holds: z.array(holdSchema)
  })
  .strict()

const firstIssueMessage = (issues) => {
  const [issue] = issues
  const where = issue.path.length > 0 ? issue.path.join('.') : 'the file'
  return `${where} ${issue.message}`
}

const assertUniqueSetNames = (sets) => {
  const seen = new Set()
  for (const { name } of sets) {
    if (seen.has(name)) {
      throw new TimError(
        'PARSE',
        `${DEPENDENCY_SETS_FILE}: two sets are called "${name}". Give each set its own name.`
      )
    }
    seen.add(name)
  }
}

const assertUniqueHolds = (holds) => {
  const seen = new Set()
  for (const hold of holds) {
    if (seen.has(hold.package)) {
      throw new TimError(
        'PARSE',
        `${DEPENDENCY_SETS_FILE}: ${hold.package} is held twice. Keep one hold per package.`
      )
    }
    seen.add(hold.package)
  }
}

const parseDependencySets = (raw) => {
  const parsed = configSchema.safeParse(raw)
  if (!parsed.success) {
    throw new TimError(
      'PARSE',
      `${DEPENDENCY_SETS_FILE}: ${firstIssueMessage(parsed.error.issues)}`
    )
  }
  assertUniqueSetNames(parsed.data.sets)
  assertUniqueHolds(parsed.data.holds)
  return parsed.data
}

const readJson = (path, label) => {
  if (!existsSync(path)) {
    throw new TimError('NOT_FOUND', `Can't find ${label} at ${path}.`)
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new TimError('PARSE', `${label} is not valid JSON: ${error.message}`)
  }
}

/**
 * Read and validate the coupled package sets the workspace records in
 * `config/dependency-sets.json`.
 *
 * @param {string} workspaceRoot
 * @returns {{defaults: object, sets: object[], holds: object[]}}
 * @throws {TimError} NOT_FOUND when the file is missing, PARSE when it is malformed
 */
export const loadDependencySets = (workspaceRoot) =>
  parseDependencySets(
    readJson(join(workspaceRoot, DEPENDENCY_SETS_FILE), DEPENDENCY_SETS_FILE)
  )

/**
 * Replace the holds in `config/dependency-sets.json`, leaving every other
 * field as the file has it, laid out as Prettier lays out JSON.
 *
 * @param {string} workspaceRoot
 * @param {object[]} holds - Each must match `holdSchema`
 * @throws {TimError} NOT_FOUND when the file is missing, PARSE when it or the new holds are malformed
 */
export const writeHolds = (workspaceRoot, holds) => {
  const path = join(workspaceRoot, DEPENDENCY_SETS_FILE)
  const updated = { ...readJson(path, DEPENDENCY_SETS_FILE), holds }
  parseDependencySets(updated)
  writeFileSync(path, prettierJson(updated))
}

/**
 * The repos the sets apply to: every repo in `repos.json` whose flag named
 * by `defaults.repos.fromReposJson` is true, plus `include`, less `exclude`,
 * sorted by name.
 *
 * @param {string} workspaceRoot
 * @param {{defaults: {repos: {fromReposJson: string, include: string[], exclude: string[]}}}} dependencySets
 * @returns {string[]}
 */
export const reposInScope = (workspaceRoot, { defaults }) => {
  const { fromReposJson, include, exclude } = defaults.repos
  const manifest = readJson(join(workspaceRoot, 'repos.json'), 'repos.json')
  const flagged = manifest.repos
    .filter((repo) => repo[fromReposJson] === true)
    .map((repo) => repo.name)
  return [...new Set([...flagged, ...include])]
    .filter((name) => !exclude.includes(name))
    .sort()
}

const outOfScopeMessage = (repos, inScope) => {
  const outside = repos.filter((repo) => !inScope.includes(repo))
  if (outside.length === 0) return null
  return `${outside.join(', ')} ${outside.length === 1 ? 'is' : 'are'} not in scope for the dependency sets. Repos in scope: ${inScope.join(', ')}.`
}

/**
 * @param {string[]} repos
 * @param {string[]} inScope - From `reposInScope`
 * @throws {TimError} USAGE naming each repo that is not in scope
 */
export const assertReposInScope = (repos, inScope) => {
  const message = outOfScopeMessage(repos, inScope)
  if (message) throw new TimError('USAGE', message)
}

/**
 * @param {object[]} holds - `holds` from `loadDependencySets`
 * @param {string[]} inScope - From `reposInScope`
 * @throws {TimError} USAGE naming the first hold that covers a repo out of scope, and the repo
 */
export const assertHoldsInScope = (holds, inScope) => {
  for (const hold of holds) {
    const message = outOfScopeMessage(hold.repos, inScope)
    if (message) {
      throw new TimError(
        'USAGE',
        `${DEPENDENCY_SETS_FILE}: the hold on ${hold.package} covers a repo out of scope. ${message}`
      )
    }
  }
}
