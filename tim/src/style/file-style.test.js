import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { addFileStyleTodo, setFileStyleVerdict } from './file-style.js'
import { localStyleId } from './__fixtures__/style-tools.js'
import { withStagedStyle } from './__fixtures__/style-tools-runs.js'

const readme = { repo: 'trade-imports-stub', file: 'README.md' }

describe('#setFileStyleVerdict', () => {
  test('Should stamp reviewed_at to the second in UTC', async () => {
    const { review } = await withStagedStyle(({ root }) =>
      setFileStyleVerdict({
        workspaceRoot: root,
        reviewId: localStyleId,
        ...readme,
        verdict: 'COMPLIANT',
        now: () => new Date('2026-11-14T08:09:10.123Z')
      })
    )

    expect(review).toMatchObject({
      verdict: 'COMPLIANT',
      verdict_reason: '',
      reviewed_at: '2026-11-14T08:09:10Z'
    })
  })
})

describe('#addFileStyleTodo', () => {
  test('Should store the line as text and an empty line when none is given', async () => {
    const todos = await withStagedStyle(({ root }) => {
      const { path } = addFileStyleTodo({
        workspaceRoot: root,
        reviewId: localStyleId,
        ...readme,
        rule: '6',
        category: 'naming',
        severity: 'WARN',
        issue: 'x',
        fix: 'y'
      })
      return JSON.parse(readFileSync(path, 'utf8')).todos
    })

    expect(todos).toEqual([
      {
        id: 1,
        line: '',
        rule: '6',
        category: 'naming',
        severity: 'WARN',
        issue: 'x',
        fix: 'y'
      }
    ])
  })
})
