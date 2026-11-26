import { describe, test, expect } from 'vitest'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { VERDICTS } from '../commands/refine/finalize.js'
import { loadBacklogSchema, loadIntakeSchema } from './backlog-schema.js'
import { checkBacklog } from './shape.js'
import { row } from './__fixtures__/backlog-rows.js'
import {
  intakeRecord,
  question,
  statement
} from './__fixtures__/intake-record.js'
import { ticketBacklogRepos } from './__fixtures__/ticket-workareas.js'

const workspaceRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
)
const backlogSchema = loadBacklogSchema(workspaceRoot)
const intakeSchema = loadIntakeSchema(workspaceRoot)

const CITATION = '(ticket:EUDPA-100 AC1)'

const citedRow = (overrides = {}) =>
  row({
    acceptanceCriteria: [`The list shows only the user's own. ${CITATION}`],
    ...overrides
  })

const ticketBacklog = (rows, overrides = {}) => ({
  programme: 'demo',
  ticket: 'EUDPA-100',
  repos: ticketBacklogRepos,
  increments: rows,
  ...overrides
})

const check = ({ backlog = ticketBacklog([citedRow()]), record }) =>
  checkBacklog(backlog, backlogSchema, {
    intakeRecord: { record: record ?? intakeRecord(), schema: intakeSchema }
  })

const problemsOf = (input) => check(input).problems

const escalation = {
  signals: ['spike'],
  reason: 'The ticket needs an investigation first.'
}

const rowsNamed = (count) =>
  Array.from({ length: count }, (_, index) =>
    citedRow({ id: `inc-00${index + 1}` })
  )

describe('#checkBacklog for a ticket backlog', () => {
  test('passes a covered backlog and summarises its record', () => {
    const result = check({
      record: intakeRecord({
        questions: [question()],
        statements: [
          statement(),
          statement({
            id: 'SCOPE1',
            kind: 'scope',
            text: 'Only the list page.',
            coveredBy: []
          })
        ]
      })
    })

    expect(result.problems).toEqual([])
    expect(result.intake).toEqual({
      ticket: 'EUDPA-100',
      readiness: 'READY',
      statementIds: ['AC1', 'SCOPE1'],
      statementCount: 2,
      notBuiltStatementIds: [],
      questions: [question()],
      questionCount: 1,
      escalation: null,
      rowsToBuild: ['inc-001'],
      rowsToBuildCount: 1
    })
  })

  test('names an acceptance criterion no row covers, with its words', () => {
    const record = intakeRecord({ statements: [statement({ coveredBy: [] })] })

    expect(problemsOf({ record })).toEqual([
      'Acceptance criterion AC1 is not covered by a row and has no reason it is not built: "The list shows only notifications the signed-in user created."'
    ])
  })

  test('accepts an acceptance criterion with a reason it is not built', () => {
    const record = intakeRecord({
      statements: [
        statement({ coveredBy: [], notBuilt: 'The backend already does this.' })
      ]
    })

    const result = check({ record })

    expect(result.problems).toEqual([])
    expect(result.intake.notBuiltStatementIds).toEqual(['AC1'])
  })

  test.each(['dropped', 'rejected', 'merged-into', 'deferred'])(
    'refuses a criterion covered only by a %s row, naming the row and its status',
    (status) => {
      const extraRow = row({
        id: 'inc-002',
        status,
        ...(status === 'merged-into' ? { mergedInto: 'inc-001' } : {})
      })
      const record = intakeRecord({
        statements: [statement({ coveredBy: ['inc-002'] })]
      })

      const problems = problemsOf({
        backlog: ticketBacklog([citedRow(), extraRow]),
        record
      })

      expect(problems).toContain(
        `Statement AC1 is covered only by inc-002, which is ${status}.`
      )
    }
  )

  test('accepts a criterion covered by a todo row beside a dropped one', () => {
    const record = intakeRecord({
      statements: [statement({ coveredBy: ['inc-002', 'inc-001'] })]
    })

    const problems = problemsOf({
      backlog: ticketBacklog([
        citedRow(),
        row({ id: 'inc-002', status: 'dropped' })
      ]),
      record
    })

    expect(problems).toEqual([])
  })

  test('refuses a cover id the backlog does not have, naming both', () => {
    const record = intakeRecord({
      statements: [statement({ coveredBy: ['inc-001', 'inc-099'] })]
    })

    expect(problemsOf({ record })).toEqual([
      'Statement AC1 is covered by inc-099, which is not in the backlog.'
    ])
  })

  test.each([
    [
      'a statement id the record does not have',
      '(ticket:EUDPA-100 AC9)',
      'inc-001 criterion cites ticket:EUDPA-100 AC9, which intake.json does not have.'
    ],
    [
      'another ticket key',
      '(ticket:EUDPA-200 AC1)',
      'inc-001 criterion cites ticket EUDPA-200, but the backlog builds EUDPA-100.'
    ],
    [
      'the ticket with no statement id',
      '(ticket:EUDPA-100)',
      'inc-001 criterion cites ticket:EUDPA-100 with no statement id.'
    ]
  ])('refuses a criterion citing %s', (_title, bracket, problem) => {
    const backlog = ticketBacklog([
      row({ acceptanceCriteria: [`The list is shown. ${bracket}`] })
    ])

    expect(problemsOf({ backlog })).toEqual([problem])
  })

  test('accepts a criterion citing only a repo or a ruling', () => {
    const backlog = ticketBacklog([
      row({
        acceptanceCriteria: [
          'The list is shown. (repo:workspace docs/list.md)',
          'The list is sorted. (ruling:sam-2026-11-25 sort by date)'
        ]
      })
    ])

    expect(problemsOf({ backlog })).toEqual([])
  })

  test('refuses a todo row criterion with no bracket, and leaves a done row alone', () => {
    const unbracketed = 'The list is shown.'
    const backlog = ticketBacklog([
      citedRow(),
      row({ id: 'inc-002', acceptanceCriteria: [unbracketed] }),
      row({ id: 'inc-003', status: 'done', acceptanceCriteria: [unbracketed] })
    ])

    expect(problemsOf({ backlog })).toEqual([
      'inc-002 criterion has no ticket, repo or ruling provenance bracket at its end: "The list is shown."'
    ])
  })

  test('refuses a question that holds the launch with no cause', () => {
    const record = intakeRecord({
      questions: [question({ holdsLaunch: true })]
    })

    expect(problemsOf({ record })).toEqual([
      'Question Q1 holds the launch but names no cause. Only security, access, data integrity, a signed-off scenario or a rulings-ledger entry holds it.'
    ])
  })

  test('refuses a question that names a cause but does not hold the launch', () => {
    const record = intakeRecord({
      questions: [question({ cause: 'security' })]
    })

    expect(problemsOf({ record })).toEqual([
      'Question Q1 names the cause "security" but does not hold the launch.'
    ])
  })

  test('accepts a question that holds the launch for a named cause', () => {
    const record = intakeRecord({
      questions: [question({ holdsLaunch: true, cause: 'data integrity' })]
    })

    expect(problemsOf({ record })).toEqual([])
  })

  test('refuses a spike with no escalation recorded', () => {
    const record = intakeRecord({
      readiness: { verdict: 'SPIKE REQUIRED', reasons: ['It needs a spike.'] }
    })

    expect(problemsOf({ record })).toEqual([
      'intake.json records no escalation, but the readiness verdict is SPIKE REQUIRED. Record the escalation and leave no row to build.'
    ])
  })

  test('refuses four questions with no escalation recorded', () => {
    const record = intakeRecord({
      questions: ['Q1', 'Q2', 'Q3', 'Q4'].map((id) => question({ id }))
    })

    expect(problemsOf({ record })).toEqual([
      'intake.json records no escalation, but the ticket has 4 questions, more than 3. Record the escalation and leave no row to build.'
    ])
  })

  test('refuses five rows to build with no escalation recorded, and accepts four with three questions', () => {
    const fiveRows = ticketBacklog(rowsNamed(5))
    const fourRows = ticketBacklog(rowsNamed(4))
    const threeQuestions = intakeRecord({
      questions: ['Q1', 'Q2', 'Q3'].map((id) => question({ id }))
    })

    expect(problemsOf({ backlog: fiveRows })).toEqual([
      'intake.json records no escalation, but 5 rows are still to build, more than 4. Record the escalation and leave no row to build.'
    ])
    expect(problemsOf({ backlog: fourRows, record: threeQuestions })).toEqual(
      []
    )
  })

  test('refuses a row to build beside a recorded escalation, and accepts none', () => {
    const record = intakeRecord({
      escalation,
      statements: [
        statement({ coveredBy: [], notBuilt: 'The ticket is escalated.' })
      ]
    })
    const noneToBuild = ticketBacklog([citedRow({ status: 'deferred' })])

    expect(problemsOf({ record })).toEqual([
      'intake.json records an escalation, so inc-001 must not be left to build.'
    ])
    expect(problemsOf({ backlog: noneToBuild, record })).toEqual([])
  })

  test.each(['themes', 'theme'])(
    'refuses "%s" on a ticket backlog',
    (field) => {
      const value = field === 'themes' ? [] : 'origin'
      const backlog = ticketBacklog([citedRow()], { [field]: value })

      expect(problemsOf({ backlog })).toContain(
        `The backlog has "${field}", but a ticket backlog builds on one branch and has no themes.`
      )
    }
  )

  test('refuses "splitOff" and "movedOut" on a ticket backlog with the lines any unthemed backlog gets', () => {
    const backlog = ticketBacklog([citedRow()], {
      splitOff: [],
      movedOut: []
    })

    const problems = problemsOf({ backlog })

    expect(
      problems.filter((problem) => problem.includes('"splitOff"'))
    ).toEqual([
      'The backlog has "splitOff" but no "themes". Only a themed backlog splits a theme off.'
    ])
    expect(
      problems.filter((problem) => problem.includes('"movedOut"'))
    ).toEqual([
      'The backlog has "movedOut" but no "theme". Only a split backlog moves rows out to another theme.'
    ])
  })

  test('refuses a ticket backlog with no intake record, saying the intake writes it', () => {
    const result = checkBacklog(ticketBacklog([citedRow()]), backlogSchema, {
      intakeRecord: { record: null, schema: intakeSchema }
    })

    expect(result.problems).toEqual([
      'EUDPA-100 has no intake.json beside its backlog. The ticket intake writes it.'
    ])
  })

  test('refuses a record for another ticket, naming both keys', () => {
    const record = intakeRecord({ ticket: 'EUDPA-200' })

    expect(problemsOf({ record })).toContain(
      'intake.json is for EUDPA-200, but the backlog builds EUDPA-100.'
    )
  })

  test('names a repo the backlog builds in that the record does not explain', () => {
    const record = intakeRecord({ repos: {} })

    expect(problemsOf({ record })).toEqual([
      'intake.json gives no reason for repo frontend, which the backlog builds in.'
    ])
  })

  test('names a repo the record explains that the backlog does not build in', () => {
    const record = intakeRecord({
      repos: {
        frontend: 'The change is to the address picker.',
        tests: 'The tests repo shows what is proven.'
      }
    })

    expect(problemsOf({ record })).toEqual([
      'intake.json explains repo tests, which the backlog does not build in.'
    ])
  })

  test('refuses the workspace repo in a ticket backlog, naming its key', () => {
    const backlog = ticketBacklog([citedRow()], {
      repos: {
        workspace: { path: '.', github: 'DEFRA/trade-imports-workspace' }
      }
    })
    const record = intakeRecord({
      repos: { workspace: 'The spec changes.' }
    })

    expect(problemsOf({ backlog, record })).toEqual([
      "The backlog builds in the workspace repo as workspace. Ticket mode builds under the branch lifecycle, which never takes the workspace as a repo: remove workspace from the backlog's repos, every row's repos and intake.json."
    ])
  })

  test('names a statement id used more than once', () => {
    const record = intakeRecord({ statements: [statement(), statement()] })

    expect(problemsOf({ record })).toEqual([
      'intake.json uses statement id AC1 more than once.'
    ])
  })

  test('names a question id used more than once', () => {
    const record = intakeRecord({ questions: [question(), question()] })

    expect(problemsOf({ record })).toEqual([
      'intake.json uses question id Q1 more than once.'
    ])
  })

  test('refuses a record out of schema in plain words', () => {
    const withoutDefault = Object.fromEntries(
      Object.entries(question()).filter(([field]) => field !== 'default')
    )
    const record = intakeRecord({ questions: [withoutDefault] })

    expect(problemsOf({ record })).toEqual([
      'intake.json questions[Q1] has no "default".'
    ])
  })

  test('does not read the record when the check is given none', () => {
    const result = checkBacklog(ticketBacklog([citedRow()]), backlogSchema)

    expect(result).toEqual({
      problems: [],
      counts: { todo: 1 },
      total: 1
    })
  })
})

describe('the intake schema', () => {
  test('lists the readiness verdicts the refinement check accepts', () => {
    expect(intakeSchema.properties.readiness.properties.verdict.enum).toEqual(
      VERDICTS
    )
  })
})
