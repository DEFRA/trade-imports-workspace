import { describe, expect, test } from 'vitest'
import { buildStyleScope, renderStyleScopeText } from './scope.js'

const ignore = () => {}

describe('#buildStyleScope', () => {
  test('Should refuse with a usage line when no review id is given', async () => {
    await expect(
      buildStyleScope({ workspaceRoot: '/ws', log: ignore })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        'Usage: tim style scope <review-id> [--repo REPO] [--no-pull] [--write-snapshot] [--json]'
    })
  })

  test('Should name the style meta it cannot find', async () => {
    await expect(
      buildStyleScope({
        workspaceRoot: '/ws-none',
        reviewId: 'EUDPA-1',
        log: ignore
      })
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message:
        'Style meta not found: /ws-none/workareas/code-style-reviews/EUDPA-1/.style-meta.json'
    })
  })
})

describe('#renderStyleScopeText', () => {
  test('Should print the totals, then each repo with its short window', () => {
    const lists = { A: [{}], B: [], C: [{}, {}], D: [] }

    const text = renderStyleScopeText({
      ticket: 'EUDPA-1',
      generated: '2026-11-14T08:00:00Z',
      totals: { list_a: 1, list_b: 0, list_c: 2, list_d: 0 },
      repos: [
        {
          repo: 'trade-imports-stub',
          lists,
          prior_sha: 'aaaaaaaaaa',
          current_sha: 'bbbbbbbbbb'
        }
      ]
    })

    expect(text).toBe(
      'Style refresh scope for EUDPA-1 (generated 2026-11-14T08:00:00Z)\n  Totals:  A=1 (changed source)  B=0 (open inline)  C=2 (merge)  D=0 (gaps)\n\n  trade-imports-stub: A=1  B=0  C=2  D=0  prior=aaaaaaa..current=bbbbbbb'
    )
  })
})
