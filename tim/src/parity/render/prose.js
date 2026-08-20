import { sentences } from '../sentences.js'

/**
 * HTML-escape a value for text or attribute context.
 *
 * @param {unknown} value
 * @returns {string}
 */
export const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const MARKER = /\[\[(c\d+)\]\]/g
const BACKTICKED = /`([^`]+)`/g
const QUOTED = /(&quot;)([^&]{1,200}?)(&quot;)/g
const BARE_REFERENCE =
  /\b([A-Za-z0-9_@.\-/]*[A-Za-z0-9_-]\.[A-Za-z0-9]{1,6}):(\d+(?:-\d+)?)/g

/**
 * Render one paragraph of finding prose.
 *
 * Three things happen and nothing else: a [[cN]] marker becomes a superscript
 * link into that column's sources strip, a backticked identifier becomes code,
 * and a quoted UI string is marked up so the 26 copy-change findings read as
 * being about a specific string. The words themselves are never touched.
 *
 * @param {object} args
 * @param {string} args.text - Escaped-safe raw text (escaping happens here)
 * @param {Map<string, object>} args.citations - ref to resolved citation
 * @param {string} args.idPrefix - Card id, so marker anchors stay unique
 * @returns {string}
 */
export const renderParagraph = ({ text, citations, idPrefix }) => {
  let html = esc(text)

  html = html.replace(
    BACKTICKED,
    (_, identifier) => `<code>${identifier}</code>`
  )
  html = html.replace(
    QUOTED,
    (_, open, body, close) =>
      `${open}<span class="quoted">${body}</span>${close}`
  )

  // Anything the tokeniser never turned into a marker still reads as a
  // reference to the person looking at it, so it keeps the code treatment the
  // old page gave it — inert, but no longer pretending to be prose.
  //
  // This runs BEFORE the markers, not after: a marker expands to an anchor
  // whose title attribute holds the reference verbatim, and a later pass would
  // find `stub.js:109` inside that attribute and wrap it in a <code> tag,
  // spilling `">` into the visible text.
  html = html.replace(
    BARE_REFERENCE,
    (match) => `<code class="ref">${match}</code>`
  )

  html = html.replace(MARKER, (_, ref) => {
    const citation = citations.get(ref)
    const n = ref.slice(1)
    const label = citation?.asWritten ?? ref
    const dead = citation?.state === 'dead'
    const unresolved = citation?.state === 'unresolved'
    const classes = [
      'cite',
      dead ? 'cite--dead' : '',
      unresolved ? 'cite--unresolved' : ''
    ]
      .filter(Boolean)
      .join(' ')
    return `<a class="${classes}" href="#${esc(idPrefix)}-src-${esc(ref)}" title="${esc(label)}"><sup>${esc(n)}</sup></a>`
  })

  return html
}

// Where one sentence ends and the next begins, marked in the text rather than
// in the markup so the paragraph still reaches renderParagraph whole: a
// quotation or a backticked expression that runs across a sentence boundary
// still matches as one span. A unit separator cannot occur in the prose, which
// keeps it distinct from the author's own newlines — those are not sentence
// boundaries and stay plain <br> line breaks.
const SENTENCE_MARK = '\u001f'

const markSentences = (paragraph) =>
  sentences(paragraph)
    .map((sentence) => sentence.text.trim())
    .filter(Boolean)
    .join(SENTENCE_MARK)

const TAG = /<(\/?)([a-z]+)([^>]*)>/g

// Cut the rendered paragraph into one block per sentence. A boundary can fall
// inside a quotation that spans two sentences, so any element still open at
// the cut is closed and reopened across it — otherwise the sentence blocks and
// the quote span interleave, and the quote loses its markup on one side.
const asSentenceBlocks = (html) => {
  const open = []
  return html
    .split(SENTENCE_MARK)
    .map((segment) => {
      const reopened = open.map((element) => element.tag).join('')
      for (const [, closing, name, attributes] of segment.matchAll(TAG)) {
        if (closing) open.pop()
        else open.push({ name, tag: `<${name}${attributes}>` })
      }
      const closers = [...open]
        .reverse()
        .map((element) => `</${element.name}>`)
        .join('')
      return `<span class="sentence">${reopened}${segment}${closers}</span>`
    })
    .join('')
}

/**
 * Render a block of prose as the paragraphs its author wrote, one sentence to
 * a block.
 *
 * The page this replaces wrapped the whole finding in one <p>, so 2 to 6
 * paragraphs collapsed into a wall of text. The median finding is 1,274
 * characters; the longest is 3,345. Paragraphs alone still leave five or six
 * sentences of close reading in a solid block, so each sentence becomes its own
 * block with a little air above it — enough to separate them, less than the gap
 * that says a new paragraph has started.
 *
 * @param {object} args
 * @param {string} args.text
 * @param {Map<string, object>} args.citations
 * @param {string} args.idPrefix
 * @returns {string}
 */
export const renderProse = ({ text, citations, idPrefix }) =>
  String(text ?? '')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(markSentences)
    .map((part) => renderParagraph({ text: part, citations, idPrefix }))
    .map((html) => `<p>${asSentenceBlocks(html).replace(/\n/g, '<br>')}</p>`)
    .join('\n')

/**
 * Which citation markers appear in a block, in reading order. Drives the
 * per-column sources strip, so a claim is checked without leaving the
 * paragraph.
 *
 * @param {string} text
 * @returns {string[]}
 */
export const markersIn = (text) => {
  const refs = []
  for (const match of String(text ?? '').matchAll(MARKER)) {
    if (!refs.includes(match[1])) refs.push(match[1])
  }
  return refs
}

/**
 * Word count, used for the plain-English budgets.
 *
 * @param {string} text
 * @returns {number}
 */
export const wordCount = (text) =>
  String(text ?? '')
    .replace(MARKER, '')
    .split(/\s+/)
    .filter(Boolean).length
