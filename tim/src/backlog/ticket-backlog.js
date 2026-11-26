import { schemaProblems } from '../distil/problems.js'

const STILL_TO_BUILD = new Set(['todo', 'blocked'])

const isText = (value) => typeof value === 'string' && value.trim() !== ''

const rowsOf = (backlog) => backlog.increments ?? []

const rowsToBuildOf = (backlog) =>
  rowsOf(backlog).filter((row) => STILL_TO_BUILD.has(row?.status))

const recordSchemaProblems = ({ record, schema }) =>
  schemaProblems({
    label: 'intake.json',
    value: record,
    schema,
    schemaName: 'intake.schema.json'
  })

const recordKeyProblems = ({ backlog, record }) =>
  record.ticket === backlog.ticket
    ? []
    : [
        `intake.json is for ${record.ticket}, but the backlog builds ${backlog.ticket}.`
      ]

const noThemesProblems = (backlog) =>
  ['themes', 'theme']
    .filter((field) => backlog[field] !== undefined)
    .map(
      (field) =>
        `The backlog has "${field}", but a ticket backlog builds on one branch and has no themes.`
    )

const unknownCoverProblems = ({ statement, rowsById }) =>
  statement.coveredBy
    .filter((id) => !rowsById.has(id))
    .map(
      (id) =>
        `Statement ${statement.id} is covered by ${id}, which is not in the backlog.`
    )

const outOfPlayCoverProblems = ({ statement, rowsById }) =>
  statement.coveredBy
    .filter((id) => rowsById.has(id))
    .map((id) => rowsById.get(id))
    .map(
      (row) =>
        `Statement ${statement.id} is covered only by ${row.id}, which is ${row.status}.`
    )

const statementCoverProblems = ({ statement, rowsById }) => {
  const COVERING = new Set(['todo', 'blocked', 'done'])
  const ACCEPTANCE_CRITERION = 'acceptance criterion'
  const unknown = unknownCoverProblems({ statement, rowsById })
  if (unknown.length) return unknown
  if (statement.kind !== ACCEPTANCE_CRITERION || isText(statement.notBuilt)) {
    return []
  }
  const coveringRows = statement.coveredBy.map((id) => rowsById.get(id))
  if (coveringRows.some((row) => COVERING.has(row.status))) return []
  if (coveringRows.length > 0) {
    return outOfPlayCoverProblems({ statement, rowsById })
  }
  return [
    `Acceptance criterion ${statement.id} is not covered by a row and has no reason it is not built: "${statement.text}"`
  ]
}

const coverProblems = ({ backlog, record }) => {
  const rowsById = new Map(rowsOf(backlog).map((row) => [row.id, row]))
  return record.statements.flatMap((statement) =>
    statementCoverProblems({ statement, rowsById })
  )
}

const citationPartsOf = (criterion) => {
  const TRAILING_BRACKET = /\(([^()]+)\)\s*\.?\s*$/
  const bracket = TRAILING_BRACKET.exec(criterion)?.[1]
  if (!bracket) return []
  return bracket
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [source, ...place] = part.split(/\s+/)
      return { source, place: place.join(' ') }
    })
}

const ticketCitationProblem = ({ part, backlog, statementIds }) => {
  const key = part.source.slice('ticket:'.length)
  if (key !== backlog.ticket) {
    return `cites ticket ${key}, but the backlog builds ${backlog.ticket}.`
  }
  const ids = part.place.split(/[\s,]+/).filter(Boolean)
  if (ids.length === 0) return `cites ${part.source} with no statement id.`
  const unknown = ids.find((id) => !statementIds.has(id))
  return unknown
    ? `cites ${part.source} ${unknown}, which intake.json does not have.`
    : null
}

const isTicketPart = (part) => part.source.startsWith('ticket:')

const isRepoOrRulingPart = (part) =>
  part.source.startsWith('repo:') || part.source.startsWith('ruling:')

const criterionProblems = ({ row, criterion, backlog, statementIds }) => {
  const parts = citationPartsOf(criterion)
  const ticketResults = parts
    .filter(isTicketPart)
    .map((part) => ticketCitationProblem({ part, backlog, statementIds }))
  const refused = ticketResults.filter(Boolean)
  if (refused.length) {
    return refused.map((problem) => `${row.id} criterion ${problem}`)
  }
  if (ticketResults.length || parts.some(isRepoOrRulingPart)) return []
  return [
    `${row.id} criterion has no ticket, repo or ruling provenance bracket at its end: "${criterion}"`
  ]
}

const citationProblems = ({ backlog, record }) => {
  const statementIds = new Set(record.statements.map(({ id }) => id))
  return rowsToBuildOf(backlog).flatMap((row) =>
    (Array.isArray(row.acceptanceCriteria) ? row.acceptanceCriteria : [])
      .filter(isText)
      .flatMap((criterion) =>
        criterionProblems({ row, criterion, backlog, statementIds })
      )
  )
}

const questionProblems = ({ record }) =>
  record.questions.flatMap((question) => {
    if (question.holdsLaunch && question.cause === undefined) {
      return [
        `Question ${question.id} holds the launch but names no cause. Only security, access, data integrity, a signed-off scenario or a rulings-ledger entry holds it.`
      ]
    }
    if (!question.holdsLaunch && question.cause !== undefined) {
      return [
        `Question ${question.id} names the cause "${question.cause}" but does not hold the launch.`
      ]
    }
    return []
  })

const escalationSignalsOf = ({ backlog, record }) => {
  const MOST_QUESTIONS = 3
  const MOST_ROWS_TO_BUILD = 4
  const rowsToBuild = rowsToBuildOf(backlog)
  return [
    ...(record.readiness.verdict === 'SPIKE REQUIRED'
      ? ['the readiness verdict is SPIKE REQUIRED']
      : []),
    ...(record.questions.length > MOST_QUESTIONS
      ? [
          `the ticket has ${record.questions.length} questions, more than ${MOST_QUESTIONS}`
        ]
      : []),
    ...(rowsToBuild.length > MOST_ROWS_TO_BUILD
      ? [
          `${rowsToBuild.length} rows are still to build, more than ${MOST_ROWS_TO_BUILD}`
        ]
      : [])
  ]
}

const escalationProblems = ({ backlog, record }) => {
  if (record.escalation === undefined) {
    return escalationSignalsOf({ backlog, record }).map(
      (signal) =>
        `intake.json records no escalation, but ${signal}. Record the escalation and leave no row to build.`
    )
  }
  return rowsToBuildOf(backlog).map(
    (row) =>
      `intake.json records an escalation, so ${row.id} must not be left to build.`
  )
}

const repoKeyProblems = ({ backlog, record }) => {
  const backlogKeys = Object.keys(backlog.repos ?? {})
  const recordKeys = Object.keys(record.repos)
  return [
    ...backlogKeys
      .filter((key) => !recordKeys.includes(key))
      .map(
        (key) =>
          `intake.json gives no reason for repo ${key}, which the backlog builds in.`
      ),
    ...recordKeys
      .filter((key) => !backlogKeys.includes(key))
      .map(
        (key) =>
          `intake.json explains repo ${key}, which the backlog does not build in.`
      )
  ]
}

const workspaceRepoProblems = ({ backlog }) =>
  Object.entries(backlog.repos ?? {})
    .filter(([, repo]) => repo?.path === '.')
    .map(
      ([key]) =>
        `The backlog builds in the workspace repo as ${key}. Ticket mode builds under the branch lifecycle, which never takes the workspace as a repo: remove ${key} from the backlog's repos, every row's repos and intake.json.`
    )

const repeatedIdsOf = (entries) => [
  ...new Set(
    entries
      .map(({ id }) => id)
      .filter((id, index, ids) => ids.indexOf(id) !== index)
  )
]

const duplicateIdProblems = ({ record }) => [
  ...repeatedIdsOf(record.statements).map(
    (id) => `intake.json uses statement id ${id} more than once.`
  ),
  ...repeatedIdsOf(record.questions).map(
    (id) => `intake.json uses question id ${id} more than once.`
  )
]

const recordRuleProblems = ({ backlog, record }) => [
  ...recordKeyProblems({ backlog, record }),
  ...repoKeyProblems({ backlog, record }),
  ...workspaceRepoProblems({ backlog }),
  ...duplicateIdProblems({ record }),
  ...coverProblems({ backlog, record }),
  ...citationProblems({ backlog, record }),
  ...questionProblems({ record }),
  ...escalationProblems({ backlog, record })
]

const summaryOf = ({ backlog, record }) => {
  const rowsToBuild = rowsToBuildOf(backlog).map((row) => row.id)
  const statementIds = record.statements.map(({ id }) => id)
  return {
    ticket: record.ticket,
    readiness: record.readiness.verdict,
    statementIds,
    statementCount: statementIds.length,
    notBuiltStatementIds: record.statements
      .filter(({ notBuilt }) => isText(notBuilt))
      .map(({ id }) => id),
    questions: record.questions,
    questionCount: record.questions.length,
    escalation: record.escalation ?? null,
    rowsToBuild,
    rowsToBuildCount: rowsToBuild.length
  }
}

/**
 * Every way a ticket backlog departs from its intake record, plus the rules
 * that need no record: a ticket backlog has no themes. The record's summary
 * is given only when the record passes its schema. A backlog whose envelope
 * names no ticket has no problems and no summary.
 *
 * @param {object} backlog - The parsed backlog.json
 * @param {{record: object|null, schema: object}} [intakeRecord] - Left out, the record rules do not run
 * @param {object|null} intakeRecord.record - The parsed intake.json, or null when the workarea has none
 * @param {object} intakeRecord.schema - The parsed intake.schema.json
 * @returns {{problems: string[], summary: object|undefined}}
 */
export const checkTicketBacklog = (backlog, intakeRecord) => {
  if (!isText(backlog?.ticket)) return { problems: [], summary: undefined }
  const noThemesFindings = noThemesProblems(backlog)
  if (!intakeRecord) return { problems: noThemesFindings, summary: undefined }
  const { record, schema } = intakeRecord
  if (record === null) {
    return {
      problems: [
        ...noThemesFindings,
        `${backlog.ticket} has no intake.json beside its backlog. The ticket intake writes it.`
      ],
      summary: undefined
    }
  }
  const shapeProblems = recordSchemaProblems({ record, schema })
  if (shapeProblems.length) {
    return {
      problems: [...noThemesFindings, ...shapeProblems],
      summary: undefined
    }
  }
  return {
    problems: [...noThemesFindings, ...recordRuleProblems({ backlog, record })],
    summary: summaryOf({ backlog, record })
  }
}
