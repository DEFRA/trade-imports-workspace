import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  addReviewItem,
  countReviewItems,
  existingLedgerFolder,
  listReviewItems,
  markReviewItem,
  renderCountsText,
  renderItemsTsv,
  renderMarkedText,
  renderStatusText,
  setReviewItemStatus
} from './items-ledger.js'

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

describe('review items ledger on disk', () => {
  let workspaceRoot
  const reviewId = 'EUDPA-1'
  const repo = 'trade-imports-stub'

  const itemsPath = () =>
    join(workspaceRoot, 'workareas', 'reviews', reviewId, `items.${repo}.json`)

  const readItems = () => JSON.parse(readFileSync(itemsPath(), 'utf8')).items

  const finding = {
    repo,
    file: 'src/a.js',
    line: '7',
    severity: 'Major',
    category: 'correctness',
    issue: 'Off by one',
    fix: 'Count from zero'
  }

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'tim-items-ledger-'))
    mkdirSync(join(workspaceRoot, 'workareas', 'reviews', reviewId), {
      recursive: true
    })
  })

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true })
  })

  describe('#addReviewItem', () => {
    test('Should start the items file and number the first item 1', () => {
      const added = addReviewItem({ workspaceRoot, reviewId, ...finding })

      expect(added.id).toBe(1)
      expect(JSON.parse(readFileSync(itemsPath(), 'utf8'))).toEqual({
        ticket: reviewId,
        repo,
        items: [
          {
            id: 1,
            file: 'src/a.js',
            line: '7',
            severity: 'Major',
            category: 'correctness',
            issue: 'Off by one',
            fix: 'Count from zero',
            disposition: null,
            status: null,
            notes: null
          }
        ]
      })
    })

    test('Should number a later item after the highest id and keep a best practice', () => {
      addReviewItem({ workspaceRoot, reviewId, ...finding })

      const added = addReviewItem({
        workspaceRoot,
        reviewId,
        ...finding,
        bestPractice: 'docs/best-practices/node/code-style.md'
      })

      expect(added.id).toBe(2)
      expect(readItems()[1].best_practice).toBe(
        'docs/best-practices/node/code-style.md'
      )
    })

    test('Should refuse a missing review id with the usage line', () => {
      expect(() => addReviewItem({ workspaceRoot, ...finding })).toThrow(
        /^Usage: tim review items add <review-id>/
      )
    })

    test('Should refuse the first missing option by name', () => {
      expect(() =>
        addReviewItem({ workspaceRoot, reviewId, ...finding, line: '' })
      ).toThrow('--line required')
    })

    test('Should refuse a severity outside Critical, Major and Minor', () => {
      expect(() =>
        addReviewItem({ workspaceRoot, reviewId, ...finding, severity: 'Low' })
      ).toThrow('Invalid --severity: Low (must be Critical|Major|Minor)')
    })

    test('Should refuse an unknown category', () => {
      expect(() =>
        addReviewItem({
          workspaceRoot,
          reviewId,
          ...finding,
          category: 'vibes'
        })
      ).toThrow(/--category must be one of: .* Got "vibes"\./)
    })

    test('Should refuse a review that has no folder', () => {
      expect(() =>
        addReviewItem({ workspaceRoot, reviewId: 'EUDPA-2', ...finding })
      ).toThrow(/^Review workspace not found: .*EUDPA-2$/)
    })
  })

  describe('#listReviewItems', () => {
    beforeEach(() => {
      addReviewItem({ workspaceRoot, reviewId, ...finding })
      addReviewItem({ workspaceRoot, reviewId, ...finding, file: 'src/b.js' })
      markReviewItem({
        workspaceRoot,
        reviewId,
        repo,
        item: '2',
        disposition: 'Fix'
      })
    })

    test('Should list every item with its repo when no filter is given', () => {
      const items = listReviewItems({ workspaceRoot, reviewId })

      expect(items.map(({ repo: itemRepo, id }) => [itemRepo, id])).toEqual([
        [repo, 1],
        [repo, 2]
      ])
    })

    test('Should keep only the pending items for the pending filter', () => {
      const items = listReviewItems({
        workspaceRoot,
        reviewId,
        filter: 'pending'
      })

      expect(items.map(({ id }) => id)).toEqual([1])
    })

    test('Should keep only the not-done items of one file', () => {
      const items = listReviewItems({
        workspaceRoot,
        reviewId,
        status: 'not-done',
        file: 'src/b.js'
      })

      expect(items.map(({ id }) => id)).toEqual([2])
    })

    test('Should refuse an unknown filter', () => {
      expect(() =>
        listReviewItems({ workspaceRoot, reviewId, filter: 'later' })
      ).toThrow('Invalid --filter: later')
    })

    test('Should list nothing for a review with no items file', () => {
      mkdirSync(join(workspaceRoot, 'workareas', 'reviews', 'EUDPA-3'))

      expect(listReviewItems({ workspaceRoot, reviewId: 'EUDPA-3' })).toEqual(
        []
      )
    })

    test('Should refuse a missing review id', () => {
      expect(() => listReviewItems({ workspaceRoot })).toThrow(
        /^Usage: tim review items list/
      )
    })
  })

  describe('#countReviewItems', () => {
    test('Should count pending and fixed items, sorted by disposition then status', () => {
      addReviewItem({ workspaceRoot, reviewId, ...finding })
      addReviewItem({ workspaceRoot, reviewId, ...finding })
      addReviewItem({ workspaceRoot, reviewId, ...finding })
      markReviewItem({
        workspaceRoot,
        reviewId,
        repo,
        item: '3',
        disposition: 'Fix'
      })

      expect(countReviewItems({ workspaceRoot, reviewId, repo })).toEqual({
        reviewId,
        repo,
        breakdown: [
          { disposition: 'Fix', status: 'Not Done', count: 1 },
          { disposition: 'Pending', status: '', count: 2 }
        ],
        total: 3
      })
    })

    test('Should count nothing and leave out the repo when none is given and there are no items', () => {
      expect(countReviewItems({ workspaceRoot, reviewId })).toEqual({
        reviewId,
        breakdown: [],
        total: 0
      })
    })

    test('Should refuse a missing review id', () => {
      expect(() => countReviewItems({ workspaceRoot })).toThrow(
        /^Usage: tim review items counts/
      )
    })
  })

  describe('#markReviewItem', () => {
    beforeEach(() => {
      addReviewItem({ workspaceRoot, reviewId, ...finding })
    })

    test("Should set Won't Fix with a — status and replace the notes", () => {
      const marked = markReviewItem({
        workspaceRoot,
        reviewId,
        repo,
        item: '1',
        disposition: "Won't Fix",
        note: 'Out of scope'
      })

      expect(renderMarkedText(marked)).toBe(
        "Marked #1 in trade-imports-stub: Disposition=Won't Fix, Status=—, Notes set"
      )
      expect(readItems()[0].notes).toBe('Out of scope')
    })

    test('Should clear the disposition, status and notes with empty values', () => {
      markReviewItem({
        workspaceRoot,
        reviewId,
        repo,
        item: '1',
        disposition: 'Fix',
        note: 'Soon'
      })

      const marked = markReviewItem({
        workspaceRoot,
        reviewId,
        repo,
        item: '1',
        note: ''
      })

      expect(renderMarkedText(marked)).toBe(
        'Marked #1 in trade-imports-stub: Disposition=<null>, Status=<null>, Notes set'
      )
      expect(readItems()[0].notes).toBeNull()
    })

    test('Should keep Merged with a note naming the owner item', () => {
      const marked = markReviewItem({
        workspaceRoot,
        reviewId,
        repo,
        item: '1',
        disposition: 'Merged',
        note: 'merged into #4'
      })

      expect(marked.item.disposition).toBe('Merged')
    })

    test('Should refuse Merged without a note naming the owner item', () => {
      expect(() =>
        markReviewItem({
          workspaceRoot,
          reviewId,
          repo,
          item: '1',
          disposition: 'Merged',
          note: 'same as the other one'
        })
      ).toThrow('Merged needs --note "merged into #N", naming the owner item.')
    })

    test('Should refuse an unknown disposition', () => {
      expect(() =>
        markReviewItem({
          workspaceRoot,
          reviewId,
          repo,
          item: '1',
          disposition: 'Maybe'
        })
      ).toThrow('Invalid --disposition: Maybe')
    })

    test('Should refuse an item id that is not a number', () => {
      expect(() =>
        markReviewItem({
          workspaceRoot,
          reviewId,
          repo,
          item: 'one',
          disposition: 'Fix'
        })
      ).toThrow('Invalid --item: one (must be a number)')
    })

    test('Should refuse an item the file does not hold', () => {
      expect(() =>
        markReviewItem({
          workspaceRoot,
          reviewId,
          repo,
          item: '9',
          disposition: 'Fix'
        })
      ).toThrow(/^Item #9 not found in .*items\.trade-imports-stub\.json$/)
    })

    test('Should refuse a repo with no items file', () => {
      expect(() =>
        markReviewItem({
          workspaceRoot,
          reviewId,
          repo: 'trade-imports-schemas',
          item: '1',
          disposition: 'Fix'
        })
      ).toThrow(/^Items file not found: .*items\.trade-imports-schemas\.json$/)
    })

    test('Should refuse a missing item', () => {
      expect(() =>
        markReviewItem({ workspaceRoot, reviewId, repo, disposition: 'Fix' })
      ).toThrow('--item required')
    })

    test('Should refuse a missing review id', () => {
      expect(() => markReviewItem({ workspaceRoot })).toThrow(
        /^Usage: tim review items mark/
      )
    })
  })

  describe('#setReviewItemStatus', () => {
    beforeEach(() => {
      addReviewItem({ workspaceRoot, reviewId, ...finding })
    })

    const setStatus = (status, note) =>
      setReviewItemStatus({
        workspaceRoot,
        reviewId,
        repo,
        item: '1',
        status,
        note
      })

    test('Should set the status and start the notes with the note', () => {
      const updated = setStatus('Done', 'Fixed in abc123')

      expect(renderStatusText(updated)).toBe(
        'Updated #1 in trade-imports-stub: Status=Done, Note added'
      )
      expect(readItems()[0].notes).toBe('Fixed in abc123')
    })

    test('Should add a new note after the notes there, once', () => {
      setStatus('Failed', 'Tests red')
      setStatus('Failed', 'Lint red')
      setStatus('Failed', 'Tests red')

      expect(readItems()[0].notes).toBe('Tests red; Lint red')
    })

    test('Should leave the notes alone and say nothing of a note when the note is empty', () => {
      setStatus('Done', 'Fixed')

      const updated = setStatus('Done', '')

      expect(renderStatusText(updated)).toBe(
        'Updated #1 in trade-imports-stub: Status=Done'
      )
      expect(readItems()[0].notes).toBe('Fixed')
    })

    test('Should clear the status with an empty value and keep absent notes as null', () => {
      const updated = setStatus('')

      expect(updated.item).toMatchObject({ status: null, notes: null })
    })

    test('Should refuse an unknown status', () => {
      expect(() => setStatus('Later')).toThrow('Invalid --status: Later')
    })

    test('Should refuse a missing review id', () => {
      expect(() => setReviewItemStatus({ workspaceRoot })).toThrow(
        /^Usage: tim review items status/
      )
    })
  })
})

describe('#existingLedgerFolder', () => {
  test('Should refuse a path that is a file, not a folder', () => {
    const folder = mkdtempSync(join(tmpdir(), 'tim-items-ledger-file-'))
    const file = join(folder, 'items.json')
    writeFileSync(file, '{}')

    try {
      expect(() => existingLedgerFolder(file, 'Style workspace')).toThrow(
        `Style workspace not found: ${file}`
      )
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })
})
