import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import picomatch from 'picomatch'
import { TimError } from '../../errors.js'
import { fileMatchesLine } from './repo-files.js'

/** Workspace-relative path to the review skill's routing data. */
export const REVIEW_ROUTING_PATH = '.claude/skills/review/assets/routing.json'

const conditionSchema = z.lazy(() =>
  z.union([
    z.object({
      fileContains: z.object({ file: z.string(), pattern: z.string() })
    }),
    z.object({ fileExists: z.string() }),
    z.object({
      anyFileContains: z.object({ glob: z.string(), pattern: z.string() })
    }),
    z.object({ dirExists: z.string() }),
    z.object({ anyOf: z.array(conditionSchema).min(1) }),
    z.object({ allOf: z.array(conditionSchema).min(1) })
  ])
)

const routingSchema = z.object({
  schemaVersion: z.number(),
  manifestDirs: z.array(z.string()),
  technologies: z.array(
    z.object({
      name: z.string(),
      requires: z.string().optional(),
      when: conditionSchema,
      bestPractice: z.array(z.string()).min(1)
    })
  )
})

const compilesAsRegExp = (pattern) => {
  try {
    return Boolean(new RegExp(pattern))
  } catch {
    return false
  }
}

const walkConditionPatterns = (condition, onPattern) => {
  if ('fileContains' in condition) {
    onPattern(condition.fileContains.pattern)
    return
  }
  if ('anyFileContains' in condition) {
    onPattern(condition.anyFileContains.pattern)
    return
  }
  if ('anyOf' in condition) {
    condition.anyOf.forEach((sub) => walkConditionPatterns(sub, onPattern))
    return
  }
  if ('allOf' in condition) {
    condition.allOf.forEach((sub) => walkConditionPatterns(sub, onPattern))
  }
}

/**
 * Every `requires` names a technology declared earlier in the array
 * (`loadReviewRouting`'s own detection order requirement).
 *
 * @param {object[]} technologies
 * @throws {TimError} PARSE
 */
const assertRequiresOrder = (technologies) => {
  const seenNames = new Set()
  for (const tech of technologies) {
    if (tech.requires && !seenNames.has(tech.requires)) {
      throw new TimError(
        'PARSE',
        `${REVIEW_ROUTING_PATH}: "${tech.name}" requires "${tech.requires}", which is not an earlier technology.`
      )
    }
    seenNames.add(tech.name)
  }
}

/**
 * Every regex pattern named by every technology's `when` compiles.
 *
 * @param {object[]} technologies
 * @throws {TimError} PARSE
 */
const assertPatternsCompile = (technologies) => {
  for (const tech of technologies) {
    let badPattern = null
    walkConditionPatterns(tech.when, (pattern) => {
      if (badPattern) return
      if (!compilesAsRegExp(pattern)) badPattern = pattern
    })
    if (badPattern) {
      throw new TimError(
        'PARSE',
        `${REVIEW_ROUTING_PATH}: "${tech.name}" has a pattern that does not compile as a regular expression: ${badPattern}`
      )
    }
  }
}

/**
 * Load and validate the review skill's routing data: every `requires`
 * names an earlier technology, and every regex pattern compiles.
 *
 * @param {string} workspaceRoot
 * @returns {object} the parsed, validated routing document
 * @throws {TimError} NOT_FOUND, PARSE
 */
export const loadReviewRouting = (workspaceRoot) => {
  const path = join(workspaceRoot, REVIEW_ROUTING_PATH)
  if (!existsSync(path)) {
    throw new TimError('NOT_FOUND', `Can't find ${REVIEW_ROUTING_PATH}.`)
  }
  let raw
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new TimError(
      'PARSE',
      `${REVIEW_ROUTING_PATH} is not valid JSON: ${error.message}`
    )
  }
  const result = routingSchema.safeParse(raw)
  if (!result.success) {
    throw new TimError(
      'PARSE',
      `${REVIEW_ROUTING_PATH}: ${result.error.issues[0].message} (${result.error.issues[0].path.join('.')})`
    )
  }
  const routing = result.data

  assertRequiresOrder(routing.technologies)
  assertPatternsCompile(routing.technologies)

  return routing
}

const fileContains = ({ repoDir, manifestDirs, file, pattern }) => {
  const regex = new RegExp(pattern)
  const candidatePaths = [
    join(repoDir, file),
    ...manifestDirs.map((subdir) => join(repoDir, subdir, file))
  ]
  return candidatePaths.some((path) => fileMatchesLine(path, regex))
}

const fileExists = ({ repoDir, manifestDirs, file }) => {
  if (existsSync(join(repoDir, file))) return true
  return manifestDirs.some((subdir) => existsSync(join(repoDir, subdir, file)))
}

const anyFileContains = ({ repoDir, repoFiles, glob, pattern }) => {
  const regex = new RegExp(pattern)
  const isMatch = picomatch(glob, { dot: true, basename: true })
  return repoFiles.some(
    (relPath) =>
      isMatch(relPath) && fileMatchesLine(join(repoDir, relPath), regex)
  )
}

const dirExists = ({ repoDir, dir }) => {
  const abs = join(repoDir, dir)
  try {
    return statSync(abs).isDirectory()
  } catch {
    return false
  }
}

/**
 * Evaluate one condition object against a materialised repo.
 *
 * @param {object} condition
 * @param {{repoDir: string, manifestDirs: string[], repoFiles: string[]}} context
 * @returns {boolean}
 */
export const evalCondition = (condition, context) => {
  if ('fileContains' in condition) {
    return fileContains({ ...context, ...condition.fileContains })
  }
  if ('fileExists' in condition) {
    return fileExists({ ...context, file: condition.fileExists })
  }
  if ('anyFileContains' in condition) {
    return anyFileContains({ ...context, ...condition.anyFileContains })
  }
  if ('dirExists' in condition) {
    return dirExists({ ...context, dir: condition.dirExists })
  }
  if ('anyOf' in condition) {
    return condition.anyOf.some((sub) => evalCondition(sub, context))
  }
  if ('allOf' in condition) {
    return condition.allOf.every((sub) => evalCondition(sub, context))
  }
  return false
}

/**
 * Detect every technology the routing data names, in its own array order,
 * against one materialised repo. A `requires` entry is skipped unless its
 * prerequisite was already detected.
 *
 * @param {object} args
 * @param {object} args.routing - From {@link loadReviewRouting}
 * @param {string} args.repoDir
 * @param {string[]} args.repoFiles - Every file in the repo, relative to
 *   `repoDir` (from `repo-files.js`'s `listRepoFiles`)
 * @returns {{technologies: string[], bestPractice: string[]}}
 */
export const detectTechnologies = ({ routing, repoDir, repoFiles }) => {
  const context = { repoDir, manifestDirs: routing.manifestDirs, repoFiles }

  // Matches `detect-tech.sh`'s own concatenation exactly (no interior
  // dedup) — G-5 proves tim agrees with the bash golden byte-for-byte.
  // Global dedup happens once, at `standards.js`'s top-level `standards[]`.
  return routing.technologies.reduce(
    (acc, tech) => {
      if (tech.requires && !acc.technologies.includes(tech.requires)) {
        return acc
      }
      if (!evalCondition(tech.when, context)) return acc
      return {
        technologies: [...acc.technologies, tech.name],
        bestPractice: [...acc.bestPractice, ...tech.bestPractice]
      }
    },
    { technologies: [], bestPractice: [] }
  )
}
