import { TimError } from '../errors.js'
import { commitWithReplay, parseJsonText } from './write.js'
import { fingerprintOf } from './ops-log.js'
import { startedIncrementIds } from './state.js'
import { parseV2Backlog } from './profiles/requirements-v2.js'
import {
  needsFor,
  bornStatusFor
} from './profiles/requirements-v2-increments.js'
import {
  hasDefault,
  decisionInForce,
  REQUIREMENT_ID
} from './profiles/requirements-v2.ledger.js'
import {
  applyEffect,
  revertEffect,
  clearNeedEffects,
  builtWorkGuard
} from './effects.js'

const REQUIREMENTS_V2 = 'requirements-v2'
const COMMAND = 'backlog rule'

const HEDGE_WORDS = /\b(maybe|probably|perhaps|not sure)\b/i
const HEDGE_LETTER = /(^|[^A-Za-z])[A-Z]\?/

/**
 * Whether a ruler's words hedge (DESIGN 6.4, word for word): `maybe`,
 * `probably`, `perhaps` or `not sure` as whole words in any case, or a
 * capital letter followed straight by `?`, on its own ("B?", not "OK?").
 * Any other `?` is punctuation — "B. Why not?" and "Is this right? A." are
 * not hedges; "Maybelline" is not either, because `maybe` is not a whole
 * word inside it.
 *
 * @param {string} [words]
 * @returns {boolean}
 */
export const isHedged = (words) =>
  HEDGE_WORDS.test(words ?? '') || HEDGE_LETTER.test(words ?? '')

const deepEqual = (beforeValue, afterValue) =>
  JSON.stringify(beforeValue ?? null) === JSON.stringify(afterValue ?? null)

const FIELD_SPECS = [
  { collection: 'requirements', fields: ['status', 'needs', 'supersededBy'] },
  { collection: 'increments', fields: ['status', 'needs', 'statusNote'] },
  { collection: 'assumptions', fields: ['default', 'decision'] },
  { collection: 'questions', fields: ['status', 'decision'] },
  { collection: 'decisions', fields: ['status', 'supersededBy'] }
]

/**
 * Every field a ruling can touch (D15) that differs between two versions of
 * the backlog, each `{target, field, before, after}`. Nothing unchanged is
 * listed.
 *
 * @param {object} before
 * @param {object} after
 * @returns {{target: string, field: string, before: any, after: any}[]}
 */
export const changesBetween = (before, after) => {
  const changes = []
  for (const { collection, fields } of FIELD_SPECS) {
    const afterRows = after[collection] ?? []
    const beforeById = new Map(
      (before[collection] ?? []).map((row) => [row.id, row])
    )
    for (const row of afterRows) {
      const beforeRow = beforeById.get(row.id)
      for (const field of fields) {
        const beforeValue = beforeRow ? (beforeRow[field] ?? null) : null
        const afterValue = row[field] ?? null
        if (!deepEqual(beforeValue, afterValue)) {
          changes.push({
            target: row.id,
            field,
            before: beforeValue,
            after: afterValue
          })
        }
      }
    }
  }
  const beforeSha = before.combination?.basis?.atomsSha ?? null
  const afterSha = after.combination?.basis?.atomsSha ?? null
  if (!deepEqual(beforeSha, afterSha)) {
    changes.push({
      target: 'combination',
      field: 'basis.atomsSha',
      before: beforeSha,
      after: afterSha
    })
  }
  return changes
}

/**
 * One paste-ready reversal command per other option (DESIGN 6.3's exact
 * form), for a defaulted decision's result.
 *
 * @param {object} args
 * @param {string} args.programme
 * @param {object} args.question
 * @param {string} args.chosen
 * @returns {string[]}
 */
export const reverseCommandsFor = ({ programme, question, chosen }) =>
  (question.options ?? [])
    .filter((option) => option.id !== chosen)
    .map(
      (option) =>
        `tim backlog rule ${programme} ${question.id} --option ${option.id} --by sam --at <now> --words "<your words>" --note "<why>"`
    )

const DECISION_ID_PAD_WIDTH = 3

const nextDecisionId = (decisions) => {
  const highest = decisions.reduce((max, decision) => {
    const match = /^d-(\d+)$/.exec(decision.id ?? '')
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return `d-${String(highest + 1).padStart(DECISION_ID_PAD_WIDTH, '0')}`
}

/**
 * The `--by default` refusals (D11): no default to fall back to, combined
 * with `--tentative`, a different option forced alongside it, or a decision
 * already in force.
 *
 * @param {object} args
 * @param {object} args.question
 * @param {string} args.questionId
 * @param {object} args.backlog
 * @param {boolean} [args.tentative]
 * @param {string} [args.option]
 * @throws {TimError} USAGE
 */
const validateDefaultRuling = ({
  question,
  questionId,
  backlog,
  tentative,
  option
}) => {
  if (!hasDefault(question)) {
    throw new TimError(
      'USAGE',
      `${questionId} must be answered by a person, so it has no default.`
    )
  }
  if (tentative) {
    throw new TimError(
      'USAGE',
      '"--by default" cannot be combined with "--tentative".'
    )
  }
  const defaultOption = question.ifNobodyAnswers.option
  if (option && option !== defaultOption) {
    throw new TimError(
      'USAGE',
      `${questionId}'s default is option ${defaultOption}. "--by default" cannot apply a different option.`
    )
  }
  const inForceAlready = decisionInForce(backlog, questionId)
  if (inForceAlready) {
    throw new TimError(
      'USAGE',
      `${questionId} already has a decision in force (${inForceAlready.id}). "--by default" only applies before any ruling.`
    )
  }
}

const resolveChosenOption = ({ question, questionId, chosenLetter }) => {
  const chosenOption = (question.options ?? []).find(
    (candidate) => candidate.id === chosenLetter
  )
  if (!chosenOption) {
    throw new TimError(
      'USAGE',
      `"${chosenLetter}" is not one of ${questionId}'s options.`
    )
  }
  return chosenOption
}

/**
 * The `--supersedes` refusals (D12) for a real (non-default, non-tentative)
 * ruling: a `current` decision needs `--supersedes` naming it, a `defaulted`
 * one only accepts its own id or none, and nothing in force accepts no
 * `--supersedes` at all.
 *
 * @param {object} args
 * @param {string} args.questionId
 * @param {object|null} args.existing
 * @param {string} [args.supersedes]
 * @throws {TimError} USAGE
 */
const validateSupersedes = ({ questionId, existing, supersedes }) => {
  if (existing?.status === 'current' && supersedes !== existing.id) {
    throw new TimError(
      'USAGE',
      `${questionId} was ruled by ${existing.id}. To change it, pass --supersedes ${existing.id}.`
    )
  }
  if (
    existing?.status === 'defaulted' &&
    supersedes &&
    supersedes !== existing.id
  ) {
    throw new TimError(
      'USAGE',
      `${questionId}'s default is ${existing.id}. Pass --supersedes ${existing.id}, or leave it out — a person's ruling supersedes a default automatically.`
    )
  }
  if (
    existing?.status !== 'current' &&
    existing?.status !== 'defaulted' &&
    supersedes
  ) {
    throw new TimError(
      'USAGE',
      `${questionId} has no decision in force to supersede.`
    )
  }
}

const buildTentativeDecision = ({
  newDecisionId,
  questionId,
  chosenOption,
  words,
  note,
  by,
  at,
  appliesTo
}) => ({
  id: newDecisionId,
  question: questionId,
  subject: null,
  chosen: chosenOption.id,
  answer: null,
  words: words ?? '',
  note: note ?? '',
  decidedBy: by,
  decidedAt: at,
  sealedEvidence: [],
  appliesTo: [...new Set(appliesTo ?? [])].sort(),
  constraints: [],
  revisitWhen: null,
  effects: [],
  supersedes: null,
  supersededBy: null,
  reopens: false,
  status: 'tentative'
})

/**
 * Revert every effect a superseded decision applied, in reverse order, then
 * mark that decision `superseded` (D13).
 *
 * @param {object} args
 * @param {object} args.working
 * @param {object} args.existing
 * @param {string} args.newDecisionId
 * @param {Set<string>} args.startedIds
 * @returns {object} The next backlog
 */
const revertExistingDecision = ({
  working,
  existing,
  newDecisionId,
  startedIds
}) => {
  let next = working
  for (const effect of [...(existing.effects ?? [])].reverse()) {
    builtWorkGuard({ backlog: next, effect, startedIds })
    const reverted = revertEffect({
      backlog: next,
      effect,
      decisionId: existing.id
    })
    next = reverted.backlog
  }
  return {
    ...next,
    decisions: next.decisions.map((row) =>
      row.id === existing.id
        ? { ...row, status: 'superseded', supersededBy: newDecisionId }
        : row
    )
  }
}

/**
 * Apply a list of effects in order, each guarded against touching built
 * work, folding the working backlog and the applied-effect records as it
 * goes.
 *
 * @param {object} args
 * @param {object} args.working
 * @param {object[]} args.effects
 * @param {string} args.decisionId
 * @param {string} args.questionId
 * @param {Set<string>} args.startedIds
 * @param {(id: string|undefined) => void} args.noteAtom
 * @returns {{working: object, appliedEffects: object[]}}
 */
const applyEffectsInOrder = ({
  working,
  effects,
  decisionId,
  questionId,
  startedIds,
  noteAtom
}) => {
  let next = working
  const appliedEffects = []
  for (const effect of effects) {
    builtWorkGuard({ backlog: next, effect, startedIds })
    const applied = applyEffect({
      backlog: next,
      effect,
      decisionId,
      questionId
    })
    next = applied.backlog
    appliedEffects.push(applied.applied)
    noteAtom(applied.applied.target)
    noteAtom(applied.applied.by)
  }
  return { working: next, appliedEffects }
}

/**
 * D9: recompute every increment whose status is `todo` or `blocked`. A
 * started increment is left alone even when it is `todo`, so restoring a
 * cleared need on a re-supersede (D14's `clear-need` exemption) can never
 * flip a started increment to `blocked` mid-build.
 *
 * @param {object} args
 * @param {object} args.working
 * @param {Set<string>} args.startedIds
 * @returns {object} The next backlog
 */
const recomputeIncrementStatuses = ({ working, startedIds }) => ({
  ...working,
  increments: (working.increments ?? []).map((increment) => {
    if (startedIds.has(increment.id)) return increment
    if (increment.status !== 'todo' && increment.status !== 'blocked') {
      return increment
    }
    const context = { atomRows: working.requirements ?? [] }
    return {
      ...increment,
      needs: needsFor(increment, context),
      status: bornStatusFor(increment, context)
    }
  })
})

/**
 * Clear a ruled backlog's combination basis so a stale `atomsSha` can never
 * be recombined against post-ruling atoms.
 *
 * @param {object} working
 * @returns {{working: object, combineReset: boolean, notes: string[]}}
 */
const resetCombinationBasis = (working) => {
  if (!working.combination) {
    return {
      working,
      combineReset: false,
      notes: ['No combination header to reset.']
    }
  }
  return {
    working: {
      ...working,
      combination: {
        ...working.combination,
        basis: { ...(working.combination.basis ?? {}), atomsSha: null }
      }
    },
    combineReset: true,
    notes: []
  }
}

/**
 * The pure core of a ruling: finds the question by slug, applies DESIGN
 * 3.7's rules end to end (D11 to D14), and returns the next backlog with
 * nothing written.
 *
 * @param {object} args
 * @param {object} args.backlog
 * @param {string} args.questionId
 * @param {string} [args.option] - An option letter; ignored for a default
 *   ruling, which takes it from `ifNobodyAnswers.option`
 * @param {string} args.by - `sam`, a named delegate, or `default`
 * @param {string} args.at - An ISO date-time; never the clock (DESIGN 4.3)
 * @param {string} [args.words]
 * @param {string} [args.note]
 * @param {boolean} [args.tentative]
 * @param {string} [args.supersedes] - A decision id, required to change a
 *   `current` decision
 * @param {string[]} [args.appliesTo]
 * @param {Set<string>} [args.startedIds]
 * @returns {{backlog: object, decision: object, question: object, changes: object[], combineReset: boolean, notes: string[]}}
 * @throws {TimError} NOT_FOUND — an unknown question. USAGE — every other
 *   refusal in D11 to D14: no default, a default combined with
 *   `--tentative` or another option, a decision already in force, a wrong
 *   or missing `--supersedes`, an unknown option, or a target that has
 *   moved on or is built work
 */
export const applyRuling = ({
  backlog,
  questionId,
  option,
  by,
  at,
  words,
  note,
  tentative,
  supersedes,
  appliesTo,
  startedIds = new Set()
}) => {
  const question = (backlog.questions ?? []).find(
    (row) => row.id === questionId
  )
  if (!question) {
    throw new TimError('NOT_FOUND', `"${questionId}" is not in questions[].`)
  }
  if (question.status === 'superseded' || question.status === 'withdrawn') {
    throw new TimError(
      'USAGE',
      `${questionId} is ${question.status} and cannot be ruled again.`
    )
  }

  const isDefaultRuling = by === 'default'
  if (isDefaultRuling) {
    validateDefaultRuling({ question, questionId, backlog, tentative, option })
  }

  const chosenLetter = isDefaultRuling
    ? question.ifNobodyAnswers.option
    : option
  const chosenOption = resolveChosenOption({ question, questionId, chosenLetter })

  const hedged = !isDefaultRuling && isHedged(words)
  const isTentativeRuling = !isDefaultRuling && (Boolean(tentative) || hedged)

  const existing = decisionInForce(backlog, questionId)
  if (!isDefaultRuling && !isTentativeRuling) {
    validateSupersedes({ questionId, existing, supersedes })
  }

  const newDecisionId = nextDecisionId(backlog.decisions ?? [])

  if (isTentativeRuling) {
    if (existing) {
      throw new TimError(
        'USAGE',
        `${questionId} already has a decision in force (${existing.id}). A hedge cannot be recorded over it — supersede it with a real ruling instead.`
      )
    }
    const decision = buildTentativeDecision({
      newDecisionId,
      questionId,
      chosenOption,
      words,
      note,
      by,
      at,
      appliesTo
    })
    const nextBacklog = {
      ...backlog,
      questions: (backlog.questions ?? []).map((row) =>
        row.id === questionId ? { ...row, status: 'outstanding' } : row
      ),
      decisions: [...(backlog.decisions ?? []), decision]
    }
    const notes = [
      ...(hedged && !tentative
        ? [
            'Recorded as tentative because your words hedge. Rule again without the hedge to apply it.'
          ]
        : []),
      ...(supersedes
        ? [
            '"--supersedes" has no effect on a tentative ruling; nothing was superseded.'
          ]
        : [])
    ]
    return {
      backlog: nextBacklog,
      decision,
      question: nextBacklog.questions.find((row) => row.id === questionId),
      changes: changesBetween(backlog, nextBacklog),
      combineReset: false,
      notes
    }
  }

  let working = backlog

  if (existing) {
    working = revertExistingDecision({
      working,
      existing,
      newDecisionId,
      startedIds
    })
  }

  const touchedAtoms = new Set()
  const noteAtom = (id) => {
    if (REQUIREMENT_ID.test(id ?? '')) touchedAtoms.add(id)
  }

  const chosenApplied = applyEffectsInOrder({
    working,
    effects: chosenOption.effects ?? [],
    decisionId: newDecisionId,
    questionId,
    startedIds,
    noteAtom
  })
  working = chosenApplied.working

  const clearNeedApplied = applyEffectsInOrder({
    working,
    effects: clearNeedEffects({ backlog: working, questionId }),
    decisionId: newDecisionId,
    questionId,
    startedIds,
    noteAtom
  })
  working = clearNeedApplied.working

  const appliedEffects = [
    ...chosenApplied.appliedEffects,
    ...clearNeedApplied.appliedEffects
  ]

  working = recomputeIncrementStatuses({ working, startedIds })

  const combination = resetCombinationBasis(working)
  working = combination.working
  const { combineReset, notes } = combination

  const appliesToIds = new Set([...(appliesTo ?? []), ...touchedAtoms])
  const decision = {
    id: newDecisionId,
    question: questionId,
    subject: null,
    chosen: chosenOption.id,
    answer: null,
    words: isDefaultRuling
      ? (words ?? `Default applied: option ${chosenOption.id}.`)
      : words,
    note: isDefaultRuling
      ? (note ??
        'Applied by the default rule. A ruling by a person supersedes it.')
      : note,
    decidedBy: by,
    decidedAt: at,
    sealedEvidence: [],
    appliesTo: [...appliesToIds].sort(),
    constraints: [],
    revisitWhen: isDefaultRuling ? `a person rules ${questionId}` : null,
    effects: appliedEffects,
    supersedes: existing?.id ?? null,
    supersededBy: null,
    reopens: false,
    status: isDefaultRuling ? 'defaulted' : 'current'
  }

  const questionUpdate = isDefaultRuling
    ? { status: 'open', decision: null }
    : { status: 'ruled', decision: newDecisionId }

  working = {
    ...working,
    questions: working.questions.map((row) =>
      row.id === questionId ? { ...row, ...questionUpdate } : row
    ),
    decisions: [
      ...working.decisions.map((row) =>
        row.question === questionId && row.status === 'tentative'
          ? { ...row, status: 'superseded', supersededBy: newDecisionId }
          : row
      ),
      decision
    ]
  }

  return {
    backlog: working,
    decision,
    question: working.questions.find((row) => row.id === questionId),
    changes: changesBetween(backlog, working),
    combineReset,
    notes
  }
}

/**
 * Record and apply a ruling in one write, through the shared write-safety
 * core (`write.js`'s `commitWithReplay`, the same one `state.js` uses).
 *
 * @param {object} args
 * @param {object} args.profile - A loaded requirements-v2 programme
 * @param {string} args.questionId
 * @param {string} [args.option]
 * @param {string} args.by
 * @param {string} args.at
 * @param {string} [args.words]
 * @param {string} [args.note]
 * @param {boolean} [args.tentative]
 * @param {string} [args.supersedes]
 * @param {string[]} [args.appliesTo]
 * @param {string} [args.opId]
 * @param {string} [args.expectSha]
 * @param {number[]} [args.retryDelaysMs]
 * @returns {object} `{path, decision, question, changes, combineReset, notes, sha256, reverse?}`
 * @throws {TimError} USAGE, NOT_FOUND, PARSE, LOST_UPDATE, LOCKED
 */
export const recordRuling = ({
  profile,
  questionId,
  option,
  by,
  at,
  words,
  note,
  tentative,
  supersedes,
  appliesTo,
  opId,
  expectSha,
  retryDelaysMs
}) => {
  if (profile.profileKey !== REQUIREMENTS_V2) {
    throw new TimError(
      'USAGE',
      `"${profile.id}" is a parity-v1 programme. Rulings are only kept for requirements-v2 programmes.`
    )
  }

  const backlogPath = profile.paths.backlog
  const opsLogPath = profile.paths.opsLog
  const fingerprint = opId
    ? fingerprintOf({
        verb: COMMAND,
        programme: profile.id,
        questionId,
        option: option ?? null,
        by,
        at,
        words: words ?? null,
        note: note ?? null,
        tentative: Boolean(tentative),
        supersedes: supersedes ?? null,
        appliesTo: appliesTo ?? []
      })
    : undefined

  const outcome = commitWithReplay({
    opsLogPath,
    opId,
    fingerprint,
    path: backlogPath,
    format: 'json',
    validate: (parsed) => parseV2Backlog(parsed),
    expectSha,
    command: COMMAND,
    buildBody: (versioned) => {
      // Read after the op-id replay check (D7): a replay must never depend
      // on build/state.json still matching what it looked like the first
      // time this call ran.
      const startedIds = startedIncrementIds(profile.paths.state)
      const backlog = versioned.exists
        ? parseJsonText(versioned.text, backlogPath)
        : {}
      const result = applyRuling({
        backlog,
        questionId,
        option,
        by,
        at,
        words,
        note,
        tentative,
        supersedes,
        appliesTo,
        startedIds
      })
      const reverse =
        result.decision.status === 'defaulted'
          ? reverseCommandsFor({
              programme: profile.id,
              question: result.question,
              chosen: result.decision.chosen
            })
          : undefined
      return {
        body: `${JSON.stringify(result.backlog, null, 2)}\n`,
        resultStub: {
          path: backlogPath,
          decision: result.decision,
          question: result.question,
          changes: result.changes,
          combineReset: result.combineReset,
          // Stashed under a different key because `commitWithReplay`
          // overwrites `notes` with the write-lock's own notes (e.g. "Broke
          // a stale lock") once the write completes — merged back in below.
          rulingNotes: result.notes,
          ...(reverse ? { reverse } : {})
        }
      }
    },
    retryDelaysMs
  })

  const { rulingNotes, ...rest } = outcome
  return { ...rest, notes: [...(rulingNotes ?? []), ...(outcome.notes ?? [])] }
}
