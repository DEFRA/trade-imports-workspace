import { describe, expect, test } from 'vitest'
import { fileHunksOf, readFileDiff, renderFileDiffText } from './file-diff.js'

describe('#fileHunksOf', () => {
  test('Should end the last line with a newline when the diff has none', () => {
    const diff = 'diff --git a/x.js b/x.js\n+x'

    expect(fileHunksOf(diff, 'x.js')).toBe('diff --git a/x.js b/x.js\n+x\n')
  })

  test('Should match a spaced path by its exact characters, not as a pattern', () => {
    const diff = [
      'diff --git a/my notesXmd b/my notesXmd',
      '+wrong',
      'diff --git a/my notes.md b/my notes.md',
      '+right',
      ''
    ].join('\n')

    expect(fileHunksOf(diff, 'my notes.md')).toBe(
      'diff --git a/my notes.md b/my notes.md\n+right\n'
    )
  })

  test('Should give nothing before the first header', () => {
    expect(fileHunksOf('preamble x.js\n', 'x.js')).toBe('')
  })
})

describe('#readFileDiff', () => {
  test('Should filter the diff read from stdin and name stdin as its source', async () => {
    const result = await readFileDiff({
      workspaceRoot: '/no/such/workspace',
      file: 'x.js',
      readStdin: async () => 'diff --git a/x.js b/x.js\n+x\n'
    })

    expect(result).toEqual({
      repo: null,
      file: 'x.js',
      source: 'stdin',
      diff: 'diff --git a/x.js b/x.js\n+x\n'
    })
  })
})

describe('#renderFileDiffText', () => {
  test('Should print nothing for a file not in the diff', () => {
    expect(renderFileDiffText({ diff: '' })).toBeNull()
  })
})
