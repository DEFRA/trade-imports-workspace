import { describe, expect, test } from 'vitest'
import { renderItemsTable, summaryWithTable, textOf } from './items-table.js'

const table = '| # | File |\n| 1 | a.js |'

describe('#renderItemsTable', () => {
  test('Should split the fix on its first One way: and strip Must: from the Must part', () => {
    const rendered = renderItemsTable([
      {
        id: 1,
        file: 'a.js',
        line: 2,
        severity: 'Major',
        category: 'naming',
        issue: 'x',
        fix: ' Must:  do it. One way: a. One way: b ',
        disposition: null,
        status: null,
        notes: null
      }
    ])

    expect(rendered.split('\n').at(-1)).toBe(
      '| 1 | a.js | 2 | Major | naming | x | do it. | a. One way: b |  |  |  |'
    )
  })

  test('Should escape pipes and newlines in the file, issue and notes but not in the status', () => {
    const rendered = renderItemsTable([
      {
        id: 2,
        file: 'a|b.js',
        line: null,
        severity: 'Minor',
        category: 'comments',
        issue: 'one\ntwo',
        fix: null,
        disposition: 'Fix',
        status: 'Not|Done',
        notes: 'p|q'
      }
    ])

    expect(rendered.split('\n').at(-1)).toBe(
      '| 2 | a\\|b.js |  | Minor | comments | one two |  |  | Fix | Not|Done | p\\|q |'
    )
  })
})

describe('#summaryWithTable', () => {
  test('Should replace the items table already there and keep what follows it', () => {
    const summary = '# R\n| # | File | old |\n|---|\n| 9 | z |\nafter\n'

    expect(summaryWithTable(summary, table)).toBe(`# R\n${table}\nafter\n`)
  })

  test('Should replace the whole comment that names the renderer', () => {
    const summary =
      '# R\n<!-- tim review items render puts\n it here -->\n## Repository Verdict\n'

    expect(summaryWithTable(summary, table)).toBe(
      `# R\n${table}\n## Repository Verdict\n`
    )
  })

  test('Should put the table before the verdict heading with a blank line between', () => {
    expect(summaryWithTable('# R\n## Repository Verdict\n', table)).toBe(
      `# R\n${table}\n\n## Repository Verdict\n`
    )
  })

  test('Should give null for a summary with nowhere to put the table', () => {
    expect(summaryWithTable('# R\nNothing\n', table)).toBeNull()
  })
})

describe('#textOf', () => {
  test('Should show a string as it is and anything else as JSON', () => {
    expect([textOf('a'), textOf(3), textOf(null), textOf(undefined)]).toEqual([
      'a',
      '3',
      'null',
      'null'
    ])
  })
})
