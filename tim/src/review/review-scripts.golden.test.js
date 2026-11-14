import { afterAll, beforeAll, expect, test } from 'vitest'
import {
  goldenText,
  recordBashRun,
  stageBashWorkspace,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  emptyReviewId,
  fileNotFolderReviewId,
  fixtureReviewFiles,
  fixtureReviewId,
  itemlessReviewId,
  repoKeylessReviewId
} from './__fixtures__/review-workarea.js'

const REVIEW_ITEMS_SCRIPT = 'tools/review/review-items.sh'
const REVIEW_ADD_ITEM_SCRIPT = 'tools/review/review-add-item.sh'
const FINDING_CATEGORIES_SCRIPT = 'tools/review/finding-categories.sh'

let staged

beforeAll(() => {
  staged = stageBashWorkspace({
    scripts: [
      REVIEW_ITEMS_SCRIPT,
      REVIEW_ADD_ITEM_SCRIPT,
      FINDING_CATEGORIES_SCRIPT
    ].filter(workspaceScriptExists),
    files: fixtureReviewFiles
  })
})

afterAll(() => staged.remove())

test.skipIf(!workspaceScriptExists(REVIEW_ITEMS_SCRIPT))(
  'review-items.sh reads a review, one repo, a missing repo, an empty review, an items file with no items, a repo-keyless items file, a missing review and a file in place of one',
  async () => {
    const inputs = [
      [fixtureReviewId, '--json'],
      [fixtureReviewId, '--repo', 'trade-imports-stub', '--json'],
      [fixtureReviewId, '--repo', 'trade-imports-schemas', '--json'],
      [emptyReviewId, '--json'],
      [itemlessReviewId, '--json'],
      [repoKeylessReviewId, '--json'],
      ['local/no-such-review', '--json'],
      [fileNotFolderReviewId, '--json']
    ]
    const recordings = []
    for (const args of inputs) {
      recordings.push({
        input: args,
        ...(await recordBashRun(staged, REVIEW_ITEMS_SCRIPT, args))
      })
    }

    await expect(goldenText(recordings)).toMatchFileSnapshot(
      '__fixtures__/__golden__/review-items.json'
    )
  }
)

test.skipIf(!workspaceScriptExists(REVIEW_ADD_ITEM_SCRIPT))(
  'review-add-item.sh refuses a category outside the finding categories',
  async () => {
    const args = [
      fixtureReviewId,
      '--repo',
      'trade-imports-stub',
      '--file',
      'README.md',
      '--line',
      '1',
      '--severity',
      'Minor',
      '--category',
      'style',
      '--issue',
      'An issue',
      '--fix',
      'A fix'
    ]

    const recording = await recordBashRun(
      staged,
      REVIEW_ADD_ITEM_SCRIPT,
      args,
      { watch: `workareas/reviews/${fixtureReviewId}` }
    )

    await expect(
      goldenText([{ input: args, ...recording }])
    ).toMatchFileSnapshot('__fixtures__/__golden__/refused-category.json')
  }
)
