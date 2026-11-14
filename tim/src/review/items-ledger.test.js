import { describe, expect, test } from 'vitest'
import { renderCountsText, renderItemsTsv } from './items-ledger.js'

describe('#renderItemsTsv', () => {
  test('Should escape tabs, newlines, carriage returns and backslashes, and print nothing for an absent value', () => {
    const tsv = renderItemsTsv([
      {
        repo: 'trade-imports-stub',
        id: 3,
        file: 'a.js',
        line: 7,
        severity: 'Minor',
        category: 'naming',
        issue: 'Tab\there\nand\r\\',
        fix: 'Fix it',
        disposition: null,
        notes: null
      }
    ])

    expect(tsv).toBe(
      'trade-imports-stub\t3\ta.js\t7\tMinor\tnaming\tTab\\there\\nand\\r\\\\\tFix it\t\t\t'
    )
  })

  test('Should print nothing when there are no items', () => {
    expect(renderItemsTsv([])).toBeNull()
  })
})

describe('#renderCountsText', () => {
  test('Should pad each disposition to 15 bytes and show a missing status as —', () => {
    const text = renderCountsText({
      reviewId: 'EUDPA-1',
      repo: 'trade-imports-stub',
      breakdown: [
        { disposition: 'Pending', status: '', count: 2 },
        { disposition: "Won't Fix", status: '—', count: 1 }
      ],
      total: 3
    })

    expect(text).toBe(
      [
        'Counts for EUDPA-1 (repo: trade-imports-stub):',
        '     2  Pending          —',
        "     1  Won't Fix        —",
        '  ----',
        '     3  TOTAL'
      ].join('\n')
    )
  })

  test('Should shift the status into the disposition column when the disposition is empty, as the Bash read does', () => {
    const text = renderCountsText({
      reviewId: 'EUDPA-1',
      breakdown: [{ disposition: '', status: '', count: 1 }],
      total: 1
    })

    expect(text.split('\n')[1]).toBe(`     1  —${' '.repeat(12)}  `)
  })
})
