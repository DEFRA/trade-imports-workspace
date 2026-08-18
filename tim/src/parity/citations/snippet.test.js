import { describe, test, expect } from 'vitest'
import { sliceSnippet, checkAnchors } from './snippet.js'
import { permalink } from './github-url.js'

const lines = Array.from({ length: 60 }, (_, i) => `line ${i + 1}`)

describe('sliceSnippet', () => {
  test('renders a short range inline with two context lines either side', () => {
    const snippet = sliceSnippet({ lines, range: { start: 10, end: 12 } })
    expect(snippet.state).toBe('inline')
    expect(snippet.lines[0].n).toBe(8)
    expect(snippet.lines.at(-1).n).toBe(14)
  })

  test('marks only the cited lines as focus', () => {
    const snippet = sliceSnippet({ lines, range: { start: 10, end: 12 } })
    expect(snippet.lines.filter((l) => l.focus).map((l) => l.n)).toEqual([
      10, 11, 12
    ])
  })

  test('collapses a range over six lines', () => {
    expect(sliceSnippet({ lines, range: { start: 10, end: 20 } }).state).toBe(
      'collapsed'
    )
  })

  test('stores no snippet at all beyond twenty lines', () => {
    const snippet = sliceSnippet({ lines, range: { start: 1, end: 40 } })
    expect(snippet.state).toBe('too-long')
    expect(snippet.lines).toEqual([])
  })

  test('does not run off the start or the end of the file', () => {
    expect(
      sliceSnippet({ lines, range: { start: 1, end: 1 } }).lines[0].n
    ).toBe(1)
    expect(
      sliceSnippet({ lines, range: { start: 60, end: 60 } }).lines.at(-1).n
    ).toBe(60)
  })
})

describe('checkAnchors', () => {
  const snippet = sliceSnippet({
    lines: ['const MAX_FILE_SIZE_MB = 20', 'export { MAX_FILE_SIZE_MB }'],
    range: { start: 1, end: 2 }
  })

  test('passes when every anchor appears in the snippet', () => {
    expect(
      checkAnchors({ anchors: ['MAX_FILE_SIZE_MB'], lines: snippet.lines })
    ).toEqual({ ok: true, missing: [] })
  })

  test('names the anchors that are absent', () => {
    expect(
      checkAnchors({
        anchors: ['MAX_FILE_SIZE_MB', 'integerInRange'],
        lines: snippet.lines
      })
    ).toEqual({ ok: false, missing: ['integerInRange'] })
  })

  test('passes trivially when the prose named no anchors', () => {
    expect(checkAnchors({ anchors: undefined, lines: snippet.lines }).ok).toBe(
      true
    )
  })
})

describe('permalink', () => {
  const repo = { owner: 'DEFRA', repo: 'the-frontend' }
  const sha = 'a'.repeat(40)

  test('uses the full sha so the link survives', () => {
    expect(
      permalink({ repo, sha, path: 'src/a.js', lines: { start: 1, end: 1 } })
    ).toBe(`https://github.com/DEFRA/the-frontend/blob/${sha}/src/a.js#L1`)
  })

  test('renders a range as L start to L end', () => {
    expect(
      permalink({ repo, sha, path: 'src/a.js', lines: { start: 41, end: 53 } })
    ).toBe(`https://github.com/DEFRA/the-frontend/blob/${sha}/src/a.js#L41-L53`)
  })

  test('omits the fragment when there are no lines', () => {
    expect(permalink({ repo, sha, path: 'src/a.js', lines: null })).toBe(
      `https://github.com/DEFRA/the-frontend/blob/${sha}/src/a.js`
    )
  })
})
