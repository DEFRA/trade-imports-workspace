import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { TimError } from '../../errors.js'

/** Workspace-relative path to the code-style skill's routing data. */
export const CODE_STYLE_ROUTING_PATH =
  '.claude/skills/code-style/assets/routing.json'

const routingSchema = z.object({
  schemaVersion: z.number(),
  patternSyntax: z.string(),
  fileTopics: z.array(
    z.object({
      patterns: z.array(z.string()).min(1),
      topics: z.array(z.string()).min(1)
    })
  ),
  topics: z.record(
    z.string(),
    z.object({ bestPractice: z.array(z.string()).min(1) })
  ),
  unknownTopicHint: z.string()
})

const REFUSED_PATTERN_CHARS = /[[\]{}\\]/

/**
 * Compile one `file-topics.sh`-style shell-case pattern to an anchored
 * RegExp: every regex metacharacter is escaped, `*` becomes `.*` and `?`
 * becomes `.`. Refuses `[`, `]`, `{`, `}` and `\\` — bash and this compiler
 * would treat them differently, so refusing them keeps the two readers
 * from diverging silently.
 *
 * @param {string} pattern
 * @returns {RegExp}
 * @throws {TimError} PARSE
 */
export const shellPatternToRegExp = (pattern) => {
  if (REFUSED_PATTERN_CHARS.test(pattern)) {
    throw new TimError(
      'PARSE',
      `Pattern "${pattern}" uses a character bash and tim's shell-case compiler treat differently ([, ], {, } or \\).`
    )
  }
  const body = pattern
    .replace(/[.+^$()|]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(`^${body}$`)
}

/**
 * Load and validate the code-style skill's routing data.
 *
 * @param {string} workspaceRoot
 * @returns {object} the parsed, validated routing document
 * @throws {TimError} NOT_FOUND, PARSE
 */
export const loadCodeStyleRouting = (workspaceRoot) => {
  const path = join(workspaceRoot, CODE_STYLE_ROUTING_PATH)
  if (!existsSync(path)) {
    throw new TimError('NOT_FOUND', `Can't find ${CODE_STYLE_ROUTING_PATH}.`)
  }
  let raw
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new TimError(
      'PARSE',
      `${CODE_STYLE_ROUTING_PATH} is not valid JSON: ${error.message}`
    )
  }
  const result = routingSchema.safeParse(raw)
  if (!result.success) {
    throw new TimError(
      'PARSE',
      `${CODE_STYLE_ROUTING_PATH}: ${result.error.issues[0].message} (${result.error.issues[0].path.join('.')})`
    )
  }
  const routing = result.data
  const topicKeys = new Set(Object.keys(routing.topics))
  for (const entry of routing.fileTopics) {
    for (const topic of entry.topics) {
      if (!topicKeys.has(topic)) {
        throw new TimError(
          'PARSE',
          `${CODE_STYLE_ROUTING_PATH}: fileTopics names topic "${topic}", which is not a key of "topics".`
        )
      }
    }
    for (const pattern of entry.patterns) {
      shellPatternToRegExp(pattern) // throws PARSE on a refused character
    }
  }
  return routing
}

/**
 * Every topic a path matches, in the routing file's `topics` key order —
 * the emission order `file-topics.sh` also uses (jq `keys_unsorted`).
 *
 * @param {object} routing - From {@link loadCodeStyleRouting}
 * @param {string} path - Workspace-relative, `/`-separated
 * @returns {string[]}
 */
export const topicsForPath = (routing, path) => {
  const matched = new Set(
    routing.fileTopics
      .filter((entry) =>
        entry.patterns.some((pattern) =>
          shellPatternToRegExp(pattern).test(path)
        )
      )
      .flatMap((entry) => entry.topics)
  )
  return Object.keys(routing.topics).filter((topic) => matched.has(topic))
}

/**
 * The union of `bestPractice` files for a set of topics, in topic order,
 * deduplicated.
 *
 * @param {object} routing - From {@link loadCodeStyleRouting}
 * @param {string[]} topics
 * @returns {string[]}
 */
export const bestPracticeForTopics = (routing, topics) => [
  ...new Set(
    topics.flatMap((topic) => routing.topics[topic]?.bestPractice ?? [])
  )
]
