import { describe, expect, test } from 'vitest'
import { renderStyleItemsTable } from './items-table.js'

describe('#renderStyleItemsTable', () => {
  test('Should escape pipes and newlines in the text cells and show a missing value as empty', () => {
    const table = renderStyleItemsTable([
      {
        id: 1,
        file: 'a.js',
        line: 7,
        rule: null,
        severity: 'WARN',
        issue: 'A | b\nc',
        fix: 'Fix it',
        disposition: null,
        status: null,
        notes: null
      }
    ])

    expect(table.split('\n')[2]).toBe(
      '| 1 | a.js | 7 |  |  | WARN | A \\| b c | Fix it |  |  |  |'
    )
  })
})
