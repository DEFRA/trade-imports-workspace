import { existsSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../errors.js'
import {
  DISTIL_SCHEMA_FILES,
  challengePathOf,
  readJsonLenient
} from './files.js'
import { inspectSources, readSources } from './checks.js'
import { claimStandings } from './standings.js'
import { problemsError, schemaProblems } from './problems.js'

const CHALLENGE_FILE = /^(c-[0-9]{3,})\.json$/
const SETTLING_VERDICTS = new Set(['precedence', 'blocked'])

const isText = (value) => typeof value === 'string' && value.trim() !== ''
const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const objectsIn = (list) => (Array.isArray(list) ? list.filter(isObject) : [])
const textsIn = (list) => (Array.isArray(list) ? list.filter(isText) : [])

const labelOf = (conflictId) => `distil/challenge/${conflictId}.json`

const conflictsOf = (layout) =>
  objectsIn(readJsonLenient(layout.conflicts).value?.conflicts).filter(
    (conflict) => isText(conflict.id)
  )

const requirementsOf = (layout) =>
  objectsIn(readJsonLenient(layout.requirements).value?.requirements).filter(
    (requirement) => isText(requirement.id)
  )

const citingRequirements = (requirements, conflictId) =>
  requirements.filter((requirement) =>
    textsIn(requirement.conflicts).includes(conflictId)
  )

/**
 * Every challenge verdict file in distil/challenge/, read without throwing.
 *
 * @param {object} layout - From `distilLayout`
 * @returns {{conflictId: string, path: string, value?: unknown, error?: string}[]}
 */
export const readChallenges = (layout) =>
  (existsSync(layout.challengeDir) ? readdirSync(layout.challengeDir) : [])
    .sort()
    .map((name) => CHALLENGE_FILE.exec(name)?.[1])
    .filter(Boolean)
    .map((conflictId) => {
      const path = challengePathOf(layout, conflictId)
      const read = readJsonLenient(path)
      return { conflictId, path, value: read.value, error: read.error }
    })

// The schema's if/then rules for each verdict, said in words: ajv's own
// errors for a failed `then` are dropped as branch errors.
const verdictFieldProblems = (label, value) => {
  if (value.verdict === 'blocked' && !isText(value.blocker)) {
    return [
      `${label} finds a blocker but has no "blocker": say who must do what before it can be built.`
    ]
  }
  if (value.verdict !== 'question') return []
  return [
    ...(isText(value.why)
      ? []
      : [
          `${label} keeps it a question but has no "why": say what a person must weigh that no source, ruling or precedence settles.`
        ]),
    ...(Array.isArray(value.overruled) || isText(value.blocker)
      ? [
          `${label} keeps it a question, so it overrules nothing and names no blocker. Drop "overruled" and "blocker".`
        ]
      : [])
  ]
}

const claimProblems = (label, value, standings) =>
  textsIn(value.claims).flatMap((claimId) => {
    const standing = standings.get(claimId)
    if (!standing) {
      return [
        `${label} rests on ${claimId}, which no extract or verification holds.`
      ]
    }
    if (standing.standing === 'refuted') {
      return [`${label} rests on ${claimId}, which verification refuted.`]
    }
    if (standing.standing === 'unverified') {
      return [
        `${label} rests on ${claimId}, from ${standing.source}, which is not verified.`
      ]
    }
    return []
  })

const overruledProblems = (label, value, conflict) => {
  const positionClaims = new Set(
    objectsIn(conflict?.positions).map((position) => position.claim)
  )
  return textsIn(value.overruled)
    .filter((claimId) => !positionClaims.has(claimId))
    .map(
      (claimId) =>
        `${label} overrules ${claimId}, which none of ${value.conflict}'s positions rests on.`
    )
}

/**
 * Every way one challenge verdict departs from challenge.schema.json, plus
 * what a schema cannot hold: it names its own file's conflict, that conflict
 * is in conflicts.json, every claim it rests on held, and it overrules only
 * the conflict's own position claims.
 *
 * @param {object} args
 * @param {{conflictId: string, value?: unknown, error?: string}} args.challenge - From `readChallenges`
 * @param {object} args.schema - The parsed challenge.schema.json
 * @param {Map<string, object>} args.conflictsById
 * @param {Map<string, object>} args.standings - From `claimStandings`
 * @returns {string[]}
 */
export const challengeProblems = ({
  challenge,
  schema,
  conflictsById,
  standings
}) => {
  const label = labelOf(challenge.conflictId)
  if (challenge.error) return [`${label} ${challenge.error}`]
  const { value } = challenge
  const shape = schemaProblems({
    label,
    value,
    schema,
    schemaName: DISTIL_SCHEMA_FILES.challenge
  })
  if (shape.length) return shape
  if (value.conflict !== challenge.conflictId) {
    return [
      `${label} is about ${value.conflict}. Name the file for its conflict: ${labelOf(value.conflict)}.`
    ]
  }
  const conflict = conflictsById.get(value.conflict)
  if (!conflict) {
    return [
      `${label} challenges ${value.conflict}, which is not in distil/conflicts.json.`
    ]
  }
  return [
    ...verdictFieldProblems(label, value),
    ...claimProblems(label, value, standings),
    ...overruledProblems(label, value, conflict)
  ]
}

const VERDICT_WORDS = {
  precedence: 'settled it by precedence',
  blocked: 'found it waits on a blocker, not a design choice'
}

/**
 * Whether each verdict that settles a question was applied: the conflict is
 * now settled by precedence, and, for a blocker, no requirement citing it is
 * still a question and at least one carries `blockedBy`. A verdict that keeps
 * the question needs nothing applied.
 *
 * @param {object} args
 * @param {{conflictId: string, value?: object}[]} args.challenges - From `readChallenges`, in shape
 * @param {Map<string, object>} args.conflictsById
 * @param {object[]} args.requirements
 * @returns {string[]}
 */
export const challengeApplicationProblems = ({
  challenges,
  conflictsById,
  requirements
}) =>
  challenges
    .filter(({ value }) => SETTLING_VERDICTS.has(value?.verdict))
    .flatMap(({ conflictId, value }) => {
      const conflict = conflictsById.get(conflictId)
      if (!conflict) return []
      const said = `${labelOf(conflictId)} ${VERDICT_WORDS[value.verdict]} (${value.rule})`
      const unsettled =
        conflict.resolution === 'precedence'
          ? []
          : [
              `${said}, but distil/conflicts.json still has ${conflictId} as a question. Rewrite it as precedence with the verdict's outcome and overruled claims, and adopt the requirements that cite it.`
            ]
      if (value.verdict !== 'blocked') return unsettled
      const citing = citingRequirements(requirements, conflictId)
      return [
        ...unsettled,
        ...citing
          .filter((requirement) => requirement.status === 'question')
          .map(
            (requirement) =>
              `${said}, but ${requirement.id} is still a question. Adopt it with blockedBy: "${value.blocker}".`
          ),
        ...(citing.some((requirement) => isText(requirement.blockedBy))
          ? []
          : [
              `${said}, but no requirement citing ${conflictId} carries blockedBy. Give each one it holds back blockedBy: "${value.blocker}".`
            ])
      ]
    })

const contextOf = ({ layout, schemas, workarea }) => {
  const sources = readSources(layout, schemas.sources)
  const entries = inspectSources({ layout, schemas, sources, workarea })
  return {
    standings: claimStandings(entries),
    conflictsById: new Map(
      conflictsOf(layout).map((conflict) => [conflict.id, conflict])
    )
  }
}

/**
 * The question conflicts in conflicts.json, each with the requirements that
 * cite it, and every challenge verdict already written: the challenge
 * step's work list.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @returns {{questions: {id: string, about: string, question: string, default: string, requirements: string[]}[], verdicts: {conflict: string, verdict: string|null}[]}}
 */
export const listChallenges = ({ layout }) => {
  const requirements = requirementsOf(layout)
  return {
    questions: conflictsOf(layout)
      .filter((conflict) => conflict.resolution === 'question')
      .map((conflict) => ({
        id: conflict.id,
        about: conflict.about,
        question: conflict.question,
        default: conflict.default,
        requirements: citingRequirements(requirements, conflict.id).map(
          (requirement) => requirement.id
        )
      })),
    verdicts: readChallenges(layout).map(({ conflictId, value }) => ({
      conflict: conflictId,
      verdict: isText(value?.verdict) ? value.verdict : null
    }))
  }
}

/**
 * Check one challenge verdict, the check each challenger runs on its own
 * file.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.schemas - From `loadDistilSchemas`
 * @param {string} args.workarea
 * @param {string} args.conflictId
 * @returns {{conflict: string, verdict: string, path: string}}
 * @throws {TimError} NOT_FOUND when the file does not exist, LINT with every problem
 */
export const checkChallenge = ({ layout, schemas, workarea, conflictId }) => {
  const challenge = readChallenges(layout).find(
    (candidate) => candidate.conflictId === conflictId
  )
  if (!challenge) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find ${challengePathOf(layout, conflictId)}. The challenger for ${conflictId} writes it.`
    )
  }
  const problems = challengeProblems({
    challenge,
    schema: schemas.challenge,
    ...contextOf({ layout, schemas, workarea })
  })
  if (problems.length) {
    throw problemsError(problems, `in ${layout.dir}`)
  }
  return {
    conflict: conflictId,
    verdict: challenge.value.verdict,
    path: challenge.path
  }
}

/**
 * Remove every challenge verdict, so a new challenge starts clean.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @returns {{removed: string[]}}
 */
export const clearChallenges = ({ layout }) => {
  const removed = existsSync(layout.challengeDir)
    ? readdirSync(layout.challengeDir).map((name) =>
        join(layout.challengeDir, name)
      )
    : []
  rmSync(layout.challengeDir, { recursive: true, force: true })
  return { removed }
}
