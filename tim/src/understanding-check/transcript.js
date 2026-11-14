import { existsSync, readFileSync, statSync } from 'node:fs'
import { TimError } from '../errors.js'
import { readJsonFile } from '../backlog/io.js'
import { writeJsonAtomic } from '../review/store.js'
import { commaList, evidenceList } from './lists.js'
import { checkFilePaths, checkFolder } from './paths.js'
import { requireExisting, requireGiven } from './refusals.js'
import { rubricClauseLines, rubricMatchOverlaps } from './rubric.js'

export const SCORE_VERDICTS = ['PASS', 'PARTIAL', 'FAIL']

const UNSCORABLE = '<unscorable>'

const isFile = (path) => existsSync(path) && statSync(path).isFile()

const listIn = (value, path, key) => {
  const list = value[key] ?? []
  if (!Array.isArray(list)) {
    throw new TimError('PARSE', `Error: ${path} ${key} is not a list`)
  }
  return list
}

const readQuestions = (path) => {
  requireExisting(path)
  return listIn(readJsonFile(path), path, 'questions')
}

const entriesOf = (transcript, path) => {
  if (!Array.isArray(transcript.entries)) {
    throw new TimError('PARSE', `Error: ${path} entries is not a list`)
  }
  return transcript.entries
}

const startedTranscript = (path, ticket) => {
  if (existsSync(path)) return readJsonFile(path)
  const transcript = { ticket, entries: [] }
  writeJsonAtomic(path, transcript)
  return transcript
}

const answerTextFrom = (answerFile) => {
  if (!answerFile) {
    throw new TimError(
      'USAGE',
      'Error: --answer-file required unless --skipped'
    )
  }
  if (!isFile(answerFile)) {
    throw new TimError('NOT_FOUND', `Error: ${answerFile} not found`)
  }
  return readFileSync(answerFile, 'utf8').replace(/\n+$/, '')
}

/**
 * Records a developer's answer to a question, replacing any earlier entry
 * for it and putting the new one last. Starts transcript.json when there
 * is none, before the answer file is read. An answer file that is empty,
 * or holds only newlines, records a skip.
 *
 * @param {object} given
 * @param {string} given.workspaceRoot
 * @param {string} given.ticket
 * @param {string} given.questionId
 * @param {string} [given.answerFile] - Needed unless `skipped`
 * @param {boolean} [given.skipped]
 * @param {string} given.now - Second-precision UTC timestamp
 * @returns {{questionId: string, skipped: boolean, characters: number}}
 * @throws {TimError} USAGE for an unknown question or no answer file, NOT_FOUND for a missing file
 */
export const recordAnswer = ({
  workspaceRoot,
  ticket,
  questionId,
  answerFile,
  skipped = false,
  now
}) => {
  const paths = checkFilePaths(checkFolder(workspaceRoot, ticket))
  const questions = readQuestions(paths.questions)
  if (!questions.some((question) => question.id === questionId)) {
    throw new TimError(
      'USAGE',
      `Error: question ${questionId} does not exist in ${paths.questions}`
    )
  }
  const transcript = startedTranscript(paths.transcript, ticket)
  const answer = skipped ? '' : answerTextFrom(answerFile)
  const isSkip = skipped || answer === ''
  const entry = {
    question_id: questionId,
    answered_at: now,
    answer,
    skipped: isSkip,
    score: null
  }
  writeJsonAtomic(paths.transcript, {
    ...transcript,
    entries: [
      ...entriesOf(transcript, paths.transcript).filter(
        (each) => each.question_id !== questionId
      ),
      entry
    ]
  })
  return { questionId, skipped: isSkip, characters: [...answer].length }
}

/**
 * @param {ReturnType<typeof recordAnswer>} recorded
 * @returns {string}
 */
export const recordAnswerText = ({ questionId, skipped, characters }) =>
  skipped
    ? `Recorded skip for ${questionId}.`
    : `Recorded answer for ${questionId} (${characters} chars).`

const quotesRubric = (rubricMatch, question) =>
  rubricMatch !== '' &&
  rubricMatch !== UNSCORABLE &&
  rubricMatchOverlaps(rubricMatch, rubricClauseLines(question))

const isUnquoted = (rubricMatch) =>
  rubricMatch === '' || rubricMatch === UNSCORABLE

const scoreOf = ({
  verdict,
  rubricMatch,
  missedConcepts,
  evidenceCited,
  followUp,
  now
}) => ({
  verdict,
  rubric_match: rubricMatch,
  missed_concepts: commaList(missedConcepts),
  evidence_cited: evidenceList(evidenceCited),
  follow_up: followUp === '' ? null : followUp,
  scored_at: now
})

const addUnscorableGap = (metaPath, questionId) => {
  if (!existsSync(metaPath)) return
  const meta = readJsonFile(metaPath)
  writeJsonAtomic(metaPath, {
    ...meta,
    coverage_gaps: [
      ...(meta.coverage_gaps ?? []),
      { kind: 'unscorable', question_id: questionId }
    ]
  })
}

/**
 * Scores a question's transcript entry. The scorer must quote the rubric:
 * a quote that is empty, `<unscorable>` or overlaps no clause (see
 * `rubricMatchOverlaps`) records FAIL, `<unscorable>` and the missed
 * concept `unscorable`, and adds an unscorable coverage gap to
 * .interview-meta.json when there is one.
 *
 * @param {object} given
 * @param {string} given.workspaceRoot
 * @param {string} [given.ticket]
 * @param {string} [given.questionId]
 * @param {string} [given.verdict] - One of {@link SCORE_VERDICTS}
 * @param {string} [given.rubricMatch]
 * @param {string} [given.missedConcepts] - Comma-separated
 * @param {string} [given.evidenceCited] - `file:lines[,file:lines…]`
 * @param {string} [given.followUp]
 * @param {string} given.now - Second-precision UTC timestamp
 * @returns {{questionId: string, verdict: string, unscorable: boolean, warning: string}}
 * @throws {TimError} USAGE for a missing or bad option, NOT_FOUND for a missing file
 */
export const addScore = ({
  workspaceRoot,
  ticket,
  questionId,
  verdict,
  rubricMatch = '',
  missedConcepts = '',
  evidenceCited,
  followUp = '',
  now
}) => {
  requireGiven({
    TICKET: ticket,
    QID: questionId,
    VERDICT: verdict,
    EVIDENCE: evidenceCited
  })
  if (!SCORE_VERDICTS.includes(verdict)) {
    throw new TimError('USAGE', 'Error: --verdict must be PASS|PARTIAL|FAIL')
  }
  const paths = checkFilePaths(checkFolder(workspaceRoot, ticket))
  const questions = readQuestions(paths.questions)
  requireExisting(paths.transcript, ' — record an answer first')
  const question = questions.find((each) => each.id === questionId)
  const quoted = quotesRubric(rubricMatch, question)
  const warning =
    quoted || isUnquoted(rubricMatch)
      ? ''
      : `Warning: --rubric-match does not overlap any clause in ${questionId}'s rubric; recording as unscorable.`
  const score = scoreOf(
    quoted
      ? { verdict, rubricMatch, missedConcepts, evidenceCited, followUp, now }
      : {
          verdict: 'FAIL',
          rubricMatch: UNSCORABLE,
          missedConcepts: 'unscorable',
          evidenceCited,
          followUp,
          now
        }
  )
  const transcript = readJsonFile(paths.transcript)
  writeJsonAtomic(paths.transcript, {
    ...transcript,
    entries: entriesOf(transcript, paths.transcript).map((entry) =>
      entry.question_id === questionId ? { ...entry, score } : entry
    )
  })
  if (!quoted) addUnscorableGap(paths.meta, questionId)
  return { questionId, verdict: score.verdict, unscorable: !quoted, warning }
}

/**
 * @param {ReturnType<typeof addScore>} scored
 * @returns {string}
 */
export const addScoreText = ({ questionId, verdict }) =>
  `Scored ${questionId}: ${verdict}`
