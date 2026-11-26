import { existsSync, readFileSync } from 'node:fs'
import { z } from 'zod'
import { TimError } from '../../errors.js'

export const EVIDENCE_OUTCOMES = ['applied', 'not-applicable', 'needs-a-person']

const hitCount = z.number().int().min(0).nullish()

export const evidenceRowSchema = z.object({
  item: z.string().min(1, 'must say which changelog item the row covers'),
  pattern: z.string().min(1).nullish(),
  hitsBefore: hitCount,
  hitsAfter: hitCount,
  outcome: z.enum(EVIDENCE_OUTCOMES),
  reason: z.string(),
  acceptedBy: z.string().min(1).nullish(),
  acceptedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a date as YYYY-MM-DD')
    .nullish()
})

export const hitsPhrase = (count) => (count === 1 ? '1 hit' : `${count} hits`)

const NOT_COUNTED = 'The pattern has not been counted since the change.'

const acceptedProblem = ({ acceptedBy, acceptedOn, reason }) => {
  if (!acceptedBy || !acceptedOn) {
    return 'An applied row needs a pattern to search for, or who accepted it with no code change and when.'
  }
  if (reason.trim() === '') {
    return 'An applied row a person accepted needs a reason: what they accepted.'
  }
  return null
}

const appliedProblem = ({ pattern, hitsAfter, ...row }) => {
  if (!pattern) return acceptedProblem(row)
  if (hitsAfter == null) return NOT_COUNTED
  if (hitsAfter > 0) return `The pattern still has ${hitsPhrase(hitsAfter)}.`
  return null
}

const notApplicableProblem = ({ pattern, hitsAfter, reason }) => {
  if (reason.trim() === '') return 'A not-applicable row needs a reason.'
  if (!pattern) return null
  if (hitsAfter == null) return NOT_COUNTED
  if (hitsAfter > 0) {
    return `The pattern now has ${hitsPhrase(hitsAfter)}, so the item does apply.`
  }
  return null
}

const problemOf = (row) => {
  if (row.outcome === 'applied') return appliedProblem(row)
  if (row.outcome === 'not-applicable') return notApplicableProblem(row)
  return 'A person needs to decide this item.'
}

/**
 * Whether an evidence row is clean. An applied row is clean when its
 * pattern has no hits after the change, or, with no pattern, when it names
 * who accepted it, when, and what they accepted as its reason. A
 * not-applicable row is clean when it has a reason and its pattern, if any,
 * still has no hits. A row that needs a person is never clean.
 *
 * @param {{outcome: string, pattern?: string|null, hitsAfter?: number|null, reason: string, acceptedBy?: string|null, acceptedOn?: string|null}} row
 * @returns {{clean: boolean, problem: string|null}} `problem` says why a row is not clean
 */
export const evidenceRowVerdict = (row) => {
  const problem = problemOf(row)
  return { clean: problem === null, problem }
}

/**
 * The verdict on every row and on the rows together. No rows is not all
 * clean: the changelog still needs reading.
 *
 * @param {object[]} rows - Valid evidence rows
 * @returns {{allClean: boolean, rowCount: number, notCleanCount: number, rows: {item: string, outcome: string, clean: boolean, problem: string|null}[]}}
 */
export const evidenceRowsVerdict = (rows) => {
  const checked = rows.map((row) => ({
    item: row.item,
    outcome: row.outcome,
    ...evidenceRowVerdict(row)
  }))
  const notCleanCount = checked.filter(({ clean }) => !clean).length
  return {
    allClean: checked.length > 0 && notCleanCount === 0,
    rowCount: checked.length,
    notCleanCount,
    rows: checked
  }
}

const firstIssueMessage = ([issue]) => {
  const where = issue.path.length > 0 ? issue.path.join('.') : 'the file'
  return `${where} ${issue.message}`
}

/**
 * Validate a list of evidence rows.
 *
 * @param {unknown} raw
 * @param {string} label - Names the source in an error, such as a file path
 * @returns {object[]}
 * @throws {TimError} USAGE when the rows are not a list of valid rows
 */
export const parseEvidenceRows = (raw, label) => {
  const parsed = z.array(evidenceRowSchema).safeParse(raw)
  if (!parsed.success) {
    throw new TimError(
      'USAGE',
      `${label}: ${firstIssueMessage(parsed.error.issues)}`
    )
  }
  return parsed.data
}

/**
 * Read and validate a JSON file holding a list of evidence rows.
 *
 * @param {string} path
 * @returns {object[]}
 * @throws {TimError} NOT_FOUND when the file is missing, USAGE when it is not a list of valid rows
 */
export const loadEvidenceRows = (path) => {
  if (!existsSync(path)) {
    throw new TimError('NOT_FOUND', `Can't find the evidence rows at ${path}.`)
  }
  let raw
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new TimError(
      'USAGE',
      `${path} is not valid JSON: ${error.message}`,
      error
    )
  }
  return parseEvidenceRows(raw, path)
}
