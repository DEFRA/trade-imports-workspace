import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadBacklogSchema, statusesOf } from './backlog-schema.js'
import {
  WITHHELD_STATUSES,
  checkBacklog as checkAgainst,
  nextBuildable,
  setRowFields
} from './shape.js'

const here = dirname(fileURLToPath(import.meta.url))

const workspaceRoot = join(here, '..', '..', '..')

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
        path: 'repos/trade-imports-ins-tests',
        github: 'DEFRA/trade-imports-ins-tests'
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

  test('passes the workspace repo itself at ".", whose pull request a person approves', () => {
    const repos = {
      workspace: {
        path: '.',
        github: 'DEFRA/trade-imports-workspace',
        requireApproval: true
      }
    }

    expect(checkBacklog({ ...backlogOf(row()), repos }).problems).toEqual([])
  })

  test('refuses a requireApproval that is not true or false', () => {
    const repos = {
      workspace: {
        path: '.',
        github: 'DEFRA/trade-imports-workspace',
        requireApproval: 'yes'
      }
    }

    expect(checkBacklog({ ...backlogOf(row()), repos }).problems).toEqual([
      expect.stringContaining('The backlog "repos"')
    ])
  })

  describe('the branch lifecycle fields', () => {
    const syncRepos = {
      ins: {
        path: 'repos/trade-imports-ins-frontend',
        github: 'DEFRA/trade-imports-ins-frontend'
      },
      tests: {
        path: 'repos/trade-imports-ins-tests',
        github: 'DEFRA/trade-imports-ins-tests'
      }
    }
    const syncBacklogOf = (...rows) => ({
      ...backlogOf(...rows),
      repos: syncRepos
    })

    test('passes a merge row that runs unit and FIT and does not wait for CI', () => {
      const mergeRow = row({
        repos: ['tests'],
        merge: { tests: 'origin/main' },
        gatePhases: ['unit', 'fit'],
        awaitCi: false
      })

      expect(checkBacklog(syncBacklogOf(mergeRow)).problems).toEqual([])
    })

    test('passes null for gate, merge, gatePhases and awaitCi', () => {
      const unset = row({
        gate: null,
        merge: null,
        gatePhases: null,
        awaitCi: null
      })

      expect(checkBacklog(backlogOf(unset)).problems).toEqual([])
    })

    test('passes a docs row with no repos and no gate phases', () => {
      const docsRow = row({ kind: 'docs', repos: [], gatePhases: [] })

      expect(checkBacklog(syncBacklogOf(docsRow)).problems).toEqual([])
    })

    test('refuses a gate phase the gate does not have', () => {
      expect(
        checkBacklog(backlogOf(row({ gatePhases: ['unit', 'lint'] }))).problems
      ).toEqual([
        'inc-001 "gatePhases" must be a list of items from unit, fit, e2e, each once or null.'
      ])
    })

    test('refuses a gate phase named twice', () => {
      expect(
        checkBacklog(backlogOf(row({ gatePhases: ['unit', 'unit'] }))).problems
      ).toEqual([
        'inc-001 "gatePhases" must be a list of items from unit, fit, e2e, each once or null.'
      ])
    })

    test('refuses a merge that names no repo', () => {
      expect(checkBacklog(backlogOf(row({ merge: {} }))).problems).toEqual([
        'inc-001 "merge" must be an object whose values are text or null.'
      ])
    })

    test('refuses an awaitCi that is not true or false', () => {
      expect(checkBacklog(backlogOf(row({ awaitCi: 'no' }))).problems).toEqual([
        'inc-001 "awaitCi" must be true or false or null.'
      ])
    })

    test('refuses a merge into a repo the row does not build', () => {
      const stray = row({ repos: ['ins'], merge: { tests: 'origin/main' } })

      expect(checkBacklog(syncBacklogOf(stray)).problems).toEqual([
        'inc-001 merges into "tests", which is not in its "repos".'
      ])
    })

    test('refuses a merge into a repo the envelope does not name', () => {
      const stray = row({ merge: { plants: 'origin/main' } })

      expect(checkBacklog(syncBacklogOf(stray)).problems).toEqual([
        'inc-001 merges into "plants", which the backlog\'s "repos" does not name.'
      ])
    })
  })

  describe('themes', () => {
    const themedBacklog = () =>
      JSON.parse(
        readFileSync(
          join(here, '__fixtures__', 'themed', 'backlog.json'),
          'utf8'
        )
      )

    test('passes a themed backlog', () => {
      expect(checkBacklog(themedBacklog()).problems).toEqual([])
    })

    test('names a theme rule a schema cannot check', () => {
      const backlog = themedBacklog()
      backlog.themes[2].touches.push('frontend:src/server')

      expect(checkBacklog(backlog).problems).toEqual([
        'Themes "origin" and "documents" overlap: frontend:src/server/origin (origin) and frontend:src/server (documents). Two themes that touch the same code raise conflicting pull requests.',
        'Themes "commodity" and "documents" overlap: frontend:src/server/commodity (commodity) and frontend:src/server (documents). Two themes that touch the same code raise conflicting pull requests.'
      ])
    })

    test('refuses a theme that does not say why or what it touches', () => {
      const backlog = themedBacklog()
      delete backlog.themes[0].why

      expect(checkBacklog(backlog).problems).toEqual([
        'The backlog "themes" must be a list of objects with "id", "title", "why", "touches", "dependsOn".'
      ])
    })

    test('refuses a theme id that is not kebab-case', () => {
      const backlog = themedBacklog()
      backlog.themes[2].id = 'Documents'

      expect(checkBacklog(backlog).problems).toContain(
        'The backlog "themes" must be a list of objects with "id", "title", "why", "touches", "dependsOn".'
      )
    })

    test("refuses a split backlog's parent with no wave", () => {
      const split = {
        theme: 'origin',
        branch: 'feat/NO_JIRA-hrp-origin',
        parent: { workarea: 'shared/hrp', landsAfter: [] },
        increments: [row({ theme: 'origin' })]
      }

      expect(checkBacklog(split).problems).toEqual([
        'The backlog "parent" must be an object.'
      ])
    })
  })

  describe('externalDependsOn', () => {
    const waiting = backlogOf(
      row({
        externalDependsOn: [
          { workarea: 'shared/hrp/themes/origin', id: 'inc-002' }
        ]
      })
    )

    test("follows each one into its own workarea's backlog when given a reader", () => {
      const { problems } = checkAgainst(waiting, schema, {
        readWorkareaBacklog: () => null
      })

      expect(problems).toEqual([
        'inc-001 depends on inc-002 in shared/hrp/themes/origin, which has no backlog.json.'
      ])
    })

    test("follows a theme split off early into its own backlog's waits", () => {
      const parent = {
        ...backlogOf(row()),
        splitOff: [
          { theme: 'commodity', workarea: 'shared/hrp/themes/commodity' }
        ]
      }
      const backlogs = {
        'shared/hrp': parent,
        'shared/hrp/themes/commodity': backlogOf(
          row({
            id: 'inc-003',
            externalDependsOn: [{ workarea: 'shared/hrp', id: 'inc-002' }]
          })
        )
      }

      const { problems } = checkAgainst(parent, schema, {
        readWorkareaBacklog: (workarea) => backlogs[workarea] ?? null
      })

      expect(problems).toContain(
        'In shared/hrp/themes/commodity, split off early: inc-003 depends on inc-002 in shared/hrp, which is not in that backlog. If another early split moved that row, run tim backlog split --relink to point at its new workarea.'
      )
    })

    test('refuses one with no id', () => {
      const stray = backlogOf(
        row({ externalDependsOn: [{ workarea: 'shared/hrp' }] })
      )

      expect(checkBacklog(stray).problems).toEqual([
        'inc-001 "externalDependsOn" must be a list of objects with "workarea", "id".'
      ])
    })
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

  describe('a row with an externalDependsOn', () => {
    const backlog = backlogOf(
      row({
        externalDependsOn: [
          { workarea: 'shared/hrp/themes/origin', id: 'inc-009' }
        ]
      }),
      row({ id: 'inc-002' })
    )
    const originWith = (status) => () =>
      backlogOf(row({ id: 'inc-009', status }))

    test("waits until the other workarea's row is done", () => {
      expect([
        nextBuildable(backlog, { readWorkareaBacklog: originWith('todo') }),
        nextBuildable(backlog, { readWorkareaBacklog: originWith('done') })
      ]).toEqual(['inc-002', 'inc-001'])
    })

    test('waits when nobody says how to read the other workarea', () => {
      expect(nextBuildable(backlog)).toBe('inc-002')
    })
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
