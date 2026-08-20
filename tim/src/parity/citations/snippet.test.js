import { describe, test, expect } from 'vitest'
import { sliceSnippet, citedText, rangesOf } from './snippet.js'
import { permalink } from './github-url.js'

const lines = Array.from({ length: 60 }, (_, i) => `line ${i + 1}`)
const longFile = Array.from({ length: 400 }, (_, i) => `line ${i + 1}`)

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

  test('still shows a forty-line range in full', () => {
    const snippet = sliceSnippet({ lines, range: { start: 1, end: 40 } })

    expect(snippet.state).toBe('collapsed')
    expect(snippet.truncated).toBe(false)
    expect(snippet.lines.filter((line) => line.focus)).toHaveLength(40)
  })

  test('shortens a range far past the limit and says how much it dropped', () => {
    const snippet = sliceSnippet({
      lines: longFile,
      range: { start: 10, end: 300 }
    })

    expect(snippet.truncated).toBe(true)
    expect(snippet.span).toBe(291)
    expect(snippet.lines.map((line) => line.text)).toContain(
      '… 250 lines not shown …'
    )
  })

  test('shows every range a citation names, not only the first', () => {
    const snippet = sliceSnippet({
      lines,
      ranges: [
        { start: 10, end: 11 },
        { start: 40, end: 41 }
      ]
    })

    expect(
      snippet.lines.filter((line) => line.focus).map((line) => line.n)
    ).toEqual([10, 11, 40, 41])
  })

  test('marks the lines between two ranges as a gap', () => {
    const snippet = sliceSnippet({
      lines,
      ranges: [
        { start: 10, end: 11 },
        { start: 40, end: 41 }
      ]
    })

    expect(snippet.lines.filter((line) => line.gap)).toHaveLength(1)
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

describe('rangesOf', () => {
  test('reads every range a multi-range citation carries', () => {
    expect(
      rangesOf({
        lines: null,
        ranges: [
          { start: 27, end: 27 },
          { start: 54, end: 54 },
          { start: 68, end: 68 }
        ]
      })
    ).toHaveLength(3)
  })

  test('falls back to the single range', () => {
    expect(rangesOf({ lines: { start: 4, end: 6 } })).toEqual([
      { start: 4, end: 6 }
    ])
  })

  test('reads nothing from a citation with no lines', () => {
    expect(rangesOf({})).toEqual([])
  })
})

describe('citedText', () => {
  test('joins every cited range and leaves the context out', () => {
    expect(
      citedText(lines, [
        { start: 2, end: 3 },
        { start: 10, end: 10 }
      ])
    ).toBe('line 2\nline 3\nline 10')
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
