import { describe, test, expect } from 'vitest'
import {
  esc,
  renderParagraph,
  renderProse,
  markersIn,
  wordCount
} from './prose.js'

const citations = new Map([
  ['c1', { ref: 'c1', asWritten: 'layout.njk:41-53', state: 'resolved' }],
  ['c2', { ref: 'c2', asWritten: 'gone.js:3', state: 'dead' }]
])

const render = (text) =>
  renderParagraph({ text, citations, idPrefix: 'inc-001' })

describe('esc', () => {
  test('escapes the four characters that break markup', () => {
    expect(esc('<a href="x">&</a>')).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;'
    )
  })
})

describe('renderParagraph', () => {
  test('turns a marker into a superscript link into the sources strip', () => {
    expect(render('The layout [[c1]] renders it.')).toContain(
      'href="#inc-001-src-c1"'
    )
  })

  test('numbers the superscript from the ref', () => {
    expect(render('[[c1]]')).toContain('<sup>1</sup>')
  })

  test('flags a dead citation so the reader is not sent to a 404', () => {
    expect(render('[[c2]]')).toContain('cite--dead')
  })

  test('renders a backticked identifier as code', () => {
    expect(render('It calls `govukPhaseBanner` once.')).toContain(
      '<code>govukPhaseBanner</code>'
    )
  })

  test('marks up a quoted UI string without changing a character of it', () => {
    const html = render('The hint says "has as it\'s aim," today.')
    expect(html).toContain('<span class="quoted">has as it\'s aim,</span>')
  })

  test('leaves an unmarked file reference as inert code', () => {
    expect(render('See copy.en.js:6 for the hint.')).toContain(
      '<code class="ref">copy.en.js:6</code>'
    )
  })

  test('escapes markup in the source text', () => {
    expect(render('<script>alert(1)</script>')).not.toContain('<script>')
  })
})

describe('renderProse', () => {
  test('renders each authored paragraph as its own p', () => {
    const html = renderProse({
      text: 'First paragraph.\n\nSecond paragraph.',
      citations,
      idPrefix: 'inc-001'
    })
    expect(html.match(/<p>/g)).toHaveLength(2)
  })

  test('keeps a single newline as a line break inside one paragraph', () => {
    const html = renderProse({
      text: 'Line one.\nLine two.',
      citations,
      idPrefix: 'inc-001'
    })
    expect(html.match(/<p>/g)).toHaveLength(1)
    expect(html).toContain('<br>')
  })

  test('renders nothing for empty prose rather than an empty p', () => {
    expect(renderProse({ text: '   ', citations, idPrefix: 'x' })).toBe('')
  })

  test('breaks the line between two sentences of one paragraph', () => {
    const html = renderProse({
      text: 'The box is one field. The hint says nothing.',
      citations,
      idPrefix: 'inc-001'
    })
    expect(html).toBe('<p>The box is one field.<br>The hint says nothing.</p>')
  })

  test('does not break inside a sentence that names a dotted file path', () => {
    const html = renderProse({
      text: 'It lives in app/views/design-release-2.1/upload-documents.html and page-model.js reads it.',
      citations,
      idPrefix: 'inc-001'
    })
    expect(html).not.toContain('<br>')
  })

  test('keeps a citation marker at a sentence end on the link before the break', () => {
    const html = renderProse({
      text: 'The layout renders it (app/routes.js:8778) [[c1]]. The hub does not.',
      citations,
      idPrefix: 'inc-001'
    })
    expect(html).toContain(
      '<a class="cite" href="#inc-001-src-c1" title="layout.njk:41-53"><sup>1</sup></a>.<br>The hub does not.'
    )
  })

  test('leaves a quoted string that ends mid-sentence on one line', () => {
    const html = renderProse({
      text: 'The hint reads "This information can be found on the ITAHC." under the field.',
      citations,
      idPrefix: 'inc-001'
    })
    expect(html).not.toContain('<br>')
  })
})

describe('markersIn', () => {
  test('lists markers in reading order without repeats', () => {
    expect(markersIn('[[c2]] then [[c1]] then [[c2]]')).toEqual(['c2', 'c1'])
  })
})

describe('wordCount', () => {
  test('does not count citation markers as words', () => {
    expect(wordCount('The layout [[c1]] renders it.')).toBe(4)
  })
})
