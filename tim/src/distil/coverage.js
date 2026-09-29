import {
  DISTIL_SCHEMA_FILES,
  isEditableRow,
  readJsonLenient,
  rowStatusOf
} from './files.js'
import { inspectSources, readSources } from './checks.js'
import { problemsError, schemaProblems } from './problems.js'

const REQUIREMENT_STATUSES = ['adopted', 'question', 'out-of-scope']
const DELTAS = ['new', 'change', 'exists']

const isText = (value) => typeof value === 'string' && value.trim() !== ''
const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const objectsIn = (list) => (Array.isArray(list) ? list.filter(isObject) : [])
const textsIn = (list) => (Array.isArray(list) ? list.filter(isText) : [])
const idsIn = (list) =>
  objectsIn(list)
    .map((item) => item.id)
    .filter(isText)

const overruledOf = (conflict) => textsIn(conflict.overruled)

// A source's place in precedence, 1 the most authoritative. A source
// precedence does not rank sorts last: sources.json's own check names it.
const rankerOf = (precedence) => (sourceId) => {
  const index = precedence.indexOf(sourceId)
  return index === -1 ? Number.POSITIVE_INFINITY : index + 1
}

const duplicatesIn = (values) =>
  [...Object.entries(Object.groupBy(values, (value) => value))]
    .filter(([, copies]) => copies.length > 1)
    .map(([value]) => value)

const heldIdsOf = (entry) =>
  new Set(
    (entry.verify?.verdicts ?? [])
      .filter((verdict) => verdict.holds === true)
      .map((verdict) => verdict.id)
  )

const standingOf = (verified, held, claimId) => {
  if (!verified) return 'unverified'
  return held.has(claimId) ? 'held' : 'refuted'
}

/**
 * Where every claim id in the workarea stands: held or missed (in the
 * working set), refuted, or in a source not verified yet. Each standing
 * carries its source's state and the reason for it, so a problem can say
 * what the source needs.
 *
 * @param {object[]} entries - From `inspectSources`
 * @returns {Map<string, {source: string, state: string, reason: string, standing: 'held'|'missed'|'refuted'|'unverified'}>}
 */
const claimStandings = (entries) => {
  const standings = new Map()
  for (const entry of entries) {
    const held = heldIdsOf(entry)
    const verified = entry.report.state === 'verified'
    const origin = {
      source: entry.source.id,
      state: entry.report.state,
      reason: entry.report.reason
    }
    for (const claimId of idsIn(entry.raw.extract?.claims)) {
      standings.set(claimId, {
        ...origin,
        standing: standingOf(verified, held, claimId)
      })
    }
    for (const claimId of idsIn(entry.raw.verify?.missed)) {
      standings.set(claimId, {
        ...origin,
        standing: verified ? 'missed' : 'unverified'
      })
    }
  }
  return standings
}

const citedClaimProblem = (citer, claimId, standings) => {
  const standing = standings.get(claimId)
  if (!standing) {
    return `${citer} cites ${claimId}, which no extract or verification holds.`
  }
  if (standing.standing === 'refuted') {
    return `${citer} cites ${claimId}, which verification refuted. Cite a claim that held.`
  }
  return null
}

const positionLabelOf = (conflictId) => `${conflictId} position`

/**
 * Everything that cites a claim: each requirement by its id, and each
 * conflict's positions by `<conflict id> position`.
 *
 * @param {object[]} requirements
 * @param {object[]} conflicts
 * @returns {{citer: string, claims: string[]}[]}
 */
const citersOf = (requirements, conflicts) => [
  ...requirements.map((requirement) => ({
    citer: requirement.id,
    claims: textsIn(requirement.claims)
  })),
  ...conflicts.map((conflict) => ({
    citer: positionLabelOf(conflict.id),
    claims: textsIn(
      objectsIn(conflict.positions).map((position) => position.claim)
    )
  }))
]

// One problem per unverified source, not one per citation: a source that
// failed verification would otherwise bury every other problem.
const unverifiedCitationProblems = (citers, standings) => {
  const citing = new Map()
  for (const { citer, claims } of citers) {
    for (const claimId of claims) {
      const standing = standings.get(claimId)
      if (standing?.standing !== 'unverified') continue
      const known = citing.get(standing.source) ?? { standing, citers: [] }
      citing.set(standing.source, {
        standing,
        citers: [...new Set([...known.citers, citer])]
      })
    }
  }
  return [...citing].map(
    ([sourceId, { standing, citers: ids }]) =>
      `${sourceId} is ${standing.state}, not verified (${standing.reason}), so its claims are not in the working set. They are cited by ${ids.join(', ')}.`
  )
}

const DELTA_NOTE_ASKS = {
  change: 'say how today differs',
  exists: 'name what already meets it'
}

/**
 * Every claim a precedence conflict overrules, with the conflicts that do.
 * A claim none of the conflict's positions rests on is its own problem, so
 * it is not counted as overruled here.
 *
 * @param {object[]} conflicts
 * @returns {Map<string, string[]>} claim id to conflict ids
 */
const overruledClaimsOf = (conflicts) => {
  const overruledBy = new Map()
  for (const conflict of conflicts) {
    if (conflict.resolution !== 'precedence') continue
    const positionClaims = new Set(
      objectsIn(conflict.positions).map((position) => position.claim)
    )
    for (const claimId of overruledOf(conflict)) {
      if (!positionClaims.has(claimId)) continue
      overruledBy.set(claimId, [
        ...(overruledBy.get(claimId) ?? []),
        conflict.id
      ])
    }
  }
  return overruledBy
}

// An out-of-scope requirement may keep an overruled claim: it records what
// was set aside. One still to build or ask about must not rest on it.
const STANDING_STATUSES = new Set(['adopted', 'question'])

const overruledCitationProblems = (requirement, overruledBy) =>
  STANDING_STATUSES.has(requirement.status)
    ? textsIn(requirement.claims)
        .filter((claimId) => overruledBy.has(claimId))
        .map(
          (claimId) =>
            `${requirement.id} rests on ${claimId}, which ${overruledBy.get(claimId).join(' and ')} overruled. Take it out of claims, and reword the requirement to what the conflict adopted.`
        )
    : []

const requirementProblems = (
  requirement,
  { standings, conflictsById, overruledBy }
) => {
  const { id, status, delta } = requirement
  const cited = textsIn(requirement.conflicts)
  const claimProblems = [
    ...textsIn(requirement.claims)
      .map((claimId) => citedClaimProblem(id, claimId, standings))
      .filter(Boolean),
    ...overruledCitationProblems(requirement, overruledBy)
  ]
  const missingConflicts = cited
    .filter((conflictId) => !conflictsById.has(conflictId))
    .map(
      (conflictId) =>
        `${id} cites ${conflictId}, which is not in distil/conflicts.json.`
    )
  const asksQuestion = cited.some(
    (conflictId) => conflictsById.get(conflictId)?.resolution === 'question'
  )
  const questionProblems =
    status === 'question' && !asksQuestion
      ? [
          `${id} is a question but cites no question conflict. Cite the conflict that carries its question and default.`
        ]
      : []
  const deltaNoteProblems =
    status === 'adopted' &&
    DELTA_NOTE_ASKS[delta] &&
    !isText(requirement.deltaNote)
      ? [
          `${id} is adopted as ${delta} but its deltaNote is empty: ${DELTA_NOTE_ASKS[delta]}.`
        ]
      : []
  return [
    ...claimProblems,
    ...missingConflicts,
    ...questionProblems,
    ...deltaNoteProblems
  ]
}

const resolutionProblems = (conflict) => {
  const { id, resolution } = conflict
  if (resolution === 'question') {
    return [
      ...(isText(conflict.question)
        ? []
        : [`${id} is a question but has no "question" for Sam.`]),
      ...(isText(conflict.default)
        ? []
        : [
            `${id} is a question but has no "default": what will be built if nobody answers.`
          ])
    ]
  }
  if (
    resolution === 'precedence' &&
    ('question' in conflict || 'default' in conflict)
  ) {
    return [
      `${id} was settled by precedence, so it takes no question or default. Make it a question, or drop them.`
    ]
  }
  return []
}

const positionProblems = (conflict, { sourceIds, standings }) =>
  objectsIn(conflict.positions).flatMap((position) => [
    ...(isText(position.source) && !sourceIds.has(position.source)
      ? [
          `${conflict.id} has a position from ${position.source}, which is not in sources.json.`
        ]
      : []),
    ...(isText(position.claim)
      ? [
          citedClaimProblem(
            positionLabelOf(conflict.id),
            position.claim,
            standings
          )
        ].filter(Boolean)
      : [])
  ])

const sourcesOf = (positions) => [
  ...new Set(positions.map((position) => position.source).filter(isText))
]

const singleSourceProblems = (conflict, positions) => {
  const sources = sourcesOf(positions)
  return sources.length === 1
    ? [
        `${conflict.id} was settled by precedence, but every position comes from ${sources[0]}. Precedence settles a disagreement between sources: merge the claims into one requirement, or make it a question.`
      ]
    : []
}

const outrankedKeptProblems = (conflict, positions, rankOf) => {
  const overruled = new Set(overruledOf(conflict))
  const kept = positions.filter((position) => !overruled.has(position.claim))
  if (!kept.length) {
    return [
      `${conflict.id} overrules every position. Keep the position precedence settled on.`
    ]
  }
  const bestKeptRank = Math.min(...kept.map(({ source }) => rankOf(source)))
  return positions
    .filter(
      (position) =>
        overruled.has(position.claim) && rankOf(position.source) < bestKeptRank
    )
    .map(
      (position) =>
        `${conflict.id} overrules ${position.claim} from ${position.source}, which ranks above every position it keeps. Precedence keeps the higher-ranked source.`
    )
}

const overruledProblems = (conflict, context) => {
  const overruled = overruledOf(conflict)
  if (!overruled.length) return []
  if (conflict.resolution !== 'precedence') {
    return [
      `${conflict.id} is a question, so it overrules nothing until it is answered. Drop "overruled".`
    ]
  }
  const positions = objectsIn(conflict.positions)
  const positionClaims = new Set(positions.map((position) => position.claim))
  const strangers = overruled
    .filter((claimId) => !positionClaims.has(claimId))
    .map(
      (claimId) =>
        `${conflict.id} overrules ${claimId}, which none of its positions rests on.`
    )
  return strangers.length
    ? strangers
    : outrankedKeptProblems(conflict, positions, context.rankOf)
}

const precedenceProblems = (conflict, context) => [
  ...(conflict.resolution === 'precedence'
    ? singleSourceProblems(conflict, objectsIn(conflict.positions))
    : []),
  ...overruledProblems(conflict, context)
]

const conflictProblems = (conflict, context) => [
  ...resolutionProblems(conflict),
  ...precedenceProblems(conflict, context),
  ...positionProblems(conflict, context),
  ...(!context.citedConflicts || context.citedConflicts.has(conflict.id)
    ? []
    : [`${conflict.id} is cited by no requirement.`])
]

const readDistilFile = ({ path, label, schema, schemaName }) => {
  const read = readJsonLenient(path)
  if (!read.exists) return { problems: [`${label} does not exist yet.`] }
  if (read.error) return { problems: [`${label} ${read.error}`] }
  return {
    value: read.value,
    problems: schemaProblems({ label, value: read.value, schema, schemaName })
  }
}

const incrementsCiting = (increments) => {
  const citing = new Map()
  for (const increment of increments) {
    for (const requirementId of new Set(textsIn(increment.requirements))) {
      citing.set(requirementId, [
        ...(citing.get(requirementId) ?? []),
        increment.id
      ])
    }
  }
  return citing
}

const NEVER_IN_AN_INCREMENT = {
  exists: 'is already met, so it goes in the report and never in an increment',
  'out-of-scope': 'is out of scope'
}

// A row built, being built or still to build covers its requirements. A
// dropped, rejected or merged-into row carries no work, so it covers nothing.
const COVERING_STATUSES = new Set(['todo', 'blocked', 'done', 'deferred'])

const escapeForPattern = (text) =>
  text.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')

// A claim id stands alone when no letter, digit or hyphen touches it, so
// `-003` never matches inside `-003-m1`.
const mentionsClaim = (text, claimId) =>
  new RegExp(`(?<![\\w-])${escapeForPattern(claimId)}(?![\\w-])`).test(text)

// Only a row the consolidator may rewrite is held to what precedence set
// aside. A done or deferred row keeps what it was built or parked with.
const overruledRowProblems = (editable, overruledBy) =>
  editable.flatMap((increment) => {
    const text = JSON.stringify(increment)
    return [...overruledBy]
      .filter(([claimId]) => mentionsClaim(text, claimId))
      .map(
        ([claimId, conflictIds]) =>
          `${increment.id} still names ${claimId}, which ${conflictIds.join(' and ')} overruled. Rewrite the row to what ${conflictIds.join(' and ')} adopted, and take the claim out of it.`
      )
  })

const backlogProblems = (increments, requirements, overruledBy) => {
  const covering = increments.filter((increment) =>
    COVERING_STATUSES.has(rowStatusOf(increment))
  )
  const citing = incrementsCiting(covering)
  const editable = covering.filter(isEditableRow)
  const citingToBuild = incrementsCiting(editable)
  const requirementsById = new Map(
    requirements.map((requirement) => [requirement.id, requirement])
  )
  const mustBeBuilt = requirements.filter(
    (requirement) =>
      requirement.status === 'adopted' && requirement.delta !== 'exists'
  )
  const reasonNeverIn = (requirement) =>
    NEVER_IN_AN_INCREMENT[requirement.status] ??
    (requirement.status === 'adopted'
      ? NEVER_IN_AN_INCREMENT[requirement.delta]
      : undefined)
  return [
    ...mustBeBuilt
      .filter((requirement) => !citing.has(requirement.id))
      .map(
        (requirement) =>
          `${requirement.id} is adopted as ${requirement.delta} but sits in no increment.`
      ),
    ...[...citing]
      .filter(([, incrementIds]) => incrementIds.length > 1)
      .map(
        ([requirementId, incrementIds]) =>
          `${requirementId} sits in ${incrementIds.length} increments: ${incrementIds.join(', ')}. Each requirement sits in one.`
      ),
    ...[...incrementsCiting(increments)]
      .filter(([requirementId]) => !requirementsById.has(requirementId))
      .map(
        ([requirementId, incrementIds]) =>
          `${incrementIds.join(', ')} covers ${requirementId}, which is not in distil/requirements.json.`
      ),
    ...[...citingToBuild].flatMap(([requirementId, incrementIds]) => {
      const requirement = requirementsById.get(requirementId)
      if (!requirement) return []
      const reason = reasonNeverIn(requirement)
      return reason
        ? [
            `${incrementIds.join(', ')} covers ${requirementId}, which ${reason}.`
          ]
        : []
    }),
    ...overruledRowProblems(editable, overruledBy)
  ]
}

const readBacklog = (path) => {
  const read = readJsonLenient(path)
  if (!read.exists) return { exists: false, problems: [] }
  if (read.error) {
    return { exists: true, problems: [`backlog.json ${read.error}`] }
  }
  return {
    exists: true,
    increments: objectsIn(read.value?.increments),
    problems: []
  }
}

const scoped = (scope, messages) =>
  [...new Set(messages)].map((message) => ({ scope, message }))

const countBy = (items, field, keys) =>
  Object.fromEntries(
    keys.map((key) => [key, items.filter((item) => item[field] === key).length])
  )

const questionsOf = (conflicts, requirements) =>
  conflicts
    .filter((conflict) => conflict.resolution === 'question')
    .map((conflict) => ({
      id: conflict.id,
      about: conflict.about,
      question: conflict.question,
      default: conflict.default,
      requirements: requirements
        .filter((requirement) =>
          textsIn(requirement.conflicts).includes(conflict.id)
        )
        .map((requirement) => requirement.id)
    }))

/**
 * Check the reconciled files and, once it exists, the backlog against each
 * other and the working set: the checks the orchestrator used to run by
 * hand with jq. Refuses with every problem found. Each problem also carries
 * a scope in the error's `problems`: `reconcile` for requirements.json,
 * conflicts.json and their citations, `backlog` for backlog.json, so a
 * caller sends each to the step that can fix it without reading the wording.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.schemas - From `loadDistilSchemas`
 * @param {string} args.workarea
 * @returns {{requirements: object, conflicts: object, questions: object[], backlog: object|null}}
 * @throws {TimError} when sources.json is out of shape, LINT with every problem
 */
export const distilCoverage = ({ layout, schemas, workarea }) => {
  const sources = readSources(layout, schemas.sources)
  const entries = inspectSources({ layout, schemas, sources, workarea })
  const standings = claimStandings(entries)
  const requirementsFile = readDistilFile({
    path: layout.requirements,
    label: 'distil/requirements.json',
    schema: schemas.requirements,
    schemaName: DISTIL_SCHEMA_FILES.requirements
  })
  const conflictsFile = readDistilFile({
    path: layout.conflicts,
    label: 'distil/conflicts.json',
    schema: schemas.conflicts,
    schemaName: DISTIL_SCHEMA_FILES.conflicts
  })
  const requirements = objectsIn(requirementsFile.value?.requirements).filter(
    (requirement) => isText(requirement.id)
  )
  const conflicts = objectsIn(conflictsFile.value?.conflicts).filter(
    (conflict) => isText(conflict.id)
  )
  const conflictsById = new Map(
    conflicts.map((conflict) => [conflict.id, conflict])
  )
  const overruledBy = overruledClaimsOf(conflicts)
  const context = {
    standings,
    conflictsById,
    sourceIds: new Set(sources.sources.map((source) => source.id)),
    rankOf: rankerOf(sources.precedence),
    overruledBy,
    citedConflicts: requirementsFile.value
      ? new Set(
          requirements.flatMap((requirement) => textsIn(requirement.conflicts))
        )
      : null
  }
  const backlog = readBacklog(layout.backlog)
  const reconcileProblems = [
    ...requirementsFile.problems,
    ...conflictsFile.problems,
    ...duplicatesIn(requirements.map((requirement) => requirement.id)).map(
      (id) => `distil/requirements.json has ${id} more than once.`
    ),
    ...duplicatesIn(conflicts.map((conflict) => conflict.id)).map(
      (id) => `distil/conflicts.json has ${id} more than once.`
    ),
    ...unverifiedCitationProblems(
      citersOf(requirements, conflictsFile.value ? conflicts : []),
      standings
    ),
    ...requirements.flatMap((requirement) =>
      requirementProblems(requirement, context)
    ),
    ...(conflictsFile.value
      ? conflicts.flatMap((conflict) => conflictProblems(conflict, context))
      : [])
  ]
  const backlogFileProblems = [
    ...backlog.problems,
    ...(backlog.increments && requirementsFile.value
      ? backlogProblems(backlog.increments, requirements, overruledBy)
      : [])
  ]
  const problems = [
    ...scoped('reconcile', reconcileProblems),
    ...scoped('backlog', backlogFileProblems)
  ]
  if (problems.length) {
    throw problemsError(problems, `in ${layout.dir}`)
  }
  return {
    requirements: {
      total: requirements.length,
      byStatus: countBy(requirements, 'status', REQUIREMENT_STATUSES),
      byDelta: countBy(requirements, 'delta', DELTAS)
    },
    conflicts: {
      total: conflicts.length,
      precedence: conflicts.filter(
        (conflict) => conflict.resolution === 'precedence'
      ).length,
      question: conflicts.filter(
        (conflict) => conflict.resolution === 'question'
      ).length
    },
    questions: questionsOf(conflicts, requirements),
    unavailable: entries
      .filter((entry) => entry.report.state !== 'verified')
      .map(({ report }) => ({ id: report.id, state: report.state })),
    backlog: backlog.exists
      ? {
          path: layout.backlog,
          increments: backlog.increments.length,
          covered: [
            ...incrementsCiting(
              backlog.increments.filter((increment) =>
                COVERING_STATUSES.has(rowStatusOf(increment))
              )
            ).keys()
          ].length
        }
      : null
  }
}
