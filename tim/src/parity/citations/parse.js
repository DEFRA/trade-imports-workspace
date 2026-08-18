// A citation in this corpus is a path followed by a line or a line range:
// `copy.en.js:6`, `layout.njk:41-53`, `routes.js:5410,5444`. 391 of the 516
// in-prose references are bare basenames, and 77 more are bare `:NN`
// continuations whose antecedent is the file named earlier in the sentence.
//
// The tokeniser's whole job is to find them and record where they sit. It
// resolves nothing: a regex that also decided which of the 21 files named
// copy.en.js a reference meant would produce confidently wrong links, which is
// worse than the inert <code> the current page renders.

const PATH_CHARS = '[A-Za-z0-9_@.\\-/]'
const LINE_SPEC = '\\d+(?:-\\d+)?(?:\\s*,\\s*\\d+(?:-\\d+)?)*'

const NAMED = new RegExp(
  `(${PATH_CHARS}*[A-Za-z0-9_\\-]\\.[A-Za-z0-9]{1,6}):(${LINE_SPEC})`,
  'g'
)

// A bare `:NN` that is not the tail of a named citation. Excludes a preceding
// path character so `a.js:5` is never also read as a continuation, and a
// preceding digit so `5410,5444` is not split.
const CONTINUATION = new RegExp(`(?<![A-Za-z0-9_@.\\-/]):(${LINE_SPEC})`, 'g')

/**
 * Parse one line spec into ranges. `5410-5428` is one range; `72, 85, 98` is
 * three. The report renders each range as its own permalink fragment.
 *
 * @param {string} spec
 * @returns {Array<{start: number, end: number}>}
 */
export const parseLineSpec = (spec) =>
  spec
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [start, end] = part.split('-').map((n) => Number(n))
      return { start, end: Number.isFinite(end) ? end : start }
    })

// Sentence boundaries in this prose are conservative: a full stop followed by
// whitespace and a capital, or a paragraph break. A boundary that is too eager
// would orphan a continuation from its antecedent.
const SENTENCE_BREAK = /(?<=[.!?])\s+(?=[A-Z"'`(])|\n\n+/g

/**
 * Split text into sentences, keeping each sentence's offset in the original so
 * a token's position can be mapped back to the sentence containing it.
 *
 * @param {string} text
 * @returns {Array<{text: string, start: number, end: number}>}
 */
export const sentences = (text) => {
  const out = []
  let cursor = 0
  SENTENCE_BREAK.lastIndex = 0
  let match
  while ((match = SENTENCE_BREAK.exec(text)) !== null) {
    const end = match.index
    out.push({ text: text.slice(cursor, end), start: cursor, end })
    cursor = match.index + match[0].length
  }
  out.push({ text: text.slice(cursor), start: cursor, end: text.length })
  return out
}

const sentenceAt = (list, offset) =>
  list.find((s) => offset >= s.start && offset <= s.end) ??
  list[list.length - 1]

const COMPARISON = / vs\.? | against /

/**
 * Does a comparison sit between a continuation and the file it would otherwise
 * inherit?
 *
 * "copy.en.js:9-10 vs :17" is the corpus's own shorthand for two different
 * files: the whole point of the construction is that the second operand is the
 * OTHER side, and its name was elided because the previous sentence gave it.
 * Proximity therefore points at exactly the wrong file, so the citation is
 * queued rather than resolved.
 *
 * @param {string} between - The text from the antecedent to the continuation
 * @returns {boolean}
 */
export const alternatesSides = (between) => COMPARISON.test(between)

/**
 * Find every citation token in one field of one increment.
 *
 * @param {object} args
 * @param {string} args.text - The prose to scan
 * @param {string} args.field - Which field it came from, recorded on each token
 * @param {string|null} [args.sideHint] - The side this field is attributed to
 * @returns {Array<object>} Tokens in document order
 */
export const tokenise = ({ text, field, sideHint = null }) => {
  if (typeof text !== 'string' || text.length === 0) return []
  const list = sentences(text)
  const tokens = []

  NAMED.lastIndex = 0
  let match
  while ((match = NAMED.exec(text)) !== null) {
    const [asWritten, path, lineSpec] = match
    tokens.push({
      field,
      asWritten,
      pathAsWritten: path,
      lines: parseLineSpec(lineSpec),
      offset: match.index,
      end: match.index + asWritten.length,
      form: 'named',
      sideHint,
      sentence: sentenceAt(list, match.index).text
    })
  }

  CONTINUATION.lastIndex = 0
  while ((match = CONTINUATION.exec(text)) !== null) {
    const offset = match.index
    // Skip anything falling inside a named token already recorded.
    if (tokens.some((t) => offset >= t.offset && offset < t.end)) continue
    const sentence = sentenceAt(list, offset)
    const inSentence = tokens.filter(
      (t) =>
        t.form === 'named' &&
        t.offset >= sentence.start &&
        t.offset <= sentence.end
    )
    const antecedent = inSentence.filter((t) => t.offset < offset).pop()
    const between = antecedent ? text.slice(antecedent.end, offset) : ''
    tokens.push({
      field,
      asWritten: match[0],
      pathAsWritten: antecedent?.pathAsWritten ?? null,
      lines: parseLineSpec(match[1]),
      offset,
      end: offset + match[0].length,
      form: 'continuation',
      sideHint,
      sentence: sentence.text,
      antecedent: antecedent?.asWritten ?? null,
      // A comparison between the antecedent and here means the elided file is
      // the other side, not the nearest one. Resolve nothing and let a human
      // say which file it meant.
      needsHuman: !antecedent || alternatesSides(between)
    })
  }

  const ordered = tokens.sort((a, b) => a.offset - b.offset)

  // The clause a citation sits in: from the end of the previous citation to
  // the start of the next, clipped to the sentence. This is the window the
  // anchor check reads, because attributing every identifier in a sentence to
  // every citation in it produces false anchor misses on any sentence naming
  // more than one file — and a false miss is worse than none, since a real one
  // is a finding about the finding.
  ordered.forEach((token, i) => {
    const sentence = sentenceAt(list, token.offset)
    const from =
      i > 0 ? Math.max(ordered[i - 1].end, sentence.start) : sentence.start
    const to =
      i < ordered.length - 1
        ? Math.min(ordered[i + 1].offset, sentence.end)
        : sentence.end
    token.window = text.slice(from, Math.max(to, token.end))
  })

  return ordered
}

/**
 * Split a semicolon-joined evidence value into its parts, keeping each part's
 * offset so tokens found inside it stay in document order.
 *
 * @param {string} value
 * @returns {Array<{text: string, offset: number}>}
 */
export const splitJoined = (value) => {
  const parts = []
  let offset = 0
  for (const part of value.split(';')) {
    parts.push({
      text: part.trim(),
      offset: offset + (part.length - part.trimStart().length)
    })
    offset += part.length + 1
  }
  return parts
}

/**
 * Fields scanned for citations, in the order their markers are numbered.
 * decision.note and notes[].note are included because a revalidation note
 * routinely corrects a citation, and a corrected pointer that the report does
 * not link is a pointer nobody checks.
 *
 * @param {object} increment
 * @returns {Array<{field: string, text: string, sideHint: string|null}>}
 */
export const citableFields = (increment) => {
  const fields = [{ field: 'detail', text: increment.detail, sideHint: null }]
  for (const [side, value] of Object.entries(increment.evidence ?? {})) {
    if (typeof value === 'string') {
      fields.push({ field: `evidence.${side}`, text: value, sideHint: side })
    }
  }
  ;(increment.notes ?? []).forEach((note, i) => {
    fields.push({ field: `notes[${i}]`, text: note.note, sideHint: null })
  })
  if (increment.decision?.note) {
    fields.push({
      field: 'decision',
      text: increment.decision.note,
      sideHint: null
    })
  }
  return fields
}

/**
 * Every citation token in one increment, in field order then document order.
 *
 * @param {object} increment
 * @returns {Array<object>}
 */
export const tokeniseIncrement = (increment) =>
  citableFields(increment).flatMap((field) => tokenise(field))
