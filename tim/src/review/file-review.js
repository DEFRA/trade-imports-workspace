import { existsSync } from 'node:fs'
import { readJsonFile } from '../backlog/io.js'
import { TimError } from '../errors.js'
import {
  CODE_QUALITY_CATEGORIES,
  DESIGN_CATEGORIES,
  FUNCTIONAL_CATEGORIES,
  refuseCategoryOutside
} from './finding-categories.js'
import { fileReviewPath, reviewDir } from './paths.js'
import { writeJsonAtomic } from './store.js'

export const REVIEW_MODES = ['FRESH', 'REFRESH', 'MERGE_RESOLVED']
export const SEVERITIES = ['Critical', 'Major', 'Minor']
export const VERDICTS = ['SAFE', 'NEEDS_ATTENTION', 'RISKY']
export const FINDING_CATEGORIES = [
  ...FUNCTIONAL_CATEGORIES,
  ...CODE_QUALITY_CATEGORIES,
  ...DESIGN_CATEGORIES
]

/**
 * Refuses the first option, in the order given, that is missing or empty,
 * naming it as `Missing <NAME>`.
 *
 * @param {[string, string | undefined][]} namedValues - Each option's name and value
 * @throws {TimError} USAGE naming the first one missing
 */
export const refuseFirstMissing = (namedValues) => {
  const missing = namedValues.find(([, value]) => !value)
  if (missing) throw new TimError('USAGE', `Missing ${missing[0]}`)
}

/**
 * A JSON value given on the command line, such as a line or PR number.
 *
 * @param {string} option - The option's name, for the refusal
 * @param {string} text
 * @returns {any}
 * @throws {TimError} USAGE when the text is not JSON
 */
export const parseJsonOption = (option, text) => {
  try {
    return JSON.parse(text)
  } catch {
    throw new TimError('USAGE', `Invalid ${option}: ${text} (must be a number)`)
  }
}

/**
 * @param {string[]} allowed
 * @param {string} value
 * @param {string} refusal - The message to refuse with
 * @throws {TimError} USAGE when the value is not one of the allowed ones
 */
export const refuseOutside = (allowed, value, refusal) => {
  if (!allowed.includes(value)) throw new TimError('USAGE', refusal)
}

const existingFileReviewPath = ({ workspaceRoot, reviewId, repo, file }) => {
  const path = fileReviewPath(reviewDir(workspaceRoot, reviewId), repo, file)
  if (!existsSync(path)) {
    throw new TimError(
      'NOT_FOUND',
      `No review file at ${path} — call tim review file init first`
    )
  }
  return path
}

/**
 * The id after the highest one, or 1 when there are none.
 *
 * @param {{id: number}[]} entries
 * @returns {number}
 */
export const nextIdAfter = (entries) => {
  const ids = entries.map(({ id }) => id)
  return (ids.length === 0 ? 0 : Math.max(...ids)) + 1
}

/**
 * Writes a file's review placeholder, replacing any review already there.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId] - A ticket key or a `local/<repo>/<branch>` id
 * @param {string} [args.repo]
 * @param {string} [args.file]
 * @param {string} [args.commit]
 * @param {string} [args.pr] - JSON text; the stored PR is null without it
 * @param {string} [args.mode] - One of {@link REVIEW_MODES}
 * @returns {{path: string, review: object}}
 * @throws {TimError} USAGE for a missing option, an unknown mode or a PR that is not JSON
 */
export const initFileReview = ({
  workspaceRoot,
  reviewId,
  repo,
  file,
  commit,
  pr,
  mode
}) => {
  refuseFirstMissing([
    ['TICKET', reviewId],
    ['REPO', repo],
    ['FILE', file],
    ['COMMIT', commit],
    ['MODE', mode]
  ])
  refuseOutside(
    REVIEW_MODES,
    mode,
    `Invalid mode: ${mode} (must be ${REVIEW_MODES.join('|')})`
  )
  const review = {
    file,
    repo,
    commit,
    pr: pr === undefined ? null : parseJsonOption('--pr', pr),
    mode,
    reviewed_at: null,
    verdict: null,
    verdict_reason: null,
    todos: []
  }
  const path = fileReviewPath(reviewDir(workspaceRoot, reviewId), repo, file)
  writeJsonAtomic(path, review)
  return { path, review }
}

/**
 * Appends a todo to a file's review, after its highest todo id.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo]
 * @param {string} [args.file]
 * @param {string} [args.line] - JSON text, stored as the value it parses to
 * @param {string} [args.severity] - One of {@link SEVERITIES}
 * @param {string} [args.category] - One of {@link FINDING_CATEGORIES}
 * @param {string} [args.issue]
 * @param {string} [args.fix]
 * @param {string} [args.bestPractice] - Stored only when not empty
 * @returns {{id: number, path: string, todo: object}}
 * @throws {TimError} USAGE for a missing or invalid option; NOT_FOUND when the file has no review
 */
export const addFileReviewTodo = ({
  workspaceRoot,
  reviewId,
  repo,
  file,
  line,
  severity,
  category,
  issue,
  fix,
  bestPractice = ''
}) => {
  refuseFirstMissing([
    ['TICKET', reviewId],
    ['REPO', repo],
    ['FILE', file],
    ['LINE', line],
    ['SEVERITY', severity],
    ['CATEGORY', category],
    ['ISSUE', issue],
    ['FIX', fix]
  ])
  refuseOutside(
    SEVERITIES,
    severity,
    `Invalid severity: ${severity} (must be ${SEVERITIES.join('|')})`
  )
  refuseCategoryOutside(category, FINDING_CATEGORIES)
  const path = existingFileReviewPath({ workspaceRoot, reviewId, repo, file })
  const review = readJsonFile(path)
  const todo = {
    id: nextIdAfter(review.todos),
    line: parseJsonOption('--line', line),
    severity,
    category,
    issue,
    fix,
    ...(bestPractice === '' ? {} : { best_practice: bestPractice })
  }
  writeJsonAtomic(path, { ...review, todos: [...review.todos, todo] })
  return { id: todo.id, path, todo }
}

/**
 * Sets a file review's verdict and reason, and stamps when it was reviewed.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo]
 * @param {string} [args.file]
 * @param {string} [args.verdict] - One of {@link VERDICTS}
 * @param {string} [args.reason] - Stored as given, empty when not given
 * @param {() => Date} [args.now]
 * @returns {{path: string, review: object}}
 * @throws {TimError} USAGE for a missing or unknown verdict; NOT_FOUND when the file has no review
 */
export const setFileReviewVerdict = ({
  workspaceRoot,
  reviewId,
  repo,
  file,
  verdict,
  reason = '',
  now = () => new Date()
}) => {
  refuseFirstMissing([
    ['TICKET', reviewId],
    ['REPO', repo],
    ['FILE', file],
    ['VERDICT', verdict]
  ])
  refuseOutside(
    VERDICTS,
    verdict,
    `Invalid verdict: ${verdict} (must be ${VERDICTS.join('|')})`
  )
  const path = existingFileReviewPath({ workspaceRoot, reviewId, repo, file })
  const review = {
    ...readJsonFile(path),
    verdict,
    verdict_reason: reason,
    reviewed_at: now()
      .toISOString()
      .replace(/\.\d+Z$/, 'Z')
  }
  writeJsonAtomic(path, review)
  return { path, review }
}
