import { describe, expect, test } from 'vitest'
import { aggregateFileStyles } from './aggregate.js'
import { styleId } from './__fixtures__/style-tools.js'
import { withStagedStyle } from './__fixtures__/style-tools-runs.js'

describe('#aggregateFileStyles', () => {
  test("Should count each file's FAIL and WARN findings", async () => {
    const { rollup } = await withStagedStyle(({ root }) =>
      aggregateFileStyles({
        workspaceRoot: root,
        reviewId: styleId,
        repo: 'trade-imports-animals-frontend',
        json: true
      })
    )

    expect(
      rollup.map(({ file, verdict, fail, warn }) => [file, verdict, fail, warn])
    ).toEqual([
      ['src/server/app/index.js', 'NEEDS_WORK', 1, 1],
      ['src/server/app/views.njk', 'SOMETHING_ELSE', 0, 0]
    ])
  })

  test('Should show a verdict it does not know as — in the file summary', async () => {
    const { markdown } = await withStagedStyle(({ root }) =>
      aggregateFileStyles({
        workspaceRoot: root,
        reviewId: styleId,
        repo: 'trade-imports-animals-frontend',
        section: 'file-summary'
      })
    )

    expect(markdown.split('\n').slice(2)).toEqual([
      '| File | Verdict | FAIL | WARN |',
      '|------|---------|------|------|',
      '| `src/server/app/index.js` | NEEDS WORK | 1 | 1 |',
      '| `src/server/app/views.njk` | — | 0 | 0 |'
    ])
  })
})
