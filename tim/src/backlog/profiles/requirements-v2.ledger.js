import { z } from 'zod'
import { TimError } from '../../errors.js'
import { passthrough } from './intake.js'

/** DESIGN 3.11: a question is a slug Sam answers by; never renumbered. */
export const QUESTION_ID = /^q-[a-z0-9]+(-[a-z0-9]+)*$/

/** DESIGN 3.7: decisions are append-ordered and never reused. */
export const DECISION_ID = /^d-\d{3,}$/

/** DESIGN 3.11: assumptions are slugs. */
export const ASSUMPTION_ID = /^as-[a-z0-9]+(-[a-z0-9]+)*$/

/** DESIGN 3.11: a requirement atom's handle. */
export const REQUIREMENT_ID = /^req-\d{3,}$/

/** DESIGN 3.6: a question option's id is a single capital letter. */
export const OPTION_ID = /^[A-Z]$/

/** DESIGN 3.6's ten question categories. */
export const QUESTION_CATEGORIES = [
  'scope',
  'policy',
  'security',
  'access-control',
  'data-integrity',
  'legal',
  'design',
  'content',
  'technical',
  'process'
]

/**
 * The five categories DESIGN 3.6 says are "always must-answer": a question
 * in one of these can never carry a default (req-031).
 */
export const MUST_ANSWER_CATEGORIES = [
  'security',
  'access-control',
  'data-integrity',
  'legal',
  'policy'
]

/** DESIGN 3.6's question status enum. */
export const QUESTION_STATUSES = [
  'open',
  'outstanding',
  'ruled',
  'superseded',
  'withdrawn'
]

/** DESIGN 3.7's decision status enum. */
export const DECISION_STATUSES = [
  'current',
  'superseded',
  'tentative',
  'defaulted'
]

/**
 * DESIGN 3.6's one definition of "awaiting a ruling": a question's status is
 * one of these two.
 */
export const AWAITING_STATUSES = ['open', 'outstanding']

/** DESIGN 3.7's twelve effect ops. */
export const EFFECT_OPS = [
  'adopt',
  'park',
  'reject',
  'supersede',
  'clear-need',
  'set-assumption',
  'add-invariant',
  'drop-increment',
  'defer-increment',
  'strip-dependency',
  'set-delivery',
  'split'
]

/**
 * The eight ops `rule` actually implements (D7). The other four
 * (`add-invariant`, `strip-dependency`, `set-delivery`, `split`) validate
 * but are refused when `rule` is asked to apply one.
 */
export const APPLICABLE_OPS = [
  'adopt',
  'park',
  'reject',
  'supersede',
  'clear-need',
  'set-assumption',
  'defer-increment',
  'drop-increment'
]

/** DESIGN 3.7's decision subject kinds. */
export const SUBJECT_KINDS = ['conflict', 'combination', 'surface', 'design']

const targetId = z.string().min(1)

const builtEffectShapes = {
  adopt: passthrough({ op: z.literal('adopt'), target: targetId }),
  park: passthrough({ op: z.literal('park'), target: targetId }),
  reject: passthrough({ op: z.literal('reject'), target: targetId }),
  supersede: passthrough({
    op: z.literal('supersede'),
    target: targetId,
    by: targetId
  }),
  'clear-need': passthrough({
    op: z.literal('clear-need'),
    target: targetId,
    value: z.string().min(1).optional()
  }),
  'set-assumption': passthrough({
    op: z.literal('set-assumption'),
    target: targetId,
    value: z.string().min(1)
  }),
  'defer-increment': passthrough({
    op: z.literal('defer-increment'),
    target: targetId
  }),
  'drop-increment': passthrough({
    op: z.literal('drop-increment'),
    target: targetId
  })
}

const UNBUILT_OPS = EFFECT_OPS.filter((op) => !APPLICABLE_OPS.includes(op))

const unbuiltEffectShapes = Object.fromEntries(
  UNBUILT_OPS.map((op) => [
    op,
    passthrough({ op: z.literal(op), target: targetId })
  ])
)

/**
 * One effect, shaped per op: the eight D7 implements strictly, the other
 * four loosely (they validate so a stored record still parses, but `rule`
 * refuses to apply one).
 */
export const effectSchema = z.union(
  Object.values({ ...builtEffectShapes, ...unbuiltEffectShapes })
)

/** DESIGN 4.3: the ISO date or date-time `rule --at` and a decision's
 * `decidedAt` are checked against. */
export const ISO_DATE_OR_DATETIME =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/

/**
 * Whether a question is awaiting a ruling — DESIGN 3.6's one definition.
 *
 * @param {object} question
 * @returns {boolean}
 */
export const isAwaitingRuling = (question) =>
  AWAITING_STATUSES.includes(question?.status)

/**
 * Whether a question has a default it can be ruled by (its
 * `ifNobodyAnswers.option` is not `null`).
 *
 * @param {object} question
 * @returns {boolean}
 */
export const hasDefault = (question) =>
  question?.ifNobodyAnswers?.option != null

/**
 * The decision in force for a question: `current` or `defaulted`, with no
 * `supersededBy`. There is at most one, once `checkLedger` has run.
 *
 * @param {object} backlog
 * @param {string} questionId
 * @returns {object|null}
 */
export const decisionInForce = (backlog, questionId) =>
  (backlog.decisions ?? []).find(
    (decision) =>
      decision.question === questionId &&
      (decision.status === 'current' || decision.status === 'defaulted') &&
      decision.supersededBy == null
  ) ?? null

/**
 * The `defaulted` decision in force for a question, ignoring superseded
 * ones.
 *
 * @param {object} backlog
 * @param {string} questionId
 * @returns {object|null}
 */
export const defaultInForce = (backlog, questionId) => {
  const inForce = decisionInForce(backlog, questionId)
  return inForce?.status === 'defaulted' ? inForce : null
}

/**
 * The sorted ids of every increment whose `needs` names this question
 * (DESIGN 3.6's `blastRadius.blocks`).
 *
 * @param {object} backlog
 * @param {string} questionId
 * @returns {string[]}
 */
export const blockingIncrementIds = (backlog, questionId) =>
  (backlog.increments ?? [])
    .filter((increment) => (increment.needs ?? []).includes(questionId))
    .map((increment) => increment.id)
    .sort()

const refuse = (message) => {
  throw new TimError('PARSE', message)
}

const nameOf = (question) =>
  question?.headline
    ? `${question.id} (${question.headline})`
    : (question?.id ?? 'a question')

const checkOption = (question, option, index) => {
  if (typeof option?.id !== 'string' || !OPTION_ID.test(option.id)) {
    refuse(
      `${nameOf(question)}: option ${index + 1} has no single-capital-letter id.`
    )
  }
  if (typeof option.text !== 'string' || option.text.trim() === '') {
    refuse(`${nameOf(question)}: option ${option.id} has no "text".`)
  }
  if (!Array.isArray(option.sources)) {
    refuse(`${nameOf(question)}: option ${option.id} has no "sources" list.`)
  }
  for (const effect of option.effects ?? []) {
    if (Object.hasOwn(effect, 'prior')) {
      refuse(
        `${nameOf(question)}: option ${option.id}'s "${effect.op}" effect carries "prior". A predeclared effect never does.`
      )
    }
    const parsedEffect = effectSchema.safeParse(effect)
    if (!parsedEffect.success) {
      refuse(
        `${nameOf(question)}: option ${option.id}'s effect (op "${effect?.op}") is not valid: ${parsedEffect.error.issues[0]?.message ?? 'an unrecognised shape'}.`
      )
    }
  }
}

const checkQuestion = (question, seenIds) => {
  if (typeof question?.id !== 'string' || !QUESTION_ID.test(question.id)) {
    refuse(
      `"${question?.id ?? 'unknown'}" is not a valid question id (q-<slug>).`
    )
  }
  if (seenIds.has(question.id)) {
    refuse(`${nameOf(question)}: duplicate question id.`)
  }
  seenIds.add(question.id)

  if (
    typeof question.headline !== 'string' ||
    question.headline.trim() === ''
  ) {
    refuse(`${question.id}: "headline" is empty.`)
  }
  if (!Array.isArray(question.options) || question.options.length < 2) {
    refuse(`${nameOf(question)}: needs at least two options.`)
  }

  const optionIds = new Set()
  question.options.forEach((option, index) => {
    checkOption(question, option, index)
    if (optionIds.has(option.id)) {
      refuse(`${nameOf(question)}: duplicate option id "${option.id}".`)
    }
    optionIds.add(option.id)
  })

  const ifNobodyAnswers = question.ifNobodyAnswers
  if (
    !ifNobodyAnswers ||
    typeof ifNobodyAnswers.consequence !== 'string' ||
    ifNobodyAnswers.consequence.trim() === ''
  ) {
    refuse(`${nameOf(question)}: "ifNobodyAnswers.consequence" is missing.`)
  }
  const defaultOption = ifNobodyAnswers.option
  if (defaultOption !== null && !optionIds.has(defaultOption)) {
    refuse(
      `${nameOf(question)}: "ifNobodyAnswers.option" names no option ("${defaultOption}").`
    )
  }

  if (!QUESTION_CATEGORIES.includes(question.category)) {
    refuse(
      `${nameOf(question)}: "category" is "${question.category}". Allowed: ${QUESTION_CATEGORIES.join(', ')}.`
    )
  }
  if (!QUESTION_STATUSES.includes(question.status)) {
    refuse(
      `${nameOf(question)}: "status" is "${question.status}". Allowed: ${QUESTION_STATUSES.join(', ')}.`
    )
  }

  const isMustAnswerCategory = MUST_ANSWER_CATEGORIES.includes(
    question.category
  )
  if (isMustAnswerCategory && defaultOption !== null) {
    refuse(
      `${nameOf(question)}: category "${question.category}" must be answered by a person, so it cannot take a default.`
    )
  }

  const derivedClass = defaultOption === null ? 'must-answer' : 'defaulted'
  const derivedMustAnswer = defaultOption === null
  if (question.class !== undefined && question.class !== derivedClass) {
    refuse(
      `${nameOf(question)}: "class" is "${question.class}", but its default derives "${derivedClass}".`
    )
  }
  if (
    question.mustAnswer !== undefined &&
    question.mustAnswer !== derivedMustAnswer
  ) {
    refuse(
      `${nameOf(question)}: "mustAnswer" is ${question.mustAnswer}, but its default derives ${derivedMustAnswer}.`
    )
  }
}

const checkDecisionShape = (decision, questionsById, seenIds) => {
  if (typeof decision?.id !== 'string' || !DECISION_ID.test(decision.id)) {
    refuse(`"${decision?.id ?? 'unknown'}" is not a valid decision id (d-NNN).`)
  }
  if (seenIds.has(decision.id)) {
    refuse(`${decision.id}: duplicate decision id.`)
  }
  seenIds.add(decision.id)

  if (!DECISION_STATUSES.includes(decision.status)) {
    refuse(
      `${decision.id}: "status" is "${decision.status}". Allowed: ${DECISION_STATUSES.join(', ')}.`
    )
  }
  if (typeof decision.note !== 'string' || decision.note.trim() === '') {
    refuse(`${decision.id}: "note" is empty.`)
  }
  if (!ISO_DATE_OR_DATETIME.test(decision.decidedAt ?? '')) {
    refuse(
      `${decision.id}: "decidedAt" ("${decision.decidedAt}") is not an ISO date or date-time.`
    )
  }

  const hasQuestion = decision.question != null
  const hasSubject = decision.subject != null
  if (hasQuestion === hasSubject) {
    refuse(
      `${decision.id}: names both "question" and "subject", or neither. It must name exactly one.`
    )
  }
  if (hasSubject && !SUBJECT_KINDS.includes(decision.subject.kind)) {
    refuse(
      `${decision.id}: "subject.kind" is "${decision.subject.kind}". Allowed: ${SUBJECT_KINDS.join(', ')}.`
    )
  }
  if (hasQuestion) {
    const question = questionsById.get(decision.question)
    if (!question) {
      refuse(
        `${decision.id}: "question" names "${decision.question}", which is not in questions[].`
      )
    }
    if (
      decision.chosen != null &&
      !(question.options ?? []).some((option) => option.id === decision.chosen)
    ) {
      refuse(
        `${decision.id}: "chosen" ("${decision.chosen}") is not one of ${question.id}'s options.`
      )
    }
  }

  if (decision.status === 'defaulted' && decision.decidedBy !== 'default') {
    refuse(`${decision.id}: status "defaulted" needs "decidedBy": "default".`)
  }

  for (const effect of decision.effects ?? []) {
    if (!Object.hasOwn(effect, 'prior')) {
      refuse(
        `${decision.id}: applied effect "${effect.op}" on "${effect.target}" carries no "prior". An applied effect always carries its prior state; this one does not.`
      )
    }
  }
}

const checkCrossReferences = (questions, decisions) => {
  const decisionIds = new Set(decisions.map((decision) => decision.id))
  for (const decision of decisions) {
    if (decision.supersedes != null && !decisionIds.has(decision.supersedes)) {
      refuse(
        `${decision.id}: "supersedes" names "${decision.supersedes}", which is not in decisions[].`
      )
    }
    if (
      decision.supersededBy != null &&
      !decisionIds.has(decision.supersededBy)
    ) {
      refuse(
        `${decision.id}: "supersededBy" names "${decision.supersededBy}", which is not in decisions[].`
      )
    }
  }

  const decisionsById = new Map(
    decisions.map((decision) => [decision.id, decision])
  )
  for (const question of questions) {
    if (question.decision == null) continue
    const decision = decisionsById.get(question.decision)
    if (!decision) {
      refuse(
        `${nameOf(question)}: "decision" names "${question.decision}", which is not in decisions[].`
      )
    }
    if (decision.question !== question.id) {
      refuse(
        `${nameOf(question)}: "decision" (${decision.id}) names a different question ("${decision.question}").`
      )
    }
  }

  for (const question of questions) {
    const inForce = decisions.filter(
      (decision) =>
        decision.question === question.id &&
        (decision.status === 'current' || decision.status === 'defaulted') &&
        decision.supersededBy == null
    )
    if (inForce.length > 1) {
      refuse(
        `${nameOf(question)}: more than one decision is in force (${inForce.map((decision) => decision.id).join(', ')}).`
      )
    }
  }
}

const checkAtomNeeds = (atoms, questionsById) => {
  for (const atom of atoms) {
    for (const questionId of atom.needs ?? []) {
      const question = questionsById.get(questionId)
      if (!question) continue
      if (hasDefault(question)) {
        refuse(
          `${atom.id}: "needs" names "${questionId}", which has a default. Only a must-answer question awaiting a ruling may block.`
        )
      }
      if (!isAwaitingRuling(question)) {
        refuse(
          `${atom.id}: "needs" names "${questionId}", which is no longer awaiting a ruling (status "${question.status}").`
        )
      }
    }
  }
}

/**
 * Check `questions[]`, `decisions[]` and every atom's `needs` reference
 * against DESIGN 3.6 and 3.7, the ledger's own invariants (D3). Runs inside
 * `parseV2Backlog`, so every writer — `ingest --atoms`, `ingest
 * --increments`, `rule` — refuses a malformed ledger, naming the question or
 * decision and its headline where it has one.
 *
 * @param {object} backlog - A parsed v2 backlog (atoms and increments
 *   already resolved)
 * @returns {object} The same backlog, unchanged
 * @throws {TimError} PARSE
 */
export const checkLedger = (backlog) => {
  const questions = backlog.questions ?? []
  const decisions = backlog.decisions ?? []
  const atoms = backlog.requirements ?? []

  const seenQuestionIds = new Set()
  for (const question of questions) checkQuestion(question, seenQuestionIds)

  const questionsById = new Map(
    questions.map((question) => [question.id, question])
  )

  const seenDecisionIds = new Set()
  for (const decision of decisions) {
    checkDecisionShape(decision, questionsById, seenDecisionIds)
  }

  checkCrossReferences(questions, decisions)
  checkAtomNeeds(atoms, questionsById)

  return backlog
}
