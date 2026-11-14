import { existsSync } from 'node:fs'
import { readJsonFile } from '../backlog/io.js'
import { analysisFilePath, checkFilePaths, checkFolder } from './paths.js'
import { FINDING_SECTIONS } from './analysis.js'

const isBlank = (value) => value === undefined || value === null || value === ''

const findingsOf = (analysis) =>
  FINDING_SECTIONS.flatMap((section) => {
    const findings = analysis[section]
    return Array.isArray(findings) ? findings.flat(Infinity) : [findings]
  })

const lacksEvidence = (finding) => {
  const evidence = finding?.evidence
  return isBlank(evidence) || isBlank(evidence.file) || isBlank(evidence.lines)
}

const analysisErrors = (folder, repo) => {
  const path = analysisFilePath(folder, repo)
  if (!existsSync(path)) return [`analysis missing for repo: ${repo}`]
  const analysis = readJsonFile(path)
  const unevidenced = findingsOf(analysis).filter(lacksEvidence).length
  return [
    ...(analysis.verdict === 'complete'
      ? []
      : [`analysis verdict not complete: ${repo}`]),
    ...(unevidenced > 0
      ? [`${unevidenced} finding(s) without evidence in ${repo}`]
      : [])
  ]
}

const repoText = (repo) =>
  typeof repo === 'string' ? repo : JSON.stringify(repo ?? null)

const reposOf = (meta) =>
  (meta.prs ?? [])
    .map(({ repo }) => repoText(repo))
    .filter((repo) => repo !== '')

const answerErrors = (questions, transcript) => {
  const answeredIds = new Set(
    transcript.entries.map(({ question_id: questionId }) => questionId)
  )
  const unanswered = questions.questions
    .map(({ id }) => id)
    .filter((id) => !answeredIds.has(id))
  const unscored = transcript.entries
    .filter(({ score }) => score === undefined || score === null)
    .map(({ question_id: questionId }) => questionId)
  return [
    ...(unanswered.length > 0
      ? [`unanswered questions: ${unanswered.join(',')}`]
      : []),
    ...(unscored.length > 0 ? [`unscored answers: ${unscored.join(',')}`] : [])
  ]
}

const missingFileErrors = (paths) => [
  ...(existsSync(paths.meta) ? [] : [`meta file missing: ${paths.meta}`]),
  ...(existsSync(paths.questions) ? [] : ['questions.json missing']),
  ...(existsSync(paths.transcript) ? [] : ['transcript.json missing'])
]

/**
 * Checks a ticket's check is ready for a verdict: its state files exist,
 * every repo's analysis is complete with evidence on every finding, and
 * every question has an answer with a score.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.ticket
 * @returns {{ok: boolean, errors: string[]}}
 * @throws {TimError} PARSE when a state file is not valid JSON
 */
export const verifyCoverage = ({ workspaceRoot, ticket }) => {
  const folder = checkFolder(workspaceRoot, ticket)
  const paths = checkFilePaths(folder)
  const missing = missingFileErrors(paths)
  const errors =
    missing.length > 0
      ? missing
      : [
          ...reposOf(readJsonFile(paths.meta)).flatMap((repo) =>
            analysisErrors(folder, repo)
          ),
          ...answerErrors(
            readJsonFile(paths.questions),
            readJsonFile(paths.transcript)
          )
        ]
  return { ok: errors.length === 0, errors }
}

/**
 * @param {string} ticket
 * @param {ReturnType<typeof verifyCoverage>} coverage
 * @returns {string | null} Null when the check has gaps
 */
export const coverageOkText = (ticket, { ok }) =>
  ok ? `Coverage OK for ${ticket}` : null

/**
 * @param {ReturnType<typeof verifyCoverage>} coverage
 * @returns {string} Empty when there are no gaps
 */
export const coverageGapsText = ({ errors }) =>
  errors.length === 0
    ? ''
    : ['Coverage gaps:', ...errors.map((error) => `  - ${error}`)].join('\n')
