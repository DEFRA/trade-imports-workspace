import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  loadCodeStyleRouting,
  topicsForPath
} from '../backlog/standards/code-style-routing.js'
import { TimError } from '../errors.js'
import { styleDir } from './paths.js'

/**
 * The style topics a file path maps to, in the routing file's topic order.
 * None when no pattern matches.
 *
 * @param {{workspaceRoot: string, path?: string}} args
 * @returns {string[]}
 * @throws {TimError} USAGE without a path; NOT_FOUND or PARSE when the routing data is missing or wrong
 */
export const styleTopicsOf = ({ workspaceRoot, path }) => {
  if (!path) throw new TimError('USAGE', 'Usage: tim style topics <path>')
  return topicsForPath(loadCodeStyleRouting(workspaceRoot), path)
}

const sourceSection = (heading, text) =>
  ['', '---', '', `## Source: \`${heading}\``, '', text].join('\n')

const bestPracticeSection = (workspaceRoot, source) => {
  const path = join(workspaceRoot, source)
  if (!existsSync(path)) {
    return ['', '---', '', `## Source: \`${source}\` (missing)`, ''].join('\n')
  }
  return sourceSection(source, readFileSync(path, 'utf8'))
}

const repoSections = ({ repoDir, repo, relativePaths }) =>
  repoDir === undefined
    ? []
    : relativePaths
        .filter((relativePath) => existsSync(join(repoDir, relativePath)))
        .map((relativePath) =>
          sourceSection(
            `${repo}:${relativePath}`,
            readFileSync(join(repoDir, relativePath), 'utf8')
          )
        )

const bundleText = ({ workspaceRoot, repo, topic, routed, repoDir }) =>
  [
    `# Style rules bundle for ${repo} (${topic})\n`,
    '\nConcatenated from `docs/best-practices/` at prepare-style time.\n',
    `All STYLE_FILE_REVIEWER workers reviewing a ${topic} file for this\n`,
    'ticket read this single bundle instead of the underlying files.\n',
    ...routed.bestPractice.map((source) =>
      bestPracticeSection(workspaceRoot, source)
    ),
    ...repoSections({
      repoDir,
      repo,
      relativePaths: routed.repoRelativeBestPractice ?? []
    })
  ].join('')

/**
 * Writes `style-rules.<repo>.<topic>.md` for a style review: the topic's
 * best-practice files from the code-style routing data, each under its own
 * heading, then each of its repo-relative files that `repoDir` holds.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId] - A ticket key or a `local/<repo>/<branch>` id
 * @param {string} [args.repo]
 * @param {string} [args.topic]
 * @param {string} [args.repoDir] - The repo's checkout; without it no repo-relative file is added
 * @returns {{path: string}}
 * @throws {TimError} USAGE without a review id, repo or topic, or for a topic the routing data lacks; NOT_FOUND or PARSE when the routing data is missing or wrong
 */
export const bakeStyleBundle = ({
  workspaceRoot,
  reviewId,
  repo,
  topic,
  repoDir
}) => {
  if (!reviewId || !repo || !topic) {
    throw new TimError(
      'USAGE',
      'Usage: tim style bundle <review-id> <repo> <topic> [repo-dir]'
    )
  }
  const routing = loadCodeStyleRouting(workspaceRoot)
  if (!Object.hasOwn(routing.topics, topic)) {
    throw new TimError(
      'USAGE',
      `Unknown topic: ${topic} (expected ${routing.unknownTopicHint})`
    )
  }
  const folder = styleDir(workspaceRoot, reviewId)
  mkdirSync(folder, { recursive: true })
  const path = join(folder, `style-rules.${repo}.${topic}.md`)
  writeFileSync(
    path,
    bundleText({
      workspaceRoot,
      repo,
      topic,
      routed: routing.topics[topic],
      repoDir
    })
  )
  return { path }
}
