import { existsSync } from 'node:fs'
import { TimError } from '../errors.js'
import { readJsonFile } from '../backlog/io.js'
import { writeJsonAtomic } from '../review/store.js'
import { elements } from './jq-values.js'
import { commaList } from './lists.js'
import { checkFilePaths, checkFolder } from './paths.js'
import { requireExisting, requireGiven } from './refusals.js'
import { hasCategoricalVerb } from './rubric.js'

export const QUESTION_CATEGORIES = [
  'architecture',
  'implementation',
  'scenario',
  'debugging',
  'test-coverage',
  'operability',
  'security'
]

const VERB_LIST =
  'names | identifies | explains | describes | cites | distinguishes | contrasts | enumerates'

const requireCategory = (category) => {
  if (!QUESTION_CATEGORIES.includes(category)) {
    throw new TimError('USAGE', `Error: invalid --category '${category}'`)
  }
}

const questionFields = ({
  ticket,
  category,
  prompt,
  anchorFile,
  anchorLines,
  expectedConcepts,
  rubricPass,
  rubricPartial,
  rubricFail
}) => ({
  TICKET: ticket,
  CATEGORY: category,
  PROMPT: prompt,
  ANCHOR_FILE: anchorFile,
  ANCHOR_LINES: anchorLines,
  CONCEPTS: expectedConcepts,
  RUBRIC_PASS: rubricPass,
  RUBRIC_PARTIAL: rubricPartial,
  RUBRIC_FAIL: rubricFail
})

const questionOf = (id, given) => ({
  id,
  category: given.category,
  prompt: given.prompt,
  anchorEvidence: { file: given.anchorFile, lines: given.anchorLines },
  expectedConcepts: commaList(given.expectedConcepts),
  rubric: {
    PASS: given.rubricPass,
    PARTIAL: given.rubricPartial,
    FAIL: given.rubricFail
  }
})

const questionsPath = (workspaceRoot, ticket) =>
  checkFilePaths(checkFolder(workspaceRoot, ticket)).questions

const questionListOf = (questionSet, path) => {
  const questions = questionSet.questions ?? []
  if (!Array.isArray(questions)) {
    throw new TimError('PARSE', `Error: ${path} questions is not a list`)
  }
  return questions
}

const hasQuestion = (questions, id) =>
  questions.some((question) => question.id === id)

/**
 * The options question add and question replace take.
 *
 * @typedef {object} QuestionOptions
 * @property {string} workspaceRoot
 * @property {string} [ticket]
 * @property {string} [category] - One of {@link QUESTION_CATEGORIES}
 * @property {string} [prompt]
 * @property {string} [anchorFile]
 * @property {string} [anchorLines]
 * @property {string} [expectedConcepts] - Comma-separated
 * @property {string} [rubricPass] - Must hold a categorical verb
 * @property {string} [rubricPartial] - Must hold a categorical verb
 * @property {string} [rubricFail]
 */

const requireAddable = (given) => {
  requireGiven(questionFields(given))
  requireCategory(given.category)
  for (const [option, clause] of [
    ['--rubric-pass', given.rubricPass],
    ['--rubric-partial', given.rubricPartial]
  ]) {
    if (!hasCategoricalVerb(clause)) {
      throw new TimError(
        'USAGE',
        `Error: ${option} must contain one of: ${VERB_LIST}\nGot: '${clause}'`
      )
    }
  }
}

const startedQuestionSet = ({ workspaceRoot, ticket, now }) => {
  const folder = checkFolder(workspaceRoot, ticket)
  const path = questionsPath(workspaceRoot, ticket)
  if (existsSync(path)) return readJsonFile(path)
  requireExisting(folder, ' — run tim understanding-check prepare first')
  return { ticket, generated_at: now, questions: [] }
}

/**
 * Appends a question to the check's questions.json, starting the file
 * when there is none. Its id is one past the number of questions.
 *
 * @param {QuestionOptions & {now: string}} given - `now` stamps a new file
 * @returns {{id: string}}
 * @throws {TimError} USAGE for a missing or bad option or a full set, NOT_FOUND with no check folder
 */
export const addQuestion = (given) => {
  const maxQuestions = 12
  requireAddable(given)
  const path = questionsPath(given.workspaceRoot, given.ticket)
  const questionSet = startedQuestionSet(given)
  const questions = questionListOf(questionSet, path)
  if (questions.length >= maxQuestions) {
    throw new TimError(
      'USAGE',
      `Error: question cap (${maxQuestions}) already reached`
    )
  }
  const id = `Q${questions.length + 1}`
  writeJsonAtomic(path, {
    ...questionSet,
    questions: [...questions, questionOf(id, given)]
  })
  return { id }
}

const requireReplaceable = (given) => {
  const { TICKET, ...fields } = questionFields(given)
  requireGiven({ TICKET, ID: given.id, ...fields })
  requireCategory(given.category)
  if (!hasCategoricalVerb(given.rubricPass)) {
    throw new TimError(
      'USAGE',
      'Error: --rubric-pass must contain a categorical verb (names|identifies|explains|describes|cites|distinguishes|contrasts|enumerates)'
    )
  }
  if (!hasCategoricalVerb(given.rubricPartial)) {
    throw new TimError(
      'USAGE',
      'Error: --rubric-partial must contain a categorical verb'
    )
  }
}

const readExistingQuestions = (path) => {
  requireExisting(path)
  const questionSet = readJsonFile(path)
  return {
    questionSet,
    questions: elements(questionSet?.questions, `${path} questions`)
  }
}

/**
 * Replaces the question with the given id in place, keeping its id.
 *
 * @param {QuestionOptions & {id?: string}} given
 * @returns {{id: string}}
 * @throws {TimError} USAGE for a missing or bad option or an unknown id, NOT_FOUND with no questions.json
 */
export const replaceQuestion = (given) => {
  requireReplaceable(given)
  const path = questionsPath(given.workspaceRoot, given.ticket)
  const { questionSet, questions } = readExistingQuestions(path)
  if (!hasQuestion(questions, given.id)) {
    throw new TimError(
      'USAGE',
      `Error: question ${given.id} not found in ${path}`
    )
  }
  writeJsonAtomic(path, {
    ...questionSet,
    questions: questions.map((question) =>
      question.id === given.id ? questionOf(given.id, given) : question
    )
  })
  return { id: given.id }
}

/**
 * Removes the question with the given id and numbers the rest Q1, Q2 and
 * on, in order.
 *
 * @param {object} given
 * @param {string} given.workspaceRoot
 * @param {string} given.ticket
 * @param {string} given.id
 * @returns {{id: string}}
 * @throws {TimError} USAGE for an unknown id, NOT_FOUND with no questions.json
 */
export const removeQuestion = ({ workspaceRoot, ticket, id }) => {
  const path = questionsPath(workspaceRoot, ticket)
  const { questionSet, questions } = readExistingQuestions(path)
  if (!hasQuestion(questions, id)) {
    throw new TimError('USAGE', `Error: question ${id} not found`)
  }
  writeJsonAtomic(path, {
    ...questionSet,
    questions: questions
      .filter((question) => question.id !== id)
      .map((question, index) => ({ ...question, id: `Q${index + 1}` }))
  })
  return { id }
}
