import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  crossThemeDependencies,
  externalDependenciesDone,
  externalDependencyProblems,
  landingWaves,
  parseTouch,
  themeProblems,
  touchesOverlap
} from './themes.js'

const here = dirname(fileURLToPath(import.meta.url))

const themedBacklog = () =>
  JSON.parse(
    readFileSync(join(here, '__fixtures__', 'themed', 'backlog.json'), 'utf8')
  )

const editRow = (backlog, id, edit) => ({
  ...backlog,
  increments: backlog.increments.map((row) => (row.id === id ? edit(row) : row))
})

const editTheme = (backlog, id, edit) => ({
  ...backlog,
  themes: backlog.themes.map((theme) => (theme.id === id ? edit(theme) : theme))
})

describe('themeProblems', () => {
  test('passes a themed backlog whose themes keep to their own code', () => {
    expect(themeProblems(themedBacklog())).toEqual([])
  })

  test('passes a backlog with no themes and no row naming one', () => {
    const { themes, ...unthemed } = themedBacklog()
    const rows = unthemed.increments.map(({ theme, ...row }) => row)

    expect(themeProblems({ ...unthemed, increments: rows })).toEqual([])
  })

  test('refuses a theme id used twice', () => {
    const backlog = themedBacklog()
    backlog.themes.push({
      ...backlog.themes[2],
      touches: ['frontend:src/x', 'tests:tests/x']
    })

    expect(themeProblems(backlog)).toEqual([
      'Theme "documents" appears more than once.'
    ])
  })

  test('refuses a theme that depends on a theme that is not there, or on itself', () => {
    const backlog = editTheme(themedBacklog(), 'documents', (theme) => ({
      ...theme,
      dependsOn: ['documents', 'payments']
    }))

    expect(themeProblems(backlog)).toEqual([
      'Theme "documents" depends on itself.',
      'Theme "documents" depends on theme "payments", which "themes" does not name.'
    ])
  })

  test('names a cycle between themes', () => {
    const backlog = editTheme(themedBacklog(), 'origin', (theme) => ({
      ...theme,
      dependsOn: ['commodity']
    }))

    expect(themeProblems(backlog)).toEqual([
      'A theme dependsOn cycle: origin → commodity → origin.'
    ])
  })

  test('refuses two themes that touch the same code, naming both', () => {
    const backlog = editTheme(themedBacklog(), 'documents', (theme) => ({
      ...theme,
      touches: [...theme.touches, 'frontend:src/server/origin/region']
    }))

    expect(themeProblems(backlog)).toEqual([
      'Themes "origin" and "documents" overlap: frontend:src/server/origin (origin) and frontend:src/server/origin/region (documents). Two themes that touch the same code raise conflicting pull requests.'
    ])
  })

  test('refuses a theme that touches a whole repo another theme touches part of', () => {
    const backlog = editTheme(themedBacklog(), 'documents', (theme) => ({
      ...theme,
      touches: ['frontend:.', 'tests:tests/plants/documents']
    }))

    expect(themeProblems(backlog)).toEqual([
      'Themes "origin" and "documents" overlap: frontend:src/server/origin (origin) and frontend:. (documents). Two themes that touch the same code raise conflicting pull requests.',
      'Themes "commodity" and "documents" overlap: frontend:src/server/commodity (commodity) and frontend:. (documents). Two themes that touch the same code raise conflicting pull requests.'
    ])
  })

  test('refuses a theme that touches a repo the backlog does not build in', () => {
    const backlog = editTheme(themedBacklog(), 'documents', (theme) => ({
      ...theme,
      touches: [...theme.touches, 'stub:src/documents']
    }))

    expect(themeProblems(backlog)).toEqual([
      'Theme "documents" touches stub:src/documents, but the backlog\'s "repos" does not name stub.'
    ])
  })

  test('refuses a theme with no rows', () => {
    const backlog = themedBacklog()
    backlog.themes.push({
      id: 'payments',
      title: 'Payments',
      why: 'Nothing yet.',
      touches: ['frontend:src/server/payments'],
      dependsOn: []
    })

    expect(themeProblems(backlog)).toEqual([
      'Theme "payments" has no rows. Give it rows, or remove it.'
    ])
  })

  test('refuses a todo row with no theme', () => {
    const backlog = editRow(
      themedBacklog(),
      'inc-002',
      ({ theme, ...row }) => row
    )

    expect(themeProblems(backlog)).toEqual([
      'inc-002 has no "theme". Every todo or blocked row belongs to one theme.'
    ])
  })

  test('lets a row that is built or set aside go without a theme', () => {
    const backlog = editRow(themedBacklog(), 'inc-006', (row) => ({
      ...row,
      status: 'dropped'
    }))

    expect(themeProblems(backlog)).toEqual([])
  })

  test('refuses a row in a theme the backlog does not name', () => {
    const backlog = editRow(themedBacklog(), 'inc-005', (row) => ({
      ...row,
      theme: 'payments'
    }))

    expect(themeProblems(backlog)).toEqual([
      'Theme "documents" has no rows. Give it rows, or remove it.',
      'inc-005 is in theme "payments", which "themes" does not name.'
    ])
  })

  test('refuses a row that builds in a repo its theme does not touch', () => {
    const backlog = editRow(themedBacklog(), 'inc-005', (row) => ({
      ...row,
      repos: ['backend', 'tests', 'frontend']
    }))

    expect(themeProblems(backlog)).toEqual([
      'inc-005 builds in backend, which theme "documents" does not touch. Add a backend path to the theme\'s "touches", or move the row.'
    ])
  })

  test('refuses a row that depends on another theme its own theme does not depend on', () => {
    const backlog = editTheme(themedBacklog(), 'commodity', (theme) => ({
      ...theme,
      dependsOn: []
    }))

    expect(themeProblems(backlog)).toEqual([
      'inc-003 (theme "commodity") depends on inc-002 (theme "origin"), so theme "commodity" must depend on theme "origin".'
    ])
  })

  test('accepts a theme that depends on another through a third', () => {
    const backlog = themedBacklog()
    const throughCommodity = editTheme(
      editRow(backlog, 'inc-005', (row) => ({
        ...row,
        dependsOn: [...row.dependsOn, 'inc-002']
      })),
      'documents',
      (theme) => ({ ...theme, dependsOn: ['commodity'] })
    )

    expect(themeProblems(throughCommodity)).toEqual([])
  })

  test('refuses a row naming a theme when the backlog has no themes', () => {
    const { themes, ...unthemed } = themedBacklog()

    expect(themeProblems(unthemed)).toEqual([
      'inc-001 is in theme "origin", but the backlog has no "themes".',
      'inc-002 is in theme "origin", but the backlog has no "themes".',
      'inc-003 is in theme "commodity", but the backlog has no "themes".',
      'inc-004 is in theme "commodity", but the backlog has no "themes".',
      'inc-005 is in theme "documents", but the backlog has no "themes".'
    ])
  })

  describe('a split backlog', () => {
    const split = (overrides = {}) => ({
      programme: 'hrp-origin',
      theme: 'origin',
      branch: 'feat/NO_JIRA-hrp-origin',
      parent: { workarea: 'shared/hrp', wave: 1, landsAfter: [] },
      increments: [themedBacklog().increments[1]],
      ...overrides
    })

    test("passes when every row is its theme's", () => {
      expect(themeProblems(split())).toEqual([])
    })

    test('needs its branch and its parent', () => {
      const { branch, parent, ...bare } = split()

      expect(themeProblems(bare)).toEqual([
        'The backlog is theme "origin"\'s split but has no "branch". Run tim backlog split again in its parent workarea.',
        'The backlog is theme "origin"\'s split but has no "parent". Run tim backlog split again in its parent workarea.'
      ])
    })

    test('refuses themes of its own and a row of another theme', () => {
      const backlog = split({
        themes: [],
        increments: [themedBacklog().increments[2]]
      })

      expect(themeProblems(backlog)).toEqual([
        'The backlog is theme "origin"\'s split, so it cannot have "themes" of its own.',
        'inc-003 is in theme "commodity", but this backlog is theme "origin"\'s.'
      ])
    })
  })
})

describe('parseTouch and touchesOverlap', () => {
  test('reads a repo key and a path prefix, dropping a trailing slash', () => {
    expect(parseTouch('frontend:src/server/origin/')).toEqual({
      repoKey: 'frontend',
      path: 'src/server/origin'
    })
  })

  test('takes "." or an empty path as the whole repo', () => {
    expect([parseTouch('tests:.'), parseTouch('tests:')]).toEqual([
      { repoKey: 'tests', path: '.' },
      { repoKey: 'tests', path: '.' }
    ])
  })

  test('does not count a path that only starts with the same letters as overlapping', () => {
    expect(
      touchesOverlap(
        parseTouch('frontend:src/server/origin'),
        parseTouch('frontend:src/server/origins')
      )
    ).toBe(false)
  })

  test('does not count the same path in two repos as overlapping', () => {
    expect(
      touchesOverlap(parseTouch('frontend:src'), parseTouch('backend:src'))
    ).toBe(false)
  })
})

describe('landingWaves', () => {
  test('puts themes with no ordering need between them in one wave', () => {
    expect(landingWaves(themedBacklog().themes)).toEqual([
      { wave: 1, themes: ['origin', 'documents'] },
      { wave: 2, themes: ['commodity'] }
    ])
  })

  test('puts a theme after the latest wave it depends on', () => {
    const themes = [
      { id: 'a', dependsOn: [] },
      { id: 'b', dependsOn: ['a'] },
      { id: 'c', dependsOn: ['a', 'b'] },
      { id: 'd', dependsOn: [] }
    ]

    expect(landingWaves(themes)).toEqual([
      { wave: 1, themes: ['a', 'd'] },
      { wave: 2, themes: ['b'] },
      { wave: 3, themes: ['c'] }
    ])
  })
})

describe('crossThemeDependencies', () => {
  test('lists every row that depends on a row in another theme or in none', () => {
    expect(crossThemeDependencies(themedBacklog())).toEqual([
      {
        from: { theme: 'commodity', id: 'inc-003' },
        to: { theme: 'origin', id: 'inc-002' }
      },
      {
        from: { theme: 'documents', id: 'inc-005' },
        to: { theme: null, id: 'inc-006' }
      }
    ])
  })
})

describe('externalDependsOn', () => {
  const waiting = {
    increments: [
      {
        id: 'inc-003',
        status: 'todo',
        dependsOn: [],
        externalDependsOn: [
          { workarea: 'shared/hrp/themes/origin', id: 'inc-002' }
        ]
      }
    ]
  }
  const originWith = (status) => ({
    increments: [{ id: 'inc-002', status, dependsOn: [] }]
  })

  test('passes a dependency on a row the other backlog has', () => {
    expect(
      externalDependencyProblems(waiting, () => originWith('todo'))
    ).toEqual([])
  })

  test('names a workarea with no backlog', () => {
    expect(externalDependencyProblems(waiting, () => null)).toEqual([
      'inc-003 depends on inc-002 in shared/hrp/themes/origin, which has no backlog.json.'
    ])
  })

  test('names a row the other backlog does not have', () => {
    expect(
      externalDependencyProblems(waiting, () => ({ increments: [] }))
    ).toEqual([
      'inc-003 depends on inc-002 in shared/hrp/themes/origin, which is not in that backlog.'
    ])
  })

  test('is done only when the other row is done', () => {
    const [row] = waiting.increments

    expect([
      externalDependenciesDone(row, () => originWith('todo')),
      externalDependenciesDone(row, () => originWith('done')),
      externalDependenciesDone(row, () => null)
    ]).toEqual([false, true, false])
  })
})
