import { describe, expect, test } from 'vitest'
import {
  groupItemsByFile,
  renderListedStyleText,
  renderStyleMarkedText
} from './items-ledger.js'

describe('#groupItemsByFile', () => {
  test('Should group by repo then file in code-point order, keeping each group in the order given', () => {
    const groups = groupItemsByFile([
      { id: 1, repo: 'b', file: 'z.js' },
      { id: 2, repo: 'a', file: 'b.js' },
      { id: 3, repo: 'a', file: 'B.js' },
      { id: 4, repo: 'b', file: 'z.js' }
    ])

    expect(
      groups.map(({ repo, file, items }) => [
        repo,
        file,
        items.map(({ id }) => id)
      ])
    ).toEqual([
      ['a', 'B.js', [3]],
      ['a', 'b.js', [2]],
      ['b', 'z.js', [1, 4]]
    ])
  })
})

describe('#renderListedStyleText', () => {
  test('Should print nothing when no items file matched', () => {
    expect(
      renderListedStyleText({ items: [], byFile: true, foundItemsFiles: false })
    ).toBeNull()
  })

  test('Should print an empty group list by file when items files matched but no item did', () => {
    expect(
      renderListedStyleText({ items: [], byFile: true, foundItemsFiles: true })
    ).toBe('[]')
  })

  test('Should print the rule column after the line', () => {
    expect(
      renderListedStyleText({
        items: [{ repo: 'r', id: 1, file: 'a.js', line: '4', rule: '6' }],
        byFile: false,
        foundItemsFiles: true
      })
    ).toBe('r\t1\ta.js\t4\t6\t\t\t\t\t\t')
  })
})

describe('#renderStyleMarkedText', () => {
  test('Should end at the status when no note was given', () => {
    expect(
      renderStyleMarkedText({
        repo: 'r',
        item: { id: 2, disposition: null, status: null },
        noteGiven: false
      })
    ).toBe('Marked #2 in r: Disposition=<null>, Status=<null>')
  })
})
