import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import semver from 'semver'
import { z } from 'zod'
import { TimError } from '../errors.js'
import { prettierJson } from './json-layout.js'
import { isMavenRange } from './maven-range.js'

export const DEPENDENCY_SETS_FILE = 'config/dependency-sets.json'

const POLICIES = ['ci-is-enough', 'changelog-driven']

const packagePattern = z
  .string()
  .regex(
    /^[@a-z0-9*][a-z0-9*./_-]*$/,
    'must be an npm package name, with * as a wildcard'
  )

const NPM_PACKAGE_NAME = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/
const MAVEN_COORDINATE = /^[A-Za-z0-9_.-]+:[A-Za-z0-9_.-]+$/

/**
 * The package manager a held package belongs to: `maven` for a
 * `groupId:artifactId` coordinate, `npm` for anything else.
 *
 * @param {string} packageName
 * @returns {'npm'|'maven'}
 */
export const holdEcosystemOf = (packageName) =>
  MAVEN_COORDINATE.test(packageName) ? 'maven' : 'npm'

/**
 * An exact npm package name or a Maven `groupId:artifactId`, with no
 * wildcard.
 */
export const exactPackageName = z
  .string()
  .refine(
    (name) => NPM_PACKAGE_NAME.test(name) || MAVEN_COORDINATE.test(name),
    'must be an exact npm package name, or a Maven groupId:artifactId'
  )

const versionsReadableFor = ({ package: name, versions }) =>
  holdEcosystemOf(name) === 'maven'
    ? isMavenRange(versions)
    : semver.validRange(versions) !== null

const unreadableVersionsMessage = ({ package: name }) =>
  holdEcosystemOf(name) === 'maven'
    ? 'must be a Maven version range, such as [3.0.0,4.0.0)'
    : 'must be a version range npm understands, such as 4.14.x'

/**
 * One package held at its current version in some repos: Dependabot
 * ignores the `versions` range there until the hold is lifted. An npm
 * package takes an npm range; a Maven `groupId:artifactId` takes a Maven
 * range.
 */
export const holdSchema = z
  .object({
    package: exactPackageName,
    versions: z
      .string()
      .regex(
        /^[^'\n]+$/,
        'must be a Dependabot version range, such as 4.14.x, with no quote marks'
      ),
    repos: z.array(z.string().min(1)).min(1, 'must name at least one repo'),
    reason: z.string().min(1, 'must say why the package is held'),
    failingTest: z
      .string()
      .min(1, 'must name the test or check the new version breaks'),
    clashesWith: exactPackageName.optional(),
    link: z.url('must be a URL').optional(),
    since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
  })
  .strict()
  .superRefine((hold, context) => {
    if (versionsReadableFor(hold)) return
    context.addIssue({
      code: 'custom',
      path: ['versions'],
      message: unreadableVersionsMessage(hold)
    })
  })

const scheduleSchema = z
  .object({
    interval: z.enum(['daily', 'weekly', 'monthly']),
    time: z.string().regex(/^\d{2}:\d{2}$/, 'must be HH:MM'),
    timezone: z.string().min(1)
  })
  .strict()

const cooldownDaysSchema = z.number().int().min(0).max(90)

const mavenSchema = z
  .object({
    repos: z
      .object({
        stack: z.string().min(1),
        include: z.array(z.string().min(1)),
        exclude: z.array(z.string().min(1))
      })
      .strict(),
    dependabot: z
      .object({
        schedule: scheduleSchema,
        openPullRequestsLimit: z.number().int().min(0),
        cooldownDays: cooldownDaysSchema.optional(),
        groupPatchAndMinor: z.boolean()
      })
      .strict()
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
        cooldownDays: cooldownDaysSchema,
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
            schedule: scheduleSchema,
            openPullRequestsLimit: z.number().int().min(0),
            versioningStrategy: z.string().min(1)
          })
          .strict()
      })
      .strict(),
    maven: mavenSchema,
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
const manifestReposOf = (workspaceRoot) =>
  readJson(join(workspaceRoot, 'repos.json'), 'repos.json').repos

const pickedRepoNames = (manifestRepos, picks, { include, exclude }) => {
  const picked = manifestRepos.filter(picks).map((repo) => repo.name)
  return [...new Set([...picked, ...include])]
    .filter((name) => !exclude.includes(name))
    .sort()
}

export const reposInScope = (workspaceRoot, { defaults }) =>
  pickedRepoNames(
    manifestReposOf(workspaceRoot),
    (repo) => repo[defaults.repos.fromReposJson] === true,
    defaults.repos
  )

/**
 * The repos whose Dependabot config updates Maven: every repo in
 * `repos.json` whose `stack` is `maven.repos.stack`, plus `include`, less
 * `exclude`, sorted by name.
 *
 * @param {string} workspaceRoot
 * @param {{maven: {repos: {stack: string, include: string[], exclude: string[]}}}} dependencySets
 * @returns {string[]}
 */
export const mavenReposInScope = (workspaceRoot, { maven }) =>
  pickedRepoNames(
    manifestReposOf(workspaceRoot),
    (repo) => repo.stack === maven.repos.stack,
    maven.repos
  )

/**
 * The repos a hold may cover, for each package manager.
 *
 * @param {string} workspaceRoot
 * @param {object} dependencySets - From `loadDependencySets`
 * @returns {{npm: string[], maven: string[]}}
 */
export const holdScopesOf = (workspaceRoot, dependencySets) => ({
  npm: reposInScope(workspaceRoot, dependencySets),
  maven: mavenReposInScope(workspaceRoot, dependencySets)
})

const SCOPE_NAMES = {
  npm: 'the dependency sets',
  maven: 'Maven updates'
}

const outOfScopeMessage = (repos, inScope, scopeName = SCOPE_NAMES.npm) => {
  const outside = repos.filter((repo) => !inScope.includes(repo))
  if (outside.length === 0) return null
  return `${outside.join(', ')} ${outside.length === 1 ? 'is' : 'are'} not in scope for ${scopeName}. Repos in scope: ${inScope.join(', ')}.`
}

const holdOutOfScopeMessage = (hold, scopes) => {
  const ecosystem = holdEcosystemOf(hold.package)
  return outOfScopeMessage(
    hold.repos,
    scopes[ecosystem],
    SCOPE_NAMES[ecosystem]
  )
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
 * An npm hold may cover only the repos in scope for the sets, and a Maven
 * hold only the repos whose Maven updates are generated.
 *
 * @param {object} hold
 * @param {{npm: string[], maven: string[]}} scopes - From `holdScopesOf`
 * @throws {TimError} USAGE naming each repo the hold covers that is out of scope
 */
export const assertHoldReposInScope = (hold, scopes) => {
  const message = holdOutOfScopeMessage(hold, scopes)
  if (message) throw new TimError('USAGE', message)
}

/**
 * @param {object[]} holds - `holds` from `loadDependencySets`
 * @param {{npm: string[], maven: string[]}} scopes - From `holdScopesOf`
 * @throws {TimError} USAGE naming the first hold that covers a repo out of scope, and the repo
 */
export const assertHoldsInScope = (holds, scopes) => {
  for (const hold of holds) {
    const message = holdOutOfScopeMessage(hold, scopes)
    if (message) {
      throw new TimError(
        'USAGE',
        `${DEPENDENCY_SETS_FILE}: the hold on ${hold.package} covers a repo out of scope. ${message}`
      )
    }
  }
}
