import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { TimError } from '../errors.js'

export const DEPENDENCY_SETS_FILE = 'config/dependency-sets.json'

const POLICIES = ['ci-is-enough', 'changelog-driven']

const packagePattern = z
  .string()
  .regex(
    /^[@a-z0-9*][a-z0-9*./_-]*$/,
    'must be an npm package name, with * as a wildcard'
  )

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
    sets: z.array(setSchema).min(1)
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
 * @returns {{defaults: object, sets: object[]}}
 * @throws {TimError} NOT_FOUND when the file is missing, PARSE when it is malformed
 */
export const loadDependencySets = (workspaceRoot) => {
  const raw = readJson(
    join(workspaceRoot, DEPENDENCY_SETS_FILE),
    DEPENDENCY_SETS_FILE
  )
  const parsed = configSchema.safeParse(raw)
  if (!parsed.success) {
    throw new TimError(
      'PARSE',
      `${DEPENDENCY_SETS_FILE}: ${firstIssueMessage(parsed.error.issues)}`
    )
  }
  assertUniqueSetNames(parsed.data.sets)
  return parsed.data
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
