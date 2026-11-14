import { existsSync } from 'node:fs'
import { TimError } from '../errors.js'
import { readJsonFile } from '../backlog/io.js'
import { checkFilePaths, checkFolder } from './paths.js'

const VERDICTS = ['PASS', 'PARTIAL', 'FAIL', 'PENDING']

const verdictOf = (entry) => {
  const verdict = entry.score?.verdict
  return verdict === undefined || verdict === null || verdict === false
    ? 'PENDING'
    : verdict
}

const tally = (verdicts) =>
  Object.fromEntries(
    VERDICTS.map((verdict) => [
      verdict,
      verdicts.filter((each) => each === verdict).length
    ])
  )

const sizeOf = (value) => {
  if (value === null || value === undefined) return 0
  if (Array.isArray(value)) return value.length
  if (typeof value === 'object') return Object.keys(value).length
  if (typeof value === 'number') return Math.abs(value)
  if (typeof value === 'string') return [...value].length
  throw new TimError(
    'PARSE',
    `Error: .interview-meta.json coverage_gaps is ${JSON.stringify(value)}, which has no length`
  )
}

const categoryLookup = (questions) =>
  new Map(questions.map(({ id, category }) => [id, category]))

const categoryOf = (categories, entry) => {
  const category = categories.get(entry.question_id)
  if (category === undefined || category === null) {
    throw new TimError(
      'PARSE',
      `Error: transcript.json answers ${entry.question_id}, which has no category in questions.json`
    )
  }
  return category
}

const countByCategory = (entries, categories) => {
  const verdictsByCategory = Map.groupBy(entries, (entry) =>
    categoryOf(categories, entry)
  )
  const categoryNames = [...verdictsByCategory.keys()].sort()
  return Object.fromEntries(
    categoryNames.map((category) => [
      category,
      tally(verdictsByCategory.get(category).map(verdictOf))
    ])
  )
}

/**
 * The verdict counts of an understanding check, overall and by question
 * category, in the shape `.interview-meta.json` keeps them.
 *
 * @param {object} state
 * @param {{questions: {id: string, category: string}[]}} state.questions
 * @param {{entries: object[]}} state.transcript
 * @param {{coverage_gaps?: any[] | object | number | string | null}} state.meta - coverage_gaps counts as jq's `length` does: a number counts as its absolute value, a string as its characters
 * @returns {{total: number, PASS: number, PARTIAL: number, FAIL: number, PENDING: number, security_fails: number, coverage_gaps: number, by_category: Record<string, Record<string, number>>}}
 * @throws {TimError} PARSE when an entry answers a question with no category, or coverage_gaps is true or false
 */
export const countVerdicts = ({ questions, transcript, meta }) => {
  const categories = categoryLookup(questions.questions)
  const { entries } = transcript
  const byCategory = countByCategory(entries, categories)
  return {
    total: entries.length,
    ...tally(entries.map(verdictOf)),
    security_fails: entries.filter(
      (entry) =>
        entry.score?.verdict === 'FAIL' &&
        categories.get(entry.question_id) === 'security'
    ).length,
    coverage_gaps: sizeOf(meta.coverage_gaps),
    by_category: byCategory
  }
}

const readCheckState = (folder) => {
  const paths = checkFilePaths(folder)
  for (const path of Object.values(paths)) {
    if (!existsSync(path)) {
      throw new TimError('NOT_FOUND', `Error: ${path} not found`)
    }
  }
  return {
    questions: readJsonFile(paths.questions),
    transcript: readJsonFile(paths.transcript),
    meta: readJsonFile(paths.meta)
  }
}

/**
 * Counts a ticket's understanding check from its three state files.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.ticket
 * @returns {ReturnType<typeof countVerdicts>}
 * @throws {TimError} NOT_FOUND naming the first state file missing, PARSE as {@link countVerdicts}
 */
export const countCheck = ({ workspaceRoot, ticket }) =>
  countVerdicts(readCheckState(checkFolder(workspaceRoot, ticket)))

/**
 * @param {string} ticket
 * @param {ReturnType<typeof countVerdicts>} counts
 * @returns {string}
 */
export const countsText = (ticket, counts) =>
  [
    `Counts for ${ticket}:`,
    `  Total:    ${counts.total}`,
    `  PASS:     ${counts.PASS}`,
    `  PARTIAL:  ${counts.PARTIAL}`,
    `  FAIL:     ${counts.FAIL}`,
    `  PENDING:  ${counts.PENDING}`,
    `  Security FAILs:  ${counts.security_fails}`,
    `  Coverage gaps:   ${counts.coverage_gaps}`,
    '',
    'By category:',
    ...Object.entries(counts.by_category).map(
      ([category, { PASS, PARTIAL, FAIL, PENDING }]) =>
        `  ${category}: PASS=${PASS} PARTIAL=${PARTIAL} FAIL=${FAIL} PENDING=${PENDING}`
    )
  ].join('\n')
