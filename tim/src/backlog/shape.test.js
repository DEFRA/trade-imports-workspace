import { describe, test, expect } from 'vitest'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadBacklogSchema, statusesOf } from './backlog-schema.js'
import {
  WITHHELD_STATUSES,
  checkBacklog as checkAgainst,
  nextBuildable,
  setRowFields
} from './shape.js'

const workspaceRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
)

const schema = loadBacklogSchema(workspaceRoot)

const checkBacklog = (backlog) => checkAgainst(backlog, schema)

const row = (overrides = {}) => ({
  id: 'inc-001',
  title: 'Show the notification list',
  detail:
    'An importer sees their own notifications, so they can pick one up again.',
  acceptanceCriteria: [
    'The list shows only notifications the signed-in user created.'
  ],
  dependsOn: [],
  status: 'todo',
  ...overrides
})

const rowWithout = (field) =>
  Object.fromEntries(Object.entries(row()).filter(([key]) => key !== field))

const backlogOf = (...rows) => ({ programme: 'demo', increments: rows })

describe('checkBacklog', () => {
  test('passes a row that says what, why and acceptance', () => {
    expect(checkBacklog(backlogOf(row()))).toEqual({
      problems: [],
      counts: { todo: 1 },
      total: 1
    })
  })

  test('refuses a backlog with no increments list', () => {
    expect(checkBacklog({ items: [] }).problems).toEqual([
      'The backlog needs an "increments" list.'
    ])
  })

  test('names every missing requirement field', () => {
    const { problems } = checkBacklog(
      backlogOf({ id: 'inc-001', dependsOn: [], status: 'todo' })
    )
    expect(problems).toEqual([
      'inc-001 has no "title".',
      'inc-001 has no "detail" saying what and why.',
      'inc-001 needs "acceptanceCriteria": a list of at least one observable outcome.'
    ])
  })

  test('refuses each recipe field', () => {
    const { problems } = checkBacklog(
      backlogOf(row({ filesToTouch: [], verification: ['npm test'] }))
    )
    expect(problems).toEqual([
      'inc-001 carries "filesToTouch". A row says what, why and acceptance; the build plans the how.',
      'inc-001 carries "verification". A row says what, why and acceptance; the build plans the how.'
    ])
  })

  test('refuses an unknown status', () => {
    expect(checkBacklog(backlogOf(row({ status: 'paused' }))).problems).toEqual(
      [
        'inc-001 has status "paused". Use one of: todo, blocked, done, deferred, dropped, rejected, merged-into.'
      ]
    )
  })

  test('refuses a blocked row that does not say what it waits for', () => {
    expect(
      checkBacklog(backlogOf(row({ status: 'blocked', openQuestions: [] })))
        .problems
    ).toEqual([
      'inc-001 is blocked but has no "openQuestions" saying what it waits for.'
    ])
  })

  test('passes a blocked row with its question', () => {
    expect(
      checkBacklog(
        backlogOf(
          row({ status: 'blocked', openQuestions: ['Who may see them?'] })
        )
      ).problems
    ).toEqual([])
  })

  test('refuses a dependency on a missing or the same row', () => {
    const { problems } = checkBacklog(
      backlogOf(row({ dependsOn: ['inc-001', 'inc-009'] }))
    )
    expect(problems).toEqual([
      'inc-001 depends on itself.',
      'inc-001 depends on "inc-009", which is not in the backlog.'
    ])
  })

  test('refuses a duplicate id', () => {
    expect(checkBacklog(backlogOf(row(), row())).problems).toEqual([
      'inc-001 appears more than once.'
    ])
  })

  test('names a dependsOn cycle', () => {
    const { problems } = checkBacklog(
      backlogOf(
        row({ dependsOn: ['inc-002'] }),
        row({ id: 'inc-002', dependsOn: ['inc-001'] })
      )
    )
    expect(problems).toEqual([
      'A dependsOn cycle: inc-001 → inc-002 → inc-001.'
    ])
  })

  test('refuses repos that are not a list of text', () => {
    expect(
      checkBacklog(backlogOf(row({ repos: 'frontend' }))).problems
    ).toEqual(['inc-001 "repos" must be a list of text.'])
  })

  test('refuses a row that is not an object', () => {
    expect(checkBacklog(backlogOf('inc-001')).problems).toEqual([
      'increments[0] is not an object.'
    ])
  })

  test('names a row with no id by its position', () => {
    const { problems } = checkBacklog(backlogOf(rowWithout('id')))

    expect(problems).toEqual(['increments[0] has no "id".'])
  })

  test('refuses a title that is only whitespace', () => {
    expect(checkBacklog(backlogOf(row({ title: '  ' }))).problems).toEqual([
      'inc-001 has no "title".'
    ])
  })

  test('refuses a row with no dependsOn', () => {
    const { problems } = checkBacklog(backlogOf(rowWithout('dependsOn')))

    expect(problems).toEqual([
      'inc-001 has no "dependsOn". Give [] when it waits for nothing.'
    ])
  })

  test('refuses an unknown kind', () => {
    expect(checkBacklog(backlogOf(row({ kind: 'add-page' }))).problems).toEqual(
      [
        'inc-001 has kind "add-page". Use one of: feat, fix, chore, refactor, test, docs.'
      ]
    )
  })

  test('passes notes as text or as a list of text', () => {
    const { problems } = checkBacklog(
      backlogOf(
        row({ notes: 'Combines two slices.' }),
        row({ id: 'inc-002', notes: ['ATTEMPT FAILED: ladder red'] })
      )
    )
    expect(problems).toEqual([])
  })

  test('refuses notes that are neither text nor a list of text', () => {
    expect(checkBacklog(backlogOf(row({ notes: 7 }))).problems).toEqual([
      'inc-001 "notes" must be text or a list of text.'
    ])
  })

  test('refuses a pull request with no url', () => {
    expect(
      checkBacklog(backlogOf(row({ prs: [{ repo: 'frontend' }] }))).problems
    ).toEqual(['inc-001 "prs" must be a list of objects with "url".'])
  })

  test('passes the fields the build loop writes', () => {
    const built = row({
      status: 'done',
      ticket: 'EUDPA-1',
      branch: 'feat/EUDPA-1',
      commit: 'abc1234',
      prs: [{ repo: 'frontend', url: 'https://github.com/DEFRA/x/pull/1' }]
    })
    expect(checkBacklog(backlogOf(built)).problems).toEqual([])
  })

  test('passes a field the schema does not name, as older backlogs carry', () => {
    expect(checkBacklog(backlogOf(row({ milestone: 'M1' }))).problems).toEqual(
      []
    )
  })

  test('refuses an envelope field of the wrong type', () => {
    expect(
      checkBacklog({ invariants: 'Keep CSRF.', increments: [row()] }).problems
    ).toEqual(['The backlog "invariants" must be a list of text.'])
  })

  test('passes a repos table with a path and a GitHub slug for each repo', () => {
    const repos = {
      frontend: {
        path: 'repos/trade-imports-plants-frontend',
        github: 'DEFRA/trade-imports-plants-frontend'
      },
      tests: {
        path: 'repos/trade-imports-animals-tests',
        github: 'DEFRA/trade-imports-animals-tests'
      }
    }

    expect(checkBacklog({ ...backlogOf(row()), repos }).problems).toEqual([])
  })

  test('refuses a repos table entry with no path', () => {
    const repos = {
      frontend: { github: 'DEFRA/trade-imports-plants-frontend' }
    }

    expect(checkBacklog({ ...backlogOf(row()), repos }).problems).toEqual([
      'The backlog "repos" must be an object whose values are objects with "path", "github".'
    ])
  })

  test('counts rows by status', () => {
    expect(
      checkBacklog(backlogOf(row(), row({ id: 'inc-002', status: 'done' })))
        .counts
    ).toEqual({ todo: 1, done: 1 })
  })
})

describe('WITHHELD_STATUSES', () => {
  test('withholds only statuses backlog.schema.json allows', () => {
    const allowed = statusesOf(schema)

    const unknown = [...WITHHELD_STATUSES].filter(
      (status) => !allowed.includes(status)
    )

    expect(unknown).toEqual([])
  })

  test('leaves only todo buildable of the statuses the schema allows', () => {
    expect(
      statusesOf(schema).filter((status) => !WITHHELD_STATUSES.has(status))
    ).toEqual(['todo'])
  })
})

describe('nextBuildable', () => {
  test('picks the first row whose dependencies are done', () => {
    const backlog = backlogOf(
      row({ id: 'inc-001', status: 'done' }),
      row({ id: 'inc-002', dependsOn: ['inc-003'] }),
      row({ id: 'inc-003', dependsOn: ['inc-001'] })
    )
    expect(nextBuildable(backlog)).toBe('inc-003')
  })

  test('skips every withheld status', () => {
    const backlog = backlogOf(
      row({ id: 'inc-001', status: 'blocked' }),
      row({ id: 'inc-002', status: 'deferred' }),
      row({ id: 'inc-003', status: 'merged-into' }),
      row({ id: 'inc-004', status: 'todo' })
    )
    expect(nextBuildable(backlog)).toBe('inc-004')
  })

  test('picks up a status nobody expected, so it is seen', () => {
    expect(nextBuildable(backlogOf(row({ status: 'paused' })))).toBe('inc-001')
  })

  test('returns null when nothing is buildable', () => {
    expect(nextBuildable(backlogOf(row({ status: 'done' })))).toBeNull()
  })
})

describe('setRowFields', () => {
  test('replaces status and commit and reports what changed', () => {
    const { backlog, changed } = setRowFields({
      backlog: backlogOf(row()),
      id: 'inc-001',
      changes: { status: 'done', commit: 'abc1234' }
    })
    expect(backlog.increments[0]).toEqual(
      row({ status: 'done', commit: 'abc1234' })
    )
    expect(changed).toEqual({
      status: { before: 'todo', after: 'done' },
      commit: { before: undefined, after: 'abc1234' }
    })
  })

  test('appends a note to a string, a list or nothing', () => {
    const fromString = setRowFields({
      backlog: backlogOf(row({ notes: 'first' })),
      id: 'inc-001',
      changes: { note: 'second' }
    })
    const fromNothing = setRowFields({
      backlog: backlogOf(row()),
      id: 'inc-001',
      changes: { note: 'first' }
    })
    expect(fromString.backlog.increments[0].notes).toEqual(['first', 'second'])
    expect(fromNothing.backlog.increments[0].notes).toEqual(['first'])
  })

  test('appends an open question', () => {
    const { backlog } = setRowFields({
      backlog: backlogOf(row({ openQuestions: ['one'] })),
      id: 'inc-001',
      changes: { openQuestion: 'two' }
    })
    expect(backlog.increments[0].openQuestions).toEqual(['one', 'two'])
  })

  test('adds a pull request, then merges into it by url', () => {
    const url = 'https://github.com/DEFRA/x/pull/1'
    const added = setRowFields({
      backlog: backlogOf(row()),
      id: 'inc-001',
      changes: { pr: { repo: 'frontend', url, number: 1 } }
    })
    const merged = setRowFields({
      backlog: added.backlog,
      id: 'inc-001',
      changes: { pr: { url, merged: true, sha: 'def5678' } }
    })
    expect(merged.backlog.increments[0].prs).toEqual([
      { repo: 'frontend', url, number: 1, merged: true, sha: 'def5678' }
    ])
  })

  test('leaves every other row alone', () => {
    const other = row({ id: 'inc-002' })
    const { backlog } = setRowFields({
      backlog: backlogOf(row(), other),
      id: 'inc-001',
      changes: { status: 'done' }
    })
    expect(backlog.increments[1]).toBe(other)
  })

  test('refuses an id that is not there', () => {
    expect(() =>
      setRowFields({ backlog: backlogOf(row()), id: 'inc-009', changes: {} })
    ).toThrow("Can't find inc-009 in the backlog.")
  })
})
