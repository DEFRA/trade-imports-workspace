import { existsSync } from 'node:fs'
import { TimError } from '../errors.js'
import {
  appendPerFileTodo,
  refuseFirstMissing,
  refuseOutside,
  writePerFileVerdict
} from '../review/file-review.js'
import { refuseCategoryOutside } from '../review/finding-categories.js'
import { STYLE_CATEGORIES, STYLE_SEVERITIES } from './items-ledger.js'
import { fileStylePath, styleDir } from './paths.js'

export const STYLE_VERDICTS = ['COMPLIANT', 'MINOR_ISSUES', 'NEEDS_WORK']

const existingFileStylePath = ({ workspaceRoot, reviewId, repo, file }) => {
  const path = fileStylePath(styleDir(workspaceRoot, reviewId), repo, file)
  if (!existsSync(path)) {
    throw new TimError(
      'NOT_FOUND',
      `No style file at ${path} — call file-style-init.sh first`
    )
  }
  return path
}

/**
 * Appends a finding to a file's style review, after its highest todo id.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo]
 * @param {string} [args.file]
 * @param {string} [args.line] - Stored as the text given; empty when not given
 * @param {string} [args.rule]
 * @param {string} [args.category] - A code-quality or design category
 * @param {string} [args.severity] - FAIL or WARN
 * @param {string} [args.issue]
 * @param {string} [args.fix]
 * @param {string} [args.bestPractice] - Stored only when not empty
 * @returns {{id: number, path: string, todo: object}}
 * @throws {TimError} USAGE for a missing or invalid option; NOT_FOUND when the file has no style review
 */
export const addFileStyleTodo = ({
  workspaceRoot,
  reviewId,
  repo,
  file,
  line = '',
  rule,
  category,
  severity,
  issue,
  fix,
  bestPractice = ''
}) => {
  refuseFirstMissing([
    ['TICKET', reviewId],
    ['REPO', repo],
    ['FILE', file],
    ['RULE', rule],
    ['CATEGORY', category],
    ['SEVERITY', severity],
    ['ISSUE', issue],
    ['FIX', fix]
  ])
  refuseOutside(
    STYLE_SEVERITIES,
    severity,
    `Invalid severity: ${severity} (must be ${STYLE_SEVERITIES.join('|')})`
  )
  refuseCategoryOutside(category, STYLE_CATEGORIES)
  const path = existingFileStylePath({ workspaceRoot, reviewId, repo, file })
  return appendPerFileTodo(path, (id) => ({
    id,
    line,
    rule,
    category,
    severity,
    issue,
    fix,
    ...(bestPractice === '' ? {} : { best_practice: bestPractice })
  }))
}

/**
 * Sets a file style review's verdict and reason, and stamps when it was
 * reviewed.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo]
 * @param {string} [args.file]
 * @param {string} [args.verdict] - One of {@link STYLE_VERDICTS}
 * @param {string} [args.reason] - Stored as given, empty when not given
 * @param {() => Date} [args.now]
 * @returns {{path: string, review: object}}
 * @throws {TimError} USAGE for a missing or unknown verdict; NOT_FOUND when the file has no style review
 */
export const setFileStyleVerdict = ({
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
    STYLE_VERDICTS,
    verdict,
    `Invalid verdict: ${verdict} (must be ${STYLE_VERDICTS.join('|')})`
  )
  const path = existingFileStylePath({ workspaceRoot, reviewId, repo, file })
  return writePerFileVerdict({ path, verdict, reason, now })
}
