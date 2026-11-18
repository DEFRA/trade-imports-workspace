import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { reconcileFileStyles } from './reconcile.js'
import { styleId } from './__fixtures__/style-tools.js'
import { withStagedStyle } from './__fixtures__/style-tools-runs.js'

const backend = 'trade-imports-animals-backend'

describe('#reconcileFileStyles', () => {
  test('Should add a finding with no rule as the rule text null, and with no category leave it out', async () => {
    const items = await withStagedStyle(({ root }) => {
      reconcileFileStyles({
        workspaceRoot: root,
        reviewId: styleId,
        repo: backend,
        now: () => new Date('2026-11-14T08:09:10Z')
      })
      return JSON.parse(
        readFileSync(
          join(
            root,
            'workareas',
            'code-style-reviews',
            styleId,
            `items.${backend}.json`
          ),
          'utf8'
        )
      ).items
    })

    expect(
      items.slice(-2).map(({ id, rule, category }) => ({ id, rule, category }))
    ).toEqual([
      { id: 9, rule: '9', category: undefined },
      { id: 10, rule: 'null', category: 'logging' }
    ])
  })
})
