import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stageBashWorkspace } from '../test-support/bash-golden-harness.js'
import {
  emptyReviewId,
  fileNotFolderReviewId,
  fixtureReviewFiles,
  fixtureReviewId,
  itemlessReviewId,
  repoKeylessReviewId
} from './__fixtures__/review-workarea.js'
import { reviewDir } from './paths.js'
import {
  readReviewItems,
  reviewItemsJsonText,
  writeJsonAtomic,
  writeTextAtomic
} from './store.js'

const here = dirname(fileURLToPath(import.meta.url))

const reviewItemsGoldens = JSON.parse(
  readFileSync(
    join(here, '__fixtures__', '__golden__', 'review-items.json'),
    'utf8'
  )
)

const goldenFor = (args) =>
  reviewItemsGoldens.find(
    ({ input }) => JSON.stringify(input) === JSON.stringify(args)
  )

const bashPrinted = ({ stdout }) => (stdout === '' ? '' : `${stdout}\n`)

let staged

beforeEach(() => {
  staged = stageBashWorkspace({ scripts: [], files: fixtureReviewFiles })
})

afterEach(() => staged.remove())

describe('#readReviewItems', () => {
  test('Should print every item of the review as review-items.sh --json does', () => {
    const golden = goldenFor([fixtureReviewId, '--json'])

    const items = readReviewItems(reviewDir(staged.root, fixtureReviewId))

    expect(reviewItemsJsonText(items)).toBe(bashPrinted(golden))
  })

  test("Should print one repo's items as review-items.sh --repo --json does", () => {
    const golden = goldenFor([
      fixtureReviewId,
      '--repo',
      'trade-imports-stub',
      '--json'
    ])

    const items = readReviewItems(reviewDir(staged.root, fixtureReviewId), {
      repo: 'trade-imports-stub'
    })

    expect(reviewItemsJsonText(items)).toBe(bashPrinted(golden))
  })

  test('Should print nothing for a repo with no items file, as review-items.sh --repo --json does', () => {
    const golden = goldenFor([
      fixtureReviewId,
      '--repo',
      'trade-imports-schemas',
      '--json'
    ])

    const items = readReviewItems(reviewDir(staged.root, fixtureReviewId), {
      repo: 'trade-imports-schemas'
    })

    expect(reviewItemsJsonText(items)).toBe(bashPrinted(golden))
  })

  test('Should print nothing for a review with no items files, as review-items.sh --json does', () => {
    const golden = goldenFor([emptyReviewId, '--json'])

    const items = readReviewItems(reviewDir(staged.root, emptyReviewId))

    expect(reviewItemsJsonText(items)).toBe(bashPrinted(golden))
  })

  test('Should print [] for items files that hold no items, as review-items.sh --json does', () => {
    const golden = goldenFor([itemlessReviewId, '--json'])

    const items = readReviewItems(reviewDir(staged.root, itemlessReviewId))

    expect(reviewItemsJsonText(items)).toBe(bashPrinted(golden))
  })

  test('Should print a null repo for an items file with no repo, as review-items.sh --json does', () => {
    const golden = goldenFor([repoKeylessReviewId, '--json'])

    const items = readReviewItems(reviewDir(staged.root, repoKeylessReviewId))

    expect(reviewItemsJsonText(items)).toBe(bashPrinted(golden))
  })

  test.each([['local/no-such-review'], [fileNotFolderReviewId]])(
    'Should refuse %s with the words review-items.sh prints',
    (reviewId) => {
      const golden = goldenFor([reviewId, '--json'])

      const readRefusedReview = () =>
        readReviewItems(reviewDir(staged.root, reviewId))

      expect(readRefusedReview).toThrow(
        expect.objectContaining({
          code: 'NOT_FOUND',
          message: golden.stderr.replace('<HOME>', staged.home)
        })
      )
    }
  )
})

describe('#writeJsonAtomic', () => {
  test('Should write JSON the way jq prints it into a folder it creates, leaving no temp file', () => {
    const path = join(
      staged.root,
      'workareas',
      'reviews',
      'T-1',
      'file-reviews',
      'r',
      'a_b.js.review.json'
    )

    writeJsonAtomic(path, { file: 'a/b.js', todos: [], verdict: null })

    expect(readFileSync(path, 'utf8')).toBe(
      '{\n  "file": "a/b.js",\n  "todos": [],\n  "verdict": null\n}\n'
    )
    expect(readdirSync(dirname(path))).toEqual(['a_b.js.review.json'])
  })
})

describe('#writeTextAtomic', () => {
  test('Should write the text as given into a folder it creates, leaving no temp file', () => {
    const path = join(staged.root, 'workareas', 'notes', 'n', 'bundle.md')

    writeTextAtomic(path, '# Bundle\n\nNo trailing newline')

    expect(readFileSync(path, 'utf8')).toBe('# Bundle\n\nNo trailing newline')
    expect(readdirSync(dirname(path))).toEqual(['bundle.md'])
  })
})
