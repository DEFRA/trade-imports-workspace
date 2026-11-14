import { TimError } from '../errors.js'
import { readJsonFile } from '../backlog/io.js'
import { writeJsonAtomic } from '../review/store.js'
import { analysisFilePath, checkFolder } from './paths.js'
import { requireExisting, requireGiven } from './refusals.js'

export const FINDING_SECTIONS = [
  'keyDesignDecisions',
  'edgeCases',
  'failureModes',
  'securityRisks',
  'dataOrApiChanges',
  'testCoverageNotes',
  'aiSuspectedRegions'
]

/**
 * A `--field KEY=VALUE` option split on its first `=`.
 *
 * @param {string} field
 * @returns {[string, string]}
 * @throws {TimError} USAGE when the option holds no `=`
 */
export const splitField = (field) => {
  const separator = field.indexOf('=')
  if (separator === -1) {
    throw new TimError(
      'USAGE',
      `Error: --field expects KEY=VALUE, got '${field}'`
    )
  }
  return [field.slice(0, separator), field.slice(separator + 1)]
}

const nextFindingId = (findings = []) =>
  findings
    .map(({ id }) => id)
    .filter((id) => typeof id === 'number')
    .reduce((highest, id) => Math.max(highest, id), 0) + 1

/**
 * Appends a finding to a repo's analysis: an id one past the section's
 * highest, the given fields in order, then its evidence.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.ticket]
 * @param {string} [args.repo]
 * @param {string} [args.section] - One of {@link FINDING_SECTIONS}
 * @param {string} [args.evidenceFile]
 * @param {string} [args.evidenceLines]
 * @param {string[]} [args.fields] - `KEY=VALUE` texts; a later key replaces an earlier one
 * @returns {{id: number}}
 * @throws {TimError} USAGE for a bad or missing option, NOT_FOUND with no analysis file
 */
export const addFinding = ({
  workspaceRoot,
  ticket,
  repo,
  section,
  evidenceFile,
  evidenceLines,
  fields = []
}) => {
  const fieldEntries = fields.map(splitField)
  requireGiven({
    TICKET: ticket,
    REPO: repo,
    SECTION: section,
    EV_FILE: evidenceFile,
    EV_LINES: evidenceLines
  })
  if (!FINDING_SECTIONS.includes(section)) {
    throw new TimError('USAGE', `Error: invalid --section '${section}'`)
  }
  if (fieldEntries.length === 0) {
    throw new TimError(
      'USAGE',
      'Error: at least one --field KEY=VALUE is required'
    )
  }
  const path = analysisFilePath(checkFolder(workspaceRoot, ticket), repo)
  requireExisting(path, ' — run tim understanding-check prepare first')
  const analysis = readJsonFile(path)
  const id = nextFindingId(analysis[section] ?? [])
  const finding = {
    id,
    ...Object.fromEntries(fieldEntries),
    evidence: { file: evidenceFile, lines: evidenceLines }
  }
  writeJsonAtomic(path, {
    ...analysis,
    [section]: [...(analysis[section] ?? []), finding]
  })
  return { id }
}

const characterCount = (text) => [...text].length

const requireAtMostChars = (text, option) => {
  const maxChars = 300
  const count = characterCount(text)
  if (count > maxChars) {
    throw new TimError(
      'USAGE',
      `Error: ${option} exceeds ${maxChars} chars (got ${count})`
    )
  }
}

/**
 * Marks a repo's analysis complete with its change summary, why it
 * changed and the completion time.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.ticket]
 * @param {string} [args.repo]
 * @param {string} [args.changeSummary] - At most 300 characters
 * @param {string} [args.whyItChanged] - At most 300 characters
 * @param {string} args.now - Second-precision UTC timestamp
 * @returns {{repo: string}}
 * @throws {TimError} USAGE for a missing or over-long option, NOT_FOUND with no analysis file
 */
export const completeAnalysis = ({
  workspaceRoot,
  ticket,
  repo,
  changeSummary,
  whyItChanged,
  now
}) => {
  requireGiven({
    TICKET: ticket,
    REPO: repo,
    SUMMARY: changeSummary,
    WHY: whyItChanged
  })
  requireAtMostChars(changeSummary, '--change-summary')
  requireAtMostChars(whyItChanged, '--why-it-changed')
  const path = analysisFilePath(checkFolder(workspaceRoot, ticket), repo)
  requireExisting(path)
  writeJsonAtomic(path, {
    ...readJsonFile(path),
    changeSummary,
    whyItChanged,
    verdict: 'complete',
    completed_at: now
  })
  return { repo }
}

/**
 * @param {ReturnType<typeof completeAnalysis>} completed
 * @returns {string}
 */
export const completeAnalysisText = ({ repo }) =>
  `Marked ${repo} analysis complete.`
